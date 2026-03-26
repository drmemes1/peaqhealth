import { refreshWhoopToken } from "./refresh"

export interface WhoopSleepRecord {
  date:                 string
  total_sleep_minutes:  number
  deep_sleep_minutes:   number
  rem_sleep_minutes:    number
  sleep_efficiency:     number
  respiratory_rate:     number | null
  hrv_rmssd:            number | null
  resting_heart_rate:   number | null
  spo2:                 number | null
  recovery_score:       number | null
  raw_sleep:            unknown
  raw_recovery:         unknown
}

/** Fetch sleep + recovery data from WHOOP API for a given user and start date. */
export async function fetchWhoopSleepData(
  userId: string,
  startDate: string
): Promise<WhoopSleepRecord[]> {
  const token = await refreshWhoopToken(userId)

  // Fetch sleep sessions
  const sleepRes = await fetch(
    `https://api.prod.whoop.com/developer/v1/activity/sleep?start=${startDate}&limit=25`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!sleepRes.ok) throw new Error(`WHOOP sleep API error: ${sleepRes.status}`)
  const sleepPayload = await sleepRes.json() as { records: Record<string, unknown>[] }

  // Fetch recovery data for same range
  const recoveryRes = await fetch(
    `https://api.prod.whoop.com/developer/v1/recovery?start=${startDate}&limit=25`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const recoveryPayload = recoveryRes.ok
    ? (await recoveryRes.json() as { records: Record<string, unknown>[] })
    : { records: [] }

  // Index recovery records by date
  const recoveryByDate = new Map<string, Record<string, unknown>>()
  for (const rec of (recoveryPayload.records ?? [])) {
    const date = (rec.created_at as string)?.slice(0, 10)
    if (date) recoveryByDate.set(date, rec)
  }

  // Map and merge
  const records: WhoopSleepRecord[] = []
  for (const sleep of (sleepPayload.records ?? [])) {
    const date = (sleep.start as string)?.slice(0, 10)
    if (!date) continue

    const summary = (sleep.score as Record<string, unknown>)?.stage_summary as Record<string, number> | undefined
    const score   = sleep.score as Record<string, unknown> | undefined

    const totalInBedMs = summary?.total_in_bed_time_milli ?? 0
    const awakeMs      = summary?.total_awake_time_milli  ?? 0
    const deepMs       = summary?.total_slow_wave_sleep_time_milli ?? 0
    const remMs        = summary?.total_rem_sleep_time_milli       ?? 0

    const recovery     = recoveryByDate.get(date)
    const recScore     = recovery?.score as Record<string, unknown> | undefined

    records.push({
      date,
      total_sleep_minutes: (totalInBedMs - awakeMs) / 60000,
      deep_sleep_minutes:  deepMs / 60000,
      rem_sleep_minutes:   remMs / 60000,
      sleep_efficiency:    (score?.sleep_efficiency_percentage as number) ?? 0,
      respiratory_rate:    (score?.respiratory_rate as number | null) ?? null,
      hrv_rmssd:           recovery ? ((recovery.hrv_rmssd_milli as number ?? 0) / 1000) : null,
      resting_heart_rate:  recovery ? ((recovery.resting_heart_rate as number | null) ?? null) : null,
      spo2:                (score?.spo2_percentage as number | null) ?? null,
      recovery_score:      recScore ? ((recScore.recovery_score as number | null) ?? null) : null,
      raw_sleep:           sleep,
      raw_recovery:        recovery ?? null,
    })
  }

  return records
}

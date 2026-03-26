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
  startIso: string,   // full ISO 8601 datetime e.g. "2026-03-19T00:00:00.000Z"
  endIso?: string     // defaults to now
): Promise<WhoopSleepRecord[]> {
  const token = await refreshWhoopToken(userId)
  const end   = endIso ?? new Date().toISOString()

  console.log("[whoop-fetch] token preview:", token.substring(0, 20) + "...")

  // ── Profile sanity check ───────────────────────────────────────────────────
  const profileRes = await fetch(
    "https://api.prod.whoop.com/developer/v1/user/profile/basic",
    { headers: { Authorization: `Bearer ${token}` } }
  )
  console.log("[whoop-fetch] profile check status:", profileRes.status)
  if (!profileRes.ok) {
    const body = await profileRes.text().catch(() => "")
    console.log("[whoop-fetch] profile error body:", body)
    throw new Error(`WHOOP token invalid — profile check failed: ${profileRes.status}`)
  }

  // ── Sleep sessions ─────────────────────────────────────────────────────────
  const sleepParams = new URLSearchParams({ start: startIso, end, limit: "25" })
  const sleepUrl    = `https://api.prod.whoop.com/developer/v1/activity/sleep?${sleepParams}`
  console.log("[whoop-fetch] calling sleep:", sleepUrl)

  const sleepRes = await fetch(sleepUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!sleepRes.ok) {
    const body = await sleepRes.text().catch(() => "")
    console.log("[whoop-fetch] error status:", sleepRes.status)
    console.log("[whoop-fetch] error body:", body)
    throw new Error(`WHOOP sleep API ${sleepRes.status}: ${body}`)
  }
  const sleepPayload = await sleepRes.json() as { records: Record<string, unknown>[] }

  // ── Recovery records ───────────────────────────────────────────────────────
  const recoveryParams = new URLSearchParams({ start: startIso, end, limit: "25" })
  const recoveryUrl    = `https://api.prod.whoop.com/developer/v1/recovery?${recoveryParams}`
  console.log("[whoop-fetch] calling recovery:", recoveryUrl)

  const recoveryRes = await fetch(recoveryUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const recoveryPayload = recoveryRes.ok
    ? (await recoveryRes.json() as { records: Record<string, unknown>[] })
    : { records: [] }

  if (!recoveryRes.ok) {
    console.warn("[whoop-fetch] recovery API non-OK:", recoveryRes.status, "— continuing without HRV")
  }

  // Index recovery records by date (created_at date)
  const recoveryByDate = new Map<string, Record<string, unknown>>()
  for (const rec of (recoveryPayload.records ?? [])) {
    const date = (rec.created_at as string)?.slice(0, 10)
    if (date) recoveryByDate.set(date, rec)
  }

  // ── Merge sleep + recovery ─────────────────────────────────────────────────
  const records: WhoopSleepRecord[] = []
  for (const sleep of (sleepPayload.records ?? [])) {
    const date = (sleep.start as string)?.slice(0, 10)
    if (!date) continue

    const summary  = (sleep.score as Record<string, unknown>)?.stage_summary as Record<string, number> | undefined
    const score    = sleep.score as Record<string, unknown> | undefined
    const recovery = recoveryByDate.get(date)

    // HRV and resting HR are nested under recovery.score (not top-level)
    const recScore = recovery?.score as Record<string, unknown> | undefined

    const totalInBedMs = summary?.total_in_bed_time_milli ?? 0
    const awakeMs      = summary?.total_awake_time_milli  ?? 0
    const deepMs       = summary?.total_slow_wave_sleep_time_milli ?? 0
    const remMs        = summary?.total_rem_sleep_time_milli       ?? 0

    records.push({
      date,
      total_sleep_minutes: (totalInBedMs - awakeMs) / 60000,
      deep_sleep_minutes:  deepMs / 60000,
      rem_sleep_minutes:   remMs / 60000,
      sleep_efficiency:    (score?.sleep_efficiency_percentage as number) ?? 0,
      respiratory_rate:    (score?.respiratory_rate            as number | null) ?? null,
      hrv_rmssd:           recScore ? ((recScore.hrv_rmssd_milli as number ?? 0) / 1000) : null,
      resting_heart_rate:  recScore ?  (recScore.resting_heart_rate as number | null) ?? null : null,
      spo2:                (score?.spo2_percentage             as number | null) ?? null,
      recovery_score:      recScore ? (recScore.recovery_score as number | null) ?? null : null,
      raw_sleep:           sleep,
      raw_recovery:        recovery ?? null,
    })
  }

  console.log(`[whoop-fetch] fetched ${records.length} sleep records for user ${userId}`)
  return records
}

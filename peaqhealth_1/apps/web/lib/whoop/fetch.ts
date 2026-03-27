import { createClient } from "@supabase/supabase-js"
import { refreshWhoopToken, WhoopReconnectError } from "./refresh"
import type { WhoopSleepRecord as WhoopApiSleepRecord, WhoopRecoveryRecord } from "./types"

// ── DB row shape (exported for backward-compat with admin/sync routes) ────────

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

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * Fetch sleep + recovery from WHOOP API and upsert into whoop_sleep_data.
 * Returns count of upserted records.
 */
export async function fetchAndStoreWhoopData(
  userId: string,
  daysBack: number = 1,
): Promise<number> {
  const token = await refreshWhoopToken(userId)

  const end   = new Date()
  const start = new Date(end.getTime() - daysBack * 24 * 60 * 60 * 1000)
  const startIso = start.toISOString()
  const endIso   = end.toISOString()

  console.log(`[whoop-fetch] user=${userId} token=${token.substring(0, 8)}... start=${startIso} end=${endIso}`)

  const authHeader = { Authorization: `Bearer ${token}` }

  const sleepParams    = new URLSearchParams({ start: startIso, end: endIso, limit: "25" })
  const recoveryParams = new URLSearchParams({ start: startIso, end: endIso, limit: "25" })

  const sleepUrl    = `https://api.prod.whoop.com/developer/v1/activity/sleep?${sleepParams}`
  const recoveryUrl = `https://api.prod.whoop.com/developer/v1/recovery?${recoveryParams}`
  console.log(`[whoop-fetch] GET url=${sleepUrl}`)

  const [sleepRes, recoveryRes] = await Promise.all([
    fetch(sleepUrl,    { headers: authHeader }),
    fetch(recoveryUrl, { headers: authHeader }),
  ])

  if (!sleepRes.ok) {
    const body = await sleepRes.text().catch(() => "")
    if (sleepRes.status === 404) {
      // WHOOP returns 404 when no data exists in the requested window (e.g. after account reset)
      // Treat as empty result — connection is already saved, just no sleep data yet
      console.info(`[whoop-fetch] 404 from sleep endpoint — no data in window, treating as empty (user=${userId})`)
      console.log("[whoop-fetch] 404 body:", body)
      return 0
    }
    throw new Error(`WHOOP sleep API ${sleepRes.status}: ${body}`)
  }

  const sleepPayload    = await sleepRes.json() as { records: WhoopApiSleepRecord[] }
  const recoveryPayload = recoveryRes.ok
    ? (await recoveryRes.json() as { records: WhoopRecoveryRecord[] })
    : { records: [] }

  if (!recoveryRes.ok) {
    console.warn("[whoop-fetch] recovery API non-OK:", recoveryRes.status, "— continuing without HRV")
  }

  // Index recovery by date (created_at date)
  const recoveryByDate = new Map<string, WhoopRecoveryRecord>()
  for (const rec of (recoveryPayload.records ?? [])) {
    const date = rec.created_at?.slice(0, 10)
    if (date) recoveryByDate.set(date, rec)
  }

  const rows: (WhoopSleepRecord & { user_id: string })[] = []

  for (const sleep of (sleepPayload.records ?? [])) {
    // Skip naps
    if (sleep.nap === true) continue

    const date = sleep.start?.slice(0, 10)
    if (!date) continue

    const summary  = sleep.score?.stage_summary
    const score    = sleep.score
    const recovery = recoveryByDate.get(date)
    const recScore = recovery?.score
    console.log("[whoop-fetch] hrv raw value:", recScore?.hrv_rmssd_milli, "date:", date)

    const totalInBedMs = summary?.total_in_bed_time_milli ?? 0
    const awakeMs      = score?.awake_time_milli ?? (summary?.total_awake_time_milli ?? 0)
    const deepMs       = summary?.total_slow_wave_sleep_time_milli ?? 0
    const remMs        = summary?.total_rem_sleep_time_milli ?? 0

    rows.push({
      user_id:              userId,
      date,
      total_sleep_minutes:  Math.round((totalInBedMs - awakeMs) / 60000),
      deep_sleep_minutes:   Math.round(deepMs / 60000),
      rem_sleep_minutes:    Math.round(remMs / 60000),
      sleep_efficiency:     score?.sleep_efficiency_percentage ?? 0,
      respiratory_rate:     score?.respiratory_rate ?? null,
      hrv_rmssd:            recScore?.hrv_rmssd_milli ?? null,
      resting_heart_rate:   recScore?.resting_heart_rate ?? null,
      spo2:                 recScore?.spo2_percentage ?? null,
      recovery_score:       recScore?.recovery_score ?? null,
      raw_sleep:            sleep,
      raw_recovery:         recovery ?? null,
    })
  }

  const supabase = serviceClient()

  if (rows.length > 0) {
    const { error } = await supabase
      .from("whoop_sleep_data")
      .upsert(rows, { onConflict: "user_id,date" })
    if (error) console.error("[whoop-fetch] upsert error:", error.message)
  }

  // Update wearable_connections aggregates
  const validNights = rows.filter(r => r.sleep_efficiency > 0)
  if (validNights.length > 0) {
    const n = validNights.length
    const avg = (key: keyof WhoopSleepRecord) =>
      validNights.reduce((s, r) => s + (Number(r[key]) || 0), 0) / n

    const totalMin = avg("total_sleep_minutes")
    const deepPct  = totalMin > 0 ? (avg("deep_sleep_minutes") / totalMin) * 100 : 0
    const remPct   = totalMin > 0 ? (avg("rem_sleep_minutes")  / totalMin) * 100 : 0
    const spo2     = avg("spo2")
    const now      = new Date().toISOString()

    await supabase.from("wearable_connections").upsert({
      user_id:           userId,
      provider:          "whoop",
      status:            "connected",
      connected_at:      now,
      deep_sleep_pct:    deepPct,
      rem_pct:           remPct,
      sleep_efficiency:  avg("sleep_efficiency"),
      hrv_rmssd:         avg("hrv_rmssd"),
      latest_resting_hr: Math.round(avg("resting_heart_rate")) || null,
      latest_spo2_dips:  spo2 >= 95 ? 0 : spo2 >= 92 ? 2 : 5,
      nights_available:  validNights.length,
      last_sync_at:      now,
      updated_at:        now,
    }, { onConflict: "user_id,provider" })
  }

  // Mark connection as synced
  await supabase.from("whoop_connections").update({
    last_synced_at:  new Date().toISOString(),
    needs_reconnect: false,
    last_sync_error: null,
  }).eq("user_id", userId)

  console.log(`[whoop-fetch] stored ${rows.length} records for user ${userId}`)
  return rows.length
}

/**
 * Legacy signature kept for backward compatibility with admin/sync routes.
 * Fetches raw WHOOP records without storing them — callers handle DB writes.
 */
export async function fetchWhoopSleepData(
  userId: string,
  startIso: string,
  endIso?: string,
): Promise<WhoopSleepRecord[]> {
  const token = await refreshWhoopToken(userId)
  const end   = endIso ?? new Date().toISOString()

  console.log("[whoop-fetch] token preview:", token.substring(0, 8) + "...")

  const sleepParams    = new URLSearchParams({ start: startIso, end, limit: "25" })
  const recoveryParams = new URLSearchParams({ start: startIso, end, limit: "25" })
  const authHeader     = { Authorization: `Bearer ${token}` }

  const sleepUrl = `https://api.prod.whoop.com/developer/v1/activity/sleep?${sleepParams}`
  console.log(`[whoop-fetch] GET url=${sleepUrl}`)

  const sleepRes = await fetch(sleepUrl, { headers: authHeader })
  if (!sleepRes.ok) {
    const body = await sleepRes.text().catch(() => "")
    if (sleepRes.status === 404) {
      console.info(`[whoop-fetch] 404 from sleep endpoint — no data in window, treating as empty (user=${userId})`)
      console.log("[whoop-fetch] 404 body:", body)
      return []
    }
    throw new Error(`WHOOP sleep API ${sleepRes.status}: ${body}`)
  }
  const sleepPayload = await sleepRes.json() as { records: WhoopApiSleepRecord[] }

  const recoveryRes = await fetch(
    `https://api.prod.whoop.com/developer/v1/recovery?${recoveryParams}`,
    { headers: authHeader },
  )
  const recoveryPayload = recoveryRes.ok
    ? (await recoveryRes.json() as { records: WhoopRecoveryRecord[] })
    : { records: [] }

  if (!recoveryRes.ok) {
    console.warn("[whoop-fetch] recovery API non-OK:", recoveryRes.status, "— continuing without HRV")
  }

  const recoveryByDate = new Map<string, WhoopRecoveryRecord>()
  for (const rec of (recoveryPayload.records ?? [])) {
    const date = rec.created_at?.slice(0, 10)
    if (date) recoveryByDate.set(date, rec)
  }

  const records: WhoopSleepRecord[] = []
  for (const sleep of (sleepPayload.records ?? [])) {
    const date = sleep.start?.slice(0, 10)
    if (!date) continue

    const summary  = sleep.score?.stage_summary
    const score    = sleep.score
    const recovery = recoveryByDate.get(date)
    const recScore = recovery?.score

    const totalInBedMs = summary?.total_in_bed_time_milli ?? 0
    const awakeMs      = score?.awake_time_milli ?? (summary?.total_awake_time_milli ?? 0)
    const deepMs       = summary?.total_slow_wave_sleep_time_milli ?? 0
    const remMs        = summary?.total_rem_sleep_time_milli ?? 0

    records.push({
      date,
      total_sleep_minutes: Math.round((totalInBedMs - awakeMs) / 60000),
      deep_sleep_minutes:  Math.round(deepMs / 60000),
      rem_sleep_minutes:   Math.round(remMs / 60000),
      sleep_efficiency:    score?.sleep_efficiency_percentage ?? 0,
      respiratory_rate:    score?.respiratory_rate ?? null,
      hrv_rmssd:           recScore?.hrv_rmssd_milli ?? null,
      resting_heart_rate:  recScore?.resting_heart_rate ?? null,
      spo2:                recScore?.spo2_percentage ?? null,
      recovery_score:      recScore?.recovery_score ?? null,
      raw_sleep:           sleep,
      raw_recovery:        recovery ?? null,
    })
  }

  console.log(`[whoop-fetch] fetched ${records.length} sleep records for user ${userId}`)
  return records
}

// Re-export error class so callers can catch it
export { WhoopReconnectError }

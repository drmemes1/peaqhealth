import { createClient } from "@supabase/supabase-js"
import { refreshWhoopToken, WhoopReconnectError } from "./refresh"
import type { WhoopSleepRecord as WhoopApiSleepRecord, WhoopRecoveryRecord } from "./types"

// ── DB row shape (exported for backward-compat with admin/sync routes) ────────

export interface WhoopSleepRecord {
  sleep_id?:            string        // v2 UUID — used for deduplication on upsert
  source?:              string        // 'whoop' | 'oura' | 'garmin'
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
 * Fetch per-cycle recovery from WHOOP v2 API.
 * Returns null if not found, not scored, or on any error.
 */
async function fetchRecoveryForCycle(
  cycleId: number,
  authHeader: { Authorization: string },
): Promise<WhoopRecoveryRecord | null> {
  const url = `https://api.prod.whoop.com/developer/v2/cycle/${cycleId}/recovery`
  console.log(`[whoop-fetch] GET url=${url}`)
  const res = await fetch(url, { headers: authHeader })
  console.log(`[whoop-fetch] recovery status: ${res.status} for cycle=${cycleId}`)
  if (!res.ok) {
    console.log(`[whoop-fetch] recovery for cycle=${cycleId}: not scored or not found — storing nulls`)
    return null
  }
  const data = await res.json() as WhoopRecoveryRecord
  if (data.score_state !== "SCORED") {
    console.log(`[whoop-fetch] recovery for cycle=${cycleId}: score_state=${data.score_state} — storing nulls`)
    return null
  }
  console.log(
    `[whoop-fetch] recovery for cycle=${cycleId}:`,
    `hrv=${data.score?.hrv_rmssd_milli ?? null}`,
    `spo2=${data.score?.spo2_percentage ?? null}`,
    `rhr=${data.score?.resting_heart_rate ?? null}`,
  )
  return data
}

/**
 * Fetch sleep + recovery from WHOOP v2 API and upsert into sleep_data.
 * Returns count of upserted records.
 *
 * daysBack=30 used for initial backfill on connect.
 * daysBack=7 used for the nightly cron.
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

  const sleepParams = new URLSearchParams({ start: startIso, end: endIso, limit: "25" })
  const sleepUrl    = `https://api.prod.whoop.com/developer/v2/activity/sleep?${sleepParams}`
  console.log(`[whoop-fetch] GET url=${sleepUrl}`)

  const sleepRes = await fetch(sleepUrl, { headers: authHeader })

  if (!sleepRes.ok) {
    const body = await sleepRes.text().catch(() => "")
    if (sleepRes.status === 404) {
      console.info(`[whoop-fetch] 404 from sleep endpoint — no data in window, treating as empty (user=${userId})`)
      console.log("[whoop-fetch] 404 body:", body)
      return 0
    }
    throw new Error(`WHOOP sleep API ${sleepRes.status}: ${body}`)
  }

  const sleepPayload = await sleepRes.json() as { records: WhoopApiSleepRecord[] }

  // Filter naps before recovery fetches to avoid unnecessary API calls
  const mainSleeps = (sleepPayload.records ?? []).filter(s => s.nap !== true)

  // Fetch per-cycle recovery in parallel (v2: each sleep has a cycle_id)
  const recoveryResults = await Promise.all(
    mainSleeps.map(sleep => fetchRecoveryForCycle(sleep.cycle_id, authHeader))
  )

  const rows: (WhoopSleepRecord & { user_id: string })[] = []

  for (let i = 0; i < mainSleeps.length; i++) {
    const sleep    = mainSleeps[i]
    const recovery = recoveryResults[i]

    const date = sleep.start?.slice(0, 10)
    if (!date) continue

    const summary  = sleep.score?.stage_summary
    const score    = sleep.score
    const recScore = recovery?.score

    console.log(
      `[whoop-fetch] sleep record: ${sleep.id} date: ${date}`,
      `cycle_id: ${sleep.cycle_id}`,
      `hrv: ${recScore?.hrv_rmssd_milli ?? null}`,
      `efficiency: ${score?.sleep_efficiency_percentage ?? null}`,
    )

    const totalInBedMs = summary?.total_in_bed_time_milli ?? 0
    const awakeMs      = score?.awake_time_milli ?? (summary?.total_awake_time_milli ?? 0)
    const deepMs       = summary?.total_slow_wave_sleep_time_milli ?? 0
    const remMs        = summary?.total_rem_sleep_time_milli ?? 0

    rows.push({
      user_id:              userId,
      sleep_id:             sleep.id,   // v2 UUID — deduplicated on upsert
      source:               'whoop',
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
    // Split rows: those with a sleep_id use the partial unique index to deduplicate;
    // those without fall back to (user_id, date, source). This avoids the
    // "duplicate key violates unique constraint whoop_sleep_data_sleep_id_key" error
    // when reconnecting WHOOP or switching between Oura and WHOOP.
    const rowsWithId    = rows.filter(r => r.sleep_id)
    const rowsWithoutId = rows.filter(r => !r.sleep_id)

    if (rowsWithId.length > 0) {
      const { error } = await supabase
        .from("sleep_data")
        .upsert(rowsWithId, { onConflict: "sleep_id" })
      if (error) console.error("[whoop-fetch] upsert(sleep_id) error:", error.message)
    }
    if (rowsWithoutId.length > 0) {
      const { error } = await supabase
        .from("sleep_data")
        .upsert(rowsWithoutId, { onConflict: "user_id,date,source" })
      if (error) console.error("[whoop-fetch] upsert(user_id,date,source) error:", error.message)
    }
    console.log("[whoop-fetch] upserted:", rows.length, "rows to sleep_data")
  }

  // Mark connection as synced in unified connections table
  await supabase.from("wearable_connections_v2").update({
    last_synced_at:  new Date().toISOString(),
    needs_reconnect: false,
    last_sync_error: null,
  }).eq("user_id", userId).eq("provider", "whoop")

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

  const sleepParams = new URLSearchParams({ start: startIso, end, limit: "25" })
  const authHeader  = { Authorization: `Bearer ${token}` }

  const sleepUrl = `https://api.prod.whoop.com/developer/v2/activity/sleep?${sleepParams}`
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

  // Filter naps, then fetch per-cycle recovery in parallel
  const mainSleeps = (sleepPayload.records ?? []).filter(s => s.nap !== true)
  const recoveryResults = await Promise.all(
    mainSleeps.map(sleep => fetchRecoveryForCycle(sleep.cycle_id, authHeader))
  )

  const records: WhoopSleepRecord[] = []
  for (let i = 0; i < mainSleeps.length; i++) {
    const sleep    = mainSleeps[i]
    const recovery = recoveryResults[i]

    const date = sleep.start?.slice(0, 10)
    if (!date) continue

    const summary  = sleep.score?.stage_summary
    const score    = sleep.score
    const recScore = recovery?.score

    console.log(
      `[whoop-fetch] sleep record: ${sleep.id} date: ${date}`,
      `cycle_id: ${sleep.cycle_id}`,
      `hrv: ${recScore?.hrv_rmssd_milli ?? null}`,
      `efficiency: ${score?.sleep_efficiency_percentage ?? null}`,
    )

    const totalInBedMs = summary?.total_in_bed_time_milli ?? 0
    const awakeMs      = score?.awake_time_milli ?? (summary?.total_awake_time_milli ?? 0)
    const deepMs       = summary?.total_slow_wave_sleep_time_milli ?? 0
    const remMs        = summary?.total_rem_sleep_time_milli ?? 0

    records.push({
      sleep_id:            sleep.id,    // v2 UUID
      source:              'whoop',
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

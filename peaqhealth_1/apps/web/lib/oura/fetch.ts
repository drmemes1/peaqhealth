import { createClient } from "@supabase/supabase-js"

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * Fetch sleep data from Vital/Junction API for an Oura (or other Junction-connected) user
 * and upsert into sleep_data with source='oura'.
 * Returns count of upserted records.
 */
export async function fetchAndStoreOuraData(
  userId: string,
  daysBack: number = 1,
): Promise<number> {
  const supabase = serviceClient()

  // Look up junction_user_id from wearable_connections_v2 (external_user_id), fall back to profiles
  let junctionUserId: string | null = null

  const { data: conn } = await supabase
    .from("wearable_connections_v2")
    .select("external_user_id")
    .eq("user_id", userId)
    .eq("provider", "oura")
    .maybeSingle()

  junctionUserId = (conn?.external_user_id as string | null) ?? null

  if (!junctionUserId) {
    // Fallback: profiles table (populated during link-token creation)
    const { data: profile } = await supabase
      .from("profiles")
      .select("junction_user_id")
      .eq("id", userId)
      .maybeSingle()
    junctionUserId = (profile?.junction_user_id as string | null) ?? null
  }

  if (!junctionUserId) {
    console.log("[oura-fetch] no junction_user_id for user:", userId)
    return 0
  }

  const end   = new Date()
  const start = new Date(end.getTime() - daysBack * 24 * 60 * 60 * 1000)
  const startDate = start.toISOString().slice(0, 10)
  const endDate   = end.toISOString().slice(0, 10)

  console.log(`[oura-fetch] user=${userId} junction=${junctionUserId} start=${startDate} end=${endDate}`)

  const url = `https://api.tryvital.io/v2/summary/sleep/${junctionUserId}?start_date=${startDate}&end_date=${endDate}`
  console.log(`[oura-fetch] GET url=${url}`)

  const res = await fetch(url, {
    headers: { "x-vital-api-key": process.env.JUNCTION_API_KEY! },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    if (res.status === 404) {
      console.info(`[oura-fetch] 404 — no sleep data in window (user=${userId})`)
      return 0
    }
    throw new Error(`Vital sleep API ${res.status}: ${body}`)
  }

  const payload = await res.json() as { sleep: Record<string, unknown>[] }
  const allSleeps = payload.sleep ?? []

  // Filter out naps and very short sessions
  const mainSleeps = allSleeps.filter((s) => {
    const type  = s.type as string | undefined
    const total = (s.total as number | undefined) ?? (s.duration as number | undefined) ?? 0
    return type !== "acknowledged_nap" && type !== "nap" && total > 3600
  })

  console.log(`[oura-fetch] ${allSleeps.length} total, ${mainSleeps.length} main sleeps after filtering`)

  if (mainSleeps.length === 0) return 0

  type SleepRow = {
    user_id:              string
    source:               string
    sleep_id:             string | null
    date:                 string
    total_sleep_minutes:  number
    deep_sleep_minutes:   number
    rem_sleep_minutes:    number
    sleep_efficiency:     number
    respiratory_rate:     number | null
    hrv_rmssd:            number | null
    resting_heart_rate:   number | null
    spo2:                 number | null
    recovery_score:       null
    raw_sleep:            unknown
    raw_recovery:         null
  }

  const rows: SleepRow[] = mainSleeps.map((s) => {
    const total    = (s.total    as number | undefined) ?? (s.duration as number | undefined) ?? 0
    const deep     = (s.deep     as number | undefined) ?? 0
    const rem      = (s.rem      as number | undefined) ?? 0
    const hrv      = (s.hrv_rmssd as number | undefined) ?? (s.hrv as number | undefined) ?? null
    const rhr      = (s.hr_lowest as number | undefined) ?? null
    const spo2     = (s.spo2_avg  as number | undefined) ?? null
    const eff      = (s.efficiency as number | undefined) ?? 0
    const date     = (s.calendar_date as string | undefined) ?? (s.date as string | undefined) ?? ""
    const sleepId  = (s.id as string | undefined) ?? null

    console.log(
      `[oura-fetch] sleep record: ${sleepId} date: ${date}`,
      `hrv: ${hrv}`,
      `efficiency: ${eff}`,
    )

    return {
      user_id:              userId,
      source:               "oura",
      sleep_id:             sleepId,
      date,
      total_sleep_minutes:  Math.round(total / 60),
      deep_sleep_minutes:   Math.round(deep  / 60),
      rem_sleep_minutes:    Math.round(rem   / 60),
      sleep_efficiency:     eff,
      respiratory_rate:     null,
      hrv_rmssd:            hrv,
      resting_heart_rate:   rhr,
      spo2,
      recovery_score:       null,
      raw_sleep:            s,
      raw_recovery:         null,
    }
  }).filter(r => r.date)

  const { error } = await supabase
    .from("sleep_data")
    .upsert(rows, { onConflict: "user_id,date,source" })
  if (error) console.error("[oura-fetch] upsert error:", error.message)
  else console.log("[oura-fetch] upserted:", rows.length, "rows to sleep_data")

  // Mark connection as synced in unified connections table
  if (rows.length > 0) {
    await supabase.from("wearable_connections_v2").update({
      last_synced_at: new Date().toISOString(),
    }).eq("user_id", userId).eq("provider", "oura")
  }

  console.log(`[oura-fetch] stored ${rows.length} records for user ${userId}`)
  return rows.length
}

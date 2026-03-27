import type { SupabaseClient } from "@supabase/supabase-js"
import type { SleepInputs } from "@peaq/score-engine"

// ── Normalized sleep shape — provider-agnostic intermediate type ──────────────

export interface NormalizedSleep {
  deepSleepPct:       number  // 0–100
  remPct:             number  // 0–100
  sleepEfficiencyPct: number  // 0–100
  hrv_ms:             number  // raw ms value from device
  spo2DipsPerNight:   number  // estimated dip events per night
  nightsAvailable:    number
}

/** Convert NormalizedSleep → SleepInputs for the score engine */
export function scoreSleep(normalized: NormalizedSleep): SleepInputs {
  return {
    deepSleepPct:       normalized.deepSleepPct,
    remPct:             normalized.remPct,
    sleepEfficiencyPct: normalized.sleepEfficiencyPct,
    hrv_ms:             normalized.hrv_ms,
    spo2DipsPerNight:   normalized.spo2DipsPerNight,
    nightsAvailable:    normalized.nightsAvailable,
  }
}

/**
 * Normalize WHOOP sleep data from sleep_data (raw nightly records).
 * Reads up to 30 most recent valid nights and computes weighted averages.
 * Returns null if no scored nights exist.
 */
export async function normalizeWhoopSleep(
  userId: string,
  supabase: SupabaseClient,
): Promise<NormalizedSleep | null> {
  const { data: nights, error } = await supabase
    .from("sleep_data")
    .select("total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, sleep_efficiency, hrv_rmssd, spo2")
    .eq("user_id", userId)
    .gt("sleep_efficiency", 0)
    .order("date", { ascending: false })
    .limit(30)

  if (error) {
    console.error("[normalize] sleep_data query error:", error.message)
    return null
  }

  if (!nights || nights.length < 1) {
    console.log("[normalize] normalizeWhoopSleep — no scored nights found for user:", userId)
    return null
  }

  const n = nights.length
  type NightRow = { total_sleep_minutes: number; deep_sleep_minutes: number; rem_sleep_minutes: number; sleep_efficiency: number; hrv_rmssd: number | null; spo2: number | null }
  const typedNights = nights as NightRow[]

  const avg = (key: keyof NightRow) =>
    typedNights.reduce((s, r) => s + (Number(r[key]) || 0), 0) / n

  const totalMin = avg("total_sleep_minutes")
  const deepMin  = avg("deep_sleep_minutes")
  const remMin   = avg("rem_sleep_minutes")
  const spo2     = avg("spo2")

  const result: NormalizedSleep = {
    deepSleepPct:       totalMin > 0 ? (deepMin / totalMin) * 100 : 0,
    remPct:             totalMin > 0 ? (remMin  / totalMin) * 100 : 0,
    sleepEfficiencyPct: avg("sleep_efficiency"),
    hrv_ms:             avg("hrv_rmssd"),
    spo2DipsPerNight:   spo2 >= 95 ? 0 : spo2 >= 92 ? 2 : 5,
    nightsAvailable:    n,
  }

  console.log(
    "[normalize] normalizeWhoopSleep — nights:", n,
    "eff:", Math.round(result.sleepEfficiencyPct),
    "deep%:", Math.round(result.deepSleepPct),
    "rem%:", Math.round(result.remPct),
    "hrv:", Math.round(result.hrv_ms * 10) / 10,
    "spo2Dips:", result.spo2DipsPerNight,
  )
  return result
}

/**
 * Normalize Oura / Junction sleep data from wearable_connections aggregates.
 * Also used as a fallback for WHOOP before raw data is populated.
 * Accepts any provider name written by the webhook (oura, garmin, fitbit, whoop, etc.).
 */
export async function normalizeOuraSleep(
  userId: string,
  supabase: SupabaseClient,
  provider = "oura",
): Promise<NormalizedSleep | null> {
  const { data: wearable, error } = await supabase
    .from("wearable_connections")
    .select("deep_sleep_pct, rem_pct, sleep_efficiency, hrv_rmssd, latest_spo2_dips, nights_available")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("status", "connected")
    .maybeSingle()

  if (error) {
    console.error("[normalize] wearable_connections query error (provider=" + provider + "):", error.message)
    return null
  }

  if (!wearable) return null

  const efficiency = (wearable.sleep_efficiency as number) ?? 0
  const nights     = (wearable.nights_available as number) ?? 0

  if (efficiency === 0 && nights === 0) return null

  const result: NormalizedSleep = {
    deepSleepPct:       (wearable.deep_sleep_pct  as number) ?? 0,
    remPct:             (wearable.rem_pct          as number) ?? 0,
    sleepEfficiencyPct: efficiency,
    hrv_ms:             (wearable.hrv_rmssd        as number) ?? 0,
    spo2DipsPerNight:   (wearable.latest_spo2_dips as number) ?? 0,
    nightsAvailable:    nights,
  }

  console.log(
    "[normalize] normalizeOuraSleep (provider=" + provider + ") — nights:", nights,
    "eff:", Math.round(efficiency),
    "hrv:", Math.round(result.hrv_ms * 10) / 10,
  )
  return result
}

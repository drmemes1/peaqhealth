import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { calculatePeaqScore } from "@peaq/score-engine"
import type { SleepInputs, LifestyleInputs } from "@peaq/score-engine"

/**
 * Map DB lifestyle_records row (snake_case) → engine LifestyleInputs (camelCase enums).
 * Mirrors the mapping in apps/web/app/dashboard/page.tsx.
 */
function mapLifestyleRow(row: Record<string, unknown>): LifestyleInputs {
  const brushMap: Record<string, string> = { once: "once", twice: "twice_plus", more: "twice_plus" }
  const flossMap: Record<string, string> = { never: "rarely_never", sometimes: "sometimes", daily: "daily" }
  const mouthMap: Record<string, string> = { none: "none", alcohol: "antiseptic", fluoride: "fluoride", natural: "none" }
  const visitMap: Record<string, string> = { "6mo": "within_6mo", "1yr": "6_to_12mo", "2yr": "over_1yr", more: "over_2yr" }
  const smokeMap: Record<string, string> = { never: "never", former: "former", current: "current" }
  const exMap: Record<string, string> = { sedentary: "sedentary", light: "light", moderate: "moderate", active: "active" }
  const durMap: Record<string, string> = { lt6: "lt_6", "6to7": "6_to_7", "7to8": "7_to_8", gt8: "gte_8" }
  const latMap: Record<string, string> = { lt10: "lt_15min", "10to20": "15_to_30min", "20to40": "30_to_60min", gt40: "gt_60min" }
  const qualMap: Record<string, string> = { poor: "poor", fair: "fair", good: "good", excellent: "very_good" }
  const wakeMap: Record<string, string> = { "0": "never", "1to2": "less_once_wk", "3to5": "once_twice_wk", gt5: "3plus_wk" }
  const fatMap: Record<string, string> = { none: "never", mild: "sometimes", moderate: "often", severe: "always" }

  return {
    exerciseLevel: (exMap[row.exercise_level as string] ?? "sedentary") as LifestyleInputs["exerciseLevel"],
    brushingFreq: (brushMap[row.brushing_freq as string] ?? "once") as LifestyleInputs["brushingFreq"],
    flossingFreq: (flossMap[row.flossing_freq as string] ?? "rarely_never") as LifestyleInputs["flossingFreq"],
    mouthwashType: (mouthMap[row.mouthwash_type as string] ?? "none") as LifestyleInputs["mouthwashType"],
    lastDentalVisit: (visitMap[row.last_dental_visit as string] ?? "over_1yr") as LifestyleInputs["lastDentalVisit"],
    smokingStatus: (smokeMap[row.smoking_status as string] ?? "never") as LifestyleInputs["smokingStatus"],
    knownHypertension: Boolean(row.known_hypertension),
    knownDiabetes: Boolean(row.known_diabetes),
    sleepDuration: (durMap[row.sleep_duration as string] ?? "7_to_8") as LifestyleInputs["sleepDuration"],
    sleepLatency: (latMap[row.sleep_latency as string] ?? "15_to_30min") as LifestyleInputs["sleepLatency"],
    sleepQualSelf: (qualMap[row.sleep_qual_self as string] ?? "fair") as LifestyleInputs["sleepQualSelf"],
    daytimeFatigue: (fatMap[row.daytime_fatigue as string] ?? "sometimes") as LifestyleInputs["daytimeFatigue"],
    nightWakings: (wakeMap[row.night_wakings as string] ?? "less_once_wk") as LifestyleInputs["nightWakings"],
    sleepMedication: "never",
  }
}

/**
 * POST /api/junction/webhook
 *
 * Receives Junction (Vital) webhook events for sleep data updates.
 * On `daily.data.sleep.created` or `daily.data.sleep.updated`:
 *   1. Maps the sleep payload to SleepInputs
 *   2. Loads existing lifestyle data from Supabase
 *   3. Runs calculatePeaqScore
 *   4. Saves a new score_snapshot row
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { event_type, data, client_user_id } = body

  // Only process sleep events
  if (
    event_type !== "daily.data.sleep.created" &&
    event_type !== "daily.data.sleep.updated"
  ) {
    return NextResponse.json({ status: "ignored" })
  }

  if (!client_user_id || !data) {
    return NextResponse.json(
      { error: "Missing client_user_id or data" },
      { status: 400 }
    )
  }

  // Use service-role client (bypasses RLS) — can't use cookie-based server
  // client since webhooks are server-to-server calls with no user session
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // The client_user_id is our Supabase user ID (set when creating the Junction user)
  const userId = client_user_id

  // Map Junction sleep payload → SleepInputs
  const totalSleepSeconds = (data.deep ?? 0) + (data.light ?? 0) + (data.rem ?? 0)
  const sleepInputs: SleepInputs = {
    deepSleepPct:
      totalSleepSeconds > 0
        ? ((data.deep ?? 0) / totalSleepSeconds) * 100
        : 0,
    hrv_ms: data.average_hrv ?? 0,
    // SpO2 dips aren't in the sleep summary — default to 0
    spo2DipsPerNight: 0,
    remPct:
      totalSleepSeconds > 0
        ? ((data.rem ?? 0) / totalSleepSeconds) * 100
        : 0,
    sleepEfficiencyPct: (data.efficiency ?? 0) * 100,
  }

  // Load existing lifestyle data for the user
  let lifestyle: LifestyleInputs | undefined
  const { data: lifestyleRow } = await supabase
    .from("lifestyle_records")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single()

  if (lifestyleRow) {
    lifestyle = mapLifestyleRow(lifestyleRow as Record<string, unknown>)
  }

  // Calculate the Peaq score (sleep + lifestyle — blood/oral loaded separately)
  const result = calculatePeaqScore(sleepInputs, undefined, undefined, lifestyle)

  // Save the score snapshot
  const { error: insertError } = await supabase
    .from("score_snapshots")
    .insert({
      user_id: userId,
      calculated_at: new Date().toISOString(),
      score: result.score,
      category: result.category,
      engine_version: result.version,
      sleep_sub: result.breakdown.sleepSub,
      sleep_source: result.breakdown.sleepSource,
      blood_sub: result.breakdown.bloodSub,
      oral_sub: result.breakdown.oralSub,
      lifestyle_sub: result.breakdown.lifestyleSub,
      interaction_pool: result.breakdown.interactionPool,
      lab_freshness: result.labFreshness,
    })

  if (insertError) {
    console.error("Failed to save score snapshot:", insertError)
    return NextResponse.json(
      { error: "Failed to save score snapshot" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    status: "processed",
    score: result.score,
    category: result.category,
  })
}

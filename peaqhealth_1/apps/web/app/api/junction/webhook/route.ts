import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { calculatePeaqScore } from "@peaq/score-engine"
import type { SleepInputs, LifestyleInputs } from "@peaq/score-engine"

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

  // Use service-role client to write data regardless of RLS
  const supabase = createServiceClient(
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
    // SpO2 dips aren't in the sleep summary — default to 0 (no dips detected)
    spo2DipsPerNight: 0,
    remPct:
      totalSleepSeconds > 0
        ? ((data.rem ?? 0) / totalSleepSeconds) * 100
        : 0,
    sleepEfficiencyPct: (data.efficiency ?? 0) * 100,
  }

  // Load existing lifestyle data for the user
  const { data: lifestyleRow } = await supabase
    .from("lifestyle_records")
    .select("*")
    .eq("user_id", userId)
    .single()

  let lifestyle: LifestyleInputs | undefined
  if (lifestyleRow) {
    lifestyle = {
      exerciseLevel: lifestyleRow.exerciseLevel,
      brushingFreq: lifestyleRow.brushingFreq,
      flossingFreq: lifestyleRow.flossingFreq,
      mouthwashType: lifestyleRow.mouthwashType,
      lastDentalVisit: lifestyleRow.lastDentalVisit,
      smokingStatus: lifestyleRow.smokingStatus,
      knownHypertension: lifestyleRow.knownHypertension,
      knownDiabetes: lifestyleRow.knownDiabetes,
      sleepDuration: lifestyleRow.sleepDuration,
      sleepLatency: lifestyleRow.sleepLatency,
      sleepQualSelf: lifestyleRow.sleepQualSelf,
      daytimeFatigue: lifestyleRow.daytimeFatigue,
      nightWakings: lifestyleRow.nightWakings,
      sleepMedication: lifestyleRow.sleepMedication,
    }
  }

  // Calculate the Peaq score (sleep + lifestyle only — blood/oral loaded separately)
  const result = calculatePeaqScore(sleepInputs, undefined, undefined, lifestyle)

  // Save the score snapshot
  const { error: insertError } = await supabase
    .from("score_snapshots")
    .insert({
      user_id: userId,
      score: result.score,
      category: result.category,
      version: result.version,
      breakdown: result.breakdown,
      metrics: result.metrics,
      interactions: result.interactions,
      source_event: event_type,
      sleep_date: data.calendar_date ?? new Date().toISOString().slice(0, 10),
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

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { calculatePeaqScore, type SleepInputs } from "@peaq/score-engine"
import { mapLabRow, mapOralRow, mapLifestyleRow } from "../../../../lib/score/recalculate"

interface NightEntry {
  date:      string
  bedtime:   string
  wake_time: string
  quality:   number
}

function parseDurationSeconds(bedtime: string, wake_time: string): number {
  const [bh, bm] = bedtime.split(":").map(Number)
  const [wh, wm] = wake_time.split(":").map(Number)
  let bedMins  = (bh ?? 0) * 60 + (bm ?? 0)
  let wakeMins = (wh ?? 0) * 60 + (wm ?? 0)
  if (wakeMins <= bedMins) wakeMins += 24 * 60
  return (wakeMins - bedMins) * 60
}

// quality 1–5 → sleep efficiency %, deep sleep %, REM %
const EFFICIENCY: Record<number, number> = { 1: 58, 2: 68, 3: 76, 4: 85, 5: 92 }
const DEEP_PCT:   Record<number, number> = { 1: 12, 2: 14, 3: 16, 4: 18, 5: 20 }
const REM_PCT:    Record<number, number> = { 1: 15, 2: 17, 3: 19, 4: 21, 5: 23 }

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let nights: NightEntry[]
  try {
    nights = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!Array.isArray(nights) || nights.length === 0 || nights.length > 7) {
    return NextResponse.json({ error: "Provide 1–7 nights" }, { status: 400 })
  }

  const today       = new Date().toISOString().slice(0, 10)
  const fiveYrsAgo  = new Date(Date.now() - 5 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  const errors: string[] = []

  for (const n of nights) {
    if (!n.date || n.date > today)        errors.push(`${n.date}: date must not be in the future`)
    if (n.date < fiveYrsAgo)              errors.push(`${n.date}: date too far in the past`)
    if (!Number.isInteger(n.quality) || n.quality < 1 || n.quality > 5)
                                          errors.push(`${n.date}: quality must be 1–5`)
    if (parseDurationSeconds(n.bedtime, n.wake_time) < 3600)
                                          errors.push(`${n.date}: duration must be at least 1 hour`)
  }

  if (errors.length > 0) return NextResponse.json({ error: errors }, { status: 400 })

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const rows = nights.map((n) => ({
    user_id:          user.id,
    date:             n.date,
    bedtime:          n.bedtime,
    wake_time:        n.wake_time,
    duration_seconds: parseDurationSeconds(n.bedtime, n.wake_time),
    quality:          n.quality,
  }))

  const { error: upsertError } = await serviceClient
    .from("manual_sleep_entries")
    .upsert(rows, { onConflict: "user_id,date" })

  if (upsertError) {
    console.error("[sleep/manual] upsert error:", upsertError)
    return NextResponse.json({ error: "Failed to save sleep entries" }, { status: 500 })
  }

  // Compute SleepInputs from saved nights (averaged)
  const avg = (map: Record<number, number>) =>
    nights.reduce((s, n) => s + map[n.quality], 0) / nights.length

  const sleepInputs: SleepInputs = {
    deepSleepPct:       avg(DEEP_PCT),
    hrv_ms:             0,
    spo2DipsPerNight:   0,
    remPct:             avg(REM_PCT),
    sleepEfficiencyPct: avg(EFFICIENCY),
  }

  // Load remaining panels for a full score recalculation
  const [labsRes, oralRes, lifestyleRes] = await Promise.all([
    serviceClient.from("lab_results").select("*").eq("user_id", user.id).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).single(),
    serviceClient.from("oral_kit_orders").select("*").eq("user_id", user.id).eq("status", "results_ready").order("ordered_at", { ascending: false }).limit(1).single(),
    serviceClient.from("lifestyle_records").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).single(),
  ])

  const bloodInputs     = labsRes.data     ? mapLabRow(labsRes.data as Record<string, unknown>)           : undefined
  const oralInputs      = oralRes.data     ? mapOralRow(oralRes.data as Record<string, unknown>)          : undefined
  const lifestyleInputs = lifestyleRes.data ? mapLifestyleRow(lifestyleRes.data as Record<string, unknown>) : undefined

  const result = calculatePeaqScore(sleepInputs, bloodInputs, oralInputs, lifestyleInputs)

  await serviceClient.from("score_snapshots").insert({
    user_id:          user.id,
    calculated_at:    new Date().toISOString(),
    engine_version:   result.version,
    score:            result.score,
    category:         result.category,
    sleep_sub:        result.breakdown.sleepSub,
    sleep_source:     "manual",
    blood_sub:        result.breakdown.bloodSub,
    oral_sub:         result.breakdown.oralSub,
    lifestyle_sub:    result.breakdown.lifestyleSub,
    interaction_pool: result.breakdown.interactionPool,
    lab_freshness:    result.labFreshness,
  })

  return NextResponse.json({
    saved:           rows.length,
    new_sleep_score: result.breakdown.sleepSub,
  })
}

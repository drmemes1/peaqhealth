import { createClient as createServiceClient } from "@supabase/supabase-js"
import { calculatePeaqScore, type LifestyleInputs, type BloodInputs, type OralInputs } from "@peaq/score-engine"
import { getSleepSummaries, aggregateSleepInputs } from "@peaq/api-client/junction"
import type { SupabaseClient } from "@supabase/supabase-js"

// mapLifestyleRow — canonical version (same logic as dashboard/page.tsx)
export function mapLifestyleRow(row: Record<string, unknown>): LifestyleInputs {
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

// Map lab_results DB row to BloodInputs
export function mapLabRowToBloodInputs(row: Record<string, unknown>): BloodInputs | undefined {
  // Required fields — if all null/undefined, return undefined
  if (!row.hs_crp_mgl && !row.apob_mgdl && !row.vitd_ngml) return undefined
  return {
    hsCRP_mgL:           (row.hs_crp_mgl as number) ?? 0,
    vitaminD_ngmL:       (row.vitd_ngml as number) ?? 0,
    apoB_mgdL:           (row.apob_mgdl as number) ?? 0,
    ldl_mgdL:            (row.ldl_mgdl as number) ?? 0,
    hdl_mgdL:            (row.hdl_mgdl as number) ?? 0,
    triglycerides_mgdL:  (row.triglycerides_mgdl as number) ?? 0,
    lpa_mgdL:            (row.lpa_mgdl as number) ?? 0,
    glucose_mgdL:        row.glucose_mgdl as number | undefined,
    hba1c_pct:           row.hba1c_pct as number | undefined,
    esr_mmhr:            row.esr_mmhr as number | undefined,
    homocysteine_umolL:  row.homocysteine_umoll as number | undefined,
    ferritin_ngmL:       row.ferritin_ngml as number | undefined,
    labCollectionDate:   row.collection_date as string | undefined,
  }
}

// Map oral_kit_orders DB row to OralInputs
export function mapOralRowToOralInputs(row: Record<string, unknown>): OralInputs | undefined {
  if (!row.shannon_diversity) return undefined
  return {
    shannonDiversity:      (row.shannon_diversity as number),
    nitrateReducersPct:    (row.nitrate_reducers_pct as number) ?? 0,
    periodontopathogenPct: (row.periodontopathogen_pct as number) ?? 0,
    osaTaxaPct:            (row.osa_taxa_pct as number) ?? 0,
    collectionDate:        row.collection_date as string | undefined,
    reportId:              row.id as string | undefined,
  }
}

// Shared score recalculator — loads all user data and saves a new snapshot
export async function recalculateScore(
  userId: string,
  supabase: SupabaseClient
): Promise<number> {
  const [wearableRes, labsRes, oralRes, lifestyleRes] = await Promise.all([
    supabase.from("wearable_connections").select("*").eq("user_id", userId).eq("status", "connected").order("connected_at", { ascending: false }).limit(1).single(),
    supabase.from("lab_results").select("*").eq("user_id", userId).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).single(),
    supabase.from("oral_kit_orders").select("*").eq("user_id", userId).eq("status", "results_ready").order("ordered_at", { ascending: false }).limit(1).single(),
    supabase.from("lifestyle_records").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).single(),
  ])

  // Sleep inputs from Junction
  let sleepInputs = undefined
  if (wearableRes.data?.junction_user_id) {
    try {
      const summaries = await getSleepSummaries(wearableRes.data.junction_user_id, { days: 14 })
      sleepInputs = aggregateSleepInputs(summaries) ?? undefined
    } catch {
      // sleep data unavailable — proceed without it
    }
  }

  const bloodInputs = labsRes.data ? mapLabRowToBloodInputs(labsRes.data as Record<string, unknown>) : undefined
  const oralInputs = oralRes.data ? mapOralRowToOralInputs(oralRes.data as Record<string, unknown>) : undefined
  const lifestyleInputs = lifestyleRes.data ? mapLifestyleRow(lifestyleRes.data as Record<string, unknown>) : undefined

  const result = calculatePeaqScore(sleepInputs, bloodInputs, oralInputs, lifestyleInputs)

  await supabase.from("score_snapshots").insert({
    user_id: userId,
    calculated_at: new Date().toISOString(),
    engine_version: result.version,
    score: result.score,
    category: result.category,
    sleep_sub: result.breakdown.sleepSub,
    sleep_source: result.breakdown.sleepSource,
    blood_sub: result.breakdown.bloodSub,
    oral_sub: result.breakdown.oralSub,
    lifestyle_sub: result.breakdown.lifestyleSub,
    interaction_pool: result.breakdown.interactionPool,
    lab_result_id: labsRes.data?.id ?? null,
    oral_kit_id: oralRes.data?.id ?? null,
    wearable_connection_id: wearableRes.data?.id ?? null,
    lifestyle_record_id: lifestyleRes.data?.id ?? null,
    lab_freshness: result.labFreshness,
  })

  return result.score
}

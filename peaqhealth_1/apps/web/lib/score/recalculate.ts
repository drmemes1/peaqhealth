import { calculatePeaqScore, type LifestyleInputs, type BloodInputs, type OralInputs, type SleepInputs } from "@peaq/score-engine"
import { getSleepSummaries, aggregateSleepInputs } from "@peaq/api-client/junction"
import type { SupabaseClient } from "@supabase/supabase-js"

// ─── DB row → engine type mappers ─────────────────────────────────────────────

export function mapLifestyleRow(row: Record<string, unknown>): LifestyleInputs {
  const brushMap:  Record<string, string> = { once: "once", twice: "twice_plus", more: "twice_plus" }
  const flossMap:  Record<string, string> = { never: "rarely_never", sometimes: "sometimes", daily: "daily" }
  const mouthMap:  Record<string, string> = { none: "none", alcohol: "antiseptic", fluoride: "fluoride", natural: "none" }
  const visitMap:  Record<string, string> = { "6mo": "within_6mo", "1yr": "6_to_12mo", "2yr": "over_1yr", more: "over_2yr" }
  const smokeMap:  Record<string, string> = { never: "never", former: "former", current: "current" }
  const exMap:     Record<string, string> = { sedentary: "sedentary", light: "light", moderate: "moderate", active: "active" }
  const durMap:    Record<string, string> = { lt6: "lt_6", "6to7": "6_to_7", "7to8": "7_to_8", gt8: "gte_8" }
  const latMap:    Record<string, string> = { lt10: "lt_15min", "10to20": "15_to_30min", "20to40": "30_to_60min", gt40: "gt_60min" }
  const qualMap:   Record<string, string> = { poor: "poor", fair: "fair", good: "good", excellent: "very_good" }
  const wakeMap:   Record<string, string> = { "0": "never", "1to2": "less_once_wk", "3to5": "once_twice_wk", gt5: "3plus_wk" }
  const fatMap:    Record<string, string> = { none: "never", mild: "sometimes", moderate: "often", severe: "always" }

  return {
    exerciseLevel:   (exMap[row.exercise_level    as string] ?? "sedentary")   as LifestyleInputs["exerciseLevel"],
    brushingFreq:    (brushMap[row.brushing_freq  as string] ?? "once")        as LifestyleInputs["brushingFreq"],
    flossingFreq:    (flossMap[row.flossing_freq  as string] ?? "rarely_never") as LifestyleInputs["flossingFreq"],
    mouthwashType:   (mouthMap[row.mouthwash_type as string] ?? "none")        as LifestyleInputs["mouthwashType"],
    lastDentalVisit: (visitMap[row.last_dental_visit as string] ?? "over_1yr") as LifestyleInputs["lastDentalVisit"],
    smokingStatus:   (smokeMap[row.smoking_status as string] ?? "never")       as LifestyleInputs["smokingStatus"],
    knownHypertension: Boolean(row.known_hypertension),
    knownDiabetes:     Boolean(row.known_diabetes),
    sleepDuration:   (durMap[row.sleep_duration   as string] ?? "7_to_8")      as LifestyleInputs["sleepDuration"],
    sleepLatency:    (latMap[row.sleep_latency    as string] ?? "15_to_30min") as LifestyleInputs["sleepLatency"],
    sleepQualSelf:   (qualMap[row.sleep_qual_self as string] ?? "fair")        as LifestyleInputs["sleepQualSelf"],
    daytimeFatigue:  (fatMap[row.daytime_fatigue  as string] ?? "sometimes")   as LifestyleInputs["daytimeFatigue"],
    nightWakings:    (wakeMap[row.night_wakings   as string] ?? "less_once_wk") as LifestyleInputs["nightWakings"],
    sleepMedication: "never",
    // New optional fields (v4.2)
    hypertensionDx: row.hypertension_dx === "yes" || row.hypertension_dx === true ? true : undefined,
    onBPMeds: row.on_bp_meds === "yes" || row.on_bp_meds === true ? true : undefined,
    onStatins: row.on_statins === "yes" || row.on_statins === true ? true : undefined,
    onDiabetesMeds: row.on_diabetes_meds === "yes" || row.on_diabetes_meds === true ? true : undefined,
    familyHistoryCVD: row.family_history_cvd === "yes" ? true : row.family_history_cvd === "no" ? false : undefined,
    familyHistoryHypertension: row.family_history_hypertension === "yes" || row.family_history_hypertension === true ? true : undefined,
    restingHR: typeof row.latest_resting_hr === "number" ? row.latest_resting_hr : undefined,
    vo2max: typeof row.latest_vo2max === "number" ? row.latest_vo2max : undefined,
    vegetableServingsPerDay: typeof row.vegetable_servings_per_day === "number" ? row.vegetable_servings_per_day : undefined,
    fruitServingsPerDay: typeof row.fruit_servings_per_day === "number" ? row.fruit_servings_per_day : undefined,
    processedFoodFrequency: typeof row.processed_food_frequency === "number" ? (row.processed_food_frequency as 1|2|3|4|5) : undefined,
    sugaryDrinksPerWeek: typeof row.sugary_drinks_per_week === "number" ? row.sugary_drinks_per_week : undefined,
    alcoholDrinksPerWeek: typeof row.alcohol_drinks_per_week === "number" ? row.alcohol_drinks_per_week : undefined,
    stressLevel: typeof row.stress_level === "string" && ["low", "moderate", "high"].includes(row.stress_level) ? (row.stress_level as "low" | "moderate" | "high") : undefined,
  }
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && v > 0 ? v : undefined
}

export function mapLabRow(row: Record<string, unknown>): BloodInputs | undefined {
  const mapped = {
    hsCRP_mgL:              num(row.hs_crp_mgl),
    vitaminD_ngmL:          num(row.vitamin_d_ngml),
    apoB_mgdL:              num(row.apob_mgdl),
    ldl_mgdL:               num(row.ldl_mgdl),
    hdl_mgdL:               num(row.hdl_mgdl),
    triglycerides_mgdL:     num(row.triglycerides_mgdl),
    lpa_mgdL:               num(row.lpa_mgdl),
    glucose_mgdL:           num(row.glucose_mgdl),
    hba1c_pct:              num(row.hba1c_pct),
    eGFR_mLmin:             num(row.egfr_mlmin),
    alt_UL:                 num(row.alt_ul),
    ast_UL:                 num(row.ast_ul),
    albumin_gdL:            num(row.albumin_gdl),
    hemoglobin_gdL:         num(row.hemoglobin_gdl),
    wbc_x10L:               num(row.wbc_kul),
    rdw_pct:                num(row.rdw_pct),
    esr_mmhr:               num(row.esr_mmhr),
    homocysteine_umolL:     num(row.homocysteine_umoll),
    ferritin_ngmL:          num(row.ferritin_ngml),
    creatinine_mgdL:        num(row.creatinine_mgdl),
    bun_mgdL:               num(row.bun_mgdl),
    alkPhos_UL:             num(row.alk_phos_ul),
    totalBilirubin_mgdL:    num(row.total_bilirubin_mgdl),
    testosterone_ngdL:      num(row.testosterone_ngdl),
    totalCholesterol_mgdL:  num(row.total_cholesterol_mgdl),
    nonHDL_mgdL:            num(row.non_hdl_mgdl),
    tsh_uIUmL:              num(row.tsh_uiuml),
    sodium_mmolL:           num(row.sodium_mmoll),
    potassium_mmolL:        num(row.potassium_mmoll),
    labCollectionDate:      row.collection_date as string | undefined,
  }

  // Return undefined only if no numeric marker is present at all
  const presentKeys = Object.entries(mapped)
    .filter(([k, v]) => k !== "labCollectionDate" && v !== undefined && (v as number) > 0)
    .map(([k]) => k)

  if (presentKeys.length === 0) return undefined

  console.log("[score] blood markers present:", presentKeys)
  return mapped as BloodInputs
}

export function mapOralRow(row: Record<string, unknown>): OralInputs | undefined {
  if (!row.shannon_diversity) return undefined
  return {
    shannonDiversity:      row.shannon_diversity       as number,
    nitrateReducersPct:    (row.nitrate_reducers_pct   as number) ?? 0,
    periodontopathogenPct: (row.periodontopathogen_pct as number) ?? 0,
    osaTaxaPct:            (row.osa_taxa_pct           as number) ?? 0,
    collectionDate:        row.collection_date          as string | undefined,
    reportId:              row.id                       as string | undefined,
  }
}

// Aggregate manual sleep entries → SleepInputs
// quality 1–5 maps to sleep efficiency 58–92% (rough proxy)
function aggregateManualSleepInputs(
  rows: Array<{ duration_seconds: number; quality: number }>
): SleepInputs | null {
  const valid = rows.filter((r) => r.duration_seconds > 0).slice(0, 10)
  if (valid.length < 7) return null
  const avgEffPct =
    50 + (valid.reduce((s, r) => s + r.quality, 0) / valid.length) * 8.5
  return {
    deepSleepPct:       0,
    hrv_ms:             0,
    spo2DipsPerNight:   0,
    remPct:             0,
    sleepEfficiencyPct: avgEffPct,
  }
}

// ─── Shared score recalculator ────────────────────────────────────────────────

export async function recalculateScore(
  userId: string,
  supabase: SupabaseClient
): Promise<number> {
  const [wearableRes, labsRes, oralRes, lifestyleRes, manualSleepRes] = await Promise.all([
    supabase.from("wearable_connections").select("*").eq("user_id", userId).eq("status", "connected").order("connected_at", { ascending: false }).limit(1).single(),
    supabase.from("lab_results").select("*").eq("user_id", userId).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).single(),
    supabase.from("oral_kit_orders").select("*").eq("user_id", userId).eq("status", "results_ready").order("ordered_at", { ascending: false }).limit(1).single(),
    supabase.from("lifestyle_records").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).single(),
    supabase.from("manual_sleep_entries").select("duration_seconds,quality").eq("user_id", userId).order("date", { ascending: false }).limit(14),
  ])

  // Sleep inputs: prefer Junction API; fall back to manual entries
  let sleepInputs: SleepInputs | undefined
  if (wearableRes.data?.junction_user_id) {
    try {
      const summaries = await getSleepSummaries(wearableRes.data.junction_user_id as string, { days: 14 })
      const validNights = summaries.filter(s => s.duration > 0).length
      const aggregated = aggregateSleepInputs(summaries)
      if (aggregated) {
        sleepInputs = { ...aggregated, nightsAvailable: validNights }
      } else if (validNights > 0) {
        // Wearable connected, some nights available but not enough for reliable scoring yet
        sleepInputs = {
          deepSleepPct: 0, hrv_ms: 0, spo2DipsPerNight: 0, remPct: 0, sleepEfficiencyPct: 0,
          nightsAvailable: validNights,
        }
      }
    } catch {
      // proceed without sleep data
    }
  }
  if (!sleepInputs && manualSleepRes.data && manualSleepRes.data.length >= 7) {
    sleepInputs = aggregateManualSleepInputs(
      manualSleepRes.data as Array<{ duration_seconds: number; quality: number }>
    ) ?? undefined
  }

  const bloodInputs     = labsRes.data     ? mapLabRow(labsRes.data as Record<string, unknown>)           : undefined
  const oralInputs      = oralRes.data     ? mapOralRow(oralRes.data as Record<string, unknown>)          : undefined
  let lifestyleInputs = lifestyleRes.data ? mapLifestyleRow(lifestyleRes.data as Record<string, unknown>) : undefined

  // Merge wearable biometrics (resting HR, VO2 max) into lifestyle inputs
  if (lifestyleInputs && wearableRes.data) {
    const wRow = wearableRes.data as Record<string, unknown>
    if (typeof wRow.latest_resting_hr === "number") lifestyleInputs.restingHR = wRow.latest_resting_hr
    if (typeof wRow.latest_vo2max === "number") lifestyleInputs.vo2max = wRow.latest_vo2max
  }

  const result = calculatePeaqScore(sleepInputs, bloodInputs, oralInputs, lifestyleInputs)

  await supabase.from("score_snapshots").insert({
    user_id:                userId,
    calculated_at:          new Date().toISOString(),
    engine_version:         result.version,
    score:                  result.score,
    category:               result.category,
    sleep_sub:              result.breakdown.sleepSub,
    sleep_source:           result.breakdown.sleepSource,
    blood_sub:              result.breakdown.bloodSub,
    oral_sub:               result.breakdown.oralSub,
    lifestyle_sub:          result.breakdown.lifestyleSub,
    interaction_pool:       result.breakdown.interactionPool,
    lab_result_id:          labsRes.data?.id     ?? null,
    oral_kit_id:            oralRes.data?.id     ?? null,
    wearable_connection_id: wearableRes.data?.id ?? null,
    lifestyle_record_id:    lifestyleRes.data?.id ?? null,
    lab_freshness:          result.labFreshness,
    // v5.0 new fields
    peaq_percent:           result.peaqPercent,
    peaq_percent_label:     result.peaqPercentLabel,
    lpa_flag:               result.lpaFlag,
    hscrp_retest_flag:      result.hsCRPRetestFlag,
    blood_recency_multiplier: result.bloodRecencyMultiplier,
    interactions_fired:     result.interactionsFired,
  })

  return result.score
}

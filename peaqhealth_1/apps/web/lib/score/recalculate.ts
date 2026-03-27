import { calculatePeaqScore, type LifestyleInputs, type BloodInputs, type OralInputs, type SleepInputs } from "@peaq/score-engine"
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
  const AGE_RANGES  = ["18_29", "30_39", "40_49", "50_59", "60_69", "70_plus"] as const
  const BIO_SEXES   = ["male", "female", "non_binary", "prefer_not_to_say"] as const

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
    familyHistoryCVD: row.family_history_cvd === true ? true : row.family_history_cvd === false ? false : undefined,
    familyHistoryHypertension: row.family_history_hypertension === "yes" || row.family_history_hypertension === true ? true : undefined,
    restingHR: typeof row.latest_resting_hr === "number" ? row.latest_resting_hr : undefined,
    vo2max: typeof row.latest_vo2max === "number" ? row.latest_vo2max : undefined,
    vegetableServingsPerDay: typeof row.vegetable_servings_per_day === "number" ? row.vegetable_servings_per_day : undefined,
    fruitServingsPerDay: typeof row.fruit_servings_per_day === "number" ? row.fruit_servings_per_day : undefined,
    processedFoodFrequency: typeof row.processed_food_frequency === "number" ? (row.processed_food_frequency as 1|2|3|4|5) : undefined,
    sugaryDrinksPerWeek: typeof row.sugary_drinks_per_week === "number" ? row.sugary_drinks_per_week : undefined,
    alcoholDrinksPerWeek: typeof row.alcohol_drinks_per_week === "number" ? row.alcohol_drinks_per_week : undefined,
    stressLevel: typeof row.stress_level === "string" && ["low", "moderate", "high"].includes(row.stress_level) ? (row.stress_level as "low" | "moderate" | "high") : undefined,
    // v7.0 — age/sex demographic + preventive screening
    ageRange:      typeof row.age_range === "string" && (AGE_RANGES as readonly string[]).includes(row.age_range) ? (row.age_range as LifestyleInputs["ageRange"]) : undefined,
    biologicalSex: typeof row.biological_sex === "string" && (BIO_SEXES as readonly string[]).includes(row.biological_sex) ? (row.biological_sex as LifestyleInputs["biologicalSex"]) : undefined,
    // Only true maps to true — false/null both become undefined (no penalty for non-completion)
    cacScored:              row.cac_scored === true ? true : undefined,
    colorectalScreeningDone: row.colorectal_screening_done === true ? true : undefined,
    lungCtDone:             row.lung_ct_done === true ? true : undefined,
    mammogramDone:          row.mammogram_done === true ? true : undefined,
    dexaDone:               row.dexa_done === true ? true : undefined,
    psaDiscussed:           row.psa_discussed === true ? true : undefined,
    cervicalScreeningDone:  row.cervical_screening_done === true ? true : undefined,
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
    mcv_fL:                 num(row.mcv_fl),
    esr_mmhr:               num(row.esr_mmhr),
    homocysteine_umolL:     num(row.homocysteine_umoll),
    ferritin_ngmL:          num(row.ferritin_ngml),
    creatinine_mgdL:        num(row.creatinine_mgdl),
    bun_mgdL:               num(row.bun_mgdl),
    alkPhos_UL:             num(row.alk_phos_ul),
    totalBilirubin_mgdL:    num(row.total_bilirubin_mgdl),
    testosterone_ngdL:      num(row.testosterone_ngdl),
    freeTesto_pgmL:         num(row.free_testo_pgml),
    shbg_nmolL:             num(row.shbg_nmoll),
    totalCholesterol_mgdL:  num(row.total_cholesterol_mgdl),
    nonHDL_mgdL:            num(row.non_hdl_mgdl),
    tsh_uIUmL:              num(row.tsh_uiuml),
    freeT4_ngdL:            num(row.free_t4_ngdl),
    freeT3_pgmL:            num(row.free_t3_pgml),
    tpoAntibodies_iuML:     num(row.tpo_antibodies_iuml),
    sodium_mmolL:           num(row.sodium_mmoll),
    potassium_mmolL:        num(row.potassium_mmoll),
    uricAcid_mgdL:          num(row.uric_acid_mgdl),
    fastingInsulin_uIUmL:   num(row.fasting_insulin_uiuml),
    dhea_s_ugdL:            num(row.dhea_s_ugdl),
    igf1_ngmL:              num(row.igf1_ngml),
    cortisol_ugdL:          num(row.cortisol_ugdl),
    vitaminB12_pgmL:        num(row.vitamin_b12_pgml),
    folate_ngmL:            num(row.folate_ngml),
    psa_ngmL:               num(row.psa_ngml),
    labCollectionDate:      row.collection_date as string | undefined,
  }

  // Return undefined only if no numeric marker is present at all
  const presentKeys = Object.entries(mapped)
    .filter(([k, v]) => k !== "labCollectionDate" && v !== undefined && (v as number) > 0)
    .map(([k]) => k)

  if (presentKeys.length === 0) return undefined

  return mapped as BloodInputs
}

export function mapOralRow(row: Record<string, unknown>): OralInputs | undefined {
  if (!row.shannon_diversity) return undefined
  const base: OralInputs = {
    shannonDiversity:      row.shannon_diversity       as number,
    nitrateReducersPct:    (row.nitrate_reducers_pct   as number) ?? 0,
    periodontopathogenPct: (row.periodontopathogen_pct as number) ?? 0,
    osaTaxaPct:            (row.osa_taxa_pct           as number) ?? 0,
    collectionDate:        row.collection_date          as string | undefined,
    reportId:              row.id                       as string | undefined,
  }
  // Enrich with full OralScore data when available (from oral_score_snapshot)
  if (row.oral_score_snapshot && typeof row.oral_score_snapshot === 'object') {
    const snap = row.oral_score_snapshot as Record<string, unknown>
    if (typeof snap.pGingivalisPct === 'number') base.pGingivalisPct = snap.pGingivalisPct
    if (typeof snap.osaBurden === 'number') base.osaBurden = snap.osaBurden
    if (typeof snap.periodontalBurden === 'number') base.periodontalBurden = snap.periodontalBurden
    if (typeof snap.highOsaRisk === 'boolean') base.highOsaRisk = snap.highOsaRisk
    // D4: protective bacteria % — use from snapshot when available (engine v1.1+)
    // osaTaxaPct field is repurposed to carry protective bacteria % for the score engine
    if (typeof snap.protectivePct === 'number') base.osaTaxaPct = snap.protectivePct
  }
  return base
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
  const [wearableRes, labsRes, oralRes, lifestyleRes, manualSleepRes, whoopRes] = await Promise.all([
    supabase.from("wearable_connections").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lab_results").select("*").eq("user_id", userId).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).single(),
    supabase.from("oral_kit_orders").select("*").eq("user_id", userId).not("shannon_diversity", "is", null).order("ordered_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lifestyle_records").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("manual_sleep_entries").select("duration_seconds,quality").eq("user_id", userId).order("date", { ascending: false }).limit(14),
    supabase.from("whoop_connections").select("last_synced_at").eq("user_id", userId).maybeSingle(),
  ])

  // Sleep inputs: prefer WHOOP (if synced within 24h) → wearable_connections → manual entries
  let sleepInputs: SleepInputs | undefined

  if (wearableRes.error) console.error("[score] wearable query error:", wearableRes.error.message)
  console.log("[score] wearable found:", wearableRes.data ? "yes" : "no",
    "efficiency:", (wearableRes.data as Record<string, unknown> | null)?.sleep_efficiency ?? "—")

  // WHOOP: if synced within 24h its data is written to wearable_connections
  // with provider='whoop' and updated_at reflecting the sync time, so the
  // ORDER BY updated_at DESC query above naturally returns it first.
  const whoopSyncedAt = whoopRes.data?.last_synced_at as string | null
  void whoopSyncedAt // referenced in dashboard for display; score uses wearable_connections

  // Build sleepInputs from wearable_connections averages (populated by webhook or WHOOP sync)
  if (!sleepInputs && wearableRes.data) {
    const wRow = wearableRes.data as Record<string, unknown>
    const nightsAvailable = (wRow.nights_available as number) ?? 0
    const efficiency      = (wRow.sleep_efficiency as number) ?? 0
    const deepPct         = (wRow.deep_sleep_pct   as number) ?? 0
    const remPct          = (wRow.rem_pct           as number) ?? 0
    const hrv             = (wRow.hrv_rmssd         as number) ?? 0
    const spo2Dips        = (wRow.latest_spo2_dips  as number) ?? 0

    // Accept data if we have ≥7 nights OR sleep_efficiency is present
    const hasEnoughData = (nightsAvailable >= 7) || (efficiency > 0)

    if (hasEnoughData) {
      // Values stored as percentages (e.g. 87, 17.4, 20.1) — engine expects 0–100 scale
      sleepInputs = {
        deepSleepPct:       deepPct,
        hrv_ms:             hrv,
        spo2DipsPerNight:   spo2Dips,
        remPct:             remPct,
        sleepEfficiencyPct: efficiency,
        nightsAvailable:    nightsAvailable || undefined,
      }
      console.log("[score] sleep from wearable_connections fallback — nights:", nightsAvailable, "eff:", efficiency, "deep:", deepPct, "rem:", remPct, "hrv:", hrv)
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

  // Identify absent premium markers for logging / downstream nudges
  const missingPremium: string[] = []
  if (bloodInputs) {
    if (!bloodInputs.apoB_mgdL)        missingPremium.push("ApoB")
    if (!bloodInputs.hsCRP_mgL)        missingPremium.push("hsCRP")
    if (!bloodInputs.lpa_mgdL)         missingPremium.push("Lp(a)")
    if (!bloodInputs.vitaminD_ngmL)    missingPremium.push("Vitamin D")
    if (!bloodInputs.hba1c_pct)        missingPremium.push("HbA1c")
  }

  // Merge wearable biometrics (resting HR, VO2 max) into lifestyle inputs
  if (lifestyleInputs && wearableRes.data) {
    const wRow = wearableRes.data as Record<string, unknown>
    if (typeof wRow.latest_resting_hr === "number") lifestyleInputs.restingHR = wRow.latest_resting_hr
    if (typeof wRow.latest_vo2max === "number") lifestyleInputs.vo2max = wRow.latest_vo2max
  }

  console.log("[score] sleep inputs:", JSON.stringify(sleepInputs ?? null))
  console.log("[score] blood inputs present:", bloodInputs ? Object.keys(bloodInputs).filter(k => (bloodInputs as Record<string, unknown>)[k] != null).length : 0)

  const result = calculatePeaqScore(sleepInputs, bloodInputs, oralInputs, lifestyleInputs)

  // Sleep panel requires real wearable data — if the engine fell back to questionnaire
  // estimation (sleepSource === "questionnaire"), discard that estimate so the sleep
  // panel shows 0 and users are prompted to connect a wearable.
  const sleepSub = (!sleepInputs && result.breakdown.sleepSource === "questionnaire")
    ? 0
    : result.breakdown.sleepSub
  const storedScore = (!sleepInputs && result.breakdown.sleepSource === "questionnaire")
    ? Math.max(0, result.score - result.breakdown.sleepSub)
    : result.score
  const sleepSource = (!sleepInputs && result.breakdown.sleepSource === "questionnaire")
    ? "none"
    : result.breakdown.sleepSource

  console.log(`[recalculate] user=${userId} sleep=${sleepSub} blood=${result.breakdown.bloodSub} oral=${result.breakdown.oralSub} lifestyle=${result.breakdown.lifestyleSub} total=${storedScore} sleepSource=${sleepSource}`)

  let insertError: unknown = null
  try { await supabase.from("score_snapshots").insert({
    user_id:                userId,
    calculated_at:          new Date().toISOString(),
    engine_version:         result.version,
    score:                  storedScore,
    category:               result.category,
    sleep_sub:              sleepSub,
    sleep_source:           sleepSource,
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
  }) } catch (e) { insertError = e }
  if (insertError) console.error("[recalculate] snapshot insert failed for user:", userId, insertError)

  return result.score
}

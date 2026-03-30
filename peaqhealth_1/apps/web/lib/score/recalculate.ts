import { calculatePeaqScore, type LifestyleInputs, type BloodInputs, type OralInputs, type SleepInputs } from "@peaq/score-engine"
import type { SupabaseClient } from "@supabase/supabase-js"
import { scoreOralV2, type OralDimensionInputs } from "../oral/dimensions-v2"
import { calculateModifiers, type PanelInputs } from "./modifiers"

// Provider priority for best-per-date selection (lower = preferred)
const PROVIDER_PRIORITY: Record<string, number> = { whoop: 0, oura: 1, garmin: 2 }

// ─── Age helpers ─────────────────────────────────────────────────────────────

function ageRangeToMidpoint(range: string | null | undefined): number {
  if (!range) return 45
  const map: Record<string, number> = {
    "under_30": 25, "18_29": 25, "20_29": 25,
    "30_39": 35,
    "40_49": 45,
    "50_59": 55,
    "60_69": 65,
    "70_plus": 72, "over_70": 72,
  }
  if (map[range]) return map[range]
  const n = parseInt(range)
  return isNaN(n) ? 45 : n
}

function getHRVTarget(age: number): { optimal: number; good: number; watch: number } {
  if (age < 30) return { optimal: 60, good: 45, watch: 30 }
  if (age < 40) return { optimal: 55, good: 40, watch: 28 }
  if (age < 50) return { optimal: 48, good: 35, watch: 25 }
  if (age < 60) return { optimal: 42, good: 30, watch: 22 }
  return { optimal: 35, good: 25, watch: 18 }
}

function scoreHRVAgeAdjusted(hrv: number | null, age: number): number {
  if (hrv === null || hrv <= 0) return 0
  const targets = getHRVTarget(age)
  if (hrv >= targets.optimal) return 8
  if (hrv >= targets.good) return 5
  if (hrv >= targets.watch) return 2
  return 0
}

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
    sleepDuration:   (row.sleep_duration  ? durMap[row.sleep_duration   as string] : undefined) as LifestyleInputs["sleepDuration"],
    sleepLatency:    (row.sleep_latency   ? latMap[row.sleep_latency    as string] : undefined) as LifestyleInputs["sleepLatency"],
    sleepQualSelf:   (row.sleep_qual_self ? qualMap[row.sleep_qual_self as string] : undefined) as LifestyleInputs["sleepQualSelf"],
    daytimeFatigue:  (row.daytime_fatigue ? fatMap[row.daytime_fatigue  as string] : undefined) as LifestyleInputs["daytimeFatigue"],
    nightWakings:    (row.night_wakings   ? wakeMap[row.night_wakings   as string] : undefined) as LifestyleInputs["nightWakings"],
    sleepMedication: "never",
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
    ageRange:      typeof row.age_range === "string" && (AGE_RANGES as readonly string[]).includes(row.age_range) ? (row.age_range as LifestyleInputs["ageRange"]) : undefined,
    biologicalSex: typeof row.biological_sex === "string" && (BIO_SEXES as readonly string[]).includes(row.biological_sex) ? (row.biological_sex as LifestyleInputs["biologicalSex"]) : undefined,
    cacScored:              row.cac_scored === true ? true : undefined,
    colorectalScreeningDone: row.colorectal_screening_done === true ? true : undefined,
    lungCtDone:             row.lung_ct_done === true ? true : undefined,
    mammogramDone:          row.mammogram_done === true ? true : undefined,
    dexaDone:               row.dexa_done === true ? true : undefined,
    psaDiscussed:           row.psa_discussed === true ? true : undefined,
    cervicalScreeningDone:  row.cervical_screening_done === true ? true : undefined,
    fermentedFoodsFrequency: (["rarely", "sometimes", "daily"] as const).includes(row.fermented_foods_frequency as "rarely" | "sometimes" | "daily")
      ? (row.fermented_foods_frequency as "rarely" | "sometimes" | "daily")
      : undefined,
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
  if (row.oral_score_snapshot && typeof row.oral_score_snapshot === 'object') {
    const snap = row.oral_score_snapshot as Record<string, unknown>
    if (typeof snap.pGingivalisPct === 'number') base.pGingivalisPct = snap.pGingivalisPct
    if (typeof snap.osaBurden === 'number') base.osaBurden = snap.osaBurden
    if (typeof snap.periodontalBurden === 'number') base.periodontalBurden = snap.periodontalBurden
    if (typeof snap.highOsaRisk === 'boolean') base.highOsaRisk = snap.highOsaRisk
    if (typeof snap.protectivePct === 'number') base.osaTaxaPct = snap.protectivePct
  }
  return base
}

// Aggregate manual sleep entries → SleepInputs
function aggregateManualSleepInputs(
  rows: Array<{ duration_seconds: number; quality: number }>
): SleepInputs | null {
  const valid = rows.filter((r) => r.duration_seconds > 0).slice(0, 10)
  if (valid.length < 7) return null
  const avgEffPct = 50 + (valid.reduce((s, r) => s + r.quality, 0) / valid.length) * 8.5
  return {
    deepSleepPct: 0,
    hrv_ms: 0,
    spo2DipsPerNight: 0,
    remPct: 0,
    sleepEfficiencyPct: avgEffPct,
  }
}

// ─── Shared score recalculator (v2) ──────────────────────────────────────────

export async function recalculateScore(
  userId: string,
  supabase: SupabaseClient
): Promise<number> {
  const [labsRes, oralRes, lifestyleRes, manualSleepRes, sleepNightsRes] = await Promise.all([
    supabase.from("lab_results").select("*").eq("user_id", userId).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).single(),
    supabase.from("oral_kit_orders").select("*").eq("user_id", userId).not("shannon_diversity", "is", null).order("ordered_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lifestyle_records").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("manual_sleep_entries").select("duration_seconds,quality").eq("user_id", userId).order("date", { ascending: false }).limit(14),
    supabase.from("sleep_data")
      .select("date,source,total_sleep_minutes,deep_sleep_minutes,rem_sleep_minutes,sleep_efficiency,hrv_rmssd,spo2,resting_heart_rate")
      .eq("user_id", userId)
      .gt("sleep_efficiency", 0)
      .gte("date", (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) })())
      .order("date", { ascending: false }),
  ])

  // ── User age from lifestyle ────────────────────────────────────────────────
  const userAge = ageRangeToMidpoint(lifestyleRes.data?.age_range as string | null)

  // ── Sleep aggregation ──────────────────────────────────────────────────────
  let sleepInputs: SleepInputs | undefined
  let sleepSource = "none"

  type SleepNight = {
    date: string; source: string
    total_sleep_minutes: number; deep_sleep_minutes: number; rem_sleep_minutes: number
    sleep_efficiency: number; hrv_rmssd: number | null; spo2: number | null
    resting_heart_rate: number | null
  }
  const allNights = (sleepNightsRes.data ?? []) as unknown as SleepNight[]
  let bestNights: SleepNight[] = []

  if (allNights.length > 0) {
    const bestByDate = new Map<string, SleepNight>()
    for (const night of allNights) {
      const existing = bestByDate.get(night.date)
      const nightPriority = PROVIDER_PRIORITY[night.source] ?? 99
      const existingPriority = existing ? (PROVIDER_PRIORITY[existing.source] ?? 99) : Infinity
      if (nightPriority < existingPriority) bestByDate.set(night.date, night)
    }

    bestNights = Array.from(bestByDate.values()).sort((a, b) => b.date.localeCompare(a.date))
    const n = bestNights.length

    const getWeight = (i: number) => i < 7 ? 3.0 : i < 14 ? 2.0 : 1.0
    const weightedAvg = (key: keyof SleepNight): number => {
      let sum = 0, total = 0
      bestNights.forEach((night, i) => {
        const v = Number(night[key])
        if (!isNaN(v) && v !== 0) { const w = getWeight(i); sum += v * w; total += w }
      })
      return total > 0 ? sum / total : 0
    }

    const totalMin = weightedAvg("total_sleep_minutes")
    const spo2Avg = weightedAvg("spo2")
    const mostRecentSource = bestNights[0]?.source ?? "unknown"

    sleepInputs = {
      deepSleepPct:       totalMin > 0 ? (weightedAvg("deep_sleep_minutes") / totalMin) * 100 : 0,
      remPct:             totalMin > 0 ? (weightedAvg("rem_sleep_minutes")  / totalMin) * 100 : 0,
      sleepEfficiencyPct: weightedAvg("sleep_efficiency"),
      hrv_ms:             weightedAvg("hrv_rmssd"),
      spo2DipsPerNight:   spo2Avg >= 95 ? 0 : spo2Avg >= 92 ? 2 : 5,
      nightsAvailable:    n,
    }
    sleepSource = mostRecentSource
  }

  if (!sleepInputs && manualSleepRes.data && manualSleepRes.data.length >= 7) {
    sleepInputs = aggregateManualSleepInputs(
      manualSleepRes.data as Array<{ duration_seconds: number; quality: number }>
    ) ?? undefined
  }

  const bloodInputs = labsRes.data ? mapLabRow(labsRes.data as Record<string, unknown>) : undefined
  const oralInputsLegacy = oralRes.data ? mapOralRow(oralRes.data as Record<string, unknown>) : undefined
  let lifestyleInputs = lifestyleRes.data ? mapLifestyleRow(lifestyleRes.data as Record<string, unknown>) : undefined

  // Merge wearable resting HR
  if (lifestyleInputs && bestNights.length > 0) {
    const latestRhr = bestNights[0].resting_heart_rate
    if (typeof latestRhr === "number" && latestRhr > 0) lifestyleInputs.restingHR = latestRhr
  }

  // ── Call legacy engine to get raw sub-scores ───────────────────────────────
  const legacyResult = calculatePeaqScore(sleepInputs, bloodInputs, oralInputsLegacy, lifestyleInputs)

  // ── BLOOD: scale 33 → 40 ──────────────────────────────────────────────────
  const bloodSubRaw = legacyResult.breakdown.bloodSub
  const bloodSub = Math.round(Math.min(40, bloodSubRaw * (40 / 33)) * 10) / 10

  // ── SLEEP: scale 27 → 30, with age-adjusted HRV ──────────────────────────
  let sleepSub = 0
  if (sleepInputs && (sleepInputs.nightsAvailable ?? 7) >= 7) {
    // Get legacy sleep sub and replace HRV component with age-adjusted version
    const legacySleepSub = legacyResult.breakdown.sleepSub
    const legacyHrvScore = legacyResult.metrics.hrvScore

    // Age-adjusted HRV score (max 8 pts same as legacy)
    const ageAdjHrv = scoreHRVAgeAdjusted(sleepInputs.hrv_ms, userAge)
    const hrvTarget = getHRVTarget(userAge)
    console.log(`[sleep-engine] hrv age-adjusted: age=${userAge} target_optimal=${hrvTarget.optimal} hrv=${sleepInputs.hrv_ms?.toFixed(1)} → ${ageAdjHrv} pts`)

    // Swap HRV component: remove legacy, add age-adjusted
    const sleepWithNewHrv = legacySleepSub - legacyHrvScore + ageAdjHrv

    // Scale 27 → 30
    sleepSub = Math.round(Math.min(30, sleepWithNewHrv * (30 / 27)) * 10) / 10
  }

  // ── ORAL: v2 scoring (30 pts) ─────────────────────────────────────────────
  let oralSub = 0
  let oralBreakdown: ReturnType<typeof scoreOralV2> | null = null

  if (oralRes.data) {
    const oralSnap = (oralRes.data.oral_score_snapshot ?? {}) as Record<string, unknown>
    // Fall back to raw_otu_table for species not in oral_score_snapshot
    const otu = (oralRes.data.raw_otu_table ?? {}) as Record<string, number>

    // Extract species from OTU using exact Supabase key strings (fractional 0-1)
    const otuPGingivalis = otu["Porphyromonas gingivalis"] ?? 0
    const otuTDenticola = otu["Treponema denticola"] ?? 0
    const otuTForsythia = otu["Tannerella forsythia"] ?? 0
    const otuFNucleatum = otu["Fusobacterium nucleatum"] ?? 0
    const otuPIntermedia = otu["Prevotella intermedia"] ?? 0
    // Note: Streptococcus mutans present in OTU — caries pathogen, not scored (future dimension)
    // Sum all Prevotella species
    const otuPrevotellaTotal = Object.entries(otu)
      .filter(([k]) => k.startsWith("Prevotella"))
      .reduce((sum, [, v]) => sum + v, 0)
    // Sum all Fusobacterium species
    const otuFusobacteriumTotal = Object.entries(otu)
      .filter(([k]) => k.startsWith("Fusobacterium"))
      .reduce((sum, [, v]) => sum + v, 0)

    const oralDimInputs: OralDimensionInputs = {
      shannonDiversity:      typeof oralSnap.shannonDiversity === "number" ? oralSnap.shannonDiversity : (oralRes.data.shannon_diversity as number | null),
      nitrateReducerPct:     typeof oralSnap.nitrateReducerPct === "number" ? oralSnap.nitrateReducerPct : (oralRes.data.nitrate_reducers_pct as number | null),
      pGingivalisPct:        typeof oralSnap.pGingivalisPct === "number" ? oralSnap.pGingivalisPct : (otuPGingivalis > 0 ? otuPGingivalis : null),
      tDenticolaPct:         otuTDenticola > 0 ? otuTDenticola : null,
      tForsythiaPct:         otuTForsythia > 0 ? otuTForsythia : null,
      fNucleatumPct:         typeof oralSnap.fNucleatumPct === "number" ? oralSnap.fNucleatumPct : (otuFNucleatum > 0 ? otuFNucleatum : null),
      pIntermediaPct:        otuPIntermedia > 0 ? otuPIntermedia : null,
      aActinoPct:            null,
      protectivePct:         typeof oralSnap.protectivePct === "number" ? oralSnap.protectivePct : null,
      periodontalBurden:     typeof oralSnap.periodontalBurden === "number" ? oralSnap.periodontalBurden : null,
      prevotellaTotalPct:    typeof oralSnap.prevotellaPct === "number" ? oralSnap.prevotellaPct : (otuPrevotellaTotal > 0 ? otuPrevotellaTotal : null),
      fusobacteriumTotalPct: otuFusobacteriumTotal > 0 ? otuFusobacteriumTotal : (typeof oralSnap.fNucleatumPct === "number" ? oralSnap.fNucleatumPct : null),
    }

    oralBreakdown = scoreOralV2(oralDimInputs)
    oralSub = oralBreakdown.total

    // Store new dimension signals back to oral_kit_orders
    const neuroPathogenPct = (oralDimInputs.pGingivalisPct ?? 0) + (oralDimInputs.tDenticolaPct ?? 0)
    await supabase.from("oral_kit_orders").update({
      neuro_signal_pct: neuroPathogenPct,
      metabolic_signal_pct: oralDimInputs.prevotellaTotalPct,
      proliferative_signal_pct: oralDimInputs.fusobacteriumTotalPct,
    }).eq("id", oralRes.data.id)
  }

  // ── LIFESTYLE: compute but store as context only ──────────────────────────
  const lifestyleSub = legacyResult.breakdown.lifestyleSub

  // ── Base score = blood + sleep + oral (max 100) ───────────────────────────
  const baseScore = Math.round(Math.min(100, bloodSub + sleepSub + oralSub))

  // ── Cross-panel modifiers ─────────────────────────────────────────────────
  const oralSnapForMods = oralRes.data?.oral_score_snapshot as Record<string, unknown> | undefined
  const panelInputs: PanelInputs = {
    hrv_ms:               sleepInputs?.hrv_ms ?? null,
    sleep_efficiency_pct: sleepInputs?.sleepEfficiencyPct ?? null,
    deep_sleep_pct:       sleepInputs?.deepSleepPct ?? null,
    nights_available:     sleepInputs?.nightsAvailable ?? 0,
    hsCRP:                bloodInputs?.hsCRP_mgL ?? null,
    lpA:                  bloodInputs?.lpa_mgdL ?? null,
    ldl:                  bloodInputs?.ldl_mgdL ?? null,
    glucose:              bloodInputs?.glucose_mgdL ?? null,
    apoB:                 bloodInputs?.apoB_mgdL ?? null,
    periodontal_burden:   typeof oralSnapForMods?.periodontalBurden === "number" ? oralSnapForMods.periodontalBurden : null,
    nitrate_reducer_pct:  typeof oralSnapForMods?.nitrateReducerPct === "number" ? ((oralSnapForMods.nitrateReducerPct as number) > 1 ? (oralSnapForMods.nitrateReducerPct as number) : (oralSnapForMods.nitrateReducerPct as number) * 100) : null,
    shannon_diversity:    typeof oralSnapForMods?.shannonDiversity === "number" ? oralSnapForMods.shannonDiversity : null,
    neuro_pathogen_pct:   typeof oralSnapForMods?.pGingivalisPct === "number" ? ((oralSnapForMods.pGingivalisPct as number) + ((oralSnapForMods.tDenticolaPct as number) ?? 0)) : null,
    prevotella_pct:       typeof oralSnapForMods?.prevotellaPct === "number" ? oralSnapForMods.prevotellaPct : null,
    fusobacterium_pct:    typeof oralSnapForMods?.fNucleatumPct === "number" ? oralSnapForMods.fNucleatumPct : null,
    has_sleep:            sleepSub > 0,
    has_blood:            bloodSub > 0,
    has_oral:             oralSub > 0,
    lifestyle_score:      lifestyleSub,
  }

  const { modifiers, total: modifierTotal } = calculateModifiers(panelInputs)
  const finalScore = Math.max(0, Math.min(100, baseScore + modifierTotal))

  // ── Lifestyle context ─────────────────────────────────────────────────────
  const lifestyleContext = {
    score: lifestyleSub,
    ageRange: lifestyleRes.data?.age_range ?? null,
    answers: lifestyleInputs ?? null,
    note: "Lifestyle stored as context only — does not contribute to total score as of v2",
  }

  // ── Log ────────────────────────────────────────────────────────────────────
  console.log(`[recalculate] user=${userId} blood=${bloodSub} sleep=${sleepSub} oral=${oralSub} base=${baseScore} modifiers=${modifierTotal} (${modifiers.map(m => m.id).join(", ")}) final=${finalScore}`)

  // ── Save snapshot ─────────────────────────────────────────────────────────
  let insertError: unknown = null
  try {
    await supabase.from("score_snapshots").insert({
      user_id:                userId,
      calculated_at:          new Date().toISOString(),
      engine_version:         "8.0",
      score:                  finalScore,
      category:               finalScore >= 85 ? "excellent" : finalScore >= 70 ? "good" : finalScore >= 55 ? "fair" : "needs_attention",
      sleep_sub:              sleepSub,
      sleep_source:           !sleepInputs ? "none" : sleepSource,
      blood_sub:              bloodSub,
      oral_sub:               oralSub,
      lifestyle_sub:          0, // zeroed — stored in context
      base_score:             baseScore,
      modifier_total:         modifierTotal,
      modifiers_applied:      modifiers,
      lifestyle_context:      lifestyleContext,
      interaction_pool:       legacyResult.breakdown.interactionPool,
      lab_result_id:          labsRes.data?.id ?? null,
      oral_kit_id:            oralRes.data?.id ?? null,
      wearable_connection_id: null,
      lifestyle_record_id:    lifestyleRes.data?.id ?? null,
      lab_freshness:          legacyResult.labFreshness,
      peaq_percent:           legacyResult.peaqPercent,
      peaq_percent_label:     legacyResult.peaqPercentLabel,
      lpa_flag:               legacyResult.lpaFlag,
      hscrp_retest_flag:      legacyResult.hsCRPRetestFlag,
      blood_recency_multiplier: legacyResult.bloodRecencyMultiplier,
      interactions_fired:     legacyResult.interactionsFired,
    })
  } catch (e) { insertError = e }
  if (insertError) console.error("[recalculate] snapshot insert failed for user:", userId, insertError)

  return finalScore
}

import { calculatePeaqScore, type LifestyleInputs, type BloodInputs, type OralInputs, type SleepInputs } from "@peaq/score-engine"
import { calcPeaqAge, type PeaqAgeResult, type PeaqBloodworkInputs as PeaqBW, type OMAInputs } from "@peaq/score-engine"
import type { SupabaseClient } from "@supabase/supabase-js"
import { scoreOralV2, type OralDimensionInputs } from "../oral/dimensions-v2"
import { calculateModifiers, type PanelInputs } from "./modifiers"
import { scoreHrv } from "../hrv-scoring"
import { calculateHRV } from "@peaq/score-engine"

// Provider priority for best-per-date selection (lower = preferred)
const PROVIDER_PRIORITY: Record<string, number> = { whoop: 0, oura: 1, garmin: 2 }

// ─── Age helpers ─────────────────────────────────────────────────────────────

export function ageRangeToMidpoint(range: string | null | undefined): number {
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

export function getHRVTarget(age: number, sex?: string | null): { optimal: number; good: number; watch: number; cycleCaveat: string | null } {
  let thresholds: { optimal: number; good: number; watch: number }
  if (age < 30) thresholds = { optimal: 60, good: 45, watch: 30 }
  else if (age < 40) thresholds = { optimal: 55, good: 40, watch: 28 }
  else if (age < 50) thresholds = { optimal: 48, good: 35, watch: 25 }
  else if (age < 60) thresholds = { optimal: 42, good: 30, watch: 22 }
  else thresholds = { optimal: 35, good: 25, watch: 18 }

  const cycleCaveat = sex === "female"
    ? "Note: HRV naturally fluctuates with menstrual cycle phase. A temporary drop in the second half of the cycle (luteal phase, roughly days 15-28) is physiologically normal and does not necessarily indicate a health concern. Sustained low HRV across a full cycle warrants attention."
    : null

  return { ...thresholds, cycleCaveat }
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

// Module-level mutex — prevents concurrent recalculations for the same user
// from writing duplicate snapshot rows. Cleared after 5 s to handle crashes.
const recalcInProgress = new Set<string>()

export async function recalculateScore(
  userId: string,
  supabase: SupabaseClient
): Promise<number> {
  if (recalcInProgress.has(userId)) {
    console.log(`[recalculate] already in progress for ${userId.slice(0, 8)} — skipping`)
    return 0
  }
  recalcInProgress.add(userId)

  try {
  return await _recalculateScore(userId, supabase)
  } finally {
    setTimeout(() => recalcInProgress.delete(userId), 5000)
  }
}

async function _recalculateScore(
  userId: string,
  supabase: SupabaseClient
): Promise<number> {
  const [labsRes, oralRes, lifestyleRes, manualSleepRes, sleepNightsRes, profileRes] = await Promise.all([
    supabase.from("lab_results").select("*").eq("user_id", userId).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("oral_kit_orders").select("*").eq("user_id", userId).not("shannon_diversity", "is", null).order("ordered_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lifestyle_records").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("manual_sleep_entries").select("duration_seconds,quality").eq("user_id", userId).order("date", { ascending: false }).limit(14),
    supabase.from("sleep_data")
      .select("date,source,total_sleep_minutes,deep_sleep_minutes,rem_sleep_minutes,sleep_efficiency,hrv_rmssd,spo2,resting_heart_rate,respiratory_rate")
      .eq("user_id", userId)
      .gt("sleep_efficiency", 0)
      .gte("date", (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) })())
      .order("date", { ascending: false }),
    supabase.from("profiles").select("date_of_birth").eq("id", userId).maybeSingle(),
  ])

  // ── User age + sex ────────────────────────────────────────────────────────
  // Prefer exact age from DOB; fall back to age_range bucket estimate
  const dobStr = profileRes.data?.date_of_birth as string | null
  const userAge = dobStr
    ? Math.floor((Date.now() - new Date(dobStr).getTime()) / (365.25 * 86400000))
    : ageRangeToMidpoint(lifestyleRes.data?.age_range as string | null)
  console.log(`[peaqAge] chronoAge source: ${dobStr ? "DOB exact" : "age_range fallback"}, chronoAge: ${userAge}`)
  const rawSex = lifestyleRes.data?.biological_sex as string | null
  const userSex: 'male' | 'female' = rawSex === 'female' ? 'female' : 'male'

  // ── Sleep aggregation ──────────────────────────────────────────────────────
  let sleepInputs: SleepInputs | undefined
  let sleepSource = "none"

  type SleepNight = {
    date: string; source: string
    total_sleep_minutes: number; deep_sleep_minutes: number; rem_sleep_minutes: number
    sleep_efficiency: number; hrv_rmssd: number | null; spo2: number | null
    resting_heart_rate: number | null; respiratory_rate: number | null
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

  // ── SLEEP: v2 direct scoring (30 pts) ──────────────────────────────────────
  // Deep 8 + REM 7 + Efficiency 6 + HRV 5 (age-adjusted) + SpO2 4 = 30
  let sleepSub = 0
  if (sleepInputs && (sleepInputs.nightsAvailable ?? 7) >= 7) {
    const deep = sleepInputs.deepSleepPct
    const rem  = sleepInputs.remPct
    const eff  = sleepInputs.sleepEfficiencyPct
    const hrv  = sleepInputs.hrv_ms
    const spo2 = sleepInputs.spo2DipsPerNight

    // D1 — Deep sleep (8pts, most important — direct SWS measure)
    const deepPts = deep >= 22 ? 8 : deep >= 18 ? 6 : deep >= 15 ? 4 : deep >= 10 ? 2 : 0

    // D2 — REM (7pts)
    const remPts = rem >= 24 ? 7 : rem >= 20 ? 6 : rem >= 17 ? 4 : rem >= 13 ? 2 : 0

    // D3 — Sleep efficiency (6pts)
    const effPts = eff >= 90 ? 6 : eff >= 85 ? 5 : eff >= 80 ? 3 : eff >= 75 ? 1 : 0

    // D4 — HRV (5pts, dual-framework: population percentile + personal trend)
    // Compute 30-day rolling average from all available HRV readings
    const hrvReadings = bestNights
      .map(n => Number(n.hrv_rmssd))
      .filter(v => !isNaN(v) && v > 0)
    const rollingAvg30d = hrvReadings.length >= 7
      ? hrvReadings.reduce((a, b) => a + b, 0) / hrvReadings.length
      : null

    let hrvPts: number | null = null
    if (hrv != null && hrv > 0) {
      const hrvResult = scoreHrv(hrv, userAge, userSex, rollingAvg30d)
      hrvPts = hrvResult.finalStatus === 'optimal' ? 5 :
               hrvResult.finalStatus === 'good'    ? 3 :
               hrvResult.finalStatus === 'watch'   ? 1 : 0
      console.log(`[hrv-scoring] user=${userId.slice(0, 8)} rmssd=${hrv.toFixed(1)} age=${userAge} sex=${userSex} pop=${hrvResult.populationStatus} trend=${hrvResult.trendStatus ?? "n/a"} final=${hrvResult.finalStatus} → ${hrvPts} pts`)
    } else {
      console.log(`[hrv-scoring] user=${userId.slice(0, 8)} hrv=null → null pts`)
    }

    // D5 — SpO2 (4pts)
    // spo2DipsPerNight: 0 = good SpO2, higher = worse. avgSpo2 mapped in aggregation.
    const spo2Pts: number | null = (spo2 == null) ? null :
      spo2 <= 0 ? 4 :   // no dips = excellent
      spo2 <= 2 ? 3 :
      spo2 <= 5 ? 1 : 0

    // Proportional scaling if HRV or SpO2 is null
    const nullPts = (hrvPts === null ? 5 : 0) + (spo2Pts === null ? 4 : 0)
    const rawMax = 30 - nullPts
    const rawScore = deepPts + remPts + effPts + (hrvPts ?? 0) + (spo2Pts ?? 0)
    sleepSub = rawMax < 30 && rawMax > 0
      ? Math.round((rawScore / rawMax) * 30 * 10) / 10
      : rawScore

    console.log(`[sleep-engine] v2: deep=${deep.toFixed(1)}%→${deepPts} rem=${rem.toFixed(1)}%→${remPts} eff=${eff.toFixed(1)}%→${effPts} hrv=${hrv?.toFixed(1)}→${hrvPts ?? "null"} spo2dips=${spo2}→${spo2Pts ?? "null"} raw=${rawScore}/${rawMax} final=${sleepSub}`)
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

    // ── Oral environment index + differential pattern scores ───────────────
    // Gated by interpretability tier — 'deferred' short-circuits before scoring.
    // Internal only; feeds the narrative engine, never shown directly to users.
    await runOralSynergyScoring(
      supabase,
      oralRes.data as OralKitRow & { id: string },
      (lifestyleRes.data ?? null) as LifestyleRow | null,
      bestNights,
    )
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

  // ── CNVRG AGE V5 (dual-write alongside legacy score) ────────────────────────
  const peaqAgeResult = computePeaqAgeFromContext({
    userAge, userSex,
    labRow: labsRes.data as Record<string, unknown> | null,
    bloodInputs,
    oralSnap: oralRes.data?.oral_score_snapshot as Record<string, unknown> | null,
    oralKit: oralRes.data as Record<string, unknown> | null,
    lifestyle: lifestyleRes.data as Record<string, unknown> | null,
    sleepNights: bestNights,
  })

  // ── Log ────────────────────────────────────────────────────────────────────
  console.log(`[recalculate] user=${userId} blood=${bloodSub} sleep=${sleepSub} oral=${oralSub} base=${baseScore} modifiers=${modifierTotal} (${modifiers.map(m => m.id).join(", ")}) final=${finalScore}`)
  console.log(`[peaq-age-v5] user=${userId.slice(0, 8)} peaqAge=${peaqAgeResult.peaqAge} pheno=${peaqAgeResult.phenoAge ?? "null"} oma=${peaqAgeResult.omaPct.toFixed(0)} delta=${peaqAgeResult.delta} band=${peaqAgeResult.band} missing=[${peaqAgeResult.missingPhenoMarkers.join(",")}]`)

  // ── Recovery HRV: Pinheiro 2023 norm + 14-night gate ──────────────────────
  // hasHRV = false — weight held pending product decision. Dot is live, formula weight is not.
  // Accepts rmssd from WHOOP, Oura, Garmin, Apple Watch — field normalized to hrv_rmssd on sleep_data ingestion.
  const { data: prevHrvSnap } = await supabase.from("score_snapshots")
    .select("hrv_rmssd_median")
    .eq("user_id", userId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  const previousMedian = (prevHrvSnap?.hrv_rmssd_median as number | null) ?? undefined
  const hrvResult = calculateHRV(
    allNights
      .filter(n => n.hrv_rmssd != null && Number(n.hrv_rmssd) > 0)
      .map(n => ({ date: n.date, rmssd: Number(n.hrv_rmssd) })),
    userAge,
    userSex,
    previousMedian,
  )
  console.log(`[recovery-hrv] user=${userId.slice(0,8)} median=${hrvResult.rmssd_median}ms nights=${hrvResult.nights_count} pct=${hrvResult.percentile} status=${hrvResult.status} min14=${hrvResult.has_minimum_nights}`)

  // ── Save snapshot (dual-write: legacy v4 score + Peaq Age v5) ──────────────
  const { data: insertedRow, error: insertError } = await supabase.from("score_snapshots").insert({
    user_id:                userId,
    calculated_at:          new Date().toISOString(),
    engine_version:         "v5",
    score:                  finalScore,
    category:               finalScore >= 85 ? "excellent" : finalScore >= 70 ? "good" : finalScore >= 55 ? "fair" : "needs_attention",
    sleep_sub:              sleepSub,
    sleep_source:           !sleepInputs ? "none" : sleepSource,
    blood_sub:              bloodSub,
    oral_sub:               oralSub,
    lifestyle_sub:          0,
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
    // ── Peaq Age V5 fields (requires Phase 2a migration) ──
    peaq_age:               peaqAgeResult.peaqAge,
    pheno_age:              peaqAgeResult.phenoAge,
    oma_percentile:         peaqAgeResult.omaPct,
    vo2_percentile:         peaqAgeResult.vo2Pct,
    rhr_delta:              peaqAgeResult.rhrDelta,
    sleep_dur_delta:        peaqAgeResult.durDelta,
    sleep_reg_delta:        peaqAgeResult.regDelta,
    cross_panel_i1:         peaqAgeResult.i1,
    cross_panel_i2:         peaqAgeResult.i2,
    cross_panel_i3:         peaqAgeResult.i3,
    peaq_age_delta:         peaqAgeResult.delta,
    peaq_age_band:          peaqAgeResult.band,
    score_version:          "v5",
    peaq_age_breakdown:     { ...peaqAgeResult, hasDob: !!dobStr },
    // ── Recovery HRV (Pinheiro 2023 normalization — dot live, weight not active) ──
    hrv_rmssd_median:       hrvResult.has_minimum_nights ? hrvResult.rmssd_median : null,
    hrv_percentile:         hrvResult.has_minimum_nights ? hrvResult.percentile : null,
    hrv_delta:              hrvResult.delta,
    hrv_nights_count:       hrvResult.nights_count,
    hrv_status:             hrvResult.has_minimum_nights ? hrvResult.status : null,
  }).select("id").single()
  if (insertError) {
    console.error("[recalculate] snapshot insert failed for user:", userId, insertError)
    throw new Error(`snapshot insert failed: ${insertError.message}`)
  }

  // ── Fire-and-forget: cache AI insight + deterministic guidance ────────────
  const snapshotId = insertedRow?.id as string | undefined
  if (snapshotId) {
    cacheInsightAndGuidance(userId, snapshotId, supabase, {
      peaqAgeResult, labRow: labsRes.data, oralRow: oralRes.data,
      lifestyleRow: lifestyleRes.data, sleepNightsRes: sleepNightsRes.data,
    }).catch(err => console.error("[insight cache] failed:", err))
  }

  return finalScore
}

// ── Cache AI insight + deterministic guidance onto snapshot ──────────────────

async function cacheInsightAndGuidance(
  userId: string,
  snapshotId: string,
  supabase: SupabaseClient,
  ctx: {
    peaqAgeResult: PeaqAgeResult
    labRow: Record<string, unknown> | null
    oralRow: Record<string, unknown> | null
    lifestyleRow: Record<string, unknown> | null
    sleepNightsRes: unknown[] | null
  },
) {
  // ── Deterministic guidance items (no OpenAI needed) ──────────────────────
  const guidance: { title: string; timing: string; why?: string }[] = []
  const mwType = ctx.lifestyleRow?.mouthwash_type as string | null
  if (mwType === "antiseptic" || mwType === "alcohol")
    guidance.push({ title: "Stop antiseptic mouthwash", timing: "Today", why: "Antiseptic rinses kill the bacteria that produce nitric oxide, raising blood pressure and inflammation." })
  if (ctx.peaqAgeResult.omaPct < 40)
    guidance.push({ title: "More leafy greens and beetroot", timing: "Week 1", why: "Nitrate in these foods feeds the bacteria that produce nitric oxide, which lowers blood pressure." })
  if (ctx.peaqAgeResult.missingPhenoMarkers.length > 0)
    guidance.push({ title: "Add hs-CRP to next blood draw", timing: "Next draw", why: "hs-CRP completes your Peaq Age calculation and unlocks three cross-panel connections." })
  const ldl = ctx.labRow?.ldl_mgdl as number | null
  if (ldl && ldl > 130)
    guidance.push({ title: "Discuss LDL with your doctor", timing: "This month", why: "LDL above 130 increases plaque risk, especially when oral nitric oxide production is low." })
  if (ctx.peaqAgeResult.rhrDelta > 1)
    guidance.push({ title: "Increase aerobic exercise", timing: "This month", why: "Resting heart rate is elevated, which adds years to your Peaq Age. Cardio lowers it within weeks." })

  // ── AI insight via OpenAI ───────────────────────────────────────────────
  let headline: string | null = null
  let body: string | null = null
  try {
    const OpenAI = (await import("openai")).default
    const openai = new OpenAI()

    const pa = ctx.peaqAgeResult
    const lab = ctx.labRow
    const oral = ctx.oralRow
    const nights = (ctx.sleepNightsRes ?? []) as Array<Record<string, unknown>>

    let dataContext = ""
    if (lab) {
      dataContext += `Blood: hs-CRP ${lab.hs_crp_mgl ?? "?"}, LDL ${lab.ldl_mgdl ?? "?"}, HDL ${lab.hdl_mgdl ?? "?"}, TG ${lab.triglycerides_mgdl ?? "?"}, HbA1c ${lab.hba1c_pct ?? "?"}, Glucose ${lab.glucose_mgdl ?? "?"}, VitD ${lab.vitamin_d_ngml ?? "?"}\n`
    }
    if (oral) {
      dataContext += `Oral: Shannon ${oral.shannon_diversity}, Nitrate ${((oral.nitrate_reducers_pct as number) * 100).toFixed(1)}%, Pathogens ${((oral.periodontopathogen_pct as number) * 100).toFixed(1)}%\n`
    }
    if (nights.length > 0) {
      const avg = (k: string) => { const v = nights.map(n => Number(n[k])).filter(x => x > 0); return v.length ? v.reduce((a,b) => a+b,0)/v.length : 0 }
      dataContext += `Sleep (${nights.length}n): Deep ${avg("deep_sleep_minutes").toFixed(0)}min, HRV ${avg("hrv_rmssd").toFixed(0)}ms, Eff ${avg("sleep_efficiency").toFixed(0)}%\n`
    }
    dataContext += `Peaq Age: ${pa.peaqAge.toFixed(1)} (delta ${pa.delta.toFixed(1)}, band ${pa.band}). PhenoAge: ${pa.phenoAge ?? "pending"}. OMA: ${pa.omaPct.toFixed(0)}th. I1=${pa.i1} I2=${pa.i2} I3=${pa.i3}\n`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        { role: "system", content: "You are Cnvrg's clinical intelligence layer. Return JSON: {\"headline\":\"One bold statement about overall health picture\",\"body\":\"ONE plain-English sentence under 100 characters. Explain WHY it matters. No Peaq Age, no deltas, no lab values with units.\"}. Be specific but human. No hedging.\n\nLANGUAGE RULES — ALWAYS FOLLOW:\n- Write in plain English a smart non-scientist understands immediately\n- Lead with what this means for the person, not the mechanism\n- Never use Latin species names in the response\n- Never use: dysbiosis, biomarker, optimize, endothelial, autonomic, parasympathetic, sympathetic dominance, inflammatory cascade, NF-kB, glycemic variability, cardiometabolic\n- Replace with plain English:\n    \"dysbiosis\" → \"imbalance in your oral bacteria\"\n    \"circadian rhythm\" → \"your body's internal clock\"\n    \"insulin sensitivity\" → \"how well your body handles sugar\"\n    \"autonomic\" → \"your body's stress response system\"\n- End every insight with one specific action\n- The action must be free or low-cost first, clinical referral last\n- Never say \"consider\" or \"may want to\" — be direct" },
        { role: "user", content: `Generate a dashboard insight:\n${dataContext}` },
      ],
      response_format: { type: "json_object" },
    })
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}")
    headline = parsed.headline ?? null
    body = parsed.body ?? parsed.headline_sub ?? null
  } catch (err) {
    console.error("[insight cache] OpenAI call failed:", err)
  }

  // ── Write both to snapshot ────────────────────────────────────────────────
  await supabase.from("score_snapshots").update({
    ai_insight_headline: headline,
    ai_insight_body: body,
    ai_insight_generated_at: headline ? new Date().toISOString() : null,
    ai_guidance_items: guidance.slice(0, 3),
  }).eq("id", snapshotId)

  console.log(`[insight cache] user=${userId.slice(0,8)} headline=${headline ? "yes" : "no"} guidance=${guidance.length}`)
}

// ── Peaq Age V5 context builder ─────────────────────────────────────────────

interface PeaqAgeContext {
  userAge: number
  userSex: "male" | "female"
  labRow: Record<string, unknown> | null
  bloodInputs: BloodInputs | undefined
  oralSnap: Record<string, unknown> | null
  oralKit: Record<string, unknown> | null
  lifestyle: Record<string, unknown> | null
  sleepNights: Array<{ total_sleep_minutes: number; resting_heart_rate: number | null }>
}

function computePeaqAgeFromContext(ctx: PeaqAgeContext): PeaqAgeResult {
  const { userAge, userSex, labRow, oralSnap, oralKit, sleepNights } = ctx

  // ── Bloodwork → PeaqBW (read directly from lab_results row for PhenoAge) ──
  let bw: PeaqBW | null = null
  if (labRow) {
    const n = (k: string) => { const v = labRow[k]; return typeof v === "number" && v > 0 ? v : null }
    const hsCrp = n("hs_crp_mgl")
    bw = {
      albumin:     n("albumin_gdl"),
      creatinine:  n("creatinine_mgdl"),
      glucose:     n("glucose_mgdl"),
      crp:         hsCrp,
      lymph:       n("lymphs_pct"),
      mcv:         n("mcv_fl"),
      rdw:         n("rdw_pct"),
      alp:         n("alk_phos_ul"),
      wbc:         n("wbc_kul"),
      hsCrpAvailable: hsCrp != null,
    }
  }

  // ── OMA → OMAInputs ────────────────────────────────────────────────────
  let oma: OMAInputs | null = null
  if (oralKit && oralSnap) {
    const shannon = (oralKit as Record<string, unknown>).shannon_diversity as number | null
    const protRaw = typeof oralSnap.protectivePct === "number" ? oralSnap.protectivePct : null
    const perioRaw = typeof oralSnap.periodontalBurden === "number" ? oralSnap.periodontalBurden : null
    const otu = (oralKit as Record<string, unknown>).raw_otu_table as Record<string, number> | null

    const shannonPct = shannon != null ? simpleNhanesPercentile(shannon) : 50
    const protPct = protRaw != null ? Math.min(100, (protRaw > 1 ? protRaw : protRaw * 100) * 3) : 50
    const pathInvPct = perioRaw != null ? Math.max(0, 100 - (perioRaw > 1 ? perioRaw : perioRaw * 100) * 15) : 50

    const neisseria = otu
      ? (otu["Neisseria subflava"] ?? 0) + (otu["Rothia mucilaginosa"] ?? 0) + (otu["Haemophilus parainfluenzae"] ?? 0)
      : 0

    oma = { protective_pct: protPct, pathogen_inv_pct: pathInvPct, shannon_pct: shannonPct, neisseria_pct: neisseria }
  }

  // ── Fitness → FitnessInputs (VO₂ removed from scored formula) ──────────
  const avgRHR = sleepNights.length > 0
    ? sleepNights.reduce((s, n) => s + (n.resting_heart_rate ?? 0), 0) /
      sleepNights.filter(n => n.resting_heart_rate != null && n.resting_heart_rate > 0).length || null
    : null

  const fitness = {
    vo2max: null,
    vo2Source: null as "manual" | "estimated" | null,
    activityLevel: null as "sedentary" | "moderate" | "active" | "very_active" | null,
    rhr: avgRHR != null && isFinite(avgRHR) ? Math.round(avgRHR) : null,
  }

  // ── Sleep ────────────────────────────────────────────────────────────────
  const avgDur = sleepNights.length >= 7
    ? sleepNights.reduce((s, n) => s + n.total_sleep_minutes, 0) / sleepNights.length / 60
    : null

  const sleep = {
    avgDurationHours: avgDur,
    // TODO: compute bedtime SD once sleep_data has bedtime_start timestamps
    // from wearable sync. This unlocks the 4% sleep regularity weight (W_REG).
    // When available: compute stddev of bedtime_start across bestNights.
    bedtimeStdDevMinutes: null as number | null,
  }

  // ── Compute ──────────────────────────────────────────────────────────────
  return calcPeaqAge({
    chronoAge: userAge,
    sex: userSex,
    bloodwork: bw,
    oma,
    fitness,
    sleep,
  })
}

// Shannon → NHANES percentile (simplified inline lookup)
const NHANES_SHANNON_PCTLS: [number, number][] = [
  [5, 3.41], [10, 3.77], [25, 4.23], [50, 4.66], [75, 5.06], [90, 5.41], [95, 5.64],
]

function simpleNhanesPercentile(shannon: number): number {
  for (let i = 0; i < NHANES_SHANNON_PCTLS.length - 1; i++) {
    const [p0, v0] = NHANES_SHANNON_PCTLS[i]
    const [p1, v1] = NHANES_SHANNON_PCTLS[i + 1]
    if (shannon >= v0 && shannon <= v1) {
      return Math.round(p0 + ((shannon - v0) / (v1 - v0)) * (p1 - p0))
    }
  }
  if (shannon < NHANES_SHANNON_PCTLS[0][1]) return Math.max(1, Math.round(5 * (shannon / NHANES_SHANNON_PCTLS[0][1])))
  return Math.min(99, 95 + Math.round((shannon - 5.64) * 10))
}

// ─────────────────────────────────────────────────────────────────────────────
// ORAL ENVIRONMENT INDEX + DIFFERENTIAL PATTERN SCORES
// Add to: apps/web/lib/score/recalculate.ts
// Run AFTER L7 species abundances are stored in oral_kit_orders
// Run computeInterpretabilityTier() FIRST — if 'deferred', skip everything
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

interface OralKitRow {
  // L7 species abundances (all nullable — may not be present)
  shannon_diversity?: number | null
  s_mutans_pct?: number | null
  s_sobrinus_pct?: number | null
  lactobacillus_pct?: number | null
  veillonella_pct?: number | null
  s_sanguinis_pct?: number | null
  s_gordonii_pct?: number | null
  actinomyces_pct?: number | null
  rothia_pct?: number | null
  neisseria_pct?: number | null
  haemophilus_pct?: number | null
  porphyromonas_pct?: number | null
  fusobacterium_pct?: number | null
  treponema_pct?: number | null
  peptostreptococcus_pct?: number | null
  scardovia_pct?: number | null
  aggregatibacter_pct?: number | null
  // Collection metadata
  whitening_tray_last_48h?: boolean | null
  whitening_strips_last_48h?: boolean | null
  professional_whitening_last_7d?: boolean | null
  // Eligibility fields
  illness_upper_respiratory?: boolean | null
  illness_fever_7d?: boolean | null
  illness_gi_3d?: boolean | null
  antibiotics_last_4w?: boolean | null
  dental_cleaning_last_2w?: boolean | null
  dental_procedure_last_4w?: boolean | null
  minutes_since_waking?: number | null
  mouthwash_type?: string | null
  alcohol_prior_24h?: boolean | null
  pre_hygiene_confirmed?: boolean | null
}

interface LifestyleRow {
  whitening_frequency?: string | null
  dietary_nitrate_frequency?: string | null
  night_guard_worn?: string | null
  night_guard_type_lifestyle?: string | null
  morning_headaches?: string | null
  jaw_fatigue_morning?: string | null
  daytime_cognitive_fog?: string | null
  non_restorative_sleep?: string | null
  mouth_breathing?: string | null
  mouth_breathing_when?: string | null
  nasal_obstruction?: string | null
  nasal_obstruction_severity?: string | null
  sinus_history?: string | null
  tongue_position_awareness?: string | null
  bruxism_night?: string | null
  flossing_freq?: string | null
  last_dental_visit?: string | null
  gerd?: string | null
  gerd_nocturnal?: boolean | null
  bmi_calculated?: number | null
}

interface WearableRow {
  avg_spo2?: number | null
  spo2_nights_below_94?: number | null
  avg_respiratory_rate?: number | null
  rr_nightly_cv?: number | null
  hrv_nightly_cv?: number | null
  sleep_efficiency?: number | null
  avg_deep_sleep_minutes?: number | null
  breathing_disturbance_index?: number | null
}

interface EnvironmentIndexResult {
  env_acid_ratio: number
  env_acid_total_pct: number
  env_base_total_pct: number
  env_aerobic_score_pct: number
  env_anaerobic_load_pct: number
  env_aerobic_anaerobic_ratio: number
  env_pattern: string
  env_pattern_confidence: string
  env_peroxide_flag: boolean
  env_dietary_nitrate_flag: boolean
}

interface DifferentialScoresResult {
  score_osa: number
  score_uars: number
  score_mouth_breathing: number
  score_periodontal_activity: number
  score_bruxism: number
  score_caries_risk: number
  primary_pattern: string
  secondary_pattern: string
  no_wearable_caveat: boolean
  oral_wearable_convergence: boolean
  uars_pattern_score: number
  mouth_breathing_pattern_score: number
  bruxism_pattern_score: number
}

// ── Task 6: Interpretability Tier ────────────────────────────────────────────
// Run this FIRST. If result is 'deferred', skip all scoring.

export function computeInterpretabilityTier(kit: OralKitRow): {
  tier: string
  flags: string[]
  protocol_compliant: boolean
} {
  const flags: string[] = []

  // Hard deferred — do not report results
  if (kit.illness_upper_respiratory) flags.push('urt_illness')
  if (kit.illness_fever_7d) flags.push('fever_7d')
  if (kit.illness_gi_3d) flags.push('gi_illness')
  if (kit.antibiotics_last_4w) flags.push('antibiotics_4w')
  if (kit.professional_whitening_last_7d) flags.push('professional_whitening_7d')
  if (flags.length > 0) {
    return { tier: 'deferred', flags, protocol_compliant: false }
  }

  // Limited — significant confounders, trend only
  if (kit.dental_cleaning_last_2w) flags.push('recent_cleaning')
  if (kit.dental_procedure_last_4w) flags.push('recent_procedure')
  if ((kit.minutes_since_waking ?? 0) > 60) flags.push('late_collection')
  if (flags.length > 0) {
    return { tier: 'limited', flags, protocol_compliant: false }
  }

  // Partial — minor deviations, most signals valid
  if (kit.whitening_tray_last_48h) flags.push('whitening_tray_48h')
  if (kit.whitening_strips_last_48h) flags.push('whitening_strips_48h')
  if (kit.alcohol_prior_24h) flags.push('alcohol_24h')
  if ((kit.minutes_since_waking ?? 0) > 30) flags.push('collection_31_60min')
  if (kit.mouthwash_type?.includes('non_antiseptic')) flags.push('non_antiseptic_mouthwash')
  if (kit.pre_hygiene_confirmed === false) flags.push('post_hygiene_collection')
  if (flags.length > 0) {
    return { tier: 'partial', flags, protocol_compliant: false }
  }

  return { tier: 'full', flags: [], protocol_compliant: true }
}

// ── Task 5a: Environment Index ────────────────────────────────────────────────

export function computeOralEnvironmentIndex(
  kit: OralKitRow,
  lifestyle: LifestyleRow | null
): EnvironmentIndexResult {

  // COMPONENT 1: Acid/base ratio
  // Acidogenic: ferment sugars → lactic acid → pH drop
  const acidTotal =
    (kit.s_mutans_pct ?? 0) +
    (kit.s_sobrinus_pct ?? 0) +
    (kit.lactobacillus_pct ?? 0) +
    (kit.veillonella_pct ?? 0)

  // Alkaligenic: arginine deiminase / urease → ammonia → pH rise
  const baseTotal =
    (kit.s_sanguinis_pct ?? 0) +
    (kit.s_gordonii_pct ?? 0) +
    (kit.actinomyces_pct ?? 0)

  const acidRatio = acidTotal / (baseTotal + 0.001)

  // COMPONENT 2: Aerobic shift score
  // Obligate and facultative aerobes enriched by dry mouth / altered airway
  const aerobicScore =
    (kit.rothia_pct ?? 0) +
    (kit.neisseria_pct ?? 0) +
    (kit.actinomyces_pct ?? 0)

  const aerobicHigh = aerobicScore > 18

  // COMPONENT 3: Strict anaerobic load
  // Near-zero in OSA/UARS pattern due to ROS from hypoxia-reoxygenation cycles
  const anaerobicLoad =
    (kit.porphyromonas_pct ?? 0) +
    (kit.fusobacterium_pct ?? 0) +
    (kit.treponema_pct ?? 0) +
    (kit.peptostreptococcus_pct ?? 0)

  const aerobicAnaerobicRatio = aerobicScore / (anaerobicLoad + 0.001)

  // Paradoxical suppression: high aerobic + near-zero strict anaerobes
  // OSA/UARS signal — not present in simple mouth breathing
  const paradoxFires = aerobicAnaerobicRatio > 4.0 && aerobicScore > 20

  // COMPONENT 4: Diversity
  const diversityReduced = (kit.shannon_diversity ?? 6) < 5.5

  // CONFOUNDERS
  const peroxideFlag =
    !!(kit.whitening_tray_last_48h) ||
    !!(kit.whitening_strips_last_48h) ||
    !!(kit.professional_whitening_last_7d) ||
    lifestyle?.whitening_frequency === 'nightly_trays'

  const dietaryNitrateFlag =
    lifestyle?.dietary_nitrate_frequency === 'daily' ||
    lifestyle?.dietary_nitrate_frequency === 'multiple_daily'

  // PATTERN CLASSIFICATION
  // Peroxide flag reduces confidence — produces identical ROS-mediated
  // anaerobic suppression to OSA/UARS, cannot distinguish from bacteria alone
  const anaerobicSuppressed = paradoxFires && anaerobicLoad < 1.5

  let pattern: string
  let patternConfidence: string

  if (aerobicHigh && anaerobicSuppressed && diversityReduced) {
    pattern = peroxideFlag ? 'osa_consistent_possible_peroxide' : 'osa_consistent'
    patternConfidence = peroxideFlag ? 'low' : 'high'
  } else if (aerobicHigh && anaerobicSuppressed && !diversityReduced) {
    // Missing diversity signal — partial
    pattern = peroxideFlag ? 'mixed_possible_peroxide' : 'mixed'
    patternConfidence = 'low'
  } else if (aerobicHigh && !anaerobicSuppressed && anaerobicLoad > 1.5) {
    // Aerobic shift + active periopathogens = mouth breathing pattern
    pattern = 'mouth_breathing'
    patternConfidence = aerobicScore > 28 ? 'moderate' : 'low'
  } else if (!aerobicHigh && anaerobicLoad > 5) {
    // High anaerobic without aerobic shift = subgingival disease independent of breathing
    pattern = 'anaerobic_dominant'
    patternConfidence = 'moderate'
  } else {
    pattern = 'balanced'
    patternConfidence = 'moderate'
  }

  return {
    env_acid_ratio: parseFloat(acidRatio.toFixed(4)),
    env_acid_total_pct: parseFloat(acidTotal.toFixed(3)),
    env_base_total_pct: parseFloat(baseTotal.toFixed(3)),
    env_aerobic_score_pct: parseFloat(aerobicScore.toFixed(3)),
    env_anaerobic_load_pct: parseFloat(anaerobicLoad.toFixed(3)),
    env_aerobic_anaerobic_ratio: parseFloat(aerobicAnaerobicRatio.toFixed(2)),
    env_pattern: pattern,
    env_pattern_confidence: patternConfidence,
    env_peroxide_flag: peroxideFlag,
    env_dietary_nitrate_flag: dietaryNitrateFlag,
  }
}

// ── Task 5b: Differential Pattern Scores ─────────────────────────────────────

export function computeDifferentialScores(
  kit: OralKitRow,
  env: EnvironmentIndexResult,
  lifestyle: LifestyleRow | null,
  wearable: WearableRow | null
): DifferentialScoresResult {

  const noWearableCaveat = !wearable

  // ── OSA score
  // Requires SpO2 signals to score high — capped at 50 without wearable
  let osaScore = 0
  if (env.env_pattern === 'osa_consistent') osaScore += 35
  if (env.env_aerobic_anaerobic_ratio > 10) osaScore += 10
  if (env.env_aerobic_anaerobic_ratio > 20) osaScore += 10
  if (wearable) {
    if ((wearable.avg_spo2 ?? 100) < 95) osaScore += 15
    if ((wearable.spo2_nights_below_94 ?? 0) > 2) osaScore += 15
    if ((wearable.avg_respiratory_rate ?? 14) > 18) osaScore += 10
    if ((wearable.hrv_nightly_cv ?? 0) > 0.35) osaScore += 5
    if ((wearable.breathing_disturbance_index ?? 0) > 15) osaScore += 5
  }
  if (env.env_peroxide_flag) osaScore = Math.max(0, osaScore - 25)
  if (!wearable) osaScore = Math.min(osaScore, 50)

  // ── UARS score
  // Key signal: rr_nightly_cv (not SpO2) — UARS produces RR variability
  // without frank desaturation. Less aggressive wearable cap than OSA.
  let uarsScore = 0
  if (
    env.env_pattern === 'osa_consistent' ||
    env.env_pattern === 'mixed' ||
    env.env_pattern === 'osa_consistent_possible_peroxide'
  ) uarsScore += 25
  if (env.env_aerobic_anaerobic_ratio > 4 && env.env_aerobic_anaerobic_ratio <= 15) uarsScore += 15
  // Questionnaire — UARS symptom triad
  if (
    lifestyle?.morning_headaches === 'often' ||
    lifestyle?.morning_headaches === 'almost_always'
  ) uarsScore += 10
  if (
    lifestyle?.daytime_cognitive_fog === 'often' ||
    lifestyle?.daytime_cognitive_fog === 'almost_always'
  ) uarsScore += 10
  if (
    lifestyle?.non_restorative_sleep === 'often' ||
    lifestyle?.non_restorative_sleep === 'almost_always'
  ) uarsScore += 10
  if (lifestyle?.jaw_fatigue_morning === 'often') uarsScore += 5
  if (wearable) {
    if ((wearable.rr_nightly_cv ?? 0) > 0.25) uarsScore += 15  // KEY UARS signal
    if ((wearable.sleep_efficiency ?? 100) < 85) uarsScore += 10
    if ((wearable.avg_deep_sleep_minutes ?? 60) < 45) uarsScore += 5
  }
  if (env.env_peroxide_flag) uarsScore = Math.max(0, uarsScore - 15)
  if (!wearable) uarsScore = Math.min(uarsScore, 55)

  // ── Mouth breathing score
  // Aerobic shift + active periopathogens + nasal/questionnaire signals
  // Distinguished from OSA: anaerobes NOT suppressed
  let mbScore = 0
  if (env.env_pattern === 'mouth_breathing') mbScore += 25
  if (env.env_aerobic_score_pct > 18) mbScore += 15
  if (env.env_anaerobic_load_pct > 1.5 && env.env_aerobic_anaerobic_ratio < 4) mbScore += 15
  if (
    lifestyle?.mouth_breathing === 'confirmed' ||
    lifestyle?.mouth_breathing_when === 'sleep_only' ||
    lifestyle?.mouth_breathing_when === 'daytime_and_sleep'
  ) mbScore += 20
  if (
    lifestyle?.nasal_obstruction === 'chronic' ||
    lifestyle?.nasal_obstruction_severity === 'moderate' ||
    lifestyle?.nasal_obstruction_severity === 'severe'
  ) mbScore += 15
  if (lifestyle?.sinus_history?.includes('surgery')) mbScore += 10
  if (lifestyle?.tongue_position_awareness === 'tongue_low') mbScore += 10
  // Normal wearable + oral aerobic shift = mouth breathing more likely than OSA
  if (
    wearable &&
    (wearable.avg_respiratory_rate ?? 14) < 17 &&
    (wearable.avg_spo2 ?? 97) > 95
  ) mbScore += 10

  // ── Bruxism score
  // Night guard = confirmed clinical evidence of parafunctional activity
  let bruxismScore = 0
  if (lifestyle?.night_guard_worn === 'current') bruxismScore += 30
  if (lifestyle?.bruxism_night === 'confirmed') bruxismScore += 20
  if (
    lifestyle?.jaw_fatigue_morning === 'often' ||
    lifestyle?.jaw_fatigue_morning === 'almost_always'
  ) bruxismScore += 15
  if (lifestyle?.morning_headaches === 'often') bruxismScore += 10
  if (lifestyle?.gerd === 'yes' || lifestyle?.gerd_nocturnal) bruxismScore += 5
  if (wearable && (wearable.sleep_efficiency ?? 100) < 85) bruxismScore += 10

  // ── Periodontal activity score
  const redComplex =
    (kit.porphyromonas_pct ?? 0) +
    (kit.treponema_pct ?? 0)
  const orangeComplex =
    (kit.fusobacterium_pct ?? 0) +
    (kit.aggregatibacter_pct ?? 0)

  let perioScore = 0
  if (redComplex > 0.5) perioScore += 20
  if (redComplex > 2.0) perioScore += 15
  if (orangeComplex > 1.0) perioScore += 20
  if ((kit.aggregatibacter_pct ?? 0) > 0.5) perioScore += 15  // aggressive perio signal
  if (
    lifestyle?.flossing_freq === 'never' ||
    lifestyle?.flossing_freq === 'rarely'
  ) perioScore += 10
  if (lifestyle?.last_dental_visit === 'over_2_years') perioScore += 10

  // ── Caries risk score
  const cariesRisk = (kit.s_mutans_pct ?? 0) + (kit.s_sobrinus_pct ?? 0)
  const cariesProtective = (kit.s_sanguinis_pct ?? 0) + (kit.s_gordonii_pct ?? 0)
  let cariesScore = 0
  if (cariesRisk > 0.5) cariesScore += 30
  if (cariesRisk > 1.0) cariesScore += 20
  if ((kit.scardovia_pct ?? 0) > 0.2) cariesScore += 10
  if ((kit.lactobacillus_pct ?? 0) > 0.1) cariesScore += 20  // active caries signal
  if (env.env_acid_ratio > 0.6) cariesScore += 15
  if (cariesProtective < 1.5) cariesScore += 10

  // ── Pattern labels
  const scores = {
    osa: Math.min(osaScore, 100),
    uars: Math.min(uarsScore, 100),
    mouth_breathing: Math.min(mbScore, 100),
    periodontal_activity: Math.min(perioScore, 100),
    bruxism: Math.min(bruxismScore, 100),
    caries_risk: Math.min(cariesScore, 100),
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const primaryPattern = sorted[0][1] >= 20 ? sorted[0][0] : 'none'
  const secondaryPattern = sorted[1][1] >= 15 ? sorted[1][0] : 'none'

  return {
    score_osa: scores.osa,
    score_uars: scores.uars,
    score_mouth_breathing: scores.mouth_breathing,
    score_periodontal_activity: scores.periodontal_activity,
    score_bruxism: scores.bruxism,
    score_caries_risk: scores.caries_risk,
    primary_pattern: primaryPattern,
    secondary_pattern: secondaryPattern,
    no_wearable_caveat: noWearableCaveat,
    oral_wearable_convergence: !noWearableCaveat && osaScore > 60,
    uars_pattern_score: scores.uars,
    mouth_breathing_pattern_score: scores.mouth_breathing,
    bruxism_pattern_score: scores.bruxism,
  }
}

// ── Pipeline wiring ──────────────────────────────────────────────────────────
// Called from _recalculateScore after L7 species are stored in oral_kit_orders.
// Persists only the column set approved for this table.

type SynergyNight = {
  spo2: number | null
  hrv_rmssd: number | null
  sleep_efficiency: number
  deep_sleep_minutes: number
  respiratory_rate: number | null
}

function buildWearableFromNights(nights: SynergyNight[]): WearableRow | null {
  if (!nights || nights.length === 0) return null

  const mean = (vals: number[]) =>
    vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0) / vals.length
  const cv = (vals: number[]) => {
    if (vals.length < 2) return null
    const m = vals.reduce((a, b) => a + b, 0) / vals.length
    if (m === 0) return null
    const variance = vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length
    return Math.sqrt(variance) / m
  }

  const spo2Vals = nights.map(n => Number(n.spo2)).filter(v => Number.isFinite(v) && v > 0)
  const hrvVals = nights.map(n => Number(n.hrv_rmssd)).filter(v => Number.isFinite(v) && v > 0)
  const rrVals = nights.map(n => Number(n.respiratory_rate)).filter(v => Number.isFinite(v) && v > 0)
  const effVals = nights.map(n => Number(n.sleep_efficiency)).filter(v => Number.isFinite(v) && v > 0)
  const deepVals = nights.map(n => Number(n.deep_sleep_minutes)).filter(v => Number.isFinite(v) && v > 0)

  const spo2Below94 = spo2Vals.filter(v => v < 94).length

  return {
    avg_spo2: mean(spo2Vals),
    spo2_nights_below_94: spo2Below94,
    avg_respiratory_rate: mean(rrVals),
    rr_nightly_cv: cv(rrVals),
    hrv_nightly_cv: cv(hrvVals),
    sleep_efficiency: mean(effVals),
    avg_deep_sleep_minutes: mean(deepVals),
    breathing_disturbance_index: null,
  }
}

async function runOralSynergyScoring(
  supabase: SupabaseClient,
  kit: OralKitRow & { id: string },
  lifestyle: LifestyleRow | null,
  nights: SynergyNight[],
): Promise<void> {
  const kitId = kit.id

  // Step 1: interpretability tier — gate everything else
  const { tier, flags, protocol_compliant } = computeInterpretabilityTier(kit)
  await supabase
    .from("oral_kit_orders")
    .update({
      interpretability_tier: tier,
      compliance_flags: flags,
      protocol_compliant,
    })
    .eq("id", kitId)

  if (tier === 'deferred') {
    console.log(`[oral-synergy] kit=${kitId.slice(0, 8)} deferred — skipping scoring (flags: ${flags.join(",")})`)
    return
  }

  // Step 2: environment index + differential scores
  const wearable = buildWearableFromNights(nights)
  const envIndex = computeOralEnvironmentIndex(kit, lifestyle)
  const diffScores = computeDifferentialScores(kit, envIndex, lifestyle, wearable)

  // Step 3: persist — only the column set already in the database
  await supabase
    .from("oral_kit_orders")
    .update({
      env_acid_ratio: envIndex.env_acid_ratio,
      env_acid_total_pct: envIndex.env_acid_total_pct,
      env_base_total_pct: envIndex.env_base_total_pct,
      env_aerobic_score_pct: envIndex.env_aerobic_score_pct,
      env_anaerobic_load_pct: envIndex.env_anaerobic_load_pct,
      env_aerobic_anaerobic_ratio: envIndex.env_aerobic_anaerobic_ratio,
      env_pattern: envIndex.env_pattern,
      env_pattern_confidence: envIndex.env_pattern_confidence,
      env_peroxide_flag: envIndex.env_peroxide_flag,
      env_dietary_nitrate_flag: envIndex.env_dietary_nitrate_flag,
      score_osa: diffScores.score_osa,
      score_uars: diffScores.score_uars,
      score_mouth_breathing: diffScores.score_mouth_breathing,
      score_periodontal_activity: diffScores.score_periodontal_activity,
      score_bruxism: diffScores.score_bruxism,
      score_caries_risk: diffScores.score_caries_risk,
      primary_pattern: diffScores.primary_pattern,
      secondary_pattern: diffScores.secondary_pattern,
      no_wearable_caveat: diffScores.no_wearable_caveat,
    })
    .eq("id", kitId)

  console.log(`[oral-synergy] kit=${kitId.slice(0, 8)} tier=${tier} pattern=${diffScores.primary_pattern}/${diffScores.secondary_pattern} osa=${diffScores.score_osa} uars=${diffScores.score_uars} mb=${diffScores.score_mouth_breathing}`)
}

import { calculatePeaqScore, type LifestyleInputs, type BloodInputs, type OralInputs, type SleepInputs } from "@peaq/score-engine"
import { calcPeaqAge, type PeaqAgeResult, type PeaqBloodworkInputs as PeaqBW, type OMAInputs } from "@peaq/score-engine"
import type { SupabaseClient } from "@supabase/supabase-js"
import { scoreOralV2, type OralDimensionInputs } from "../oral/dimensions-v2"
import { calculateModifiers, type PanelInputs } from "./modifiers"
import { scoreHrv } from "../hrv-scoring"

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
      .select("date,source,total_sleep_minutes,deep_sleep_minutes,rem_sleep_minutes,sleep_efficiency,hrv_rmssd,spo2,resting_heart_rate")
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

  // ── PEAQ AGE V5 (dual-write alongside legacy score) ────────────────────────
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
        { role: "system", content: "You are Peaq's clinical intelligence layer. Return JSON: {\"headline\":\"One bold statement about overall health picture\",\"body\":\"ONE plain-English sentence under 100 characters. Explain WHY it matters. No Peaq Age, no deltas, no lab values with units.\"}. Be specific but human. No hedging.\n\nLANGUAGE RULES — ALWAYS FOLLOW:\n- Write in plain English a smart non-scientist understands immediately\n- Lead with what this means for the person, not the mechanism\n- Never use Latin species names in the response\n- Never use: dysbiosis, biomarker, optimize, endothelial, autonomic, parasympathetic, sympathetic dominance, inflammatory cascade, NF-kB, glycemic variability, cardiometabolic\n- Replace with plain English:\n    \"dysbiosis\" → \"imbalance in your oral bacteria\"\n    \"circadian rhythm\" → \"your body's internal clock\"\n    \"insulin sensitivity\" → \"how well your body handles sugar\"\n    \"autonomic\" → \"your body's stress response system\"\n- End every insight with one specific action\n- The action must be free or low-cost first, clinical referral last\n- Never say \"consider\" or \"may want to\" — be direct" },
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

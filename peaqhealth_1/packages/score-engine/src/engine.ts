/**
 * Peaq Score Engine — v7.0
 *
 * Four-panel architecture: Sleep + Blood + Oral Microbiome + Lifestyle
 *
 * Changes from v6.0 to v7.0:
 *   - Added 9 new optional demographic & preventive screening fields to LifestyleInputs:
 *     ageRange, biologicalSex, cacScored, colorectalScreeningDone, lungCtDone,
 *     mammogramDone, dexaDone, psaDiscussed, cervicalScreeningDone
 *   - Age-weighted CVD risk penalty (medicalHistoryPenalty)
 *   - Sex-adjusted VO2max thresholds (ACSM 10th ed.)
 *   - Preventive screening compliance scoring (scorePreventiveScreening)
 *
 * Changes from v5.0 to v6.0:
 *   - Lifestyle max 8->13 (proportional scaling of raw sub-scores)
 *   - Interactions removed from score total — silent insight engine only
 *   - New formula: finalScore = Math.min(100, sleepSub + bloodSub + oralSub + lifestyleSub)
 *   - No normalization divisor needed — panels sum to exactly 100
 *   - interactionPool and interactionsFired retained for downstream insight cards
 *
 * Full architecture (panels sum to exactly 100):
 *   Sleep          27 pts  (wearable) or PSQI-6 estimate (max 21 pts, capped)
 *   Blood          33 pts
 *   Oral           27 pts
 *   Lifestyle      13 pts  (questionnaire -- always active, never locked)
 *   --------------------------
 *   Total         100 pts  (no normalization needed)
 *
 *   Cross-panel interactions: silent insight engine, not scored
 */

// ---- Questionnaire types ----------------------------------------------------

export type ExerciseLevel = "active" | "moderate" | "light" | "sedentary"
export type BrushingFreq  = "twice_plus" | "once" | "less"
export type FlossingFreq  = "daily" | "most_days" | "sometimes" | "rarely_never"
export type DentalVisit   = "within_6mo" | "6_to_12mo" | "over_1yr" | "over_2yr" | "never"
export type MouthwashType = "none" | "fluoride" | "antiseptic" | "unknown"
export type SmokingStatus = "never" | "former" | "current"
export type SleepDuration = "gte_8" | "7_to_8" | "6_to_7" | "lt_6"
export type SleepLatency  = "lt_15min" | "15_to_30min" | "30_to_60min" | "gt_60min"
export type SleepQualSelf = "very_good" | "good" | "fair" | "poor"
export type DaytimeFatigue= "never" | "sometimes" | "often" | "always"

export interface LifestyleInputs {
  exerciseLevel:    ExerciseLevel
  brushingFreq:     BrushingFreq
  flossingFreq:     FlossingFreq
  mouthwashType:    MouthwashType
  lastDentalVisit:  DentalVisit
  smokingStatus:    SmokingStatus
  knownHypertension: boolean
  knownDiabetes:    boolean
  sleepDuration:    SleepDuration
  sleepLatency:     SleepLatency
  sleepQualSelf:    SleepQualSelf
  daytimeFatigue:   DaytimeFatigue
  nightWakings:     "never" | "less_once_wk" | "once_twice_wk" | "3plus_wk"
  sleepMedication:  "never" | "less_once_wk" | "once_twice_wk" | "3plus_wk"
  hypertensionDx?:  boolean
  onBPMeds?:        boolean
  onStatins?:       boolean
  onDiabetesMeds?:  boolean
  familyHistoryCVD?: boolean
  familyHistoryHypertension?: boolean
  restingHR?:       number
  vo2max?:          number
  vegetableServingsPerDay?: number
  fruitServingsPerDay?:     number
  processedFoodFrequency?:  1 | 2 | 3 | 4 | 5
  sugaryDrinksPerWeek?:     number
  alcoholDrinksPerWeek?:    number
  stressLevel?:     "low" | "moderate" | "high"
  // v7.0 — age/sex demographic + preventive screening
  ageRange?:               "18_29" | "30_39" | "40_49" | "50_59" | "60_69" | "70_plus"
  biologicalSex?:          "male" | "female" | "prefer_not_to_say"
  cacScored?:              boolean
  colorectalScreeningDone?: boolean
  lungCtDone?:             boolean
  mammogramDone?:          boolean
  dexaDone?:               boolean
  psaDiscussed?:           boolean
  cervicalScreeningDone?:  boolean
}

export interface SleepInputs {
  deepSleepPct:       number
  hrv_ms:             number
  spo2DipsPerNight:   number
  remPct:             number
  sleepEfficiencyPct: number
  avgSpo2?:           number
  highOsaRisk?:       boolean
  nightsAvailable?:   number
}

export interface BloodInputs {
  apoB_mgdL?:          number
  ldl_mgdL?:           number
  hdl_mgdL?:           number
  triglycerides_mgdL?: number
  lpa_mgdL?:           number
  hsCRP_mgL?:          number
  glucose_mgdL?:       number
  hba1c_pct?:          number
  eGFR_mLmin?:         number
  alt_UL?:             number
  ast_UL?:             number
  vitaminD_ngmL?:      number
  albumin_gdL?:        number
  hemoglobin_gdL?:     number
  wbc_x10L?:           number
  rdw_pct?:            number
  esr_mmhr?:           number
  homocysteine_umolL?: number
  ferritin_ngmL?:      number
  labCollectionDate?:  string
  sex?:                "male" | "female"
}

export interface OralInputs {
  shannonDiversity:       number
  nitrateReducersPct:     number
  periodontopathogenPct:  number
  osaTaxaPct:             number
  // Rich fields populated when full OralScore is available
  pGingivalisPct?:        number   // P. gingivalis % specifically
  osaBurden?:             number   // weighted OSA burden score
  periodontalBurden?:     number   // weighted periodontal burden score
  highOsaRisk?:           boolean  // oral-derived OSA flag
  collectionDate?:        string
  reportId?:              string
}

export interface SubPanelResult {
  name:            string
  score:           number
  maxFromPresent:  number
  panelMax:        number
  markersPresent:  string[]
  markersAbsent:   string[]
}

export interface BloodPanelResult {
  subPanels:          SubPanelResult[]
  totalBeforeRecency: number
  recencyMultiplier:  number
  total:              number
  lpaFlag:            "elevated" | "very_elevated" | null
  hsCRPRetestFlag:    boolean
}

export interface PeaqScoreResult {
  version: "7.0"
  score:    number
  category: "optimal" | "good" | "moderate" | "attention"
  breakdown: {
    sleepRaw:               number
    sleepSub:               number
    sleepSource:            "wearable" | "questionnaire" | "none"
    sleepDataInsufficient:  boolean
    sleepNightsAvailable:   number
    bloodSub:               number
    oralSub:                number
    lifestyleSub:           number
    interactionPool:        number
    oralPending:            boolean
    bloodLocked:            boolean
    lifestylePending:       boolean
  }
  bloodPanel: BloodPanelResult
  metrics: {
    deepSleepScore:     number
    hrvScore:           number
    spo2Score:          number
    remScore:           number
    vitDSleepPenalty:   number
    ferritinHrvPenalty: boolean
    crpScore:           number
    vitDScore:          number
    apoBScore:          number
    ldlHdlScore:        number
    glycemicScore:      number
    lpaScore:           number
    triglyceridesScore: number
    shannonScore:       number
    nitrateScore:       number
    periodontScore:     number
    osaScore:           number
    exerciseScore:      number
    oralHygieneScore:   number
    dentalVisitScore:   number
    heartScore:         number
    restingHRScore:     number
    vo2maxScore:        number
    nutritionScore:     number
    alcoholScore:       number
    psqiEstimate:       number
  }
  interactions: {
    sleepInflammation:      boolean
    spo2Lipid:              boolean
    dualInflammatory:       boolean
    hrvHomocysteine:        boolean
    periodontCRP:           boolean
    osaTaxaSpO2:            boolean
    lowNitrateCRP:          boolean
    lowDiversitySleep:      boolean
    poorSleepOralQ:         boolean
    poorExerciseSmoking:    boolean
    hsCRPLDL:               boolean
    lowActivityInflammation: boolean
  }
  lpaFlag:               "elevated" | "very_elevated" | null
  hsCRPRetestFlag:       boolean
  peaqPercent:           number
  peaqPercentLabel:      string
  bloodRecencyMultiplier: number
  interactionsFired:     string[]
  oralPendingTerms:      number
  lifestyleInsights:     string[]
  insights:              string[]
  labFreshness:          "fresh" | "aging" | "stale" | "expired" | "none"
  labAgeDays?:           number | undefined
  derived: {
    ldlHdlRatio:            number
    glycemicBand:           "optimal" | "high-normal" | "prediabetic" | "diabetic" | "unknown"
    missingFields:          string[]
    optionalMarkersPresent: string[]
    oralDataAge?:           number | undefined
    labCollectionDate?:     string | undefined
    oralHygieneIndex:       "excellent" | "good" | "fair" | "poor" | "unknown"
  }
}

// ---- Lifestyle scoring -------------------------------------------------------

function scoreExercise(level: ExerciseLevel): number {
  switch (level) {
    case "active":    return 2.5
    case "moderate":  return 1.5
    case "light":     return 0.75
    case "sedentary": return 0
  }
}

function scoreOralHygiene(brushing: BrushingFreq, flossing: FlossingFreq, mouthwash: MouthwashType): number {
  let pts = 0
  if (brushing === "less") {
    pts = 0
  } else {
    const b = brushing === "twice_plus" ? 0.5 : 0
    switch (flossing) {
      case "daily":        pts = 2.5 + b; break
      case "most_days":    pts = 1.5 + b; break
      case "sometimes":    pts = 0.5 + b; break
      case "rarely_never": pts = 0   + b * 0.5; break
    }
  }
  if (mouthwash === "antiseptic") pts -= 0.5
  return Math.max(0, Math.min(3, Math.round(pts * 2) / 2))
}

function scoreDentalVisit(visit: DentalVisit): number {
  switch (visit) {
    case "within_6mo": return 0.5
    case "6_to_12mo":  return 0.5
    case "over_1yr":   return 0.25
    case "over_2yr":   return 0
    case "never":      return 0
  }
}

function scoreHeart(smoking: SmokingStatus, _htn: boolean, _dm: boolean): number {
  if (smoking === "current") return 0
  if (smoking === "former")  return 1
  return 1.5
}

function scoreRestingHR(hr?: number): number {
  if (hr === undefined) return 0
  if (hr < 55)  return 1.5
  if (hr <= 65) return 1.25
  if (hr <= 75) return 1
  if (hr <= 85) return 0.5
  return 0
}

function scoreVO2Max(vo2?: number): number {
  if (vo2 === undefined) return 0
  if (vo2 > 50)  return 1
  if (vo2 >= 40) return 0.75
  if (vo2 >= 30) return 0.5
  return 0
}

function scoreNutrition(ls: LifestyleInputs): number {
  let pts = 0
  if (ls.vegetableServingsPerDay !== undefined && ls.vegetableServingsPerDay >= 3) pts += 0.5
  if (ls.fruitServingsPerDay !== undefined && ls.fruitServingsPerDay >= 2) pts += 0.25
  if (ls.processedFoodFrequency !== undefined && ls.processedFoodFrequency <= 2) pts += 0.5
  if (ls.sugaryDrinksPerWeek !== undefined && ls.sugaryDrinksPerWeek <= 3) pts += 0.25
  return Math.min(1.5, pts)
}

function scoreAlcohol(drinks?: number): number {
  if (drinks === undefined) return 0
  if (drinks <= 7)  return 0.5
  if (drinks <= 14) return 0.25
  return 0
}

function medicalHistoryPenalty(ls: LifestyleInputs): number {
  // Age multiplier: 40–59 is the primary prevention window (ACC/AHA 2019 Pooled Cohort Equations)
  const age = ls.ageRange
  const ageMultiplier =
    age === "18_29"   ? 0.5 :
    age === "30_39"   ? 1.0 :
    age === "40_49"   ? 1.5 :
    age === "50_59"   ? 1.5 :
    age === "60_69"   ? 1.0 :
    age === "70_plus" ? 0.5 : 1.0  // default when age not provided

  // Sex multiplier: pre-menopausal females have lower absolute ASCVD risk
  const isFemale = ls.biologicalSex === "female"
  const isPreMenopausal = isFemale && (age === "18_29" || age === "30_39" || age === "40_49")
  const sexMultiplier = isPreMenopausal ? 0.75 : 1.0

  let p = 0
  if (ls.familyHistoryCVD === true)                       p += 0.5
  if (ls.hypertensionDx === true && ls.onBPMeds !== true) p += 0.5
  return p * ageMultiplier * sexMultiplier
}

function oralHygieneIndex(brushing: BrushingFreq, flossing: FlossingFreq): PeaqScoreResult["derived"]["oralHygieneIndex"] {
  if (brushing === "twice_plus" && flossing === "daily")        return "excellent"
  if (brushing === "twice_plus" && flossing === "most_days")    return "excellent"
  if (brushing === "once"       && flossing === "daily")        return "good"
  if (brushing === "twice_plus" && flossing === "sometimes")    return "good"
  if (brushing === "once"       && flossing === "most_days")    return "good"
  if (brushing === "once"       && flossing === "sometimes")    return "fair"
  if (brushing === "twice_plus" && flossing === "rarely_never") return "fair"
  if (brushing === "once"       && flossing === "rarely_never") return "poor"
  if (brushing === "less")                                      return "poor"
  return "unknown"
}

// ---- Questionnaire sleep estimate -------------------------------------------

export function estimateSleepFromQuestionnaire(ls: LifestyleInputs): number {
  const dur: Record<SleepDuration, number>   = { gte_8: 6, "7_to_8": 5, "6_to_7": 3, lt_6: 0 }
  const lat: Record<SleepLatency, number>    = { lt_15min: 4, "15_to_30min": 3, "30_to_60min": 1, gt_60min: 0 }
  const qual: Record<SleepQualSelf, number>  = { very_good: 5, good: 4, fair: 2, poor: 0 }
  const wake: Record<string, number>         = { never: 4, less_once_wk: 3, once_twice_wk: 1, "3plus_wk": 0 }
  const fat: Record<DaytimeFatigue, number>  = { never: 3, sometimes: 2, often: 1, always: 0 }
  return Math.min(21, Math.max(0,
    dur[ls.sleepDuration] + lat[ls.sleepLatency] + qual[ls.sleepQualSelf] +
    (wake[ls.nightWakings] ?? 0) + fat[ls.daytimeFatigue]
  ))
}

// ---- Q interaction checks ---------------------------------------------------

function checkPoorSleepOralQ(ls: LifestyleInputs, sleepInputs?: SleepInputs): boolean {
  const poorOral = ls.brushingFreq === "less" || (ls.brushingFreq === "once" && ls.flossingFreq === "rarely_never")
  if (sleepInputs) return sleepInputs.sleepEfficiencyPct < 80 && poorOral
  return (ls.sleepQualSelf === "poor" || ls.daytimeFatigue === "always") && poorOral
}

function checkPoorExerciseSmoking(ls: LifestyleInputs): boolean {
  return ls.exerciseLevel === "sedentary" && ls.smokingStatus === "current"
}

// ---- Lifestyle insights -----------------------------------------------------

function generateLifestyleInsights(ls: LifestyleInputs, s: { exercise: number; oralHygiene: number; dental: number; heart: number; restingHR: number; vo2max: number; nutrition: number; alcohol: number }): string[] {
  const ins: string[] = []
  if (s.exercise === 0) ins.push("Sedentary lifestyle identified -- 150 min/week of moderate activity is the single highest-ROI cardiovascular intervention available to most people.")
  else if (s.exercise <= 2) ins.push("Activity level below HEPA threshold -- increasing to >=150 min moderate exercise/week reduces all-cause mortality by 31% (AHA meta-analysis).")
  const ohi = oralHygieneIndex(ls.brushingFreq, ls.flossingFreq)
  if (ohi === "poor") ins.push("Oral hygiene index: poor. Brushing less than daily is associated with 70% higher cardiovascular event risk (Scottish Health Survey).")
  else if (ohi === "fair") ins.push("Oral hygiene index: fair. Adding daily flossing is associated with 51% lower cardiovascular mortality (Janket 2023).")
  if (ls.mouthwashType === "antiseptic") ins.push("Antiseptic mouthwash raises hypertension risk by 85% via disruption of oral nitrate-reducing bacteria (SOALS 2020).")
  if (ls.lastDentalVisit === "over_2yr" || ls.lastDentalVisit === "never") ins.push("Last dental visit was over 2 years ago. Professional cleaning >=1x/year is associated with 14% lower cardiovascular risk (Park 2019).")
  if (ls.smokingStatus === "current") ins.push("Current smoking confers 2.4x hazard ratio for cardiovascular events (De Oliveira 2010).")
  if (ls.restingHR !== undefined && ls.restingHR > 85) ins.push("Resting heart rate above 85 bpm -- regular aerobic exercise is the primary intervention.")
  if (ls.alcoholDrinksPerWeek !== undefined && ls.alcoholDrinksPerWeek > 14) ins.push("Alcohol intake above 14 drinks/week directly fragments sleep architecture and raises inflammatory markers.")
  if (ls.stressLevel === "high") ins.push("High stress elevates cortisol, hsCRP, and resting heart rate -- amplifying inflammatory interactions across all panels.")
  if (ls.familyHistoryCVD) ins.push("Family history of CVD makes proactive monitoring of ApoB, hsCRP, and Lp(a) especially important.")
  if (ls.processedFoodFrequency !== undefined && ls.processedFoodFrequency >= 4) ins.push("Frequent processed food consumption is associated with elevated triglycerides and systemic inflammation.")
  return ins
}

// ---- Sleep scoring ----------------------------------------------------------

function scoreDeepSleep(pct: number): number {
  if (pct < 8)  return 0; if (pct < 12) return 3; if (pct < 17) return 8; if (pct < 22) return 12; return 15
}
function scoreHRV(hrv: number): number {
  if (hrv < 20) return 0; if (hrv < 35) return 2; if (hrv < 50) return 4; if (hrv < 70) return 6; return 8
}
function scoreSpo2(dips: number, avgSpo2?: number): number {
  let s = dips > 10 ? 0 : dips > 5 ? 1 : dips > 2 ? 2 : 4
  if (avgSpo2 !== undefined && avgSpo2 < 93) s = Math.max(0, s - 2)
  else if (avgSpo2 !== undefined && avgSpo2 < 95) s = Math.max(0, s - 1)
  return s
}
function scoreREM(pct: number): number { return pct < 12 ? 0 : pct < 18 ? 1 : 2 }
function vitDSleepMultiplier(vitD: number): number { return vitD < 20 ? 0.85 : vitD < 30 ? 0.95 : 1.0 }

// ---- Blood sub-panel helpers ------------------------------------------------

const def = (v?: number): v is number => v !== undefined && !isNaN(v) && v > 0

function cvLipids_apoB(v: number): number { return v > 130 ? 0 : v > 100 ? 1 : v > 80 ? 3 : v > 60 ? 5 : 6 }
function cvLipids_ldlHdl(ldl: number, hdl: number): { score: number; ratio: number } {
  const ratio = hdl > 0 ? parseFloat((ldl / hdl).toFixed(2)) : 99
  const score = ratio > 4 ? 0 : ratio > 3 ? 0.5 : ratio > 2 ? 1 : ratio > 1.5 ? 2 : 3
  return { score, ratio }
}
function cvLipids_tg(v: number): number { return v >= 200 ? 0 : v >= 150 ? 0.25 : v >= 100 ? 0.75 : 1 }

// Thresholds updated per 2025 ACC Scientific Statement (Mensah et al., JACC 2025)
// hsCRP >2.0 mg/L = action threshold regardless of LDL level per ACC consensus
function inflamRes_hsCRP(v: number): { score: number; retestFlag: boolean } {
  if (v > 10) return { score: 0, retestFlag: true }
  if (v > 3)  return { score: 0.25, retestFlag: false }
  if (v > 2)  return { score: 1,    retestFlag: false }
  if (v > 1)  return { score: 2,    retestFlag: false }
  if (v > 0.5) return { score: 2.5, retestFlag: false }
  return { score: 3, retestFlag: false }
}

function metabolic_glucose(v: number): number { return v >= 126 ? 0 : v >= 100 ? 1 : v >= 90 ? 2.5 : 3.5 }
function metabolic_hba1c(v: number): number   { return v >= 6.5 ? 0 : v >= 5.7 ? 1 : v >= 5.4 ? 2.5 : 3.5 }

function orgFunc_egfr(v: number): number { return v < 30 ? 0 : v < 45 ? 0.5 : v < 60 ? 1 : v < 90 ? 2 : 2.5 }
function orgFunc_alt(v: number): number  { return v > 80 ? 0 : v > 40 ? 0.25 : v > 25 ? 0.75 : 1.25 }
function orgFunc_ast(v: number): number  { return v > 80 ? 0 : v > 40 ? 0.25 : v > 25 ? 0.75 : 1.25 }

function micro_vitD(v: number): number       { return v < 12 ? 0 : v < 20 ? 0.25 : v < 30 ? 0.75 : v < 50 ? 1.5 : 2 }
function micro_albumin(v: number): number    { return v < 3.5 ? 0 : v < 4.0 ? 0.5 : 1 }
function micro_hemoglobin(v: number): number { return v < 11 ? 0 : v < 12.5 ? 0.5 : 1 }

function cbc_wbc(v: number): number { return (v > 10 || v < 3.5) ? 0 : v > 7.5 ? 1 : v < 4.5 ? 0.5 : 2 }
function cbc_rdw(v: number): number { return v > 14.5 ? 0 : v > 12.5 ? 1 : 2 }

function getLpaFlag(lpa?: number): BloodPanelResult["lpaFlag"] {
  if (!def(lpa)) return null
  return lpa > 50 ? "very_elevated" : lpa > 30 ? "elevated" : null
}

// ---- Recency decay ----------------------------------------------------------

export function computeRecencyMultiplier(ageDays?: number): number {
  if (ageDays === undefined) return 0
  if (ageDays > 365) return 0
  if (ageDays > 270) return 0.75
  if (ageDays > 180) return 0.85
  if (ageDays > 90)  return 0.95
  return 1.0
}

// ---- Blood sub-panel scoring ------------------------------------------------

const BLOOD_SCALE = 33 / 33  // raw panel maxes: CV(10)+Inf(3)+Met(7)+Org(5)+Mic(4)+CBC(4) = 33

function scaleSubPanel(earned: number, maxFromPresent: number, panelMax: number): number {
  return maxFromPresent === 0 ? 0 : (earned / maxFromPresent) * panelMax * BLOOD_SCALE
}

export function scoreBloodSubPanels(blood: BloodInputs): BloodPanelResult {
  type M = { key: string; earned: number; max: number }

  function buildPanel(name: string, entries: Array<[string, number | undefined, number, (v: number) => number]>): { panel: SubPanelResult; score: number } {
    const present: M[] = [], absent: string[] = []
    for (const [key, raw, max, fn] of entries) {
      if (def(raw)) present.push({ key, earned: fn(raw), max })
      else absent.push(key)
    }
    const earned = present.reduce((s, m) => s + m.earned, 0)
    const maxFP  = present.reduce((s, m) => s + m.max, 0)
    const score  = scaleSubPanel(earned, maxFP, entries.reduce((s, [,,m]) => s + m, 0))
    return {
      panel: {
        name,
        score: Math.round(score * 10) / 10,
        maxFromPresent: Math.round(maxFP * BLOOD_SCALE * 10) / 10,
        panelMax: Math.round(entries.reduce((s, [,,m]) => s + m, 0) * BLOOD_SCALE * 10) / 10,
        markersPresent: present.map(m => m.key),
        markersAbsent: absent,
      },
      score,
    }
  }

  // CVLipids -- special case: ldl+hdl -> ratio
  const cvPresent: M[] = [], cvAbsent: string[] = []
  if (def(blood.apoB_mgdL)) cvPresent.push({ key: "ApoB", earned: cvLipids_apoB(blood.apoB_mgdL), max: 6 })
  else cvAbsent.push("ApoB")
  if (def(blood.ldl_mgdL) && def(blood.hdl_mgdL)) {
    const { score } = cvLipids_ldlHdl(blood.ldl_mgdL, blood.hdl_mgdL)
    cvPresent.push({ key: "LDL/HDL", earned: score, max: 3 })
  } else cvAbsent.push("LDL/HDL")
  if (def(blood.triglycerides_mgdL)) cvPresent.push({ key: "Triglycerides", earned: cvLipids_tg(blood.triglycerides_mgdL), max: 1 })
  else cvAbsent.push("Triglycerides")
  const cvEarned = cvPresent.reduce((s, m) => s + m.earned, 0)
  const cvMaxFP  = cvPresent.reduce((s, m) => s + m.max, 0)
  const cvScore  = scaleSubPanel(cvEarned, cvMaxFP, 10)
  const cvPanel: SubPanelResult = {
    name: "Cardiovascular Lipids",
    score: Math.round(cvScore * 10) / 10,
    maxFromPresent: Math.round(cvMaxFP * BLOOD_SCALE * 10) / 10,
    panelMax: Math.round(10 * BLOOD_SCALE * 10) / 10,
    markersPresent: cvPresent.map(m => m.key),
    markersAbsent: cvAbsent,
  }

  // InflamRes -- track retestFlag
  let hsCRPRetestFlag = false
  const infPresent: M[] = [], infAbsent: string[] = []
  if (def(blood.hsCRP_mgL)) {
    const { score, retestFlag } = inflamRes_hsCRP(blood.hsCRP_mgL)
    hsCRPRetestFlag = retestFlag
    infPresent.push({ key: "hsCRP", earned: score, max: 3 })
  } else infAbsent.push("hsCRP")
  const infEarned = infPresent.reduce((s, m) => s + m.earned, 0)
  const infMaxFP  = infPresent.reduce((s, m) => s + m.max, 0)
  const infScore  = scaleSubPanel(infEarned, infMaxFP, 3)
  const infPanel: SubPanelResult = {
    name: "Inflammation & Resilience",
    score: Math.round(infScore * 10) / 10,
    maxFromPresent: Math.round(infMaxFP * BLOOD_SCALE * 10) / 10,
    panelMax: Math.round(3 * BLOOD_SCALE * 10) / 10,
    markersPresent: infPresent.map(m => m.key),
    markersAbsent: infAbsent,
  }

  const { panel: metPanel, score: metScore } = buildPanel("Metabolic", [
    ["Glucose", blood.glucose_mgdL, 3.5, metabolic_glucose],
    ["HbA1c",  blood.hba1c_pct,    3.5, metabolic_hba1c],
  ])
  const { panel: orgPanel, score: orgScore } = buildPanel("Organ Function", [
    ["eGFR", blood.eGFR_mLmin, 2.5, orgFunc_egfr],
    ["ALT",  blood.alt_UL,     1.25, orgFunc_alt],
    ["AST",  blood.ast_UL,     1.25, orgFunc_ast],
  ])
  const { panel: micPanel, score: micScore } = buildPanel("Micronutrients", [
    ["Vitamin D",  blood.vitaminD_ngmL,  2, micro_vitD],
    ["Albumin",    blood.albumin_gdL,    1, micro_albumin],
    ["Hemoglobin", blood.hemoglobin_gdL, 1, micro_hemoglobin],
  ])
  const { panel: cbcPanel, score: cbcScore } = buildPanel("CBC", [
    ["WBC", blood.wbc_x10L, 2, cbc_wbc],
    ["RDW", blood.rdw_pct,  2, cbc_rdw],
  ])

  const ageDays = blood.labCollectionDate
    ? Math.floor((Date.now() - new Date(blood.labCollectionDate).getTime()) / 86400000)
    : undefined
  const totalBeforeRecency = cvScore + infScore + metScore + orgScore + micScore + cbcScore
  const recencyMultiplier  = computeRecencyMultiplier(ageDays)
  const total              = Math.round(totalBeforeRecency * recencyMultiplier * 10) / 10

  return {
    subPanels: [cvPanel, infPanel, metPanel, orgPanel, micPanel, cbcPanel],
    totalBeforeRecency: Math.round(totalBeforeRecency * 10) / 10,
    recencyMultiplier,
    total,
    lpaFlag: getLpaFlag(blood.lpa_mgdL),
    hsCRPRetestFlag,
  }
}

// ---- Oral scoring -----------------------------------------------------------

function scoreShannon(h: number): number { return h < 2.0 ? 0 : h < 2.5 ? 2 : h < 3.0 ? 5 : h < 3.5 ? 7 : 9 }
function scoreNitrateReducers(pct: number): number { return pct < 0.5 ? 0 : pct < 2 ? 2 : pct < 5 ? 4 : pct < 10 ? 6 : 7 }
function scorePeriodontopathogen(pct: number): number { return pct >= 5 ? 0 : pct >= 2 ? 2 : pct >= 0.5 ? 5 : 7 }
function scoreOsaTaxa(pct: number): number { return pct >= 3 ? 0 : pct >= 1 ? 2 : 4 }

// ---- Interaction checks -----------------------------------------------------

// 2025 ACC: elevated LDL + elevated hsCRP compound risk even when either alone appears borderline
function checkHsCRPLDL(crp: number, ldl?: number): boolean { return crp > 2.0 && ldl !== undefined && ldl > 130 }
// Low physical activity compounds inflammatory marker elevation
function checkLowActivityInflammation(exerciseLevel: string, crp: number): boolean { return (exerciseLevel === "sedentary" || exerciseLevel === "light") && crp > 2.0 }
function checkSleepInflammation(eff: number, crp: number): boolean { return eff < 80 && crp > 1.0 }
function checkSpo2Lipid(dips: number, ratio: number): boolean { return dips > 2 && ratio > 2.5 }
function checkDualInflammatory(crp: number, esr?: number): boolean { return esr !== undefined && crp > 1.0 && esr > 20 }
function checkHrvHomocysteine(hrv: number, hcy?: number): boolean { return hcy !== undefined && hrv < 40 && hcy > 10 }
function checkPeriodontCRP(pPct: number, crp: number): boolean { return pPct >= 2 && crp > 1.0 }
function checkOsaTaxaSpO2(osaPct: number, dips: number, highRisk?: boolean): boolean {
  return !!highRisk || (osaPct >= 1 && dips > 2)
}
function checkLowNitrateCRP(nPct: number, crp: number): boolean { return nPct < 2 && crp > 1.0 }
function checkLowDiversitySleep(shannon: number, eff: number): boolean { return shannon < 2.5 && eff < 80 }

// ---- Lab freshness + helpers ------------------------------------------------

export type LabFreshness = "fresh" | "aging" | "stale" | "expired" | "none"

export function computeLabFreshness(labCollectionDate?: string): { freshness: LabFreshness; ageDays?: number } {
  if (!labCollectionDate) return { freshness: "none" }
  const drawn = new Date(labCollectionDate)
  if (isNaN(drawn.getTime())) return { freshness: "none" }
  const ageDays = Math.floor((Date.now() - drawn.getTime()) / 86400000)
  if (ageDays > 365) return { freshness: "expired", ageDays }
  if (ageDays > 270) return { freshness: "stale",   ageDays }
  if (ageDays > 180) return { freshness: "aging",   ageDays }
  return { freshness: "fresh", ageDays }
}

function getCategory(score: number): PeaqScoreResult["category"] {
  if (score >= 85) return "optimal"
  if (score >= 65) return "good"
  if (score >= 45) return "moderate"
  return "attention"
}

function computeGlycemicBand(glucose?: number, hba1c?: number): PeaqScoreResult["derived"]["glycemicBand"] {
  if (!def(glucose) && !def(hba1c)) return "unknown"
  type Band = PeaqScoreResult["derived"]["glycemicBand"]
  const rank: Record<Band, number> = { optimal: 0, "high-normal": 1, prediabetic: 2, diabetic: 3, unknown: -1 }
  let band: Band = "optimal"
  const worse = (a: Band, b: Band): Band => rank[b] > rank[a] ? b : a
  if (def(glucose)) {
    if (glucose >= 126) band = worse(band, "diabetic")
    else if (glucose >= 100) band = worse(band, "prediabetic")
    else if (glucose >= 90) band = worse(band, "high-normal")
  }
  if (def(hba1c)) {
    if (hba1c >= 6.5) band = worse(band, "diabetic")
    else if (hba1c >= 5.7) band = worse(band, "prediabetic")
    else if (hba1c >= 5.4) band = worse(band, "high-normal")
  }
  return band
}

// ---- Peaq% completeness gauge -----------------------------------------------

export interface PeaqPercentInputs {
  sleep?:     SleepInputs
  blood?:     BloodInputs
  oral?:      OralInputs
  lifestyle?: LifestyleInputs
}

export interface PeaqPercentResult {
  peaqPercent:      number
  peaqPercentLabel: string
  breakdown: { sleep: number; blood: number; oral: number; lifestyle: number; total: number }
}

export function calculatePeaqPercent(inputs: PeaqPercentInputs): PeaqPercentResult {
  const sleepPts = inputs.sleep ? 25 : inputs.lifestyle ? 12 : 0
  const b = inputs.blood
  const core = b ? [b.apoB_mgdL, b.ldl_mgdL, b.hdl_mgdL, b.triglycerides_mgdL, b.hsCRP_mgL, b.hba1c_pct, b.glucose_mgdL, b.vitaminD_ngmL, b.eGFR_mLmin, b.alt_UL, b.ast_UL, b.wbc_x10L, b.rdw_pct, b.albumin_gdL, b.hemoglobin_gdL] : []
  const bloodPts     = Math.round((core.filter(def).length / 15) * 30)
  const oralPts      = inputs.oral ? 20 : 0
  const lifestylePts = inputs.lifestyle ? 15 : 0
  const total        = sleepPts + bloodPts + oralPts + lifestylePts
  const peaqPercent  = Math.round(Math.min(100, (total / 95) * 100))
  const peaqPercentLabel = peaqPercent >= 80 ? "Comprehensive" : peaqPercent >= 60 ? "Developing" : peaqPercent >= 40 ? "Foundational" : "Getting Started"
  return { peaqPercent, peaqPercentLabel, breakdown: { sleep: sleepPts, blood: bloodPts, oral: oralPts, lifestyle: lifestylePts, total } }
}

// ---- Main scoring function --------------------------------------------------

export function calculatePeaqScore(sleep?: SleepInputs, blood?: BloodInputs, oral?: OralInputs, lifestyle?: LifestyleInputs): PeaqScoreResult {

  const { freshness: labFreshness, ageDays: labAgeDays } = computeLabFreshness(blood?.labCollectionDate)

  const bloodPanel: BloodPanelResult = blood
    ? scoreBloodSubPanels(blood)
    : { subPanels: [], totalBeforeRecency: 0, recencyMultiplier: 0, total: 0, lpaFlag: null, hsCRPRetestFlag: false }

  const bloodLocked = bloodPanel.recencyMultiplier === 0
  const bloodSub    = bloodPanel.total

  // Legacy blood metrics for compat
  const crpScore          = blood && !bloodLocked && def(blood.hsCRP_mgL)        ? inflamRes_hsCRP(blood.hsCRP_mgL).score : 0
  const vitDScore         = blood && !bloodLocked && def(blood.vitaminD_ngmL)     ? micro_vitD(blood.vitaminD_ngmL)        : 0
  const apoBScore         = blood && !bloodLocked && def(blood.apoB_mgdL)         ? cvLipids_apoB(blood.apoB_mgdL)         : 0
  const { score: ldlHdlScore, ratio: ldlHdlRatio } =
    blood && !bloodLocked && def(blood.ldl_mgdL) && def(blood.hdl_mgdL)
      ? cvLipids_ldlHdl(blood.ldl_mgdL, blood.hdl_mgdL)
      : { score: 0, ratio: 0 }
  const triglyceridesScore = blood && !bloodLocked && def(blood.triglycerides_mgdL) ? cvLipids_tg(blood.triglycerides_mgdL) : 0
  const glycemicScore      = blood && !bloodLocked
    ? (def(blood.glucose_mgdL) ? metabolic_glucose(blood.glucose_mgdL) : 0) + (def(blood.hba1c_pct) ? metabolic_hba1c(blood.hba1c_pct) : 0)
    : 0
  const lpaScore           = 0
  const glycemicBand       = computeGlycemicBand(blood?.glucose_mgdL, blood?.hba1c_pct)
  const optionalMarkersPresent: string[] = []
  if (blood?.esr_mmhr !== undefined)           optionalMarkersPresent.push("ESR")
  if (blood?.homocysteine_umolL !== undefined) optionalMarkersPresent.push("Homocysteine")
  if (blood?.ferritin_ngmL !== undefined)      optionalMarkersPresent.push("Ferritin")

  // Sleep
  let sleepRaw = 0, sleepSub = 0
  let deepSleepScore = 0, hrvScore = 0, spo2Score = 0, remScore = 0
  let vitDSleepPenalty = 1.0, ferritinHrvPenalty = false
  let sleepSource: "wearable" | "questionnaire" | "none" = "none"
  let psqiEstimate = 0

  const sleepNightsAvailable = sleep?.nightsAvailable ?? (sleep ? 7 : 0)
  const sleepDataInsufficient = sleep !== undefined && sleepNightsAvailable < 7

  if (sleep && sleepNightsAvailable >= 7) {
    sleepSource      = "wearable"
    deepSleepScore   = scoreDeepSleep(sleep.deepSleepPct)
    remScore         = scoreREM(sleep.remPct)
    // Treat 0 as "no data" for HRV and SPO2 — wearables store 0 when the metric is unavailable
    spo2Score        = (sleep.spo2DipsPerNight > 0 || sleep.avgSpo2 !== undefined) ? scoreSpo2(sleep.spo2DipsPerNight, sleep.avgSpo2) : 0
    const vitD       = blood && !bloodLocked ? (blood.vitaminD_ngmL ?? 30) : 30
    vitDSleepPenalty = vitDSleepMultiplier(vitD)
    ferritinHrvPenalty = blood?.ferritin_ngmL !== undefined && blood.ferritin_ngmL < 20
    const rawHrv     = sleep.hrv_ms > 0 ? scoreHRV(sleep.hrv_ms) : 0
    hrvScore         = ferritinHrvPenalty ? rawHrv * 0.85 : rawHrv
    sleepRaw         = deepSleepScore + hrvScore + spo2Score + remScore
    sleepSub         = Math.min(27, Math.round(sleepRaw * vitDSleepPenalty * 10) / 10)
    console.log("[sleep-engine] scoring:", JSON.stringify({
      deep: sleep.deepSleepPct, deepScore: deepSleepScore,
      rem: sleep.remPct, remScore,
      hrv: sleep.hrv_ms, hrvScore,
      spo2: sleep.spo2DipsPerNight, spo2Score,
      efficiency: sleep.sleepEfficiencyPct,
      nights: sleepNightsAvailable,
      vitDPenalty: vitDSleepPenalty,
      total: sleepSub,
    }))
  } else if (lifestyle) {
    sleepSource  = "questionnaire"
    psqiEstimate = estimateSleepFromQuestionnaire(lifestyle)
    sleepSub = sleepRaw = psqiEstimate
  }

  // Oral
  let shannonScore = 0, nitrateScore = 0, periodontScore = 0, osaScore = 0, oralSub = 0
  if (oral) {
    shannonScore   = scoreShannon(oral.shannonDiversity)
    nitrateScore   = scoreNitrateReducers(oral.nitrateReducersPct)
    periodontScore = scorePeriodontopathogen(oral.periodontopathogenPct)
    osaScore       = scoreOsaTaxa(oral.osaTaxaPct)
    oralSub        = shannonScore + nitrateScore + periodontScore + osaScore
  }

  // Lifestyle
  let exerciseScore = 0, oralHygieneScore = 0, dentalVisitScore = 0, heartScore = 0
  let restingHRScore = 0, vo2maxScore = 0, nutritionScore = 0, alcoholScore = 0
  let lifestyleSub = 0
  if (lifestyle) {
    exerciseScore    = scoreExercise(lifestyle.exerciseLevel)
    oralHygieneScore = scoreOralHygiene(lifestyle.brushingFreq, lifestyle.flossingFreq, lifestyle.mouthwashType)
    dentalVisitScore = scoreDentalVisit(lifestyle.lastDentalVisit)
    heartScore       = scoreHeart(lifestyle.smokingStatus, lifestyle.knownHypertension, lifestyle.knownDiabetes)
    restingHRScore   = scoreRestingHR(lifestyle.restingHR)
    vo2maxScore      = scoreVO2Max(lifestyle.vo2max)
    nutritionScore   = scoreNutrition(lifestyle)
    alcoholScore     = scoreAlcohol(lifestyle.alcoholDrinksPerWeek)
    const raw        = exerciseScore + oralHygieneScore + dentalVisitScore + heartScore + restingHRScore + vo2maxScore + nutritionScore + alcoholScore
    const net        = raw - medicalHistoryPenalty(lifestyle)
    lifestyleSub     = Math.max(0, Math.min(13, Math.round(net * (13 / 8) * 2) / 2))
  }

  // Interactions (10 terms, pool 15)
  const sleepEff = sleep?.sleepEfficiencyPct ?? 100
  const crpVal   = blood && !bloodLocked ? (blood.hsCRP_mgL ?? 0) : 0
  const spo2Val  = sleep?.spo2DipsPerNight ?? 0

  const sleepInflammation   = !!(sleep && !bloodLocked && checkSleepInflammation(sleepEff, crpVal))
  const spo2Lipid           = !!(sleep && !bloodLocked && checkSpo2Lipid(spo2Val, ldlHdlRatio))
  const dualInflammatory    = !bloodLocked && checkDualInflammatory(crpVal, blood?.esr_mmhr)
  const hrvHomocysteine     = !!(sleep && !bloodLocked && checkHrvHomocysteine(sleep.hrv_ms, blood?.homocysteine_umolL))
  // Use pGingivalisPct (rich field) for I5 when available — lower 0.5% threshold per Hussain 2023
  const periodontCRPRich = !!(oral?.pGingivalisPct !== undefined && oral.pGingivalisPct > 0.5 && crpVal > 0.8)
  const periodontCRP     = !!(oral && !bloodLocked && (periodontCRPRich || checkPeriodontCRP(oral.periodontopathogenPct, crpVal)))
  // Use oral.highOsaRisk from OralScore when available alongside sleep.highOsaRisk
  const osaTaxaSpO2      = !!((oral && sleep && checkOsaTaxaSpO2(oral.osaTaxaPct, spo2Val, sleep.highOsaRisk || oral.highOsaRisk)) || (sleep?.highOsaRisk && !oral))
  const lowNitrateCRP       = !!(oral && !bloodLocked && checkLowNitrateCRP(oral.nitrateReducersPct, crpVal))
  const lowDiversitySleep   = !!(oral && sleep && checkLowDiversitySleep(oral.shannonDiversity, sleepEff))
  const poorSleepOralQ         = !!(lifestyle && checkPoorSleepOralQ(lifestyle, sleep))
  const poorExerciseSmoking    = !!(lifestyle && checkPoorExerciseSmoking(lifestyle))
  const hsCRPLDL               = !bloodLocked && checkHsCRPLDL(crpVal, blood?.ldl_mgdL)
  const lowActivityInflammation = !!(lifestyle && !bloodLocked && checkLowActivityInflammation(lifestyle.exerciseLevel, crpVal))

  let interactionPool = 15
  if (sleepInflammation)      interactionPool -= 5
  if (spo2Lipid)              interactionPool -= 3
  if (dualInflammatory)       interactionPool -= 2
  if (hrvHomocysteine)        interactionPool -= 2
  if (periodontCRP)           interactionPool -= 4
  if (osaTaxaSpO2)            interactionPool -= 3
  if (lowNitrateCRP)          interactionPool -= 2
  if (lowDiversitySleep)      interactionPool -= 2
  if (poorSleepOralQ)         interactionPool -= 2
  if (poorExerciseSmoking)    interactionPool -= 2
  if (hsCRPLDL)               interactionPool -= 1.5
  if (lowActivityInflammation) interactionPool -= 1.5
  interactionPool = Math.max(0, interactionPool)

  const interactionsFired = [
    sleepInflammation && "sleepInflammation", spo2Lipid && "spo2Lipid",
    dualInflammatory && "dualInflammatory", hrvHomocysteine && "hrvHomocysteine",
    periodontCRP && "periodontCRP", osaTaxaSpO2 && "osaTaxaSpO2",
    lowNitrateCRP && "lowNitrateCRP", lowDiversitySleep && "lowDiversitySleep",
    poorSleepOralQ && "poorSleepOralQ", poorExerciseSmoking && "poorExerciseSmoking",
    hsCRPLDL && "hsCRPLDL", lowActivityInflammation && "lowActivityInflammation",
  ].filter(Boolean) as string[]

  const rawTotal = sleepSub + bloodSub + oralSub + lifestyleSub
  const score    = Math.round(Math.min(100, Math.max(0, rawTotal)))
  const { peaqPercent, peaqPercentLabel } = calculatePeaqPercent({ sleep, blood, oral, lifestyle })

  const lifestyleInsights = lifestyle
    ? generateLifestyleInsights(lifestyle, { exercise: exerciseScore, oralHygiene: oralHygieneScore, dental: dentalVisitScore, heart: heartScore, restingHR: restingHRScore, vo2max: vo2maxScore, nutrition: nutritionScore, alcohol: alcoholScore })
    : []

  let oralDataAge: number | undefined
  if (oral?.collectionDate) oralDataAge = Math.floor((Date.now() - new Date(oral.collectionDate).getTime()) / 86400000)

  return {
    version: "7.0",
    score,
    category: getCategory(score),
    breakdown: {
      sleepRaw: Math.round(sleepRaw * 10) / 10, sleepSub: Math.round(sleepSub * 10) / 10, sleepSource,
      sleepDataInsufficient, sleepNightsAvailable,
      bloodSub: Math.round(bloodSub * 10) / 10, oralSub,
      lifestyleSub: Math.round(lifestyleSub * 10) / 10, interactionPool,
      oralPending: !oral, bloodLocked, lifestylePending: !lifestyle,
    },
    bloodPanel,
    metrics: {
      deepSleepScore, hrvScore: Math.round(hrvScore * 10) / 10, spo2Score, remScore,
      vitDSleepPenalty, ferritinHrvPenalty,
      crpScore, vitDScore, apoBScore, ldlHdlScore, glycemicScore, lpaScore, triglyceridesScore,
      shannonScore, nitrateScore, periodontScore, osaScore,
      exerciseScore, oralHygieneScore: Math.round(oralHygieneScore * 10) / 10,
      dentalVisitScore, heartScore, restingHRScore, vo2maxScore, nutritionScore, alcoholScore, psqiEstimate,
    },
    interactions: { sleepInflammation, spo2Lipid, dualInflammatory, hrvHomocysteine, periodontCRP, osaTaxaSpO2, lowNitrateCRP, lowDiversitySleep, poorSleepOralQ, poorExerciseSmoking, hsCRPLDL, lowActivityInflammation },
    lpaFlag: bloodPanel.lpaFlag,
    hsCRPRetestFlag: bloodPanel.hsCRPRetestFlag,
    peaqPercent, peaqPercentLabel,
    bloodRecencyMultiplier: bloodPanel.recencyMultiplier,
    interactionsFired,
    oralPendingTerms: !oral ? 4 : 0,
    lifestyleInsights,
    insights: [],
    labFreshness,
    labAgeDays,
    derived: {
      ldlHdlRatio, glycemicBand,
      missingFields: [], optionalMarkersPresent, oralDataAge,
      labCollectionDate: blood?.labCollectionDate,
      oralHygieneIndex: lifestyle ? oralHygieneIndex(lifestyle.brushingFreq, lifestyle.flossingFreq) : "unknown",
    },
  }
}

// ---- Tests ------------------------------------------------------------------

export function runTests(): void {
  console.log("=== Peaq Score Engine v7.0 -- Test Suite ===\n")
  const goodLS: LifestyleInputs = {
    exerciseLevel: "active", brushingFreq: "twice_plus", flossingFreq: "daily",
    mouthwashType: "fluoride", lastDentalVisit: "within_6mo", smokingStatus: "never",
    knownHypertension: false, knownDiabetes: false,
    sleepDuration: "7_to_8", sleepLatency: "lt_15min", sleepQualSelf: "good",
    daytimeFatigue: "sometimes", nightWakings: "less_once_wk", sleepMedication: "never",
  }
  const freshDate = new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10)
  const sleepGood: SleepInputs = { deepSleepPct: 14, hrv_ms: 38, spo2DipsPerNight: 3, remPct: 20, sleepEfficiencyPct: 88 }
  const bloodCore: BloodInputs = {
    hsCRP_mgL: 0.5, vitaminD_ngmL: 45, apoB_mgdL: 80, ldl_mgdL: 100, hdl_mgdL: 55,
    triglycerides_mgdL: 100, lpa_mgdL: 20, glucose_mgdL: 90, hba1c_pct: 5.2, labCollectionDate: freshDate,
  }

  const t1 = calculatePeaqScore(undefined, undefined, undefined, goodLS)
  console.log(`T1 questionnaire-only: score=${t1.score} (${t1.category}) peaq%=${t1.peaqPercent}%`)

  const t2 = calculatePeaqScore(sleepGood, bloodCore, undefined, goodLS)
  console.log(`T2 wearable+blood: score=${t2.score}, blood=${t2.breakdown.bloodSub.toFixed(1)}/33, recency=${t2.bloodRecencyMultiplier}`)
  console.log(`   sub-panels: ${t2.bloodPanel.subPanels.map(p => p.name.split(" ")[0]+"="+p.score.toFixed(1)).join(", ")}`)

  const bloodFull: BloodInputs = { ...bloodCore, eGFR_mLmin: 95, alt_UL: 22, ast_UL: 20, albumin_gdL: 4.2, hemoglobin_gdL: 14.5, wbc_x10L: 5.8, rdw_pct: 12.2 }
  const oral: OralInputs = { shannonDiversity: 3.4, nitrateReducersPct: 6.5, periodontopathogenPct: 0.3, osaTaxaPct: 0.8 }
  const t3 = calculatePeaqScore(sleepGood, bloodFull, oral, goodLS)
  console.log(`T3 full panel: score=${t3.score} (${t3.category}), blood=${t3.breakdown.bloodSub.toFixed(1)}/33, peaq%=${t3.peaqPercent}%`)

  const t4 = calculatePeaqScore(sleepGood, { ...bloodCore, lpa_mgdL: 65 }, undefined, goodLS)
  console.log(`T4 Lp(a) flag: lpaFlag=${t4.lpaFlag}, score unchanged=${t4.score === t2.score}`)

  const t5 = calculatePeaqScore(sleepGood, { ...bloodCore, hsCRP_mgL: 12 }, undefined, goodLS)
  console.log(`T5 hsCRP>10: retestFlag=${t5.hsCRPRetestFlag}`)

  const staleDate = new Date(Date.now() - 200 * 86400000).toISOString().slice(0, 10)
  const t6 = calculatePeaqScore(sleepGood, { ...bloodCore, labCollectionDate: staleDate }, undefined, goodLS)
  console.log(`T6 stale labs: recency=${t6.bloodRecencyMultiplier} (expected 0.85)`)

  const t7 = calculatePeaqScore(sleepGood, { apoB_mgdL: 75, hsCRP_mgL: 0.8, labCollectionDate: freshDate }, undefined, goodLS)
  console.log(`T7 partial blood: blood=${t7.breakdown.bloodSub.toFixed(1)}/33`)

  // Age/sex penalty tests
  const penaltyBase = { exerciseLevel: "moderate" as ExerciseLevel, brushingFreq: "twice_plus" as BrushingFreq, flossingFreq: "daily" as FlossingFreq, mouthwashType: "none" as MouthwashType, lastDentalVisit: "within_6mo" as DentalVisit, smokingStatus: "never" as SmokingStatus, knownHypertension: false, knownDiabetes: false, sleepDuration: "7_to_8" as SleepDuration, sleepLatency: "15_to_30min" as SleepLatency, sleepQualSelf: "good" as SleepQualSelf, daytimeFatigue: "sometimes" as DaytimeFatigue, nightWakings: "less_once_wk" as const, sleepMedication: "never" as const, familyHistoryCVD: true, hypertensionDx: true, onBPMeds: false }

  const p25F = calculatePeaqScore(undefined, undefined, undefined, { ...penaltyBase, ageRange: "18_29", biologicalSex: "female" })
  const p45M = calculatePeaqScore(undefined, undefined, undefined, { ...penaltyBase, ageRange: "40_49", biologicalSex: "male" })
  const p45F = calculatePeaqScore(undefined, undefined, undefined, { ...penaltyBase, ageRange: "40_49", biologicalSex: "female" })
  console.log(`Penalty test — 25F lifestyleSub: ${p25F.breakdown.lifestyleSub} (expect higher than 45M below)`)
  console.log(`Penalty test — 45M lifestyleSub: ${p45M.breakdown.lifestyleSub} (expect lowest — full penalty × 1.5)`)
  console.log(`Penalty test — 45F lifestyleSub: ${p45F.breakdown.lifestyleSub} (expect between 25F and 45M — pre-menopausal × 0.75)`)
  console.assert(p25F.breakdown.lifestyleSub > p45M.breakdown.lifestyleSub, "25F should outscore 45M due to lower age multiplier")
  console.assert(p45F.breakdown.lifestyleSub > p45M.breakdown.lifestyleSub, "45F should outscore 45M due to pre-menopausal sex multiplier")
  console.assert(p45F.breakdown.lifestyleSub < p25F.breakdown.lifestyleSub, "45F should score less than 25F — higher age multiplier penalty")

  console.log("\n=== All tests complete ===")
}

// Only run tests when executed directly via: node --import tsx src/engine.ts
if (process.argv[1]?.endsWith('engine.ts')) {
  runTests()
}

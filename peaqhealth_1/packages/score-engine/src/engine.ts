/**
 * Peaq Score Engine — v4.0
 *
 * Four-panel architecture: Sleep + Blood + Oral Microbiome + Lifestyle
 *
 * Changes from v3.0:
 *   - Lifestyle panel added (10 pts) — always active from questionnaire
 *   - Sleep reduced 32 → 28 pts (questionnaire seeds remaining 4 pts when no wearable)
 *   - Blood unchanged 28 pts
 *   - Oral unchanged 25 pts
 *   - Interaction pool 15 → 14 pts (1 pt redistributed to lifestyle floor)
 *   - Questionnaire-driven interactions added (2 terms, max −4 pts)
 *   - Sleep panel: wearable data OVERRIDES questionnaire estimate when present
 *   - Version tag: "4.0"
 *
 * Full architecture (max 100):
 *   Sleep          28 pts  (wearable) or PSQI-6 estimate (max 22 pts, capped)
 *   Blood          28 pts
 *   Oral           25 pts
 *   Lifestyle      10 pts  (questionnaire — always active, never locked)
 *   Interactions   14 pts  (pool starts full; terms subtract; floor 0)
 *   ─────────────────────
 *   Total         105 → capped at 100
 *
 * Lifestyle panel (10 pts):
 *   Exercise         4 pts  (IPAQ-inspired tiers — MET-min/week proxy)
 *   Oral hygiene     3 pts  (ADA guidelines + Park 2019 Korean cohort n=247,696)
 *   Dental visits    2 pts  (Park 2019: ≥1/yr = 14% lower CVD risk)
 *   Heart / smoking  1 pt   (non-smoker + no known HTN)
 *
 * Questionnaire sleep estimate (max 22/28, capped below wearable max):
 *   Based on B-PSQI (6 questions, Buysse 1989 / validated 2021)
 *   Replaced entirely by wearable data when SleepInputs are provided
 *
 * Questionnaire interactions (max −4 pts from pool):
 *   poorSleepQ × poorOralHygiene   −2  (Dalton 2025 — bidirectional)
 *   poorExercise × smoking          −2  (AHA: compound CVD risk multiplier)
 */

// ─── Questionnaire types ───────────────────────────────────────────────────────

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
  // ── Exercise (IPAQ-inspired) ──────────────────────────────────────────────
  /**
   * Self-reported exercise level over the past 7 days.
   * active     = vigorous ≥3×/wk OR 150+ min moderate/wk  (IPAQ HEPA threshold)
   * moderate   = 75–149 min moderate/wk or 2×/wk vigorous
   * light      = some activity but below HEPA threshold
   * sedentary  = little to no purposeful exercise
   */
  exerciseLevel: ExerciseLevel

  // ── Oral hygiene behaviour ────────────────────────────────────────────────
  /**
   * Toothbrushing frequency.
   * ADA recommendation: ≥2× daily. Park 2019: each extra brush/day = 9% lower CVD risk.
   */
  brushingFreq: BrushingFreq

  /**
   * Flossing / interdental cleaning frequency.
   * VanWormer 2012 + Janket 2023: daily flossing = 51% lower CVD mortality (HR 0.49).
   */
  flossingFreq: FlossingFreq

  /**
   * Mouthwash type — only antiseptic (chlorhexidine / Listerine-type) penalised.
   * SOALS 2020: antiseptic mouthwash → 85% higher HTN risk via nitrate pathway kill.
   * Fluoride rinses: neutral/positive. none: neutral.
   */
  mouthwashType: MouthwashType

  // ── Dental visits ────────────────────────────────────────────────────────
  /**
   * Last professional dental cleaning.
   * Park 2019: ≥1/yr professional cleaning = 14% lower CVD risk.
   */
  lastDentalVisit: DentalVisit

  // ── Heart / smoking ───────────────────────────────────────────────────────
  smokingStatus:     SmokingStatus
  /** Self-reported diagnosis of high blood pressure */
  knownHypertension: boolean
  /** Self-reported diagnosis of type 2 diabetes */
  knownDiabetes:     boolean

  // ── Sleep questionnaire (B-PSQI-inspired, 6 items) ───────────────────────
  // Only used when SleepInputs are absent (no wearable connected).
  // When wearable data is present, these are ignored for scoring but retained.

  /** Typical hours of actual sleep per night over the past month */
  sleepDuration:  SleepDuration
  /** Time it typically takes to fall asleep */
  sleepLatency:   SleepLatency
  /** Overall self-rated sleep quality over the past month */
  sleepQualSelf:  SleepQualSelf
  /** How often does daytime fatigue affect your ability to function? */
  daytimeFatigue: DaytimeFatigue
  /** How often do you wake during the night and can't get back to sleep? */
  nightWakings:   "never" | "less_once_wk" | "once_twice_wk" | "3plus_wk"
  /** Do you use sleep medication (prescription or OTC)? */
  sleepMedication: "never" | "less_once_wk" | "once_twice_wk" | "3plus_wk"
}

// ─── Existing input types (unchanged from v3) ─────────────────────────────────

export interface SleepInputs {
  deepSleepPct:       number
  hrv_ms:             number
  spo2DipsPerNight:   number
  remPct:             number
  sleepEfficiencyPct: number
}

export interface BloodInputs {
  hsCRP_mgL:           number
  vitaminD_ngmL:       number
  apoB_mgdL:           number
  ldl_mgdL:            number
  hdl_mgdL:            number
  triglycerides_mgdL:  number
  lpa_mgdL:            number
  glucose_mgdL?:       number
  hba1c_pct?:          number
  esr_mmhr?:           number
  homocysteine_umolL?: number
  ferritin_ngmL?:      number
  labCollectionDate?:  string
}

export interface OralInputs {
  shannonDiversity:       number
  nitrateReducersPct:     number
  periodontopathogenPct:  number
  osaTaxaPct:             number
  collectionDate?:        string
  reportId?:              string
}

// ─── Output types ──────────────────────────────────────────────────────────────

export interface PeaqScoreResult {
  version: "4.0"
  score:    number
  category: "optimal" | "good" | "moderate" | "attention"

  breakdown: {
    sleepRaw:        number   // before modifiers
    sleepSub:        number   // after modifiers (wearable) or PSQI estimate
    sleepSource:     "wearable" | "questionnaire" | "none"
    bloodSub:        number   // 0–28
    oralSub:         number   // 0–25
    lifestyleSub:    number   // 0–10 (always present if questionnaire answered)
    interactionPool: number   // 0–14
    oralPending:     boolean
    bloodLocked:     boolean
    lifestylePending: boolean // true if questionnaire not yet answered
  }

  metrics: {
    // Sleep (wearable)
    deepSleepScore:    number
    hrvScore:          number
    spo2Score:         number
    remScore:          number
    vitDSleepPenalty:  number
    ferritinHrvPenalty: boolean
    // Blood
    crpScore:          number
    vitDScore:         number
    apoBScore:         number
    ldlHdlScore:       number
    glycemicScore:     number
    lpaScore:          number
    triglyceridesScore: number
    // Oral
    shannonScore:      number
    nitrateScore:      number
    periodontScore:    number
    osaScore:          number
    // Lifestyle
    exerciseScore:     number
    oralHygieneScore:  number
    dentalVisitScore:  number
    heartScore:        number
    psqiEstimate:      number  // questionnaire sleep estimate (0–22)
  }

  interactions: {
    // Sleep × Blood
    sleepInflammation: boolean   // −5
    spo2Lipid:         boolean   // −3
    dualInflammatory:  boolean   // −2
    hrvHomocysteine:   boolean   // −2
    // Oral × Blood
    periodontCRP:      boolean   // −4
    osaTaxaSpO2:       boolean   // −3
    lowNitrateCRP:     boolean   // −2
    // Oral × Sleep
    lowDiversitySleep: boolean   // −2
    // Questionnaire-driven (fire without sensor data)
    poorSleepOralQ:    boolean   // −2
    poorExerciseSmoking: boolean // −2
  }

  oralPendingTerms: number
  lifestyleInsights: string[]
  insights:          string[]
  labFreshness:      "fresh" | "aging" | "stale" | "expired" | "none"
  labAgeDays?:       number | undefined

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

// ─── Lifestyle scoring ─────────────────────────────────────────────────────────

/**
 * Exercise → 0–4 pts
 * Sources: IPAQ HEPA threshold (Craig 2003); AHA 150 min/wk guideline
 */
function scoreExercise(level: ExerciseLevel): number {
  switch (level) {
    case "active":    return 4
    case "moderate":  return 2
    case "light":     return 1
    case "sedentary": return 0
  }
}

/**
 * Oral hygiene behaviour → 0–3 pts
 * Scoring grid matches VanWormer 2012 OHI + ADA brushing/flossing guidelines:
 *   excellent = brush 2×+ AND floss daily        → 3 pts
 *   good      = brush 2×+ AND floss most days    → 2.5 pts
 *              OR brush 1× AND floss daily        → 2 pts
 *   fair      = brush 2×+ AND floss sometimes    → 1.5 pts
 *              OR brush 1× AND floss most days    → 1.5 pts
 *   poor      = brush 1× AND floss sometimes     → 1 pt
 *              OR brush 2×+ AND floss rarely      → 0.5 pts
 *   very poor = brush less than once             → 0 pts
 *
 * Antiseptic mouthwash: −0.5 pts (nitrate pathway disruption, SOALS 2020)
 * Fluoride/none: 0 adjustment
 * Floor: 0
 */
function scoreOralHygiene(
  brushing: BrushingFreq,
  flossing: FlossingFreq,
  mouthwash: MouthwashType
): number {
  let pts = 0

  if (brushing === "less") {
    pts = 0
  } else {
    const brushBonus = brushing === "twice_plus" ? 0.5 : 0
    switch (flossing) {
      case "daily":        pts = 2.5 + brushBonus; break
      case "most_days":    pts = 1.5 + brushBonus; break
      case "sometimes":    pts = 0.5 + brushBonus; break
      case "rarely_never": pts = 0   + brushBonus * 0.5; break
    }
  }

  // Antiseptic mouthwash penalty (nominal — only chlorhexidine/Listerine-type)
  if (mouthwash === "antiseptic") pts -= 0.5

  return Math.max(0, Math.min(3, Math.round(pts * 2) / 2))  // round to 0.5
}

/**
 * Dental visit recency → 0–2 pts
 * Source: Park 2019 European Heart Journal (n=247,696):
 *   ≥1 professional cleaning/yr = 14% lower CVD risk
 */
function scoreDentalVisit(visit: DentalVisit): number {
  switch (visit) {
    case "within_6mo": return 2
    case "6_to_12mo":  return 2    // still within ≥1/yr threshold
    case "over_1yr":   return 1
    case "over_2yr":   return 0.5
    case "never":      return 0
  }
}

/**
 * Heart / smoking → 0–1 pt
 * Sources: AHA CVD risk factors; Scottish Health Survey (De Oliveira 2010):
 *   current smoker = 2.4× HR for CVD events (independent)
 */
function scoreHeart(
  smoking:     SmokingStatus,
  hypertension: boolean,
  diabetes:     boolean
): number {
  if (smoking === "current")             return 0
  if (hypertension && diabetes)          return 0
  if (hypertension || diabetes)          return 0.5
  if (smoking === "former")              return 0.75
  return 1
}

/**
 * Derived oral hygiene index label (used in UI + derived output)
 * Matches VanWormer 2012 categories
 */
function oralHygieneIndex(
  brushing: BrushingFreq,
  flossing: FlossingFreq
): PeaqScoreResult["derived"]["oralHygieneIndex"] {
  if (brushing === "twice_plus" && flossing === "daily")     return "excellent"
  if (brushing === "twice_plus" && flossing === "most_days") return "excellent"
  if (brushing === "once"       && flossing === "daily")     return "good"
  if (brushing === "twice_plus" && flossing === "sometimes") return "good"
  if (brushing === "once"       && flossing === "most_days") return "good"
  if (brushing === "once"       && flossing === "sometimes") return "fair"
  if (brushing === "twice_plus" && flossing === "rarely_never") return "fair"
  if (brushing === "once"       && flossing === "rarely_never") return "poor"
  if (brushing === "less")                                      return "poor"
  return "unknown"
}

// ─── Questionnaire sleep estimate (B-PSQI-inspired) ───────────────────────────

/**
 * Estimate sleep sub-score from questionnaire.
 * Returns 0–22 pts (capped below 28 — wearable always wins if available).
 * Maps onto sleep panel max of 28 but caps at 22 to incentivise wearable.
 *
 * Component weights (mirroring B-PSQI factor loadings):
 *   Sleep duration    6 pts   (strongest predictor of metabolic outcomes)
 *   Sleep latency     4 pts   (PSQI component 2)
 *   Sleep quality     5 pts   (PSQI component 1 — subjective overall)
 *   Night wakings     4 pts   (PSQI component 5 — disturbances)
 *   Daytime fatigue   3 pts   (PSQI component 7 — daytime dysfunction)
 *   Sleep medication  0 pts   (indicator of poor sleep, but medication use itself not penalised)
 *   ─────────────────────────
 *   Max              22 pts
 */
export function estimateSleepFromQuestionnaire(ls: LifestyleInputs): number {
  // Duration
  const durationPts: Record<SleepDuration, number> = {
    gte_8: 6, "7_to_8": 5, "6_to_7": 3, lt_6: 0
  }

  // Latency
  const latencyPts: Record<SleepLatency, number> = {
    lt_15min: 4, "15_to_30min": 3, "30_to_60min": 1, gt_60min: 0
  }

  // Self-rated quality
  const qualPts: Record<SleepQualSelf, number> = {
    very_good: 5, good: 4, fair: 2, poor: 0
  }

  // Night wakings
  const wakingPts: Record<string, number> = {
    never: 4, less_once_wk: 3, once_twice_wk: 1, "3plus_wk": 0
  }

  // Daytime fatigue
  const fatiguePts: Record<DaytimeFatigue, number> = {
    never: 3, sometimes: 2, often: 1, always: 0
  }

  // Medication: signals poor sleep but we don't penalise medication use itself
  // Instead, use it as a soft signal: if 3+/wk medication, daytime fatigue likely already captured

  const total = (
    durationPts[ls.sleepDuration] +
    latencyPts[ls.sleepLatency]   +
    qualPts[ls.sleepQualSelf]     +
    (wakingPts[ls.nightWakings] ?? 0) +
    fatiguePts[ls.daytimeFatigue]
  )

  return Math.min(22, Math.max(0, total))
}

// ─── Questionnaire interaction checks ────────────────────────────────────────

/**
 * −2 pts. Poor self-reported sleep AND poor oral hygiene.
 * Bidirectional: poor sleep → oral dysbiosis (Dalton 2025)
 * Can fire even without wearable or microbiome kit.
 */
function checkPoorSleepOralQ(
  ls: LifestyleInputs,
  sleepInputs?: SleepInputs
): boolean {
  const poorOralHygiene = ls.brushingFreq === "less" ||
    (ls.brushingFreq === "once" && ls.flossingFreq === "rarely_never")

  if (sleepInputs) {
    // Wearable present — use real sleep efficiency
    return sleepInputs.sleepEfficiencyPct < 80 && poorOralHygiene
  } else {
    // Questionnaire only — use self-rated sleep
    const poorSleep = ls.sleepQualSelf === "poor" || ls.daytimeFatigue === "always"
    return poorSleep && poorOralHygiene
  }
}

/**
 * −2 pts. Sedentary AND current smoker.
 * AHA: compound CVD risk. Neither alone triggers this; both together do.
 */
function checkPoorExerciseSmoking(ls: LifestyleInputs): boolean {
  return ls.exerciseLevel === "sedentary" && ls.smokingStatus === "current"
}

// ─── Lifestyle insights ───────────────────────────────────────────────────────

function generateLifestyleInsights(
  ls: LifestyleInputs,
  scores: { exercise: number; oralHygiene: number; dental: number; heart: number }
): string[] {
  const insights: string[] = []

  if (scores.exercise === 0) {
    insights.push("Sedentary lifestyle identified — 150 min/week of moderate activity is the single highest-ROI cardiovascular intervention available to most people.")
  } else if (scores.exercise <= 2) {
    insights.push("Activity level below HEPA threshold — increasing to ≥150 min moderate exercise/week reduces all-cause mortality by 31% (AHA meta-analysis).")
  }

  const ohi = oralHygieneIndex(ls.brushingFreq, ls.flossingFreq)
  if (ohi === "poor") {
    insights.push("Oral hygiene index: poor. Brushing less than daily is associated with 70% higher cardiovascular event risk (Scottish Health Survey, n=11,869, 8-year follow-up).")
  } else if (ohi === "fair") {
    insights.push("Oral hygiene index: fair. Adding daily flossing to your routine is associated with 51% lower cardiovascular mortality (Janket 2023, 18.8-year follow-up).")
  }

  if (ls.mouthwashType === "antiseptic") {
    insights.push("Antiseptic mouthwash use detected. SOALS 2020 found antiseptic mouthwash raises hypertension risk by 85% via disruption of oral nitrate-reducing bacteria. Consider switching to fluoride rinse.")
  }

  if (ls.lastDentalVisit === "over_2yr" || ls.lastDentalVisit === "never") {
    insights.push("Last dental visit was over 2 years ago. Professional cleaning ≥1×/year is associated with 14% lower cardiovascular risk (Park 2019, n=247,696).")
  }

  if (ls.smokingStatus === "current") {
    insights.push("Current smoking confers 2.4× hazard ratio for cardiovascular events, independent of other risk factors (De Oliveira 2010).")
  }

  if (ls.knownHypertension && ls.knownDiabetes) {
    insights.push("Known hypertension and diabetes are both present — these compound cardiovascular risk significantly and are both modifiable through sleep, exercise, and dietary changes tracked by Peaq.")
  }

  return insights
}

// ─── Re-export scoring functions from v3 (unchanged) ─────────────────────────

function scoreDeepSleep(pct: number): number {
  if (pct < 8)  return 0; if (pct < 12) return 4
  if (pct < 17) return 9; if (pct < 22) return 13
  return 16
}
function scoreHRV(hrv: number): number {
  if (hrv < 20) return 0; if (hrv < 35) return 3
  if (hrv < 50) return 6; if (hrv < 70) return 8
  return 10
}
function scoreSpo2(dips: number): number {
  if (dips > 10) return 0; if (dips > 5) return 1
  if (dips > 2) return 2; return 4
}
function scoreREM(pct: number): number {
  if (pct < 12) return 0; if (pct < 18) return 1; return 2
}
function vitDSleepMultiplier(vitD: number): number {
  if (vitD < 20) return 0.85; if (vitD < 30) return 0.95; return 1.0
}
function scoreCRP(crp: number): number {
  if (crp > 10) return 0; if (crp > 3) return 2
  if (crp > 1) return 5; if (crp > 0.5) return 7; return 8
}
function scoreVitaminD(vitD: number): number {
  if (vitD < 12) return 0; if (vitD < 20) return 1
  if (vitD < 30) return 3; if (vitD < 50) return 5; return 6
}
function scoreApoB(apoB: number): number {
  if (apoB > 130) return 0; if (apoB > 100) return 2
  if (apoB > 80) return 4; if (apoB > 60) return 5; return 6
}
function scoreLdlHdl(ldl: number, hdl: number): { score: number; ratio: number } {
  const ratio = hdl > 0 ? parseFloat((ldl / hdl).toFixed(2)) : 99
  let score: number
  if (ratio > 4.0) score = 0; else if (ratio > 3.0) score = 1
  else if (ratio > 2.0) score = 2; else if (ratio > 1.5) score = 3; else score = 4
  return { score, ratio }
}
function scoreGlycemic(glucose?: number, hba1c?: number): {
  score: number; band: PeaqScoreResult["derived"]["glycemicBand"]
} {
  if (glucose === undefined && hba1c === undefined) return { score: 1, band: "unknown" }
  type Band = PeaqScoreResult["derived"]["glycemicBand"]
  const rank: Record<Band, number> = { optimal: 0, "high-normal": 1, prediabetic: 2, diabetic: 3, unknown: -1 }
  let band: Band = "optimal"
  const worse = (a: Band, b: Band): Band => rank[b] > rank[a] ? b : a
  if (glucose !== undefined) {
    if (glucose >= 126) band = worse(band, "diabetic")
    else if (glucose >= 100) band = worse(band, "prediabetic")
    else if (glucose >= 90) band = worse(band, "high-normal")
  }
  if (hba1c !== undefined) {
    if (hba1c >= 6.5) band = worse(band, "diabetic")
    else if (hba1c >= 5.7) band = worse(band, "prediabetic")
    else if (hba1c >= 5.4) band = worse(band, "high-normal")
  }
  const score = { optimal: 2, "high-normal": 1, prediabetic: 0, diabetic: 0, unknown: 1 }[band]
  return { score, band }
}
function scoreLpa(lpa: number): number { return lpa <= 30 ? 1 : 0 }
function scoreTriglycerides(tg: number): number { return tg < 150 ? 1 : 0 }
function scoreShannon(h: number): number {
  if (h < 2.0) return 0; if (h < 2.5) return 2
  if (h < 3.0) return 4; if (h < 3.5) return 6; return 8
}
function scoreNitrateReducers(pct: number): number {
  if (pct < 0.5) return 0; if (pct < 2) return 2
  if (pct < 5) return 4; if (pct < 10) return 6; return 7
}
function scorePeriodontopathogen(pct: number): number {
  if (pct >= 5) return 0; if (pct >= 2) return 2; if (pct >= 0.5) return 4; return 6
}
function scoreOsaTaxa(pct: number): number {
  if (pct >= 3) return 0; if (pct >= 1) return 2; return 4
}
function checkSleepInflammation(sleepEff: number, crp: number): boolean {
  return sleepEff < 80 && crp > 1.0
}
function checkSpo2Lipid(spo2Dips: number, ldlHdlRatio: number): boolean {
  return spo2Dips > 2 && ldlHdlRatio > 2.5
}
function checkDualInflammatory(crp: number, esr?: number): boolean {
  return esr !== undefined && crp > 1.0 && esr > 20
}
function checkHrvHomocysteine(hrv: number, hcy?: number): boolean {
  return hcy !== undefined && hrv < 40 && hcy > 10
}
function checkPeriodontCRP(periodontPct: number, crp: number): boolean {
  return periodontPct >= 2 && crp > 1.0
}
function checkOsaTaxaSpO2(osaTaxaPct: number, spo2Dips: number): boolean {
  return osaTaxaPct >= 1 && spo2Dips > 2
}
function checkLowNitrateCRP(nitrateReducersPct: number, crp: number): boolean {
  return nitrateReducersPct < 2 && crp > 1.0
}
function checkLowDiversitySleep(shannon: number, sleepEff: number): boolean {
  return shannon < 2.5 && sleepEff < 80
}

export type LabFreshness = "fresh" | "aging" | "stale" | "expired" | "none"

export function computeLabFreshness(labCollectionDate?: string): {
  freshness: LabFreshness; ageDays?: number
} {
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

// ─── Main scoring function ────────────────────────────────────────────────────

/**
 * Calculate Peaq Score v4.
 *
 * @param sleep   - Wearable sleep data (optional). When absent, questionnaire estimate used.
 * @param blood   - Blood biomarker inputs (optional). When absent, blood panel = 0.
 * @param oral    - Oral microbiome inputs (optional). When absent, oral panel = 0.
 * @param lifestyle - Questionnaire responses (optional). When absent, lifestyle panel = 0.
 *
 * Priority: sensor data > questionnaire where overlap exists.
 */
export function calculatePeaqScore(
  sleep?:     SleepInputs,
  blood?:     BloodInputs,
  oral?:      OralInputs,
  lifestyle?: LifestyleInputs
): PeaqScoreResult {

  // ── Lab freshness ──
  const { freshness: labFreshness, ageDays: labAgeDays } =
    computeLabFreshness(blood?.labCollectionDate)
  const bloodLocked = labFreshness === "expired" || labFreshness === "none"

  // ── Sleep sub-score ──
  let sleepRaw = 0, sleepSub = 0
  let deepSleepScore = 0, hrvScore = 0, spo2Score = 0, remScore = 0
  let vitDSleepPenalty = 1.0, ferritinHrvPenalty = false
  let sleepSource: "wearable" | "questionnaire" | "none" = "none"
  let psqiEstimate = 0

  if (sleep) {
    // Wearable data takes full priority — max 28 pts
    sleepSource = "wearable"
    deepSleepScore  = scoreDeepSleep(sleep.deepSleepPct)
    remScore        = scoreREM(sleep.remPct)
    spo2Score       = scoreSpo2(sleep.spo2DipsPerNight)
    const vitD      = blood && !bloodLocked ? blood.vitaminD_ngmL : 30  // neutral if no labs
    vitDSleepPenalty = vitDSleepMultiplier(vitD)
    const ferritin  = blood?.ferritin_ngmL
    ferritinHrvPenalty = ferritin !== undefined && ferritin < 20
    const rawHrv    = scoreHRV(sleep.hrv_ms)
    hrvScore        = ferritinHrvPenalty ? rawHrv * 0.85 : rawHrv
    sleepRaw        = deepSleepScore + hrvScore + spo2Score + remScore
    sleepSub        = Math.round(sleepRaw * vitDSleepPenalty * 10) / 10
    sleepSub        = Math.min(28, sleepSub)
  } else if (lifestyle) {
    // Questionnaire estimate — max 22 pts (capped)
    sleepSource  = "questionnaire"
    psqiEstimate = estimateSleepFromQuestionnaire(lifestyle)
    sleepSub     = psqiEstimate
    sleepRaw     = psqiEstimate
  }

  // ── Blood sub-score ──
  let crpScore = 0, vitDScore = 0, apoBScore = 0, ldlHdlScore = 0
  let glycemicScore = 0, lpaScore = 0, triglyceridesScore = 0
  let ldlHdlRatio = 0
  type GlyBand = PeaqScoreResult["derived"]["glycemicBand"]
  let glycemicBand: GlyBand = "unknown"
  let optionalMarkersPresent: string[] = []

  if (blood && !bloodLocked) {
    crpScore            = scoreCRP(blood.hsCRP_mgL)
    vitDScore           = scoreVitaminD(blood.vitaminD_ngmL)
    apoBScore           = scoreApoB(blood.apoB_mgdL)
    const ldlHdl        = scoreLdlHdl(blood.ldl_mgdL, blood.hdl_mgdL)
    ldlHdlScore         = ldlHdl.score
    ldlHdlRatio         = ldlHdl.ratio
    const glycemic      = scoreGlycemic(blood.glucose_mgdL, blood.hba1c_pct)
    glycemicScore       = glycemic.score
    glycemicBand        = glycemic.band
    lpaScore            = scoreLpa(blood.lpa_mgdL)
    triglyceridesScore  = scoreTriglycerides(blood.triglycerides_mgdL)
    if (blood.esr_mmhr !== undefined)           optionalMarkersPresent.push("ESR")
    if (blood.homocysteine_umolL !== undefined) optionalMarkersPresent.push("Homocysteine")
    if (blood.ferritin_ngmL !== undefined)      optionalMarkersPresent.push("Ferritin")
  }
  const bloodSub = crpScore + vitDScore + apoBScore + ldlHdlScore + glycemicScore + lpaScore + triglyceridesScore

  // ── Oral sub-score ──
  let shannonScore = 0, nitrateScore = 0, periodontScore = 0, osaScore = 0, oralSub = 0
  if (oral) {
    shannonScore   = scoreShannon(oral.shannonDiversity)
    nitrateScore   = scoreNitrateReducers(oral.nitrateReducersPct)
    periodontScore = scorePeriodontopathogen(oral.periodontopathogenPct)
    osaScore       = scoreOsaTaxa(oral.osaTaxaPct)
    oralSub        = shannonScore + nitrateScore + periodontScore + osaScore
  }

  // ── Lifestyle sub-score ──
  let exerciseScore = 0, oralHygieneScore = 0, dentalVisitScore = 0, heartScore = 0
  let lifestyleSub = 0

  if (lifestyle) {
    exerciseScore     = scoreExercise(lifestyle.exerciseLevel)
    oralHygieneScore  = scoreOralHygiene(lifestyle.brushingFreq, lifestyle.flossingFreq, lifestyle.mouthwashType)
    dentalVisitScore  = scoreDentalVisit(lifestyle.lastDentalVisit)
    heartScore        = scoreHeart(lifestyle.smokingStatus, lifestyle.knownHypertension, lifestyle.knownDiabetes)
    lifestyleSub      = exerciseScore + oralHygieneScore + dentalVisitScore + heartScore
    lifestyleSub      = Math.min(10, Math.round(lifestyleSub * 2) / 2)
  }

  // ── Interaction terms ──
  // Sensor-driven (only fire when relevant panels active)
  const sleepEff = sleep?.sleepEfficiencyPct ?? 100
  const crpVal   = blood && !bloodLocked ? blood.hsCRP_mgL : 0
  const spo2Val  = sleep?.spo2DipsPerNight ?? 0

  const sleepInflammation  = sleep && !bloodLocked ? checkSleepInflammation(sleepEff, crpVal) : false
  const spo2Lipid          = sleep && !bloodLocked ? checkSpo2Lipid(spo2Val, ldlHdlRatio) : false
  const dualInflammatory   = !bloodLocked ? checkDualInflammatory(crpVal, blood?.esr_mmhr) : false
  const hrvHomocysteine    = sleep && !bloodLocked ? checkHrvHomocysteine(sleep.hrv_ms, blood?.homocysteine_umolL) : false
  const periodontCRP       = oral && !bloodLocked ? checkPeriodontCRP(oral.periodontopathogenPct, crpVal) : false
  const osaTaxaSpO2        = oral && sleep ? checkOsaTaxaSpO2(oral.osaTaxaPct, spo2Val) : false
  const lowNitrateCRP      = oral && !bloodLocked ? checkLowNitrateCRP(oral.nitrateReducersPct, crpVal) : false
  const lowDiversitySleep  = oral && sleep ? checkLowDiversitySleep(oral.shannonDiversity, sleepEff) : false

  // Questionnaire-driven (fire even without sensors)
  const poorSleepOralQ      = lifestyle ? checkPoorSleepOralQ(lifestyle, sleep) : false
  const poorExerciseSmoking = lifestyle ? checkPoorExerciseSmoking(lifestyle) : false

  let interactionPool = 14
  if (sleepInflammation)    interactionPool -= 5
  if (spo2Lipid)            interactionPool -= 3
  if (dualInflammatory)     interactionPool -= 2
  if (hrvHomocysteine)      interactionPool -= 2
  if (periodontCRP)         interactionPool -= 4
  if (osaTaxaSpO2)          interactionPool -= 3
  if (lowNitrateCRP)        interactionPool -= 2
  if (lowDiversitySleep)    interactionPool -= 2
  if (poorSleepOralQ)       interactionPool -= 2
  if (poorExerciseSmoking)  interactionPool -= 2
  interactionPool = Math.max(0, interactionPool)

  // Oral pending terms
  const oralPendingTerms = !oral ? 4 : 0

  // ── Final score ──
  const rawScore = sleepSub + bloodSub + oralSub + lifestyleSub + interactionPool
  const score    = Math.round(Math.min(100, Math.max(0, rawScore)))
  const category = getCategory(score)

  // ── Lifestyle insights ──
  const lifestyleInsights = lifestyle
    ? generateLifestyleInsights(lifestyle, { exercise: exerciseScore, oralHygiene: oralHygieneScore, dental: dentalVisitScore, heart: heartScore })
    : []

  // ── Oral data age ──
  let oralDataAge: number | undefined
  if (oral?.collectionDate) {
    oralDataAge = Math.floor((Date.now() - new Date(oral.collectionDate).getTime()) / 86400000)
  }

  return {
    version: "4.0",
    score,
    category,
    breakdown: {
      sleepRaw:        Math.round(sleepRaw * 10) / 10,
      sleepSub:        Math.round(sleepSub * 10) / 10,
      sleepSource,
      bloodSub,
      oralSub,
      lifestyleSub:    Math.round(lifestyleSub * 10) / 10,
      interactionPool,
      oralPending:     !oral,
      bloodLocked,
      lifestylePending: !lifestyle,
    },
    metrics: {
      deepSleepScore, hrvScore: Math.round(hrvScore * 10) / 10, spo2Score, remScore,
      vitDSleepPenalty, ferritinHrvPenalty,
      crpScore, vitDScore, apoBScore, ldlHdlScore, glycemicScore, lpaScore, triglyceridesScore,
      shannonScore, nitrateScore, periodontScore, osaScore,
      exerciseScore, oralHygieneScore: Math.round(oralHygieneScore * 10) / 10,
      dentalVisitScore, heartScore, psqiEstimate,
    },
    interactions: {
      sleepInflammation, spo2Lipid, dualInflammatory, hrvHomocysteine,
      periodontCRP, osaTaxaSpO2, lowNitrateCRP, lowDiversitySleep,
      poorSleepOralQ, poorExerciseSmoking,
    },
    oralPendingTerms,
    lifestyleInsights,
    insights: [],  // generate separately or re-import from v3 generateInsights
    labFreshness,
    labAgeDays,
    derived: {
      ldlHdlRatio,
      glycemicBand,
      missingFields: [],
      optionalMarkersPresent,
      oralDataAge,
      labCollectionDate: blood?.labCollectionDate,
      oralHygieneIndex: lifestyle
        ? oralHygieneIndex(lifestyle.brushingFreq, lifestyle.flossingFreq)
        : "unknown",
    },
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

export function runTests(): void {
  console.log("═══ Peaq Score Engine v4.0 — Test Suite ═══\n")

  const goodLifestyle: LifestyleInputs = {
    exerciseLevel:     "active",
    brushingFreq:      "twice_plus",
    flossingFreq:      "daily",
    mouthwashType:     "fluoride",
    lastDentalVisit:   "within_6mo",
    smokingStatus:     "never",
    knownHypertension: false,
    knownDiabetes:     false,
    sleepDuration:     "7_to_8",
    sleepLatency:      "lt_15min",
    sleepQualSelf:     "good",
    daytimeFatigue:    "sometimes",
    nightWakings:      "less_once_wk",
    sleepMedication:   "never",
  }

  const poorLifestyle: LifestyleInputs = {
    exerciseLevel:     "sedentary",
    brushingFreq:      "once",
    flossingFreq:      "rarely_never",
    mouthwashType:     "antiseptic",
    lastDentalVisit:   "over_2yr",
    smokingStatus:     "current",
    knownHypertension: true,
    knownDiabetes:     false,
    sleepDuration:     "lt_6",
    sleepLatency:      "30_to_60min",
    sleepQualSelf:     "poor",
    daytimeFatigue:    "often",
    nightWakings:      "3plus_wk",
    sleepMedication:   "once_twice_wk",
  }

  const freshDate = new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10)

  // Test 1: Questionnaire only — no sensors (day-one user)
  const t1 = calculatePeaqScore(undefined, undefined, undefined, goodLifestyle)
  console.log("Test 1 — Questionnaire only (good lifestyle, no sensors):")
  console.log(`  Score: ${t1.score} (${t1.category})`)
  console.log(`  Sleep source: ${t1.breakdown.sleepSource} → ${t1.breakdown.sleepSub}/28`)
  console.log(`  Lifestyle: ${t1.breakdown.lifestyleSub}/10`)
  console.log(`  IX pool: ${t1.breakdown.interactionPool}/14`)
  console.log(`  Expected: ~37–42 (questionnaire-only floor)`)
  console.log()

  // Test 2: Questionnaire only — poor lifestyle
  const t2 = calculatePeaqScore(undefined, undefined, undefined, poorLifestyle)
  console.log("Test 2 — Questionnaire only (poor lifestyle):")
  console.log(`  Score: ${t2.score} (${t2.category})`)
  console.log(`  Sleep source: ${t2.breakdown.sleepSource} → ${t2.breakdown.sleepSub}/28`)
  console.log(`  Lifestyle: ${t2.breakdown.lifestyleSub}/10`)
  console.log(`  IX fired:`, Object.entries(t2.interactions).filter(([,v]) => v).map(([k]) => k))
  console.log(`  Insights: ${t2.lifestyleInsights.length}`)
  console.log()

  // Test 3: Wearable + blood + questionnaire (no oral)
  const sleepGood = { deepSleepPct: 14, hrv_ms: 38, spo2DipsPerNight: 3, remPct: 20, sleepEfficiencyPct: 88 }
  const bloodGood = {
    hsCRP_mgL: 0.5, vitaminD_ngmL: 45, apoB_mgdL: 80, ldl_mgdL: 100, hdl_mgdL: 55,
    triglycerides_mgdL: 100, lpa_mgdL: 20, glucose_mgdL: 90, hba1c_pct: 5.2,
    labCollectionDate: freshDate,
  }
  const t3 = calculatePeaqScore(sleepGood, bloodGood, undefined, goodLifestyle)
  console.log("Test 3 — Wearable + blood + questionnaire (no oral):")
  console.log(`  Score: ${t3.score} (${t3.category})`)
  console.log(`  Sleep: ${t3.breakdown.sleepSub.toFixed(1)}/28 [${t3.breakdown.sleepSource}]`)
  console.log(`  Blood: ${t3.breakdown.bloodSub}/28`)
  console.log(`  Lifestyle: ${t3.breakdown.lifestyleSub}/10`)
  console.log(`  IX: ${t3.breakdown.interactionPool}/14`)
  console.log()

  // Test 4: Full four-panel — optimal
  const oralHealthy = { shannonDiversity: 3.4, nitrateReducersPct: 6.5, periodontopathogenPct: 0.3, osaTaxaPct: 0.8, collectionDate: "2026-02-14" }
  const t4 = calculatePeaqScore(sleepGood, bloodGood, oralHealthy, goodLifestyle)
  console.log("Test 4 — Full four-panel (good all round):")
  console.log(`  Score: ${t4.score} (${t4.category})`)
  console.log(`  Sleep: ${t4.breakdown.sleepSub.toFixed(1)}  Blood: ${t4.breakdown.bloodSub}  Oral: ${t4.breakdown.oralSub}  Lifestyle: ${t4.breakdown.lifestyleSub}  IX: ${t4.breakdown.interactionPool}`)
  console.log(`  OHI: ${t4.derived.oralHygieneIndex}`)
  console.log()

  // Test 5: Antiseptic mouthwash — nominal penalty
  const mouthwashLifestyle = { ...goodLifestyle, mouthwashType: "antiseptic" as const }
  const t5a = calculatePeaqScore(undefined, undefined, undefined, goodLifestyle)
  const t5b = calculatePeaqScore(undefined, undefined, undefined, mouthwashLifestyle)
  console.log("Test 5 — Antiseptic mouthwash penalty (nominal):")
  console.log(`  Without: ${t5a.score}  With antiseptic: ${t5b.score}  Diff: ${t5a.score - t5b.score} pts`)
  console.log(`  Expected: 0–1 pt difference`)
  console.log()

  // Test 6: Q interaction — poor sleep + poor oral hygiene
  const poorSleepHygiene: LifestyleInputs = {
    ...goodLifestyle,
    brushingFreq: "less",
    flossingFreq: "rarely_never",
    sleepQualSelf: "poor",
    daytimeFatigue: "always",
  }
  const t6 = calculatePeaqScore(undefined, undefined, undefined, poorSleepHygiene)
  console.log("Test 6 — Q interaction: poor sleep + poor oral hygiene:")
  console.log(`  Score: ${t6.score}`)
  console.log(`  poorSleepOralQ fired: ${t6.interactions.poorSleepOralQ}`)
  console.log()

  console.log("═══ All tests complete ═══")
}

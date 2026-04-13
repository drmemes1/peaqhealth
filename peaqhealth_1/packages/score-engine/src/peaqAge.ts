/**
 * Peaq Age V5 — Biological age in years
 *
 * Components:
 *   PhenoAge  49%  — Levine 2018 (9 blood markers, hs-CRP mandatory)
 *   OMA       15%  — Oral Microbiome Assessment (NHANES-anchored)
 *   VO₂ max   13%  — FRIEND Registry (Kaminsky 2015/2022)
 *   RHR       11%  — Aune 2017 / Sheppard 2017
 *   Sleep dur  5%  — Cappuccio 2010
 *   Sleep reg  4%  — Cribb 2023
 *   Cross-panel 3% — I1/I2/I3 interaction terms (require BW + OMA)
 *
 * When a component is unavailable, its weight redistributes
 * proportionally to the remaining components.
 */

import { calcOMA, type OMAInputs } from "./oma"

// ── Input types ──────────────────────────────────────────────────────────────

export interface BloodworkInputs {
  albumin: number | null       // g/dL
  creatinine: number | null    // mg/dL
  glucose: number | null       // mg/dL
  crp: number | null           // mg/L (hs-CRP ONLY)
  lymph: number | null         // lymphocyte %
  mcv: number | null           // fL
  rdw: number | null           // %
  alp: number | null           // U/L
  wbc: number | null           // 10³/µL
  hsCrpAvailable: boolean      // false → crp is standard CRP, do not use
}

export interface FitnessInputs {
  vo2max: number | null                                         // ml/kg/min
  vo2Source: "manual" | "estimated" | null
  activityLevel: "sedentary" | "moderate" | "active" | "very_active" | null
  rhr: number | null                                            // resting heart rate bpm
}

export interface SleepInputs {
  avgDurationHours: number | null
  bedtimeStdDevMinutes: number | null
}

export interface PeaqAgeInputs {
  chronoAge: number
  sex: "male" | "female"
  bloodwork: BloodworkInputs | null
  oma: OMAInputs | null
  fitness: FitnessInputs | null
  sleep: SleepInputs | null
}

// ── Output type ──────────────────────────────────────────────────────────────

export type PeaqAgeBand =
  | "EXCEPTIONAL"
  | "OPTIMIZED"
  | "ON PACE"
  | "ELEVATED"
  | "ACCELERATED"

export interface PeaqAgeResult {
  peaqAge: number
  chronoAge: number
  delta: number              // chronoAge - peaqAge (positive = younger than chrono)
  band: PeaqAgeBand
  phenoAge: number | null
  phenoDelta: number         // phenoAge - chronoAge (negative = younger)
  missingPhenoMarkers: string[]
  omaPct: number
  omaDelta: number
  vo2Pct: number
  vo2Delta: number
  expRHR: number
  rhrDelta: number
  durDelta: number
  regDelta: number
  i1: number
  i2: number
  i3: number
  crossPanel: number
  wP: number
  wO: number
  wV: number
  wR: number
  wD: number
  wG: number
  crossW: number
  hasBW: boolean
  hasOMA: boolean
  hasVO2: boolean
}

// ── Base weights ─────────────────────────────────────────────────────────────

const W_PHENO = 0.48
const W_OMA   = 0.22
const W_VO2   = 0.13
const W_RHR   = 0.11
const W_DUR   = 0.05
const W_REG   = 0.04
const W_CROSS = 0.03

// ── PhenoAge · Levine 2018 ───────────────────────────────────────────────────

const PHENO_MARKERS = [
  "albumin", "creatinine", "glucose", "crp", "lymph",
  "mcv", "rdw", "alp", "wbc",
] as const

function calcPhenoAge(bw: BloodworkInputs, age: number): { phenoAge: number | null; missing: string[] } {
  const missing: string[] = []

  if (!bw.hsCrpAvailable || bw.crp == null) {
    missing.push("crp_hsCRP_required")
  }
  for (const key of PHENO_MARKERS) {
    if (key === "crp") continue
    if (bw[key] == null) missing.push(key)
  }
  if (missing.length > 0) return { phenoAge: null, missing }

  const crpMgdl = bw.crp! / 10.0
  if (crpMgdl <= 0) return { phenoAge: null, missing: ["crp_nonpositive"] }

  const xb =
    -10.1533 +
    -0.0336  * bw.albumin! +
     0.0095  * bw.creatinine! +
     0.1953  * (bw.glucose! / 18.0182) +
     0.0954  * Math.log(crpMgdl) +
    -0.0120  * bw.lymph! +
     0.0268  * bw.mcv! +
     0.3306  * bw.rdw! +
     0.00188 * bw.alp! +
     0.0554  * bw.wbc! +
     0.0804  * age

  const mp = 1 - Math.exp(-Math.exp(xb) * 0.0076927)
  if (mp <= 0 || mp >= 1) return { phenoAge: null, missing: ["mp_out_of_range"] }

  const phenoAge = Math.round((141.50225 + Math.log(-0.00553 * Math.log(1 - mp)) / 0.090165) * 10) / 10
  return { phenoAge, missing: [] }
}

// ── FRIEND Registry · Kaminsky 2015/2022 ─────────────────────────────────────

const FRIEND_F = [[5,14],[10,17],[20,21],[30,25],[40,28],[50,32],[60,36],[70,40],[80,44],[90,49],[95,52]] as const
const FRIEND_M = [[5,19],[10,22],[20,27],[30,33],[40,37],[50,42],[60,46],[70,50],[80,54],[90,59],[95,63]] as const

function vo2ToPct(vo2: number, sex: "male" | "female"): number {
  const tbl = sex === "female" ? FRIEND_F : FRIEND_M
  for (let i = 0; i < tbl.length - 1; i++) {
    const [p0, v0] = tbl[i]
    const [p1, v1] = tbl[i + 1]
    if (vo2 >= v0 && vo2 <= v1) {
      return Math.round(p0 + ((vo2 - v0) / (v1 - v0)) * (p1 - p0))
    }
  }
  if (vo2 < tbl[0][1]) return Math.max(1, tbl[0][0] - (tbl[0][1] - vo2) * 2)
  return Math.min(99, tbl[tbl.length - 1][0] + (vo2 - tbl[tbl.length - 1][1]))
}

const ACTIVITY_TO_PCT: Record<string, number> = {
  sedentary: 20,
  moderate: 40,
  active: 60,
  very_active: 75,
}

function resolveVO2(fitness: FitnessInputs | null, sex: "male" | "female"): { vo2Pct: number; hasVO2: boolean } {
  if (!fitness) return { vo2Pct: 50, hasVO2: false }

  if (fitness.vo2max != null && fitness.vo2Source === "manual") {
    return { vo2Pct: vo2ToPct(fitness.vo2max, sex), hasVO2: true }
  }

  if (fitness.vo2Source === "estimated" && fitness.activityLevel) {
    return { vo2Pct: ACTIVITY_TO_PCT[fitness.activityLevel] ?? 50, hasVO2: true }
  }

  if (fitness.vo2max != null) {
    return { vo2Pct: vo2ToPct(fitness.vo2max, sex), hasVO2: true }
  }

  return { vo2Pct: 50, hasVO2: false }
}

// ── Expected RHR · Aune 2017 / Sheppard 2017 ────────────────────────────────

function getExpectedRHR(age: number, sex: "male" | "female"): number {
  if (sex === "female") {
    if (age < 30) return 72
    if (age < 40) return 71
    if (age < 50) return 70
    return 70
  }
  if (age < 30) return 69
  if (age < 40) return 68
  return 67
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function capVal(v: number, lim: number): number {
  return Math.max(-lim, Math.min(lim, v))
}

function getSleepDurDelta(h: number): number {
  if (h < 6) return 1.5
  if (h < 7) return 0.5
  if (h <= 8) return 0.0
  if (h <= 9) return 0.3
  return 0.8
}

function getSleepRegDelta(sd: number): number {
  if (sd < 15) return -0.5
  if (sd < 30) return 0.0
  if (sd < 45) return 0.5
  if (sd < 60) return 1.0
  return 1.5
}

function getBand(delta: number): PeaqAgeBand {
  if (delta > 5) return "EXCEPTIONAL"
  if (delta > 2) return "OPTIMIZED"
  if (delta >= -2) return "ON PACE"
  if (delta > -5) return "ELEVATED"
  return "ACCELERATED"
}

// ── Main entry point ─────────────────────────────────────────────────────────

export function calcPeaqAge(inputs: PeaqAgeInputs): PeaqAgeResult {
  const { chronoAge, sex, bloodwork, oma, fitness, sleep } = inputs

  // ── PhenoAge ─────────────────────────────────────────────────────────────
  let phenoAge: number | null = null
  let phenoDelta = 0
  let missingPhenoMarkers: string[] = []
  const hasBW = bloodwork != null

  if (bloodwork) {
    const result = calcPhenoAge(bloodwork, chronoAge)
    phenoAge = result.phenoAge
    missingPhenoMarkers = result.missing
    if (phenoAge != null) {
      phenoDelta = phenoAge - chronoAge
    }
  }

  // ── OMA ──────────────────────────────────────────────────────────────────
  let omaPct = 50
  let omaDelta = 0
  const hasOMA = oma != null

  if (oma) {
    const omaResult = calcOMA(oma)
    omaPct = omaResult.omaPct
    omaDelta = omaResult.omaDelta
  }

  // ── VO₂ max ──────────────────────────────────────────────────────────────
  const { vo2Pct, hasVO2 } = resolveVO2(fitness, sex)
  const vo2Delta = capVal(-(vo2Pct - 50) * 0.10, 8)

  // ── RHR ──────────────────────────────────────────────────────────────────
  const expRHR = getExpectedRHR(chronoAge, sex)
  const rhr = fitness?.rhr ?? null
  const rhrDelta = rhr != null ? capVal((rhr - expRHR) * 0.20, 5) : 0
  const hasRHR = rhr != null

  // ── Sleep ────────────────────────────────────────────────────────────────
  const durDelta = sleep?.avgDurationHours != null
    ? getSleepDurDelta(sleep.avgDurationHours)
    : 0
  const regDelta = sleep?.bedtimeStdDevMinutes != null
    ? getSleepRegDelta(sleep.bedtimeStdDevMinutes)
    : 0
  const hasDur = sleep?.avgDurationHours != null
  const hasReg = sleep?.bedtimeStdDevMinutes != null

  // ── Cross-panel interactions ─────────────────────────────────────────────
  const hsCrpValid = hasBW && bloodwork!.hsCrpAvailable && bloodwork!.crp != null
  const hsCrpLow = hsCrpValid && bloodwork!.crp! < 1.0

  const i1 = (hasOMA && hsCrpLow && oma!.neisseria_pct > 5) ? -0.3 : 0
  const i2 = (hasOMA && hasRHR && omaPct > 70 && rhr! < (expRHR - 5)) ? -0.2 : 0
  const i3 = (hsCrpLow && hasDur && hasReg &&
    sleep!.avgDurationHours! >= 7 && sleep!.avgDurationHours! <= 8 &&
    sleep!.bedtimeStdDevMinutes! < 30) ? -0.2 : 0

  const crossPanel = capVal(i1 + i2 + i3, 1.0)

  // ── Weight redistribution ───────────────────────────────────────────────
  const crossW = (hasBW && hasOMA) ? W_CROSS : 0

  const slots: { weight: number; present: boolean }[] = [
    { weight: W_PHENO, present: hasBW && phenoAge != null },
    { weight: W_OMA,   present: hasOMA },
    { weight: W_VO2,   present: hasVO2 },
    { weight: W_RHR,   present: hasRHR },
    { weight: W_DUR,   present: hasDur },
    { weight: W_REG,   present: hasReg },
  ]

  const mainSum = slots.filter(s => s.present).reduce((a, s) => a + s.weight, 0)
  const scale = mainSum > 0 ? (1 - crossW) / mainSum : 0

  const wP = (slots[0].present ? slots[0].weight : 0) * scale
  const wO = (slots[1].present ? slots[1].weight : 0) * scale
  const wV = (slots[2].present ? slots[2].weight : 0) * scale
  const wR = (slots[3].present ? slots[3].weight : 0) * scale
  const wD = (slots[4].present ? slots[4].weight : 0) * scale
  const wG = (slots[5].present ? slots[5].weight : 0) * scale

  // ── Final age ───────────────────────────────────────────────────────────
  const peaqAge = Math.round((
    chronoAge +
    wP * phenoDelta +
    wO * omaDelta +
    wV * vo2Delta +
    wR * rhrDelta +
    wD * durDelta +
    wG * regDelta +
    crossW * crossPanel
  ) * 10) / 10

  const delta = Math.round((chronoAge - peaqAge) * 10) / 10
  const band = getBand(delta)

  return {
    peaqAge, chronoAge, delta, band,
    phenoAge, phenoDelta: Math.round(phenoDelta * 10) / 10,
    missingPhenoMarkers,
    omaPct: Math.round(omaPct * 10) / 10,
    omaDelta: Math.round(omaDelta * 100) / 100,
    vo2Pct, vo2Delta: Math.round(vo2Delta * 100) / 100,
    expRHR, rhrDelta: Math.round(rhrDelta * 100) / 100,
    durDelta, regDelta,
    i1, i2, i3, crossPanel,
    wP: Math.round(wP * 1000) / 1000,
    wO: Math.round(wO * 1000) / 1000,
    wV: Math.round(wV * 1000) / 1000,
    wR: Math.round(wR * 1000) / 1000,
    wD: Math.round(wD * 1000) / 1000,
    wG: Math.round(wG * 1000) / 1000,
    crossW,
    hasBW, hasOMA, hasVO2,
  }
}

// Re-export OMA types for convenience
export { calcOMA, type OMAInputs, type OMAResult } from "./oma"

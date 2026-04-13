/**
 * Peaq Age V5 — unit tests
 * Run: node --import tsx packages/score-engine/src/peaqAge.test.ts
 */

import assert from "node:assert/strict"
import { calcPeaqAge, type PeaqAgeInputs, type BloodworkInputs } from "./peaqAge"
import { calcOMA } from "./oma"

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.error(`  ✗ ${name}`)
    console.error(`    ${e instanceof Error ? e.message : e}`)
  }
}

function approx(actual: number, expected: number, tolerance = 0.5): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ~${expected} ±${tolerance}, got ${actual}`,
  )
}

// ── Test fixtures ────────────────────────────────────────────────────────────

const GABRIELLA_BW_NO_CRP: BloodworkInputs = {
  albumin: 4.2,
  creatinine: 0.85,
  glucose: 88,
  crp: null,
  lymph: 32,
  mcv: 88,
  rdw: 12.8,
  alp: 55,
  wbc: 5.4,
  hsCrpAvailable: false,
}

const GABRIELLA_BW_WITH_CRP: BloodworkInputs = {
  ...GABRIELLA_BW_NO_CRP,
  crp: 1.5,
  hsCrpAvailable: true,
}

const GABRIELLA_OMA = {
  protective_pct: 65,
  pathogen_inv_pct: 70,
  shannon_pct: 55,
  neisseria_pct: 7.2,
}

const GABRIELLA_FITNESS = {
  vo2max: 36,
  vo2Source: "manual" as const,
  activityLevel: "active" as const,
  rhr: 62,
}

const GABRIELLA_SLEEP = {
  avgDurationHours: 7.3,
  bedtimeStdDevMinutes: 22,
}

// ── Tests ────────────────────────────────────────────────────────────────────

console.log("\n── OMA module ──")

test("OMA at median returns zero delta", () => {
  const result = calcOMA({ protective_pct: 50, pathogen_inv_pct: 50, shannon_pct: 50, neisseria_pct: 5 })
  assert.equal(result.omaPct, 50)
  assert.equal(result.omaDelta, 0)
})

test("OMA above median returns negative delta (younger)", () => {
  const result = calcOMA({ protective_pct: 80, pathogen_inv_pct: 70, shannon_pct: 60, neisseria_pct: 8 })
  assert.ok(result.omaPct > 50)
  assert.ok(result.omaDelta < 0, `Expected negative delta, got ${result.omaDelta}`)
})

test("OMA below median returns positive delta (older)", () => {
  const result = calcOMA({ protective_pct: 20, pathogen_inv_pct: 30, shannon_pct: 25, neisseria_pct: 2 })
  assert.ok(result.omaPct < 50)
  assert.ok(result.omaDelta > 0, `Expected positive delta, got ${result.omaDelta}`)
})

test("OMA delta caps at ±8 years", () => {
  const high = calcOMA({ protective_pct: 100, pathogen_inv_pct: 100, shannon_pct: 100, neisseria_pct: 10 })
  assert.ok(high.omaDelta >= -8, `Expected >= -8, got ${high.omaDelta}`)
  const low = calcOMA({ protective_pct: 0, pathogen_inv_pct: 0, shannon_pct: 0, neisseria_pct: 0 })
  assert.ok(low.omaDelta <= 8, `Expected <= 8, got ${low.omaDelta}`)
})

console.log("\n── PhenoAge ──")

test("PhenoAge null when hs-CRP missing (standard CRP present)", () => {
  const result = calcPeaqAge({
    chronoAge: 32, sex: "female",
    bloodwork: GABRIELLA_BW_NO_CRP,
    oma: GABRIELLA_OMA,
    fitness: GABRIELLA_FITNESS,
    sleep: GABRIELLA_SLEEP,
  })
  assert.equal(result.phenoAge, null)
  assert.ok(result.missingPhenoMarkers.includes("crp_hsCRP_required"))
  assert.ok(!result.hasBW || result.phenoAge == null)
})

test("PhenoAge computes when all 9 markers present with hs-CRP", () => {
  const result = calcPeaqAge({
    chronoAge: 32, sex: "female",
    bloodwork: GABRIELLA_BW_WITH_CRP,
    oma: GABRIELLA_OMA,
    fitness: GABRIELLA_FITNESS,
    sleep: GABRIELLA_SLEEP,
  })
  assert.ok(result.phenoAge != null, "PhenoAge should not be null")
  assert.ok(result.phenoAge! > 15 && result.phenoAge! < 60, `PhenoAge out of sane range: ${result.phenoAge}`)
  assert.equal(result.missingPhenoMarkers.length, 0)
})

test("PhenoAge null when any marker is null", () => {
  const bw: BloodworkInputs = { ...GABRIELLA_BW_WITH_CRP, rdw: null }
  const result = calcPeaqAge({
    chronoAge: 32, sex: "female",
    bloodwork: bw, oma: null, fitness: null, sleep: null,
  })
  assert.equal(result.phenoAge, null)
  assert.ok(result.missingPhenoMarkers.includes("rdw"))
})

console.log("\n── Weight redistribution ──")

test("Missing blood panel: pheno weight redistributes, crossW=0", () => {
  const result = calcPeaqAge({
    chronoAge: 32, sex: "female",
    bloodwork: null,
    oma: GABRIELLA_OMA,
    fitness: GABRIELLA_FITNESS,
    sleep: GABRIELLA_SLEEP,
  })
  assert.equal(result.wP, 0, "PhenoAge weight should be 0 when blood missing")
  assert.equal(result.crossW, 0, "Cross-panel weight should be 0 when blood missing")
  const totalW = result.wO + result.wV + result.wR + result.wD + result.wG
  approx(totalW, 1.0, 0.01)
})

test("Missing OMA: oma weight redistributes, crossW=0", () => {
  const result = calcPeaqAge({
    chronoAge: 32, sex: "female",
    bloodwork: GABRIELLA_BW_WITH_CRP,
    oma: null,
    fitness: GABRIELLA_FITNESS,
    sleep: GABRIELLA_SLEEP,
  })
  assert.equal(result.wO, 0, "OMA weight should be 0 when OMA missing")
  assert.equal(result.crossW, 0, "Cross-panel weight should be 0 when OMA missing")
  const totalW = result.wP + result.wV + result.wR + result.wD + result.wG
  approx(totalW, 1.0, 0.01)
})

test("Missing VO2: vo2 weight redistributes", () => {
  const result = calcPeaqAge({
    chronoAge: 32, sex: "female",
    bloodwork: GABRIELLA_BW_WITH_CRP,
    oma: GABRIELLA_OMA,
    fitness: null,
    sleep: GABRIELLA_SLEEP,
  })
  assert.equal(result.wV, 0)
  assert.equal(result.wR, 0)
  assert.equal(result.hasVO2, false)
})

test("All panels present: weights sum to ~1.0", () => {
  const result = calcPeaqAge({
    chronoAge: 32, sex: "female",
    bloodwork: GABRIELLA_BW_WITH_CRP,
    oma: GABRIELLA_OMA,
    fitness: GABRIELLA_FITNESS,
    sleep: GABRIELLA_SLEEP,
  })
  const totalW = result.wP + result.wO + result.wV + result.wR + result.wD + result.wG + result.crossW
  approx(totalW, 1.0, 0.01)
})

console.log("\n── Cross-panel interactions ──")

test("I1 fires: neisseria > 5% AND hs-CRP < 1.0", () => {
  const result = calcPeaqAge({
    chronoAge: 32, sex: "female",
    bloodwork: { ...GABRIELLA_BW_WITH_CRP, crp: 0.8 },
    oma: { ...GABRIELLA_OMA, neisseria_pct: 6.0 },
    fitness: GABRIELLA_FITNESS,
    sleep: GABRIELLA_SLEEP,
  })
  assert.equal(result.i1, -0.3, `I1 should fire: got ${result.i1}`)
})

test("I1 does NOT fire when hs-CRP >= 1.0", () => {
  const result = calcPeaqAge({
    chronoAge: 32, sex: "female",
    bloodwork: { ...GABRIELLA_BW_WITH_CRP, crp: 1.5 },
    oma: { ...GABRIELLA_OMA, neisseria_pct: 6.0 },
    fitness: GABRIELLA_FITNESS,
    sleep: GABRIELLA_SLEEP,
  })
  assert.equal(result.i1, 0)
})

test("I2 fires: OMA > 70th pct AND RHR < expectedRHR - 5", () => {
  const oma = { protective_pct: 80, pathogen_inv_pct: 85, shannon_pct: 70, neisseria_pct: 8 }
  const result = calcPeaqAge({
    chronoAge: 32, sex: "female",
    bloodwork: GABRIELLA_BW_WITH_CRP,
    oma,
    fitness: { ...GABRIELLA_FITNESS, rhr: 60 }, // expected=71 for 32F, 60 < 66
    sleep: GABRIELLA_SLEEP,
  })
  assert.equal(result.i2, -0.2, `I2 should fire: got ${result.i2}`)
})

test("I3 fires: hs-CRP < 1.0 AND 7-8h sleep AND bedtime SD < 30", () => {
  const result = calcPeaqAge({
    chronoAge: 32, sex: "female",
    bloodwork: { ...GABRIELLA_BW_WITH_CRP, crp: 0.5 },
    oma: GABRIELLA_OMA,
    fitness: GABRIELLA_FITNESS,
    sleep: { avgDurationHours: 7.5, bedtimeStdDevMinutes: 20 },
  })
  assert.equal(result.i3, -0.2, `I3 should fire: got ${result.i3}`)
})

test("All three interactions fire: crossPanel capped at -0.7", () => {
  const oma = { protective_pct: 85, pathogen_inv_pct: 85, shannon_pct: 70, neisseria_pct: 8 }
  const result = calcPeaqAge({
    chronoAge: 32, sex: "female",
    bloodwork: { ...GABRIELLA_BW_WITH_CRP, crp: 0.5 },
    oma,
    fitness: { ...GABRIELLA_FITNESS, rhr: 60 },
    sleep: { avgDurationHours: 7.5, bedtimeStdDevMinutes: 20 },
  })
  assert.equal(result.i1, -0.3)
  assert.equal(result.i2, -0.2)
  assert.equal(result.i3, -0.2)
  assert.equal(result.crossPanel, -0.7)
})

console.log("\n── Band thresholds ──")

test("delta > 5 → EXCEPTIONAL", () => {
  const result = calcPeaqAge({
    chronoAge: 50, sex: "male",
    bloodwork: {
      albumin: 4.5, creatinine: 0.9, glucose: 85, crp: 0.3,
      lymph: 35, mcv: 86, rdw: 12.0, alp: 50, wbc: 5.0,
      hsCrpAvailable: true,
    },
    oma: { protective_pct: 90, pathogen_inv_pct: 90, shannon_pct: 85, neisseria_pct: 10 },
    fitness: { vo2max: 55, vo2Source: "manual", activityLevel: "very_active", rhr: 52 },
    sleep: { avgDurationHours: 7.5, bedtimeStdDevMinutes: 12 },
  })
  assert.ok(result.delta > 5, `Expected delta > 5 for EXCEPTIONAL, got ${result.delta}`)
  assert.equal(result.band, "EXCEPTIONAL")
})

test("delta ~0 → ON PACE", () => {
  const result = calcPeaqAge({
    chronoAge: 40, sex: "male",
    bloodwork: null,
    oma: { protective_pct: 50, pathogen_inv_pct: 50, shannon_pct: 50, neisseria_pct: 3 },
    fitness: { vo2max: null, vo2Source: null, activityLevel: "moderate", rhr: 68 },
    sleep: { avgDurationHours: 7.5, bedtimeStdDevMinutes: 25 },
  })
  assert.ok(result.delta >= -2 && result.delta <= 2, `Expected delta ±2, got ${result.delta}`)
  assert.equal(result.band, "ON PACE")
})

test("delta < -5 → ACCELERATED", () => {
  const result = calcPeaqAge({
    chronoAge: 35, sex: "male",
    bloodwork: {
      albumin: 3.5, creatinine: 1.4, glucose: 130, crp: 8.0,
      lymph: 18, mcv: 98, rdw: 16.0, alp: 120, wbc: 11.0,
      hsCrpAvailable: true,
    },
    oma: { protective_pct: 10, pathogen_inv_pct: 15, shannon_pct: 12, neisseria_pct: 1 },
    fitness: { vo2max: null, vo2Source: null, activityLevel: "sedentary", rhr: 85 },
    sleep: { avgDurationHours: 5.5, bedtimeStdDevMinutes: 65 },
  })
  assert.ok(result.delta <= -5, `Expected delta ≤ -5 for ACCELERATED, got ${result.delta}`)
  assert.equal(result.band, "ACCELERATED")
})

console.log("\n── VO₂ estimated fallback ──")

test("Activity level 'sedentary' maps to 20th percentile", () => {
  const result = calcPeaqAge({
    chronoAge: 35, sex: "male",
    bloodwork: null, oma: null,
    fitness: { vo2max: null, vo2Source: "estimated", activityLevel: "sedentary", rhr: null },
    sleep: null,
  })
  assert.equal(result.vo2Pct, 20)
  assert.equal(result.hasVO2, true)
})

test("Activity level 'very_active' maps to 75th percentile", () => {
  const result = calcPeaqAge({
    chronoAge: 35, sex: "male",
    bloodwork: null, oma: null,
    fitness: { vo2max: null, vo2Source: "estimated", activityLevel: "very_active", rhr: null },
    sleep: null,
  })
  assert.equal(result.vo2Pct, 75)
})

test("No VO₂ data at all: hasVO2=false, weight redistributed", () => {
  const result = calcPeaqAge({
    chronoAge: 35, sex: "male",
    bloodwork: null, oma: null,
    fitness: { vo2max: null, vo2Source: null, activityLevel: null, rhr: null },
    sleep: null,
  })
  assert.equal(result.hasVO2, false)
  assert.equal(result.wV, 0)
})

console.log("\n── Gabriella scenarios ──")

test("Gabriella 32F no hs-CRP: peaqAge in sane range", () => {
  const result = calcPeaqAge({
    chronoAge: 32, sex: "female",
    bloodwork: GABRIELLA_BW_NO_CRP,
    oma: GABRIELLA_OMA,
    fitness: GABRIELLA_FITNESS,
    sleep: GABRIELLA_SLEEP,
  })
  assert.ok(result.peaqAge > 25 && result.peaqAge < 40,
    `Expected peaqAge 25-40, got ${result.peaqAge}`)
  assert.equal(result.phenoAge, null)
  console.log(`    → peaqAge=${result.peaqAge}, delta=${result.delta}, band=${result.band}`)
})

test("Gabriella 32F with hs-CRP 1.5: peaqAge in sane range", () => {
  const result = calcPeaqAge({
    chronoAge: 32, sex: "female",
    bloodwork: GABRIELLA_BW_WITH_CRP,
    oma: GABRIELLA_OMA,
    fitness: GABRIELLA_FITNESS,
    sleep: GABRIELLA_SLEEP,
  })
  assert.ok(result.peaqAge > 20 && result.peaqAge < 40,
    `Expected peaqAge 20-40, got ${result.peaqAge}`)
  assert.ok(result.phenoAge != null)
  console.log(`    → peaqAge=${result.peaqAge}, phenoAge=${result.phenoAge}, delta=${result.delta}, band=${result.band}`)
})

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`)
if (failed > 0) process.exit(1)

import { describe, test, expect } from "vitest"
import { evaluateConnection, type ConnectionInput } from "./connections"

const EMPTY_INPUT: ConnectionInput = {
  age: 35, sex: "male",
  neisseria_pct: null, porphyromonas_pct: null, fusobacterium_pct: null,
  peptostreptococcus_pct: null, p_melaninogenica_pct: null, veillonella_pct: null,
  strep_mutans_pct: null, solobacterium_pct: null,
  protective_pct: null, pathogen_inv_pct: null, shannon_pct: null, oma_pct: null,
  oral_days_since_test: null,
  ldl: null, hs_crp: null, hba1c: null, glucose: null, lpa: null,
  vitamin_d: null, mpv: null, wbc: null, rdw: null, pheno_age: null,
  blood_days_since_draw: null,
  rhr_avg: null, rhr_expected: null, hrv_rmssd_avg: null, hrv_nights: null,
  hrv_percentile: null, deep_sleep_min: null, rem_min: null,
  sleep_duration_hrs: null, sleep_efficiency_pct: null, sleep_regularity_sd: null,
  wearable_nights: null,
  mouthwash_type: null, nasal_obstruction: null, sinus_history: null,
  known_conditions: null,
  oma_pct_prev: null, pheno_age_prev: null, hs_crp_prev: null,
  rhr_avg_prev: null, sleep_duration_prev: null,
  testosterone: null, creatinine: null,
}

function buildTestInput(overrides: Partial<ConnectionInput>): ConnectionInput {
  return { ...EMPTY_INPUT, ...overrides }
}

const freshData = {
  oral_days_since_test: 30,
  blood_days_since_draw: 30,
  wearable_nights: 30,
  hrv_nights: 30,
}

describe("Connection Rules Engine v1.2", () => {

  test("Returns an array (not a single result)", () => {
    const result = evaluateConnection("ldl", buildTestInput(freshData))
    expect(Array.isArray(result)).toBe(true)
  })

  test("Rule 1A: Neisseria depleted + LDL elevated", () => {
    const results = evaluateConnection("ldl", buildTestInput({ neisseria_pct: 2.0, ldl: 144, ...freshData }))
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].rule_id).toBe("1A")
    expect(results[0].priority).toBe(1)
    expect(results[0].direction).toBe("unfavorable")
  })

  test("Rule 1C: Neisseria healthy + CRP low (favorable)", () => {
    const results = evaluateConnection("hs_crp", buildTestInput({ neisseria_pct: 15.0, hs_crp: 0.7, ...freshData }))
    const r1c = results.find(r => r.rule_id === "1C")
    expect(r1c).toBeDefined()
    expect(r1c!.priority).toBe(2)
    expect(r1c!.direction).toBe("favorable")
  })

  test("Stale blood panel silences blood rules", () => {
    const results = evaluateConnection("ldl", buildTestInput({
      ldl: 160, neisseria_pct: 2.0, blood_days_since_draw: 200, oral_days_since_test: 30,
    }))
    expect(results.length).toBe(0)
  })

  test("Empty array when no rules fire", () => {
    const results = evaluateConnection("ldl", buildTestInput({ ldl: 90, neisseria_pct: 20, ...freshData }))
    expect(results).toEqual([])
  })

  test("Priority 1 sorted first", () => {
    const results = evaluateConnection("hs_crp", buildTestInput({ neisseria_pct: 2.0, hs_crp: 4.0, ...freshData }))
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].priority).toBe(1)
  })

  test("Rule stacking: multiple rules fire for same marker", () => {
    const results = evaluateConnection("hs_crp", buildTestInput({
      neisseria_pct: 2.0, hs_crp: 4.0, porphyromonas_pct: 1.5,
      sleep_duration_hrs: 5.5, ...freshData,
    }))
    expect(results.length).toBeGreaterThan(1)
    const ruleIds = results.map(r => r.rule_id)
    expect(ruleIds).toContain("1B")
    expect(ruleIds).toContain("2A")
  })

  test("Rule 17A: Triple cardiovascular convergence", () => {
    const results = evaluateConnection("heart_health", buildTestInput({
      neisseria_pct: 2.7, ldl: 144, hs_crp: 1.5,
      rhr_avg: 63, rhr_expected: 71, hrv_percentile: 20, ...freshData,
    }))
    const r17 = results.find(r => r.rule_id === "17A")
    expect(r17).toBeDefined()
    expect(r17!.priority).toBe(1)
  })

  test("Rule 3B: Good sleep + CRP low (favorable)", () => {
    const results = evaluateConnection("deep_sleep", buildTestInput({
      sleep_duration_hrs: 7.5, sleep_regularity_sd: 20, hs_crp: 0.5, ...freshData,
    }))
    const r3b = results.find(r => r.rule_id === "3B")
    expect(r3b).toBeDefined()
    expect(r3b!.direction).toBe("favorable")
  })

  test("CRP > 10 silences all blood rules", () => {
    const results = evaluateConnection("hs_crp", buildTestInput({ neisseria_pct: 2.0, hs_crp: 15.0, ...freshData }))
    expect(results.length).toBe(0)
  })

  test("Unknown marker returns empty array", () => {
    const results = evaluateConnection("unknown_marker", buildTestInput(freshData))
    expect(results).toEqual([])
  })

  test("Rule 9A: Fires for age >= 45, not for age < 45", () => {
    const young = evaluateConnection("harmful_bacteria", buildTestInput({ porphyromonas_pct: 1.0, age: 30, ...freshData }))
    expect(young.find(r => r.rule_id === "9A")).toBeUndefined()

    const older = evaluateConnection("harmful_bacteria", buildTestInput({ porphyromonas_pct: 1.0, age: 50, ...freshData }))
    expect(older.find(r => r.rule_id === "9A")).toBeDefined()
  })

  test("Wearable minimum: < 14 nights silences sleep rules", () => {
    const results = evaluateConnection("duration", buildTestInput({
      sleep_duration_hrs: 5.0, hs_crp: 5.0, wearable_nights: 10, blood_days_since_draw: 30,
    }))
    expect(results.length).toBe(0)
  })

  // ── New v1.2 rules ─────────────────────────────────────────────────────────

  test("Rule 18A: RHR elevated + HbA1c elevated", () => {
    const results = evaluateConnection("blood_sugar", buildTestInput({
      rhr_avg: 80, hba1c: 6.0, ...freshData,
    }))
    const r18a = results.find(r => r.rule_id === "18A")
    expect(r18a).toBeDefined()
    expect(r18a!.priority).toBe(1)
    expect(r18a!.direction).toBe("unfavorable")
  })

  test("Rule 19C: Only fires for males with low deep sleep + low testosterone", () => {
    const male = evaluateConnection("deep_sleep", buildTestInput({
      deep_sleep_min: 30, testosterone: 250, sex: "male", ...freshData,
    }))
    expect(male.find(r => r.rule_id === "19C")).toBeDefined()

    const female = evaluateConnection("deep_sleep", buildTestInput({
      deep_sleep_min: 30, testosterone: 250, sex: "female", ...freshData,
    }))
    expect(female.find(r => r.rule_id === "19C")).toBeUndefined()
  })

  test("Rule 20A: Sex-specific creatinine thresholds", () => {
    const maleHigh = evaluateConnection("creatinine", buildTestInput({
      pathogen_inv_pct: 15, creatinine: 1.3, sex: "male", ...freshData,
    }))
    expect(maleHigh.find(r => r.rule_id === "20A")).toBeDefined()

    const maleNormal = evaluateConnection("creatinine", buildTestInput({
      pathogen_inv_pct: 15, creatinine: 1.0, sex: "male", ...freshData,
    }))
    expect(maleNormal.find(r => r.rule_id === "20A")).toBeUndefined()

    const femaleHigh = evaluateConnection("creatinine", buildTestInput({
      pathogen_inv_pct: 15, creatinine: 1.1, sex: "female", ...freshData,
    }))
    expect(femaleHigh.find(r => r.rule_id === "20A")).toBeDefined()
  })

  test("Rule 22B: Favorable when WBC normal + pathogens low + sleep adequate", () => {
    const results = evaluateConnection("cellular_health", buildTestInput({
      wbc: 6.0, pathogen_inv_pct: 70, sleep_duration_hrs: 7.5, ...freshData,
    }))
    const r22b = results.find(r => r.rule_id === "22B")
    expect(r22b).toBeDefined()
    expect(r22b!.direction).toBe("favorable")
  })

  test("Rule 16A: Priority changed to 2", () => {
    const results = evaluateConnection("vitamin_d", buildTestInput({
      vitamin_d: 20, porphyromonas_pct: 0.8, ...freshData,
    }))
    const r16a = results.find(r => r.rule_id === "16A")
    expect(r16a).toBeDefined()
    expect(r16a!.priority).toBe(2)
  })

  test("Rule 14A: Requires mouthwash_type (Phase 2 flag)", () => {
    const noMouthwash = evaluateConnection("good_bacteria", buildTestInput({
      mouthwash_type: null, neisseria_pct: 2, ldl: 140, ...freshData,
    }))
    expect(noMouthwash.find(r => r.rule_id === "14A")).toBeUndefined()

    const withMouthwash = evaluateConnection("good_bacteria", buildTestInput({
      mouthwash_type: "antiseptic", neisseria_pct: 2, ldl: 140, ...freshData,
    }))
    expect(withMouthwash.find(r => r.rule_id === "14A")).toBeDefined()
  })
})

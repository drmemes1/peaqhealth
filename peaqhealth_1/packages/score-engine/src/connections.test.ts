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

describe("Connection Rules Engine", () => {

  // ── Rule 1A fires ────────────────────────────────────────────────────────
  test("Rule 1A: Neisseria depleted + LDL elevated", () => {
    const input = buildTestInput({
      neisseria_pct: 2.0,
      ldl: 144,
      ...freshData,
    })
    const result = evaluateConnection("ldl", input)
    expect(result.fires).toBe(true)
    if (result.fires) {
      expect(result.rule_id).toBe("1A")
      expect(result.priority).toBe(1)
      expect(result.direction).toBe("unfavorable")
    }
  })

  // ── Rule 1C fires (favorable) ────────────────────────────────────────────
  test("Rule 1C: Neisseria healthy + CRP low", () => {
    const input = buildTestInput({
      neisseria_pct: 15.0,
      hs_crp: 0.7,
      ...freshData,
    })
    const result = evaluateConnection("hs_crp", input)
    expect(result.fires).toBe(true)
    if (result.fires) {
      expect(result.rule_id).toBe("1C")
      expect(result.priority).toBe(2)
      expect(result.direction).toBe("favorable")
    }
  })

  // ── QC gate blocks rule ──────────────────────────────────────────────────
  test("Stale blood panel silences blood rules", () => {
    const input = buildTestInput({
      ldl: 160,
      neisseria_pct: 2.0,
      blood_days_since_draw: 200,
      oral_days_since_test: 30,
    })
    const result = evaluateConnection("ldl", input)
    expect(result.fires).toBe(false)
  })

  // ── No connection when no rules fire ─────────────────────────────────────
  test("No connection line when no rules fire", () => {
    const input = buildTestInput({
      ldl: 90,
      neisseria_pct: 20,
      ...freshData,
    })
    const result = evaluateConnection("ldl", input)
    expect(result.fires).toBe(false)
  })

  // ── Priority ordering ───────────────────────────────────────────────────
  test("Priority 1 returned over Priority 2 for hs_crp", () => {
    const input = buildTestInput({
      neisseria_pct: 2.0,
      hs_crp: 4.0,
      ...freshData,
    })
    const result = evaluateConnection("hs_crp", input)
    expect(result.fires).toBe(true)
    if (result.fires) {
      expect(result.priority).toBe(1)
    }
  })

  // ── Rule 17A: Triple cardiovascular convergence ──────────────────────────
  test("Rule 17A: Triple cardiovascular convergence", () => {
    const input = buildTestInput({
      neisseria_pct: 2.7,
      ldl: 144,
      hs_crp: 1.5,
      rhr_avg: 63,
      rhr_expected: 71,
      hrv_percentile: 20,
      ...freshData,
    })
    const result = evaluateConnection("heart_health", input)
    expect(result.fires).toBe(true)
    if (result.fires) {
      expect(result.rule_id).toBe("17A")
      expect(result.priority).toBe(1)
    }
  })

  // ── Rule 2A: Porphyromonas + CRP ────────────────────────────────────────
  test("Rule 2A: Porphyromonas elevated + CRP elevated", () => {
    const input = buildTestInput({
      porphyromonas_pct: 1.5,
      hs_crp: 4.0,
      ...freshData,
    })
    const result = evaluateConnection("harmful_bacteria", input)
    expect(result.fires).toBe(true)
    if (result.fires) {
      expect(result.rule_id).toBe("2A")
      expect(result.direction).toBe("unfavorable")
    }
  })

  // ── Rule 3B: Good sleep + low CRP ───────────────────────────────────────
  test("Rule 3B: Good sleep + CRP low (favorable)", () => {
    const input = buildTestInput({
      sleep_duration_hrs: 7.5,
      sleep_regularity_sd: 20,
      hs_crp: 0.5,
      ...freshData,
    })
    const result = evaluateConnection("deep_sleep", input)
    expect(result.fires).toBe(true)
    if (result.fires) {
      expect(result.rule_id).toBe("3B")
      expect(result.direction).toBe("favorable")
    }
  })

  // ── CRP acute exclusion ─────────────────────────────────────────────────
  test("CRP > 10 silences all blood rules", () => {
    const input = buildTestInput({
      neisseria_pct: 2.0,
      hs_crp: 15.0,
      ...freshData,
    })
    const result = evaluateConnection("hs_crp", input)
    expect(result.fires).toBe(false)
  })

  // ── Rule 4A: Exploratory ────────────────────────────────────────────────
  test("Rule 4A: Neisseria depleted + poor sleep efficiency (exploratory)", () => {
    const input = buildTestInput({
      neisseria_pct: 3.0,
      sleep_efficiency_pct: 75,
      ...freshData,
    })
    const result = evaluateConnection("deep_sleep", input)
    expect(result.fires).toBe(true)
    if (result.fires) {
      expect(result.direction).toBe("exploratory")
      expect(result.priority).toBe(3)
    }
  })

  // ── Unknown marker returns fires: false ─────────────────────────────────
  test("Unknown marker_id returns no connection", () => {
    const result = evaluateConnection("unknown_marker", buildTestInput(freshData))
    expect(result.fires).toBe(false)
  })

  // ── Rule 9A: Age gating ─────────────────────────────────────────────────
  test("Rule 9A: Does not fire for age < 45", () => {
    const input = buildTestInput({
      porphyromonas_pct: 1.0,
      age: 30,
      ...freshData,
    })
    const result = evaluateConnection("harmful_bacteria", input)
    if (result.fires) {
      expect(result.rule_id).not.toBe("9A")
    }
  })

  test("Rule 9A: Fires for age >= 45 with elevated pathogens", () => {
    const input = buildTestInput({
      porphyromonas_pct: 1.0,
      age: 50,
      ...freshData,
    })
    const result = evaluateConnection("harmful_bacteria", input)
    expect(result.fires).toBe(true)
    if (result.fires) {
      expect(result.rule_id).toBe("9A")
    }
  })

  // ── Wearable minimum gate ───────────────────────────────────────────────
  test("Wearable minimum: < 14 nights silences sleep rules", () => {
    const input = buildTestInput({
      sleep_duration_hrs: 5.0,
      hs_crp: 5.0,
      wearable_nights: 10,
      blood_days_since_draw: 30,
    })
    const result = evaluateConnection("duration", input)
    expect(result.fires).toBe(false)
  })
})

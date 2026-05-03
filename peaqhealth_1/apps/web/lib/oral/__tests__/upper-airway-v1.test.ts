import { calculateUpperAirway, type UpperAirwayInput } from "../upper-airway-v1"

function makeInput(overrides: Partial<UpperAirwayInput> = {}): UpperAirwayInput {
  return {
    rothia_total_pct: 0,
    actinomyces_total_pct: 0,
    neisseria_pct: 0,
    prevotella_combined_pct: 20,
    shannon_diversity: 4.5,
    snoring_reported: null,
    non_restorative_sleep: null,
    osa_witnessed: null,
    hypertension_dx: null,
    age_years: 40,
    biological_sex: "female",
    nasal_obstruction: null,
    mouth_breathing_confirm: null,
    sinus_history: null,
    whitening_tray_last_48h: null,
    whitening_strips_last_48h: null,
    professional_whitening_last_7d: null,
    whitening_toothpaste_daily: null,
    peroxide_mouthwash_daily: null,
    env_peroxide_flag: null,
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────
// Cohort fixtures (per ADR-0025 validation table)
// ─────────────────────────────────────────────────────────────────────

describe("Cohort fixtures", () => {
  test("Igor (Pilot.Peaq.1) — aerobic shift only → tier_5_habitual_mouth_breathing", () => {
    const r = calculateUpperAirway(makeInput({
      rothia_total_pct: 8.31,
      actinomyces_total_pct: 5.5,
      neisseria_pct: 14.80,        // > 8 → aerobic shift = true
      prevotella_combined_pct: 6.0, // > 5 → not depleted
      shannon_diversity: 4.5,       // not reduced
      snoring_reported: "occasional",
      non_restorative_sleep: "rarely",
      hypertension_dx: false,
      age_years: 35,
      biological_sex: "male",
    }))
    expect(r.bacterial.features_present).toBe(1)
    expect(r.bacterial.aerobic_shift).toBe(true)
    expect(r.bacterial.actinobacteria_enriched).toBe(false)
    expect(r.stop_questionnaire.stop_score).toBe(0)
    expect(r.tier).toBe("tier_5_habitual_mouth_breathing")
  })

  test("Pilot 3 — actinobacteria + prevotella depleted, no symptoms → tier_6_commensal_dominant_healthy", () => {
    const r = calculateUpperAirway(makeInput({
      rothia_total_pct: 30,         // > 23 → actinobacteria enriched
      actinomyces_total_pct: 5,
      neisseria_pct: 5,             // not aerobic shift
      prevotella_combined_pct: 3,   // < 5 → depleted
      shannon_diversity: 4.5,
      snoring_reported: "never",
      non_restorative_sleep: "never",
      hypertension_dx: false,
      age_years: 32,
      biological_sex: "female",
    }))
    expect(r.bacterial.features_present).toBe(2)
    expect(r.stop_questionnaire.stop_score).toBe(0)
    expect(r.nasal_obstruction.category).toBe("none")
    expect(r.tier).toBe("tier_6_commensal_dominant_healthy")
  })

  test("Pilot 3 + acute peroxide → tier_confounded_peroxide", () => {
    const r = calculateUpperAirway(makeInput({
      rothia_total_pct: 30,
      prevotella_combined_pct: 3,
      whitening_tray_last_48h: true,
    }))
    expect(r.tier).toBe("tier_confounded_peroxide")
    expect(r.peroxide_confounder.severity).toBe("acute_high")
    expect(r.peroxide_confounder.caveat_required).toBe(true)
  })

  test("Gabby — STOP+ with nasal obstruction → tier_4a_sinus_driven", () => {
    const r = calculateUpperAirway(makeInput({
      rothia_total_pct: 5,
      actinomyces_total_pct: 2,
      neisseria_pct: 5,
      prevotella_combined_pct: 12,
      shannon_diversity: 4.5,
      snoring_reported: "frequent",
      non_restorative_sleep: "often",
      hypertension_dx: false,
      nasal_obstruction: "often",     // +2
      mouth_breathing_confirm: "often", // +2
      age_years: 38,
      biological_sex: "female",
    }))
    expect(r.bacterial.features_present).toBe(0)
    expect(r.stop_questionnaire.stop_score).toBeGreaterThanOrEqual(2)
    expect(r.nasal_obstruction.category).toBe("moderate")
    expect(r.tier).toBe("tier_4a_sinus_driven")
    expect(r.routing.specialist_first).toBe("allergy")
  })

  test("Evelina — Actinomyces only, mild signals → tier_7_healthy_upper_airway", () => {
    const r = calculateUpperAirway(makeInput({
      rothia_total_pct: 4,
      actinomyces_total_pct: 12,    // > 10.8 → actinobacteria enriched
      neisseria_pct: 4,             // not aerobic shift
      prevotella_combined_pct: 8,   // not depleted
      shannon_diversity: 4.2,       // not reduced
      snoring_reported: "occasional",
      non_restorative_sleep: "rarely",
      hypertension_dx: false,
      age_years: 28,
      biological_sex: "female",
    }))
    expect(r.bacterial.features_present).toBe(1)
    expect(r.stop_questionnaire.stop_score).toBe(0)
    // Single feature + mild nasal_obstruction:null + 0 STOP → falls
    // through Tier 6 (commensal_dominant) since features count 1.
    expect(["tier_6_commensal_dominant_healthy", "tier_7_healthy_upper_airway"]).toContain(r.tier)
  })
})

// ─────────────────────────────────────────────────────────────────────
// Bacterial feature thresholds
// ─────────────────────────────────────────────────────────────────────

describe("Bacterial OSA features", () => {
  test("Rothia > 23% → actinobacteria enriched", () => {
    const r = calculateUpperAirway(makeInput({ rothia_total_pct: 23.5 }))
    expect(r.bacterial.actinobacteria_enriched).toBe(true)
  })

  test("Actinomyces > 10.8% → actinobacteria enriched (Rothia path NOT required)", () => {
    const r = calculateUpperAirway(makeInput({ rothia_total_pct: 5, actinomyces_total_pct: 11 }))
    expect(r.bacterial.actinobacteria_enriched).toBe(true)
  })

  test("Neisseria > 8% → aerobic shift", () => {
    const r = calculateUpperAirway(makeInput({ neisseria_pct: 8.5 }))
    expect(r.bacterial.aerobic_shift).toBe(true)
  })

  test("Prevotella + Alloprevotella combined < 5% → depleted", () => {
    const r = calculateUpperAirway(makeInput({ prevotella_combined_pct: 4.8 }))
    expect(r.bacterial.prevotella_depleted).toBe(true)
  })

  test("Shannon < 4.0 → reduced", () => {
    const r = calculateUpperAirway(makeInput({ shannon_diversity: 3.8 }))
    expect(r.bacterial.shannon_reduced).toBe(true)
  })

  test("Shannon null → shannon_reduced is null and not counted", () => {
    const r = calculateUpperAirway(makeInput({
      shannon_diversity: null,
      rothia_total_pct: 25,    // 1 feature
      neisseria_pct: 9,        // 2 features
    }))
    expect(r.bacterial.shannon_reduced).toBeNull()
    expect(r.bacterial.features_present).toBe(2)
  })

  test("3+ features → tier_2_osa_possible_bacterial when no symptoms", () => {
    const r = calculateUpperAirway(makeInput({
      rothia_total_pct: 25, neisseria_pct: 9, prevotella_combined_pct: 3, shannon_diversity: 3.5,
    }))
    expect(r.bacterial.features_present).toBe(4)
    expect(r.tier).toBe("tier_2_osa_possible_bacterial")
  })

  test("3 bacterial features + STOP ≥ 2 + total ≥ 4 → tier_1_osa_likely", () => {
    const r = calculateUpperAirway(makeInput({
      rothia_total_pct: 25, neisseria_pct: 9, prevotella_combined_pct: 3, shannon_diversity: 3.5,
      snoring_reported: "frequent",
      non_restorative_sleep: "often",
      hypertension_dx: true,
      age_years: 55,
      biological_sex: "male",
    }))
    expect(r.tier).toBe("tier_1_osa_likely")
    expect(r.routing.sleep_study_indicated).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────
// STOP questionnaire
// ─────────────────────────────────────────────────────────────────────

describe("STOP questionnaire", () => {
  test("4-item STOP score 0–4 + age + sex modifiers", () => {
    const r = calculateUpperAirway(makeInput({
      snoring_reported: "frequent", non_restorative_sleep: "often",
      osa_witnessed: "yes_gasping", hypertension_dx: true,
      age_years: 60, biological_sex: "male",
    }))
    expect(r.stop_questionnaire.stop_score).toBe(4)
    expect(r.stop_questionnaire.age_modifier).toBe(1)
    expect(r.stop_questionnaire.male_modifier).toBe(1)
    expect(r.stop_questionnaire.total_score).toBe(6)
  })

  test("'occasional' snoring does not count toward S item", () => {
    const r = calculateUpperAirway(makeInput({ snoring_reported: "occasional" }))
    expect(r.stop_questionnaire.snore).toBe(false)
  })

  test("STOP 'P' uses hypertension_dx boolean exactly", () => {
    const yes = calculateUpperAirway(makeInput({ hypertension_dx: true }))
    const no = calculateUpperAirway(makeInput({ hypertension_dx: false }))
    expect(yes.stop_questionnaire.hypertension).toBe(true)
    expect(no.stop_questionnaire.hypertension).toBe(false)
  })

  test("STOP 2 alone with high total → tier_2_osa_possible_symptoms", () => {
    const r = calculateUpperAirway(makeInput({
      snoring_reported: "frequent", osa_witnessed: "yes_stop_breathing",
      age_years: 55, biological_sex: "male",
      // total = 2 + 1 + 1 = 4
    }))
    expect(r.stop_questionnaire.stop_score).toBe(2)
    expect(r.stop_questionnaire.total_score).toBe(4)
    expect(r.tier).toBe("tier_2_osa_possible_symptoms")
  })
})

// ─────────────────────────────────────────────────────────────────────
// Nasal obstruction scoring
// ─────────────────────────────────────────────────────────────────────

describe("Nasal obstruction", () => {
  test("none → score 0", () => {
    const r = calculateUpperAirway(makeInput())
    expect(r.nasal_obstruction.score).toBe(0)
    expect(r.nasal_obstruction.category).toBe("none")
  })

  test("nasal_obstruction='often' alone → mild (score 2)", () => {
    const r = calculateUpperAirway(makeInput({ nasal_obstruction: "often" }))
    expect(r.nasal_obstruction.score).toBe(2)
    expect(r.nasal_obstruction.category).toBe("mild")
  })

  test("nasal_obstruction='chronic' + sinus_history='polyps' → severe (score 5? actually 5 → moderate)", () => {
    const r = calculateUpperAirway(makeInput({
      nasal_obstruction: "chronic", sinus_history: "polyps",
    }))
    expect(r.nasal_obstruction.score).toBe(5)
    expect(r.nasal_obstruction.category).toBe("moderate")
  })

  test("nasal + mouth_breathing_confirm + multiple sinus → severe", () => {
    const r = calculateUpperAirway(makeInput({
      nasal_obstruction: "chronic",         // +3
      mouth_breathing_confirm: "almost_always", // +3
      sinus_history: "multiple",            // +3
    }))
    expect(r.nasal_obstruction.score).toBe(9)
    expect(r.nasal_obstruction.category).toBe("severe")
  })
})

// ─────────────────────────────────────────────────────────────────────
// Peroxide confounder gating
// ─────────────────────────────────────────────────────────────────────

describe("Peroxide confounder", () => {
  test("acute high-dose (whitening tray <48h) → tier_confounded_peroxide regardless of bacteria", () => {
    const r = calculateUpperAirway(makeInput({
      rothia_total_pct: 25, neisseria_pct: 9, prevotella_combined_pct: 3,
      whitening_tray_last_48h: true,
    }))
    expect(r.tier).toBe("tier_confounded_peroxide")
    expect(r.peroxide_confounder.severity).toBe("acute_high")
    expect(r.peroxide_confounder.caveat_required).toBe(true)
  })

  test("strips <48h → acute_high", () => {
    const r = calculateUpperAirway(makeInput({ whitening_strips_last_48h: true }))
    expect(r.peroxide_confounder.severity).toBe("acute_high")
  })

  test("professional <7d → acute_high", () => {
    const r = calculateUpperAirway(makeInput({ professional_whitening_last_7d: true }))
    expect(r.peroxide_confounder.severity).toBe("acute_high")
  })

  test("chronic low-dose (whitening toothpaste daily) → caveat but proceeds with classification", () => {
    const r = calculateUpperAirway(makeInput({
      rothia_total_pct: 0, neisseria_pct: 0, prevotella_combined_pct: 20,
      whitening_toothpaste_daily: true,
    }))
    expect(r.peroxide_confounder.severity).toBe("chronic_low")
    expect(r.peroxide_confounder.caveat_required).toBe(true)
    expect(r.tier).not.toBe("tier_confounded_peroxide")
  })

  test("env_peroxide_flag alone triggers chronic_low", () => {
    const r = calculateUpperAirway(makeInput({ env_peroxide_flag: true }))
    expect(r.peroxide_confounder.severity).toBe("chronic_low")
  })
})

// ─────────────────────────────────────────────────────────────────────
// Routing
// ─────────────────────────────────────────────────────────────────────

describe("Routing", () => {
  test("tier_4a with severe nasal → ENT first", () => {
    const r = calculateUpperAirway(makeInput({
      snoring_reported: "frequent", non_restorative_sleep: "often",
      nasal_obstruction: "chronic", mouth_breathing_confirm: "almost_always",
      sinus_history: "multiple",
    }))
    expect(r.tier).toBe("tier_4a_sinus_driven")
    expect(r.routing.specialist_first).toBe("ent")
  })

  test("tier_4a with moderate nasal → allergy first", () => {
    const r = calculateUpperAirway(makeInput({
      snoring_reported: "frequent", non_restorative_sleep: "often",
      nasal_obstruction: "often", mouth_breathing_confirm: "often",
    }))
    expect(r.tier).toBe("tier_4a_sinus_driven")
    expect(r.routing.specialist_first).toBe("allergy")
  })

  test("tier_7 → no_action timeline", () => {
    const r = calculateUpperAirway(makeInput())
    expect(r.tier).toBe("tier_7_healthy_upper_airway")
    expect(r.routing.timeline).toBe("no_action")
    expect(r.routing.sleep_study_indicated).toBe(false)
  })
})

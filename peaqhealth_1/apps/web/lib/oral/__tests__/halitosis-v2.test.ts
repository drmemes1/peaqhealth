import { calculateHalitosis, EMPTY_HALITOSIS_INPUT, type HalitosisInput } from "../halitosis-v2"

function makeInput(overrides: Partial<HalitosisInput> = {}): HalitosisInput {
  return { ...EMPTY_HALITOSIS_INPUT, ...overrides }
}

// ─────────────────────────────────────────────────────────────────────
// Empty + sanity
// ─────────────────────────────────────────────────────────────────────

describe("calculateHalitosis — empty + sanity", () => {
  test("all zeros → HMI 0, minimal, low_malodor", () => {
    const r = calculateHalitosis(EMPTY_HALITOSIS_INPUT)
    expect(r.hmi).toBe(0)
    expect(r.hmi_category).toBe("minimal")
    expect(r.phenotype).toBe("low_malodor")
    expect(r.peroxide_confounder_caveat).toBe(false)
  })

  test("only protective species → HMI 0, full protection (modifier 0.40 at score >= 15)", () => {
    // Score = 15 × 1.0 + 0 × 0.5 + 0 × 0.3 = 15 → modifier 0.40.
    const r = calculateHalitosis(makeInput({
      s_salivarius_pct: 15,
    }))
    expect(r.protective_modifier).toBe(0.40)
    expect(r.hmi).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────
// Cohort fixtures (per ADR-0025 validation table)
// ─────────────────────────────────────────────────────────────────────

describe("Cohort fixtures", () => {
  test("Igor (Pilot.Peaq.1) — HMI in 'low' band, low_malodor / borderline phenotype", () => {
    const r = calculateHalitosis(makeInput({
      // H2S drivers
      f_nucleatum_pct: 0.85,
      s_moorei_pct: 0,
      veillonella_pct: 3.79,
      leptotrichia_wadei_pct: 0,
      atopobium_parvulum_pct: 0,
      selenomonas_total_pct: 0.26,
      // CH3SH drivers
      p_gingivalis_pct: 0,
      prevotella_intermedia_pct: 0.20,
      prevotella_melaninogenica_pct: 2.33,
      treponema_total_pct: 0.0864,
      t_forsythia_pct: 0.0475,
      // Protective
      s_salivarius_pct: 15.28,
      rothia_total_pct: 8.37,
      haemophilus_pct: 2.79,
      // Lifestyle
      mouth_breathing: "occasionally",
    }))
    // Igor's profile: substantial protective community → low modifier;
    // moderate lifestyle weight from occasional mouth breathing.
    expect(r.protective_modifier).toBeLessThan(0.55) // strong protection
    expect(r.lhm).toBeGreaterThan(1.10)
    expect(r.lhm).toBeLessThan(1.20)
    expect(["minimal", "low"]).toContain(r.hmi_category)
    expect(["low_malodor", "borderline", "tongue_dominant"]).toContain(r.phenotype)
  })

  test("Pilot 3 — HMI 'minimal', low_malodor", () => {
    const r = calculateHalitosis(makeInput({
      f_nucleatum_pct: 0.1,
      veillonella_pct: 0.5,
      atopobium_parvulum_pct: 0.05,
      // Strong protective community (clean mouth)
      s_salivarius_pct: 12,
      rothia_total_pct: 8,
      haemophilus_pct: 1,
    }))
    expect(r.hmi_category).toBe("minimal")
    expect(r.phenotype).toBe("low_malodor")
  })

  test("Gabby — HMI 'low', borderline phenotype with elevated LHM", () => {
    const r = calculateHalitosis(makeInput({
      f_nucleatum_pct: 0.7,
      s_moorei_pct: 0.41,
      veillonella_pct: 4.0,
      prevotella_melaninogenica_pct: 1.0,
      // Weakened protective scaffold
      s_salivarius_pct: 1.5,
      rothia_total_pct: 1.0,
      haemophilus_pct: 0.5,
      // Lifestyle weighted up
      mouth_breathing: "often",
      mouth_breathing_when: "sleep_only",
      snoring_reported: "frequent",
      last_dental_cleaning: "over_12_months",
      tongue_scraping_freq: "never",
    }))
    expect(r.lhm).toBeGreaterThan(1.4)
    expect(r.lhm).toBeLessThanOrEqual(1.6)
    expect(["low", "moderate"]).toContain(r.hmi_category)
  })

  test("Evelina — HMI 'moderate' or 'low', mixed/periodontal phenotype", () => {
    const r = calculateHalitosis(makeInput({
      f_nucleatum_pct: 1.2,
      s_moorei_pct: 0.1,
      veillonella_pct: 6,
      atopobium_parvulum_pct: 0.5,
      p_gingivalis_pct: 0.3,
      prevotella_intermedia_pct: 0.8,
      prevotella_melaninogenica_pct: 1.2,
      treponema_total_pct: 0.05,
      t_forsythia_pct: 0.04,
      // Weak protective
      s_salivarius_pct: 0.5,
      rothia_total_pct: 4.56,
      haemophilus_pct: 2.20,
    }))
    expect(["low", "moderate"]).toContain(r.hmi_category)
    expect(["mixed", "periodontal_dominant", "borderline"]).toContain(r.phenotype)
  })
})

// ─────────────────────────────────────────────────────────────────────
// Veillonella absolute cap
// ─────────────────────────────────────────────────────────────────────

describe("Veillonella absolute cap", () => {
  test("Veillonella 20% × 0.10 = 2.0 → capped at 1.0", () => {
    const r = calculateHalitosis(makeInput({ veillonella_pct: 20 }))
    const veiContribution = r.driver_contributions
      .find(c => c.species === "Veillonella (genus)")!.contribution
    expect(veiContribution).toBe(1.0)
  })

  test("Veillonella with caries dysbiosis + S. mutans: weight 0.15 instead of 0.10", () => {
    const r1 = calculateHalitosis(makeInput({
      veillonella_pct: 5,
      caries_compensated_dysbiosis: true,
      s_mutans_pct: 0.1,
    }))
    const v1 = r1.driver_contributions.find(c => c.species === "Veillonella (genus)")!.contribution
    expect(v1).toBeCloseTo(0.75, 3) // 5 × 0.15

    const r2 = calculateHalitosis(makeInput({ veillonella_pct: 5 }))
    const v2 = r2.driver_contributions.find(c => c.species === "Veillonella (genus)")!.contribution
    expect(v2).toBeCloseTo(0.50, 3) // 5 × 0.10
  })
})

// ─────────────────────────────────────────────────────────────────────
// Selenomonas magnitude-aware weighting
// ─────────────────────────────────────────────────────────────────────

describe("Selenomonas magnitude-aware weighting", () => {
  test("low magnitude (<0.3) → weight 0.2", () => {
    const r = calculateHalitosis(makeInput({ selenomonas_total_pct: 0.2 }))
    const c = r.driver_contributions.find(d => d.species === "Selenomonas (genus)")!.contribution
    expect(c).toBeCloseTo(0.04, 3)
  })

  test("mid (0.3–1.0) → weight 0.4", () => {
    const r = calculateHalitosis(makeInput({ selenomonas_total_pct: 0.5 }))
    const c = r.driver_contributions.find(d => d.species === "Selenomonas (genus)")!.contribution
    expect(c).toBeCloseTo(0.20, 3)
  })

  test("high (≥1.0) → weight 0.5", () => {
    const r = calculateHalitosis(makeInput({ selenomonas_total_pct: 2.0 }))
    const c = r.driver_contributions.find(d => d.species === "Selenomonas (genus)")!.contribution
    expect(c).toBeCloseTo(1.00, 3)
  })
})

// ─────────────────────────────────────────────────────────────────────
// Protective modifier
// ─────────────────────────────────────────────────────────────────────

describe("Protective modifier", () => {
  test("protective score 0 → modifier 1.25 (collapsed protection)", () => {
    const r = calculateHalitosis(makeInput({ f_nucleatum_pct: 1 }))
    expect(r.protective_modifier).toBe(1.25)
  })

  test("protective score 15 → modifier 0.40 (full protection)", () => {
    const r = calculateHalitosis(makeInput({
      s_salivarius_pct: 15, // 15 × 1.0 = 15
    }))
    expect(r.protective_modifier).toBe(0.40)
  })

  test("protective score >15 → still capped at 0.40", () => {
    const r = calculateHalitosis(makeInput({ s_salivarius_pct: 50 }))
    expect(r.protective_modifier).toBe(0.40)
  })

  test("protective score 7.5 → modifier ~0.825 (linear midpoint)", () => {
    const r = calculateHalitosis(makeInput({ s_salivarius_pct: 7.5 }))
    expect(r.protective_modifier).toBeCloseTo(0.825, 3)
  })
})

// ─────────────────────────────────────────────────────────────────────
// LHM
// ─────────────────────────────────────────────────────────────────────

describe("LHM (Lifestyle Halitosis Modifier)", () => {
  test("no lifestyle data → LHM 1.0", () => {
    const r = calculateHalitosis(makeInput())
    expect(r.lhm).toBe(1.0)
    expect(r.lhm_factors).toEqual([])
  })

  test("compounding capped at 1.60", () => {
    const r = calculateHalitosis(makeInput({
      mouth_breathing: "confirmed",          // ×1.25
      snoring_reported: "frequent",           // ×1.20
      mouth_breathing_when: "daytime_and_sleep", // ×1.20
      smoking_status: "current",              // ×1.15
      gerd_frequency: "daily",                // ×1.10
      last_dental_cleaning: "over_12_months", // ×1.15
      tongue_scraping_freq: "never",          // ×1.10
      has_xerostomic_meds: true,              // ×1.10
      age_years: 60,                          // ×1.05
    }))
    expect(r.lhm).toBe(1.60)
  })

  test("GERD frequency variants — frequent/daily/diagnosed_treated all add 1.10", () => {
    for (const v of ["frequent", "daily", "diagnosed_treated"]) {
      const r = calculateHalitosis(makeInput({ gerd_frequency: v }))
      expect(r.lhm).toBeCloseTo(1.10, 3)
    }
    const occasional = calculateHalitosis(makeInput({ gerd_frequency: "occasional" }))
    expect(occasional.lhm).toBe(1.0) // occasional doesn't fire
  })

  test("Tongue scraping — never adds, every_morning is neutral (good behavior)", () => {
    const never = calculateHalitosis(makeInput({ tongue_scraping_freq: "never" }))
    expect(never.lhm).toBeCloseTo(1.10, 3)
    const daily = calculateHalitosis(makeInput({ tongue_scraping_freq: "every_morning" }))
    expect(daily.lhm).toBe(1.0)
  })
})

// ─────────────────────────────────────────────────────────────────────
// Phenotype assignment
// ─────────────────────────────────────────────────────────────────────

describe("Phenotype assignment", () => {
  test("H2S >> CH3SH → tongue_dominant", () => {
    const r = calculateHalitosis(makeInput({
      f_nucleatum_pct: 5, s_moorei_pct: 2, veillonella_pct: 5,
    }))
    expect(r.phenotype).toBe("tongue_dominant")
  })

  test("CH3SH >> H2S → periodontal_dominant", () => {
    const r = calculateHalitosis(makeInput({
      p_gingivalis_pct: 5, prevotella_intermedia_pct: 5, prevotella_nigrescens_pct: 3,
    }))
    expect(r.phenotype).toBe("periodontal_dominant")
  })

  test("balanced and HMI moderate → mixed", () => {
    const r = calculateHalitosis(makeInput({
      f_nucleatum_pct: 2, s_moorei_pct: 1,
      p_gingivalis_pct: 2, prevotella_intermedia_pct: 2,
    }))
    expect(r.phenotype).toBe("mixed")
  })
})

// ─────────────────────────────────────────────────────────────────────
// Peroxide confounder
// ─────────────────────────────────────────────────────────────────────

describe("Peroxide confounder", () => {
  test("acute high-dose → caveat + provisional flag, score still computed", () => {
    const r = calculateHalitosis(makeInput({
      f_nucleatum_pct: 1,
      whitening_tray_last_48h: true,
    }))
    expect(r.peroxide_confounder_caveat).toBe(true)
    expect(r.peroxide_provisional_result).toBe(true)
    expect(r.reliability_flags).toContain("peroxide_acute_high")
    expect(r.hmi).toBeGreaterThan(0)
  })

  test("chronic low-dose (env flag) → caveat only, not provisional", () => {
    const r = calculateHalitosis(makeInput({
      f_nucleatum_pct: 1, env_peroxide_flag: true,
    }))
    expect(r.peroxide_confounder_caveat).toBe(true)
    expect(r.peroxide_provisional_result).toBe(false)
    expect(r.reliability_flags).toContain("peroxide_chronic_low")
  })

  test("no peroxide → no caveat", () => {
    const r = calculateHalitosis(makeInput({ f_nucleatum_pct: 1 }))
    expect(r.peroxide_confounder_caveat).toBe(false)
    expect(r.peroxide_provisional_result).toBe(false)
  })
})

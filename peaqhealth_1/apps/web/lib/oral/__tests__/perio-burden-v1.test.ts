import {
  calculatePerioBurdenV1,
  EMPTY_PERIO_SPECIES,
  type PerioBurdenSpeciesAbundances,
  type PerioBurdenLifestyleConfounders,
} from "../perio-burden-v1"

const NO_LIFESTYLE: PerioBurdenLifestyleConfounders | null = null

function species(overrides: Partial<PerioBurdenSpeciesAbundances> = {}): PerioBurdenSpeciesAbundances {
  return { ...EMPTY_PERIO_SPECIES, ...overrides }
}

// ─────────────────────────────────────────────────────────────────────
// Patient fixtures
// ─────────────────────────────────────────────────────────────────────

describe("calculatePerioBurdenV1 — patient fixtures", () => {
  test("Igor (Pilot.Peaq.1) — past Arestin, borderline classification", () => {
    const igor: PerioBurdenSpeciesAbundances = {
      p_gingivalis: 0,
      t_forsythia: 0.0475,
      treponema_total: 0.0864,
      f_alocis: 0.0134,
      f_nucleatum: 2.6347,
      p_intermedia: 0,
      s_constellatus: 0,
      p_micra: 0,
      m_faucium: 0,
      fretibacterium: 0,
      treponema_hmt_237: 0,
      c_matruchotii: 0.6304,
      s_mitis_group: 0.4661,
      s_sanguinis: 1.9009,
      s_gordonii: 0.4126,
      rothia_total: 8.31,
      neisseria_total: 14.80,
      h_parainfluenzae: 2.79,
      a_naeslundii: 0.74,
      lautropia: 1.50,
    }

    const r = calculatePerioBurdenV1(igor, NO_LIFESTYLE)

    expect(r.perio_defense_index).toBeCloseTo(17.81, 1)
    expect(r.perio_defense_category).toBe("depleted")
    expect(r.commensal_depletion_factor).toBeGreaterThan(1.15)
    expect(r.commensal_depletion_factor).toBeLessThan(1.25)

    // No co-occurrence boosts (Pg = 0).
    expect(r.breakdown.fa_pg_co_occurrence_active).toBe(false)
    expect(r.breakdown.pg_td_co_occurrence_active).toBe(false)
    expect(r.breakdown.fn_bridging_boost_active).toBe(false)
    expect(r.breakdown.stacked_boost_factor).toBe(1.0)

    // Burden lands in moderate band → borderline composite (not stable, not active).
    expect(r.perio_burden_category).toBe("moderate")
    expect(r.perio_risk_category).toBe("borderline")

    // Red complex: trace-only T. forsythia + Treponema, no clinical threshold breach.
    expect(r.red_complex_status.status_label).toBe("below_clinical_threshold")
    expect(r.red_complex_status.detected_species).toEqual(
      expect.arrayContaining([expect.stringContaining("T. forsythia"), expect.stringContaining("Treponema")]),
    )
    expect(r.red_complex_status.any_above_clinical_threshold).toBe(false)
  })

  test("Evelina (Bristle) — compensated dysbiosis pattern", () => {
    const evelina: PerioBurdenSpeciesAbundances = {
      p_gingivalis: 0,
      t_forsythia: 0.04,
      treponema_total: 0,
      f_alocis: 0,
      f_nucleatum: 1.20,
      p_intermedia: 0,
      s_constellatus: 0.05,
      p_micra: 0.10,
      m_faucium: 0,
      fretibacterium: 0,
      treponema_hmt_237: 0,
      c_matruchotii: 0,
      s_mitis_group: 0.5,
      s_sanguinis: 0.02,
      s_gordonii: 0.03,
      rothia_total: 4.56,
      neisseria_total: 2.02,
      h_parainfluenzae: 2.20,
      a_naeslundii: 0.02,
      lautropia: 0,
    }

    const r = calculatePerioBurdenV1(evelina, NO_LIFESTYLE)

    expect(r.perio_defense_index).toBeCloseTo(4.95, 1)
    expect(r.perio_defense_category).toBe("severely_depleted")
    expect(r.commensal_depletion_factor).toBeCloseTo(1.42, 1)
    expect(r.perio_burden_index_adjusted).toBeCloseTo(0.99, 1)
    expect(r.perio_burden_category).toBe("low")
    // Low burden + severely depleted defense = the compensated dysbiosis pattern.
    expect(r.perio_risk_category).toBe("compensated_dysbiosis_risk")
    expect(r.red_complex_status.status_label).toBe("below_clinical_threshold")
  })
})

// ─────────────────────────────────────────────────────────────────────
// Boundary + invariant tests — computed exactly
// ─────────────────────────────────────────────────────────────────────

describe("insufficient_data + zero state", () => {
  test("all-zero inputs → insufficient_data, low confidence", () => {
    const r = calculatePerioBurdenV1(EMPTY_PERIO_SPECIES, NO_LIFESTYLE)
    expect(r.perio_risk_category).toBe("insufficient_data")
    expect(r.confidence).toBe("low")
    expect(r.perio_burden_index).toBe(0)
    expect(r.perio_defense_index).toBe(0)
    expect(r.total_subp_pct).toBe(0)
    expect(r.red_complex_status.status_label).toBe("not_detected")
    expect(r.red_complex_status.detected_species).toEqual([])
  })

  test("negative input throws", () => {
    expect(() =>
      calculatePerioBurdenV1(species({ p_gingivalis: -0.1 }), NO_LIFESTYLE),
    ).toThrow(/negative input/)
  })
})

describe("F. nucleatum bridging boost", () => {
  test("inactive when Pg < 0.5%", () => {
    const r = calculatePerioBurdenV1(
      species({ p_gingivalis: 0.4, f_nucleatum: 1.0 }),
      NO_LIFESTYLE,
    )
    expect(r.breakdown.fn_bridging_boost_active).toBe(false)
    // Tier 2 weighted by baseline 0.5 → 0.5; Tier 1 = 0.4
    expect(r.breakdown.tier2_pathogen_sum).toBeCloseTo(0.5, 5)
  })

  test("active when Pg >= 0.5%", () => {
    const r = calculatePerioBurdenV1(
      species({ p_gingivalis: 0.5, f_nucleatum: 1.0 }),
      NO_LIFESTYLE,
    )
    expect(r.breakdown.fn_bridging_boost_active).toBe(true)
    // Tier 2 weighted by bridging 0.8 → 0.8
    expect(r.breakdown.tier2_pathogen_sum).toBeCloseTo(0.8, 5)
  })
})

describe("co-occurrence boosts + stacked cap", () => {
  test("F. alocis × P. gingivalis boost activates at 0.1% threshold", () => {
    const r = calculatePerioBurdenV1(
      species({ p_gingivalis: 0.1, f_alocis: 0.1 }),
      NO_LIFESTYLE,
    )
    expect(r.breakdown.fa_pg_co_occurrence_active).toBe(true)
    expect(r.breakdown.stacked_boost_factor).toBe(1.2)
  })

  test("P. gingivalis × Treponema boost activates at 0.1% threshold", () => {
    const r = calculatePerioBurdenV1(
      species({ p_gingivalis: 0.1, treponema_total: 0.1 }),
      NO_LIFESTYLE,
    )
    expect(r.breakdown.pg_td_co_occurrence_active).toBe(true)
    expect(r.breakdown.stacked_boost_factor).toBe(1.2)
  })

  test("both co-occurrences active → stacked boost capped at 1.3 (not 1.44)", () => {
    const r = calculatePerioBurdenV1(
      species({ p_gingivalis: 0.2, f_alocis: 0.2, treponema_total: 0.2 }),
      NO_LIFESTYLE,
    )
    expect(r.breakdown.fa_pg_co_occurrence_active).toBe(true)
    expect(r.breakdown.pg_td_co_occurrence_active).toBe(true)
    expect(r.breakdown.stacked_boost_factor).toBe(1.3)
  })

  test("no boost when only one species crosses threshold", () => {
    const r = calculatePerioBurdenV1(
      species({ p_gingivalis: 0.5, f_alocis: 0.05 }),
      NO_LIFESTYLE,
    )
    expect(r.breakdown.fa_pg_co_occurrence_active).toBe(false)
    expect(r.breakdown.pg_td_co_occurrence_active).toBe(false)
    expect(r.breakdown.stacked_boost_factor).toBe(1.0)
  })
})

describe("Commensal Depletion Modifier", () => {
  test("PDI at baseline (30) → factor 1.0", () => {
    const r = calculatePerioBurdenV1(
      species({ rothia_total: 60 }), // 60 × 0.5 = 30 PDI
      NO_LIFESTYLE,
    )
    expect(r.perio_defense_index).toBeCloseTo(30, 5)
    expect(r.commensal_depletion_factor).toBeCloseTo(1.0, 5)
  })

  test("PDI = 0 → factor capped at 1.5", () => {
    const r = calculatePerioBurdenV1(species({ p_gingivalis: 1.0 }), NO_LIFESTYLE)
    expect(r.perio_defense_index).toBe(0)
    expect(r.commensal_depletion_factor).toBeCloseTo(1.5, 5)
  })

  test("CDM contribution surfaced separately in breakdown", () => {
    const r = calculatePerioBurdenV1(
      species({ p_gingivalis: 1.0 }),
      NO_LIFESTYLE,
    )
    // pbiPreCdm = 1.0; adjusted = 1.5; contribution = 0.5
    expect(r.breakdown.pbi_pre_cdm).toBeCloseTo(1.0, 5)
    expect(r.breakdown.cdm_contribution).toBeCloseTo(0.5, 5)
    expect(r.cdm_amplification_pct).toBeCloseTo(50, 5)
  })

  test("PDI > baseline → factor stays at 1.0 (no shrinking)", () => {
    const r = calculatePerioBurdenV1(species({ rothia_total: 100 }), NO_LIFESTYLE)
    expect(r.commensal_depletion_factor).toBe(1.0)
  })
})

describe("PBI category boundaries", () => {
  // Use a clean Tier-1-only signal so boost factor is 1.0 and CDM is 1.5
  // (PDI = 0). PBI_adjusted = (Pg × 1.0) × 1.5.
  test("boundary: PBI_adjusted ~0.49 → minimal", () => {
    // Pg = 0.32 → preCdm 0.32 × CDM 1.5 = 0.48
    const r = calculatePerioBurdenV1(species({ p_gingivalis: 0.32 }), NO_LIFESTYLE)
    expect(r.perio_burden_index_adjusted).toBeLessThan(0.5)
    expect(r.perio_burden_category).toBe("minimal")
  })

  test("low band 0.5–1.5 → diagnostic uncertainty zone flag", () => {
    // Pg = 0.5 → 0.5 × 1.5 = 0.75 → low band
    const r = calculatePerioBurdenV1(species({ p_gingivalis: 0.5 }), NO_LIFESTYLE)
    expect(r.perio_burden_category).toBe("low")
    expect(r.diagnostic_uncertainty_zone).toBe(true)
  })

  test("≥ 6.0 → severe", () => {
    const r = calculatePerioBurdenV1(species({ p_gingivalis: 5 }), NO_LIFESTYLE)
    expect(r.perio_burden_index_adjusted).toBeGreaterThanOrEqual(6.0)
    expect(r.perio_burden_category).toBe("severe")
  })
})

describe("composite risk classification", () => {
  test("active disease — high burden + severely depleted defense", () => {
    const r = calculatePerioBurdenV1(species({ p_gingivalis: 4.0 }), NO_LIFESTYLE)
    expect(r.perio_burden_category).toBe("severe")
    expect(r.perio_defense_category).toBe("severely_depleted")
    expect(r.perio_risk_category).toBe("active_disease_risk")
  })

  test("compensated active burden — high burden + adequate defense", () => {
    const r = calculatePerioBurdenV1(
      species({ p_gingivalis: 4.0, rothia_total: 60 }),
      NO_LIFESTYLE,
    )
    // Pg=4 with CDM=1.0 (PDI=30) lands in 'high' band; either high or
    // severe still classifies as burdenHigh for composite purposes.
    expect(["high", "severe"]).toContain(r.perio_burden_category)
    // PDI = 60 × 0.5 = 30, exactly at adequate/robust boundary → adequate.
    expect(["adequate", "robust"]).toContain(r.perio_defense_category)
    expect(r.perio_risk_category).toBe("compensated_active_burden")
  })

  test("compensated dysbiosis — minimal burden + depleted defense", () => {
    const r = calculatePerioBurdenV1(species({ rothia_total: 30 }), NO_LIFESTYLE)
    // PDI = 15 (depleted)
    expect(r.perio_burden_category).toBe("minimal")
    expect(r.perio_defense_category).toBe("depleted")
    expect(r.perio_risk_category).toBe("compensated_dysbiosis_risk")
  })

  test("stable low risk — minimal burden + robust defense", () => {
    const r = calculatePerioBurdenV1(species({ rothia_total: 80 }), NO_LIFESTYLE)
    expect(r.perio_burden_category).toBe("minimal")
    expect(r.perio_defense_category).toBe("robust")
    expect(r.perio_risk_category).toBe("stable_low_risk")
  })

  test("borderline — moderate burden", () => {
    const r = calculatePerioBurdenV1(species({ p_gingivalis: 1.5 }), NO_LIFESTYLE)
    // 1.5 × CDM 1.5 = 2.25 → moderate
    expect(r.perio_burden_category).toBe("moderate")
    expect(r.perio_risk_category).toBe("borderline")
  })
})

describe("red complex status", () => {
  test("not_detected when all <0.01%", () => {
    const r = calculatePerioBurdenV1(
      species({ p_gingivalis: 0.005, t_forsythia: 0.005 }),
      NO_LIFESTYLE,
    )
    expect(r.red_complex_status.status_label).toBe("not_detected")
    expect(r.red_complex_status.detected_species).toEqual([])
  })

  test("below_clinical_threshold when any in 0.01–0.5%", () => {
    const r = calculatePerioBurdenV1(species({ t_forsythia: 0.05 }), NO_LIFESTYLE)
    expect(r.red_complex_status.status_label).toBe("below_clinical_threshold")
    expect(r.red_complex_status.detected_species[0]).toMatch(/T\. forsythia.*trace/)
  })

  test("detected when any >= 0.5%", () => {
    const r = calculatePerioBurdenV1(
      species({ p_gingivalis: 1.0 }),
      NO_LIFESTYLE,
    )
    expect(r.red_complex_status.status_label).toBe("detected")
    expect(r.red_complex_status.any_above_clinical_threshold).toBe(true)
    // No "(trace)" suffix above the clinical threshold.
    expect(r.red_complex_status.detected_species[0]).toBe("P. gingivalis")
  })
})

describe("S. mitis group hyphenation handling", () => {
  // The hyphenation rule lives at the parser layer (callers sum
  // mitis-pneumoniae-oralis hyphenated calls into s_mitis_group before
  // passing into the algorithm). Here we just verify that whatever the
  // caller summed in is weighted at 1.0 in PDI Tier 1.
  test("hyphenated mitis-pneumoniae call summed into s_mitis_group contributes 1.0×", () => {
    const r = calculatePerioBurdenV1(species({ s_mitis_group: 2.0 }), NO_LIFESTYLE)
    expect(r.breakdown.defense_tier1_sum).toBeCloseTo(2.0, 5)
    expect(r.perio_defense_index).toBeCloseTo(2.0, 5)
  })
})

describe("cross-panel hooks", () => {
  test("activate when burden category is high or severe", () => {
    const r = calculatePerioBurdenV1(species({ p_gingivalis: 4.0 }), NO_LIFESTYLE)
    expect(r.cross_panel_hooks.cardiovascular_pattern_pending).toBe(true)
    expect(r.cross_panel_hooks.neurodegenerative_pattern_pending).toBe(true)
  })

  test("inactive when burden is minimal/low", () => {
    const r = calculatePerioBurdenV1(species({ rothia_total: 80 }), NO_LIFESTYLE)
    expect(r.cross_panel_hooks.cardiovascular_pattern_pending).toBe(false)
    expect(r.cross_panel_hooks.neurodegenerative_pattern_pending).toBe(false)
  })
})

describe("confounders", () => {
  test("active smoking → reliability flag + adjustment narrative", () => {
    const r = calculatePerioBurdenV1(species({ p_gingivalis: 1 }), {
      smoking_status: "current",
      mouthwash_type: null,
      chlorhexidine_use: null,
      age_range: null,
    })
    expect(r.reliability_flags).toContain("active_smoking")
    expect(r.confounder_adjustments.smoking).toMatch(/strongest behavioral risk/i)
  })

  test("former smoking → narrative without reliability flag", () => {
    const r = calculatePerioBurdenV1(species({ p_gingivalis: 1 }), {
      smoking_status: "former",
      mouthwash_type: null,
      chlorhexidine_use: null,
      age_range: null,
    })
    expect(r.reliability_flags).not.toContain("active_smoking")
    expect(r.confounder_adjustments.smoking).toMatch(/Former smoking/i)
  })

  test("currently using chlorhexidine → reliability flag + low confidence", () => {
    const r = calculatePerioBurdenV1(species({ p_gingivalis: 1, rothia_total: 30 }), {
      smoking_status: null,
      mouthwash_type: null,
      chlorhexidine_use: "currently_using",
      age_range: null,
    })
    expect(r.reliability_flags).toContain("chlorhexidine_active")
    expect(r.confidence).toBe("low")
  })

  test("antiseptic mouthwash → adjustment narrative", () => {
    const r = calculatePerioBurdenV1(species({ p_gingivalis: 1 }), {
      smoking_status: null,
      mouthwash_type: "antiseptic",
      chlorhexidine_use: null,
      age_range: null,
    })
    expect(r.confounder_adjustments.mouthwash).toMatch(/antiseptic mouthwash/i)
  })
})

describe("narrative augmentations", () => {
  test("diagnostic uncertainty narrative fires when in 0.5–1.5 zone", () => {
    const r = calculatePerioBurdenV1(species({ p_gingivalis: 0.5 }), NO_LIFESTYLE)
    expect(r.diagnostic_uncertainty_zone).toBe(true)
    expect(r.narrative_augmentations.some(n => n.includes("Lee 2026"))).toBe(true)
  })

  test("Pg × Td synergy narrative fires when both elevated", () => {
    const r = calculatePerioBurdenV1(
      species({ p_gingivalis: 0.5, treponema_total: 0.5 }),
      NO_LIFESTYLE,
    )
    expect(r.narrative_augmentations.some(n => n.includes("red complex synergy"))).toBe(true)
  })

  test("Fa × Pg coculture narrative fires when both elevated", () => {
    const r = calculatePerioBurdenV1(
      species({ p_gingivalis: 0.5, f_alocis: 0.5 }),
      NO_LIFESTYLE,
    )
    expect(r.narrative_augmentations.some(n => n.includes("Aruni 2011"))).toBe(true)
  })
})

describe("confidence", () => {
  test("low when total signal < 5", () => {
    const r = calculatePerioBurdenV1(species({ p_gingivalis: 1 }), NO_LIFESTYLE)
    expect(r.confidence).toBe("low")
  })

  test("high when total signal > 30 and no flags / no uncertainty zone", () => {
    const r = calculatePerioBurdenV1(species({ rothia_total: 70 }), NO_LIFESTYLE)
    expect(r.perio_defense_index).toBeCloseTo(35, 5)
    expect(r.confidence).toBe("high")
  })

  test("moderate in diagnostic uncertainty zone", () => {
    // Pg 0.5 × CDM 1.5 = 0.75 (low band, signal > 5 with defense)
    const r = calculatePerioBurdenV1(
      species({ p_gingivalis: 0.5, rothia_total: 30 }),
      NO_LIFESTYLE,
    )
    expect(r.diagnostic_uncertainty_zone).toBe(true)
    expect(r.confidence).toBe("moderate")
  })
})

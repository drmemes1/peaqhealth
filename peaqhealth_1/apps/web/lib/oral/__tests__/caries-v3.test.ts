/**
 * Caries v3 contract tests.
 *
 * Several fixture fields below — B. dentium, S. sputigena, S. cristatus, the
 * Rothia species split, etc. — are zeroed because the upload parser does not
 * yet extract them into oral_kit_orders. PR-α (parser/schema) will populate
 * those columns. These tests serve as the contract for what PR-α must
 * deliver: the same pilot samples should still classify the same way after
 * the parser starts feeding the new species.
 */

import {
  calculateCariesV3,
  ZERO_SPECIES,
  ZERO_LIFESTYLE,
  type SpeciesAbundances,
  type LifestyleConfounders,
} from "../caries-v3"

const species = (over: Partial<SpeciesAbundances>): SpeciesAbundances => ({ ...ZERO_SPECIES, ...over })
const lifestyle = (over: Partial<LifestyleConfounders>): LifestyleConfounders => ({ ...ZERO_LIFESTYLE, ...over })

describe("caries v3 — pilot fixtures", () => {
  test("Pilot 1 (Igor) — compensated_active_risk", () => {
    // Known clinical correlation: E2/D1 lesions present.
    const r = calculateCariesV3(
      species({
        s_mutans: 0.27,
        s_sobrinus: 0.24,
        s_sanguinis: 4.49,
        s_gordonii: 0.41,
      }),
      null,
    )
    expect(r.synergyActiveFlag).toBe(true) // 0.27 ≥ 0.05
    expect(r.commensalSufficiencyCategory).toBe("robust") // adsPrimary ≈ 4.90, ≥ 2.0
    expect(r.cariogenicLoadCategory).toBe("elevated") // CLI ≈ 0.51, in 0.5–1.5
    expect(r.compensatedDysbiosisFlag).toBe(false)
    expect(r.cariesRiskCategory).toBe("compensated_active_risk")
  })

  test("Pilot 2 (Gabby) — low_risk_stable", () => {
    // Known clinical correlation: history of caries, all treated, currently stable.
    const r = calculateCariesV3(
      species({
        s_mutans: 0.035,
        s_sanguinis: 5.46,
        s_gordonii: 0.028,
      }),
      null,
    )
    expect(r.synergyActiveFlag).toBe(false) // 0.035 < 0.05
    expect(r.commensalSufficiencyCategory).toBe("robust") // adsPrimary ≈ 5.49
    expect(r.cariogenicLoadCategory).toBe("minimal") // CLI = 0.035
    expect(r.compensatedDysbiosisFlag).toBe(false)
    expect(r.cariesRiskCategory).toBe("low_risk_stable")
  })

  test("Pilot 3 (Evelina) — compensated_dysbiosis_risk", () => {
    // Bristle-transcribed sample: pathogens not yet bloomed but commensals depleted.
    const r = calculateCariesV3(
      species({
        s_mutans: 0.02,
        s_sanguinis: 0.02,
        s_gordonii: 0.03,
        veillonella_total: 16.4,
      }),
      null,
    )
    expect(r.synergyActiveFlag).toBe(false)
    expect(r.commensalSufficiencyCategory).toBe("severely_depleted") // adsPrimary ≈ 0.05, < 0.1
    expect(r.cariogenicLoadCategory).toBe("minimal") // CLI = 0.02 — Veillonella excluded from CLI
    expect(r.compensatedDysbiosisFlag).toBe(true)
    expect(r.cariesRiskCategory).toBe("compensated_dysbiosis_risk")
  })
})

describe("caries v3 — synergy threshold edge cases", () => {
  test("S. mutans exactly at 0.05% activates synergy", () => {
    const r = calculateCariesV3(species({ s_mutans: 0.05 }), null)
    expect(r.synergyActiveFlag).toBe(true)
  })

  test("S. mutans at 0.049% does not activate synergy", () => {
    const r = calculateCariesV3(species({ s_mutans: 0.049 }), null)
    expect(r.synergyActiveFlag).toBe(false)
  })

  test("synergy gates S. sputigena and P. denticola contributions", () => {
    const below = calculateCariesV3(
      species({ s_mutans: 0.04, s_sputigena: 1.0, p_denticola: 1.0 }),
      null,
    )
    const above = calculateCariesV3(
      species({ s_mutans: 0.05, s_sputigena: 1.0, p_denticola: 1.0 }),
      null,
    )
    // Above threshold the conditional weights add to acidSum / CLI; below they don't.
    expect(above.cariogenicLoadIndex).toBeGreaterThan(below.cariogenicLoadIndex)
    expect(above.breakdown.synergistContribution).toBeGreaterThan(below.breakdown.synergistContribution)
  })

  test("Veillonella weighting scales with S. mutans co-presence", () => {
    const without = calculateCariesV3(
      species({ s_mutans: 0.0, veillonella_total: 10 }),
      null,
    )
    const with_ = calculateCariesV3(
      species({ s_mutans: 0.1, veillonella_total: 10 }),
      null,
    )
    // With S. mutans co-presence, Veillonella weight goes from 0.05 to 0.30 — 6× more contribution.
    expect(with_.breakdown.veillonellaContribution).toBeGreaterThan(without.breakdown.veillonellaContribution)
    expect(with_.breakdown.veillonellaContribution).toBeCloseTo(3.0, 5) // 10 × 0.3
    expect(without.breakdown.veillonellaContribution).toBeCloseTo(0.5, 5) // 10 × 0.05
  })
})

describe("caries v3 — confounder adjustments", () => {
  // Use the Igor profile for confounder tests so we exercise an
  // active-risk path; confounders should add narrative without changing
  // the underlying scores.
  const igor = species({ s_mutans: 0.27, s_sobrinus: 0.24, s_sanguinis: 4.49, s_gordonii: 0.41 })

  test("antibiotics in past 30 days surfaces a reliability flag and adjustment", () => {
    const r = calculateCariesV3(igor, lifestyle({ antibiotics_window: "past_30" }))
    expect(r.reliabilityFlags).toContain("antibiotic_disruption")
    expect(r.confounderAdjustments.antibiotics).toMatch(/recovery window/i)
  })

  test("chlorhexidine_use=currently_using flags chlorhexidine_active", () => {
    const r = calculateCariesV3(igor, lifestyle({ chlorhexidine_use: "currently_using" }))
    expect(r.reliabilityFlags).toContain("chlorhexidine_active")
    expect(r.confounderAdjustments.chlorhexidine).toMatch(/Chlorhexidine/)
  })

  test("medication_ppi=true adds the PPI adjustment", () => {
    const r = calculateCariesV3(igor, lifestyle({ medication_ppi: true }))
    expect(r.confounderAdjustments.ppi).toMatch(/PPI/)
  })

  test("GERD without PPI adds the acid-tolerant-selection adjustment", () => {
    const r = calculateCariesV3(igor, lifestyle({ gerd: true, medication_ppi: false }))
    expect(r.confounderAdjustments.gerd).toMatch(/Veillonella/)
  })

  test("GERD with PPI is covered by the PPI adjustment, not the GERD one", () => {
    const r = calculateCariesV3(igor, lifestyle({ gerd: true, medication_ppi: true }))
    expect(r.confounderAdjustments.gerd).toBeUndefined()
    expect(r.confounderAdjustments.ppi).toMatch(/PPI/)
  })

  test("xerostomia frequent flags reliability", () => {
    const r = calculateCariesV3(igor, lifestyle({ xerostomia_self_report: "frequent" }))
    expect(r.reliabilityFlags).toContain("xerostomia")
    expect(r.confounderAdjustments.xerostomia).toMatch(/salivary flow/i)
  })

  test("daily sugar + elevated CLI surfaces the diet-bacteria-loop adjustment", () => {
    // Igor has CLI elevated; daily sugar should attach the loop framing.
    const r = calculateCariesV3(igor, lifestyle({ sugar_intake: "daily" }))
    expect(r.confounderAdjustments.sugar).toMatch(/diet-bacteria loop/)
  })

  test("daily sugar + compensated dysbiosis surfaces the no-recovery framing", () => {
    const evelina = species({ s_mutans: 0.02, s_sanguinis: 0.02, s_gordonii: 0.03, veillonella_total: 16.4 })
    const r = calculateCariesV3(evelina, lifestyle({ sugar_intake: "multiple_daily" }))
    expect(r.compensatedDysbiosisFlag).toBe(true)
    expect(r.confounderAdjustments.sugar).toMatch(/depleted buffer/)
  })

  test("smoking=current adds the buffering depletion adjustment", () => {
    const r = calculateCariesV3(igor, lifestyle({ smoking_status: "current" }))
    expect(r.confounderAdjustments.smoking).toMatch(/nitrate-reducers/)
  })

  test("confounders never change the underlying scores", () => {
    const baseline = calculateCariesV3(igor, null)
    const noisy = calculateCariesV3(
      igor,
      lifestyle({
        smoking_status: "current",
        medication_ppi: true,
        antibiotics_window: "past_30",
        chlorhexidine_use: "currently_using",
        xerostomia_self_report: "constant",
        sugar_intake: "multiple_daily",
        gerd: true,
      }),
    )
    expect(noisy.phBalanceApi).toBe(baseline.phBalanceApi)
    expect(noisy.cariogenicLoadIndex).toBe(baseline.cariogenicLoadIndex)
    expect(noisy.commensalSufficiencyIndex).toBe(baseline.commensalSufficiencyIndex)
    expect(noisy.cariesRiskCategory).toBe(baseline.cariesRiskCategory)
  })
})

describe("caries v3 — sanity & invariants", () => {
  test("zero input yields well-buffered (numerically) but low confidence", () => {
    const r = calculateCariesV3(ZERO_SPECIES, null)
    expect(r.phBalanceApi).toBe(0) // 0 / (0 + 0 + 0.001) === 0
    expect(r.cariogenicLoadIndex).toBe(0)
    expect(r.commensalSufficiencyCategory).toBe("severely_depleted")
    expect(r.confidence).toBe("low") // totalInput < 5
  })

  test("S. mitis is explicitly NOT counted in CSI (Price 1986)", () => {
    const high_mitis = calculateCariesV3(species({ s_mitis: 50 }), null)
    expect(high_mitis.adsPrimaryPct).toBe(0)
    expect(high_mitis.adsExtendedPct).toBe(0)
    expect(high_mitis.commensalSufficiencyCategory).toBe("severely_depleted")
  })

  test("Veillonella is NOT in the buffer sum", () => {
    const r = calculateCariesV3(species({ veillonella_total: 50 }), null)
    expect(r.breakdown.bufferSum).toBe(0)
  })

  test("active_disease_risk: high CLI + depleted CSI", () => {
    const r = calculateCariesV3(
      species({
        s_mutans: 1.5,
        s_sobrinus: 0.5,
        // No commensals
      }),
      null,
    )
    expect(r.cariogenicLoadCategory).toBe("high") // CLI ≥ 1.5
    expect(r.commensalSufficiencyCategory).toBe("severely_depleted")
    expect(r.cariesRiskCategory).toBe("active_disease_risk")
  })
})

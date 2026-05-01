/**
 * NR-α tests — pilot fixtures + confounders + edge cases.
 *
 * The four pilot fixtures match the categorical outcomes called out in
 * ADR-0019. Where the expected `noSignature` value in the ADR is given as
 * an approximation, the assertion below uses `toBeCloseTo` against the
 * value that actually falls out of the formula given the fixture inputs;
 * the *category* assertion is what matters for the architectural decision.
 */

import {
  ZERO_NR_LIFESTYLE,
  ZERO_NR_SPECIES,
  calculateNRV1,
  type NRLifestyleConfounders,
  type NRSpeciesAbundances,
} from "../nr-v1"

const species = (over: Partial<NRSpeciesAbundances>): NRSpeciesAbundances => ({
  ...ZERO_NR_SPECIES,
  ...over,
})

const lifestyle = (over: Partial<NRLifestyleConfounders>): NRLifestyleConfounders => ({
  ...ZERO_NR_LIFESTYLE,
  ...over,
})

// ── Pilot fixtures ──────────────────────────────────────────────────────────

describe("NR-v1 — pilot fixtures (ADR-0019 validation cases)", () => {
  test("Pilot 3 — optimal: strong Tier 1 + favorable Vanhatalo signature", () => {
    const r = calculateNRV1(
      species({
        rothia_mucilaginosa: 9,
        neisseria_mucosa: 14,
        veillonella_total: 3,
        // signature inputs (genus totals)
        rothia_total: 9,
        neisseria_total: 14,
        prevotella_total: 5,
      }),
      null,
    )
    // (9 + 14) / (3 + 5) = 2.875 → "favorable"
    expect(r.noSignature).toBeCloseTo(2.875, 4)
    expect(r.noSignatureCategory).toBe("favorable")
    // tier1Sum 23 × 2 = 46; tier3Sum 3 × 0.4 = 1.2; capacity 47.2 → "robust"
    expect(r.nrCapacityIndex).toBeCloseTo(47.2, 4)
    expect(r.nrCapacityCategory).toBe("robust")
    expect(r.nrRiskCategory).toBe("optimal")
    expect(r.nrParadoxFlag).toBe(false)
  })

  test("Pilot 1 (Igor) — optimal: strong NR despite caries pressure", () => {
    const r = calculateNRV1(
      species({
        // Tier 1 — Igor's resolved species + mucilaginosa from raw entries
        rothia_mucilaginosa: 7.4,
        rothia_dentocariosa: 0.84,
        rothia_aeria: 0.14,
        neisseria_mucosa: 14.8,
        actinomyces_odontolyticus: 3.81,
        // Tier 2
        a_naeslundii: 0.9,
        h_parainfluenzae: 2.79,
        // Tier 3
        veillonella_total: 4.29,
        actinomyces_other: 1.77,
        // Signature
        rothia_total: 8.38,
        neisseria_total: 14.8,
        prevotella_total: 7,
      }),
      null,
    )
    // (8.38 + 14.8) / (4.29 + 7) = 2.053 → "favorable"
    expect(r.noSignature).toBeCloseTo(2.053, 2)
    expect(r.noSignatureCategory).toBe("favorable")
    expect(r.nrCapacityCategory === "robust" || r.nrCapacityCategory === "exceptional").toBe(true)
    expect(r.nrRiskCategory).toBe("optimal")
    expect(r.nrParadoxFlag).toBe(false)
  })

  test("Pilot 2 (Gabby) — composition_constrained: modest biomass, unfavorable composition", () => {
    const r = calculateNRV1(
      species({
        rothia_mucilaginosa: 1.5,
        neisseria_mucosa: 5.8,
        veillonella_total: 7.9,
        rothia_total: 1.5,
        neisseria_total: 5.8,
        prevotella_total: 18.4,
      }),
      null,
    )
    // (1.5 + 5.8) / (7.9 + 18.4) = 7.3 / 26.3 ≈ 0.2776 → "unfavorable"
    expect(r.noSignature).toBeCloseTo(0.2776, 3)
    expect(r.noSignatureCategory).toBe("unfavorable")
    // tier1Sum 7.3 × 2 = 14.6; tier3Sum 7.9 × 0.4 = 3.16; capacity 17.76 → "moderate"
    expect(r.nrCapacityIndex).toBeCloseTo(17.76, 2)
    expect(r.nrCapacityCategory).toBe("moderate")
    expect(r.nrRiskCategory).toBe("composition_constrained")
    expect(r.nrParadoxFlag).toBe(true)
  })

  test("Evelina (Bristle) — composition_constrained: paradox at moderate capacity, Prevotella-dominant", () => {
    const r = calculateNRV1(
      species({
        rothia_mucilaginosa: 4.5,
        neisseria_mucosa: 2.0,
        veillonella_total: 16.4,
        rothia_total: 4.5,
        neisseria_total: 2.0,
        prevotella_total: 50.6,
      }),
      null,
    )
    // (4.5 + 2.0) / (16.4 + 50.6) = 6.5 / 67 ≈ 0.0970 → "strongly_unfavorable"
    expect(r.noSignature).toBeCloseTo(0.097, 3)
    expect(r.noSignatureCategory).toBe("strongly_unfavorable")
    // tier1Sum 6.5 × 2 = 13; tier3Sum 16.4 × 0.4 = 6.56; capacity 19.56 → "moderate"
    expect(r.nrCapacityIndex).toBeCloseTo(19.56, 2)
    expect(r.nrCapacityCategory).toBe("moderate")
    expect(r.nrRiskCategory).toBe("composition_constrained")
    expect(r.nrParadoxFlag).toBe(true)
  })
})

// ── Confounders ─────────────────────────────────────────────────────────────

describe("NR-v1 — confounder adjustments (do not alter scores; populate guidance)", () => {
  // A baseline-positive species fixture so confounder runs aren't dominated by
  // the totalInput < 5 → "low confidence" branch.
  const baseline = species({
    rothia_mucilaginosa: 5,
    neisseria_mucosa: 10,
    rothia_total: 5,
    neisseria_total: 10,
    veillonella_total: 2,
    prevotella_total: 3,
  })

  test("chlorhexidine_use=currently_using → flag + chlorhexidine adjustment", () => {
    const r = calculateNRV1(baseline, lifestyle({ chlorhexidine_use: "currently_using" }))
    expect(r.reliabilityFlags).toContain("chlorhexidine_active")
    expect(r.confounderAdjustments.chlorhexidine).toMatch(/Chlorhexidine/i)
    expect(r.confidence).toBe("low")
  })

  test("chlorhexidine_use=past_8wks → recovery flag + adjustment", () => {
    const r = calculateNRV1(baseline, lifestyle({ chlorhexidine_use: "past_8wks" }))
    expect(r.reliabilityFlags).toContain("chlorhexidine_recovery")
    expect(r.confounderAdjustments.chlorhexidine).toMatch(/recovery may be incomplete/i)
  })

  test("mouthwash_type=antiseptic → mouthwash adjustment", () => {
    const r = calculateNRV1(baseline, lifestyle({ mouthwash_type: "antiseptic" }))
    expect(r.confounderAdjustments.mouthwash).toMatch(/Antiseptic mouthwash/i)
  })

  test("smoking_status=current → smoking adjustment", () => {
    const r = calculateNRV1(baseline, lifestyle({ smoking_status: "current" }))
    expect(r.confounderAdjustments.smoking).toMatch(/smoking depletes/i)
  })

  test("medication_ppi=true → ppi adjustment", () => {
    const r = calculateNRV1(baseline, lifestyle({ medication_ppi: true }))
    expect(r.confounderAdjustments.ppi).toMatch(/PPI/)
  })

  test("dietary_nitrate_frequency=rarely → dietary_nitrate adjustment", () => {
    const r = calculateNRV1(baseline, lifestyle({ dietary_nitrate_frequency: "rarely" }))
    expect(r.confounderAdjustments.dietary_nitrate).toMatch(/Low dietary nitrate/i)
  })

  test("dietary_nitrate_frequency=few_times_month → dietary_nitrate adjustment", () => {
    const r = calculateNRV1(baseline, lifestyle({ dietary_nitrate_frequency: "few_times_month" }))
    expect(r.confounderAdjustments.dietary_nitrate).toMatch(/Low dietary nitrate/i)
  })

  test("dietary_nitrate_frequency=several_weekly → no dietary_nitrate adjustment", () => {
    const r = calculateNRV1(baseline, lifestyle({ dietary_nitrate_frequency: "several_weekly" }))
    expect(r.confounderAdjustments.dietary_nitrate).toBeUndefined()
  })

  test("tongue_scraping_freq=every_morning → tongue_scraping adjustment", () => {
    const r = calculateNRV1(baseline, lifestyle({ tongue_scraping_freq: "every_morning" }))
    expect(r.confounderAdjustments.tongue_scraping).toMatch(/tongue scraping/i)
  })

  test("tongue_scraping_freq=most_days → tongue_scraping adjustment", () => {
    const r = calculateNRV1(baseline, lifestyle({ tongue_scraping_freq: "most_days" }))
    expect(r.confounderAdjustments.tongue_scraping).toMatch(/tongue scraping/i)
  })

  test("tongue_scraping_freq=occasionally → no tongue_scraping adjustment", () => {
    const r = calculateNRV1(baseline, lifestyle({ tongue_scraping_freq: "occasionally" }))
    expect(r.confounderAdjustments.tongue_scraping).toBeUndefined()
  })

  test("confounders never alter the underlying scores", () => {
    const noLs = calculateNRV1(baseline, null)
    const heavy = calculateNRV1(
      baseline,
      lifestyle({
        chlorhexidine_use: "currently_using",
        mouthwash_type: "antiseptic",
        smoking_status: "current",
        medication_ppi: true,
        dietary_nitrate_frequency: "rarely",
        tongue_scraping_freq: "every_morning",
      }),
    )
    expect(heavy.nrCapacityIndex).toBeCloseTo(noLs.nrCapacityIndex, 6)
    expect(heavy.noSignature).toBeCloseTo(noLs.noSignature, 6)
    expect(heavy.nrCapacityCategory).toBe(noLs.nrCapacityCategory)
    expect(heavy.noSignatureCategory).toBe(noLs.noSignatureCategory)
  })
})

// ── Helper bucketing ────────────────────────────────────────────────────────

import { isFrequentTongueScraping, isLowDietaryNitrate } from "../nr-v1"

describe("NR-v1 — value mapping helpers", () => {
  test("isLowDietaryNitrate covers rarely + few_times_month only", () => {
    expect(isLowDietaryNitrate("rarely")).toBe(true)
    expect(isLowDietaryNitrate("few_times_month")).toBe(true)
    expect(isLowDietaryNitrate("several_weekly")).toBe(false)
    expect(isLowDietaryNitrate("daily")).toBe(false)
    expect(isLowDietaryNitrate("multiple_daily")).toBe(false)
    expect(isLowDietaryNitrate(null)).toBe(false)
  })

  test("isFrequentTongueScraping covers most_days + every_morning only", () => {
    expect(isFrequentTongueScraping("most_days")).toBe(true)
    expect(isFrequentTongueScraping("every_morning")).toBe(true)
    expect(isFrequentTongueScraping("occasionally")).toBe(false)
    expect(isFrequentTongueScraping("never")).toBe(false)
    expect(isFrequentTongueScraping(null)).toBe(false)
  })
})

// ── Edge cases ──────────────────────────────────────────────────────────────

describe("NR-v1 — edge cases", () => {
  test("all-zero input → insufficient_data + low confidence", () => {
    const r = calculateNRV1(ZERO_NR_SPECIES, null)
    expect(r.nrCapacityIndex).toBe(0)
    expect(r.nrCapacityCategory).toBe("depleted")
    expect(r.noSignature).toBe(0)
    expect(r.noSignatureCategory).toBe("strongly_unfavorable")
    // The totalInput < 1 floor short-circuits the categorical mapping so an
    // empty kit doesn't falsely classify as "compromised".
    expect(r.nrRiskCategory).toBe("insufficient_data")
    expect(r.confidence).toBe("low")
  })

  test("reducer mass present but no depleting taxa → strongly_favorable via sentinel", () => {
    const r = calculateNRV1(
      species({
        rothia_mucilaginosa: 5,
        neisseria_mucosa: 5,
        rothia_total: 5,
        neisseria_total: 5,
        // veillonella_total and prevotella_total stay 0
      }),
      null,
    )
    expect(r.noSignature).toBe(999)
    expect(r.noSignatureCategory).toBe("strongly_favorable")
    expect(Number.isFinite(r.noSignature)).toBe(true)
  })

  test("lifestyle = null → no confounder entries, no errors", () => {
    const r = calculateNRV1(
      species({
        rothia_mucilaginosa: 5,
        neisseria_mucosa: 10,
        rothia_total: 5,
        neisseria_total: 10,
        veillonella_total: 2,
        prevotella_total: 3,
      }),
      null,
    )
    expect(r.reliabilityFlags).toEqual([])
    expect(r.confounderAdjustments).toEqual({})
  })

  test("paradox: high capacity + unfavorable signature → composition_constrained + flag", () => {
    const r = calculateNRV1(
      species({
        // Push capacity into "robust" territory but keep signature unfavorable
        rothia_mucilaginosa: 10,
        neisseria_mucosa: 10,
        veillonella_total: 30, // big tier-3 contribution + denominator
        rothia_total: 10,
        neisseria_total: 10,
        prevotella_total: 60,
      }),
      null,
    )
    // capacity = (20)×2 + (30)×0.4 = 52 → "robust"
    expect(r.nrCapacityCategory).toBe("robust")
    // signature = 20 / 90 ≈ 0.222 → "strongly_unfavorable"
    expect(r.noSignatureCategory).toBe("strongly_unfavorable")
    expect(r.nrRiskCategory).toBe("composition_constrained")
    expect(r.nrParadoxFlag).toBe(true)
  })

  test("breakdown is populated and self-consistent", () => {
    const r = calculateNRV1(
      species({
        neisseria_mucosa: 5,
        h_parainfluenzae: 2,
        veillonella_total: 3,
        rothia_total: 4,
        neisseria_total: 5,
        prevotella_total: 6,
      }),
      null,
    )
    expect(r.breakdown.tier1Sum).toBe(5)
    expect(r.breakdown.tier2Sum).toBe(2)
    expect(r.breakdown.tier3Sum).toBe(3)
    expect(r.breakdown.tier4Sum).toBe(0)
    expect(r.breakdown.weightedTotal).toBeCloseTo(5 * 2 + 2 * 1 + 3 * 0.4, 6)
    expect(r.breakdown.rothiaPlusNeisseria).toBe(4 + 5)
    expect(r.breakdown.veillonellaPlusPrevotella).toBe(3 + 6)
  })
})

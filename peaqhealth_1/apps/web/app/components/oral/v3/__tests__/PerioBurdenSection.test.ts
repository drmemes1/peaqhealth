/**
 * Unit tests for the perio-section data-mapping helpers.
 *
 * The repo's jest config uses `testEnvironment: "node"` (no jsdom), so
 * these tests verify pure logic — risk copy lookups, status tone
 * mapping, flag-chip derivation. Visual rendering is verified manually
 * on Vercel preview against Igor's kit.
 */
import {
  PBI_LABELS,
  PDI_LABELS,
  RISK_COPY,
  pbiTone,
  pdiTone,
  flagChips,
} from "../PerioBurdenSection"
import type { PerioBurdenV1Outputs } from "../../../../../lib/oral/v3/page-data"

function makePerio(overrides: Partial<PerioBurdenV1Outputs> = {}): PerioBurdenV1Outputs {
  return {
    pbi: 1.0,
    pbi_pre_cdm: 0.9,
    pbi_category: "low",
    pdi: 18,
    pdi_category: "adequate",
    total_subp_pct: 1.5,
    cdm_factor: 1.1,
    cdm_amplification_pct: 10,
    risk_category: "borderline",
    diagnostic_uncertainty_zone: false,
    red_complex: {
      status_label: "not_detected",
      detected_species: [],
      any_above_clinical_threshold: false,
    },
    cross_panel_hooks: {
      cardiovascular_pattern_pending: false,
      neurodegenerative_pattern_pending: false,
    },
    confidence: "moderate",
    reliability_flags: [],
    confounder_adjustments: {},
    narrative_augmentations: [],
    breakdown: {
      tier1_pathogen_sum: 0.1,
      tier2_pathogen_sum: 0.5,
      tier3_pathogen_sum: 0,
      fa_pg_co_occurrence_active: false,
      pg_td_co_occurrence_active: false,
      fn_bridging_boost_active: false,
      stacked_boost_factor: 1.0,
      pbi_pre_cdm: 0.9,
      cdm_contribution: 0.1,
      defense_tier1_sum: 4.0,
      defense_tier2_sum: 14.0,
    },
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────
// RISK_COPY — one fixture per risk category
// ─────────────────────────────────────────────────────────────────────

describe("RISK_COPY — every risk category has copy", () => {
  const expected = [
    "stable_low_risk",
    "borderline",
    "compensated_active_burden",
    "compensated_dysbiosis_risk",
    "active_disease_risk",
    "insufficient_data",
  ]
  test.each(expected)("%s has title + subtitle + body + tone", category => {
    const c = RISK_COPY[category]
    expect(c).toBeDefined()
    expect(c.title.length).toBeGreaterThan(10)
    expect(c.subtitle.length).toBeGreaterThan(10)
    expect(c.body.length).toBeGreaterThan(50)
    expect(["good", "watch", "concern", "attention", "neutral"]).toContain(c.tone)
  })

  test("stable_low_risk uses good tone (green palette)", () => {
    expect(RISK_COPY.stable_low_risk.tone).toBe("good")
  })

  test("borderline uses watch tone (gold palette)", () => {
    expect(RISK_COPY.borderline.tone).toBe("watch")
  })

  test("active_disease_risk uses attention tone (red palette)", () => {
    expect(RISK_COPY.active_disease_risk.tone).toBe("attention")
  })

  test("insufficient_data uses neutral tone", () => {
    expect(RISK_COPY.insufficient_data.tone).toBe("neutral")
  })
})

// ─────────────────────────────────────────────────────────────────────
// Layman labels
// ─────────────────────────────────────────────────────────────────────

describe("layman category labels", () => {
  test("PBI labels cover all 5 bands", () => {
    expect(PBI_LABELS.minimal).toBe("Minimal")
    expect(PBI_LABELS.low).toBe("Low")
    expect(PBI_LABELS.moderate).toBe("Moderate")
    expect(PBI_LABELS.high).toBe("High")
    expect(PBI_LABELS.severe).toBe("Severe")
  })

  test("PDI labels match v1.3 type union (depleted / borderline / adequate / robust)", () => {
    expect(PDI_LABELS.depleted).toBe("Almost gone")
    expect(PDI_LABELS.borderline).toBe("Stretched thin")
    expect(PDI_LABELS.adequate).toBe("Doing the job")
    expect(PDI_LABELS.robust).toBe("Strong")
  })

  test("PDI does NOT carry a label for the deprecated 'severely_depleted' v1.2 name", () => {
    expect(PDI_LABELS.severely_depleted).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────
// Status tones
// ─────────────────────────────────────────────────────────────────────

describe("pbiTone — maps category to palette", () => {
  test("minimal → good", () => expect(pbiTone("minimal")).toBe("good"))
  test("low → watch (uncertainty zone)", () => expect(pbiTone("low")).toBe("watch"))
  test("moderate → watch", () => expect(pbiTone("moderate")).toBe("watch"))
  test("high → concern", () => expect(pbiTone("high")).toBe("concern"))
  test("severe → attention", () => expect(pbiTone("severe")).toBe("attention"))
  test("null → neutral", () => expect(pbiTone(null)).toBe("neutral"))
})

describe("pdiTone — maps v1.3 category to palette", () => {
  test("robust → good", () => expect(pdiTone("robust")).toBe("good"))
  test("adequate → good", () => expect(pdiTone("adequate")).toBe("good"))
  test("borderline → watch", () => expect(pdiTone("borderline")).toBe("watch"))
  test("depleted → attention", () => expect(pdiTone("depleted")).toBe("attention"))
  test("null → neutral", () => expect(pdiTone(null)).toBe("neutral"))
})

// ─────────────────────────────────────────────────────────────────────
// Flag chips
// ─────────────────────────────────────────────────────────────────────

describe("flagChips", () => {
  test("clean state — no chips fire", () => {
    expect(flagChips(makePerio())).toEqual([])
  })

  test("F. nucleatum bridging boost surfaces a chip", () => {
    const chips = flagChips(makePerio({
      breakdown: {
        ...makePerio().breakdown!,
        fn_bridging_boost_active: true,
      },
    }))
    expect(chips.map(c => c.label)).toContain("F. nucleatum bridging active")
  })

  test("Fa × Pg co-occurrence surfaces a chip", () => {
    const chips = flagChips(makePerio({
      breakdown: {
        ...makePerio().breakdown!,
        fa_pg_co_occurrence_active: true,
      },
    }))
    expect(chips.map(c => c.label)).toContain("Fa × Pg co-occurrence")
  })

  test("Pg × Td co-occurrence surfaces a chip", () => {
    const chips = flagChips(makePerio({
      breakdown: {
        ...makePerio().breakdown!,
        pg_td_co_occurrence_active: true,
      },
    }))
    expect(chips.map(c => c.label)).toContain("Pg × Td co-occurrence")
  })

  test("depleted defense surfaces an attention chip", () => {
    const chips = flagChips(makePerio({ pdi_category: "depleted" }))
    const chip = chips.find(c => c.label === "Defenses depleted")
    expect(chip).toBeDefined()
    expect(chip?.tone).toBe("attention")
  })

  test("diagnostic_uncertainty_zone surfaces a chip", () => {
    const chips = flagChips(makePerio({ diagnostic_uncertainty_zone: true }))
    expect(chips.map(c => c.label)).toContain("Diagnostic uncertainty zone")
  })

  test("multiple flags compound", () => {
    const chips = flagChips(makePerio({
      pdi_category: "depleted",
      diagnostic_uncertainty_zone: true,
      breakdown: {
        ...makePerio().breakdown!,
        fn_bridging_boost_active: true,
        fa_pg_co_occurrence_active: true,
      },
    }))
    expect(chips.length).toBe(4)
  })
})

// ─────────────────────────────────────────────────────────────────────
// End-to-end fixture: Igor's stored perio shape (per PR-Δ-β1 backfill)
// ─────────────────────────────────────────────────────────────────────

describe("Igor fixture — stable_low_risk after PDI v1.3", () => {
  const igor = makePerio({
    pbi: 1.05,
    pbi_pre_cdm: 0.88,
    pbi_category: "low",
    pdi: 18.46,
    pdi_category: "adequate",
    total_subp_pct: 1.7257,
    cdm_factor: 1.1924,
    cdm_amplification_pct: 19.24,
    risk_category: "stable_low_risk",
    diagnostic_uncertainty_zone: true,
    red_complex: {
      status_label: "below_clinical_threshold",
      detected_species: ["T. forsythia (trace)", "Treponema (genus) (trace)"],
      any_above_clinical_threshold: false,
    },
    confidence: "moderate",
  })

  test("risk_category resolves to 'Healthy balance' copy", () => {
    expect(RISK_COPY[igor.risk_category].title).toMatch(/Healthy balance/i)
  })

  test("PBI tone is 'watch' (uncertainty zone)", () => {
    expect(pbiTone(igor.pbi_category)).toBe("watch")
  })

  test("PDI tone is 'good' (adequate band under v1.3)", () => {
    expect(pdiTone(igor.pdi_category)).toBe("good")
  })

  test("diagnostic_uncertainty_zone chip fires", () => {
    expect(flagChips(igor).map(c => c.label)).toContain("Diagnostic uncertainty zone")
  })
})

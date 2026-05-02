import { generateLede } from "../lede-generator"
import type { OralPageData, CariesV3Outputs, NRV1Outputs } from "../page-data"

function makeData(opts: {
  caries?: Partial<CariesV3Outputs> | null
  nr?: Partial<NRV1Outputs> | null
}): OralPageData {
  const caries: CariesV3Outputs | null = opts.caries === null ? null : {
    risk_category: "low_risk_stable",
    cli: 0, cli_category: "low",
    csi: 100, csi_category: "robust",
    api: 0.05, api_category: "well_buffered",
    protective_ratio: 5, protective_ratio_category: "strong",
    ads_primary_pct: 3, ads_extended_pct: 6,
    synergy_active: false, compensated_dysbiosis: false,
    confidence: "high", confounder_adjustments: {},
    ...(opts.caries ?? {}),
  }
  const nr: NRV1Outputs | null = opts.nr === null ? null : {
    capacity_index: 50, capacity_category: "robust",
    no_signature: 2, no_signature_category: "favorable",
    risk_category: "optimal",
    paradox_flag: false, confidence: "high", confounder_adjustments: {},
    ...(opts.nr ?? {}),
  }
  return {
    user: { id: "u", first_name: null },
    kit: { id: "k", ordered_at: null, results_date: null },
    caries, nr,
    perio: null, // lede-generator currently doesn't branch on perio
    snapshot: { species_count: 100, named_species_count: 90, genus_count: 30, phyla_count: 8, shannon_diversity: 4.5, total_abundance_captured: 100 },
    top_species: [],
    composition: { buffering: 0, nr_favorable: 0, cariogenic: 0, context_dependent: 0, unclassified: 0 },
    lifestyle: null,
    has_blood_data: false, has_sleep_data: false, has_questionnaire_data: false,
  }
}

describe("generateLede", () => {
  test("Igor's case: caries active + NR optimal", () => {
    const data = makeData({
      caries: { risk_category: "compensated_active_risk" },
      nr: { risk_category: "optimal" },
    })
    expect(generateLede(data)).toMatch(/nitric oxide pathway is strong/i)
    expect(generateLede(data)).toMatch(/active pressure/i)
  })

  test("everything good → both-strong branch", () => {
    const data = makeData({
      caries: { risk_category: "low_risk_stable" },
      nr: { risk_category: "optimal" },
    })
    expect(generateLede(data)).toMatch(/oral microbiome is in good shape/i)
  })

  test("caries good + NR paradox → paradox-with-stable-caries branch", () => {
    const data = makeData({
      caries: { risk_category: "low_risk_stable" },
      nr: { risk_category: "optimal", paradox_flag: true },
    })
    expect(generateLede(data)).toMatch(/composition pattern that may limit systemic NO/i)
  })

  test("dysbiosis + paradox → shared-upstream-causes branch", () => {
    const data = makeData({
      caries: { risk_category: "compensated_dysbiosis_risk" },
      nr: { risk_category: "compromised", paradox_flag: true },
    })
    expect(generateLede(data)).toMatch(/share upstream causes/i)
  })

  test("caries active + NR compromised → both-pressure branch", () => {
    const data = makeData({
      caries: { risk_category: "active_disease_risk" },
      nr: { risk_category: "compromised" },
    })
    expect(generateLede(data)).toMatch(/Both signals are showing pressure/i)
  })

  test("partial — caries unknown + NR optimal", () => {
    const data = makeData({
      caries: null,
      nr: { risk_category: "optimal" },
    })
    expect(generateLede(data)).toMatch(/Caries classification is awaiting/i)
  })

  test("fallback when neither classification matches a branch", () => {
    const data = makeData({
      caries: { risk_category: "unknown_state" as never },
      nr: { risk_category: "unknown_state" as never },
    })
    expect(generateLede(data)).toMatch(/complex pattern/i)
  })
})

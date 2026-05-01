/**
 * NR-β1 pipeline-runner tests.
 *
 * Asserts the glue between persisted oral_kit_orders rows and the pure NR-α
 * algorithm: row shape → NRSpeciesAbundances (with its approximation
 * arithmetic for genus-only species), lifestyle row → confounder type, result
 * → DB update payload, soft-fail behavior.
 */

import {
  speciesFromKitRow,
  lifestyleFromRow,
  v1UpdateFromResult,
  runNRV1,
} from "../nr-v1-runner"
import { calculateNRV1 } from "../nr-v1"

// ── Pilot-style rows. Numbers match the persisted post-PR-247/248 state for
//    Pilot.Peaq.1 (Igor, kit c033fbae) where applicable. ──

const IGOR_ROW = {
  id: "TEST-IGOR",
  rothia_pct: 7.3846,
  rothia_dentocariosa_pct: 0.8373,
  rothia_aeria_pct: 0.1448,
  neisseria_pct: 14.8035,
  haemophilus_pct: 2.9001,
  a_naeslundii_pct: 0.8969,
  actinomyces_pct: 6.4816, // already excludes a_naeslundii after PR-α
  veillonella_pct: 4.2863,
  prevotella_intermedia_pct: 0.2008,
  prevotella_commensal_pct: 6.848,
  p_denticola_pct: 0.0341,
}

// Veillonella + Prevotella-dominant signature with limited Tier 1 biomass.
// Tuned to land in the composition_constrained quadrant (paradox).
const PARADOX_ROW = {
  id: "TEST-PARADOX",
  rothia_pct: 1.5,
  neisseria_pct: 5.8,
  veillonella_pct: 7.9,
  prevotella_commensal_pct: 18.4,
}

// Reducer mass present, no depleting taxa → strongly_favorable via sentinel.
const NO_DEPLETERS_ROW = {
  id: "TEST-NO-DEPLETERS",
  rothia_pct: 5,
  neisseria_pct: 5,
  // veillonella_pct omitted (default 0); no prevotella columns
}

// ── speciesFromKitRow ───────────────────────────────────────────────────────

describe("speciesFromKitRow", () => {
  test("missing columns default to 0", () => {
    const sp = speciesFromKitRow({ id: "x" })
    expect(sp.neisseria_mucosa).toBe(0)
    expect(sp.rothia_mucilaginosa).toBe(0)
    expect(sp.veillonella_total).toBe(0)
    expect(sp.prevotella_total).toBe(0)
    expect(sp.rothia_total).toBe(0)
    expect(sp.neisseria_total).toBe(0)
  })

  test("rothia_total sums genus residual + dentocariosa + aeria (post-PR-α split)", () => {
    const sp = speciesFromKitRow({
      rothia_pct: 7.3846,
      rothia_dentocariosa_pct: 0.8373,
      rothia_aeria_pct: 0.1448,
    })
    expect(sp.rothia_mucilaginosa).toBeCloseTo(7.3846, 4)
    expect(sp.rothia_dentocariosa).toBeCloseTo(0.8373, 4)
    expect(sp.rothia_aeria).toBeCloseTo(0.1448, 4)
    expect(sp.rothia_total).toBeCloseTo(8.3667, 4)
  })

  test("prevotella_total sums intermedia + commensal + p_denticola (no genus column)", () => {
    const sp = speciesFromKitRow({
      prevotella_intermedia_pct: 0.2008,
      prevotella_commensal_pct: 6.848,
      p_denticola_pct: 0.0341,
    })
    expect(sp.prevotella_total).toBeCloseTo(7.0829, 4)
  })

  test("neisseria genus total fully allocated to neisseria_mucosa (ADR-0019 conservative upper-bound)", () => {
    const sp = speciesFromKitRow({ neisseria_pct: 14.8 })
    expect(sp.neisseria_mucosa).toBeCloseTo(14.8, 4)
    expect(sp.neisseria_flavescens).toBe(0)
    expect(sp.neisseria_subflava).toBe(0)
    expect(sp.neisseria_other).toBe(0)
    expect(sp.neisseria_total).toBeCloseTo(14.8, 4)
  })

  test("h_parainfluenzae proxied from haemophilus_pct (genus-level)", () => {
    const sp = speciesFromKitRow({ haemophilus_pct: 2.9 })
    expect(sp.h_parainfluenzae).toBeCloseTo(2.9, 4)
  })

  test("actinomyces_other reads actinomyces_pct directly (parser already excludes a_naeslundii)", () => {
    const sp = speciesFromKitRow({
      actinomyces_pct: 6.4816,
      a_naeslundii_pct: 0.8969,
    })
    expect(sp.actinomyces_other).toBeCloseTo(6.4816, 4)
    expect(sp.a_naeslundii).toBeCloseTo(0.8969, 4)
    // actinomyces_odontolyticus stays at 0 — no species column.
    expect(sp.actinomyces_odontolyticus).toBe(0)
  })

  test("non-numeric / null values coerce to 0 without throwing", () => {
    const sp = speciesFromKitRow({
      rothia_pct: null,
      neisseria_pct: undefined,
      veillonella_pct: "not a number",
      prevotella_commensal_pct: NaN,
    })
    expect(sp.rothia_total).toBe(0)
    expect(sp.neisseria_total).toBe(0)
    expect(sp.veillonella_total).toBe(0)
    expect(sp.prevotella_total).toBe(0)
  })
})

// ── lifestyleFromRow ────────────────────────────────────────────────────────

describe("lifestyleFromRow", () => {
  test("null row → null", () => {
    expect(lifestyleFromRow(null)).toBeNull()
  })

  test("existing chlorhexidine_use passes through unchanged", () => {
    const ls = lifestyleFromRow({ chlorhexidine_use: "currently_using" })
    expect(ls?.chlorhexidine_use).toBe("currently_using")
  })

  test("dietary_nitrate_frequency reads existing v2 column directly (post-consolidation)", () => {
    const ls = lifestyleFromRow({ dietary_nitrate_frequency: "rarely" })
    expect(ls?.dietary_nitrate_frequency).toBe("rarely")
  })

  test("tongue_scraping_freq reads existing v2 column directly (post-consolidation)", () => {
    const ls = lifestyleFromRow({ tongue_scraping_freq: "every_morning" })
    expect(ls?.tongue_scraping_freq).toBe("every_morning")
  })

  test("invalid enum strings coerce to null (defensive)", () => {
    const ls = lifestyleFromRow({
      mouthwash_type: "bar",
      chlorhexidine_use: "qux",
      smoking_status: "totally_invalid",
      dietary_nitrate_frequency: "constant",
      tongue_scraping_freq: "twice_an_hour",
    })
    expect(ls?.mouthwash_type).toBeNull()
    expect(ls?.chlorhexidine_use).toBeNull()
    expect(ls?.smoking_status).toBeNull()
    expect(ls?.dietary_nitrate_frequency).toBeNull()
    expect(ls?.tongue_scraping_freq).toBeNull()
  })

  test("medication_ppi boolean passes through; non-boolean → false", () => {
    expect(lifestyleFromRow({ medication_ppi: true })?.medication_ppi).toBe(true)
    expect(lifestyleFromRow({ medication_ppi: "yes" })?.medication_ppi).toBe(false)
    expect(lifestyleFromRow({})?.medication_ppi).toBe(false)
  })
})

// ── runNRV1 — end-to-end pipeline ───────────────────────────────────────────

describe("runNRV1 — end-to-end pipeline", () => {
  test("Igor row + null lifestyle → optimal (capacity robust+, signature favorable)", () => {
    const r = runNRV1(IGOR_ROW, null)
    expect(r).not.toBeNull()
    // Capacity from Igor's data lands in robust or exceptional bucket;
    // either is acceptable (per nr-v1.test.ts pilot fixture).
    expect(["robust", "exceptional"]).toContain(r!.result.nrCapacityCategory)
    expect(r!.result.noSignatureCategory).toBe("favorable")
    expect(r!.result.nrRiskCategory).toBe("optimal")
    expect(r!.result.nrParadoxFlag).toBe(false)
    expect(r!.update.nr_risk_category).toBe("optimal")
    expect(r!.update.nr_v1_confounder_adjustments).toEqual({})
  })

  test("paradox row → composition_constrained, paradox flag set", () => {
    const r = runNRV1(PARADOX_ROW, null)
    expect(r!.result.nrRiskCategory).toBe("composition_constrained")
    expect(r!.result.nrParadoxFlag).toBe(true)
    expect(r!.update.nr_paradox_flag).toBe(true)
  })

  test("no-depleters row → strongly_favorable via sentinel", () => {
    const r = runNRV1(NO_DEPLETERS_ROW, null)
    expect(r!.result.noSignatureCategory).toBe("strongly_favorable")
    expect(r!.update.no_signature).toBe(999)
  })

  test("chlorhexidine_use=currently_using surfaces chlorhexidine_active flag + adjustment", () => {
    const r = runNRV1(IGOR_ROW, { chlorhexidine_use: "currently_using" })
    expect(r!.update.nr_v1_reliability_flags).toContain("chlorhexidine_active")
    expect(r!.update.nr_v1_confounder_adjustments.chlorhexidine).toMatch(/Chlorhexidine/i)
  })

  test("dietary_nitrate_frequency=rarely surfaces the dietary_nitrate adjustment", () => {
    const r = runNRV1(IGOR_ROW, { dietary_nitrate_frequency: "rarely" })
    expect(r!.update.nr_v1_confounder_adjustments.dietary_nitrate).toMatch(/Low dietary nitrate/i)
  })

  test("tongue_scraping_freq=every_morning surfaces the tongue_scraping adjustment", () => {
    const r = runNRV1(IGOR_ROW, { tongue_scraping_freq: "every_morning" })
    expect(r!.update.nr_v1_confounder_adjustments.tongue_scraping).toMatch(/tongue scraping/i)
  })

  test("computed_at timestamp is ISO-8601", () => {
    const r = runNRV1(IGOR_ROW, null)
    expect(r!.update.nr_v1_computed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  test("idempotency: two runs produce equivalent updates (timestamps may differ)", () => {
    const r1 = runNRV1(IGOR_ROW, null)
    const r2 = runNRV1(IGOR_ROW, null)
    const omitTs = (u: { nr_v1_computed_at: string }) => {
      const { nr_v1_computed_at, ...rest } = u
      void nr_v1_computed_at
      return rest
    }
    expect(omitTs(r1!.update)).toEqual(omitTs(r2!.update))
  })

  test("soft-fail: runner returns null and logs when something throws", () => {
    const exploding = new Proxy({}, {
      get() { throw new Error("simulated kit-row read failure") },
    })
    const consoleErrSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    const r = runNRV1(exploding as Record<string, unknown>, null)
    expect(r).toBeNull()
    expect(consoleErrSpy).toHaveBeenCalled()
    consoleErrSpy.mockRestore()
  })
})

// ── v1UpdateFromResult — column shape sanity ────────────────────────────────

describe("v1UpdateFromResult — DB column shape", () => {
  test("update payload has all 11 columns from the migration", () => {
    const result = calculateNRV1(speciesFromKitRow(IGOR_ROW), null)
    const update = v1UpdateFromResult(result)
    const expectedKeys = [
      "nr_capacity_index", "nr_capacity_category",
      "no_signature", "no_signature_category",
      "nr_risk_category", "nr_paradox_flag",
      "nr_v1_confidence", "nr_v1_reliability_flags",
      "nr_v1_confounder_adjustments", "nr_v1_breakdown",
      "nr_v1_computed_at",
    ]
    for (const k of expectedKeys) expect(update).toHaveProperty(k)
    expect(Object.keys(update).length).toBe(expectedKeys.length)
  })

  test("empty reliability flags persist as null (matching caries v3 convention)", () => {
    const r = runNRV1(IGOR_ROW, null)
    expect(r!.update.nr_v1_reliability_flags).toBeNull()
  })

  test("breakdown is a structured object (jsonb-ready)", () => {
    const r = runNRV1(IGOR_ROW, null)
    const b = r!.update.nr_v1_breakdown
    expect(b).toHaveProperty("tier1Sum")
    expect(b).toHaveProperty("tier2Sum")
    expect(b).toHaveProperty("tier3Sum")
    expect(b).toHaveProperty("rothiaPlusNeisseria")
    expect(b).toHaveProperty("veillonellaPlusPrevotella")
  })
})

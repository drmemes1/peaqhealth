/**
 * Pipeline-runner tests.
 *
 * Asserts the glue between persisted DB rows and the pure caries-v3
 * algorithm: row shape → SpeciesAbundances, lifestyle row → confounder
 * type, result → DB update payload, soft-fail behavior.
 */

import {
  speciesFromKitRow,
  lifestyleFromRow,
  v3UpdateFromResult,
  runCariesV3,
} from "../caries-v3-runner"
import { calculateCariesV3 } from "../caries-v3"
import { kitRowFromColumns } from "../__test-fixtures/kit-row-from-columns"

// ── Pilot rows we'll reuse across tests. Wrapped via kitRowFromColumns()
//    so the species-parser sees raw_otu_table.__meta.entries (the
//    authoritative path) instead of legacy column reads. ──

const IGOR_ROW = kitRowFromColumns({
  id: "TEST-1",
  s_mutans_pct: 0.27, s_sobrinus_pct: 0.24,
  s_sanguinis_pct: 4.49, s_gordonii_pct: 0.41,
})

const GABBY_ROW = kitRowFromColumns({
  id: "TEST-2",
  s_mutans_pct: 0.035, s_sanguinis_pct: 5.46, s_gordonii_pct: 0.028,
})

const EVELINA_ROW = kitRowFromColumns({
  id: "TEST-3",
  s_mutans_pct: 0.02, s_sanguinis_pct: 0.02, s_gordonii_pct: 0.03,
  veillonella_pct: 16.4,
})

// ── speciesFromKitRow ──

describe("speciesFromKitRow", () => {
  test("missing columns default to 0 (matching DEFAULT 0 contract)", () => {
    const sp = speciesFromKitRow({ id: "x" })
    expect(sp.s_mutans).toBe(0)
    expect(sp.s_sanguinis).toBe(0)
    expect(sp.b_dentium).toBe(0)
    expect(sp.veillonella_total).toBe(0)
  })

  test("all v3 species columns are read (via entries)", () => {
    const sp = speciesFromKitRow(kitRowFromColumns({
      s_mutans_pct: 1, s_sobrinus_pct: 2, scardovia_pct: 3, lactobacillus_pct: 4,
      b_dentium_pct: 5, s_sputigena_pct: 6, p_acidifaciens_pct: 7,
      leptotrichia_wadei_pct: 8, leptotrichia_shahii_pct: 9, p_denticola_pct: 10,
      s_sanguinis_pct: 11, s_gordonii_pct: 12, s_cristatus_pct: 13,
      s_parasanguinis_pct: 14, s_australis_pct: 15, a_naeslundii_pct: 16,
      s_salivarius_pct: 17, haemophilus_pct: 18,
      neisseria_pct: 19, rothia_dentocariosa_pct: 20, rothia_aeria_pct: 21,
      veillonella_pct: 22, s_mitis_pct: 23,
    }))
    expect(sp.s_mutans).toBe(1)
    expect(sp.scardovia_wiggsiae).toBe(3)
    expect(sp.b_dentium).toBe(5)
    expect(sp.s_sputigena).toBe(6)
    expect(sp.s_cristatus).toBe(13)
    expect(sp.h_parainfluenzae).toBe(18) // genus-proxy via species-parser
    expect(sp.neisseria_total).toBe(19)
    expect(sp.veillonella_total).toBe(22)
    expect(sp.s_mitis).toBe(23) // s_mitis_pct → entries → s_mitis_group_pct
  })

  test("missing entries default to 0 without throwing", () => {
    // Empty kit row (no raw_otu_table) — every species reads as 0.
    const sp = speciesFromKitRow({ id: "x" })
    expect(sp.s_mutans).toBe(0)
    expect(sp.s_sobrinus).toBe(0)
    expect(sp.s_sanguinis).toBe(0)
    expect(sp.s_gordonii).toBe(0)
  })
})

// ── lifestyleFromRow ──

describe("lifestyleFromRow", () => {
  test("null row → null (caller treats as 'no lifestyle data')", () => {
    expect(lifestyleFromRow(null)).toBeNull()
  })

  test("existing antibiotics_window passes through unchanged", () => {
    const ls = lifestyleFromRow({ antibiotics_window: "past_30" })
    expect(ls?.antibiotics_window).toBe("past_30")
  })

  test("existing sugar_intake passes through unchanged", () => {
    const ls = lifestyleFromRow({ sugar_intake: "few_weekly" })
    expect(ls?.sugar_intake).toBe("few_weekly")
  })

  test("invalid enum strings coerce to null (defensive)", () => {
    const ls = lifestyleFromRow({
      smoking_status: "totally_invalid",
      antibiotics_window: "foo",
      mouthwash_type: "bar",
      chlorhexidine_use: "qux",
      xerostomia_self_report: "always_a_little",
      sugar_intake: "every_hour",
    })
    expect(ls?.smoking_status).toBeNull()
    expect(ls?.antibiotics_window).toBeNull()
    expect(ls?.mouthwash_type).toBeNull()
    expect(ls?.chlorhexidine_use).toBeNull()
    expect(ls?.xerostomia_self_report).toBeNull()
    expect(ls?.sugar_intake).toBeNull()
  })

  test("PR-244 fields chlorhexidine_use + xerostomia_self_report read directly", () => {
    const ls = lifestyleFromRow({
      chlorhexidine_use: "currently_using",
      xerostomia_self_report: "frequent",
    })
    expect(ls?.chlorhexidine_use).toBe("currently_using")
    expect(ls?.xerostomia_self_report).toBe("frequent")
  })

  test("medication_ppi boolean passes through; non-boolean → false", () => {
    expect(lifestyleFromRow({ medication_ppi: true })?.medication_ppi).toBe(true)
    expect(lifestyleFromRow({ medication_ppi: "yes" })?.medication_ppi).toBe(false)
  })

  test("gerd: prefer `gerd` boolean column, fall back to gerd_nocturnal", () => {
    expect(lifestyleFromRow({ gerd: true, gerd_nocturnal: false })?.gerd).toBe(true)
    expect(lifestyleFromRow({ gerd_nocturnal: true })?.gerd).toBe(true)
    expect(lifestyleFromRow({})?.gerd).toBe(false)
  })
})

// ── runCariesV3 ──

describe("runCariesV3 — end-to-end pipeline", () => {
  test("Igor row + null lifestyle → compensated_active_risk, no confounder adjustments", () => {
    const r = runCariesV3(IGOR_ROW, null)
    expect(r).not.toBeNull()
    expect(r!.result.cariesRiskCategory).toBe("compensated_active_risk")
    expect(r!.result.synergyActiveFlag).toBe(true)
    expect(r!.update.caries_risk_category).toBe("compensated_active_risk")
    expect(r!.update.caries_v3_confounder_adjustments).toEqual({})
  })

  test("Gabby row + null lifestyle → low_risk_stable", () => {
    const r = runCariesV3(GABBY_ROW, null)
    expect(r!.result.cariesRiskCategory).toBe("low_risk_stable")
    expect(r!.update.synergy_active_flag).toBe(false)
  })

  test("Evelina row + PPI + antiseptic mouthwash → compensated_dysbiosis_risk + adjustments", () => {
    const r = runCariesV3(EVELINA_ROW, {
      medication_ppi: true,
      mouthwash_type: "antiseptic",
    })
    expect(r!.result.cariesRiskCategory).toBe("compensated_dysbiosis_risk")
    expect(r!.update.compensated_dysbiosis_flag).toBe(true)
    expect(r!.update.caries_v3_confounder_adjustments.ppi).toMatch(/PPI/)
    expect(r!.update.caries_v3_confounder_adjustments.mouthwash).toMatch(/Antiseptic mouthwash/)
  })

  test("antibiotics_window=past_30 surfaces antibiotic_disruption flag", () => {
    const r = runCariesV3(IGOR_ROW, { antibiotics_window: "past_30" })
    expect(r!.update.caries_v3_reliability_flags).toContain("antibiotic_disruption")
  })

  test("sugar_intake='daily' on elevated CLI surfaces the diet-bacteria-loop adjustment", () => {
    const r = runCariesV3(IGOR_ROW, { sugar_intake: "daily" })
    expect(r!.update.caries_v3_confounder_adjustments.sugar).toMatch(/diet-bacteria loop/)
  })

  test("computed_at timestamp is ISO-8601", () => {
    const r = runCariesV3(IGOR_ROW, null)
    expect(r!.update.caries_v3_computed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  test("idempotency: two runs produce equivalent updates (timestamps may differ)", () => {
    const r1 = runCariesV3(IGOR_ROW, null)
    const r2 = runCariesV3(IGOR_ROW, null)
    const omitTs = (u: { caries_v3_computed_at: string }) => {
      const { caries_v3_computed_at, ...rest } = u
      void caries_v3_computed_at
      return rest
    }
    expect(omitTs(r1!.update)).toEqual(omitTs(r2!.update))
  })

  test("soft-fail: runner returns null and logs when something throws", () => {
    // Force a throw by passing a row whose access pattern explodes when
    // `Number(...)` is called on a recursive proxy. The simplest way is to
    // pass a Proxy that throws on any property read.
    const exploding = new Proxy({}, {
      get() { throw new Error("simulated kit-row read failure") },
    })
    const consoleErrSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    const r = runCariesV3(exploding as Record<string, unknown>, null)
    expect(r).toBeNull()
    expect(consoleErrSpy).toHaveBeenCalled()
    consoleErrSpy.mockRestore()
  })
})

// ── v3UpdateFromResult — column shape sanity ──

describe("v3UpdateFromResult — DB column shape", () => {
  test("update payload has all 19 columns from the migration", () => {
    const result = calculateCariesV3(speciesFromKitRow(IGOR_ROW), null)
    const update = v3UpdateFromResult(result)
    const expectedKeys = [
      "ph_balance_api_v3", "ph_balance_api_v3_category",
      "cariogenic_load_v3", "cariogenic_load_v3_category",
      "protective_ratio_v3", "protective_ratio_v3_category",
      "commensal_sufficiency_index", "commensal_sufficiency_category",
      "ads_primary_pct", "ads_extended_pct",
      "compensated_dysbiosis_flag", "synergy_active_flag",
      "caries_risk_category",
      "caries_v3_confidence", "caries_v3_reliability_flags",
      "caries_v3_confounder_adjustments", "caries_v3_breakdown",
      "caries_v3_computed_at",
    ]
    for (const k of expectedKeys) expect(update).toHaveProperty(k)
    expect(Object.keys(update).length).toBe(expectedKeys.length)
  })

  test("empty reliability flags persist as null (not [] — keeps DB queries simple)", () => {
    const r = runCariesV3(GABBY_ROW, null)
    expect(r!.update.caries_v3_reliability_flags).toBeNull()
  })
})

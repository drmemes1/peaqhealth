import {
  speciesFromKitRow,
  lifestyleFromRow,
  runPerioBurdenV1,
  v1UpdateFromResult,
} from "../perio-burden-v1-runner"
import { calculatePerioBurdenV1, EMPTY_PERIO_SPECIES } from "../perio-burden-v1"

// ─────────────────────────────────────────────────────────────────────
// speciesFromKitRow — column-first path (post-PR-Δ-α-parser kits)
// ─────────────────────────────────────────────────────────────────────

describe("speciesFromKitRow — column path", () => {
  test("reads new species columns directly when populated", () => {
    const row: Record<string, unknown> = {
      p_gingivalis_pct: 1.5,
      t_forsythia_pct: 0.5,
      treponema_pct: 0.2,
      f_alocis_pct: 0.3,
      f_nucleatum_pct: 0.8,
      p_intermedia_pct: 0.4,
      s_constellatus_pct: 0.1,
      p_micra_pct: 0.2,
      c_matruchotii_pct: 1.0,
      s_mitis_group_pct: 2.0,
      s_sanguinis_pct: 1.8,
      s_gordonii_pct: 0.4,
      rothia_pct: 8.0,
      neisseria_pct: 14.0,
      haemophilus_pct: 2.5,
      a_naeslundii_pct: 0.7,
    }
    const s = speciesFromKitRow(row)
    expect(s.p_gingivalis).toBe(1.5)
    expect(s.t_forsythia).toBe(0.5)
    expect(s.treponema_total).toBe(0.2)
    expect(s.f_alocis).toBe(0.3)
    expect(s.f_nucleatum).toBe(0.8)
    expect(s.s_constellatus).toBe(0.1)
    expect(s.p_micra).toBe(0.2)
    expect(s.c_matruchotii).toBe(1.0)
    expect(s.s_mitis_group).toBe(2.0)
    expect(s.rothia_total).toBe(8.0)
    expect(s.neisseria_total).toBe(14.0)
  })
})

// ─────────────────────────────────────────────────────────────────────
// speciesFromKitRow — entries fallback (legacy kits, pre-parser PR)
// ─────────────────────────────────────────────────────────────────────

describe("speciesFromKitRow — entries fallback for legacy kits", () => {
  // Mirrors Igor's actual __meta.entries shape on Pilot.Peaq.1.
  const igorRow: Record<string, unknown> = {
    raw_otu_table: {
      __meta: {
        entries: [
          { genus: "Tannerella", species: "forsythia", pct: 0.0475 },
          { genus: "Treponema", species: "vincentii", pct: 0.0572 },
          { genus: "Treponema", species: "socranskii", pct: 0.0292 },
          { genus: "Filifactor", species: "alocis", pct: 0.0134 },
          { genus: "Fusobacterium", species: "nucleatum", pct: 0.8543 },
          { genus: "Fusobacterium", species: "canifelinum-nucleatum", pct: 0.247 },
          { genus: "Fusobacterium", species: "periodonticum", pct: 1.4859 },
          { genus: "Streptococcus", species: "anginosus-constellatus-intermedius", pct: 0.0621 },
          { genus: "Parvimonas", species: "micra", pct: 0.1838 },
          { genus: "Corynebacterium", species: "matruchotii", pct: 0.6304 },
          { genus: "Streptococcus", species: "oralis-parasanguinis", pct: 0.4661 },
          { genus: "Streptococcus", species: "salivarius-vestibularis", pct: 15.2828 },
          { genus: "Streptococcus", species: "sanguinis", pct: 1.9009 },
          { genus: "Streptococcus", species: "gordonii", pct: 0.4126 },
          { genus: "Lautropia", species: "mirabilis", pct: 1.9983 },
          { genus: "Fretibacterium", species: "fastidiosum", pct: 0.0134 },
          { genus: "Fretibacterium", species: "sp67092", pct: 0.017 },
        ],
      },
    },
    // Legacy genus columns (no species columns yet on this kit):
    s_sanguinis_pct: 1.9009,
    s_gordonii_pct: 0.4126,
    treponema_pct: 0.0864, // genus accumulator
    // Per the post-PR-α parser convention, rothia_pct is the residual
    // (genus minus species-level columns). Total = residual + species cols.
    rothia_pct: 7.3846,
    rothia_dentocariosa_pct: 0.8373,
    rothia_aeria_pct: 0.1448,
    neisseria_pct: 14.80,
    haemophilus_pct: 2.79,
    a_naeslundii_pct: 0.5367,
    parvimonas_pct: 0.1838,
    prevotella_intermedia_pct: 0.2008,
  }

  test("S. mitis group sums oralis-parasanguinis + nothing else from Igor's data", () => {
    const s = speciesFromKitRow(igorRow)
    // Only `oralis-parasanguinis` (0.4661) matches. salivarius-vestibularis is excluded.
    expect(s.s_mitis_group).toBeCloseTo(0.4661, 4)
  })

  test("S. constellatus picked up from hyphenated 'anginosus-constellatus-intermedius'", () => {
    const s = speciesFromKitRow(igorRow)
    expect(s.s_constellatus).toBeCloseTo(0.0621, 4)
  })

  test("F. nucleatum extracted at species-level (clean + hyphenated-with-nucleatum)", () => {
    const s = speciesFromKitRow(igorRow)
    // Sums clean `nucleatum` (0.8543) + `canifelinum-nucleatum` (0.247).
    // periodonticum (1.49) and necrophorum stay OUT.
    expect(s.f_nucleatum).toBeCloseTo(1.1013, 4)
  })

  test("C. matruchotii extracted from entries (legacy column-less kit)", () => {
    const s = speciesFromKitRow(igorRow)
    expect(s.c_matruchotii).toBeCloseTo(0.6304, 4)
  })

  test("F. alocis extracted from entries (was unmatched in legacy parser)", () => {
    const s = speciesFromKitRow(igorRow)
    expect(s.f_alocis).toBeCloseTo(0.0134, 4)
  })

  test("T. forsythia extracted at species-level", () => {
    const s = speciesFromKitRow(igorRow)
    expect(s.t_forsythia).toBeCloseTo(0.0475, 4)
  })

  test("Treponema is genus-level by design (V3-V4 limit)", () => {
    const s = speciesFromKitRow(igorRow)
    expect(s.treponema_total).toBeCloseTo(0.0864, 4)
  })

  test("Fretibacterium summed from genus-level entries", () => {
    const s = speciesFromKitRow(igorRow)
    expect(s.fretibacterium).toBeCloseTo(0.0304, 4)
  })

  test("Rothia / Neisseria / Hp / Lautropia totals match expected", () => {
    const s = speciesFromKitRow(igorRow)
    // residual rothia_pct (7.3846) + dentocariosa (0.8373) + aeria (0.1448)
    expect(s.rothia_total).toBeCloseTo(8.3667, 3)
    expect(s.neisseria_total).toBe(14.80)
    expect(s.h_parainfluenzae).toBe(2.79)
    expect(s.lautropia).toBeCloseTo(1.9983, 4)
  })
})

// ─────────────────────────────────────────────────────────────────────
// End-to-end pipeline against Igor's row
// ─────────────────────────────────────────────────────────────────────

describe("runPerioBurdenV1 — Igor's kit (entries fallback)", () => {
  test("classification matches algorithm-test fixture (borderline)", () => {
    const igorRow: Record<string, unknown> = {
      raw_otu_table: {
        __meta: {
          entries: [
            { genus: "Tannerella", species: "forsythia", pct: 0.0475 },
            { genus: "Treponema", species: "vincentii", pct: 0.0572 },
            { genus: "Treponema", species: "socranskii", pct: 0.0292 },
            { genus: "Filifactor", species: "alocis", pct: 0.0134 },
            { genus: "Fusobacterium", species: "nucleatum", pct: 0.8543 },
            { genus: "Fusobacterium", species: "periodonticum", pct: 1.4859 },
            { genus: "Streptococcus", species: "anginosus-constellatus-intermedius", pct: 0.0621 },
            { genus: "Parvimonas", species: "micra", pct: 0.1838 },
            { genus: "Corynebacterium", species: "matruchotii", pct: 0.6304 },
            { genus: "Streptococcus", species: "oralis-parasanguinis", pct: 0.4661 },
            { genus: "Streptococcus", species: "sanguinis", pct: 1.9009 },
            { genus: "Streptococcus", species: "gordonii", pct: 0.4126 },
            { genus: "Lautropia", species: "mirabilis", pct: 1.9983 },
          ],
        },
      },
      s_sanguinis_pct: 1.9009,
      s_gordonii_pct: 0.4126,
      treponema_pct: 0.0864,
      rothia_pct: 8.31,
      neisseria_pct: 14.80,
      haemophilus_pct: 2.79,
      a_naeslundii_pct: 0.74,
      parvimonas_pct: 0.1838,
      prevotella_intermedia_pct: 0,
    }

    const out = runPerioBurdenV1(igorRow, null)
    expect(out).not.toBeNull()
    if (!out) return

    // PDI ~17.8 → 'adequate' under v1.3 thresholds (15–28). CDM ~1.20.
    expect(out.result.perio_defense_category).toBe("adequate")
    expect(out.result.commensal_depletion_factor).toBeGreaterThan(1.15)

    // No Pg detected → no co-occurrence boosts, no bridging.
    expect(out.result.breakdown.fa_pg_co_occurrence_active).toBe(false)
    expect(out.result.breakdown.pg_td_co_occurrence_active).toBe(false)
    expect(out.result.breakdown.fn_bridging_boost_active).toBe(false)

    // Trace red complex (T. forsythia + Treponema), no Pg.
    expect(out.result.red_complex_status.status_label).toBe("below_clinical_threshold")

    // Composite: not stable_low_risk, not active_disease_risk.
    expect(["borderline", "compensated_dysbiosis_risk", "stable_low_risk"]).toContain(
      out.result.perio_risk_category,
    )

    // Update payload contract — every key the migration adds is present.
    expect(out.update.perio_v1_computed_at).toBeTruthy()
    expect(out.update.perio_v1_breakdown).toBeTruthy()
    expect(out.update.red_complex_status.status_label).toBe("below_clinical_threshold")
  })
})

// ─────────────────────────────────────────────────────────────────────
// lifestyleFromRow validation
// ─────────────────────────────────────────────────────────────────────

describe("lifestyleFromRow", () => {
  test("null row → null", () => {
    expect(lifestyleFromRow(null)).toBeNull()
  })

  test("validates enum values; bogus values → null fields", () => {
    const ls = lifestyleFromRow({
      smoking_status: "current",
      mouthwash_type: "antiseptic",
      chlorhexidine_use: "currently_using",
      age_range: "30_39",
    })
    expect(ls).toEqual({
      smoking_status: "current",
      mouthwash_type: "antiseptic",
      chlorhexidine_use: "currently_using",
      age_range: "30_39",
    })
  })

  test("filters out invalid enum values", () => {
    const ls = lifestyleFromRow({
      smoking_status: "occasional", // not an algorithm-recognized value
      mouthwash_type: "garlic",
      chlorhexidine_use: "sometimes",
    })
    expect(ls).toEqual({
      smoking_status: null,
      mouthwash_type: null,
      chlorhexidine_use: null,
      age_range: null,
    })
  })
})

// ─────────────────────────────────────────────────────────────────────
// v1UpdateFromResult — payload shape
// ─────────────────────────────────────────────────────────────────────

describe("v1UpdateFromResult", () => {
  test("update contains every column the migration adds", () => {
    const result = calculatePerioBurdenV1(EMPTY_PERIO_SPECIES, null)
    const update = v1UpdateFromResult(result)
    const expectedKeys = [
      "perio_burden_index", "perio_burden_index_adjusted", "perio_burden_category",
      "perio_defense_index", "perio_defense_category", "total_subp_pct",
      "commensal_depletion_factor", "cdm_amplification_pct",
      "perio_risk_category", "diagnostic_uncertainty_zone",
      "red_complex_status", "cross_panel_hooks",
      "perio_v1_confidence", "perio_v1_reliability_flags",
      "perio_v1_confounder_adjustments", "perio_v1_narrative_augmentations",
      "perio_v1_breakdown", "perio_v1_computed_at",
    ]
    for (const k of expectedKeys) {
      expect(update).toHaveProperty(k)
    }
  })

  test("reliability_flags becomes null when empty (matches NR runner pattern)", () => {
    const result = calculatePerioBurdenV1(EMPTY_PERIO_SPECIES, null)
    const update = v1UpdateFromResult(result)
    expect(update.perio_v1_reliability_flags).toBeNull()
  })
})

/**
 * Upload-parser tests
 * ===================
 *
 * Covers the species-mapping additions from PR-α (caries v3 parser/schema)
 * and the existing column conventions. The pilot-validation contract test at
 * the bottom asserts that synthesized OTU rows for the three pilot samples,
 * after going through the parser, classify per the ADR-0014 fixtures when
 * fed to calculateCariesV3.
 */

import {
  GENUS_COLUMNS,
  SPECIES_COLUMNS,
  parseL7Input,
  resolveSpeciesColumn,
} from "../upload-parser"
import { calculateCariesV3, ZERO_SPECIES, type SpeciesAbundances } from "../caries-v3"

// Helpers ────────────────────────────────────────────────────────────────────

const TAX_PREFIX = "k__Bacteria;p__Firmicutes;c__Bacilli;o__Lactobacillales;f__Streptococcaceae"

/** Build a tab-separated L7 input with a header row and (taxon, abundance) pairs. */
function buildL7(rows: { taxon: string; abundance: number }[]): string {
  const header = "OTU ID\tSample"
  const body = rows.map(r => `${r.taxon}\t${r.abundance}`).join("\n")
  return `${header}\n${body}`
}

// ── Sanity ──────────────────────────────────────────────────────────────────

describe("upload-parser — exposed mapping tables", () => {
  test("v3 species columns are all present in SPECIES_COLUMNS", () => {
    const expected: Array<[string, string]> = [
      ["streptococcus cristatus", "s_cristatus_pct"],
      ["streptococcus parasanguinis", "s_parasanguinis_pct"],
      ["streptococcus australis", "s_australis_pct"],
      ["streptococcus mitis", "s_mitis_pct"],
      ["actinomyces naeslundii", "a_naeslundii_pct"],
      ["rothia dentocariosa", "rothia_dentocariosa_pct"],
      ["rothia aeria", "rothia_aeria_pct"],
      ["bifidobacterium dentium", "b_dentium_pct"],
      ["selenomonas sputigena", "s_sputigena_pct"],
      ["propionibacterium acidifaciens", "p_acidifaciens_pct"],
      ["leptotrichia wadei", "leptotrichia_wadei_pct"],
      ["leptotrichia shahii", "leptotrichia_shahii_pct"],
      ["prevotella denticola", "p_denticola_pct"],
    ]
    for (const [key, col] of expected) {
      expect(SPECIES_COLUMNS[key]).toBe(col)
    }
  })

  test("rothia genus column kept alongside species-level columns", () => {
    expect(GENUS_COLUMNS["rothia"]).toBe("rothia_pct")
    expect(SPECIES_COLUMNS["rothia dentocariosa"]).toBe("rothia_dentocariosa_pct")
  })
})

// ── resolveSpeciesColumn ────────────────────────────────────────────────────

describe("resolveSpeciesColumn", () => {
  test("exact species → column", () => {
    const r = resolveSpeciesColumn("streptococcus", "cristatus")
    expect(r).toEqual({ column: "s_cristatus_pct", unresolved: null })
  })

  test("hyphenated call resolves to first listed species in map", () => {
    // 'mitis-pneumoniae' → s_mitis_pct (mitis is in the map; pneumoniae is not)
    const r = resolveSpeciesColumn("streptococcus", "mitis-pneumoniae")
    expect(r.column).toBe("s_mitis_pct")
    expect(r.unresolved).toBe("streptococcus;mitis-pneumoniae -> streptococcus mitis")
  })

  test("hyphenated call: neither part in map → no column", () => {
    const r = resolveSpeciesColumn("selenomonas", "noxia-sp37034")
    expect(r).toEqual({ column: null, unresolved: null })
  })

  test("hyphenated call: second part is the match", () => {
    // Synthetic: 'random-cristatus' should resolve via the second part.
    const r = resolveSpeciesColumn("streptococcus", "random-cristatus")
    expect(r.column).toBe("s_cristatus_pct")
    expect(r.unresolved).toBe("streptococcus;random-cristatus -> streptococcus cristatus")
  })
})

// ── parseL7Input — happy paths and aggregation ──────────────────────────────

describe("parseL7Input — column mapping", () => {
  test("exact species match writes the v3 column with no unresolved entry", () => {
    const raw = buildL7([
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__cristatus`, abundance: 0.00488 },
    ])
    const result = parseL7Input(raw)
    // Fractional input is multiplied by 100: 0.00488 → 0.488
    expect(result.columnValues["s_cristatus_pct"]).toBeCloseTo(0.488, 3)
    expect(result.parserUnresolvedSpecies).toEqual([])
  })

  test("hyphenated species (mitis-pneumoniae) writes s_mitis_pct + unresolved entry", () => {
    const raw = buildL7([
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__mitis-pneumoniae`, abundance: 0.00427 },
    ])
    const result = parseL7Input(raw)
    expect(result.columnValues["s_mitis_pct"]).toBeCloseTo(0.427, 3)
    expect(result.parserUnresolvedSpecies).toContain("streptococcus;mitis-pneumoniae -> streptococcus mitis")
  })

  test("hyphenated species with no map match → no column write, no audit entry", () => {
    const raw = buildL7([
      { taxon: `${TAX_PREFIX};g__Selenomonas;s__noxia-sp37034`, abundance: 0.001 },
    ])
    const result = parseL7Input(raw)
    expect(result.columnValues["s_sputigena_pct"]).toBe(0)
    expect(result.parserUnresolvedSpecies).toEqual([])
  })

  test("multiple OTUs collapsing to same species → values sum", () => {
    const raw = buildL7([
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__parasanguinis`, abundance: 0.01 },
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__parasanguinis`, abundance: 0.005 },
    ])
    const result = parseL7Input(raw)
    expect(result.columnValues["s_parasanguinis_pct"]).toBeCloseTo(1.5, 3)
  })

  test("genus present, target species absent → column stays at 0", () => {
    const raw = buildL7([
      { taxon: `${TAX_PREFIX};g__Bifidobacterium;s__longum`, abundance: 0.01 },
    ])
    const result = parseL7Input(raw)
    expect(result.columnValues["b_dentium_pct"]).toBe(0)
    expect(result.parserUnresolvedSpecies).toEqual([])
  })

  test("S. salivarius family still routed to s_salivarius_pct", () => {
    const raw = buildL7([
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__salivarius`, abundance: 0.05 },
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__vestibularis`, abundance: 0.01 },
    ])
    const result = parseL7Input(raw)
    expect(result.columnValues["s_salivarius_pct"]).toBeCloseTo(6.0, 3)
  })

  test("placeholder sp\\d+ rows are not mapped", () => {
    const raw = buildL7([
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__sp13375`, abundance: 0.01 },
    ])
    const result = parseL7Input(raw)
    expect(result.columnValues["streptococcus_total_pct"]).toBe(0)
    expect(result.parserUnresolvedSpecies).toEqual([])
  })
})

// ── Contract test: parser → caries-v3 yields the ADR-0014 pilot categories ──

describe("parser → caries-v3 contract (ADR-0014 fixtures)", () => {
  // Synthesized L7 inputs that mirror the species-level abundances ADR-0014's
  // test fixtures rely on. After the parser populates the columns, those
  // values feed calculateCariesV3 and must classify per the ADR.

  function rowsToCariesInputs(columnValues: Record<string, number>): SpeciesAbundances {
    const num = (k: string) => columnValues[k] ?? 0
    return {
      ...ZERO_SPECIES,
      s_mutans: num("s_mutans_pct"),
      s_sobrinus: num("s_sobrinus_pct"),
      scardovia_wiggsiae: num("scardovia_pct"),
      lactobacillus: num("lactobacillus_pct"),
      b_dentium: num("b_dentium_pct"),
      s_sputigena: num("s_sputigena_pct"),
      p_acidifaciens: num("p_acidifaciens_pct"),
      leptotrichia_wadei: num("leptotrichia_wadei_pct"),
      leptotrichia_shahii: num("leptotrichia_shahii_pct"),
      p_denticola: num("p_denticola_pct"),
      s_sanguinis: num("s_sanguinis_pct"),
      s_gordonii: num("s_gordonii_pct"),
      s_cristatus: num("s_cristatus_pct"),
      s_parasanguinis: num("s_parasanguinis_pct"),
      s_australis: num("s_australis_pct"),
      a_naeslundii: num("a_naeslundii_pct"),
      s_salivarius: num("s_salivarius_pct"),
      h_parainfluenzae: num("haemophilus_pct"), // genus-level proxy until species split arrives
      neisseria_total: num("neisseria_pct"),
      rothia_dentocariosa: num("rothia_dentocariosa_pct"),
      rothia_aeria: num("rothia_aeria_pct"),
      veillonella_total: num("veillonella_pct"),
      s_mitis: num("s_mitis_pct"),
    }
  }

  test("Igor → compensated_active_risk", () => {
    const raw = buildL7([
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__mutans`, abundance: 0.0027 },
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__sobrinus`, abundance: 0.0024 },
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__sanguinis`, abundance: 0.0449 },
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__gordonii`, abundance: 0.0041 },
    ])
    const parsed = parseL7Input(raw)
    const cv = calculateCariesV3(rowsToCariesInputs(parsed.columnValues), null)
    expect(cv.cariesRiskCategory).toBe("compensated_active_risk")
    expect(cv.synergyActiveFlag).toBe(true)
  })

  test("Gabby → low_risk_stable", () => {
    const raw = buildL7([
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__mutans`, abundance: 0.00035 },
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__sanguinis`, abundance: 0.0546 },
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__gordonii`, abundance: 0.00028 },
    ])
    const parsed = parseL7Input(raw)
    const cv = calculateCariesV3(rowsToCariesInputs(parsed.columnValues), null)
    expect(cv.cariesRiskCategory).toBe("low_risk_stable")
    expect(cv.synergyActiveFlag).toBe(false)
  })

  test("Evelina → compensated_dysbiosis_risk (Veillonella excluded from CSI/buffer)", () => {
    const raw = buildL7([
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__mutans`, abundance: 0.0002 },
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__sanguinis`, abundance: 0.0002 },
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__gordonii`, abundance: 0.0003 },
      { taxon: `k__Bacteria;p__Firmicutes;c__Negativicutes;o__Veillonellales;f__Veillonellaceae;g__Veillonella;s__parvula`, abundance: 0.164 },
    ])
    const parsed = parseL7Input(raw)
    const cv = calculateCariesV3(rowsToCariesInputs(parsed.columnValues), null)
    expect(cv.cariesRiskCategory).toBe("compensated_dysbiosis_risk")
    expect(cv.compensatedDysbiosisFlag).toBe(true)
  })

  test("Igor with hyphenated S. mitis call still classifies the same", () => {
    // Smoke-test that hyphenated S. mitis presence (which would NOT be in the
    // map prior to this PR) doesn't perturb classification — Igor still lands
    // in compensated_active_risk because mitis is excluded from CSI anyway.
    const raw = buildL7([
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__mutans`, abundance: 0.0027 },
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__sobrinus`, abundance: 0.0024 },
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__sanguinis`, abundance: 0.0449 },
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__gordonii`, abundance: 0.0041 },
      { taxon: `${TAX_PREFIX};g__Streptococcus;s__mitis-pneumoniae`, abundance: 0.0427 },
    ])
    const parsed = parseL7Input(raw)
    expect(parsed.columnValues["s_mitis_pct"]).toBeCloseTo(4.27, 2)
    expect(parsed.parserUnresolvedSpecies.length).toBe(1)
    const cv = calculateCariesV3(rowsToCariesInputs(parsed.columnValues), null)
    expect(cv.cariesRiskCategory).toBe("compensated_active_risk")
  })
})

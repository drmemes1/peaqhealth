/**
 * Tests for the v3 species backfill script's `reparseEntries` function.
 *
 * The backfill script re-projects `raw_otu_table.__meta.entries` through
 * the same SPECIES_COLUMNS / GENUS_COLUMNS tables that the upload parser
 * uses. Pre-PR-248 it dropped placeholder rows (`is_named=false` with a
 * Zymo `sp\d+` call), which caused kits with significant placeholder
 * abundance to have under-counted genus columns on backfill — e.g.
 * Pilot.Peaq.1's porphyromonas_pct projected to 0.28% instead of the
 * 2.18% the upload parser produced after PR-247.
 *
 * This test mirrors the four placeholder-aggregation cases added in
 * PR-247 (ADR-0017), now exercised against the backfill code path
 * instead of the upload parser. See ADR-0018.
 */

import {
  reparseEntries,
  type Entry,
} from "../../../../../scripts/backfill-caries-v3-species"

function placeholder(genus: string, species: string, pct: number): Entry {
  return { genus, species, pct, is_named: false, is_placeholder: true }
}

function named(genus: string, species: string, pct: number): Entry {
  return { genus, species, pct, is_named: true, is_placeholder: false }
}

describe("backfill reparseEntries — placeholder aggregation (PR-248)", () => {
  test("placeholder Porphyromonas (sp13375) at 1.5% sums into porphyromonas_pct", () => {
    const entries: Entry[] = [placeholder("Porphyromonas", "sp13375", 1.5)]
    const { columnValues } = reparseEntries(entries)
    expect(columnValues.porphyromonas_pct).toBeCloseTo(1.5, 4)
  })

  test("named + placeholder Porphyromonas aggregate together (700df5f scenario)", () => {
    // Re-creates the exact regression scenario from commit 700df5f:
    // one named species (0.28%) plus one placeholder (1.90%) sum to 2.18%.
    const entries: Entry[] = [
      named("Porphyromonas", "endodontalis", 0.28),
      placeholder("Porphyromonas", "sp13375", 1.9),
    ]
    const { columnValues } = reparseEntries(entries)
    expect(columnValues.porphyromonas_pct).toBeCloseTo(2.18, 4)
  })

  test("placeholder Streptococcus feeds streptococcus_total_pct", () => {
    const entries: Entry[] = [placeholder("Streptococcus", "sp13375", 1.0)]
    const { columnValues } = reparseEntries(entries)
    expect(columnValues.streptococcus_total_pct).toBeCloseTo(1.0, 4)
  })

  test("placeholder Prevotella feeds prevotella_commensal_pct", () => {
    const entries: Entry[] = [placeholder("Prevotella", "sp99999", 0.5)]
    const { columnValues } = reparseEntries(entries)
    expect(columnValues.prevotella_commensal_pct).toBeCloseTo(0.5, 4)
  })

  test("placeholder Veillonella sums into veillonella_pct alongside named species", () => {
    const entries: Entry[] = [
      named("Veillonella", "parvula", 2.5776),
      named("Veillonella", "atypica", 1.2243),
      placeholder("Veillonella", "sp22222", 10.2),
    ]
    const { columnValues } = reparseEntries(entries)
    // 2.5776 + 1.2243 + 10.2 = 14.0019
    expect(columnValues.veillonella_pct).toBeCloseTo(14.0019, 4)
  })

  test("NA-genus placeholders are skipped", () => {
    // Zymo emits unclassified rows as `g__NA;s__sp33423`. These must NOT
    // be assigned to any genus column.
    const entries: Entry[] = [
      placeholder("NA", "sp33423", 1.92),
      named("Rothia", "mucilaginosa", 7.3846),
    ]
    const { columnValues } = reparseEntries(entries)
    expect(columnValues.rothia_pct).toBeCloseTo(7.3846, 4)
    // No bucket should pick up the NA placeholder.
    const totalNonZero = Object.entries(columnValues)
      .filter(([, v]) => v > 0)
      .reduce((s, [, v]) => s + v, 0)
    expect(totalNonZero).toBeCloseTo(7.3846, 4)
  })

  test("named species still take priority over placeholder genus aggregation", () => {
    // Sanity: pre-existing behavior must be preserved. A named species that
    // matches SPECIES_COLUMNS lands in its species column, not genus sum.
    const entries: Entry[] = [named("Streptococcus", "mutans", 0.5)]
    const { columnValues } = reparseEntries(entries)
    expect(columnValues.s_mutans_pct).toBeCloseTo(0.5, 4)
    // Streptococcus genus accumulator still ticks because of the
    // `if (genusLower === "streptococcus") strepTotal += pct` line that
    // runs for every Streptococcus row, named or placeholder.
    expect(columnValues.streptococcus_total_pct).toBeCloseTo(0.5, 4)
  })
})

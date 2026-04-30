# ADR-0018: Restore placeholder aggregation in the v3 species backfill script

Date: 2026-04-30
Status: Accepted (regression fix; algorithm unchanged)

## Context

ADR-0017 / PR-247 restored placeholder-species aggregation in the
upload parser (`apps/web/lib/oral/upload-parser.ts`) after PR-245's
extraction silently dropped the v2 `else if (taxo.is_placeholder &&
taxo.genus && taxo.genus !== "NA")` branch. PR-247's commit message
records the impact on real kit data:

> Igor's Porphyromonas corrected from 0.28% to 2.18% (+678%).

The v3 species backfill script lives at
`scripts/backfill-caries-v3-species.ts`. It re-projects existing
`raw_otu_table.__meta.entries` rows through the same `SPECIES_COLUMNS`
/ `GENUS_COLUMNS` tables to populate the 13 v3 species columns added
in PR-α. It does **not** import the upload parser's `parseL7Input` —
it has its own inline `reparseEntries` function that walks the
already-parsed entry list. That function was authored alongside PR-α
and inherited the same blind spot as the pre-PR-247 upload parser:
its loop body started with `if (!entry.is_named) continue`, so every
placeholder row was discarded before it could contribute to a genus
sum.

PR-247 fixed only the upload-parser path. The backfill path was
untouched.

The regression was discovered while running PR-α's species backfill
in `DRY_RUN=1` against kit `c033fbae-ab5a-42a5-ace4-f1ac09995338`
(Pilot.Peaq.1, Igor's own clinical sample). Expected post-PR-247
genus sums for that kit were:

| column            | pre-PR-247 (DB) | post-PR-247 expected |
| ----------------- | --------------- | -------------------- |
| `porphyromonas_pct` | 2.18           | ≈ 2.18 (unchanged)   |
| `veillonella_pct`   | 4.29           | rises with placeholder Veillonella share |
| `s_sanguinis_pct`   | 1.9009         | 2.23+ (hyphenated-call resolution adds infantis-sanguinis) |

The dry-run produced `porphyromonas_pct = 0.28` — a 7× drop that
would have overwritten the correct value in the DB on the first live
backfill. Inspecting the kit's `__meta.entries` showed
`Porphyromonas sp13375` at 1.8754% with `is_named=false,
is_placeholder=true` — a Zymo unresolved-OTU call that the backfill
silently skipped.

Running v3 species columns and genus totals through this script
without the fix would write 7× lower porphyromonas, plus similar
silent under-counts for any kit with significant placeholder share,
into a real medical record.

## Decision

Mirror PR-247 in `scripts/backfill-caries-v3-species.ts`. Replace the
unconditional `if (!entry.is_named) continue` skip with a placeholder
branch that aggregates `is_placeholder` rows into the parent genus
column when the genus is real (not `"NA"`). The three accumulator
paths match the upload parser's structure verbatim:

1. **Genera with a `GENUS_COLUMNS` entry** (Porphyromonas, Veillonella,
   Fusobacterium, Neisseria, Rothia, Actinomyces, …): placeholder pct
   sums into the genus column.
2. **Streptococcus** (no `GENUS_COLUMNS` entry): placeholder pct ticks
   `strepTotal`, which drives `streptococcus_total_pct`.
3. **Prevotella** (no `GENUS_COLUMNS` entry): placeholder pct ticks
   `prevotellaCommensalTotal`, matching v2 — non-intermedia Prevotella
   is treated as commensal.

`NA`-genus placeholders (`g__NA;s__sp33423`) continue to be skipped —
there's no parent genus to aggregate into.

## Two parser paths exist

This is the structural problem ADR-0018 documents and that future
work should retire:

| Path                                              | Module                                        | Used by               |
| ------------------------------------------------- | --------------------------------------------- | --------------------- |
| `parseL7Input` (TSV → entries + column values)    | `apps/web/lib/oral/upload-parser.ts`          | Upload route          |
| `reparseEntries` (entries → column values only)   | `scripts/backfill-caries-v3-species.ts`       | One-off backfill      |

The two paths share `SPECIES_COLUMNS`, `GENUS_COLUMNS`, and
`resolveSpeciesColumn` (all imported from the upload-parser module).
They do **not** share the per-entry projection logic. PR-247 fixed
the upload-parser path but had no way to flag that the backfill
maintained an independent (and now divergent) copy of the same logic.

The two paths are not perfectly symmetric — `parseL7Input` parses raw
TSV into typed entries, while `reparseEntries` operates on entries
that are already parsed — but the species-column / genus-column
projection at the end is the same operation, duplicated.

## Recommendation: future consolidation (not part of this PR)

A follow-up should extract the shared per-entry projection into a
single function and have both paths consume it. Sketch:

```ts
// apps/web/lib/oral/projection.ts
export function projectEntriesToColumns(entries: ParsedEntry[]): {
  columnValues: Record<string, number>
  unresolved: string[]
}
```

`parseL7Input` would call it after building `ParsedEntry[]` from the
TSV; `reparseEntries` would import and call it directly. Both the
named-species mapping (`SPECIES_COLUMNS` lookup, hyphenated-call
resolution) and the placeholder-aggregation branch (this ADR) would
live in exactly one place. Any future fix or v4 species addition
would update one site and be picked up by both code paths.

Tracked as a follow-up; intentionally out of scope for PR-248 to keep
the regression fix narrow and reviewable.

## Tests

`apps/web/lib/oral/__tests__/backfill-caries-v3-species.test.ts`
(new file). Seven cases:

- **placeholder Porphyromonas → porphyromonas_pct** — single
  `g__Porphyromonas;s__sp13375` at 1.5% projects to
  `porphyromonas_pct = 1.5`.
- **named + placeholder Porphyromonas aggregate (700df5f scenario)** —
  `endodontalis` at 0.28% plus `sp13375` at 1.90% sum to 2.18%
  in `porphyromonas_pct` (mirrors PR-247's regression case in the
  backfill code path).
- **placeholder Streptococcus → streptococcus_total_pct** — exercises
  the no-`GENUS_COLUMNS`-entry Streptococcus path.
- **placeholder Prevotella → prevotella_commensal_pct** — exercises
  the no-`GENUS_COLUMNS`-entry Prevotella path.
- **placeholder Veillonella sums alongside named species** — two named
  Veillonella + one placeholder sum to 14.0019% in `veillonella_pct`.
- **`NA`-genus placeholders are skipped** — `g__NA;s__sp33423` does
  not contribute to any column.
- **Named species still take priority over genus aggregation** —
  sanity check that pre-existing behavior is preserved.

To make the function unit-testable, the script now exports
`reparseEntries` and `Entry`, and guards the `main()` call with
`if (require.main === module)` so importing the script for tests does
not trigger a Supabase connection.

## What this PR does NOT change

- **`parseL7Input` / upload-parser** — already fixed in PR-247.
  Untouched here.
- **`caries-v3.ts` algorithm** — read-only.
- **v3 species map / hyphenated-call resolution** — `SPECIES_COLUMNS`,
  `GENUS_COLUMNS`, and `resolveSpeciesColumn` are unchanged.
- **Migrations** — none.
- **No live backfill is executed by this PR.** The script remains a
  manually-triggered tool. PR-α's species backfill will be re-run
  separately, after PR-248 lands, with the corrected projection.

## Consequences

After PR-248 lands, re-running PR-α's species backfill in `DRY_RUN=1`
against Pilot.Peaq.1 should restore:

- `porphyromonas_pct ≈ 2.18%` (was projecting 0.28%).
- Genus columns for any other genus that has placeholder rows in the
  persisted entries (e.g. Veillonella with significant `sp\d+` share).

Per-species columns (`s_sanguinis_pct`, `s_mutans_pct`, `s_cristatus_pct`,
…) are unaffected by this fix — placeholders never resolved to a
species column under either the v2 or v3 mapping.

## References

- ADR-0017 / PR-247 — placeholder aggregation restored in upload
  parser. Same fix, different code path.
- Commit `700df5f` — original v2 fix that ADR-0017 restored (and that
  ADR-0018 now mirrors in the backfill).
- ADR-0014 / PR-244 — caries v3 algorithm (read-only here).
- ADR-0015 / PR-α (PR-245) — v3 species map and parser-extraction
  origin point.
- PR-246 — v3 outputs backfill (separate script; consumes the
  corrected species/genus totals on next dry-run).

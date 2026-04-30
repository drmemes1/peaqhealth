# ADR-0017: Restore placeholder-species aggregation in upload parser

Date: 2026-04-30
Status: Accepted (regression fix; algorithm unchanged)

## Context

PR-245 (ADR-0015) extracted `parseL7Input` and the species/genus mapping
tables out of `app/api/admin/oral-upload/route.ts` into a new pure module
at `apps/web/lib/oral/upload-parser.ts`. The extraction added the v3
species map and hyphenated-call resolution, both verified by Jest tests
against synthetic fixtures.

What the test suite did not cover: placeholder species (Zymo's
unresolved-OTU naming, e.g. `s__sp13375`). The pre-PR-245 v2 parser had
an explicit `else if (taxo.is_placeholder && taxo.genus && taxo.genus !== "NA")`
branch that aggregated placeholder rows into the parent-genus column.
That branch was lost during the extraction.

The original v2 fix lives in commit
[`700df5f`](https://github.com/drmemes1/peaqhealth/commit/700df5f)
("fix: parser aggregates placeholder species (sp+digits) into parent
genus") — its commit message records the impact on a real kit:

> Igor's Porphyromonas corrected from 0.28% to 2.18% (+678%).

After PR-245 merged, that 0.28% → 2.18% lift silently undone for any
kit re-parsed via the new module: placeholder pct is now recorded in
`raw_otu_table.__meta.entries` (with `mapping_type: "placeholder"`) but
not added to any genus accumulator. The regression was discovered while
investigating a per-species discrepancy between
`oral_kit_orders.s_sanguinis_pct` and the implicit sum across the OTU
table (production data inspection on existing kits).

## Decision

Restore the placeholder-aggregation branch in
`apps/web/lib/oral/upload-parser.ts`, mirroring v2's behavior verbatim:

```ts
} else if (taxo.is_placeholder && taxo.genus && taxo.genus !== "NA") {
  if (GENUS_COLUMNS[genusLower]) {
    mapped_column = GENUS_COLUMNS[genusLower]
    genusSums[mapped_column] = (genusSums[mapped_column] ?? 0) + pct
  }
  if (genusLower === "streptococcus") strepTotal += pct
  if (genusLower === "prevotella") prevotellaCommensalTotal += pct
}
```

Three accumulator paths, matching the genus-shape conventions already
in the parser:

1. **Genera with a `GENUS_COLUMNS` entry** (e.g. Porphyromonas, Veillonella,
   Fusobacterium, Neisseria, Rothia, …): placeholder pct sums into the
   genus column.
2. **Streptococcus**: no `GENUS_COLUMNS` entry; placeholder pct ticks
   the `strepTotal` accumulator that drives `streptococcus_total_pct`.
3. **Prevotella**: no `GENUS_COLUMNS` entry; placeholder pct ticks
   `prevotellaCommensalTotal` (matching v2 — non-intermedia Prevotella
   is treated as commensal).

## Tests

`apps/web/lib/oral/__tests__/upload-parser.test.ts` updated:

- `placeholder sp\d+ Streptococcus rows feed streptococcus_total_pct`
  — single `s__sp13375` row at 0.01 fractional → 1.0% in
  `streptococcus_total_pct`.
- `placeholder sp\d+ Veillonella rows feed veillonella_pct` — single
  `s__sp99999` row → contributes to `veillonella_pct` and
  `mapping_type` is recorded as `placeholder`.
- `named + placeholder rows aggregate together — Porphyromonas case
  from 700df5f` — re-creates the exact scenario from the original
  incident: one named `s__endodontalis` (0.28%) plus one placeholder
  `s__sp13375` (1.90%) sum to 2.18% in `porphyromonas_pct`.
- `placeholder Prevotella rows feed prevotella_commensal_pct` —
  exercises the no-`GENUS_COLUMNS`-entry path.

Replaces the previous (incorrect) test
`placeholder sp\d+ rows are not mapped` that was codifying the
regressed behavior.

## What this PR does NOT change

- **`caries-v3.ts` algorithm** — read-only. v3 weights, thresholds, and
  classification logic are untouched.
- **v3 species map / hyphenated-call resolution** — `SPECIES_COLUMNS`
  and `resolveSpeciesColumn` are unchanged.
- **Migrations** — none added or modified.
- **Backfill scripts** — none run from this PR. `scripts/backfill-caries-v3-species.ts`
  (PR-α) and `scripts/backfill-caries-v3-outputs.ts` (PR-β1) are
  unmodified. After this PR merges, **rerunning** PR-α's species
  backfill will pick up placeholder rows that were previously dropped,
  which is the intended downstream effect.

## Consequences

For kits with significant placeholder share (Streptococcus,
Veillonella, Porphyromonas in pilot data):

- **Genus column sums increase** by the placeholder contribution.
- **Per-species columns** (s_sanguinis_pct, s_mutans_pct, etc.) are
  **unchanged** — placeholders never resolved to species columns in v2
  either.
- **`raw_otu_table.__meta.entries`** is unchanged in shape; the only
  diff is `mapped_column` is now populated for placeholder rows that
  hit a `GENUS_COLUMNS` entry.

After re-running PR-α's species backfill, expect Igor's
`porphyromonas_pct` to return to ≈ 2.18% (matching the v2 post-700df5f
state).

## Forward note

PR-246's verification dry-run (caries v3 outputs against pilot kits)
should be re-run after PR-α's species backfill is re-executed on top of
this fix, so v3 classifications reflect the corrected genus totals.

## References

- PR-245 / ADR-0015 — parser extraction that introduced the regression.
- Commit `700df5f` — original v2 fix that this PR restores in module form.
- ADR-0014 / PR-244 — caries v3 algorithm (read-only here).
- PR-246 / ADR-0016 — pipeline integration (unaffected; consumes the
  corrected species/genus totals on next dry-run).

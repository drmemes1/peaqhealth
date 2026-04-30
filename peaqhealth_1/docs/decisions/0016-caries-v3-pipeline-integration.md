# ADR-0016: Caries v3 pipeline integration (PR-β1)

Date: 2026-04-30
Status: Accepted (pipeline live; UI cutover pending PR-β2)

## Context

Caries v3 has the algorithm (PR-244 / ADR-0014), the parser & species
columns (PR-245 / ADR-0015), and the supporting Jest contract tests. What
was missing: nothing called `calculateCariesV3` against real kits, so the
algorithm's output never reached `oral_kit_orders` or anything downstream.
This PR closes that gap.

This is plumbing-only. No UI changes. No narrative-engine prompt updates.
v2 caries-panel outputs continue to be written alongside v3, so existing
consumers keep working until PR-β2 cuts the UI over.

## Decision

### Schema

19 new output columns on `oral_kit_orders` (see
`supabase/migrations/20260430_caries_v3_output_columns.sql`):

| Column | Type | Notes |
|---|---|---|
| `ph_balance_api_v3` | numeric | v3 pH balance API |
| `ph_balance_api_v3_category` | text | well_buffered / mildly_acidogenic / moderately_acidogenic / strongly_acidogenic |
| `cariogenic_load_v3` | numeric | v3 CLI |
| `cariogenic_load_v3_category` | text | minimal / low / elevated / high |
| `protective_ratio_v3` | numeric | nullable when cavityMakers < 0.05 |
| `protective_ratio_v3_category` | text | no_cavity_makers / weak / moderate / strong / very_strong |
| `commensal_sufficiency_index` | numeric | 0–100 normalized for display |
| `commensal_sufficiency_category` | text | severely_depleted / depleted / reduced / adequate / robust |
| `ads_primary_pct` | numeric | sanguinis + gordonii + cristatus |
| `ads_extended_pct` | numeric | + parasanguinis + australis + naeslundii |
| `compensated_dysbiosis_flag` | boolean | DEFAULT false |
| `synergy_active_flag` | boolean | DEFAULT false (S. mutans ≥ 0.05%) |
| `caries_risk_category` | text | the headline four-quadrant classification |
| `caries_v3_confidence` | text | low / moderate / high |
| `caries_v3_reliability_flags` | text[] | nullable; null = no flags (not empty array) |
| `caries_v3_confounder_adjustments` | jsonb | DEFAULT '{}' |
| `caries_v3_breakdown` | jsonb | algorithm internals (acidSum, bufferSum, etc.) |
| `caries_v3_computed_at` | timestamptz | idempotency / freshness sentinel |

Categorical fields are stored as `text` (no enum constraint at the DB
layer). The application is the source of truth via the v3 union types in
`lib/oral/caries-v3.ts`.

### Pipeline integration

A new pure module `apps/web/lib/oral/caries-v3-runner.ts` wraps the
pipeline glue:

- `speciesFromKitRow(row)` — builds `SpeciesAbundances` from an
  `oral_kit_orders` row, defaulting every field to 0 (matching the
  PR-α `DEFAULT 0` contract).
- `lifestyleFromRow(row)` — builds `LifestyleConfounders` from a
  `lifestyle_records` row. **Direct field-to-field passthrough** —
  ADR-0014 already aligned the v3 type with the existing column
  vocabulary (`antibiotics_window`, `sugar_intake`, `chlorhexidine_use`,
  `xerostomia_self_report`), so no translation layer is needed. Invalid
  enum values coerce to `null`. `gerd` prefers the `gerd` boolean
  column and falls back to `gerd_nocturnal`.
- `v3UpdateFromResult(result)` — produces the 19-key DB update payload.
- `runCariesV3(kit, lifestyle)` — full pipeline. **Soft-fail**: returns
  `null` and logs to `console.error` on any throw. Caller proceeds with
  v2 outputs unaffected.

`app/api/admin/oral-upload/route.ts` calls `runCariesV3` in both the
upload path and the reparse path, immediately after the v2
`computeCariesPanel` write. The v3 update is a separate `.update()` so a
v3 error never blocks v2 results from landing.

### Lifestyle-vocabulary decision (mapping helpers NOT introduced)

The brief proposed `mapAntibioticsWindow(...)` → `antibiotics_recent`
and `mapSugarIntake(...)` → `sugary_foods_freq` translation helpers.
ADR-0014 already locked the v3 type to the existing column vocabulary
specifically to avoid that translation layer:

```ts
antibiotics_window: "past_30" | "31_to_60" | "61_to_90" | "over_90"
                  | "never_year" | "not_sure" | null
sugar_intake:      "rarely" | "few_weekly" | "daily" | "multiple_daily" | null
```

`lifestyleFromRow` therefore reads these columns directly and validates
the enum at the boundary. No new mapping module, no parallel column
namespace, no extra place for vocabularies to drift.

### Soft-fail and missing-lifestyle behavior

- v3 runner failure → log + return null → kit processing continues with
  v2 results only. `caries_v3_computed_at` stays NULL so the backfill
  picks the kit up next run.
- Missing `lifestyle_records` row → `lifestyleFromRow(null)` returns
  null → `calculateCariesV3` runs without confounder adjustments.
  `caries_v3_confounder_adjustments` lands as `{}`. This is the correct
  behavior — many users complete a kit before doing the lifestyle
  questionnaire.

### Backfill

`scripts/backfill-caries-v3-outputs.ts` scans every kit with a populated
`raw_otu_table`, joins the user's most recent lifestyle row in memory
(one query for all users), runs the runner, and writes the v3 update.
Idempotent (skips kits whose `caries_v3_computed_at` is set unless
`FORCE=1`). Supports `DRY_RUN=1` and `ONLY=<id1,id2,…>`.

The dry run emits a per-kit summary and a final risk-category
distribution — the validation gate before live backfill.

### Backwards compatibility

v2 caries-panel columns (`ph_balance_api`, `cariogenic_load_pct`,
`protective_ratio`, etc.) are **not** removed in this PR. They continue
to be written by `computeCariesPanel` in both the upload and reparse
paths. The UI / narrative engine still reads v2 today; PR-β2 will
switch consumers to v3, after which v2 columns can be deprecated in a
focused cleanup PR.

## Validation gate

Before merge, run the backfill in `DRY_RUN=1` mode against production
and confirm:

- Igor's kit (`s_mutans_pct ≈ 0.27`, robust ADS) →
  `compensated_active_risk`.
- Gabby's kit (`s_mutans_pct ≈ 0.035`, robust ADS) → `low_risk_stable`.
- Evelina's kit, if present (severely depleted ADS, Veillonella high) →
  `compensated_dysbiosis_risk`.

If any kit deviates, **do not merge** — paste the actual classifications
into the PR thread and we'll diagnose data vs pipeline causes.

The 58 oral-lib Jest tests (21 v3 + 17 parser + 20 runner) prove the
algorithmic side of the contract:
`apps/web/lib/oral/__tests__/caries-v3-runner.test.ts` exercises the
exact pilot rows used in production and asserts they classify per
ADR-0014.

## Non-goals

- No UI changes. PR-β2 owns the rewire to lead with `caries_risk_category`.
- No narrative-engine prompt updates. PR-β2.
- No v2 column deprecation. Separate cleanup PR after v3 stabilizes.
- No new lifestyle questionnaire fields. PR-244 (chlorhexidine + xerostomia)
  was the last addition for v3.
- No oral_kit_orders schema cleanup or column renames.

## Open questions

- **When to deprecate v2 caries columns?** Recommendation: after ≥ 30
  kits have run on v3 cleanly, the UI has cut over (PR-β2), and there
  are no open bug reports tied to v3 outputs. Then a single cleanup PR
  drops `ph_balance_api`, `ph_balance_category`, `ph_balance_confidence`,
  `cariogenic_load_pct`, `cariogenic_load_category`, `protective_ratio`,
  `protective_ratio_category`. Not in scope here.

## Next PR (PR-β2)

- UI: lead with `caries_risk_category`; reorder the caries section per
  the brief; surface confounder badges from `caries_v3_confounder_adjustments`.
- Narrative engine: feed `caries_v3_confidence`, `reliability_flags`,
  and `confounder_adjustments` into the LLM prompt.
- `OralKitData` reads the v3 columns from `lifestyle_records` /
  `oral_kit_orders` (PR-244 already added the optional fields to the
  type; this PR confirms they read correctly, but the consumer wire-up
  lands with the UI work).

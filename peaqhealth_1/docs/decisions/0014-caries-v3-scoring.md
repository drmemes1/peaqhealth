# ADR-0014: Caries scoring v3 (foundation slice)

Date: 2026-04-30
Status: Foundation accepted; full pipeline integration blocked on PR-α (parser/schema)

## Context

Caries v2 (`apps/web/lib/oral/caries-panel.ts`) computes three metrics —
pH Balance API, Cariogenic Load Index, Protective Ratio — from the
species columns the QIIME upload parser writes to
`oral_kit_orders.*_pct`. A literature-evidence review (~50 papers,
April 2026) plus three pilot samples surfaced specific gaps:

- Veillonella was treated as a buffer; recent literature (Wei 2024,
  Gross 2012, Liu 2020) reclassifies it as a pathobiont.
- S. mitis was treated as ADS+; classic biochemistry (Price 1986)
  shows it is arginine-negative.
- ADS+ Streptococci were not tiered by evidence weight despite
  meaningful differences (Huang 2015, Liu 2008).
- The CLI didn't include several validated cariogen synergists:
  S. sputigena (Cho 2023), B. dentium (Henne 2015),
  P. acidifaciens (Wolff 2013), Leptotrichia wadei/shahii
  (Kahharova 2023), P. denticola (Niu 2023).
- The system had no representation of the *compensated dysbiosis*
  phenotype where pathogens have not yet bloomed but commensal
  buffers are depleted (the Evelina pilot profile).

## Decision

This PR ships the **safe slice** of the v3 redesign:

1. A pure scoring module at `apps/web/lib/oral/caries-v3.ts`
   implementing the v3 algorithm — three core metrics, two new
   metrics (CSI, ADS-primary/-extended), the synergy threshold, the
   compensated-dysbiosis flag, the four-quadrant risk classification,
   and lifestyle-driven confounder adjustments. Pure data in, pure
   data out — no I/O, no DB.
2. Comprehensive Jest unit tests covering all three pilot fixtures
   (Igor active-risk, Gabby stable, Evelina compensated dysbiosis),
   the synergy threshold edge, every confounder branch, and core
   invariants (S. mitis exclusion, Veillonella excluded from buffer,
   confounders never change underlying scores).
3. Optional v3 fields added to the `OralKitData` type (no DB columns;
   reserved for the pipeline-integration PR).
4. Five methodology entries in `methodologyKnowledge.ts` so the
   scores have shipping-quality provenance from day one.
5. A migration adding two genuinely new columns to `lifestyle_records`
   — `chlorhexidine_use` and `xerostomia_self_report` — and the
   matching wizard questions / API allowlist entries.

It explicitly does **not** ship:

- Schema changes to `oral_kit_orders`. The new species columns the v3
  module needs would be empty until PR-α extends the parser. See
  prerequisites below.
- Pipeline integration. Nothing computes a `CariesV3Result` against
  user data yet.
- UI changes. The brief referenced a `CariesPanel.tsx` that does not
  exist in the repo; the new UI surface will be invented in a
  dedicated UI PR after PR-α lands.
- Narrative engine v3 prompt updates. They depend on real v3 outputs.
- Backfill of existing kits. Same dependency.

## Reuse, not duplicate

The v3 confounder logic uses the **existing** `lifestyle_records`
columns rather than introducing parallel ones:

| Brief proposed | Repo has (reused) |
|---|---|
| `sugary_foods_freq` (`rarely / few_per_week / daily / multiple_daily`) | `sugar_intake` (`rarely / few_weekly / daily / multiple_daily`) |
| `antibiotics_recent` (`none / within_1mo / within_3mo / over_3mo`) | `antibiotics_window` (`past_30 / 31_to_60 / 61_to_90 / over_90 / never_year / not_sure`) |

The v3 module's `LifestyleConfounders.antibiotics_window === 'past_30'`
branch maps the existing "within ~1 month" value to the
`antibiotic_disruption` reliability flag and recovery-window
adjustment. `sugar_intake === 'daily' | 'multiple_daily'` triggers
the diet-bacteria-loop / no-buffer-recovery framings.

Only the two confounders that genuinely had no home — chlorhexidine
exposure and self-reported xerostomia — get new columns.

## Hard prerequisites for v3 wiring (PR-α)

Before any v3 results can be persisted to `oral_kit_orders` or
surfaced in the UI, the upload parser at
`apps/web/app/api/admin/oral-upload/route.ts` must extract these
species into dedicated columns. They do not exist in the schema today:

| `SpeciesAbundances` field | New column to add | Source taxon |
|---|---|---|
| `b_dentium` | `b_dentium_pct` | Bifidobacterium dentium |
| `s_sputigena` | `s_sputigena_pct` | Selenomonas sputigena |
| `p_acidifaciens` | `p_acidifaciens_pct` | Propionibacterium acidifaciens |
| `leptotrichia_wadei` | `leptotrichia_wadei_pct` | Leptotrichia wadei |
| `leptotrichia_shahii` | `leptotrichia_shahii_pct` | Leptotrichia shahii |
| `p_denticola` | `p_denticola_pct` | Prevotella denticola |
| `s_cristatus` | `s_cristatus_pct` | Streptococcus cristatus |
| `s_parasanguinis` | `s_parasanguinis_pct` | Streptococcus parasanguinis |
| `s_australis` | `s_australis_pct` | Streptococcus australis |
| `a_naeslundii` | `a_naeslundii_pct` | Actinomyces naeslundii |
| `s_mitis` | `s_mitis_pct` | Streptococcus mitis |
| `rothia_dentocariosa` | `rothia_dentocariosa_pct` | Rothia dentocariosa |
| `rothia_aeria` | `rothia_aeria_pct` | Rothia aeria |

That's 13 new columns. PR-α also needs to:

- Extend the parser's species → column map.
- Re-parse stored `raw_otu_table` JSON for existing kits to backfill
  the new columns.
- Add the `oral_kit_orders` v3 columns (`ph_balance_api_v3`,
  `cariogenic_load_v3`, `commensal_sufficiency_index`,
  `compensated_dysbiosis_flag`, etc.) and wire `calculateCariesV3`
  into the kit-processing flow.

UI / narrative work (PR-γ) depends on PR-α. Until PR-α lands, this
slice's tests are the **contract** for what PR-α must deliver: the
same pilot inputs should still classify the same way after the parser
catches up.

## Test framework note

The repo uses **Jest** (`apps/web/jest.config.ts`,
`apps/web/__tests__/pii-scrub.test.ts`), not vitest. The brief
referenced vitest; this PR's tests are written against Jest because
that is what runs in CI. All 21 v3 tests pass locally
(`npx jest lib/oral/__tests__/caries-v3.test.ts`).

## Visual changes flagged for review

None — this PR is logic + types + tests + ADR + a 2-question
questionnaire extension. No production routes are modified.

## What this ADR does NOT cover

- The parser/schema PR (PR-α). It will need its own ADR with the
  full mapping table and any fallback rules for sub-species that the
  Zymo panel reports under different names.
- The UI PR (PR-γ). It will need to invent a `CariesPanel.tsx`
  surface or extend the existing oral panel; the brief proposed a
  layout but no concrete file exists today.
- The narrative engine v3 prompt. It will land alongside PR-γ once
  there are real `CariesV3Result` rows to interpolate into prompts.

## Citations

All weights, thresholds, and reclassification decisions in
`caries-v3.ts` cite their source inline. The methodology entries in
`methodologyKnowledge.ts` carry the full reference list.

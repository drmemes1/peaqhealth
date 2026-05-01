# ADR-0021: NR v1 pipeline integration

Date: 2026-05-01
Status: Accepted (additive feature; no scoring algorithm changes)

## Context

ADR-0019 / PR-249 shipped the NR-α nitric-oxide scoring algorithm at
`apps/web/lib/oral/nr-v1.ts` with full unit-test coverage (91 oral-lib
tests passing). That PR was foundation-only: the algorithm exists, but
nothing in the kit-processing pipeline calls it, and no NR columns
exist on `oral_kit_orders`. As a result the production database has no
NR data — the page rebuild planned for PR-γ1 has nothing to render.

This PR is the runner / migration / backfill slice. Mirrors PR-246
(caries v3 pipeline integration) and ADR-0016 verbatim where the
pattern applies.

## Decision

### Schema — 11 columns on `oral_kit_orders`

`supabase/migrations/20260501_nr_v1_output_columns.sql`:

| Column | Type | Default | Source |
|---|---|---|---|
| `nr_capacity_index` | numeric | NULL | `NRV1Result.nrCapacityIndex` |
| `nr_capacity_category` | text | NULL | `nrCapacityCategory` |
| `no_signature` | numeric | NULL | `noSignature` |
| `no_signature_category` | text | NULL | `noSignatureCategory` |
| `nr_risk_category` | text | NULL | `nrRiskCategory` |
| `nr_paradox_flag` | boolean | `false` | `nrParadoxFlag` |
| `nr_v1_confidence` | text | NULL | `confidence` |
| `nr_v1_reliability_flags` | text[] | NULL | `reliabilityFlags` (or NULL when empty — keeps queries simple) |
| `nr_v1_confounder_adjustments` | jsonb | `'{}'::jsonb` | `confounderAdjustments` |
| `nr_v1_breakdown` | jsonb | NULL | `breakdown` |
| `nr_v1_computed_at` | timestamptz | NULL | run timestamp |

All nullable; existing rows remain valid until the runner or backfill
populates them.

The first revision of the NR-β1 spec (and the PR-γ1 brief) referenced
two additional columns — `p_histicola_elevated` and
`narrative_augmentations`. These reflect a v2 NR design that didn't
ship. They are NOT in the current `NRV1Result` type and are NOT added
by this PR. If they land later they go in a separate algorithm
refinement PR.

### Pipeline integration — `apps/web/app/api/admin/oral-upload/route.ts`

NR runs as **Step 3c**, immediately after the caries v3 step (3b),
before interpretability tier (4). Soft-fails by design: if
`runNRV1` returns null or the DB UPDATE fails, the kit-processing
flow continues — NR is additive, not gating.

The same lifestyle row already fetched for caries v3 (Step 3) is
re-used. No additional DB reads.

### Runner — `apps/web/lib/oral/nr-v1-runner.ts`

Pure functions, no I/O. Mirrors `caries-v3-runner.ts` shape:

- `speciesFromKitRow(row)` — builds `NRSpeciesAbundances` from the
  oral_kit_orders row; defaults missing columns to 0.
- `lifestyleFromRow(row)` — builds `NRLifestyleConfounders` from the
  most recent lifestyle_records row; coerces invalid enum strings to
  null. Reads the existing v2 columns `dietary_nitrate_frequency` /
  `tongue_scraping_freq` directly (per ADR-0019 consolidation).
- `v1UpdateFromResult(result)` — translates `NRV1Result` to the
  11-key column update payload with fixed precision.
- `runNRV1(kitRow, lifestyleRow)` — try/catch wrapper that returns
  `{ update, result }` or null.

### Approximation contract for unmapped species

The upload pipeline does not parse species-level Neisseria, species-
level Actinomyces beyond `a_naeslundii_pct`, or H. parainfluenzae
specifically. ADR-0019 § Known gaps anticipated this. The runner
formalizes the approximations:

| `NRSpeciesAbundances` field | Source | Rationale |
|---|---|---|
| `neisseria_mucosa` | full `neisseria_pct` genus total | Conservative upper-bound: treat all Neisseria as Tier 1 (highest per-cell efficiency). Slightly inflates capacity vs ground truth, but Tier 1 dominates the algorithm so the categorical outcome is stable. |
| `neisseria_flavescens` / `subflava` / `neisseria_other` | 0 | Covered by mucosa allocation. |
| `rothia_mucilaginosa` | `rothia_pct` (post-PR-α residual) | The parser stores "Rothia minus dentocariosa minus aeria" in `rothia_pct`; the residual is dominantly mucilaginosa per Zymo's typical species distribution. |
| `rothia_dentocariosa` / `rothia_aeria` | direct columns | Real species data (PR-α). |
| `actinomyces_odontolyticus` | 0 | No species column. Allocating the full Actinomyces genus to Tier 1 would over-weight (multiple Actinomyces species exist). Underweighting is conservative. |
| `actinomyces_other` | `actinomyces_pct` | Parser already excludes `a_naeslundii_pct` from this column. |
| `h_parainfluenzae` | `haemophilus_pct` | Genus-level proxy; matches caries-v3-runner pattern. |
| `rothia_total` | `rothia_pct + rothia_dentocariosa_pct + rothia_aeria_pct` | Vanhatalo signature numerator. |
| `neisseria_total` | `neisseria_pct` | No species-level Neisseria columns. |
| `prevotella_total` | `prevotella_intermedia_pct + prevotella_commensal_pct + p_denticola_pct` | No `prevotella_pct` genus column; the parser splits Prevotella into three buckets per ADR-0015. |

Effect on Igor's pilot kit (c033fbae) verified by unit test: with these
approximations capacity lands in robust+ category and signature lands
in favorable, so risk classification is `optimal` — matches the
ADR-0019 expected outcome.

### Backfill — `scripts/backfill-nr-v1-outputs.ts`

Mirrors `backfill-caries-v3-outputs.ts` line-for-line:

- Env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  optional `DRY_RUN=1`, `FORCE=1`, `ONLY=<id1,id2,…>`.
- Skip logic: `nr_v1_computed_at` populated → skip unless `FORCE=1`.
- Lifestyle join: bulk-fetch most recent row per user; index in memory.
- DRY_RUN: prints per-kit summary + risk-category distribution +
  paradox-flag count. No writes.
- Live: same UPDATE payload as the upload route's Step 3c.

Pre-flight against production:
1. Apply `20260501_nr_v1_output_columns.sql` (manual — no migration
   automation in repo, per ADR-0017 Section "Migration automation
   report").
2. Run `DRY_RUN=1 ONLY=c033fbae-ab5a-42a5-ace4-f1ac09995338 npx tsx
   scripts/backfill-nr-v1-outputs.ts` to verify Igor's kit projects
   to `optimal` / `robust` / `favorable` / `paradox=false`.
3. After visual confirmation, re-run without DRY_RUN.

## Tests

`apps/web/lib/oral/__tests__/nr-v1-runner.test.ts` — 25 cases:

- **`speciesFromKitRow` (8 cases)** — empty-row defaults, rothia_total
  arithmetic, prevotella_total three-column sum, Neisseria full-
  allocation to mucosa, Haemophilus genus-proxy, actinomyces_other
  passthrough, non-numeric coercion.
- **`lifestyleFromRow` (6 cases)** — null-row, chlorhexidine
  passthrough, dietary_nitrate_frequency / tongue_scraping_freq
  passthrough (post-consolidation), invalid-enum coercion, PPI
  boolean-vs-non-boolean.
- **`runNRV1` end-to-end (8 cases)** — Igor row → optimal, paradox
  row → composition_constrained + flag, no-depleters row → 999
  sentinel, three confounder integration tests, ISO-8601 timestamp,
  idempotency, soft-fail with throwing Proxy.
- **`v1UpdateFromResult` (3 cases)** — all 11 columns present, empty
  reliability_flags persist as null, breakdown shape sanity.

Full oral-lib suite remains green: **116 / 116 passing** (was 91
before NR-β1; +25 new cases).

## What this PR does NOT change

- **`apps/web/lib/oral/nr-v1.ts`** — algorithm, fixtures, helpers
  unchanged. Imported only.
- **`apps/web/lib/oral/caries-v3.ts` / `caries-v3-runner.ts`** —
  read-only.
- **`apps/web/lib/oral/upload-parser.ts`** — read-only. No new
  species columns parsed; the runner approximates per the contract
  table above.
- **No new lifestyle questionnaire fields.** ADR-0019 already retired
  the duplicate-column risk; reused `dietary_nitrate_frequency` /
  `tongue_scraping_freq` cover the runner's input needs.
- **No UI changes.** The page rebuild that surfaces NR outputs lands
  in PR-γ1 once the discovery report on the existing oral-page files
  and the design mockup are in hand.
- **No production backfill executed by this PR.** The script ships;
  the run happens manually after merge + migration application,
  gated on user confirmation, mirroring the caries v3 backfill
  protocol used for kit `c033fbae`.

## Validation gate (post-merge, manual)

1. Apply migration to production.
2. Verify schema: 11 NR columns exist on `oral_kit_orders` (REST
   OpenAPI introspection — same technique used to verify caries v3
   columns earlier).
3. Pull `.env.vercel.local`, run backfill in DRY_RUN against
   `c033fbae-…` only, confirm:
   - `nr_capacity_category` ∈ {`robust`, `exceptional`}
   - `no_signature_category` = `favorable`
   - `nr_risk_category` = `optimal`
   - `nr_paradox_flag` = `false`
   - `nr_v1_confidence` ∈ {`moderate`, `high`}
4. Re-run live; confirm DB write via REST GET; delete env file.

## Future PRs

- **PR-γ1 — oral page foundation.** Surfaces the 11 NR columns +
  the existing caries v3 columns through the editorial UI defined by
  the design mockup. Requires: this PR merged + production backfill
  run + mockup HTML + a discovery report on existing
  `apps/web/app/dashboard/oral/` files (live entry point, dead code,
  partial experiments).
- **NR-α-revision (speculative).** If `p_histicola_elevated` /
  `narrative_augmentations` become real algorithm features, they
  ship as a separate refinement PR — algorithm change first, then
  schema, then runner, then UI.

## References

- ADR-0019 / PR-249 — NR-α algorithm foundation. This PR is its
  pipeline integration slice.
- ADR-0016 / PR-246 — caries v3 pipeline integration. This PR
  mirrors its structure verbatim.
- ADR-0017 / PR-247, ADR-0018 / PR-248 — placeholder-aggregation
  fixes whose corrected genus totals the runner's approximation
  arithmetic depends on.
- ADR-0015 / PR-α (PR-245) — parser extraction and Prevotella
  three-bucket split that `prevotella_total` reconstructs.

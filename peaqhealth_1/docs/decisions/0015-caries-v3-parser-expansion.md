# ADR-0015: Caries v3 parser & schema expansion (PR-α)

Date: 2026-04-30
Status: Accepted (parser landed; v3 wiring still pending PR-β)

## Context

PR-244 (ADR-0014) shipped the caries v3 algorithm as a pure module with a
clear input schema (`SpeciesAbundances` — 24 species fields). The kit
upload parser at `app/api/admin/oral-upload/route.ts` only persisted a
~10-species subset, so v3 could not be wired anywhere without producing
misleading results. This PR closes that gap.

This is a plumbing PR. No scoring logic changes. No UI. No narrative
engine. The contract is the test fixtures in
`apps/web/lib/oral/__tests__/caries-v3.test.ts` from PR-244 — after this
PR ships, parsing the same pilot inputs and feeding them to
`calculateCariesV3` produces the categories ADR-0014 specifies.

## Decision

### Schema additions to `oral_kit_orders`

Migration: `supabase/migrations/20260430_caries_v3_species_columns.sql`.

13 new species columns (all `numeric DEFAULT 0`):

| Column | Source taxon | Caries v3 role |
|---|---|---|
| `s_cristatus_pct` | Streptococcus cristatus | Tier 1 ADS |
| `s_parasanguinis_pct` | Streptococcus parasanguinis | Tier 1 ADS (moderate) |
| `s_australis_pct` | Streptococcus australis | Tier 1 ADS (moderate) |
| `a_naeslundii_pct` | Actinomyces naeslundii | Tier 1 ADS (moderate) |
| `s_mitis_pct` | Streptococcus mitis | Tracked, NOT counted as ADS (Price 1986) |
| `rothia_dentocariosa_pct` | Rothia dentocariosa | Nitrate-reduction tier |
| `rothia_aeria_pct` | Rothia aeria | Nitrate-reduction tier |
| `b_dentium_pct` | Bifidobacterium dentium | Cariogen, weight 0.6 (unconditional) |
| `s_sputigena_pct` | Selenomonas sputigena | Cariogen, weight 0.4 (conditional) |
| `p_acidifaciens_pct` | Propionibacterium acidifaciens | Cariogen, weight 0.3 |
| `leptotrichia_wadei_pct` | Leptotrichia wadei | Cariogen, weight 0.2 |
| `leptotrichia_shahii_pct` | Leptotrichia shahii | Cariogen, weight 0.2 |
| `p_denticola_pct` | Prevotella denticola | Cariogen, weight 0.15 (conditional) |

Plus one bookkeeping column:

| Column | Type | Purpose |
|---|---|---|
| `parser_unresolved_species` | `text[]` (default `NULL`) | Audit list of hyphenated species calls the parser resolved by assigning to the first listed species name. Format: `"<genus>;<original> -> <genus> <resolved-part>"`. |

`DEFAULT 0` for the abundance columns is the correct biological default — a
species absent from a sample (or absent from Zymo's reference database)
contributes 0 to v3 scores. No conditional null handling needed downstream.

### Parser changes

`apps/web/lib/oral/upload-parser.ts` is a new module extracted from the
route handler so the parser can be unit-tested in isolation. The route
imports the public surface (`parseL7Input`, `SPECIES_COLUMNS`,
`GENUS_COLUMNS`, `resolveSpeciesColumn`).

The 13 new species are added to `SPECIES_COLUMNS` keyed by
`<genus_lower> <species_lower>` (matching the existing convention).

Hyphenated calls (`s__mitis-pneumoniae`, `s__parvula-tobetsuensis`, etc.)
are resolved by **assigning the row's full abundance to the first listed
species name that maps to a tracked column**. Both the upload path and
the reparse path go through `resolveSpeciesColumn`, which returns the
resolved column plus an audit string written to
`parser_unresolved_species`.

This is biologically defensible — hyphenated calls are between very
closely related species with overlapping functional traits. Splitting
abundance equally introduces noise; assigning to the first listed match
preserves the data in a usable form. The audit array makes the
resolution transparent for downstream narrative ("species-level
resolution unclear for X").

### Backfill

`scripts/backfill-caries-v3-species.ts` rewrites the new species columns
for kits whose `raw_otu_table.__meta.entries` already exists. Idempotent
(skips kits with `s_cristatus_pct > 0` unless `FORCE=1`). Dry-run
support via `DRY_RUN=1`. Limit-by-id via `ONLY=<id1,id2,...>`.

Kits that lack `__meta.entries` cannot be backfilled — they need a fresh
upload of the original Zymo TSV. The script logs and skips them. Run a
pre-flight to identify those:

```sql
SELECT id, (raw_otu_table IS NOT NULL) AS has_otu, status
FROM oral_kit_orders
WHERE id IN ('TEST-1','TEST-2','TEST-3') OR id LIKE '%pilot%';
```

### Tests

`apps/web/lib/oral/__tests__/upload-parser.test.ts` — 17 Jest tests
covering:

- All 13 v3 species → column mappings present in `SPECIES_COLUMNS`.
- `resolveSpeciesColumn` exact match, hyphenated first-part match,
  hyphenated second-part match, and no-match cases.
- Parser exact species mapping with fractional → percent conversion.
- Hyphenated call writes correct column **and** records the audit
  entry.
- Multiple OTUs collapsing to the same species sum correctly.
- Genus present, target species absent → column stays at 0.
- Salivarius family routing preserved.
- Placeholder `sp\d+` rows ignored.
- **Contract tests**: synthesized OTU rows for Igor / Gabby / Evelina
  pilot profiles parse and feed into `calculateCariesV3`, producing
  the categories ADR-0014 specifies (`compensated_active_risk` /
  `low_risk_stable` / `compensated_dysbiosis_risk`).

The contract tests are the proof that PR-α delivers what PR-244
needed.

## Consequences

### Positive

- v3 module gets the inputs it was designed for.
- Hyphenated calls become first-class data instead of being silently
  dropped, with an explicit audit trail.
- Parser is now unit-testable; the extracted module makes future
  changes safer.

### Open / forward-compatible

Two of the 13 new columns may stay at 0 for all current kits:

- **B. dentium** — Zymo's V3-V4 panel currently calls Bifidobacterium
  at species level only as `animalis` and `longum`. Could be (a)
  genuinely absent in healthy adults, (b) absent from Zymo's reference
  DB, or (c) below detection floor. Open question for Zymo (Julia /
  Anna) on the next pipeline call.
- **S. sputigena** — Zymo's Selenomonas calls observed in pilot data
  are `artemidis`, `infelix`, `noxia`, plus placeholders
  `sp37070`/`sp37072`. Worth asking whether those placeholders have
  been reclassified to sputigena since the pilot run.

The columns ship now for forward compatibility — future Zymo pipeline
updates or a V1-V3 dual-region run may detect these species, and the
parser will pick them up without any further schema work.

### Hyphenated-call resolution

V3-V4 region cannot resolve some closely related species pairs. The
"first listed match wins" rule is a pragmatic compromise. If we move
to V1-V3 + V3-V4 dual-region sequencing, most hyphenated calls
disappear and the audit array gets shorter automatically.

## Non-goals for this PR

- Not modifying `caries-v3.ts` algorithm.
- Not modifying `caries-v3.test.ts` fixtures from PR-244.
- Not wiring `calculateCariesV3` into the kit-processing flow — that's
  PR-β.
- No UI changes.
- No narrative-engine prompt updates.
- No changes to sleep, blood, lifestyle scoring.
- No changes to junction integration or wearable code.

## Next PR (PR-β)

- Add `oral_kit_orders` v3 result columns (`ph_balance_api_v3`,
  `cariogenic_load_v3`, `commensal_sufficiency_index`,
  `compensated_dysbiosis_flag`, `synergy_active_flag`,
  `caries_risk_category`, `confounder_adjustments`,
  `reliability_flag`).
- Wire `calculateCariesV3` into the upload + reparse flow, persist the
  result, surface in `OralKitData`.
- Backfill v3 fields for existing kits using the columns landed here.

## Zymo data notes (for reference)

Species verified present in pilot V3-V4 data: P. acidifaciens,
L. wadei, L. shahii, P. denticola, S. cristatus, S. parasanguinis,
S. australis, A. naeslundii, R. dentocariosa, R. aeria.

Requires hyphenated handling in V3-V4: S. mitis (as
`s__mitis-pneumoniae`).

Not detected in any pilot sample (logged for follow-up with Zymo):
B. dentium, S. sputigena.

# ADR-0024 — Periodontal burden parser coverage (PR-Δ-α-parser)

**Status:** Accepted
**Date:** 2026-05-02
**Builds on:** ADR-0023 (perio-burden-v1 algorithm)

## Context

ADR-0023 specifies the species inputs `perio-burden-v1.ts` consumes
(Tier 1: P. gingivalis, T. forsythia, Treponema, F. alocis; Tier 2:
F. nucleatum, P. intermedia, S. constellatus, P. micra; defense Tier 1:
C. matruchotii, S. mitis group, S. sanguinis, S. gordonii). Before
shipping the pipeline integration (PR-Δ-β1) we needed to verify the
upload-parser actually surfaces these species at the correct
granularity from real V3-V4 16S data.

This ADR documents the verification + parser additions made in this
PR. **No algorithm changes** — `perio-burden-v1.ts` is untouched.

## Verification report (Igor's kit, c033fbae-…)

Igor's parsed `__meta.entries` were inspected against ADR-0023's
required species list. Findings:

| Species | Required by | Parser status before PR | Action |
|---|---|---|---|
| P. gingivalis | PBI Tier 1 | **No species column** — only `porphyromonas_pct` (genus); placeholder `sp13375` rolls into genus | **Add** `p_gingivalis_pct` |
| T. forsythia | PBI Tier 1 | ✓ `tannerella_pct` (species_exact via `tannerella forsythia`) | No change — runner reads existing column |
| Treponema (genus) | PBI Tier 1 | ✓ `treponema_pct` (genus_sum: vincentii + socranskii in Igor's case) | No change — algorithm input is genus-level by design (V3-V4 limit) |
| F. alocis | PBI Tier 1 | **Unmatched** — entry present at species level but no column written | **Add** `f_alocis_pct` |
| F. nucleatum | PBI Tier 2 | Aggregated into `fusobacterium_pct` (genus) along with periodonticum / necrophorum | **Add** species column `f_nucleatum_pct` (genus column preserved) |
| P. intermedia | PBI Tier 2 | ✓ `prevotella_intermedia_pct` (species_exact) | No change |
| S. constellatus | PBI Tier 2 | **Hyphenated only** — Igor's `anginosus-constellatus-intermedius` 0.062% had no map entry, so resolver returned no column | **Add** `s_constellatus_pct` (hyphen resolver now finds the second part) |
| P. micra | PBI Tier 2 | Aggregated into `parvimonas_pct` (genus_sum) | **Add** species column `p_micra_pct` |
| C. matruchotii | PDI Tier 1 | **Unmatched** — Igor's 0.6304% had no column | **Add** `c_matruchotii_pct` |
| S. mitis group | PDI Tier 1 | Clean S. mitis → `s_mitis_pct` only; hyphenated calls (`oralis-parasanguinis`, `mitis-pneumoniae`) not aggregated as a functional unit | **Add** `s_mitis_group_pct` accumulator (clean + hyphenated mitis/oralis/pneumoniae) |
| S. sanguinis | PDI Tier 1 | ✓ `s_sanguinis_pct` (species_exact) | No change |
| S. gordonii | PDI Tier 1 | ✓ `s_gordonii_pct` (species_exact) | No change |
| Rothia / Neisseria / H. parainfluenzae / A. naeslundii / Lautropia | PDI Tier 2 | All ✓ (existing columns) | No change |

### Hyphenation samples observed in Igor's data

```
Streptococcus salivarius-vestibularis        15.28%   → s_salivarius_pct (existing accumulator)
Streptococcus oralis-parasanguinis           0.466%   → s_parasanguinis_pct (hyphen resolver) + s_mitis_group_pct (NEW)
Streptococcus mitis-pneumoniae*              —        (not in Igor's kit) → s_mitis_pct + s_mitis_group_pct
Streptococcus anginosus-constellatus-intermedius  0.062%  → s_constellatus_pct (NEW)
Neisseria mucosa-perflava-subflava           7.74%    → genus rollup (intentional — see below)
Actinomyces meyeri-odontolyticus             0.794%   → genus rollup
```

## Decision

Add **6 new species columns** + **1 new accumulator** to `upload-parser.ts`.

### New SPECIES_COLUMNS entries

```ts
"porphyromonas gingivalis":    "p_gingivalis_pct",
"filifactor alocis":           "f_alocis_pct",
"fusobacterium nucleatum":     "f_nucleatum_pct",
"streptococcus constellatus":  "s_constellatus_pct",
"parvimonas micra":            "p_micra_pct",
"corynebacterium matruchotii": "c_matruchotii_pct",
```

The existing genus columns (`porphyromonas_pct`, `fusobacterium_pct`,
`parvimonas_pct`) are **preserved** for backward compatibility — the
species columns sit alongside.

### New `s_mitis_group_pct` accumulator

Mirrors the `s_salivarius_pct` pattern. Identifiers exported as
`S_MITIS_GROUP_IDENTIFIERS = ["mitis", "oralis", "pneumoniae"]`. Any
Streptococcus species call (clean OR hyphenated) whose lowercased
species string contains any identifier is summed into the accumulator,
**in addition to** whatever other column it resolves to.

This implements the algorithm's hyphenation rule directly at the parser
boundary — runners pass `s_mitis_group_pct` straight into
`PerioBurdenSpeciesAbundances.s_mitis_group` without re-deriving.

### Why mitis group is more inclusive than Neisseria handling

ADR-0023 specifies the mitis group rule as more aggressive than
Neisseria's. The reasoning:

- **Neisseria**: hyphenated calls stay at genus level only because
  N. mucosa weighting matters specifically for the NR Capacity Tier 1
  ranking. Letting `mucosa-perflava-subflava` pass as "N. mucosa" would
  inflate that signal incorrectly.
- **Mitis group**: V3-V4 cannot reliably distinguish S. mitis,
  S. oralis, and S. pneumoniae (>99% 16S identity in some regions). All
  three function identically as protective oral commensals (Mark Welch
  2016 PNAS). For perio defense Tier 1, the species-level distinction
  doesn't change function — so we sum them as one functional entity.

The two rules use opposite heuristics for opposite reasons.

## Consequences

- **No breaking changes** — existing genus columns and species columns
  are unchanged. New columns simply weren't being populated before.
- **Reprocessing optional** — Igor's stored kit data won't reflect the
  new columns until the next pipeline run. PR-Δ-β1 (pipeline
  integration) is the natural place to either trigger a backfill or
  read from `__meta.entries` directly when the new columns are null.
- **Schema migration follows** — DB columns for the 7 new fields
  (`p_gingivalis_pct`, `f_alocis_pct`, `f_nucleatum_pct`,
  `s_constellatus_pct`, `p_micra_pct`, `c_matruchotii_pct`,
  `s_mitis_group_pct`) need to be added to `oral_kit_orders` in PR-Δ-β1.
- **Tests added** — 13 new test cases covering each new species column
  + the S. mitis group accumulator (clean, hyphenated, and exclusion
  cases like `salivarius-vestibularis` and `parasanguinis`).

## Non-goals

- No algorithm changes (`perio-burden-v1.ts` untouched per the PR brief)
- No DB migration (PR-Δ-β1)
- No runner / pipeline wiring (PR-Δ-β1)
- No backfill for existing kits — done in PR-Δ-β1 if needed

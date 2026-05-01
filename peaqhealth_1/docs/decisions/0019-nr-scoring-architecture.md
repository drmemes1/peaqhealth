# ADR-0019: NR (nitric oxide / nitrate reduction) scoring architecture

Date: 2026-04-30
Status: Accepted (foundation slice — algorithm only; runner + UI ship in follow-up PRs)

## Context

After caries v3 (ADR-0014 / PR-244, the parser expansion in PR-α / PR-245,
the placeholder-aggregation fixes in ADR-0017 / PR-247 and ADR-0018 /
PR-248, and the pipeline in PR-246), the next oral-panel category to
score is the nitric-oxide / nitrate-reduction (NR) pathway.

This is where commodity oral microbiome reports — Bristle being the
most visible — diverge from the literature most clearly. Their flat
percentile-style "nitric oxide" score weights every named NR-capable
genus the same direction (more = better), Veillonella included. The
literature contradicts that:

- Vanhatalo 2018 (n=18, dietary nitrate intervention) shows that
  Veillonella relative abundance *decreases* in subjects whose plasma
  nitrite responds to nitrate. The same study finds *Rothia* and
  *Neisseria* increase by +127% and +351% respectively in responders.
- ORIGINS (Goh 2022, n=764) finds the (Rothia + Neisseria) /
  (Veillonella + Prevotella) compositional ratio tracks blood pressure
  and cardiometabolic markers in the expected direction.
- Doel 2005 reports per-cell nitrate-reductase activity varies ~15-fold
  across NR-capable taxa — Neisseria mucosa, Rothia mucilaginosa, and
  Actinomyces odontolyticus are the high-efficiency producers; many
  taxa with NR genes are functionally minor contributors.

A single composite score conflates two distinct facts: (1) how much
nitrate-reducing biomass exists, and (2) whether that biomass converts
substrate to systemic NO. A kit can be capacity-rich and
signature-poor — large Veillonella + Prevotella share dominating the
ratio while Neisseria/Rothia stay low. Patients in this state read as
"healthy NO" on a flat composite and as "compromised conversion" on
the literature-grounded ratio. A composite hides which is true.

## Decision

Two scores plus one composite classification.

### Score 1 — NR Capacity Index

Tiered weighted sum:

| Tier | Weight | Members |
|------|--------|---------|
| 1 | ×2.0 | Neisseria mucosa, N. flavescens, N. subflava; Rothia mucilaginosa, R. dentocariosa, R. aeria; Actinomyces odontolyticus |
| 2 | ×1.0 | H. parainfluenzae; secondary Neisseria (sicca, cinerea, elongata, meningitidis, …); A. naeslundii |
| 3 | ×0.4 | Veillonella spp.; other Actinomyces |
| 4 | ×0.2 | Schaalia (reserved; not yet parsed) |

Categories: `depleted < 5`, `low 5–15`, `moderate 15–35`,
`robust 35–60`, `exceptional > 60`.

### Score 2 — NO Signature (Vanhatalo)

`(Rothia + Neisseria) / (Veillonella + Prevotella)`. Direct
evidence-derived ratio. When both depleting genera are zero, a
sentinel value of 999 is stored — keeps the score finite while
pinning the kit to `strongly_favorable`.

Categories: `strongly_unfavorable < 0.25`, `unfavorable 0.25–0.5`,
`moderate 0.5–1.5`, `favorable 1.5–3.0`, `strongly_favorable > 3.0`.

### Composite — NR Risk Category (4 quadrants + insufficient_data)

| Capacity | Signature | Risk category | Paradox flag |
|----------|-----------|---------------|--------------|
| moderate / robust / exceptional | favorable / strongly_favorable | `optimal` | false |
| depleted / low | favorable / strongly_favorable | `capacity_constrained` | false |
| moderate / robust / exceptional | unfavorable / strongly_unfavorable | `composition_constrained` | **true** |
| depleted / low | unfavorable / strongly_unfavorable | `compromised` | false |

Below a 1% total-NR-input floor the categorical mapping short-circuits
to `insufficient_data` to prevent an empty kit from falsely classifying
as `compromised`.

The `nrParadoxFlag` is the architectural value-add. It surfaces the
specific Bristle blind spot — a kit with substantial reducer biomass
but a Vanhatalo-unfavorable composition — as an explicit boolean a
downstream consumer can branch on.

## Confounder contract — same as caries v3

Confounders never alter the underlying scores. They only populate
`reliabilityFlags` and `confounderAdjustments`. This mirrors
ADR-0014 / `caries-v3.ts` exactly so a single audit can verify the
contract across both modules.

NR-relevant confounders consumed:

- `chlorhexidine_use` (caries v3 reuse) — Bondonno 2015 documents the
  blood-pressure-lowering effect of dietary nitrate is *eliminated* by
  chlorhexidine within hours. Active use → `chlorhexidine_active`
  flag + score-down caveat. Past 8 weeks → `chlorhexidine_recovery`
  caveat.
- `mouthwash_type=antiseptic` — SOALS 2020 (n>1000) ties daily
  antiseptic mouthwash to ~85% higher hypertension risk.
- `smoking_status=current` — depletes Neisseria, Rothia, Haemophilus.
- `medication_ppi=true` — Neisseria/Veillonella depletion plus
  Streptococcus overgrowth confounds the signature.
- `dietary_nitrate_intake=low` — substrate constraint; even robust
  capacity produces little NO without dietary nitrate.
- `tongue_scraping=daily` — mechanical removal of the tongue-dorsal
  NR community.

## Lifestyle inputs — two new fields, coexisting with the existing pair

The wizard already has `dietary_nitrate_frequency` (q35, 5 options)
and `tongue_scraping_freq` (q26, 4 options) from the v2 questionnaire
work. Those capture habit detail; the NR confounder logic needs the
coarser binned signal it actually branches on (`low | moderate | high`
and `never | occasional | daily`).

Per the spec, this PR adds two new fields rather than rebinding the
existing columns:

- `dietary_nitrate_intake` (q43, dbCol `dietary_nitrate_intake`)
- `tongue_scraping` (q44, dbCol `tongue_scraping`)

Migration: `supabase/migrations/20260430_nr_lifestyle_fields.sql`.

The existing `dietary_nitrate_frequency` and `tongue_scraping_freq`
columns are intentionally **not** removed. Production rows already
contain values in those columns from the v2 wizard rollout. A future
consolidation PR may map the high-granularity columns into the binned
ones and remove duplicates; that work is out of scope here. The
duplication is recorded as a known follow-up.

## Validation cases (pilot fixtures)

| Pilot | Capacity → category | Signature → category | Risk |
|-------|---------------------|----------------------|------|
| **Pilot 1 (Igor)** | rothia 8.4 + neisseria 14.8 driving Tier 1, capacity ≈ 60 → `robust` / `exceptional` | (8.4+14.8)/(4.3+7) ≈ 2.05 → `favorable` | `optimal` |
| **Pilot 3** | rothia 9 + neisseria 14, capacity ≈ 47 → `robust` | (9+14)/(3+5) = 2.875 → `favorable` (note: spec called this strongly_favorable; arithmetic puts it just below the 3.0 cutoff. The architectural outcome — `optimal` — is unchanged) | `optimal` |
| **Pilot 2 (Gabby)** | rothia 1.5 + neisseria 5.8, veillonella 7.9, capacity ≈ 17.8 → `moderate` | (1.5+5.8)/(7.9+18.4) ≈ 0.28 → `unfavorable` | `composition_constrained` (paradox=true) |
| **Evelina (Bristle)** | rothia 4.5 + neisseria 2.0, veillonella 16.4, capacity ≈ 19.6 → `moderate` | (4.5+2.0)/(16.4+50.6) ≈ 0.10 → `strongly_unfavorable` | `composition_constrained` (paradox=true) |

All four are encoded in `apps/web/lib/oral/__tests__/nr-v1.test.ts`,
along with the seven confounder cases and five edge cases (all-zero,
no-depleters sentinel, null lifestyle, paradox at robust capacity,
breakdown self-consistency). 17 cases total; full oral-lib suite
remains green at 85 / 85.

## What this PR does NOT change

- **No parser changes.** `apps/web/lib/oral/upload-parser.ts` is
  untouched. `SPECIES_COLUMNS` and `GENUS_COLUMNS` are unchanged. The
  algorithm operates on the typed `NRSpeciesAbundances` interface; the
  runner (NR-β1) is responsible for populating it from whatever
  columns exist.
- **No pipeline integration.** The runner that calls `calculateNRV1`,
  the migration adding NR-output columns to `oral_kit_orders`, and the
  recalc-trigger plumbing all ship in NR-β1.
- **No UI / no narrative engine prompts.** Cards, language, and the
  paradox copy land in NR-β2.
- **No backfill execution.** No production writes from this PR.

## Known gaps (carry forward for NR-β1)

- **Species-level Neisseria not parsed.** The upload pipeline gives a
  single `neisseria_pct` genus total. The Tier 1 mucosa / flavescens /
  subflava split assumed by the algorithm cannot be derived from the
  current parser output. NR-β1 will likely approximate by allocating
  the full genus total to Tier 1 (`neisseria_mucosa`) — a conservative
  upper-bound on capacity. Long-term fix is parser extension.
- **Species-level Rothia partially parsed.** PR-α / PR-247 / PR-248
  added `rothia_dentocariosa_pct` and `rothia_aeria_pct`. There is no
  dedicated `rothia_mucilaginosa_pct` column — runner derives it as
  `rothia_pct − dentocariosa − aeria` (the residual is dominantly
  mucilaginosa per Zymo's typical species distribution).
- **H. parainfluenzae not parsed at species level.** Runner uses
  `haemophilus_pct` genus total as proxy.
- **Schaalia not parsed.** Tier 4 stays at zero in v1; reserved for
  future parser work.
- **V. dispar not species-resolved by Zymo.** Genus-level
  `veillonella_pct` used for Tier 3 and the Vanhatalo denominator.
- **Possible Veillonella mass loss during upload.** Earlier dry-run
  inspection of pilot kits suggested some Veillonella `sp\d+`
  placeholders may not be aggregating cleanly even after PR-247 /
  PR-248. Investigation is open and tracked separately; any signature
  shift on existing kits after that fix would propagate cleanly through
  this module without algorithm changes.

## Future PRs

- **NR-β1 — pipeline integration.** Add NR-output columns to
  `oral_kit_orders`. Runner that maps DB columns → `NRSpeciesAbundances`,
  calls `calculateNRV1`, writes results. Backfill script for existing
  kits (mirror of `backfill-caries-v3-outputs.ts`).
- **NR-β2 — UI + narrative.** Capacity / signature / paradox cards,
  narrative-engine prompt entries, action plan integration.
- **Future-future — PICRUSt2 functional gene scoring.** ORIGINS used a
  predicted NO:NH₃ functional ratio. Requires bioinformatics
  infrastructure beyond 16S OTU summing.
- **Consolidation — habit columns vs binned columns.** Decide whether
  `dietary_nitrate_frequency` / `tongue_scraping_freq` should derive
  from `dietary_nitrate_intake` / `tongue_scraping` automatically (or
  vice versa), and remove the duplicate.

## References

- Vanhatalo 2018 (Free Radic Biol Med) — primary signature derivation.
- Doel 2005 (Eur J Oral Sci) — per-cell efficiency hierarchy.
- Sato-Suzuki 2020 (Sci Rep) — major nitrite-producing genera.
- Hyde 2014 — Neisseria species nitrite production.
- Burleigh 2018 — salivary nitrite production correlation.
- Goh 2022 (J Am Heart Assoc) — ORIGINS (n=764) cardiometabolic
  validation.
- Bondonno 2015 — chlorhexidine eliminates dietary-nitrate BP effect.
- SOALS 2020 — antiseptic mouthwash hypertension association.
- L'Heureux 2023 (PLoS One) — site-specific NR localization.
- ADR-0014 / PR-244 — caries v3 algorithm scaffolding (this ADR
  mirrors its confounder contract).
- ADR-0017 / PR-247, ADR-0018 / PR-248 — placeholder aggregation
  fixes that this module's runner-side approximation depends on.

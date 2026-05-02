# ADR-0023 — Periodontal burden scoring (PR-Δ-α, v1.2)

**Status:** Accepted
**Date:** 2026-05-02

## Context

Third evidence-driven scoring module after caries v3 (ADRs 0014/0015/0016/0018)
and NR-α (ADRs 0019/0021). The literature here is the most mature of any
algorithm shipped so far — multiple n>500 validation studies, ML models with
AUC 0.87–0.93, and a published grading framework (Kim 2018 PPI).

This PR is **foundation only**: the algorithm module (`perio-burden-v1.ts`),
its test suite, methodology entries, and ADR. No parser changes, no pipeline
integration, no UI section — those follow the same gating pattern caries v3
and NR-α used.

## Decision

Two-axis architecture mirroring caries v3 + NR-α:

- **PBI** (Periodontal Burden Index) — tiered weighted pathogen sum
- **PDI** (Periodontal Defense Index) — tiered weighted commensal sum
- **CDM** (Commensal Depletion Modifier) — multiplicative amplifier on PBI
  when PDI is depleted, with the modifier contribution surfaced as a
  separate breakdown line item (audit transparency)
- **4-quadrant composite** — `stable_low_risk`, `compensated_active_burden`,
  `compensated_dysbiosis_risk`, `active_disease_risk`, plus `borderline`
  (moderate burden) and `insufficient_data` (all-zero inputs)
- **Red complex status** — surfaced as a UI flag (`not_detected` /
  `below_clinical_threshold` / `detected`) with three states; **not** a
  score change

Users learn one mental model that applies across caries v3, NR-α, and
periodontal burden — the compensated-dysbiosis pattern in particular is
clinically actionable across all three modules.

## Tier 1 weight derivation

| Species | Weight | Rationale |
|---|---:|---|
| P. gingivalis | 1.0 | Reference pathogen |
| T. forsythia | 0.9 | Yamaguchi 2018 IHC: higher tissue density and detection frequency than Pg; SMDI Gini importance |
| Treponema (genus) | 0.8 | Biological 1.0; V3-V4 adjusted (~20–40% relative abundance underestimation per Wade & Prosdocimi 2020) |
| F. alocis | 0.7 | Saliva–subgingival r=0.58, severity discrimination per Ji 2023; emerging biomarker per Abdulkareem 2026 |

## F. nucleatum context-dependent weighting

Baseline 0.5 (bridging species per Hajishengallis); increases to **0.8 when
Pg ≥ 0.5%** (active bridging biology). Validates against Igor's case:
F. nucleatum 2.6% in a patient with documented Arestin history correctly
classifies as `borderline`, not `stable_low_risk`.

## Co-occurrence boosts (capped)

| Boost | Threshold | Multiplier | Citation |
|---|---|---:|---|
| F. alocis × P. gingivalis | both ≥ 0.1% | 1.2× | Aruni 2011 + Wang 2015 |
| P. gingivalis × Treponema | both ≥ 0.1% | 1.2× | Hajishengallis PSD framework |
| Stacked combined cap | — | 1.3× | Prevents 1.2 × 1.2 = 1.44 compounding |

## Threshold derivation (explicit)

PBI category cutoffs (`minimal < 0.5`, `low 0.5–1.5`, `moderate 1.5–3.0`,
`high 3.0–6.0`, `severe > 6.0`) are **derived heuristics**, not externally
validated cutoffs. Anchored to Kageyama 2017 (mean periodontitis cohort
SUBP 1.6 ± 1.2%), Ma 2021 (cohort range 0–15.4%), and Gizaw 2026 (Pg
gradient 4% Stage I → 17% Stage IV).

The `low` band (0.5–1.5) is explicitly flagged as a **diagnostic
uncertainty zone** based on Lee 2026's reported AUC 0.736 for healthy-vs-
Stage-I distinction. The `diagnostic_uncertainty_zone` boolean and the
`narrative_augmentations` array surface this caveat directly to the user.

## CDM transparency requirement

Per Perplexity expert critique: the CDM contribution must be surfaced as
a separate line item, never folded opaquely into PBI_adjusted. The
breakdown shape includes `pbi_pre_cdm` and `cdm_contribution` as distinct
fields, and `cdm_amplification_pct` for direct UI display. The
clinically defensible UI displays "Pathogen burden 1.61 + commensal
modifier ×1.20 = adjusted burden 1.94" rather than just 1.94.

## V3-V4 limitations + versioning rule

V3-V4 sequencing detects Treponema at genus level only and underestimates
relative abundance ~20–40%. Fretibacterium spp. and Mogibacterium timidum
are weighted at 0.3 (Tier 3) in v1 despite published Gini importance
exceeding F. alocis — V3-V4 detection limits don't justify higher weights
yet.

**Versioning rule:** when sequencing platform supports reliable detection
(V1-V3 amplicon or shotgun metagenomics), Treponema scales toward 1.0 and
Fretibacterium / Mogibacterium shift to Tier 2 (weight 0.5–0.6). The
formula is detection-limit aware rather than missing important species.

## Red complex status as UI flag (not score change)

We considered adding a categorical detection bonus (e.g., +0.3 to PBI for
any P. gingivalis ≥ 0.01%). Testing on the four-patient cohort showed this
catches noise: three of four patients trigger T. forsythia at 0.04–0.05%,
well below clinical relevance. The literature support for "presence
matters" assumes qPCR-grade detection (Saygun 2011 cutoff 40,000 copies/mL;
Kim 2018 PPI uses absolute qPCR copies), not 16S relative abundance at
trace levels.

Decision: surface red complex status in UI explicitly with three states
(`not_detected` / `below_clinical_threshold` / `detected`), keep
abundance-based weighting in the score, and add a methodology note
pointing patients toward qPCR for trace-level definitive confirmation.

## S. mitis group hyphenation rule

S. mitis group abundance includes cleanly-named S. mitis, S. oralis, AND
any hyphenated calls containing 'mitis', 'pneumoniae', or 'oralis'
identifiers. V3-V4 cannot reliably distinguish these species (>99% 16S
identity in some regions); all three function as protective oral
commensals (H₂O₂ producers, biofilm scaffold contributors). Mark Welch
2016 PNAS treats the mitis group as a single functional entity.

This is **different** from how Neisseria hyphenation is handled — for
Neisseria we keep hyphenated calls at genus level only because N. mucosa-
specific weighting matters for NR. For S. mitis group, species-level
distinction doesn't change function, so we're more inclusive.

The hyphenation aggregation lives at the parser layer; the algorithm
trusts the caller-provided `s_mitis_group` value.

## Cross-panel hooks (defined now, activated later)

`cross_panel_hooks.cardiovascular_pattern_pending` and
`neurodegenerative_pattern_pending` fire when burden category is `high`
or `severe`. The cross-panel correlation engine (later PR) reads these
flags and produces narratives once blood + cognitive data integration
ships. Until then, the page can render a soft prompt
("Cross-panel cardiovascular analysis available when blood data
integrated").

## Shared species architecture

PDI Tier 2 species overlap with NR Capacity and Caries CSI by design.
Same biological reality — commensal depletion as a systemic dysbiosis
signal — feeds three clinical scores from a single 16S dataset. Per He
2025: commensals show *increased absolute but decreased relative*
abundance as periodontitis severity increases, which is why CDM
amplifies PBI when PDI is depleted.

## Validation cases

| Patient | PBI adj | PDI | Defense | Risk | Clinical anchor |
|---|---:|---:|---|---|---|
| Igor (Pilot.Peaq.1) | ~1.73 | 17.81 | adequate | borderline | Past Arestin, recommendation for more frequent cleanings ✓ |
| Pilot 3 (Pilot.Peaq.3) | ~0.31 | ~23.3 | adequate | stable_low_risk | "Cleanest mouth" per Igor's read ✓ |
| Gabby (Pilot.Peaq.2) | ~3.27 | ~6.3 | depleted | active_disease_risk | Mouth breathing, no documented disease — algorithm flags subclinical risk pattern; needs clinical correlation |
| Evelina (Bristle data) | ~0.99 | 4.95 | depleted | compensated_dysbiosis_risk | Bristle reported 6.7/10 "At Risk"; algorithm identifies the collapsed-defense mechanism Bristle's count-based scoring misses ✓ |

### v1.3 PDI threshold + label revision (2026-05-02)

The original PDI bands (`severely_depleted < 10`, `depleted 10–20`,
`adequate 20–35`, `robust > 35`) were tightened against early
production data. Revised bands:

| PDI | Category |
|---|---|
| < 8 | `depleted` (was `severely_depleted`) |
| 8 – 15 | `borderline` (was `depleted`) |
| 15 – 28 | `adequate` (was 20–35) |
| > 28 | `robust` (was > 35) |

**Why the rename:** "severely depleted" wasn't doing diagnostic work —
both prior bands pointed at the same intervention pathway. Collapsing
the lowest band's label to `depleted` and renaming the next band
`borderline` aligns with the risk-taxonomy term used elsewhere and is
more actionable for patients ("watch this; take steps to improve").

**Why the threshold tightening:** the prior 25–40 healthy-adult anchor
was too stringent for V3-V4 saliva sequencing. The new 20–35 anchor
better matches PDI distributions observed across the pilot cohort.

**Effect on Igor:** PDI 18.46 shifts from `depleted` (under v1.2) to
`adequate` (under v1.3), which composites to `stable_low_risk`
(low burden + adequate defense) — matching his actual clinical
context (past Arestin treatment + minimal current pathogen pressure)
better than the prior `compensated_dysbiosis_risk` did.

The composite-risk function still treats both lower bands
(`depleted` + `borderline`) as "defense depleted" — same intervention
pathway, same composite triggers (compensated_dysbiosis_risk with low
burden, active_disease_risk with high burden).

## Methodology audit notes

Incorporates lessons from caries v3 + NR-α audit cycles:
- Caveat-forward language on derived thresholds
- Explicit diagnostic uncertainty zones surfaced to users
- Hyphenated-call safety assertion (negative-input throw) at the algorithm boundary
- Conditional-modifier transparency in breakdown output

Also incorporates Perplexity expert critique (May 2026): tier weight
calibration against Yamaguchi 2018 IHC and SMDI Gini importance,
Pg×Td co-occurrence boost addition, CDM transparency requirement,
Fretibacterium / Mogibacterium versioning rule.

## Non-goals

- No parser changes (PR-Δ-α-parser if species-level F. alocis,
  C. matruchotii, F. nucleatum, S. mitis hyphenation handling not already present)
- No pipeline integration (PR-Δ-β1)
- No UI section (PR-Δ-β2 per v1.6 mockup)
- No automatic AUC validation (deferred until N=20+ kits with clinical anchor data)

## Future PRs

| PR | Scope |
|---|---|
| PR-Δ-α-parser | Parser additions / verification for periodontal species (if needed) |
| PR-Δ-β1 | Pipeline integration; persists outputs to `oral_kit_orders` columns |
| PR-Δ-β2 | UI section per the v1.6 mockup, replacing the "Gum stability" placeholder in PR-γ1's oral page |
| (later) | T. denticola qPCR integration when commercial path opens |
| (later) | Cross-panel correlation engine consumes `cross_panel_hooks` |

## Known gaps

- No multi-kit longitudinal support (single timepoint scoring only)
- Age adjustment is a known confounder (Gizaw 2026, Könönen 2007), deferred to v2
- Total bacterial load via universal 16S qPCR would significantly improve interpretation per He 2025 (deferred)
- SMDI parallel reporting deferred until V3-V4 detection issues resolved or qPCR augmentation available

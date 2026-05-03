# ADR-0025 — Upper airway cluster + halitosis v2 (PR-Ε)

**Status:** Accepted
**Date:** 2026-05-03

## Context

Fourth and fifth evidence-driven oral scoring modules after caries v3,
NR-α, and perio v1. Both ship together because they share infrastructure
(peroxide confounder gating, V3-V4 detection limits, audit-forward
modifier transparency, the same shared-species architecture).

**Upper Airway v1** is a screening tool — not a diagnostic. The USPSTF
disclaimer is mandatory.

**Halitosis v2** is the first oral module that explicitly surfaces
non-bacterial blind spots (GERD, tonsil stones, postnasal drip,
dietary, Candida) since the algorithm cannot see them. The methodology
entry treats this as a feature, not a footnote.

## Decisions

### 1. Conjunctive ≥3/4 logic for OSA bacterial signature

The four bacterial features are conjunctive: ≥3 of (Actinobacteria
enriched, Prevotella+Alloprevotella depleted, aerobic shift, Shannon
reduced) must be true to flag the bacterial OSA pattern.

**Why not 2/4:** Pilot 3 case study — in cohort testing, 2/4 fired on
clearly healthy mouths (e.g. Pilot 3: 2/4 features but commensal-
dominant, no symptoms). 3/4 produces clinically defensible specificity.

**Why not single-feature:** literature evidence is association-level,
not predictive at the single-feature level. Conjunction with two
adjacent shifts is the meaningful pattern.

### 2. STOP-only over STOP-BANG

The questionnaire uses STOP (4 items + age/sex modifiers) instead of
the full STOP-BANG (8 items including BMI and neck circumference).

**Why:** Patel 2022 meta-analysis n=14,268 found STOP sensitivity 89%
vs STOP-BANG 90% for self-administered settings. The 1-percentage-
point gain doesn't justify the additional items because BMI and neck
circumference are unreliable when self-reported. STOP-only is simpler,
faster, and equally informative for screening.

The schema does store BMI (auto-derived from height_cm + weight_kg)
and `neck_circumference_self` for future migration to STOP-BANG if
clinical follow-through warrants it.

### 3. STOP ≥2 honored as independent indication

When STOP ≥2 fires without bacterial signature (Tier 2 OSA possible —
symptoms), we still recommend sleep evaluation. Microbiome bacteria
serve as a specificity enhancer per Mashaqi 2020, not a gate.

**Gabby case study:** STOP ≥2 with no bacterial features. If the
microbiome were treated as the gating signal, she'd be missed. We
honor symptoms independently.

### 4. Sinus/nasal phenotype as separate Tier 4a

When STOP ≥2 + nasal obstruction is moderate-to-severe + bacterial
features < 3, we route to ENT/allergy first instead of sleep medicine.

**Why:** different cost path, different specialist, different
outcome. Treating chronic sinus inflammation often resolves snoring
and tiredness without sleep testing. Sending these patients straight
to a sleep study is an order-of-magnitude more expensive intervention
that may not address the upstream cause.

### 5. Multiplicative protective modifier for halitosis

Halitosis HMI = drivers × protective_modifier × LHM. The protective
modifier scales 0.40 (full protection) to 1.25 (collapsed protection).

**Why multiplicative not subtractive:** subtractive math fails when
commensals have high baseline abundance. A protective community of
20% S. salivarius would dominate any subtractive baseline, masking
real driver contribution. Multiplicative parity with perio CDM
(1.0–1.5×) gives users one mental model across modules.

**Why cap at 1.25:** prevents single-modifier domination. The cap
ensures lifestyle (LHM, capped 1.60×) and drivers all retain meaningful
weight in the final score.

### 6. Veillonella absolute cap at 1.0

Veillonella's H2S contribution is capped at an absolute 1.0 regardless
of abundance.

**Why:** Veillonella is a secondary contributor in the literature, not
a primary driver. Without the cap, a high-abundance Veillonella
sample (e.g., 20%) would dominate the H2S score by an order of
magnitude, distorting the phenotype assignment. The cap reflects
biological proportionality.

The weight itself is also magnitude-aware: 0.10× baseline rises to
0.15× only when the caries v3 module flags compensated dysbiosis
with elevated S. mutans (caries-cross-pathway VSC contribution).

### 7. Peroxide confounder as Step 0 gating

Peroxide products produce reactive oxygen species via the same
mechanism as OSA hypoxia-reoxygenation. The bacterial OSA signature
cannot distinguish them by composition alone.

**Acute high-dose** (whitening tray < 48h, strips < 48h, professional
< 7 days): hard deferral. Tier_confounded_peroxide returned with
re-test recommendation in 7–14 days.

**Chronic low-dose** (whitening toothpaste daily, peroxide mouthwash
daily, env_peroxide_flag): classification proceeds with caveat
narrative carried alongside the result.

This is the same pattern perio uses for the diagnostic uncertainty
zone — make the limitation visible rather than silently absorbing
it into the score.

### 8. Halitosis HMI categories use NHANES-anchored heuristics

Until we have N=200 internal cohort validation, the HMI category bands
(minimal < 1.0, low 1.0–2.5, moderate 2.5–5.0, high ≥ 5.0) are
derived heuristics anchored to NHANES population means.

**Transition plan documented in methodology:** when the internal
cohort validates, re-anchor to the cohort's quartile distribution and
retire the literature-anchored heuristics.

## Cohort validation

| Patient | Upper airway tier | Halitosis HMI | Phenotype |
|---|---|---|---|
| Igor (Pilot.Peaq.1) | tier_5_habitual_mouth_breathing | 0.44 minimal | low_malodor |
| Pilot 3 (Pilot.Peaq.3) | tier_6_commensal_dominant_healthy | ~0.5 minimal | low_malodor |
| Gabby (Pilot.Peaq.2) | tier_4a_sinus_driven | ~1.8 low | borderline |
| Evelina (Bristle data) | tier_7_healthy_upper_airway | ~3.96 moderate | mixed/periodontal |

Pilot 3 + acute peroxide test fixture verifies tier_confounded_peroxide
gating fires correctly.

## Schema changes

**lifestyle_records:**
- Added `tonsil_stones_history` (4-state enum) — halitosis blind-spot disclosure
- Added `last_dental_cleaning` (4-state enum) — halitosis LHM input
- Replaced `gerd_nocturnal` boolean with `gerd_frequency` (5-state enum)

**oral_kit_orders:**
- 9 new species/genus columns: s_moorei, atopobium_parvulum,
  prevotella_nigrescens, prevotella_melaninogenica, eikenella_corrodens,
  dialister_invisus, eubacterium_sulci, selenomonas_total, alloprevotella_total
- Consolidated duplicate `p_intermedia_pct` → canonical `prevotella_intermedia_pct`
- 11 upper-airway output columns
- 13 halitosis output columns

## Non-goals

- No algorithm changes to caries v3 / NR-α / perio v1
- Halitosis algorithm doesn't measure tonsil stones, GERD, postnasal
  drip, or Candida — these are blind spots disclosed in methodology

## v2.5 Calibration Update (Open Evidence May 2026)

Six additional architectural decisions, layered on top of the original
PR-Ε halitosis-v2 implementation:

### 9. P. melaninogenica weight reduced from 0.2× to 0.10×

P. melaninogenica is a universal core commensal present in the
majority of healthy individuals (Govender 2026 PacBio study, NHANES
2025 n=8,237). No in vitro data demonstrates it as a primary VSC
producer comparable to P. intermedia or P. nigrescens. Its inclusion
in halitosis-associated communities reflects co-occurrence in
dysbiotic environments rather than direct VSC production. OE
consultation explicitly recommended 0.05–0.10×; we chose the
conservative end (0.10×) to preserve some signal while preventing
single-species dominance.

### 10. Veillonella scaling becomes continuous interaction term

Washio 2014 demonstrated lactate enhances Veillonella H2S production
from L-cysteine 4.5–23.7-fold. The previous boolean caries_dysbiosis
× s_mutans threshold check is replaced with a continuous interaction
term: `lactate_enhancement = min(2.0, 1 + s_mutans_pct / 0.5)`,
applied to a base weight of 0.10×. Cap at min(1.0, ...) preserved.
More biologically accurate than a boolean threshold; degrades
gracefully when s_mutans is unavailable (enhancement = 1.0).

### 11. Category system simplified from 4 categories to 3

The previous boundary at HMI 1.0 between minimal and low produced
categorically meaningless distinctions — patients at HMI 0.7 vs 1.1
receive identical clinical guidance. New boundaries focus on
actionable thresholds: low < 2.0 (no intervention indicated),
moderate 2.0–4.5 (pathway-specific intervention), high ≥ 4.5
(comprehensive workup). No published validated thresholds exist for
any halitosis algorithm — this is acknowledged honest categorization,
not evidence-based precision.

### 12. Pathway attribution becomes primary diagnostic content

Pathway-specific intervention has the strongest evidence base in the
algorithm: Iatropoulos 2016 showed periodontal therapy specifically
reduces CH3SH; Tsai 2008 showed tongue scraping reduces H2S >50%.
The pathway field (tongue_dominant / gum_dominant / mixed /
minimal_pressure) becomes the actionable clinical output;
category is supporting context. Dominance ratio lowered from 1.5×
(phenotype tie-breaker) to 1.3× (primary diagnostic label).

### 13. `phenotype` field deprecated

Made redundant by category + pathway combination. Removed from
`HalitosisResult`, runner update payload, DB schema
(`halitosis_phenotype` column dropped), `HalitosisV2Outputs` interface
in page-data, and UI section. Replaced by `pathway` everywhere.

### 14. Subjective halitosis routing added

When `category === "low"` but `LHM > 1.30` (significant environmental
amplification), narrative explicitly routes to non-bacterial cause
investigation: postnasal drip (especially common in mouth breathers),
tonsil stones, GERD, dietary contributors, tongue coating physical
mass. Addresses the clinical case where the bacterial reading is low
but the patient has real symptoms — honest about algorithmic blind
spots rather than producing a falsely reassuring "minimal" read.

The existing `tonsil_stones_history` and `gerd_frequency` lifestyle
fields support this routing today; a future `subjective_halitosis`
questionnaire item could refine the trigger from LHM-based proxy to
direct user report.

## Future PRs

- N=200 cohort validation → re-anchor HMI category bands
- STOP-BANG migration if clinical follow-through warrants (BMI is
  already auto-derived; neck_circumference_self captured)
- Cross-panel narrative: how upper airway tier × halitosis phenotype
  × perio risk synthesize into a single airway-→-gum-→-breath story

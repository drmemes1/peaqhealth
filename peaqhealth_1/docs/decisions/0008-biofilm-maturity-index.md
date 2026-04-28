# ADR-0008: Biofilm Maturity Index

Date: 2026-04-27
Status: Pilot validation pending

## Context

Pilot users want a single, interpretable signal that summarizes the
ecological succession state of their oral biofilm. The Socransky
"complexes" framework already provides a literature-grounded ordering
from early colonizers (green/yellow) to late colonizers
(orange/red). We expose this as a numeric ratio and a four-level
stage label.

## Decision

We compute biofilm maturity as a single ratio:

```
ratio = (porphyromonas + treponema + tannerella) / ((streptococcus + actinomyces) + 0.001)
```

Stages:

| Stage | Range | Status |
|---|---|---|
| Immature | 0 ≤ r < 0.05 | strong |
| Developing | 0.05 ≤ r < 0.15 | watch |
| Mature | 0.15 ≤ r < 0.30 | watch |
| Advanced | r ≥ 0.30 | attention |

The denominator's `+ 0.001` term avoids divide-by-zero in pilot
samples where neither early colonizer is detected; the impact on the
numeric value when meaningful early colonizers are present is
negligible.

## Why this formula

- Early colonizers (Streptococcus, Actinomyces) are the canonical
  green/yellow complex anchors. Used as the reference because they
  are present in essentially every healthy mouth.
- Late colonizers (Porphyromonas, Treponema, Tannerella) are the
  red-complex genera most associated with periodontal progression in
  Socransky 1998 and subsequent reviews.
- Genus-level (rather than species-level) aggregation: pilot Illumina
  reads at our taxonomic resolution often resolve only to genus for
  these anaerobes; species-level rolling would be sparser and less
  reliable.

## Why these thresholds

The brief's thresholds (0.05 / 0.15 / 0.30) were proposed by clinical
review in advance of pilot validation. They are calibrated so that:

- Healthy adults with intact green/yellow dominance and trace red
  complex land in *immature* (most pilot users).
- Users with detectable but small red complex shifts into
  *developing*.
- The *advanced* threshold (0.30) corresponds to red-complex totals
  that would be clinically notable on their own, e.g. Porphyromonas
  > 0.5% and rising.

Status `pilot_validation_pending` until we have a baseline cohort of
≥ 50 samples with concordant clinical findings.

## What this index does NOT capture

- It is **not** a periodontitis diagnosis. Many people with elevated
  ratios have no clinical pocketing or bleeding.
- It does not weight species pathogenicity. *P. gingivalis* and
  *T. denticola* are pooled with their less-virulent congeners.
- It is insensitive to absolute microbial load: the same ratio can
  arise from very low (subgingival) or very high red-complex
  abundance.
- It does not account for genus *salivary* vs *plaque* origin.

## Citations

- Socransky SS, Haffajee AD, Cugini MA, Smith C, Kent RL Jr (1998).
  Microbial complexes in subgingival plaque. *J Clin Periodontol*
  25(2):134-44.
- Lamont RJ, Koo H, Hajishengallis G (2018). The oral microbiota:
  dynamic communities and host interactions. *Nat Rev Microbiol*
  16(12):745-759.

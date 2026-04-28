# ADR-0009: Translocation Risk Indicator

Date: 2026-04-27
Status: Pilot validation pending

## Context

A growing literature documents oral bacteria reaching the gut and
contributing to systemic and gut-local inflammatory states. Users
ask, reasonably, whether their oral panel says anything about gut
risk. We provide a single weighted indicator — explicitly not a
diagnosis — to surface that signal in a controlled way.

## Decision

We compute a weighted score:

```
score = (F.nucleatum × 2.0) + (P.gingivalis × 1.5) + (Fusobacterium genus × 0.5)
```

Levels:

| Level | Range | Status |
|---|---|---|
| Low | 0 ≤ s < 1.5 | strong |
| Moderate | 1.5 ≤ s < 3.5 | watch |
| Elevated | s ≥ 3.5 | attention |

## Why this formula

- *F. nucleatum* has the strongest evidence base for translocation
  to the gut (Atarashi 2017) and association with colorectal cancer
  niches. Highest weight (2.0).
- *P. gingivalis* has a deep evidence base in oral and systemic
  inflammation (Konig 2016) and translocation to gut and CV tissue.
  Strong but slightly less direct evidence than F. nucleatum.
  Weight 1.5.
- *Fusobacterium* genus-level fallback (0.5) acknowledges that some
  pilot samples don't resolve to species, but the genus signal is
  far less specific than the species signal — therefore weighted
  down.

## Why "indicator" not "diagnosis"

The strongest claim the literature supports is *association in
research cohorts*. There is no individual-level prediction of gut
disease from oral microbiome composition. Users with elevated
indicators are mostly asymptomatic. Framing as an *indicator* — a
quantity worth knowing for hygiene-modification decisions — is the
honest scope.

## Why these thresholds

The 1.5 / 3.5 cutoffs were chosen so that:

- A healthy adult with negligible F. nucleatum/P. gingivalis and
  low Fusobacterium genus lands in *low*.
- The *moderate* range catches the typical gingivitis-but-not-
  periodontitis user.
- *Elevated* corresponds to scores that would only arise from
  notable individual species contributions (e.g. F. nucleatum > 1.5%
  on its own). Status `pilot_validation_pending`.

## What this index does NOT capture

- **It is not a diagnosis of any gut, cardiovascular, or systemic
  disease.** It is a hygiene-modifiable signal of an oral reservoir.
- It does not predict symptoms. Most carriers are asymptomatic.
- It does not capture all candidate translocators (e.g.,
  *Streptococcus anginosus*, *Aggregatibacter*).
- It is a snapshot; transient bacteremia (post-extraction, post-
  vigorous brushing) is not in this number.

## Citations

- Atarashi K et al. (2017). Ectopic colonization of oral bacteria
  in the intestine drives Th1 cell induction and inflammation.
  *Science* 358(6361):359-365.
- Konig MF et al. (2016). Aggregatibacter actinomycetemcomitans-
  induced hypercitrullination links periodontal infection to
  autoimmunity in rheumatoid arthritis. *Sci Transl Med*
  8(369):369ra176.
- Schmidt TS et al. (2019). Extensive transmission of microbes along
  the gastrointestinal tract. *eLife* 8:e42693.

# ADR-0010: Inflammatory Pattern Signal

Date: 2026-04-27
Status: Pilot validation pending

## Context

A subset of pilot users have unexplained low-grade systemic
inflammation. Their oral panels often show shifts in community
composition that don't trigger any single existing flag. We want a
single "shape of the community" signal that captures the inflammatory
ecological drift — without claiming to measure inflammation itself or
diagnose any inflammatory disease.

## Decision

We compute a ratio:

```
signal = (prevotella + veillonella) / ((neisseria + haemophilus) + 0.1)
```

Levels:

| Level | Range | Status |
|---|---|---|
| Not present | 0 ≤ s < 0.5 | strong |
| Subtle | 0.5 ≤ s < 1.5 | watch |
| Marked | s ≥ 1.5 | attention |

The denominator's `+ 0.1` term keeps the signal numerically stable
in samples where Neisseria and Haemophilus are both at-or-near
detection limits.

## Why this formula

- *Prevotella* and *Veillonella* are repeatedly enriched in oral
  microbiomes from cohorts with low-grade systemic inflammation
  (Wei 2024 review; Jung 2026 anaerobic-shift cohort).
- *Neisseria* and *Haemophilus* are aerobic baseline genera typical
  of healthy mouths and well-buffered oral environments.
- The ratio is a *community-shape* signal, not a measurement of
  inflammation itself.

## Why "pattern signal" not "burden"

"Inflammatory burden" implies measurement of inflammation. We're
explicitly *not* doing that. A pattern signal communicates: "your
community looks similar to communities seen in inflammatory contexts
in research", without leaping to "you have inflammation".

## Explicit scope limits

- This signal does **not** mean the user has IBD, RA, lupus,
  Crohn's, ulcerative colitis, or any other inflammatory or
  autoimmune disease.
- It does not predict symptoms.
- It does not measure CRP or any cytokine.
- It does not replace a doctor's interpretation. Users with
  unexplained systemic symptoms should consult a clinician — the
  signal can be discussed there as one of many inputs.

## Why these thresholds

The 0.5 / 1.5 cutoffs were chosen so that:

- Most healthy aerobic mouths land below 0.5.
- 0.5–1.5 covers the modest anaerobic shift seen in mouth-breathers,
  high-frequency-snackers, and users with mild gingivitis.
- ≥ 1.5 corresponds to compositions clinically notable on their own.

Status `pilot_validation_pending`.

## Citations

- Wei Y et al. (2024). Prevotella, Veillonella and the inflammatory
  oral milieu. (review)
- Jung H et al. (2026). Anaerobic shifts in the supra-gingival plaque
  associated with low-grade systemic inflammation.

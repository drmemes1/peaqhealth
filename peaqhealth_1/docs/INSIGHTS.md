# Peaq Health — INSIGHTS.md
## Connection Rules Engine + Cross-Panel Intelligence

**Version:** 1.1  
**Date:** April 2026  
**Status:** Active — expands as pilot data accumulates  
**Classification:** Internal / Confidential — core product IP

---

## What This Document Is

This is the logic layer that powers the "connection line" at the top of every marker page in the Peaq dashboard. When a user opens any biomarker, bacterial classification, or sleep metric, the system checks whether that marker has a meaningful cross-panel relationship with anything else in their profile. If it does, the connection line fires. If it does not, the space is simply absent — no forced connections, no empty states.

Every rule maps to a peer-reviewed biological pathway. The copy is written for someone who has never heard of nitric oxide or CRP. The science section of each marker page (collapsed by default) carries the citations.

---

## Architecture

```
ConnectionEngine.evaluate(user_profile) → ConnectionLine[]

For each marker page the user opens:
  1. Look up all rules where this marker is involved
  2. Check firing conditions against user's current data
  3. Check QC gates (data freshness, completeness)
  4. If rule fires → return { headline, expanded_copy, action_nudge, priority }
  5. If multiple rules fire for same marker → show highest priority only
  6. If no rules fire → connection line absent (never rendered, not hidden)
```

### Priority Tiers

| Priority | Meaning | When |
|---|---|---|
| 1 (highest) | Unfavorable coherence — two panels reinforcing a negative signal | Both markers in concerning range |
| 2 | Favorable coherence — two panels reinforcing a positive signal | Both markers in optimal range |
| 3 | Mixed signal — one panel favorable, one unfavorable | Opportunity framing |

When multiple rules fire for the same marker: show Priority 1 first. If no Priority 1, show Priority 2. Priority 3 only if nothing else fires.

---

## QC Gates (Must Pass Before Any Rule Fires)

| Gate | Requirement | If not met |
|---|---|---|
| Blood panel freshness | ≤ 6 months since draw | All blood-involving rules = silent |
| Oral test freshness | ≤ 6 months since Zymo kit | All oral-involving rules = silent |
| Wearable data minimum | ≥ 14 nights in past 30 days | All sleep-involving rules = silent |
| RHR baseline | ≥ 7 days of RHR data | All RHR-involving rules = silent |
| HRV baseline | ≥ 14 days of RMSSD data | All HRV-involving rules = silent |
| CRP acute exclusion | CRP ≤ 10.0 mg/L | All CRP rules = silent (likely acute infection) |
| Antibiotics exclusion | No antibiotics in past 60 days | All oral rules = silent (OMA QC gate) |

---

## Summary of All Rules

| Rule | Panels | Direction | Headline (short) |
|---|---|---|---|
| 1A | Oral × Blood (LDL) | Unfavorable | Oral bacteria making LDL harder to manage |
| 1B | Oral × Blood (CRP) | Unfavorable | Oral microbiome and inflammation connected |
| 1C | Oral × Blood (CRP) | Favorable | Oral health and inflammation working together |
| 1D | Oral × Wearable (RHR) | Unfavorable | Resting heart rate connected to oral health |
| 1E | Oral × Blood (HbA1c) | Unfavorable | Oral bacteria and blood sugar influencing each other |
| 2A | Oral × Blood (CRP) | Unfavorable | Gum bacteria driving inflammation higher |
| 2B | Oral × Wearable (HRV) | Unfavorable | Recovery metric linked to oral pathogens |
| 2C | Oral × Blood (CRP) | Favorable | Oral health contributing to low inflammation |
| 3A | Wearable × Blood (CRP) | Unfavorable | Inflammation and sleep compounding |
| 3B | Wearable × Blood (CRP) | Favorable | Sleep keeping inflammation in check |
| 3C | Wearable × Wearable | Unfavorable | Sleep and heart rate signaling same thing |
| 4A | Oral × Wearable (sleep) | Exploratory | Possible oral/sleep quality connection |
| 5A | Oral × Wearable (RHR) | Favorable | Oral health and CV fitness reinforcing |
| 5B | Oral × Wearable (RHR) | Unfavorable | Oral and CV metrics pulling each other down |
| 6A | Oral (internal) | Unfavorable | Competing bacteria blocking NO pathway |
| 7A | Oral (caries × OMA) | Unfavorable | Cavity bacteria thriving while protective depleted |
| 8A | Oral trend × Blood trend | Favorable | Oral improved and blood age followed |
| 8B | Oral trend × Blood trend | Unfavorable | Oral declined and inflammation increased |
| 8C | Wearable × Wearable trend | Favorable | Better sleep showing up in heart rate |
| 9A | Oral × Demographics | Unfavorable | Oral bacteria and long-term brain health |
| 9B | Oral × Wearable (HRV) | Unfavorable | Oral inflammation affecting nervous system recovery |
| 10A | Oral × Blood (autoimmune) | Unfavorable | Oral bacteria connected to joint inflammation |
| 11A | Oral (breath × pathogen) | Unfavorable | Breath bacteria linked to broader dysbiosis |
| 12A | Oral × Blood (HbA1c) | Unfavorable | Cavity bacteria and blood sugar influencing each other |
| 12B | Oral × Blood (glucose) | Unfavorable | Bacteria blocking metabolic benefit of vegetables |
| 13A | Oral × Wearable (sleep) | Unfavorable | Oral bacteria associated with sleep-disordered breathing |
| 13B | Lifestyle × Wearable (REM) | Unfavorable | Nasal history affecting sleep architecture |
| 14A | Lifestyle × Oral × Blood | Unfavorable | Daily habit contributing to multiple panel findings |
| 15A | Blood × Wearable | Unfavorable | Blood age older than expected, sleep contributing |
| 15B | Blood × Oral | Favorable | Oral health contributing to younger blood age |
| 16A | Blood × Oral | Unfavorable | Low vitamin D reducing oral immune defense |
| 16B | Blood × Wearable | Unfavorable | Low vitamin D associated with poor deep sleep |
| 17A | Oral × Blood × Wearable | Unfavorable | Triple cardiovascular convergence |

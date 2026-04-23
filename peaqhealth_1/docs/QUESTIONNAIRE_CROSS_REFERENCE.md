# Questionnaire Cross-Reference Map

**Version:** 1.0
**Date:** April 2026
**Purpose:** Maps every lifestyle questionnaire question to where it's used in the product — deterministic rules, AI prompts, UI display, and what's not wired yet.

---

## Actively Cross-Referenced (13 questions)

### Demographics

| # | Question | DB field | Used in | Cross-references with |
|---|----------|----------|---------|----------------------|
| 1 | How old are you? | `age_range` | user-context (age derivation), AI narrative prompt | Blood thresholds (age-adjusted), HRV age reference |
| 2 | What's your biological sex? | `biological_sex` | user-context, observations engine, AI prompts | HDL threshold (50F/40M), blood reference ranges |

### Sleep & Breathing

| # | Question | DB field | Used in | Cross-references with |
|---|----------|----------|---------|----------------------|
| 3 | How many hours do you sleep? | `sleep_duration` | sleep-duration signal, converge observations | Blood glucose/HbA1c (short-sleep-metabolic rule) |
| 6 | Wake up feeling unrefreshed? | `non_restorative_sleep` | sleep-quality signal | Affects quality verdict; UARS triad in AI prompt |
| 7 | Excessively sleepy during day? | `daytime_fatigue` | sleep-quality signal, cognitive signal | Combined with fog + headaches for cognitive verdict |
| 9 | Mentally cloudy / struggle to focus? | `daytime_cognitive_fog` | cognitive signal | Cognitive flag count; UARS triad in AI prompt |
| 10 | Snore or diagnosed sleep apnoea? | `snoring_reported` | airway signal, sleep panel | Airway flag count |
| 11 | Stop breathing / gasp in sleep? | `osa_witnessed` | airway signal | Airway flag; cross-panel rule in AI prompt with oral envPattern |
| 12 | Breathe through your mouth? | `mouth_breathing` + `mouth_breathing_when` | breathing signal, converge observations, sleep panel | Oral envPattern for 2-source confirmation (hero finding) |
| 13 | Nose blocked or stuffy? | `nasal_obstruction` + `nasal_obstruction_severity` | airway signal, converge observations | Sinus history for airway profile rule |
| 14 | Wake up with headache? | `morning_headaches` | airway signal, cognitive signal | Airway + cognitive flag counts |
| 15 | Grind or clench teeth at night? | `bruxism_night` | sleep panel recovery card | Displayed alongside stress level |

### Body

| # | Question | DB field | Used in | Cross-references with |
|---|----------|----------|---------|----------------------|
| 22-23 | Height + Weight | `bmi_calculated` | airway signal | Flagged if BMI >30 as airway risk factor |

### Sinus (from questionnaire fields)

| # | Question | DB field | Used in | Cross-references with |
|---|----------|----------|---------|----------------------|
| — | Sinus history | `sinus_history` | converge observations, airway signal | Nasal obstruction for sinus-airway-profile rule |

---

## Wired in Phase A (5 questions — April 2026)

| # | Question | DB field | Wired in | Cross-references with |
|---|----------|----------|----------|----------------------|
| 16 | Smoke, vape, tobacco? | `smoking_status` | converge observations, planItems | Fusobacterium, Porphyromonas, Neisseria — dual suppression/elevation pattern |
| 18 | How often do you floss? | `flossing_freq` | converge observations (escalation), planItems | Gum bacteria (Fuso, Porph, Agg) — daily flosser with elevated bacteria = deeper pockets |
| 20 | How often leafy greens / beets? | `dietary_nitrate_frequency` | converge observations (escalation), planItems | Neisseria — high intake + low Neisseria = active suppressor |
| 21 | How often sugary foods/drinks? | `sugar_intake` | converge observations, planItems | S. mutans, S. sobrinus — sugar frequency drives acid attacks |
| 24 | Last antibiotics? | `antibiotics_window` | converge observations, planItems | Shannon diversity, Neisseria — transient suppression confounder |

---

## Collected but NOT Cross-Referenced (8 questions)

### Passed to AI narrative prompt only (no deterministic rule fires)

| # | Question | DB field | Passed to AI? | Gap / opportunity |
|---|----------|----------|---------------|-------------------|
| 17 | Acid reflux / heartburn at night? | `gerd_nocturnal` | Yes | **Should fire**: GERD × oral acidity (pH balance). Nocturnal reflux changes oral pH and can shift acid-producing bacteria |
| 25 | Take a PPI daily? | `medication_ppi_detail` | Yes (v8 confounder) | **Should fire**: PPI × pH balance API. PPIs shift oral pH — if pH is unusually well-buffered, PPI may be a contributor |

### Not used anywhere

| # | Question | DB field | Used in | Gap / opportunity |
|---|----------|----------|---------|-------------------|
| 4 | How long to fall asleep? | `sleep_latency` | Display only (sleep panel) | Could fire: latency >30min × sleep duration <7hrs × cognitive fog = sleep-onset insomnia pattern |
| 5 | Rate your sleep quality? | `sleep_qual_self` | Not used | Subjective vs objective discrepancy when wearable lands |
| 8 | Nights per week wake up? | `night_wakings` | Display only (sleep panel) | Could fire: frequent wakings × non-restorative sleep = fragmented architecture signal |
| 19 | Peroxide whitening products? | `whitening_frequency` | AI prompt only | Peroxide confounder for aerobic shift in oral bacteria — already in AI prompt as env_peroxide_flag |
| 26 | Caffeine cutoff time? | `caffeine_cutoff` | Not used anywhere | Could cross-ref: late caffeine × sleep latency × sleep quality |
| — | Sleep position? | `sleep_position_primary` | Not used | Could fire: supine + snoring = positional airway involvement |
| — | Stress level? | `stress_level` | Display only (sleep panel) | Could cross-ref: high stress × elevated hs-CRP × HRV (when wearable) |
| — | Jaw fatigue morning? | `jaw_fatigue_morning` | Not used | Could fire: jaw fatigue + bruxism + morning headaches = bruxism triad |

---

## Priority Gaps to Wire Next

### Tier 1 — High impact, data already exists

1. **Smoking × gum bacteria** — deterministic rule in observations.ts
2. **Sugar intake × cavity bacteria × HbA1c** — deterministic triangle rule
3. **Recent antibiotics × Shannon diversity** — flag as temporary disruption
4. **Flossing × gum bacteria** — surprising-positive / unexpected-negative patterns
5. **Dietary nitrate × Neisseria** — confirm/complicate the diet-bacteria link

### Tier 2 — Medium impact

6. **PPI × pH balance** — confounder for well-buffered findings
7. **GERD × oral acidity** — nocturnal reflux shifts oral pH
8. **Stress × hs-CRP** — when wearable HRV arrives
9. **Caffeine × sleep latency** — simple cross-ref
10. **Sleep position × snoring** — positional airway signal

### Tier 3 — Useful when wearable data arrives

11. **Self-rated quality vs wearable quality** — discrepancy detection
12. **Night wakings × sleep efficiency** — fragmentation confirmation
13. **Jaw fatigue + bruxism + headaches** — bruxism triad

---

## How This Document Stays Current

When adding a new question:
1. Add the row to the appropriate table above
2. Note which systems consume it (signal helper, observation rule, AI prompt, planItems, display only)
3. If it's "not used anywhere," add it to the Priority Gaps section with the intended cross-reference

When wiring a new cross-reference:
1. Move the question from "NOT Cross-Referenced" to "Actively Cross-Referenced"
2. Update the "Cross-references with" column
3. Remove from Priority Gaps

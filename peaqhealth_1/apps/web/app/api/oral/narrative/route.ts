import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { ageRangeToMidpoint } from "../../../../lib/score/recalculate"
import { getRelevantEvidence } from "../../../../lib/evidence/relevant-evidence"
import { buildEvidencePromptSection } from "../../../../lib/evidence/prompt-builder"
import { stripInlineCitations } from "../../../../lib/evidence/citation-stripper"
import { CATEGORY_TOPICS } from "../../../../lib/evidence/category-topic-map"
import { hashUserId } from "../../../../lib/logging/safe-log"

export const dynamic = "force-dynamic"

const PROMPT_VERSION = "v9"

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const avg = (arr: number[]): number | null =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null

const cv = (arr: number[]): number | null => {
  if (arr.length < 2) return null
  const m = arr.reduce((a, b) => a + b, 0) / arr.length
  if (m === 0) return null
  const variance = arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length
  return Math.sqrt(variance) / m
}

const n = (v: unknown): number | null => {
  if (v == null) return null
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}

/**
 * Oral narrative system prompt — SOURCE OF TRUTH
 *
 * This prompt is the authoritative version. There is no external .md file.
 * When updating, update the version number below and add a note to the
 * change log in docs/INSIGHTS.md.
 *
 * Current version: v9
 */
const SYSTEM_PROMPT = `# ORAVI — ORAL NARRATIVE SYSTEM PROMPT
# Version 5.0
# Panels: Oral microbiome (L7) · Blood biomarkers · Sleep (wearable + questionnaire OR questionnaire only) · Lifestyle
# Use: Paste as the system prompt for the oral insight engine edge function.

---

## ROLE

You are the Oravi oral insight engine. You receive structured data from four panels — oral microbiome (species-level L7 16S sequencing), blood biomarkers, sleep data (wearable metrics, a 16-question NHANES-aligned questionnaire, or both), and a lifestyle questionnaire. Sleep data comes in three tiers; not all panels will be present for every user.

Your job is to produce a short, warm, personalised narrative that surfaces what the data is showing across all available panels — connecting signals where the science supports it, being explicit about uncertainty where it does not. When a wearable would meaningfully sharpen the picture, you say so directly and specifically.

You do not diagnose. You do not prescribe. You do not alarm. You surface patterns and connections that a knowledgeable, honest friend would point out if they had access to all of this data at once.

---

## DATA INTEGRITY RULES (absolute priority)

1. Only state what the provided data explicitly shows. Never claim absence, presence, or a pattern unless the data field confirms it.

2. If a summary field is null or missing, DO NOT infer a positive default. State "not yet computed" or omit the topic entirely.

3. Raw species percentages are ground truth. If any species is above its target threshold, it MUST be reflected in the narrative — even if summary fields suggest otherwise.

4. Red/orange complex bacteria (Porphyromonas, Tannerella, Treponema, Fusobacterium, Aggregatibacter, Campylobacter, P. intermedia) above their targets ALWAYS take narrative priority over aggregate summary labels. Never claim these are "low" or "absent" without checking each species individually.

5. Before writing the narrative, mentally verify: does my summary match the raw numbers? If raw numbers contradict summary fields, the raw numbers win.

---

## ABSOLUTE LANGUAGE RULES

Non-negotiable. Apply to every sentence of every output.

### NEVER use:
- diagnose, diagnosis, screen, screening tool, evaluate
- sleep apnea, OSA, apnea, apnoea, stop breathing, apneic episodes, AHI
- you have, you may have, signs of, evidence of, indicates you have
- gum disease, periodontitis, gingivitis, cavities, tooth decay, dental caries
- we recommend, you should, you need to, make sure you, you must
- dangerous, alarming, concerning, urgent, serious, worrying
- this confirms, this proves, this means you have
- risk factor, high risk, elevated risk, at risk for
- mortality, death, survival, hazard ratio, odds ratio

### ALWAYS use instead:
- "your data is showing patterns"
- "population research has found associations between X and Y"
- "this is worth keeping an eye on"
- "a medical or dental professional can help contextualise this"
- "these are observational findings — they describe patterns across groups, not predictions for individuals"
- "gum-linked bacteria" not "periodontal pathogens"
- "cavity-associated bacteria" not "caries bacteria"
- "nighttime breathing pattern" not "sleep apnea"

### TONE
Warm, curious, honest. Confident about what the data shows. Humble about what it means. The voice of a knowledgeable friend who happens to have your data — not a clinician reading a chart. Never clinical. Never alarming. Never over-reassuring when something deserves attention.

---

## INPUT DATA STRUCTURE

You receive a JSON object. Fields marked optional may be null or absent — handle gracefully.

{
  "user": {
    "age": 38,
    "sex": "male",
    "collection_date": "2026-04-12"
  },
  "oral": {
    "shannon_diversity": 6.09,
    "species_count": 185,
    "interpretability_tier": "full",
    "env_peroxide_flag": false,
    "env_dietary_nitrate_flag": false,
    "no_primary": { "neisseria_pct": 14.80, "haemophilus_pct": 2.90, "combined_pct": 17.70 },
    "no_secondary": { "rothia_pct": 8.37, "actinomyces_pct": 7.38, "veillonella_pct": 4.29, "combined_pct": 22.04 },
    "gum_red_complex": { "porphyromonas_pct": 2.18, "tannerella_pct": 0.07, "treponema_pct": 0.09, "combined_pct": 2.34 },
    "gum_orange_complex": { "fusobacterium_pct": 2.63, "aggregatibacter_pct": 1.84, "campylobacter_pct": 1.07, "prevotella_intermedia_pct": 0.20, "combined_pct": 5.74 },
    "caries_risk": { "s_mutans_pct": 0.271, "s_sobrinus_pct": 0.236, "scardovia_pct": 0.183, "lactobacillus_pct": 0.0, "combined_pct": 0.507 },
    "caries_protective": { "s_sanguinis_pct": 1.90, "s_gordonii_pct": 0.41, "combined_pct": 2.31 },
    "streptococcus_genus_pct": 25.33,
    "s_salivarius_pct": 15.28,
    "prevotella_commensal_pct": 7.08,
    "environment_index": {
      "acid_ratio": 0.390,
      "acid_label": "balanced",
      "aerobic_score_pct": 30.55,
      "anaerobic_load_pct": 5.52,
      "aerobic_anaerobic_ratio": 5.5,
      "pattern": "mixed",
      "pattern_confidence": "low",
      "pattern_description": "aerobic shift with active periopathogens"
    },
    "differential_scores": {
      "score_osa": 38, "score_uars": 45, "score_mouth_breathing": 62,
      "score_periodontal_activity": 71, "score_bruxism": 30, "score_caries_risk": 22,
      "primary_pattern": "periodontal_activity",
      "secondary_pattern": "mouth_breathing"
    },
    "caries_panel": {
      "ph_balance_api": 0.115,
      "ph_balance_category": "well_buffered",
      "ph_balance_confidence": "moderate",
      "cariogenic_load_pct": 0.690,
      "cariogenic_load_category": "elevated",
      "protective_ratio": 5.21,
      "protective_ratio_category": "strong"
    }
  },
  "blood": {
    "collection_date": "2025-06-11",
    "ldl_mgdl": 88, "hdl_mgdl": 55, "triglycerides_mgdl": 75, "total_cholesterol_mgdl": 158,
    "hba1c_pct": 5.7, "glucose_mgdl": 100,
    "hs_crp_mgl": null, "wbc_kul": 4.7, "hematocrit_pct": 43.8,
    "tsh_uiuml": 0.09, "free_t4_ngdl": 1.9,
    "egfr_mlmin": 75, "vitamin_d_ngml": 58, "vitamin_b12_pgml": 736,
    "ferritin_ngml": null
  },
  "sleep": {
    "tier": "tier_1",
    "wearable": {
      "provider": "Oura",
      "nights_available": 14,
      "avg_respiratory_rate_bpm": 14,
      "rr_nightly_cv": 0.18,
      "avg_hrv_ms": 37,
      "avg_rhr_bpm": 59,
      "avg_sleep_hours": 6.73,
      "avg_deep_sleep_minutes": 60,
      "avg_waso_minutes": null,
      "rem_hours": 2.42,
      "sleep_efficiency": null,
      "avg_spo2": null,
      "spo2_nights_below_94": null
    },
    "questionnaire": {
      "sleep_time_weekday": "23:15",
      "wake_time_weekday": "06:30",
      "sleep_time_weekend": "00:45",
      "wake_time_weekend": "08:30",
      "sleep_latency_band": "15_30",
      "social_jet_lag_hours": 1.5,
      "weekday_sleep_hours": 7.25,
      "weekend_sleep_hours": 7.75,
      "night_waking_freq": "occasionally",
      "early_morning_waking_freq": "rarely",
      "non_restorative_sleep_freq": "occasionally",
      "daytime_sleepiness_freq": "occasionally",
      "snoring_freq": "occasionally",
      "witnessed_apnea_freq": "rarely",
      "dry_mouth_waking_freq": "often",
      "concentration_tired_freq": "occasionally",
      "told_doctor_sleep": false,
      "sleep_disorder_dx": null,
      "sleep_medication_freq": "never"
    }
  },
  "lifestyle": {
    "whitening_frequency": "daily_toothpaste",
    "dietary_nitrate_frequency": "several_weekly",
    "night_guard_worn": "never",
    "night_guard_type": null,
    "morning_headaches": "occasionally",
    "jaw_fatigue_morning": "never",
    "daytime_cognitive_fog": "occasionally",
    "tongue_position_awareness": "tongue_low",
    "nasal_obstruction": "chronic",
    "nasal_obstruction_severity": "moderate",
    "mouth_breathing": "confirmed",
    "mouth_breathing_when": "sleep_only",
    "sinus_history": "surgery",
    "antiseptic_mouthwash_daily": false,
    "mouth_tape_nightly": false,
    "gerd": "no",
    "gerd_nocturnal": false,
    "bmi_calculated": 24.2,
    "known_hypertension": false,
    "smoking_status": "never",
    "sugar_intake": "occasional",
    "antibiotics_window": "none",
    "medication_ppi_detail": null
  }
}

---

## SLEEP DATA TIER LOGIC

Before anything else, detect which sleep tier applies. sleep.tier is authoritative.

Tier 1 — Wearable + Questionnaire
Both objective overnight measurements and 16-question self-report. Full cross-panel inference is available. All breathing, HRV, and sleep architecture rules can fire at full confidence.

Tier 2 — Questionnaire only (no wearable)
16 self-reported answers without objective overnight data. Most cross-panel rules still fire but at reduced confidence. Breathing-related scoring is capped. Narrative includes a specific, contextual note about what a wearable would add — not generic, not pushy.

Tier 3 — Neither (oral and blood only)
No sleep data at all. Do not speculate about breathing patterns from oral bacteria alone. One sentence at the end of the breathing section noting that sleep data would complete the picture.

---

## ORAL REFERENCE RANGES

Signal | Healthy adult range | Source
Shannon diversity | 4.0–5.5 | Hisayama Study n=2,343
Neisseria | 10–13% | Multiple cohorts
Haemophilus | ≥4% target | JAMA 2025
NO primary combined | 5–20% | Multiple cohorts
Porphyromonas | <0.5% | Socransky 1998
Tannerella | <0.5% | Socransky 1998
Treponema | <0.5% | Socransky 1998
Fusobacterium | <0.5% | Haffajee & Socransky 2005
Aggregatibacter | <0.5% | Haffajee & Socransky 2005
S. mutans + sobrinus combined | <0.5% | Meta-analysis 19 studies
S. sanguinis | ≥1.5% | Multiple cohorts
Acid/base ratio | 0.3–0.5 balanced | 2016 clinical validation
Aerobic/anaerobic ratio | 1–4× normal | Chen 2022, Frontiers 2025

---

## BLOOD REFERENCE RANGES

Marker | Optimal | Flag if
LDL | <100 mg/dL | >130 elevated, >160 high
HDL | ≥50 women, ≥40 men | below threshold
Triglycerides | <100 mg/dL | >150 elevated, >200 high
HbA1c | <5.7% | ≥5.7 threshold, ≥6.5 clinical
Fasting glucose | 70–99 mg/dL | ≥100 threshold, ≥126 clinical
hs-CRP | <1.0 mg/L | 1–3 intermediate, >3 elevated
TSH | 0.45–4.5 µIU/mL | <0.45 suppressed, >4.5 elevated
Free T4 | 0.8–1.8 ng/dL | >1.8 elevated
HRV (38M ref) | 45–65 ms | <40 ms below age range
RHR | <60 bpm | >80 resting
Vitamin D | 40–80 ng/mL | <30 insufficient, <20 deficient
eGFR | ≥90 | <90 mildly reduced

---

## NHANES QUESTIONNAIRE SCALE

All frequency fields use this scale: never | rarely | occasionally | frequently.

Interpretation:
- never → no signal, do not surface
- rarely → 1–2 nights/week, weak signal, note but do not weight heavily
- occasionally → 3–4 nights/week, meaningful signal, fire cross-panel rules
- frequently → 5+ nights/week, strong signal, fire cross-panel rules at full weight

---

## BLOOD–SLEEP INTERACTIONS

Use when both blood and sleep data (either tier) are present.

1. HbA1c / glucose ↔ sleep duration
Sleep restriction (<7h) raises HbA1c and fasting glucose. Sleep loss reduces insulin sensitivity and elevates 24h glucose by 15–21% in RCTs.
Fire when: HbA1c ≥5.7% AND weekday_sleep_hours <7.0
Language: "Population research has consistently found associations between shorter sleep and blood sugar regulation — your weekday sleep average of [X] hours and HbA1c of [Y]% are sitting alongside each other in a way that's worth keeping an eye on."

2. HRV ↔ sleep architecture (tier 1 only)
HRV reflects parasympathetic tone, restored during slow-wave sleep. Fragmented sleep, short deep sleep, and high WASO suppress HRV.
Fire when: HRV below age reference AND deep_sleep <45min OR sleep_efficiency <85%
Attribute to TSH first if TSH is outside the typical range — thyroid takes precedence.

3. TSH / thyroid ↔ HRV (priority attribution)
Suppressed TSH with elevated FT4 directly suppresses HRV through adrenergic tone.
Fire when: TSH <0.45 AND HRV below age reference
Priority: This attribution comes BEFORE sleep or oral inflammation as an HRV explanation. Always check TSH first.

4. hs-CRP ↔ systemic inflammation
CRP is elevated by poor sleep, by gum-linked bacteria (Porphyromonas), and by metabolic dysfunction.
Fire when: hs-CRP >1 mg/L AND (gum_red_complex >1% OR non_restorative_sleep_freq in {occasionally, frequently})
Do not speculate about CRP if null.

5. Vitamin D ↔ sleep quality
Low vitamin D (<30) independently associated with shorter and poorer sleep in multiple large cohorts.
Fire when: vitamin_d <30 AND weekday_sleep_hours <7

6. Triglycerides ↔ sleep-disordered breathing
Elevated triglycerides consistently associated with sleep-disordered breathing, independent of BMI.
Fire when: triglycerides >150 AND (witnessed_apnea_freq in {occasionally, frequently} OR wearable SpO2 dips present)

7. RHR ↔ sleep fragmentation
Elevated overnight RHR (>65 bpm) associates with fragmented architecture.
Fire when: avg_rhr_bpm >65 AND non_restorative_sleep_freq in {occasionally, frequently}

8. Social jet lag ↔ HbA1c / lipids / CRP
Weekend-weekday sleep midpoint shift ≥1h independently associated with higher HbA1c, higher triglycerides, higher CRP after adjustment for sleep duration. Circadian disruption is the mechanism.
Fire when: social_jet_lag_hours ≥1.5 AND (HbA1c ≥5.7 OR triglycerides >150 OR hs_crp >1)
Language: "Your weekend sleep timing shifts about [X] hours from your weekday schedule — a pattern called social jet lag that population research associates with metabolic markers independently of total sleep duration. Worth keeping in mind alongside your [relevant blood marker]."

---

## ORAL–BLOOD INTERACTIONS

1. Haemophilus ↔ HbA1c
Lower Haemophilus associated with impaired glucose regulation via NO pathway.
Fire when: Haemophilus <4% AND (HbA1c ≥5.7 OR glucose ≥100)

2. Neisseria ↔ BP / triglycerides
NHANES: Neisseria associated with lower SBP (adj rho −0.051) and lower TG.
Fire when: Neisseria >10% AND triglycerides <100 — surface as positive finding.

3. Porphyromonas ↔ hs-CRP
Porphyromonas gingipains enter circulation, found in atherosclerotic plaque.
Fire when: Porphyromonas >0.5% AND hs_crp >1.0

4. Tannerella ↔ LDL
NHANES: adj rho +0.101, strongest single oral-blood association in the dataset.
Fire when: Tannerella >0.3% AND LDL >110 — note as strongest cross-panel association in population research.

5. Prevotella commensal ↔ metabolic markers
Commensal Prevotella associated with better TG and LDL. Species-level distinction matters.
Fire when: Prevotella commensal >5% — surface as positive.

6. Streptococcus genus ↔ HbA1c / hs-CRP
NHANES association driven by S. mutans not S. salivarius.
Fire when: S. mutans >0.5% AND HbA1c ≥5.7. Do not surface for high S. salivarius.

---

## ORAL–SLEEP INTERACTIONS

1. Aerobic/anaerobic ratio ↔ breathing pattern

Oral ratio | Sleep signal | Interpretation
>10× + anaerobic <1% | SpO2 dips (tier 1) OR witnessed_apnea frequently | OSA-consistent pattern — both panels corroborate
>4× + anaerobic <1% | SpO2 normal OR witnessed_apnea rarely/occasionally | UARS or peroxide confounder
>4× + anaerobic elevated | Any sleep signal | Mouth breathing with periodontal activity
<4× | Any | Breathing pattern signal not present in oral

Peroxide flag override: If env_peroxide_flag is true, the ratio loses breathing-pattern interpretive weight. Surface peroxide as primary alternative explanation.

2. Witnessed apnea (SLQ040) ↔ oral environment index — KEY QUESTIONNAIRE RULE
This is the single most important questionnaire-to-oral cross-panel rule and the variable our NHANES analysis is built on.
Fire when: witnessed_apnea_freq in {occasionally, frequently} AND env_aerobic_anaerobic_ratio >4 AND env_anaerobic_load_pct <2
Language tier 1: "Your wearable and your questionnaire are both pointing at the same pattern as your oral data — overnight breathing disturbance is the most consistent explanation across three independent sources."
Language tier 2: "Your questionnaire is reporting [occasional/frequent] snorting, gasping, or stopped breathing overnight — and your oral bacteria are showing the community pattern population research associates with that same breathing disturbance. Two independent data sources pointing at the same thing."

3. Snoring frequency + dry mouth on waking ↔ mouth breathing pattern
Fire when: snoring_freq in {occasionally, frequently} AND dry_mouth_waking_freq in {often, frequently} AND env_aerobic_score_pct >18
Language: "Your questionnaire shows regular snoring and waking with a dry mouth — two signals that together point at mouth breathing during sleep. Your oral community is showing the aerobic shift that population research associates with this pattern."

4. UARS symptom triad (questionnaire) ↔ oral environment index
Triad: non_restorative_sleep_freq (occasionally/frequently) + daytime_cognitive_fog (occasionally/frequently) + concentration_tired_freq (occasionally/frequently) + morning_headaches (occasionally/frequently, from lifestyle)
Fire when: 3+ of 4 triad components AND env_aerobic_anaerobic_ratio >4 AND env_anaerobic_load_pct <2
Language: "A group of self-reported symptoms — non-restorative sleep, morning cognitive fog, difficulty concentrating, and morning headaches — tend to appear together in the research literature on upper airway resistance. Your oral bacteria are showing the community pattern associated with that same picture."

5. Dry mouth on waking ↔ aerobic community shift (proprietary signal)
Fire when: dry_mouth_waking_freq in {often, frequently} AND env_aerobic_score_pct >18
Language: "Waking with a dry mouth is one of the most reliable self-reported signals for mouth breathing during sleep. Your aerobic oral community shift fits this picture — the bacteria that thrive when the mouth is drier overnight."

6. Social jet lag ↔ oral inflammation (emerging)
Fire when: social_jet_lag_hours ≥2 AND gum_red_complex >1%
Language (soft): "Your weekend sleep timing shifts significantly from your weekday schedule. Circadian disruption is increasingly recognised as a systemic inflammatory input, which can manifest in oral tissue as well — worth noting alongside the gum pattern your bacterial data is showing."

7. Sleep medication ↔ oral community (confounder)
SSRIs and benzodiazepines cause xerostomia and shift the oral community toward aerobic species.
Fire when: sleep_medication_freq in {occasionally, frequently} AND env_aerobic_score_pct >18
Language: "You've reported using sleep medication regularly. Many sleep medications reduce saliva flow overnight, which on its own can shift oral bacteria toward the pattern your data is showing. Worth flagging as a possible contributor before drawing conclusions about breathing patterns."

8. Sleep disorder diagnosis ↔ narrative framing (priority override)
If sleep_disorder_dx includes "sleep_apnea":
Do not surface breathing findings as new information. Frame as: "Given your sleep apnea diagnosis, the [oral pattern] is consistent with what's documented in population research for that condition. Worth discussing with whoever manages your treatment to see if there are trends to track over time."

9. RR nightly CV ↔ UARS signal (tier 1 only)
Fire when: rr_nightly_cv >0.25 AND env_aerobic_anaerobic_ratio >4
Language: "Your night-to-night breathing variability alongside the aerobic shift in your oral community is a combination that population research associates with disrupted sleep architecture."

---

## SLEEP DATA TIER COPY RULES

TIER 1 — Wearable + Questionnaire present

If SpO2 dips + witnessed_apnea occasionally/frequently + oral OSA pattern:
"Your overnight oxygen data shows [X nights with dips below 94%], your questionnaire is reporting [witnessed_apnea_freq] snorting or gasping during sleep, and your oral community shows the pattern population research associates with altered nighttime breathing. Three independent data sources pointing at the same thing."

If SpO2 normal + witnessed_apnea rarely + oral aerobic shift + dry mouth often:
"Your overnight oxygen levels are settled — which makes the most significant forms of nighttime breathing change less likely. Your oral community is still showing an aerobic shift that population research associates with altered nighttime conditions. When overnight oxygen is normal but this oral pattern and your reported dry mouth on waking are present together, mouth breathing during sleep is the most consistent explanation in the research literature."

If questionnaire-wearable discrepancy (e.g. user reports very good sleep but wearable shows poor efficiency and high WASO):
"Your subjective sleep quality and your wearable data are telling slightly different stories this cycle — you're reporting [subjective quality] but the wearable is showing [objective finding]. This kind of discrepancy is common and often means sleep architecture is being disrupted in ways that don't rise to conscious awareness. Worth noting as a pattern to watch over time."

TIER 2 — Questionnaire only

Pick the upsell template that matches what the questionnaire is showing:

If witnessed_apnea occasionally/frequently + oral OSA pattern:
"Your questionnaire is flagging overnight breathing disturbance and your oral data is corroborating it. Overnight oxygen monitoring from a wearable would tell us how often your breathing is interrupted during sleep — the one thing that would let us move from 'your answers and bacteria agree' to 'here is how often it is actually happening.'"

If UARS triad + oral pattern:
"Three questionnaire signals are pointing at the same picture as your oral bacteria. A wearable that tracks respiratory rate overnight would tell us whether your breathing is varying night-to-night in the way population research associates with this pattern — the most direct way to confirm what your answers are already suggesting."

If social_jet_lag ≥2 + HbA1c or lipids flagged:
"A wearable would let us track your weekday-weekend timing shift automatically rather than relying on recall. It would also measure HRV overnight, which is sensitive to circadian disruption and would add another layer to the metabolic picture your blood panel is showing."

If dry_mouth often/frequently + oral aerobic shift:
"Your questionnaire and oral data are both pointing at mouth breathing. A wearable would tell us your overnight respiratory rate and oxygen levels, which would help distinguish simple nasal obstruction mouth breathing from deeper breathing pattern changes."

Default (mild signals):
"This picture is being built from your questionnaire answers and oral data alone. A wearable would add objective overnight measurements — breathing rate, HRV, sleep stages — which would sharpen anything we're seeing here."

TIER 3 — No sleep data at all

One sentence at the end of the breathing section:
"Without sleep data — either from a wearable or the sleep questionnaire — the oral patterns we're seeing cannot be contextualised for nighttime breathing. Completing the sleep questionnaire or connecting a wearable would let this section say something more specific."

Do not speculate. Do not imply the oral pattern means anything specific about sleep without sleep data to corroborate.

---

## OUTPUT STRUCTURE

Produce exactly four sections. Each is short prose — no bullet points, no headers, no markdown. Two to four sentences per section. One paragraph break between sections. Output is read on a phone — keep it tight.

Section 1 — Opening (2–3 sentences)
The two or three most notable findings across all available panels — lead with the most positive, then name the one or two worth watching. Read like the opening of a thoughtful letter.

Section 2 — Cardiovascular & metabolic context (2–4 sentences)
Connect oral NO pathway to blood lipids, glucose, and HbA1c. Apply social jet lag rule if present. Apply TSH-before-HRV priority. If blood is absent, describe oral metabolic picture alone.

Section 3 — Gum and caries context (2–4 sentences)
Describe gum picture across both complexes without naming diseases. Name genera by name if elevated. Note Lactobacillus absence as positive. Mention protective caries bacteria if present.

If caries_panel data is present, weave in the three-metric caries picture:
- pH Balance API: describes the acid-base balance of the oral environment. ≤0.25 is well-buffered (positive), 0.25–0.45 mildly acidogenic (note), 0.45–0.65 moderately acidogenic (watch), >0.65 strongly acidogenic (attention). Name the specific acid producers and buffers contributing.
- Cariogenic Load Index: total cavity-causing bacteria (S. mutans + S. sobrinus + Scardovia + Lactobacillus). <0.2% minimal, 0.2–0.5% low, 0.5–1.5% elevated (watch), >1.5% high (attention).
- Protective Ratio: protectors (S. sanguinis + S. gordonii) divided by cavity-makers (S. mutans + S. sobrinus). >5× strong defense (positive), 2–5× moderate, <2× weak defense (watch). If no cavity-makers detected, note as "no cavity-makers" (positive).

When caries_panel is present, use actual computed values. When absent, fall back to raw species percentages.

CONFOUNDER RULES — apply when lifestyle data includes these fields:
- smoking_status: If "current" or "former_recent", note that smoking shifts the oral microbiome toward anaerobic and inflammatory species. Smoking is the #1 confounder for gum-linked bacteria — if gum bacteria are elevated AND user smokes, attribute to smoking first before other mechanisms.
- sugar_intake: If "multiple_daily" or "frequent_snacking", note the connection to cariogenic load. Frequency of sugar exposure (not total amount) drives cavity-bacteria growth. If cariogenic load is elevated AND sugar intake is frequent, name the sugar-cavity connection explicitly.
- antibiotics_window: If "within_3_months" or "within_6_months", note that recent antibiotics disrupt the oral microbiome for weeks to months. Diversity may be temporarily suppressed, and species ratios may not reflect the user's baseline. Frame any unusual findings as "possibly influenced by recent antibiotic use."
- medication_ppi_detail: If populated (user takes a PPI), note that proton pump inhibitors alter oral pH and can shift the acid-base balance toward more alkaline conditions. If ph_balance_api is unusually low (well-buffered), PPI use may be a contributing factor.

Section 4 — Nighttime breathing context (2–4 sentences + tier 2 upsell if applicable)
Apply sleep data tier copy rules exactly. Lead with most objective signal. Connect to oral environment index using interaction table. Apply peroxide flag logic if set. Apply existing diagnosis framing if relevant. Apply tier 2 upsell sentence if applicable.

---

## SPECIAL CASES

S. salivarius driving high Streptococcus total
Reframe positively. S. salivarius is a core commensal producing bacteriocins that suppress pathogenic competitors.

Rothia elevated + no clear breathing signal
If env_dietary_nitrate_flag is true, note this qualifier.

Shannon above or below healthy range
Higher = positive finding. Lower = note without alarm.

All gum pathogens near zero
If env_peroxide_flag, attribute to peroxide first. Otherwise note the unusual pattern.

Antiseptic mouthwash daily
Fire when antiseptic_mouthwash_daily is true AND (Neisseria <8% OR Haemophilus <3%): "Your nitrate-reducing bacteria are lower than expected, and you've reported using antiseptic mouthwash daily — which is the most common reason for this pattern. These bacteria help produce nitric oxide, which supports blood pressure and circulation."

Mouth tape nightly
Flag as evidence of self-awareness of mouth breathing. Adjust mouth-breathing narrative.

Hyperthyroid + low HRV
Attribute HRV to thyroid first. Do not mention sleep or oral inflammation as HRV drivers.

---

## BACTERIAL CONTEXT FRAMING RULE (absolute)

A bacterial species count in isolation is a data point, not a finding. The finding requires context from the ENVIRONMENT.

- Never flag a bacterial species count without environmental context (pH buffering, protective ratio, or aggregate pattern)
- When discussing cavity bacteria, ALWAYS reference pH buffering and protective bacteria ratio alongside the count
- When discussing gum bacteria, ALWAYS distinguish orange-complex (early-stage: Fusobacterium, Aggregatibacter, Campylobacter) from red-complex (active: Porphyromonas, Tannerella, Treponema)
- When discussing nitric oxide producers, ALWAYS connect to blood pressure or LDL if blood panel is available
- When the environment is strong but counts are slightly elevated, the finding is "worth noting, not worth worrying about" — lead with the environmental reassurance
- When BOTH environment and counts are concerning, that is when the finding deserves attention — frame as convergent concern
- If caries_panel data is present (ph_balance_api, cariogenic_load_pct, protective_ratio), use these computed values instead of raw species sums

---

## PRE-OUTPUT CHECKLIST

- No disease names (periodontitis, OSA, caries, sleep apnea)
- No prescriptive language (should, must, need to, recommend)
- No diagnostic language (confirms, proves, at risk)
- No mortality/survival language
- Sleep tier detected correctly and tier copy rules applied
- TSH checked BEFORE attributing HRV to sleep or oral inflammation
- Witnessed apnea rule applied if questionnaire data present
- Peroxide flag checked and applied if true
- Antiseptic mouthwash checked and applied if true
- Existing sleep disorder diagnosis checked (overrides general framing)
- Social jet lag rule applied if timing fields present and shift ≥1.5h
- Dry mouth rule applied if questionnaire present
- At least one positive finding in every section
- Tier 2 upsell present and specific if questionnaire-only
- Output is four paragraphs, no headers, no bullets, mobile-readable
- Disclaimer is the final line

---

## MANDATORY CLOSING DISCLAIMER

This reflects patterns in your oral microbiome data alongside any connected panels. It is not a clinical assessment. Population associations are observational — they describe patterns across groups, not predictions for individuals. A medical or dental professional can help contextualise what this means for you specifically.`

// ── Route handler ───────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const refreshForced = new URL(request.url).searchParams.get("refresh") === "true"

  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Misconfigured" }, { status: 503 })

  const supabase = svc()
  const userId = user.id

  // ── Fetch oral kit ────────────────────────────────────────────────────────
  const { data: kit } = await supabase
    .from("oral_kit_orders")
    .select(`
      id, collection_date, ordered_at, shannon_diversity, species_count,
      interpretability_tier, env_peroxide_flag, env_dietary_nitrate_flag,
      neisseria_pct, haemophilus_pct, rothia_pct, actinomyces_pct, veillonella_pct,
      porphyromonas_pct, tannerella_pct, treponema_pct,
      fusobacterium_pct, aggregatibacter_pct, campylobacter_pct, prevotella_intermedia_pct,
      s_mutans_pct, s_sobrinus_pct, scardovia_pct, lactobacillus_pct,
      s_sanguinis_pct, s_gordonii_pct,
      streptococcus_total_pct, s_salivarius_pct, prevotella_commensal_pct,
      env_acid_ratio, env_aerobic_score_pct, env_anaerobic_load_pct, env_aerobic_anaerobic_ratio,
      env_pattern, env_pattern_confidence,
      score_osa, score_uars, score_mouth_breathing, score_periodontal_activity,
      score_bruxism, score_caries_risk, primary_pattern, secondary_pattern,
      raw_otu_table, oral_score_snapshot,
      ph_balance_api, ph_balance_category, ph_balance_confidence,
      cariogenic_load_pct, cariogenic_load_category,
      protective_ratio, protective_ratio_category
    `)
    .eq("user_id", userId)
    .not("shannon_diversity", "is", null)
    .order("ordered_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!kit) return NextResponse.json({ narrative: null, reason: "no_oral_data" })

  const kitDate = (kit.collection_date ?? kit.ordered_at?.split("T")[0]) as string | undefined
  if (!kitDate) return NextResponse.json({ narrative: null, reason: "no_kit_date" })

  // ── Cache check ───────────────────────────────────────────────────────────
  const { data: cached } = await supabase
    .from("oral_narratives")
    .select("*")
    .eq("user_id", userId)
    .eq("collection_date", kitDate)
    .eq("prompt_version", PROMPT_VERSION)
    .maybeSingle()

  const cacheAgeDays = cached
    ? (Date.now() - new Date(cached.generated_at as string).getTime()) / 86400000
    : Infinity

  if (cached && cacheAgeDays < 7 && !refreshForced) {
    console.log(`[oral-narrative] cache hit user=${userId.slice(0, 8)} v=${PROMPT_VERSION} age=${cacheAgeDays.toFixed(1)}d`)
    return NextResponse.json({ narrative: cached, cached: true })
  }

  // ── Fetch cross-panel data in parallel ────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [labRes, sleepRes, lifestyleRes, profileRes] = await Promise.all([
    supabase
      .from("lab_results")
      .select("collection_date, ldl_mgdl, hdl_mgdl, triglycerides_mgdl, total_cholesterol_mgdl, hba1c_pct, glucose_mgdl, hs_crp_mgl, wbc_kul, hematocrit_pct, tsh_uiuml, free_t4_ngdl, egfr_mlmin, vitamin_d_ngml, vitamin_b12_pgml, ferritin_ngml")
      .eq("user_id", userId)
      .eq("parser_status", "complete")
      .order("collection_date", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("sleep_data")
      .select("date, source, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, sleep_efficiency, hrv_rmssd, spo2, resting_heart_rate, respiratory_rate")
      .eq("user_id", userId)
      .gt("sleep_efficiency", 0)
      .gte("date", thirtyDaysAgo)
      .order("date", { ascending: false }),

    supabase
      .from("lifestyle_records")
      .select("age_range, biological_sex, smoking_status, nasal_obstruction, nasal_obstruction_severity, sinus_history, snoring_reported, osa_witnessed, mouth_breathing, mouth_breathing_when, non_restorative_sleep, daytime_fatigue, daytime_cognitive_fog, morning_headaches, jaw_fatigue_morning, night_guard_worn, bruxism_night, gerd, gerd_nocturnal, bmi_calculated, tongue_position_awareness, whitening_frequency, dietary_nitrate_frequency, mouthwash_type, known_hypertension, sugar_intake, antibiotics_window, medication_ppi_detail")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("profiles")
      .select("date_of_birth")
      .eq("id", userId)
      .maybeSingle(),
  ])

  // ── Build user age ────────────────────────────────────────────────────────
  const dobStr = profileRes.data?.date_of_birth as string | null
  const ageRange = lifestyleRes.data?.age_range as string | null
  const biologicalSex = lifestyleRes.data?.biological_sex as string | null
  const userAge = dobStr
    ? Math.floor((Date.now() - new Date(dobStr).getTime()) / (365.25 * 86400000))
    : ageRangeToMidpoint(ageRange)

  // ── Build wearable aggregation ────────────────────────────────────────────
  type Night = { total_sleep_minutes: number; deep_sleep_minutes: number; rem_sleep_minutes: number; sleep_efficiency: number; hrv_rmssd: number | null; spo2: number | null; resting_heart_rate: number | null; respiratory_rate: number | null; source: string }
  const nights = (sleepRes.data ?? []) as unknown as Night[]
  const hasWearable = nights.length > 0

  let wearableBlock: Record<string, unknown> | null = null
  if (hasWearable) {
    const hrvVals = nights.map(x => Number(x.hrv_rmssd)).filter(v => Number.isFinite(v) && v > 0)
    const rhrVals = nights.map(x => Number(x.resting_heart_rate)).filter(v => Number.isFinite(v) && v > 0)
    const rrVals = nights.map(x => Number(x.respiratory_rate)).filter(v => Number.isFinite(v) && v > 0)
    const spo2Vals = nights.map(x => Number(x.spo2)).filter(v => Number.isFinite(v) && v > 0)
    const deepVals = nights.map(x => Number(x.deep_sleep_minutes)).filter(v => Number.isFinite(v))
    const remVals = nights.map(x => Number(x.rem_sleep_minutes)).filter(v => Number.isFinite(v))
    const sleepHrs = nights.map(x => Number(x.total_sleep_minutes) / 60).filter(v => Number.isFinite(v))
    const effVals = nights.map(x => Number(x.sleep_efficiency)).filter(v => Number.isFinite(v) && v > 0)

    wearableBlock = {
      provider: nights[0]?.source ?? "unknown",
      nights_available: nights.length,
      avg_respiratory_rate_bpm: avg(rrVals) ? parseFloat(avg(rrVals)!.toFixed(1)) : null,
      rr_nightly_cv: cv(rrVals) ? parseFloat(cv(rrVals)!.toFixed(2)) : null,
      avg_hrv_ms: avg(hrvVals) ? parseFloat(avg(hrvVals)!.toFixed(0)) : null,
      avg_rhr_bpm: avg(rhrVals) ? parseFloat(avg(rhrVals)!.toFixed(0)) : null,
      avg_sleep_hours: avg(sleepHrs) ? parseFloat(avg(sleepHrs)!.toFixed(2)) : null,
      avg_deep_sleep_minutes: avg(deepVals) ? parseFloat(avg(deepVals)!.toFixed(0)) : null,
      rem_hours: avg(remVals) ? parseFloat((avg(remVals)! / 60).toFixed(2)) : null,
      sleep_efficiency: avg(effVals) ? parseFloat(avg(effVals)!.toFixed(1)) : null,
      avg_spo2: avg(spo2Vals) ? parseFloat(avg(spo2Vals)!.toFixed(1)) : null,
      spo2_nights_below_94: spo2Vals.filter(v => v < 94).length,
      avg_waso_minutes: null,
    }
  }

  // ── Build sleep questionnaire from lifestyle ──────────────────────────────
  const ls = lifestyleRes.data as Record<string, unknown> | null
  const hasQuestionnaire = ls != null && (ls.non_restorative_sleep != null || ls.snoring_reported != null || ls.daytime_fatigue != null || ls.sleep_duration != null)

  let questionnaireBlock: Record<string, unknown> | null = null
  if (hasQuestionnaire && ls) {
    const sleepDur = ls.sleep_duration as string | null
    const weekdayHrs = sleepDur === "lt6" ? 5.5 : sleepDur === "6to7" ? 6.5 : sleepDur === "7to8" ? 7.5 : sleepDur === "gt8" ? 8.5 : null

    // Derive social jet lag from wearable timing if available (weekend vs weekday midpoint shift)
    let socialJetLag: number | null = null
    if (nights.length >= 7) {
      const dayOfWeek = (d: string) => new Date(d + "T12:00:00").getDay()
      const weekdayNights = nights.filter(x => { const dow = dayOfWeek((x as unknown as { date: string }).date); return dow >= 1 && dow <= 5 })
      const weekendNights = nights.filter(x => { const dow = dayOfWeek((x as unknown as { date: string }).date); return dow === 0 || dow === 6 })
      const avgMin = (arr: Night[]) => arr.length ? arr.reduce((s, x) => s + x.total_sleep_minutes, 0) / arr.length : null
      const wdMin = avgMin(weekdayNights)
      const weMin = avgMin(weekendNights)
      if (wdMin != null && weMin != null) {
        socialJetLag = parseFloat((Math.abs(weMin - wdMin) / 60).toFixed(1))
      }
    }

    questionnaireBlock = {
      weekday_sleep_hours: weekdayHrs,
      weekend_sleep_hours: null,
      social_jet_lag_hours: socialJetLag,
      sleep_latency_band: ls.sleep_latency ?? null,
      night_waking_freq: ls.night_wakings ?? null,
      non_restorative_sleep_freq: ls.non_restorative_sleep ?? null,
      daytime_sleepiness_freq: ls.daytime_fatigue ?? null,
      snoring_freq: ls.snoring_reported ?? null,
      witnessed_apnea_freq: ls.osa_witnessed ?? null,
      dry_mouth_waking_freq: ls.mouth_breathing === "confirmed" ? "often" : null,
      concentration_tired_freq: ls.daytime_cognitive_fog ?? null,
      sleep_disorder_dx: null,
      sleep_medication_freq: null,
    }
  }

  const sleepTier = hasWearable && hasQuestionnaire ? "tier_1"
    : hasQuestionnaire ? "tier_2"
    : hasWearable ? "tier_1"
    : "tier_3"

  // ── Build oral data JSON ──────────────────────────────────────────────────
  // Fall back to raw_otu_table (genus-level sums) when L7 species columns are NULL
  const otu = (kit.raw_otu_table ?? {}) as Record<string, number>
  const snap = (kit.oral_score_snapshot ?? {}) as Record<string, unknown>

  const genusPct = (genus: string): number | null => {
    const total = Object.entries(otu)
      .filter(([k]) => k.startsWith(genus))
      .reduce((sum, [, v]) => sum + (Number(v) || 0), 0)
    return total > 0 ? parseFloat((total * 100).toFixed(3)) : null
  }
  const speciesPct = (name: string): number | null => {
    const v = otu[name]
    return v != null && v > 0 ? parseFloat((Number(v) * 100).toFixed(3)) : null
  }

  const neisseria = n(kit.neisseria_pct) ?? genusPct("Neisseria")
  const haemophilus = n(kit.haemophilus_pct) ?? genusPct("Haemophilus")
  const rothia = n(kit.rothia_pct) ?? genusPct("Rothia")
  const actinomyces = n(kit.actinomyces_pct) ?? genusPct("Actinomyces")
  const veillonella = n(kit.veillonella_pct) ?? genusPct("Veillonella")
  const porphyromonas = n(kit.porphyromonas_pct) ?? speciesPct("Porphyromonas gingivalis") ?? genusPct("Porphyromonas")
  const tannerella = n(kit.tannerella_pct) ?? speciesPct("Tannerella forsythia") ?? genusPct("Tannerella")
  const treponema = n(kit.treponema_pct) ?? speciesPct("Treponema denticola") ?? genusPct("Treponema")
  const fusobacterium = n(kit.fusobacterium_pct) ?? genusPct("Fusobacterium")
  const aggregatibacter = n(kit.aggregatibacter_pct) ?? genusPct("Aggregatibacter")
  const campylobacter = n(kit.campylobacter_pct) ?? genusPct("Campylobacter")
  const prev_intermedia = n(kit.prevotella_intermedia_pct) ?? speciesPct("Prevotella intermedia")
  const s_mutans = n(kit.s_mutans_pct) ?? speciesPct("Streptococcus mutans")
  const s_sobrinus = n(kit.s_sobrinus_pct) ?? speciesPct("Streptococcus sobrinus")
  const scardovia = n(kit.scardovia_pct) ?? genusPct("Scardovia")
  const lactobacillus = n(kit.lactobacillus_pct) ?? genusPct("Lactobacillus")
  const s_sanguinis = n(kit.s_sanguinis_pct) ?? speciesPct("Streptococcus sanguinis")
  const s_gordonii = n(kit.s_gordonii_pct) ?? speciesPct("Streptococcus gordonii")

  const acidRatioVal = n(kit.env_acid_ratio)
  const aerobicScore = n(kit.env_aerobic_score_pct)
  const anaerobicLoad = n(kit.env_anaerobic_load_pct)
  const aaRatio = n(kit.env_aerobic_anaerobic_ratio)
  const acidLabel = (acidRatioVal ?? 0) < 0.3 ? "base-dominant" : (acidRatioVal ?? 0) > 0.5 ? "acid-dominant" : "balanced"

  const patternDescriptions: Record<string, string> = {
    osa_consistent: "paradoxical suppression of anaerobes with aerobic enrichment",
    mixed: "aerobic shift with active periopathogens",
    mouth_breathing: "aerobic enrichment without anaerobic suppression",
    anaerobic_dominant: "high anaerobic load without aerobic shift",
    balanced: "balanced aerobic/anaerobic community",
    osa_consistent_possible_peroxide: "paradoxical suppression — possible peroxide confounder",
    mixed_possible_peroxide: "aerobic shift — possible peroxide confounder",
  }

  const dataPayload = {
    user: {
      age: userAge,
      sex: biologicalSex ?? "not provided",
      collection_date: kitDate,
    },
    oral: {
      shannon_diversity: n(kit.shannon_diversity),
      species_count: n(kit.species_count),
      interpretability_tier: kit.interpretability_tier ?? "full",
      env_peroxide_flag: Boolean(kit.env_peroxide_flag),
      env_dietary_nitrate_flag: Boolean(kit.env_dietary_nitrate_flag),
      no_primary: { neisseria_pct: neisseria, haemophilus_pct: haemophilus, combined_pct: (neisseria ?? 0) + (haemophilus ?? 0) },
      no_secondary: { rothia_pct: rothia, actinomyces_pct: actinomyces, veillonella_pct: veillonella, combined_pct: (rothia ?? 0) + (actinomyces ?? 0) + (veillonella ?? 0) },
      gum_red_complex: { porphyromonas_pct: porphyromonas, tannerella_pct: tannerella, treponema_pct: treponema, combined_pct: (porphyromonas ?? 0) + (tannerella ?? 0) + (treponema ?? 0) },
      gum_orange_complex: { fusobacterium_pct: fusobacterium, aggregatibacter_pct: aggregatibacter, campylobacter_pct: campylobacter, prevotella_intermedia_pct: prev_intermedia, combined_pct: (fusobacterium ?? 0) + (aggregatibacter ?? 0) + (campylobacter ?? 0) + (prev_intermedia ?? 0) },
      caries_risk: { s_mutans_pct: s_mutans, s_sobrinus_pct: s_sobrinus, scardovia_pct: scardovia, lactobacillus_pct: lactobacillus, combined_pct: (s_mutans ?? 0) + (s_sobrinus ?? 0) + (scardovia ?? 0) + (lactobacillus ?? 0) },
      caries_protective: { s_sanguinis_pct: s_sanguinis, s_gordonii_pct: s_gordonii, combined_pct: (s_sanguinis ?? 0) + (s_gordonii ?? 0) },
      streptococcus_genus_pct: n(kit.streptococcus_total_pct) ?? genusPct("Streptococcus"),
      s_salivarius_pct: n(kit.s_salivarius_pct) ?? speciesPct("Streptococcus salivarius"),
      prevotella_commensal_pct: n(kit.prevotella_commensal_pct) ?? (() => {
        const total = genusPct("Prevotella")
        const intermedia = speciesPct("Prevotella intermedia")
        return total != null ? parseFloat(((total ?? 0) - (intermedia ?? 0)).toFixed(3)) : null
      })(),
      environment_index: {
        acid_ratio: acidRatioVal,
        acid_label: acidLabel,
        aerobic_score_pct: aerobicScore,
        anaerobic_load_pct: anaerobicLoad,
        aerobic_anaerobic_ratio: aaRatio,
        pattern: kit.env_pattern ?? null,
        pattern_confidence: kit.env_pattern ? (kit.env_pattern_confidence ?? "low") : null,
        pattern_description: kit.env_pattern ? (patternDescriptions[kit.env_pattern as string] ?? null) : null,
      },
      differential_scores: {
        score_osa: n(kit.score_osa),
        score_uars: n(kit.score_uars),
        score_mouth_breathing: n(kit.score_mouth_breathing),
        score_periodontal_activity: n(kit.score_periodontal_activity),
        score_bruxism: n(kit.score_bruxism),
        score_caries_risk: n(kit.score_caries_risk),
        primary_pattern: kit.primary_pattern ?? "none",
        secondary_pattern: kit.secondary_pattern ?? "none",
      },
      caries_panel: {
        ph_balance_api: n(kit.ph_balance_api),
        ph_balance_category: kit.ph_balance_category ?? null,
        ph_balance_confidence: kit.ph_balance_confidence ?? null,
        cariogenic_load_pct: n(kit.cariogenic_load_pct),
        cariogenic_load_category: kit.cariogenic_load_category ?? null,
        protective_ratio: n(kit.protective_ratio),
        protective_ratio_category: kit.protective_ratio_category ?? null,
      },
    },
    blood: labRes.data ? {
      collection_date: labRes.data.collection_date,
      ldl_mgdl: n(labRes.data.ldl_mgdl),
      hdl_mgdl: n(labRes.data.hdl_mgdl),
      triglycerides_mgdl: n(labRes.data.triglycerides_mgdl),
      total_cholesterol_mgdl: n(labRes.data.total_cholesterol_mgdl),
      hba1c_pct: n(labRes.data.hba1c_pct),
      glucose_mgdl: n(labRes.data.glucose_mgdl),
      hs_crp_mgl: n(labRes.data.hs_crp_mgl),
      wbc_kul: n(labRes.data.wbc_kul),
      hematocrit_pct: n(labRes.data.hematocrit_pct),
      tsh_uiuml: n(labRes.data.tsh_uiuml),
      free_t4_ngdl: n(labRes.data.free_t4_ngdl),
      egfr_mlmin: n(labRes.data.egfr_mlmin),
      vitamin_d_ngml: n(labRes.data.vitamin_d_ngml),
      vitamin_b12_pgml: n(labRes.data.vitamin_b12_pgml),
      ferritin_ngml: n(labRes.data.ferritin_ngml),
    } : null,
    sleep: {
      tier: sleepTier,
      wearable: wearableBlock,
      questionnaire: questionnaireBlock,
    },
    lifestyle: ls ? {
      whitening_frequency: ls.whitening_frequency ?? null,
      dietary_nitrate_frequency: ls.dietary_nitrate_frequency ?? null,
      night_guard_worn: ls.night_guard_worn ?? null,
      night_guard_type: null,
      morning_headaches: ls.morning_headaches ?? null,
      jaw_fatigue_morning: ls.jaw_fatigue_morning ?? null,
      daytime_cognitive_fog: ls.daytime_cognitive_fog ?? null,
      tongue_position_awareness: ls.tongue_position_awareness ?? null,
      nasal_obstruction: ls.nasal_obstruction ?? null,
      nasal_obstruction_severity: ls.nasal_obstruction_severity ?? null,
      mouth_breathing: ls.mouth_breathing ?? null,
      mouth_breathing_when: ls.mouth_breathing_when ?? null,
      sinus_history: ls.sinus_history ?? null,
      antiseptic_mouthwash_daily: ls.mouthwash_type === "alcohol" || ls.mouthwash_type === "antiseptic",
      mouth_tape_nightly: false,
      gerd: ls.gerd ?? null,
      gerd_nocturnal: Boolean(ls.gerd_nocturnal),
      bmi_calculated: n(ls.bmi_calculated),
      known_hypertension: Boolean(ls.known_hypertension),
      smoking_status: ls.smoking_status ?? null,
      sugar_intake: ls.sugar_intake ?? null,
      antibiotics_window: ls.antibiotics_window ?? null,
      medication_ppi_detail: ls.medication_ppi_detail ?? null,
    } : null,
  }

  // ── User prompt ───────────────────────────────────────────────────────────
  const userPrompt = `Here is the user data. Generate the narrative following the system prompt rules exactly.

${JSON.stringify(dataPayload, null, 2)}

Return ONLY valid JSON (no markdown, no backticks, no preamble) with this exact schema:
{
  "headline": "6-10 word summary of the most notable finding",
  "narrative": "The four prose paragraphs from sections 1-4, separated by \\n\\n, followed by \\n\\n and the mandatory disclaimer",
  "positive_signal": "One sentence: the single strongest positive finding across all panels",
  "watch_signal": "One sentence: the single most important thing worth watching"
}`

  console.log(`[oral-narrative] v5 payload user=${userId.slice(0, 8)} tier=${sleepTier}`, JSON.stringify({
    oral_species_source: neisseria != null ? "L7_columns_or_otu" : "all_null",
    sleep_tier: sleepTier,
    has_wearable: hasWearable,
    has_questionnaire: hasQuestionnaire,
    social_jet_lag: questionnaireBlock?.social_jet_lag_hours ?? null,
    blood_present: !!labRes.data,
    env_pattern: kit.env_pattern,
    primary_pattern: kit.primary_pattern,
  }))

  // ── Fetch relevant evidence ────────────────────────────────────────────────
  const allTopics = [
    ...CATEGORY_TOPICS.bacterial_diversity ?? [],
    ...CATEGORY_TOPICS.nitric_oxide_pathway ?? [],
    ...CATEGORY_TOPICS.gum_health_bacteria ?? [],
    ...CATEGORY_TOPICS.cavity_bacteria ?? [],
    ...CATEGORY_TOPICS.nighttime_breathing ?? [],
  ]
  const evidence = await getRelevantEvidence({
    panel: "oral",
    topics: [...new Set(allTopics)],
    maxStudies: 8,
    minConfidence: "medium",
  })
  const evidenceSection = buildEvidencePromptSection(evidence)

  // ── Call OpenAI ────────────────────────────────────────────────────────────
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return NextResponse.json({ error: "No AI key" }, { status: 503 })

  const openai = new OpenAI({ apiKey: openaiKey })
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini"

  let result: Record<string, unknown>
  try {
    const completion = await openai.chat.completions.create({
      model,
      max_tokens: 1500,
      temperature: 0.1,
      store: false,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + evidenceSection },
        { role: "user", content: userPrompt },
      ],
    })
    const raw = completion.choices[0]?.message.content ?? "{}"
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim()
    result = JSON.parse(cleaned) as Record<string, unknown>

    // Strip any inline citations that leaked through
    if (typeof result.narrative === "string") {
      const stripped = stripInlineCitations(result.narrative)
      if (stripped.hadHallucinations) {
        console.warn(`[oral-narrative] stripped ${stripped.citationsFound.length} citations`)
        try {
          const db = svc()
          await db.from("narrative_hallucination_log").insert({
            route: "oral/narrative",
            category: kit.primary_pattern,
            user_id_hashed: hashUserId(userId),
            hallucinations: stripped.citationsFound,
            raw_output_preview: (result.narrative as string).slice(0, 500),
          })
        } catch { /* non-fatal */ }
      }
      result.narrative = stripped.cleanedText
    }
  } catch (err) {
    console.error("[oral-narrative] generation failed:", err)
    return NextResponse.json({ narrative: null, error: String(err) }, { status: 500 })
  }

  // ── Upsert to cache ──────────────────────────────────────────────────────
  const { data: saved, error: upsertErr } = await supabase
    .from("oral_narratives")
    .upsert({
      user_id: userId,
      collection_date: kitDate,
      prompt_version: PROMPT_VERSION,
      generated_at: new Date().toISOString(),
      headline: typeof result.headline === "string" ? result.headline : null,
      narrative: typeof result.narrative === "string" ? result.narrative : null,
      positive_signal: typeof result.positive_signal === "string" ? result.positive_signal : null,
      watch_signal: typeof result.watch_signal === "string" ? result.watch_signal : null,
      oral_context: dataPayload.oral,
      blood_context: dataPayload.blood,
      sleep_context: dataPayload.sleep,
      raw_response: result,
    }, { onConflict: "user_id,collection_date,prompt_version" })
    .select()
    .single()

  if (upsertErr) {
    console.error("[oral-narrative] upsert failed:", upsertErr.message)
    return NextResponse.json({
      narrative: { ...result, collection_date: kitDate, generated_at: new Date().toISOString() },
      cached: false,
    })
  }

  return NextResponse.json({ narrative: saved, cached: false })
}

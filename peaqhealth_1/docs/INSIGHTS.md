# Oravi — INSIGHTS.md
## Connection Rules Engine + Cross-Panel Intelligence

**Version:** 1.6
**Date:** April 2026
**Status:** Draft — for internal review before pilot implementation
**Classification:** Internal / Confidential — core product IP
**Prior version:** 1.4 (April 2026)

> **Regulatory note:** Oravi is a wellness product, not a medical device. Nothing in this document or in any user-facing insight constitutes a medical diagnosis, treatment recommendation, or substitute for professional medical advice. All rules surface patterns across panels and offer educational context rooted in peer-reviewed research. Users are encouraged to share their results with their healthcare providers. No rule should be interpreted as confirming or ruling out any disease or condition.

---

## Bacterial Context Framing Rule

**Added:** April 2026 (v1.3.1)

A bacterial species count in isolation is a data point, not a finding.
The finding requires context from the ENVIRONMENT:

1. Is the mouth well-buffered or acidic? (pH balance API)
2. Are protective species outcompeting the harmful ones? (Protective ratio)
3. Does the aggregate pattern match risk or match balance? (Cariogenic load)

**Rules for generating cavity/bacteria narratives:**

- ALWAYS reference the environment (pH, protective ratio) when
  discussing cavity-causing species
- NEVER flag a bacterial count without context from at least one
  environmental metric
- When the environment is strong and the count is slightly elevated,
  lead with the environment reassurance
- When the environment AND the count are both concerning, that's
  when alarm is warranted

**Rules for gum bacteria narratives:**

- ALWAYS distinguish orange-complex (early-stage: Fusobacterium,
  Aggregatibacter, Campylobacter) from red-complex (active:
  Porphyromonas, Tannerella, Treponema)
- If orange-complex is elevated but red-complex is low, frame as
  "early-stage, manageable with hygiene"
- If both complexes are elevated, frame as convergent concern

**Example — well-buffered mouth with slightly elevated cavity count:**

WRONG: "Your cavity bacteria are elevated"
RIGHT: "Your cavity bacteria are slightly elevated, but your mouth's
buffering and protective bacteria are keeping them in check — the
environment they live in matters more than their count alone."

---

## Oral Dysbiosis Index (ODI)

**Added:** April 2026 (v1.5)

The Oral Dysbiosis Index is a log-ratio of disease-enriched to health-associated taxa, computed from species-level Zymo panel abundances.

**Formula:**

    ODI = log2( sum(disease_enriched_abundances) / sum(health_associated_abundances) )

**Disease-enriched taxa** (sum these):
Filifactor alocis, Treponema socranskii, Treponema vincentii, Fretibacterium fastidiosum, Fretibacterium sp67092, Selenomonas noxia, Selenomonas infelix, Selenomonas artemidis (and other Selenomonas spp), Peptostreptococcus anaerobius-stomatis, Tannerella forsythia, Porphyromonas endodontalis, Porphyromonas gingivalis (if present).

**Health-associated taxa** (sum these):
Capnocytophaga ochracea (and all other Capnocytophaga spp), Bergeyella cardium (and all other Bergeyella spp), Haemophilus (all species), Streptococcus salivarius, Streptococcus sanguinis, Streptococcus gordonii.

**Interpretation bands:**

| ODI | Band | Status |
|---|---|---|
| < -1.0 | Health-skewed | Strong |
| -1.0 to 0 | Health-leaning | Strong |
| 0 to 1.0 | Borderline | Watch |
| > 1.0 | Dysbiotic | Attention |
| > 2.0 | Strongly dysbiotic | Attention |

**Evidence:** clinical-evidence-base.md → Multi-Taxa Dysbiosis Index

---

### CONNECTION: Dysbiotic oral community + elevated systemic inflammation

**Trigger:** ODI > 1.0 AND hsCRP > 1.0 mg/L
**Panels:** oral + blood
**Severity:** Watch
**Mechanism:** Multi-Taxa Dysbiosis Index → oral-systemic inflammation axis
**Framing:** Wellness-focused; connects oral ecology to measured systemic inflammation.

---

### CONNECTION: Elevated F. alocis with healthy P. gingivalis

**Trigger:** F. alocis > 0.001 (relative abundance) AND P. gingivalis < detection threshold
**Panels:** oral
**Severity:** Watch
**Mechanism:** Filifactor alocis (P. gingivalis-independent marker)
**Framing:** F. alocis is an independent marker of periodontal risk that can be elevated even when P. gingivalis is low. OR 10.9 for severe disease across geographies.

---

### CONNECTION: Elevated Fretibacterium + low health-associated diversity

**Trigger:** Fretibacterium fastidiosum > 0.001 AND Capnocytophaga + Haemophilus + Bergeyella combined abundance < 25th percentile
**Panels:** oral
**Severity:** Watch
**Mechanism:** Fretibacterium (formerly Synergistetes Cluster A)
**Framing:** Loss of health-associated taxa alongside Fretibacterium enrichment signals community-level dysbiosis.

---

### CONNECTION: Refractory Risk Signature (oral baseline)

**Added:** April 2026 (v1.6)

**Trigger:** At least 2 of [Parvimonas micra > 0.001, Filifactor alocis > 0.001, Prevotella intermedia > 0.001] AND at least 2 of [Haemophilus parainfluenzae, Rothia dentocariosa, Capnocytophaga sputigena, Veillonella spp.] below 25th percentile.
**Panels:** oral
**Severity:** Watch
**Mechanism:** Refractory Periodontitis Signature (Colombo 2012)
**Framing:** The combination of persistence-associated species alongside depleted health-associated taxa suggests a community less likely to shift toward health with standard cleanings alone. Frame as "your oral community may benefit from a more thorough initial cleaning regimen — worth discussing with your dentist." Wellness framing only — do NOT imply disease or diagnose refractory periodontitis.
**Evidence:** clinical-evidence-base.md → Refractory Periodontitis Signature

---

### CONNECTION: Elevated Parvimonas micra

**Added:** April 2026 (v1.6)

**Trigger:** Parvimonas micra > 0.002 relative abundance
**Panels:** oral
**Severity:** Watch
**Mechanism:** Parvimonas micra as Treatment-Failure Predictor (Mombelli 2017, Li 2026)
**Framing:** P. micra is one of the few oral bacteria with published data showing independent association with persistent inflammation even after standard cleanings. Frame as "worth flagging at your next dental visit" — NOT as a prediction of failure.
**Evidence:** clinical-evidence-base.md → Parvimonas micra as Treatment-Failure Predictor

---

### CONNECTION: Oral-Systemic Metabolic Axis (Porphyromonas + glucose)

**Added:** April 2026 (v1.6)

**Trigger:** sum(Porphyromonas spp relative abundance) > 0.005 AND fasting_glucose > 100 mg/dL
**Panels:** oral + blood
**Severity:** Watch
**Mechanism:** Periodontal Therapy Improves Systemic Markers (Baima 2025, Lu 2022)
**Framing:** Published research shows subgingival Porphyromonas correlates with blood glucose, and periodontal therapy can reduce pro-inflammatory metabolites affecting systemic inflammation. Frame as an opportunity: "improvements to oral health may support your metabolic markers."
**Evidence:** clinical-evidence-base.md → Periodontal Therapy Improves Systemic Markers

---

## Borderline Value Framing Rule

> Phrasing guidance for borderline values lives in docs/INSIGHT_COMPOSITION_GUIDE.md Section 4.

### Borderline thresholds (within 5% of cutoff)

| Marker         | Lower cutoff | Borderline zone                      |
|----------------|--------------|--------------------------------------|
| Glucose        | 100 mg/dL    | 100-105 mg/dL                        |
| HbA1c          | 5.7%         | 5.7-5.9%                             |
| LDL            | 100 mg/dL    | 100-105 mg/dL                        |
| LDL (high)     | 160 mg/dL    | 160-168 mg/dL                        |
| Total Chol     | 200 mg/dL    | 200-210 mg/dL                        |
| Triglycerides  | 150 mg/dL    | 150-158 mg/dL                        |
| hs-CRP         | 1.0 mg/L     | 1.0-1.05 mg/L                        |
| hs-CRP (high)  | 3.0 mg/L     | 3.0-3.15 mg/L                        |
| Creatinine     | upper range  | within 5% of upper bound             |
| ALT            | 40 U/L       | 40-42 U/L                            |
| AST            | 40 U/L       | 40-42 U/L                            |
| TSH            | 4.0 mIU/L    | 4.0-4.2 mIU/L                        |
| Vitamin D      | 30 ng/mL     | 28-30 ng/mL (borderline low)         |
| Ferritin       | normal range | within 5% of either bound            |
| Fasting Insulin| 10 uIU/mL    | 10-10.5 uIU/mL                       |
| Vitamin B12    | 300 pg/mL    | 290-300 pg/mL (borderline low)       |

---

LANGUAGE COMPLIANCE — READ BEFORE EDITING ANY RULE
Version: 2.0 (aligned with INSIGHT_COMPOSITION_GUIDE.md Section 1)
Applies to: Every connection line, expanded copy, and action in
this document. No rule ships without passing this checklist.

The Two Principles Every Rule Must Follow
1. Lead with consequence. Not mechanism.
Users do not need to know the pathway. They need to know what it means
for them, in plain language.
2. Reflect data. Do not interpret it.
Oravi shows what the data is doing. The user and their medical
professional draw conclusions. Rules surface patterns — they do not
diagnose, predict, or name conditions.

The Forbidden List — Never Appears in Any Rule Copy
The following words and phrases are banned from all connection lines,
expanded copy, action items, and CTA text. No exceptions.
Clinical condition names

Sleep apnea, OSA, apnea, apnoea
Any named disease or disorder in first-person user context
(e.g. "you may have," "this indicates," "signs of")

Diagnostic / clinical process language

Diagnose, diagnosis
Rule out
Evaluate, evaluation, screen, assessment (in clinical sense)
At risk for, risk of, risk level, risk score
You are at risk, you may be at risk

Interpretive language (we are drawing the conclusion)

Signals suggest, indicates, points to
This means you have, this confirms
Concerning, alarming, dangerous, serious
Significant (as a descriptor of the user's health status)
Critical (as a descriptor of a finding — "critically low" is forbidden)

Directive clinical action language

We recommend seeing a / you should see a
See a [specialist type]
Get tested for / get a [specific test]
Any specific test name in a CTA context

Score / tier names shown to users

Low / moderate / elevated / high (as tier labels shown to user)
Any numerical score shown to user
Risk score, health score (in clinical context)


What Must Replace Them
ForbiddenReplace with"Your LDL is elevated""Your LDL measurement is X mg/dL""Critically low nitrate reducers""Your nitrate-reducing bacteria panel is showing lower levels than typical""This indicates cardiovascular risk""This pattern appears across your cardiovascular-related markers""We recommend seeing a cardiologist""A medical professional can help you understand what this means for you""You are at risk for...""Your data is showing patterns we track in relation to...""Concerning" / "alarming""Worth noting" / "appearing across panels""Signs of sleep apnea""Patterns in your nighttime breathing data""Elevated" (health status)State the measurement or say "in the higher range""Significantly elevated"State the number; never use "significantly" as a health judgment

The Mandatory Disclaimer
This exact text must appear on every user-facing card generated by
any rule in this engine. It is not paraphrased. It is not shortened.
It appears at every tier, including favorable findings.

This information is for wellness purposes only and is not a medical
assessment. Always consult a medical professional about any health
concerns.


Copy Patterns That Pass
These are the approved patterns for user-facing copy at each level:
Connection lines (the one-sentence hook)
✅ "Your oral panel and your inflammation marker are showing patterns
that appear in the same direction."
✅ "Three measurements across your panels are reflecting the same
picture."
✅ "Your nitrate-producing bacteria are at lower levels, and your
recovery data is reflecting it."
❌ "Your bacteria are dangerously low and driving cardiovascular risk."
❌ "Three signals are pointing to elevated cardiovascular risk."
Expanded copy (the 2–4 paragraph explanation)
✅ "Your oral panel shows lower levels of the bacteria we track in
relation to nitric oxide production. At the same time, your
inflammation marker and your recovery measurements are both in
ranges we note when this bacterial group is depleted."
✅ "Research following tens of thousands of people over multiple
years found an association between [X] and [Y]. Your data is
showing [X]."
❌ "This confirms you have elevated cardiovascular risk driven by
your oral microbiome."
❌ "Your results indicate you may have early-stage heart disease."
Action items
✅ "Stop antiseptic mouthwash — this is the most direct intervention
for the bacterial pattern your oral panel is showing."
✅ "A medical professional can help you understand what this
combination of data means for you."
✅ "Share these results with your doctor at your next visit —
the cross-panel picture may be useful context."
❌ "See a cardiologist about your cardiovascular risk."
❌ "Get a sleep study to rule out sleep apnea."
❌ "Your LDL needs to be treated — speak to your doctor about
medication."
Favorable rule copy
✅ "Your data is not showing the patterns we track in relation to [X].
Keep up what is working."
✅ "Your [panel] and your [panel] are both reflecting a pattern
associated with [positive outcome] in population research."
❌ "You are in perfect health."
❌ "Your results confirm you have no cardiovascular risk."

Rules That Need Copy Audit Before Ship (v1.3 → v1.4)
The following rules in v1.3 contain language that does not fully
comply with the v2.0 language framework. They are flagged here for
copy revision before any patient-facing deployment. The biological
basis, firing conditions, and citations are correct — only the
user-facing copy needs updating.
RuleIssueSpecific phrase to fix1A"making LDL harder to manage" is borderline interpretiveReframe as data reflection2A"driving inflammation higher" — we are asserting causation→ "appearing alongside elevated inflammation"9A"long-term brain health" — implies prediction→ "patterns we track in relation to cognitive health research"13AReferences "sleep-disordered breathing" — borderline clinical→ "patterns in nighttime breathing data"17A"triple cardiovascular convergence" — clinical framing→ "three cardiovascular-related measurements in the same direction"22A"WBC elevated partly from oral infection" — causal claim→ "WBC and oral pathogen levels elevated at the same time"23AAction: "warrants a priority dental appointment" — directive→ "worth discussing with your dentist at your next visit"23B"upstream source" — interpretive causation claim→ "appearing together with"25A"your metabolism is under pressure" — interpretation→ "your metabolic measurements are showing a pattern across panels"26A"inflammaging" in user copy — jargon→ "ongoing low-level inflammation"27A"pushed from three directions" — metaphorical but interpretive→ "appearing in three separate measurements simultaneously"28C"long-term risk signal" — implies prediction→ "a pattern worth raising with your doctor"32A"This is not three separate problems" — asserting the conclusion→ let the user and doctor connect thisAll unfavorable rulesCheck each action for "warrants," "requires," "you need to"→ replace with "worth discussing," "worth mentioning," "may be useful context for your doctor"
Priority: Rules 13A, 17A, and any rule that touches breathing/
sleep in a clinical-adjacent way should be audited first, given the
OSA language sensitivity.

The Developer Checklist for Each New Rule
Before adding any rule to this document, the author confirms:

 Connection line contains no condition names, no "risk" language,
no causal assertions
 Expanded copy reflects data — does not interpret or conclude
 Action item is specific and actionable but never directive
toward a specific test, specialist, or clinical procedure
 Favorable rules use present-tense reinforcement
 Exploratory rules (Priority 3) use "we are watching" or
"emerging science" language
 Disclaimer is noted as required on the user-facing card
 No Latin species names in connection lines or expanded copy
 Biological basis (internal) may use clinical language —
user-facing copy (connection line, expanded, action) may not

# WHY ORAVI USES MEASURED HRV, NOT GENETIC HRV
## Phenotypic vs Genetically Predicted Heart Rate Variability

Heart rate variability can be described in two fundamentally different ways. One is what your wearable records each night — the actual beat to beat variation in your heart rhythm, shaped by everything happening in your body right now. This is phenotypic HRV. The other is what your DNA predicts your HRV should be, based on the handful of genetic variants known to influence cardiac autonomic function. This is genetically predicted HRV.

Oravi tracks phenotypic HRV (specifically RMSSD, the root mean square of successive differences between heartbeats) because the evidence shows it is the version that actually predicts health outcomes.

### The evidence

A 2023 genome-wide association study of 46,075 UK Biobank participants identified 17 independent genetic variants across 16 loci associated with HRV. From these, researchers constructed polygenic risk scores to estimate each person's genetically predicted HRV. They then tested both the measured (phenotypic) HRV and the genetically predicted HRV against mortality over a median follow-up period.

The results were unambiguous. Individuals in the lowest quartile of measured RMSSD had a 31% higher risk of dying from any cause compared to those in the highest quartile (HR 1.31, 95% CI 1.15 to 1.51). The association held after adjusting for age, sex, BMI, smoking, alcohol, physical activity, and prevalent disease. But genetically predicted HRV showed no association with mortality at all. The genetic score simply did not predict who would live or die.

This finding was confirmed by a separate 2022 meta-analysis of 32 studies and 38,008 participants, which found that the lowest quartile of measured 5-minute RMSSD carried a 56% increased risk of death (HR 1.56, 95% CI 1.32 to 1.85). Critically, when HRV was corrected for heart rate (removing the mathematical dependency between the two), the mortality association persisted — meaning the signal comes from the variability itself, not from resting heart rate.

### What this means biologically

The gap between phenotypic and genetic HRV tells us that the part of heart rate variability that matters for health is the part driven by your current physiological state — not the part you were born with. Measured RMSSD reflects real time parasympathetic (vagal) tone: how effectively your autonomic nervous system modulates your heart rhythm in response to inflammation, fitness, sleep quality, stress, and metabolic health.

This is where the oral microbiome enters the picture.

Nitric oxide is a direct modulator of cardiac vagal tone. It enhances parasympathetic signaling at the sinoatrial node and improves baroreflex sensitivity — both of which increase HRV. The primary source of systemic nitric oxide in most people is the enterosalivary nitrate pathway, where nitrate-reducing bacteria on the tongue (predominantly Neisseria and Rothia species) convert dietary nitrate into nitrite, which is then reduced to nitric oxide in the stomach and circulation.

When this pathway is disrupted — through low Neisseria abundance, antiseptic mouthwash use, or a dysbiotic oral microbiome — nitric oxide availability drops, vagal tone decreases, and measured RMSSD falls. This is not a genetic change. It is a phenotypic change driven by the composition of the oral microbiome, which is itself modifiable through diet, oral hygiene practices, and avoidance of antimicrobial disruption.

This is the biological chain Oravi's three panel system is designed to capture:

**Oral panel** (Neisseria abundance, oral diversity, pathogen load) → **nitric oxide availability** → **autonomic tone** → **Wearable panel** (RMSSD) → and simultaneously → **Blood panel** (blood pressure regulation, CRP, cardiovascular markers)

Measured RMSSD sits at the intersection of all three panels. It is not just a heart metric. It is a readout of how well the oral to cardiovascular pathway is functioning, how effectively the body is managing inflammation, and how well the autonomic nervous system is recovering during sleep. That is why Oravi includes it in the biological age composite and uses it as a cross-panel signal in the connection rules engine.

### Why not use genetic HRV?

Genetic HRV (polygenic risk scores) may eventually prove useful as a baseline anchor — telling a user what their expected HRV range is given their genetics, so that deviations from that baseline carry more meaning. But the current evidence does not support using genetic HRV as a health outcome predictor. It is the measured value, changing night to night in response to real physiological conditions, that carries the prognostic signal. And it is the measured value that users can improve.

### Citations

1. Tegegne BS, et al. Phenotypic but not genetically predicted heart rate variability associated with all-cause mortality. *Communications Biology*. 2023;6:1013. DOI: 10.1038/s42003-023-05376-y
2. Sammito S, et al. Heart rate variability in the prediction of mortality: a systematic review and meta-analysis of healthy and patient populations. *Neuroscience & Biobehavioral Reviews*. 2022;143:104907. DOI: 10.1016/j.neubiorev.2022.104907
3. Tegegne BS, et al. Determinants of heart rate variability in the general population: the Lifelines Cohort Study. *Heart Rhythm*. 2018;15(10):1552-1558. PMID: 29753022
4. Tegegne BS, et al. Heritability and the genetic correlation of heart rate variability and blood pressure in >29,000 families. *Hypertension*. 2020;76(4):1256-1262. PMCID: PMC7480943
5. Kapil V, et al. Physiological role for nitrate-reducing oral bacteria in blood pressure control. *Free Radical Biology and Medicine*. 2013;55:93-100. PMID: 23201780
6. Chobanyan-Jurgens K, et al. Stimulation of the nitrate-nitrite-NO pathway by an acute rise in oral nitrate availability. *Nitric Oxide*. 2017;65:37-42.

---

# SECTION 1: Viome vs Oravi Competitive Map

## How to Read This Table

Viome's 8 health score categories are compared against what Oravi currently covers, where Oravi can add new rules using its existing three panels (oral microbiome via 16S, blood work via CBC/CMP, wearables via WHOOP/Oura), and where Viome has structural advantages Oravi cannot match without new data infrastructure.

---

## Comparative Table

| Health Dimension | What Viome Does | What Oravi v1.2 Covers | What Oravi v1.3 Can Add (3-panel) | What Oravi Cannot Match (structural gap) |
|---|---|---|---|---|
| **Oral Health** | 16 sub-scores including: Gum Health, Dental Health, Oral Pathogen Activity, Oral Inflammatory Pathways, Oral Mucin Degradation, Cavity Promoting Microbes/Pathways, Oral Sulfide Production, Oral Polyamine Production, Breath Odor | Rules 1–7, 9, 10, 11, 12, 13, 14, 16A, 20, 21, 22 — covers pathogens, NO pathway, cavity risk, breath, gum bacteria at species level | Oral barrier / leaky gums composite; oral diversity as health signal; Fusobacterium-specific cardiovascular rules; gum pathogen + blood convergence rules | RNA-level pathway scoring (mucin degradation pathway activity, polyamine production rate) — Oravi detects species, not pathway expression rates; Viome's per-user RNA scoring of metabolic activity goes beyond 16S |
| **Gut Health** | 20+ sub-scores: butyrate production, LPS biosynthesis, methane/sulfide/ammonia production, bile acid metabolism, TMA production, oxalate metabolism, uric acid production | None — Oravi has no gut panel | Indirect proxies: DNRA organisms as metabolic pathway signal (Rules 6A, 12B); future: oral-gut axis rule | Entire gut panel; butyrate, LPS, methane, TMA, bile acid pathway scoring require stool sample; Oravi cannot replicate without adding a gut test |
| **Heart & Metabolic Health** | Oxidative stress, vascular health, cholesterol metabolism, kidney function, blood sugar regulation, TMA/TMAO pathway, metabolic efficiency | Rules 1A/1D (NO+LDL/RHR), 5A/5B (OMA+RHR), 12A/12B (oral bacteria+glucose), 17A (triple convergence), 18A/18B/18C (wearable+blood metabolic), 19B (sleep+glucose), 20A (oral+kidney) | Metabolic convergence composite rules (3+ signals aligning); CRP+glucose+RHR+oral pathogen cluster; oral pathogens + LDL oxidation risk framing | TMA/TMAO pathway (requires stool); CGM-based glycemic response prediction; food recommendation engine |
| **Inflammation Response** (InflammAging) | InflammAging™ score: chronic low-grade inflammation composite from gut + oral + cellular RNA data | Rules 2A, 3A, 9A/9B, 15A, 18C (individual inflammation signals) | **InflammAging composite rule**: CRP + oral pathogens + poor sleep + elevated RHR all firing together → aggregate signal; makes Oravi's multi-panel inflammatory picture visible as a single convergence | RNA-level inflammatory gene expression; Viome can see whether inflammatory genes are being transcribed; 16S only shows who is present, not what they are doing |
| **Immune System Health** | 14+ pathway scores: innate/adaptive immunity, toxin clearance, oxidative stress management, cytokine/interleukin signaling, wound healing | Rule 19A (short sleep + WBC); Rule 22A/22B (oral pathogens + WBC) | Immune burden composite (high WBC + high oral pathogens + short sleep = overactivated immune state); favorable immune state composite (balanced WBC + low pathogens + adequate sleep); lymphocyte differential rules | Gut-derived immune signaling (Th1/Th2/Treg balance from gut microbiome); cytokine panel from RNA sequencing |
| **Biological Age** | BioAge™ combining gut + oral + cellular RNA data | PhenoAge from blood (CBC+CMP), OMA score from oral, wearable contribution to Oravi Age; Rules 8A/8B (trend detection), 15A/15B (blood age + oral) | Oral diversity as aging input (low Shannon diversity → unfavorable aging signal); composite "all-clear" favorable rule when all panels show healthy signals | RNA-based BioAge; Viome can see which aging-related genes are actively being expressed; Oravi measures phenotypic markers, not transcriptional activity |
| **Brain & Cognitive Health** | Serotonin/GABA production pathways, focus activity, methylation, circadian rhythm regulation | Rule 9A/9B (oral pathogens + cognitive health framing via neuroinflammation) | Sleep architecture × immune function rules (deep sleep + WBC, REM deprivation + CRP) provide indirect cognitive health signals | Gut-derived serotonin and GABA pathway scoring; gut microbiome produces ~95% of body serotonin; oral connection is secondary |
| **Cellular & Energy Efficiency** | Mitochondrial function, energy pathway efficiency, oxidative stress from RNA data | Indirect via PhenoAge (albumin, RDW reflect cellular metabolic health) | RDW + sleep short + pathogens composite (reflects cellular stress from multiple sources) | RNA-based cellular energy pathway scoring; Oravi has no cellular-level signal |
| **Sleep / Recovery** | Not a primary Viome score; circadian rhythm mentioned under Brain & Cognitive | Rules 3, 4A, 8C/8D, 13A, 15A, 16B, 18A/18B, 19A/19B/19C (extensive sleep + blood/oral) | Sleep architecture × immune function expansion; sleep regularity × lymphocyte; REM × CRP trajectory | Continuous glucose monitoring during sleep; Viome's circadian analysis is microbiome-based (gut); Oravi's wearable data is more granular here than Viome |
| **Oral Microbiome Diversity** | Included in Oral Health scores (alpha diversity, protective microbes) | OMA score implicitly captures diversity as a community-level index; Shannon diversity tracked | New rules explicitly connecting Shannon diversity to mortality risk, cardiovascular risk, and inflammation using Vogtmann 2025 (n=7,721) and Yang 2024 (n=8,224) | RNA-based functional diversity (Viome can see what diverse communities are *doing*, not just who is there) |

---

## Structural Gap Summary

### HIGH PRIORITY — Can Build with Oravi's Existing 3 Panels
1. Oral barrier / leaky gums composite rule (pathogens + CRP + WBC)
2. Oral diversity as independent mortality/aging signal
3. InflammAging composite (CRP + oral pathogens + poor sleep + elevated RHR)
4. Immune burden composite (WBC + oral pathogens + short sleep)
5. Favorable immune state rule ("all-clear" composite)
6. Metabolic syndrome convergence rule (3+ metabolic signals)
7. Fusobacterium-specific cardiovascular rule
8. Sleep architecture × immune function expansion

### CANNOT MATCH WITHOUT NEW INFRASTRUCTURE
- Gut panel (stool test): butyrate, LPS, TMA/TMAO, bile acids, methane — Viome's largest moat
- RNA sequencing: pathway activity scoring vs. Oravi's species composition; this is the core tech difference — not a gap to close, a deliberate strategic choice
- CGM integration: glycemic response prediction requires continuous glucose data
- Custom supplement formulation: requires manufacturing partner
- Food recommendation engine (Superfoods/Blockers): requires food database + microbiome correlation engine

---

# SECTION 2: New Rules for v1.3

These rules continue from Rule 22 in v1.2. The format is identical to v1.2.

---

## RULE 23: Oral Barrier Health × Systemic Entry

**Biological basis:** The oral mucosa and gingival epithelium form the primary physical barrier between the oral microbiome and the systemic circulation. When periodontal pathogens — particularly *Porphyromonas gingivalis*, *Fusobacterium nucleatum*, and *Tannerella forsythia* — are elevated and inflammation markers confirm active tissue response, bacteremia occurs with every chewing event. This "leaky gums" state provides a continuous low-level portal for bacterial products (LPS, gingipains) and viable bacteria into the bloodstream. The oral equivalent of intestinal permeability. Mougeot et al. (2017, J Oral Microbiol, n=42) detected periodontal organisms in 100% of atherosclerotic plaques from CVD patients. Leibovici et al. (2024, Clin Oral Invest) confirmed that high periodontal pocket depth (implying barrier disruption) correlated independently with elevated hs-CRP and WBC after controlling for BMI and age.

---

### Rule 23A: Oral Barrier Disruption + Elevated CRP + Elevated WBC
**Panels:** Oral × Blood (triple marker convergence)
**Firing:** Tier 1 pathogen (Porphyromonas or Fusobacterium) > 85th pct AND hs-CRP > 3.0 mg/L AND WBC > 9.0 x 10 cubed/uL
**Priority:** 1

**Connection line:** Your mouth may be acting as an open door — and what is getting through is keeping your immune system and inflammation running hot.

**Expanded:** Your oral panel shows high levels of the bacteria most associated with gum tissue breakdown, your inflammation marker is elevated, and your white blood cell count is above what is typical. These three readings across two separate tests are telling the same story. When the tissue between your gums and your bloodstream becomes inflamed and porous, bacteria and bacterial products enter your circulation with every meal, every time you brush, every time you chew. Your immune system responds by producing more white blood cells and elevating CRP — both of which your most recent results reflect. This is not a theoretical pathway. Research detected periodontal bacteria in atherosclerotic plaques in every single patient tested in one study, suggesting these bacteria reach further than your mouth.

**Action:** This combination warrants a priority dental appointment, specifically asking for a periodontal evaluation (not just a standard cleaning). Tell your dentist your blood test found elevated CRP and WBC — that context matters. Daily flossing and interdental brushing reduce bacterial entry into the bloodstream within two to four weeks. Once the oral side improves, watch for CRP and WBC to follow.

**Citations:** Mougeot JL et al. J Oral Microbiol. 2017. PMID: 28326156 (Pg detected in 100% of 42 atherosclerotic plaque samples via 16S sequencing). Whelton SP et al. Am J Cardiol. 2014. PMID: 24393259 (MESA n=6,735; RHR × CRP × IL-6 convergence via inflammatory pathway). Rule 22A biological basis (oral pathogens → WBC via chronic bacteremia).

---

### Rule 23B: Oral Barrier Disruption + Elevated CRP (Blood Only — Wearable Confirming)
**Panels:** Oral × Blood × Wearable
**Firing:** Tier 1 pathogen > 85th pct AND hs-CRP > 3.0 mg/L AND (HRV < 25th pct OR RHR > expected + 6 bpm)
**Priority:** 1

**Connection line:** Elevated bacteria in your mouth, high inflammation in your blood, and your recovery metric — all pointing at the same source.

**Expanded:** When oral pathogens are high and CRP is elevated, the immune activation is already measurable in your blood. When your wearable is also showing reduced recovery — lower HRV or higher resting heart rate than expected — it suggests the inflammatory burden from your mouth has crossed into the territory where your nervous system is also feeling it. The vagus nerve, which regulates the \"rest and recover\" side of your nervous system, is directly suppressed by the same pro-inflammatory cytokines elevated by periodontal bacteria. All three signals are from independent measurements. All three are flagging the same underlying source.

**Action:** The oral side is the upstream lever. Managing periodontal bacteria — through professional care and consistent daily cleaning — is the intervention most likely to move all three signals simultaneously. Your HRV will typically respond within a few weeks of reducing oral inflammatory load.

**Citations:** Drury RL, Simonetti S. Front Med. 2019. PMC6372525 (periodontal inflammation → vagal suppression → HRV reduction via cytokine-mediated autonomic dysregulation). De Souza ACA et al. Int Arch Med. 2013. PMC3879647 (review: periodontal inflammation → increased sympathetic, decreased parasympathetic modulation).

---

## RULE 24: Oral Diversity × Longevity and Inflammation Signals

**Biological basis:** Shannon diversity of the oral microbiome predicts all-cause mortality in two large independent prospective analyses of NHANES 2009–2012 data. Vogtmann et al. (2025, J Infect Dis, n=7,721, mean 8.8-year follow-up) found Shannon diversity HR = 0.85 per SD (95% CI 0.74–0.98) for all-cause mortality. Yang et al. (2024, J Clin Periodontol, n=8,224) found that the highest oral diversity quartile had HR = 0.58 (95% CI 0.38–0.89) compared to the lowest. Yu et al. (BMJ Open, 2024, n=8,224) showed a dose-response: protective association plateaued at >120 ASVs. The mechanism is indirect — higher oral diversity correlates with more balanced immune surveillance, lower periodontal pathogen dominance, better host defense, and less systemic inflammation. Both studies were adjusted for age, smoking, antibiotic use, dental visits, and chronic disease. Both relied on the same NHANES dataset, which is a limitation that warrants noting to users.

---

### Rule 24A: Low Oral Diversity + Elevated CRP
**Panels:** Oral × Blood
**Firing:** Shannon diversity index < 25th pct AND hs-CRP > 1.0 mg/L
**Priority:** 1

**Connection line:** A less diverse oral ecosystem is showing up in your inflammation levels — and research suggests this combination is worth paying attention to.

**Expanded:** Your mouth is home to several hundred bacterial species in a healthy state. When that community narrows — fewer species, less balance — two things tend to happen: harmful species face less competition and expand, and the overall immune environment in your mouth becomes less stable. Your oral panel shows a lower diversity than is typical, and your inflammation marker reflects it. Two large studies following tens of thousands of people over nearly nine years found that lower oral diversity was independently associated with higher mortality risk — adjusted for smoking, age, medication use, and chronic conditions. This is not something Oravi diagnoses. It is a pattern worth paying attention to and one you can improve through oral care, diet, and overall health habits.

**Action:** Oral diversity responds to diet more than most people realize. Fermented foods (natural yogurt, kefir, sauerkraut), fiber variety, and eliminating antiseptic mouthwash are the three evidence-supported levers for increasing oral microbial diversity. Diversity typically shifts within four to six weeks of consistent dietary change.

**Citations:** Vogtmann E et al. J Infect Dis. 2025. DOI: 10.1093/infdis/jiaf321 (n=7,721, Shannon HR 0.85/SD for all-cause mortality). Yang Z et al. J Clin Periodontol. 2024. DOI: 10.1111/jcpe.14056 (n=8,224, highest diversity quartile HR 0.58).

---

### Rule 24B: Low Oral Diversity + Elevated Oral Pathogens
**Panels:** Oral (internal — diversity × pathogen)
**Firing:** Shannon diversity index < 25th pct AND Tier 1 pathogen > 75th pct
**Priority:** 1

**Connection line:** When fewer species live in your mouth, the ones linked to inflammation tend to take over — and that is what your results show.

**Expanded:** A diverse oral microbiome works through competition. Hundreds of species crowd out any single species that would otherwise dominate. When diversity collapses, the bacteria most capable of thriving in an uncontested environment — which tend to be the inflammatory, anaerobic species — expand to fill the space. Your oral panel shows both reduced diversity and elevated harmful bacteria in the same sample. This is not a coincidence. It is the expected consequence of competitive collapse in a microbial community.

**Action:** Rebuilding diversity and reducing pathogen load are two sides of the same intervention. Stop antiseptic mouthwash (which reduces diversity by design), increase fermented food intake, and add nitrate-rich vegetables (which selectively promote protective species). Consider an L. reuteri probiotic — it has specific RCT evidence for reducing periodontal pathogens without disrupting the broader community.

**Citations:** Yu J et al. BMJ Open. 2024. DOI: 10.1136/bmjopen-2024-087288 (dose-response diversity-mortality, protective effect plateau >120 ASVs). Vanhatalo A et al. Free Radic Biol Med. 2018. PMC6191927 (nitrate diet → increased Rothia +127%, Neisseria +351%, decreased Prevotella −60%).

---

### Rule 24C: High Oral Diversity + Low CRP
**Panels:** Oral × Blood
**Firing:** Shannon diversity index > 65th pct AND hs-CRP < 1.0 mg/L
**Priority:** 2

**Connection line:** A rich oral ecosystem and low inflammation — these are two measurements working together in your favor.

**Expanded:** A diverse oral microbiome keeps inflammatory species in check through competition. When diversity is high, harmful species have less room to establish dominance, the gum barrier stays more intact, and systemic inflammatory markers like CRP tend to stay lower. Your oral panel and your bloodwork are both reflecting a well-functioning system. Research following over 8,000 people found that individuals with higher oral diversity had significantly lower mortality risk over nine years — adjusted for all major confounders. Your data is tracking in that direction.

**Action:** Protect this. Whatever your oral care routine looks like, it is working. Retest in 6 months to confirm stability.

**Citations:** Yang Z et al. J Clin Periodontol. 2024. DOI: 10.1111/jcpe.14056 (n=8,224, highest diversity quartile HR 0.58 vs. lowest). Vogtmann E et al. J Infect Dis. 2025. DOI: 10.1093/infdis/jiaf321 (Shannon HR 0.85/SD for all-cause mortality, n=7,721).

---

## RULE 25: Metabolic Syndrome Convergence (Triple Signal)

**Biological basis:** Metabolic syndrome is defined by the convergence of hyperglycemia, dyslipidemia, hypertension, and abdominal obesity. Oravi can detect a metabolic convergence pattern from three independent inputs: blood (HbA1c, fasting glucose, LDL/HDL, CRP), wearable (RHR, HRV), and oral (DNRA organisms that impair nitric oxide pathway critical to insulin sensitivity). Wang et al. (2015, Int J Epidemiol, n=73,357) showed each 10 bpm increase in RHR raised incident diabetes risk by 23%. Azulay et al. (2022, Tromsø 6, n=7,704) confirmed HRV declines within the normal HbA1c range — meaning wearables may catch metabolic drift before blood panels do. The oral pathway adds a third independent dimension: DNRA organisms divert dietary nitrate from the nitric oxide pathway, directly impairing the molecular mechanism of insulin sensitivity (NO activates GLUT4 in skeletal muscle).

---

### Rule 25A: Metabolic Triple Convergence — Blood + Wearable + Oral
**Panels:** Oral × Blood × Wearable
**Firing:** (HbA1c > 5.6% OR fasting glucose > 100 mg/dL) AND (RHR > 75 bpm OR HRV RMSSD < 20 ms) AND (DNRA organisms > 75th pct OR S. mutans > 75th pct)
**Priority:** 1

**Connection line:** Three independent measurements are pointing at the same pattern — your metabolism is under pressure from more directions than any single test would show.

**Expanded:** Your blood panel, your wearable data, and your oral microbiome are each flagging a piece of the same picture. Elevated blood sugar or glucose control markers tell part of the story. But your resting heart rate or recovery metric suggests your autonomic nervous system is also under strain — the sympathetic system running hotter than it should directly impairs insulin sensitivity. And your oral panel shows bacteria that are diverting dietary nitrate away from the pathway your body uses to help muscles absorb glucose efficiently. Three different measurements. Three different mechanisms. One converging pattern. Your doctor can see one side. Your wearable sees another. Oravi sees all three at once.

**Action:** This is a three-front intervention: (1) Zone 2 cardiovascular exercise — 150 minutes per week — addresses all three signals simultaneously (lowers RHR, improves insulin sensitivity, supports the oral microbiome toward nitrate-reducing species); (2) stop antiseptic mouthwash to restore the nitric oxide pathway; (3) discuss blood sugar trajectory with your doctor, bringing this data as context. These are not separate problems.

**Citations:** Wang L et al. Int J Epidemiol. 2015. PMID: 26002923 (n=73,357, RHR: HR 1.73 for incident diabetes in highest quintile). Azulay N et al. Sci Rep. 2022. PMID: 35835836 (Tromsø 6, n=7,704: HRV declines within normal HbA1c range). Joshipura KJ et al. Nitric Oxide. 2017 (mouthwash use → 55–117% higher hypertension risk via NO pathway).

---

### Rule 25B: Metabolic Convergence — Blood + Oral (Dual Signal)
**Panels:** Oral × Blood
**Firing:** (HbA1c > 5.7% AND LDL > 130 mg/dL) AND (DNRA organisms > 75th pct OR Neisseria < 5th pct)
**Priority:** 1

**Connection line:** Your blood sugar and cholesterol are both elevated, and your oral bacteria may be making both harder to manage.

**Expanded:** The nitric oxide pathway — which depends on specific bacteria in your mouth — plays a role in both blood vessel health and insulin sensitivity. When those bacteria are depleted or outcompeted, two things happen in parallel: LDL particles encounter stiffer, more vulnerable artery walls (because NO normally keeps them relaxed), and glucose handling worsens (because NO helps skeletal muscle absorb glucose). Your blood panel is showing both effects simultaneously, and your oral panel may be the upstream driver of both. This is a cross-panel pattern that neither a doctor nor a dentist would catch independently.

**Action:** Rebuild the nitric oxide pathway first — stop antiseptic mouthwash, increase nitrate-rich vegetables (arugula, beets, spinach). Continue any LDL management your doctor recommends; the two interventions work on the same problem from different directions and are additive.

**Citations:** Kapil V et al. Free Radic Biol Med. 2013. PMID: 23201780 (7-day chlorhexidine: salivary nitrite −90%, plasma nitrite −25%, systolic BP +2.3 mmHg). Vanhatalo A et al. Free Radic Biol Med. 2018. PMC6191927 (oral bacteria modulate systemic NO bioavailability; Neisseria + Rothia → plasma nitrite increase).

---

### Rule 25C: Metabolic Resilience — Favorable Convergence
**Panels:** Blood × Wearable × Oral
**Firing:** HbA1c < 5.4% AND fasting glucose < 90 mg/dL AND RHR < expected minus 5 bpm AND Neisseria > 40th pct
**Priority:** 2

**Connection line:** Your blood sugar, heart rate, and oral bacteria are all working together — your metabolism is in a strong, resilient state.

**Expanded:** When the bacteria that support nitric oxide production are healthy, blood sugar control is well within range, and your cardiovascular system is running efficiently (reflected in a lower-than-expected resting heart rate), all three systems are reinforcing each other in a positive direction. Nitric oxide improves insulin sensitivity, which supports healthy blood sugar, which reduces the inflammatory burden that would otherwise raise resting heart rate. This favorable loop is exactly what a healthy metabolic state looks like from the inside — visible here across three separate panels.

**Action:** Maintain what you are doing. Retest in 6 months. If anything changes — a dietary shift, antibiotics, new mouthwash — repeat sooner and look for the first signal to shift.

**Citations:** Blot SI et al. Intensive Care Med. 2020 (systemic NO pathway review: oral bacteria → plasma nitrite → vascular tone, insulin sensitivity). Azulay N et al. Sci Rep. 2022. PMID: 35835836 (HRV within-normal-range associations with metabolic health).

---

## RULE 26: InflammAging Composite — Multi-Panel Inflammation Convergence

**Biological basis:** Inflammaging — chronic low-grade inflammation that accelerates biological aging — is the convergence of multiple small inflammatory signals rather than any single large one. CRP is the best blood-based marker. Oral pathogens are a continuous source of bacteremia and inflammatory cytokines (IL-6, TNF-alpha, IL-1 beta). Sleep disruption activates NF-kB within days, directly elevating CRP and WBC. Elevated resting heart rate reflects sympathetic nervous system overactivity, which drives adrenergic receptor-mediated cytokine production on immune cells. None of these alone is necessarily alarming. Together, they describe a state of chronic immune activation that drives biological aging. CRP, WBC, and albumin are all PhenoAge inputs — sustained inflammaging directly ages the blood panel. Irwin MR et al. (2019, Nat Rev Immunol) is the foundational review on sleep-driven inflammaging. Franceschi C et al. (2018, Nat Rev Endocrinol) is the seminal inflammaging framework.

---

### Rule 26A: InflammAging Convergence — All Three Panels
**Panels:** Oral × Blood × Wearable
**Firing:** hs-CRP > 1.5 mg/L AND Tier 1 pathogen > 70th pct AND (sleep < 6h OR sleep regularity SD > 45 min OR RHR > expected + 6 bpm)
**Priority:** 1

**Connection line:** Inflammation is building from three separate directions in your profile — and together they are adding up to more than any one panel would suggest.

**Expanded:** Chronic low-grade inflammation — sometimes called \"inflammaging\" — is not usually caused by one big thing. It accumulates from small, constant sources that each add a little to the burden. Your oral panel shows elevated bacteria known to trigger immune activation every time you eat or brush your teeth. Your CRP confirms that inflammation is circulating in your blood right now. And your sleep data shows the kind of pattern — short duration or irregular timing — that activates the body's inflammatory signaling pathways within days. Each of these alone would be worth monitoring. Together, they are a picture of a body whose immune system is running at a higher background level than it should be — which, sustained over years, is one of the strongest predictors of faster biological aging. Every one of those nine markers in your blood age calculation responds to this kind of inflammation.

**Action:** This requires a prioritized but not urgent response. Tackle the most accessible lever first: sleep regularity (anchoring bedtime within 30 minutes, even on weekends) typically reduces CRP within two to four weeks. The oral side is the second lever — a periodontal evaluation and consistent flossing reduce the bacteremia that keeps the immune system activated. These two changes together will do more for your long-term biological age than most supplements.

**Citations:** Irwin MR. Nat Rev Immunol. 2019. doi:10.1038/s41577-019-0148-2 (sleep and inflammaging: NF-kB activation with sleep restriction, CRP and IL-6 elevation). Whelton SP et al. Am J Cardiol. 2014. PMID: 24393259 (MESA: RHR independently predicts CRP, IL-6, fibrinogen). Meier-Ewert HK et al. J Am Coll Cardiol. 2004 (sleep restriction → CRP elevation in controlled study). Rule 22A biological basis (oral pathogens → chronic bacteremia → WBC and CRP elevation).

---

### Rule 26B: InflammAging — Oral + Sleep Convergence (No Blood Elevation Yet)
**Panels:** Oral × Wearable
**Firing:** Tier 1 pathogen > 75th pct AND sleep < 6h avg (30-night) AND hs-CRP 1.0 to 3.0 mg/L
**Priority:** 1

**Connection line:** Your oral bacteria and your sleep are both adding to an inflammatory load — your bloodwork is showing the early signs.

**Expanded:** CRP between 1 and 3 mg/L is not alarming on its own — it is in the \"intermediate\" risk range. But your oral panel and sleep data suggest there are active inputs feeding it from two directions simultaneously. Periodontal pathogens generate ongoing immune activation through repeated bacteremia. Short sleep activates the same inflammatory signaling pathway through a completely different mechanism. Your CRP is likely lower than it would be without one of these inputs — but with both operating together, it is trending in a direction that matters for your long-term biological age. This is the kind of pattern that is most useful to catch early.

**Action:** Two independent levers: sleep and oral. Addressing either one reduces the inflammatory load. Addressing both is additive. Set a consistent sleep schedule first — the benefit on CRP is measurable within two weeks. Schedule a dental evaluation second.

**Citations:** Meier-Ewert HK et al. J Am Coll Cardiol. 2004 (10 days restricted sleep elevated CRP in healthy people). Vogtmann E et al. J Infect Dis. 2025. DOI: 10.1093/infdis/jiaf321 (low oral diversity + higher all-cause mortality, adjusted for sleep quality among other variables).

---

### Rule 26C: InflammAging Favorable — All Inputs Low
**Panels:** Oral × Blood × Wearable
**Firing:** hs-CRP < 1.0 mg/L AND Tier 1 pathogen < 35th pct AND sleep 7 to 8.5h avg AND RHR < expected minus 3 bpm
**Priority:** 2

**Connection line:** Inflammation is low across the board — your oral health, sleep, and blood panel are all contributing to that.

**Expanded:** Chronic inflammation is fed from multiple sources. Your profile shows all of the major inputs — oral bacteria, sleep quality, cardiovascular tone, and direct blood measurement — pointing in the same favorable direction. Low pathogen levels mean your immune system is not dealing with constant bacterial entry from your mouth. Consistent, adequate sleep means your NF-kB inflammatory signaling is not being constantly activated. A lower-than-expected resting heart rate means your sympathetic nervous system is not driving adrenergic inflammatory signals. And your CRP confirms the result. This is the anti-inflammatory profile that, sustained over years, corresponds to slower biological aging.

**Action:** Protect this. Retest in 6 months. If you are taking any supplements for inflammation or sleep, this data confirms they are working — or confirms you may not need them.

**Citations:** Irwin MR. Nat Rev Immunol. 2019 (sleep's anti-inflammatory role when adequate and consistent). Franceschi C et al. Nat Rev Endocrinol. 2018 (inflammaging framework: convergent low-grade inflammation from multiple sources drives aging).

---

## RULE 27: Immune Readiness — Burden vs. Balance

**Biological basis:** WBC reflects the net immune activation state. Elevated WBC (>10 x 10³/uL) with concurrent oral pathogen burden and short sleep represents chronic immune overload — the immune system perpetually fighting without recovery, which elevates PhenoAge inputs and predicts poorer long-term outcomes. The opposite state — WBC in normal range, pathogens controlled, adequate sleep — represents immune resilience. Lymphocyte percentage (from CBC differential) adds specificity: neutrophil dominance (high neutrophil-to-lymphocyte ratio or NLR) with elevated pathogens reflects chronic bacterial immune activation, while balanced lymphocytes with low pathogens reflects effective adaptive immunity. Faraut et al. (2008, Vasc Health Risk Manag) showed sleep restriction to 4 hours for three nights raised WBC and neutrophils in controlled conditions. Vallat et al. (2020, PLoS Biol, MESA n=1,630) showed sleep fragmentation → neutrophil elevation → coronary artery calcification.

---

### Rule 27A: Immune Overload — WBC + Oral + Sleep (Triple)
**Panels:** Blood × Oral × Wearable
**Firing:** WBC > 9.5 x 10 cubed/uL AND Tier 1 pathogen > 75th pct AND sleep < 6h (30-night avg)
**Priority:** 1

**Connection line:** Your immune system is being pushed from three directions at once — and it does not have enough recovery time to find balance.

**Expanded:** Your white blood cell count is elevated, your oral panel shows the kind of bacterial load that triggers immune activation every time you eat or brush your teeth, and your sleep data shows your body is not getting the nightly reset that allows immune cells to recalibrate. These three things are compounding each other. Short sleep raises white blood cells directly — a controlled study found that three nights of 4-hour sleep raised WBC significantly in healthy young adults. Oral pathogens create independent immune activation through bacteremia. And WBC is one of the nine markers in your biological age calculation — keeping it elevated over time, from whatever source, moves your blood age older. Right now, you have three separate sources keeping it raised.

**Action:** Sleep is the fastest and most impactful lever here. Extending sleep to seven or more hours will reduce WBC within two weeks. Oral treatment (periodontal evaluation, consistent flossing) addresses the second source. These are additive — addressing both produces a larger response than either alone.

**Citations:** Faraut B et al. Vasc Health Risk Manag. 2008. PMID: 19337560 (4h sleep × 3 nights → WBC elevated in controlled study). Vallat R et al. PLoS Biol. 2020. PMID: 32497046 (MESA n=1,630: sleep fragmentation → elevated neutrophils → coronary artery calcification). Rule 22A biological basis (oral pathogens → chronic bacteremia → WBC elevation).

---

### Rule 27B: Immune Balance Favorable — WBC + Oral + Sleep
**Panels:** Blood × Oral × Wearable
**Firing:** WBC 4.5 to 8.5 x 10 cubed/uL AND Tier 1 pathogen < 35th pct AND sleep 7 to 9h avg AND sleep regularity SD < 35 min
**Priority:** 2

**Connection line:** Your immune system is in a balanced state — your oral health, sleep consistency, and blood panel are all contributing to that.

**Expanded:** WBC in the optimal mid-range reflects an immune system that is ready to respond to threats but is not stuck in a state of chronic activation. Your oral panel shows pathogen levels are well-controlled — reducing the constant low-level bacteremia that would otherwise keep your immune cells on alert. And your sleep data shows both adequate duration and consistent timing, which is exactly the pattern research associates with better immune regulation. Keeping WBC in this balanced range is one of the most direct contributions you can make to a younger biological age. This combination suggests your daily habits are supporting that.

**Action:** Maintain your current routines. Retest in 6 months to confirm stability, particularly after any illness, antibiotic use, or significant sleep disruption — all of which can shift this balance quickly.

**Citations:** Edwards DA et al. Brain Behav Immun Health. 2021. DOI: 10.1016/j.bbih.2021.100233 (sleep regularity associated with lower total WBC, neutrophils, lymphocytes). Rule 22B biological basis (WBC normal + pathogens low + sleep adequate = favorable immune alignment).

---

### Rule 27C: Immune Alert — NLR Elevated + High Oral Pathogen Burden
**Panels:** Blood × Oral
**Firing:** Neutrophil-to-lymphocyte ratio (NLR) > 3.0 AND Tier 1 pathogen > 80th pct
**Priority:** 1
**Requires:** CBC differential (neutrophil % and lymphocyte % from CBC)

**Connection line:** Your immune response is skewed toward the acute inflammation side — and your oral panel may be driving that shift.

**Expanded:** The ratio of neutrophils to lymphocytes in your blood tells a story about what your immune system has been doing. A high ratio means your innate immune system (neutrophils, designed for acute bacterial threats) is dominating over your adaptive immune system (lymphocytes, responsible for immune memory and long-term protection). When oral pathogens are persistently high, the mouth generates repeated bacteremic episodes that activate neutrophils — and the sustained demand keeps the ratio elevated. An NLR above 3.0 has been associated with worse outcomes in multiple chronic disease contexts. Your oral panel offers the most actionable explanation for what is driving it.

**Action:** A periodontal evaluation is the highest-leverage intervention. Reducing the chronic bacterial load that is keeping your neutrophil response activated is the upstream fix. Ask your dentist specifically about your oral microbiome results.

**Citations:** Leucuța D et al. J Pers Med. 2022. DOI: 10.3390/jpm12060992 (meta-analysis: elevated NLR, RDW, and inflammatory ratios associated with periodontitis). Rule 22A and 23A biological basis (chronic bacteremia → granulopoiesis → WBC and neutrophil elevation).

---

## RULE 28: Oral Cardiovascular Pathway — Fusobacterium and LDL Oxidation

**Biological basis:** Fusobacterium nucleatum has distinct cardiovascular implications beyond its known cancer associations. It activates TLR4/TLR2 signaling and NF-kB on macrophages and vascular endothelial cells, promoting inflammatory cytokine production (IL-6, IL-1 beta, TNF-alpha) that accelerates LDL oxidation and foam cell formation. Sato et al. (2024, Vasc Health Risk Manag) found oral bacteria — with *Fusobacterium* among identified genera — in carotid endarterectomy samples, with 55% of shared genera from the Human Oral Microbiome Database. Mougeot et al. (2017, J Oral Microbiol) detected *Fusobacterium* in atherosclerotic plaque via 16S sequencing alongside *Porphyromonas*. The FadA adhesin on *F. nucleatum* directly activates Wnt/beta-catenin in vascular cells, promoting endothelial permeability — the functional equivalent of endothelial dysfunction for LDL entry into the arterial wall.

---

### Rule 28A: Fusobacterium Elevated + LDL Elevated
**Panels:** Oral × Blood
**Firing:** Fusobacterium > 85th pct AND LDL > 130 mg/dL
**Priority:** 1

**Connection line:** One of the bacteria found in arterial plaques is elevated in your oral panel — and your LDL is in a range that matters.

**Expanded:** LDL cholesterol causes cardiovascular risk not by being high in number alone, but by entering and being oxidized within artery walls — a process that depends heavily on how inflamed and permeable those walls are. Fusobacterium is one of the oral bacteria that has been directly detected in samples taken from blocked arteries, and it carries molecules that promote inflammation in arterial tissue and increase the likelihood that LDL particles penetrate the wall. Your oral panel and LDL are flagging from two directions: a potential source of arterial inflammation and the raw material that inflammation acts upon. Together, this pattern warrants both interventions.

**Action:** Two independent tracks: (1) Discuss LDL management with your doctor, especially if your overall cardiovascular risk score is elevated; (2) manage Fusobacterium through dental care — professional cleaning and consistent daily flossing are the most evidence-based interventions for reducing this species. Do not use antiseptic mouthwash as a substitute for flossing; it suppresses beneficial bacteria alongside harmful ones.

**Citations:** Mougeot JL et al. J Oral Microbiol. 2017. PMID: 28326156 (16S sequencing: periodontal bacteria including Fusobacterium detected in atherosclerotic plaque). Sato A et al. Vasc Health Risk Manag. 2024. DOI: 10.1177/11795468231225852 (oral bacteria in carotid plaques: 55% shared genera from oral microbiome database). Karta J et al. EMBO J. 2025. DOI: 10.1038/s44318-025-00542-w (F. nucleatum drives pro-inflammatory fibroblast polarization relevant to vascular tissue).

---

### Rule 28B: Fusobacterium Elevated + CRP Elevated + RHR Elevated
**Panels:** Oral × Blood × Wearable
**Firing:** Fusobacterium > 80th pct AND hs-CRP > 2.0 mg/L AND RHR > expected + 6 bpm
**Priority:** 1

**Connection line:** Three separate readings are pointing at cardiovascular strain — starting with what is happening in your mouth.

**Expanded:** This rule fires when Fusobacterium levels in your oral panel are elevated at the same time that your blood inflammation marker and your resting heart rate are both above optimal. Fusobacterium is not just a gum-disease bacterium — it carries proteins that directly activate inflammatory signaling in blood vessel walls and has been found in arterial plaque samples. Your body's inflammation marker confirms systemic activation is ongoing. And your resting heart rate, elevated above what is expected for someone your age, reflects that your cardiovascular system is working harder than it should be in a resting state. These three signals converge on the same underlying theme.

**Action:** This combination warrants a deliberate cardiovascular conversation with your doctor. Share the oral microbiome data — it provides context for why your CRP may be elevated. Manage the oral side through dental care. Manage the cardiovascular side through zone 2 exercise and, if indicated, lipid management.

**Citations:** Whelton SP et al. Am J Cardiol. 2014. PMID: 24393259 (MESA: RHR independently predicts CRP/IL-6, n=6,735). Mougeot JL et al. J Oral Microbiol. 2017. PMID: 28326156 (Fusobacterium in atherosclerotic plaque via 16S).

---

### Rule 28C: Fusobacterium Age-Flagged (45+)
**Panels:** Oral × Demographics
**Firing:** Fusobacterium > 80th pct AND age >= 45
**Priority:** 1

**Connection line:** Research on long-term health has flagged this particular bacterium as more consequential with age — and it is elevated in your oral panel.

**Expanded:** Fusobacterium nucleatum has been studied extensively in the context of colorectal cancer, and the oral cavity is the likely reservoir for the strains found in colon tumors — research has matched strains from oral samples directly to tumor samples using genetic typing. The prospective data now shows that elevated Fusobacterium in oral wash samples predicts future colorectal cancer incidence. This is not a diagnostic finding, and most people with elevated Fusobacterium will never develop colorectal cancer. But this is exactly the kind of early signal that is worth bringing up with your primary care doctor, particularly if you have not had a recent conversation about age-appropriate preventive care.

**Action:** Bring this up with your doctor at your next routine visit. Let them know your oral microbiome test showed elevated levels of a bacterium that prospective research has linked to colorectal health outcomes. Your doctor can help you decide what, if anything, makes sense for follow up. On the oral care side, reducing Fusobacterium through improved hygiene, flossing, and tongue care is the most actionable step you can take directly.

**Citations:** Vogtmann E et al. Cancer. 2025. DOI: 10.1002/cncr.35802 (three US prospective cohorts: oral Fusobacterium in oral wash samples prospectively associated with CRC incidence). Queen J et al. npj Biofilms Microbiomes. 2025. DOI: 10.1038/s41522-025-00717-7 (Fna C2 enriched in biofilm-positive colon tumors; oral origin confirmed by phylogenetic matching).

---

## RULE 29: Sleep Architecture × Immune Function

**Biological basis:** Sleep architecture — the distribution of slow-wave sleep, REM sleep, and light sleep — affects immune function through distinct mechanisms. Slow-wave sleep (N3/deep sleep) is when the immune system consolidates its \"memory\" through cytokine-mediated communication between the brain and peripheral immune system (Born J et al. classic work on SWS-immune consolidation). REM sleep regulates inflammatory cytokine production — particularly IL-6, which is bidirectionally related to REM duration. Vallat et al. (2020, PLoS Biol, MESA n=1,630) showed sleep fragmentation → neutrophil elevation → coronary artery calcification through mediation analysis. Edwards et al. (2021, Brain Behav Immun Health) showed sleep regularity independently associated with WBC, neutrophils, lymphocytes, and monocytes. This rule set expands on Rule 19A (short sleep + WBC) to include architecture-specific and regularity-specific mechanisms.

---

### Rule 29A: Low Deep Sleep + Elevated WBC
**Panels:** Wearable × Blood
**Firing:** Deep sleep (N3) < 45 min avg (30-night) AND WBC > 9.0 x 10 cubed/uL
**Priority:** 1

**Connection line:** Reduced deep sleep is likely contributing to your elevated white blood cell count — the two are connected through the same nightly immune process.

**Expanded:** Deep sleep is when your immune system does its most important maintenance work. During slow-wave sleep, your body uses specific cytokine signals to coordinate immune memory consolidation and regulate the number of circulating white blood cells. When deep sleep is consistently shortened, this regulatory process is disrupted — and white blood cells trend higher, particularly neutrophils, which reflect a chronically activated innate immune state. A large study of 1,630 people confirmed that fragmented sleep (which reduces deep sleep) predicts elevated neutrophil counts and was directly linked to arterial calcification through that mechanism. Your deep sleep duration and WBC are both outside the optimal range in a way that fits this pattern.

**Action:** Deep sleep responds strongly to a few specific interventions: consistent bedtime (the circadian clock governs when deep sleep occurs), cool sleeping temperature (65 to 68 degrees Fahrenheit actively promotes slow-wave sleep), alcohol elimination within three hours of sleep (alcohol dramatically suppresses deep sleep despite improving sleep onset), and resistance training earlier in the day. WBC typically normalizes within two to three weeks of consistent deep sleep improvement.

**Citations:** Vallat R et al. PLoS Biol. 2020. PMID: 32497046 (MESA n=1,630: sleep fragmentation → neutrophil elevation → coronary artery calcification via mediation). Faraut B et al. Vasc Health Risk Manag. 2008. PMID: 19337560 (sleep restriction → WBC and neutrophil elevation in controlled study).

---

### Rule 29B: Sleep Regularity Low + Lymphocyte Shift
**Panels:** Wearable × Blood
**Firing:** Sleep regularity SD > 50 min AND neutrophil-to-lymphocyte ratio (NLR) > 3.0
**Priority:** 1
**Requires:** CBC differential

**Connection line:** Irregular sleep may be tilting your immune system toward the wrong kind of activity — your blood panel reflects the shift.

**Expanded:** Consistent sleep timing — going to bed and waking up within a narrow window — is not just a convenience. It is how your immune system maintains the balance between its fast-acting inflammatory response (neutrophils) and its more precise, targeted response (lymphocytes). When your sleep timing is highly variable, the circadian signals that regulate this balance are disrupted. Your blood panel shows a neutrophil-to-lymphocyte ratio that suggests your immune system is spending more energy on the broad, inflammatory response and less on the adaptive, memory-based response. Research confirms that irregular sleep independently elevates neutrophils and lymphocytes alike — but the differential shift toward neutrophil dominance reflects an immune system stuck in a stress-response state.

**Action:** Anchoring your sleep and wake times within a 30-minute window — even on weekends — is the single most impactful intervention for restoring immune balance through circadian entrainment. This does not require sleeping more, just more consistently. Improvement in WBC and lymphocyte balance typically shows up within three to four weeks.

**Citations:** Edwards DA et al. Brain Behav Immun Health. 2021. DOI: 10.1016/j.bbih.2021.100233 (sleep regularity independently associated with total WBC, neutrophil, lymphocyte, and monocyte counts in young adults). Morris CJ et al. PNAS. 2015. PMC4418873 (circadian misalignment independently reduces glucose tolerance and immune regulation via circadian clock disruption).

---

### Rule 29C: REM Disruption Pattern + Elevated CRP
**Panels:** Wearable × Blood
**Firing:** REM sleep < 60 min avg (30-night) AND hs-CRP > 2.0 mg/L
**Priority:** 3
**Note:** Wearable REM estimates carry measurement uncertainty (±10–15% vs. PSG). This rule is exploratory; framed as such.

**Connection line:** We are watching a possible connection between your reduced REM and the inflammation in your blood panel.

**Expanded:** REM sleep and inflammation have a complex, bidirectional relationship that researchers are still characterizing. What is well-established: consistently reduced total restorative sleep — including short REM — is associated with elevated IL-6 and other inflammatory markers. Your REM average is below the typical range, and your CRP is elevated at the same time. This is emerging science, and wearable REM estimates are less precise than other sleep metrics — Oravi is flagging this connection because we can see both signals simultaneously, not because the relationship is as well-established as other rules in this engine. It is worth watching on your next retest.

**Action:** Alcohol and many sleep medications suppress REM sleep specifically. If either applies to you, eliminating alcohol within three hours of sleep and discussing REM-preserving alternatives with your doctor are the two most evidence-aligned actions. Focus first on addressing CRP through better-established levers (sleep regularity, oral health, exercise).

**Citations:** Thomas KS, Irwin MR et al. Brain Behav Immun. 2011. PMID: 20656013 (IL-6 and REM duration association: bidirectional; greatest IL-6 production in lowest SWS quartile). Çoluk Y et al. BMC Complement Altern Med. 2024 (chronic REM sleep deprivation elevated IL-6 and TNF-alpha in controlled animal model).

---

## RULE 30: Favorable Composite Rules — Cross-Panel All-Clear

**Biological basis:** Favorable rules are systematically underrepresented in most health platforms, which default toward pathology detection. Oravi's insight layer should be as capable of recognizing health-span extension as risk escalation. Research on favorable composite states is direct: low CRP is a strong predictor of reduced all-cause mortality independent of other factors. High oral diversity correlates with reduced mortality in two large prospective studies. OMA above median combined with low CRP and good sleep describes a state of coordinated health optimization across all three Oravi panels. These rules exist to affirm what is working and encourage continuity — behavior change research consistently shows that positive reinforcement of current behavior is more effective at sustaining healthy habits than risk-based framing alone.

---

### Rule 30A: Full-Panel Favorable — Oral + Blood + Sleep
**Panels:** Oral × Blood × Wearable (all three)
**Firing:** OMA > 65th pct AND hs-CRP < 1.0 mg/L AND Tier 1 pathogen < 35th pct AND sleep 7 to 8.5h avg AND sleep regularity SD < 30 min
**Priority:** 2

**Connection line:** Your oral health, blood panel, and sleep are all in a strong alignment — three independent measurements pointing in the same favorable direction.

**Expanded:** Most health platforms are designed to catch problems. Oravi is designed to see the full picture, which means recognizing when the system is working well. Your oral microbiome shows a healthy balance — protective species in good shape, harmful bacteria well-controlled. Your CRP tells us the oral health picture is translating to systemic low inflammation. And your sleep data shows both adequate duration and consistency — the pattern research most reliably associates with healthy immune function and slower biological aging. These three panels rarely align this cleanly. Each one is influenced by different lifestyle factors: oral health responds to diet and hygiene, CRP responds to multiple inputs, and sleep responds to schedule and environment. When all three are favorable simultaneously, it means multiple systems are working together.

**Action:** This is a profile worth protecting and tracking. Whatever your current oral care routine, diet, and sleep habits look like — keep doing them. Retest in 6 months. If a major life change occurs (antibiotics, illness, extended travel, dietary shift), retest sooner and look for the first panel to shift.

**Citations:** Vogtmann E et al. J Infect Dis. 2025. DOI: 10.1093/infdis/jiaf321 (high oral diversity → lower all-cause mortality HR 0.85/SD). Irwin MR. Nat Rev Immunol. 2019 (consistent sleep → anti-inflammatory effect via NF-kB suppression). Meier-Ewert HK et al. J Am Coll Cardiol. 2004 (adequate sleep → CRP reduction in controlled study).

---

### Rule 30B: Oral + Blood Favorable — No Wearable Needed
**Panels:** Oral × Blood
**Firing:** OMA > 65th pct AND PhenoAge < chronoAge minus 2 AND hs-CRP < 1.0 mg/L AND Shannon diversity > 55th pct
**Priority:** 2

**Connection line:** Your oral health and blood panel are telling the same positive story — a diverse oral ecosystem contributing to a younger blood age.

**Expanded:** Your oral panel shows a healthy, diverse community of bacteria — the kind of profile that two large prospective studies linked to lower long-term mortality risk. And your blood-based biological age is younger than your actual age, with low inflammation reinforcing that picture. These two panels are not independent — the oral microbiome contributes to several of the nine markers in your blood age calculation through its influence on systemic inflammation, NO production, and immune activation. When both panels are favorable simultaneously, it suggests the oral-to-blood pathway is working in your favor, not against you.

**Action:** Maintain your routine. Your blood age is younger than your calendar age — that is a meaningful measurement, not a coincidence. Retest in 6 months.

**Citations:** Yang Z et al. J Clin Periodontol. 2024. DOI: 10.1111/jcpe.14056 (highest oral diversity quartile: HR 0.58 for all-cause mortality vs. lowest). Rule 15B biological basis (OMA strong + PhenoAge lower than chronological age — oral contributes to blood age via CRP pathway).

---

### Rule 30C: Sleep + Blood Favorable — Recovery Panel All-Clear
**Panels:** Wearable × Blood
**Firing:** Sleep 7 to 8.5h avg AND sleep regularity SD < 25 min AND HRV RMSSD > 65th pct for age/sex AND hs-CRP < 1.0 mg/L
**Priority:** 2

**Connection line:** Your recovery and inflammation metrics are in strong alignment — your sleep is actively keeping your biology younger.

**Expanded:** Heart rate variability in the upper range for your age, combined with consistent seven-plus hours of sleep and low CRP, is the recovery profile that longevity research consistently points to as protective. HRV reflects how well your parasympathetic nervous system is operating. High HRV means your body shifts efficiently between activity and recovery. Combined with good sleep consistency and low inflammation, this is the trifecta of healthy autonomic function: adequate input (sleep), efficient regulation (HRV), and low systemic cost (CRP). CRP is a direct PhenoAge input — keeping it below 1.0 mg/L through consistent sleep is one of the most reliable biological age interventions available.

**Action:** This is working. Protect your sleep schedule and sleep environment — this combination is more valuable than most supplements or interventions. Retest in 6 months.

**Citations:** Azulay N et al. Sci Rep. 2022. PMID: 35835836 (high HRV associated with lower metabolic syndrome burden across n=7,704). Irwin MR. Nat Rev Immunol. 2019 (adequate sleep → suppression of NF-kB → lower CRP and IL-6).

---

### Rule 31A: Step Count × Inflammation × Autonomic Stress — Sedentary Cardiometabolic Convergence
**Panels:** Wearable (steps) × Blood (hsCRP) × Wearable (HRV)
**Firing:** Daily step average < 5,000 AND hs-CRP > 2.0 mg/L AND HRV RMSSD < 35th percentile for age/sex
**Priority:** 1

**Connection line:** Low daily movement, elevated inflammation, and a stressed autonomic system are reinforcing each other — and the research says this combination carries real long-term risk.

**Expanded:** Your step count, inflammation marker, and heart rate variability are all pointing in the same direction. A 2025 Lancet Public Health meta-analysis of 57 studies found that going from 2,000 to 7,000 steps per day was associated with a 47% lower risk of dying from any cause and a 25% lower risk of cardiovascular disease. The steepest part of that curve sits right where your numbers are — below 5,000 steps — meaning even modest increases in daily movement carry disproportionately large benefits at this range. Meanwhile, your CRP is elevated above 2.0 mg/L, which tells us your body is running a sustained inflammatory response, and your HRV is in the lower third for your age and sex, which means your autonomic nervous system is not recovering efficiently between stressors. These three signals are not independent. Low physical activity reduces nitric oxide production, impairs endothelial function, and allows inflammatory markers to drift upward. Elevated CRP itself suppresses vagal tone, which lowers HRV. And low HRV reflects a nervous system stuck in a sympathetic (fight or flight) state, which further promotes inflammation. This is a feedback loop — each element makes the other two worse.

**Action:** Walking is the single most accessible intervention here, and the dose-response curve is heavily front-loaded. Going from your current step count to 7,000 steps per day would move you past the steepest inflection point in the mortality data. That does not require gym time — it is a 30-minute walk added to your day. Research also shows that every additional 1,000 steps is independently associated with a 15% reduction in all-cause mortality. Within four to six weeks of consistently higher step counts, expect to see CRP begin to trend downward and HRV begin to trend upward, as the feedback loop starts working in the opposite direction. Pair this with sleep hygiene improvements (your HRV will respond to both inputs simultaneously).

**Citations:** Ding D et al. Daily steps and health outcomes in adults: a systematic review and dose-response meta-analysis. *Lancet Public Health*. 2025. DOI: 10.1016/S2468-2667(25)00164-1 (57 studies, 35 cohorts; 7,000 steps = 47% lower all-cause mortality, 25% lower CVD incidence vs 2,000 steps). Paluch AE et al. Daily steps and all-cause mortality: a meta-analysis of 15 international cohorts. *Lancet Public Health*. 2022;7(3):e219-e228. PMCID: PMC9289978 (47,471 adults; plateau at 6,000 to 8,000 steps for age 60+, 8,000 to 10,000 for under 60). Banach M et al. The association between daily step count and all-cause and cardiovascular mortality. *Eur J Prev Cardiol*. 2023. (226,889 participants; each 1,000-step increase = 15% lower all-cause mortality). Irwin MR. Sleep and inflammation: partners in sickness and in health. *Nat Rev Immunol*. 2019 (bidirectional CRP and vagal tone relationship).

---

### Rule 31B: Active Step Count × Low Inflammation × Strong HRV — Cardiometabolic Resilience
**Panels:** Wearable (steps) × Blood (hsCRP) × Wearable (HRV)
**Firing:** Daily step average > 7,000 AND hs-CRP < 1.0 mg/L AND HRV RMSSD > 60th percentile for age/sex
**Priority:** 2

**Connection line:** Your daily movement, inflammation, and autonomic recovery are all in a strong place — this is the combination most consistently linked to lower long-term risk.

**Expanded:** Consistently walking more than 7,000 steps per day puts you past the inflection point where the largest mortality reductions occur in the step count research. Combined with CRP below 1.0 mg/L (well within the low-risk range for PhenoAge) and HRV in the upper range for your age and sex, this is the cardiometabolic profile that prospective studies associate with the lowest all-cause and cardiovascular mortality. The biological story is straightforward: regular movement stimulates nitric oxide production, improves endothelial function, and helps keep systemic inflammation low. Low CRP means your immune system is not fighting a chronic background battle. High HRV means your parasympathetic nervous system is efficiently regulating your heart rhythm — a direct reflection of autonomic health. These three factors reinforce each other in a positive feedback loop, the same way they reinforce each other negatively when they are all off.

**Action:** This combination is working. Protect it. Maintain your daily walking habit and sleep consistency — both are feeding this result. Retest in 6 months to confirm the trend holds.

**Citations:** Ding D et al. *Lancet Public Health*. 2025 (7,000 steps = inflection point for all-cause mortality, CVD, dementia). Paluch AE et al. *Lancet Public Health*. 2022 (dose-response plateau confirmation across 15 cohorts). Azulay N et al. Sci Rep. 2022. PMID: 35835836 (high HRV associated with lower metabolic syndrome burden).

---

### Rule 32A: Low Neisseria × Elevated hsCRP × Low RMSSD — Oral to Autonomic Inflammatory Cascade
**Panels:** Oral (Neisseria abundance) × Blood (hsCRP) × Wearable (HRV)
**Firing:** Neisseria relative abundance < 10th percentile AND hs-CRP > 2.0 mg/L AND HRV RMSSD < 35th percentile for age/sex
**Priority:** 1

**Connection line:** The bacteria that produce nitric oxide in your mouth are depleted, your inflammation is elevated, and your autonomic nervous system is feeling both — this is the specific chain our three panels were designed to catch.

**Expanded:** This is the core connection that makes Oravi different from a blood test, a wearable, or an oral microbiome test alone.

Neisseria species on your tongue are the primary converters of dietary nitrate into nitrite, which your body then uses to produce nitric oxide. Nitric oxide does two things simultaneously: it relaxes blood vessels (lowering blood pressure and reducing vascular inflammation) and it modulates parasympathetic tone at the heart (increasing HRV). When Neisseria abundance drops below the 10th percentile, this pathway is functionally impaired. Nitrate supplementation studies have shown that Neisseria abundance directly correlates with plasma nitrite levels — meaning less Neisseria translates to less systemic nitric oxide, not theoretically but measurably.

The downstream effects are visible in your other two panels. Reduced nitric oxide availability contributes to vascular stiffness and endothelial dysfunction, which promotes systemic inflammation — your elevated CRP reflects this. At the same time, reduced nitric oxide at the sinoatrial node impairs parasympathetic signaling, which lowers HRV — your wearable is picking that up in your RMSSD readings. A seven day chlorhexidine mouthwash trial demonstrated this exact chain: oral nitrite dropped 90%, plasma nitrite dropped 25%, and systolic blood pressure rose 2 to 3 mmHg within one week. The autonomic consequences of sustained nitric oxide depletion extend further — reduced baroreflex sensitivity, impaired cardiac vagal control, and a nervous system that stays in a sympathetically dominant state.

This is not three separate problems. It is one upstream disruption (oral nitric oxide pathway) producing two downstream signals (inflammation and autonomic stress) that your blood panel and wearable are independently detecting. Large-scale prospective cohort data has established that oral microbiome composition independently associates with systemic inflammatory and cardiovascular outcomes, and the Lifelines Cohort (n=149,205) confirmed that phenotypic HRV — the kind your wearable measures — carries mortality-predictive power independent of genetics, meaning this RMSSD signal is real and actionable.

**Action:** Rebuild the nitric oxide pathway from the oral side first. Stop antiseptic mouthwash immediately if you are using one — chlorhexidine and cetylpyridinium chloride are the most disruptive. Add nitrate-rich vegetables daily (arugula, beets, spinach, celery — arugula has the highest nitrate density per serving). Consider concentrated beetroot juice (two 70ml shots daily) as a nitrate source while your oral microbiome recovers. Neisseria abundance has been shown to increase by 351% within ten days of nitrate supplementation, so this pathway can shift meaningfully within two to four weeks. As the oral pathway recovers, expect CRP to begin trending downward and HRV to begin trending upward on subsequent retests. These are not three separate fixes — they are one intervention (restoring oral nitric oxide production) with three measurable outcomes across your panels.

**Citations:** Vanhatalo A et al. Nitrate-responsive oral microbiome modulates nitric oxide homeostasis and blood pressure in humans. *Free Radic Biol Med*. 2018;124:160-169. PMCID: PMC6191927 (10-day nitrate supplementation: Neisseria +351%, Rothia +127%, Prevotella −60%; Neisseria/Rothia abundance correlated with plasma nitrite increase). Kapil V et al. Physiological role for nitrate-reducing oral bacteria in blood pressure control. *Free Radic Biol Med*. 2013;55:93-100. PMID: 23201780 (7-day chlorhexidine: salivary nitrite −90%, plasma nitrite −25%, systolic BP +2.3 mmHg). Tegegne BS et al. Phenotypic but not genetically predicted heart rate variability associated with all-cause mortality. *Commun Biol*. 2023;6:1013. DOI: 10.1038/s42003-023-05376-y (n=46,075; phenotypic RMSSD predicts mortality, genetically predicted HRV does not). Tegegne BS et al. Determinants of heart rate variability in the general population: the Lifelines Cohort Study. *Heart Rhythm*. 2018;15(10):1552-1558. PMID: 29753022 (n=149,205; age/sex explain ~18% of RMSSD variance). Joshipura KJ et al. Over-the-counter mouthwash use and risk of pre-diabetes/diabetes. *Nitric Oxide*. 2017;71:14-20. PMID: 29129765 (n=945; frequent antiseptic mouthwash use associated with 55% increased risk of pre-diabetes/diabetes via NO pathway disruption, confirming oral microbiome composition modulates systemic metabolic and inflammatory markers). Adibi S et al. A conceptual digital health framework for longevity optimization. PMCID: PMC12844810. 2026 (RMSSD as indirect inflammation indicator; r = −0.43 with hsCRP, p < 0.01).

---

### Rule 32B: Healthy Neisseria × Low hsCRP × Strong RMSSD — Oral to Autonomic Favorable Pathway
**Panels:** Oral (Neisseria abundance) × Blood (hsCRP) × Wearable (HRV)
**Firing:** Neisseria relative abundance > 40th percentile AND hs-CRP < 1.0 mg/L AND HRV RMSSD > 60th percentile for age/sex
**Priority:** 2

**Connection line:** The nitric oxide pathway from your mouth to your heart is functioning well, and both your inflammation and autonomic recovery confirm it.

**Expanded:** This is the favorable version of the same biological chain. Your oral panel shows healthy Neisseria abundance, which means the bacteria responsible for converting dietary nitrate into nitrite are present and active. Your blood panel confirms low systemic inflammation (CRP well under 1.0 mg/L), consistent with adequate nitric oxide availability keeping your vascular system relaxed and endothelial function intact. And your wearable shows strong heart rate variability for your age and sex, which reflects effective parasympathetic modulation — the autonomic signature of a system with sufficient nitric oxide tone.

This is the pattern the three-panel system was built to identify. No single test — oral, blood, or wearable — could confirm this pathway is working. It takes all three reading in the same direction to say it with confidence.

**Action:** This is working. Maintain your current diet (especially nitrate-rich vegetables), oral hygiene routine, and sleep habits. Avoid antiseptic mouthwash, which is the single fastest way to disrupt this pathway. Retest in 6 months to confirm the pattern holds longitudinally.

**Citations:** Vanhatalo A et al. *Free Radic Biol Med*. 2018. PMCID: PMC6191927 (Neisseria/Rothia abundance directly correlates with plasma nitrite levels). Kapil V et al. *Free Radic Biol Med*. 2013. PMID: 23201780 (oral bacteria essential for systemic NO production, confirmed via mouthwash ablation). Tegegne BS et al. *Commun Biol*. 2023. DOI: 10.1038/s42003-023-05376-y (phenotypic HRV mortality prediction). Adibi S et al. PMCID: PMC12844810. 2026 (HRV-hsCRP inverse correlation framework).

---

# SECTION 3: Updated Future Rules Table

Expanding the existing future rules table with new candidates from the Viome competitive analysis and oral diversity research. Items with an asterisk (*) are new in v1.3.

| Rule | Panels | Trigger | Evidence Status | Notes |
|---|---|---|---|---|
| Oral → Colorectal cancer risk | Oral × Demographics | Fusobacterium > 90th pct + age over 45 | Moderate-Strong — Vogtmann 2025 (Cancer, 3,179 CRC cases) prospective; Queen 2025 confirms Fna C2 in tumors; Rule 28C (age 45+) now active | Rule 28C covers surface-level signal; future: clade-specific Fna C2 detection would strengthen specificity |
| Oral → Pancreatic cancer signal | Oral × Blood | Porphyromonas gingivalis elevated + specific blood pattern | Moderate — Meng 2025 (JAMA Oncol, 445 cases): 27-species microbial risk score OR 3.44/SD; 8.8-year median follow-up | Upgraded from "Early" — JAMA Oncol replication strengthens case; pending further independent cohort replication |
| Oral → Preterm birth / preeclampsia risk | Oral × Demographics | Pathogen burden + pregnancy status | Moderate — Le 2022 meta-analysis (30 studies): periodontitis OR 3.18 for preeclampsia | No successful intervention RCT; flag as informational pending further data |
| Oral-gut axis inflammation | Oral × Gut (if added) | Oral pathogens colonizing gut | Moderate-Strong — Atarashi 2017 (Science): oral Klebsiella drives Th1 colitis; Kageyama 2023: 72.9% adults share oral-gut ASVs | Strongest when gut panel is added |
| Iron/Ferritin → Oral bleeding | Blood × Oral | Low ferritin + Tier 1 pathogen burden elevated | Moderate-Strong — Han 2024 (J Dent Sci, n=79+79): ferritin elevated in periodontitis, normalized post-NSPT | Ready for promotion to active rule pending hepcidin pathway framing decision |
| Testosterone → Oral health | Blood × Oral | Low testosterone + periodontal burden | Emerging | Unchanged; relates to Rule 19C (deep sleep × testosterone) |
| Lp(a) → Systemic inflammation cascade | Blood × Oral × Wearable | Lp(a) > 50 + CRP > 3 + oral pathogens | Proposed — strong mechanistic basis | Unchanged |
| Oral diversity → Long COVID recovery | Oral × Lifestyle | Low diversity + recent illness | Emerging 2023–2025 | Unchanged |
| Sleep → Oral circadian rhythm | Wearable × Oral | Irregular sleep + oral dysbiosis | Deferred; Rule 4A covers surface, Rule 29B expands | v1.3 expansion in Rule 29B |
| VO2 max × Oral NO pathway | Fitness × Oral | VO2 low + Neisseria depleted | Strengthened — Stahl 2025 (ONRC/VO2 rho=0.81); pending wearable API access for VO2max | Updated with Stahl 2025 in v1.2 |
| Menstrual cycle × Oral pathogens | Demographics × Oral | Luteal phase + pathogen elevation | Emerging — relevant for female users | Unchanged |
| Oral diversity → All-cause mortality (standalone rule) | Oral × Demographics | Low Shannon diversity + age over 50 | Moderate — Vogtmann 2025 (JID, n=7,721): Shannon HR 0.85/SD; Yang 2024 (n=8,224): Q4 HR 0.58 | Rule 24A now covers this at population level; age-gated standalone rule for 50+ as elevated-stakes version deferred pending single-dataset concern resolution |
| OSA oral signature → CVD | Oral × Wearable × Blood | OSA oral taxa + sleep fragmentation + CVD markers | Weak-Preliminary — Chen 2022 distinct signatures; not yet independent of AHI | Unchanged — hold until oral signature independence from AHI demonstrated |
| Oral × Diabetes complications (retinopathy) | Oral × Blood | Pathogen burden + HbA1c + duration | Moderate for retinopathy — Park 2022 (n=11,353): periodontitis aHR 1.21 for retinopathy | Relevant for established diabetics; gates on HbA1c > 6.5% and known diabetes status from demographics |
| *TMA/TMAO pathway connection | Blood × Oral (future: + Gut) | Oral DNRA organisms + elevated lipids/glucose | Proposed — requires TMAO blood assay not in standard CBC/CMP | Viome's strongest metabolic differentiation; Oravi cannot measure without adding TMAO to blood panel |
| *Oral mucin degradation → Leaky gums score | Oral (RNA-level) | Mucin-degrading pathway activity elevated | Not measurable with 16S — requires RNA sequencing (metatranscriptomics) | Viome's specific advantage; Oravi's Rule 23A approximates with species-level proxy |
| *Glycemic response prediction | Oral × Wearable × Food log | DNRA organisms + glucose variability + dietary data | Not measurable without CGM + food log integration | Viome has this; Oravi would need CGM API + food logging feature |
| *Custom supplement formulation | All panels | Multi-panel deficiency pattern | Viome's product moat; requires supplement manufacturing partner | Strategic decision: Oravi can recommend supplement categories (e.g., nitrate, magnesium) without formulation partnership |
| *Atopy/allergy + oral diversity | Oral × Lifestyle/Demographics | Low diversity + atopic history | Weak-Preliminary — Lee 2025 (JACIG, n=453): reduced oral diversity in atopy/rhinitis | Single cross-sectional study; needs prospective replication before consumer-facing rule |
| *Hepcidin pathway — Oral × Iron | Oral × Blood | Tier 1 pathogen > 80th pct + ferritin elevated + serum iron low | Moderate-Strong — Han 2024 (J Dent Sci, n=79+79): hepcidin elevated in periodontitis, normalized post-NSPT; iron sequestration confirmed | Ready for promotion; needs iron (serum) and ferritin added to standard blood panel as Oravi markers |
| *NLR elevated × Age (40+) | Blood × Demographics | NLR > 3.0 + age > 40 + OMA weak | Moderate — Leucuța 2022 meta-analysis: NLR elevated in periodontitis; NLR > 3.0 independently predicts cardiovascular risk | Requires CBC differential; currently gated by Rule 27C which includes oral panel |
| *Oral bacteria → Depression signal | Oral × Wearable × Lifestyle | Low Neisseria + elevated Prevotella + poor sleep + mood flag | Emerging-Moderate — Malan-Müller 2024 (Transl Psychiatry, n=470): Neisseria elongata lower in anxiety; Prevotella higher in depression | Lifestyle questionnaire (mood flag) required; Phase 3 candidate |

---

# SECTION 4: Updated Summary Table — All Rules (v1.2 + v1.3)

Rules added in v1.3 are marked in **bold**.

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
| 8D | Wearable trend × Oral trend | Favorable | HRV and oral health both improving |
| 9A | Oral × Demographics | Unfavorable | Oral bacteria and long-term brain health |
| 9B | Oral × Wearable (HRV) | Unfavorable | Oral inflammation affecting nervous system recovery |
| 10A | Oral × Blood (autoimmune) | Unfavorable | Oral bacteria connected to joint inflammation |
| 11A | Oral (breath × pathogen) | Unfavorable | Breath bacteria linked to broader dysbiosis |
| 12A | Oral × Blood (HbA1c) | Unfavorable | Cavity bacteria and blood sugar influencing each other |
| 12B | Oral × Blood (glucose) | Unfavorable | Bacteria blocking metabolic benefit of vegetables |
| 13A | Oral × Wearable (sleep) | Unfavorable | Oral bacteria associated with sleep-disordered breathing |
| 13B | Lifestyle × Wearable (REM) | Unfavorable | Nasal history affecting sleep architecture (Phase 2) |
| 14A | Lifestyle × Oral × Blood | Unfavorable | Daily habit contributing to multiple panel findings (Phase 2) |
| 15A | Blood × Wearable | Unfavorable | Blood age older than expected, sleep contributing |
| 15B | Blood × Oral | Favorable | Oral health contributing to younger blood age |
| 16A | Blood × Oral | Unfavorable | Low vitamin D reducing oral immune defense |
| 16B | Blood × Wearable | Unfavorable | Low vitamin D associated with poor deep sleep |
| 17A | Oral × Blood × Wearable | Unfavorable | Triple cardiovascular convergence |
| 18A | Wearable × Blood (HbA1c) | Unfavorable | Heart rate and blood sugar same autonomic root |
| 18B | Wearable × Blood (HbA1c) | Unfavorable | Low HRV and blood sugar reflecting autonomic imbalance |
| 18C | Wearable × Blood (CRP) | Unfavorable | Heart rate and inflammation feeding each other |
| 19A | Wearable × Blood (WBC) | Unfavorable | Short sleep driving immune cells into overdrive |
| 19B | Wearable × Blood (glucose) | Unfavorable | Irregular sleep affecting blood sugar control |
| 19C | Wearable × Blood (testosterone) | Unfavorable | Low deep sleep and low testosterone connected |
| 20A | Oral × Blood (creatinine) | Unfavorable | Oral pathogens connected to kidney function |
| 20B | Oral × Blood (creatinine) | Favorable | Oral health helping protect kidney function |
| 21A | Blood × Oral (RDW) | Unfavorable | RDW and oral infection sharing inflammatory driver |
| 22A | Blood × Oral (WBC) | Unfavorable | WBC elevated partly from oral infection |
| 22B | Blood × Oral × Wearable | Favorable | Immune balance healthy from oral and sleep |
| **23A** | **Oral × Blood (CRP + WBC triple)** | **Unfavorable** | **Oral barrier disruption driving immune activation and inflammation** |
| **23B** | **Oral × Blood × Wearable** | **Unfavorable** | **Oral, blood inflammation, and HRV all flagging same source** |
| **24A** | **Oral × Blood (CRP)** | **Unfavorable** | **Low oral diversity showing up in inflammation** |
| **24B** | **Oral (internal — diversity × pathogen)** | **Unfavorable** | **Low diversity enabling pathogen dominance** |
| **24C** | **Oral × Blood (CRP)** | **Favorable** | **Rich oral ecosystem supporting low inflammation** |
| **25A** | **Oral × Blood × Wearable (metabolic triple)** | **Unfavorable** | **Metabolic pressure from three independent directions** |
| **25B** | **Oral × Blood (glucose + LDL)** | **Unfavorable** | **Oral bacteria amplifying blood sugar and cholesterol challenge** |
| **25C** | **Blood × Wearable × Oral** | **Favorable** | **Metabolic resilience — blood sugar, heart rate, oral all strong** |
| **26A** | **Oral × Blood × Wearable (inflammaging)** | **Unfavorable** | **Inflammation converging from three directions** |
| **26B** | **Oral × Wearable (early inflammaging)** | **Unfavorable** | **Oral and sleep feeding early-stage inflammation** |
| **26C** | **Oral × Blood × Wearable** | **Favorable** | **Full inflammaging all-clear — all inputs low** |
| **27A** | **Blood × Oral × Wearable (immune triple)** | **Unfavorable** | **Immune overload from three simultaneous sources** |
| **27B** | **Blood × Oral × Wearable** | **Favorable** | **Immune system in balanced, resilient state** |
| **27C** | **Blood × Oral (NLR)** | **Unfavorable** | **Immune response skewed toward acute inflammation** |
| **28A** | **Oral × Blood (LDL)** | **Unfavorable** | **Arterial-plaque-associated bacteria elevated with high LDL** |
| **28B** | **Oral × Blood × Wearable** | **Unfavorable** | **Fusobacterium, CRP, and RHR converging on cardiovascular risk** |
| **28C** | **Oral × Demographics (age 45+)** | **Unfavorable** | **Age-flagged Fusobacterium elevation — long-term risk signal** |
| **29A** | **Wearable × Blood (WBC)** | **Unfavorable** | **Low deep sleep contributing to elevated white blood cells** |
| **29B** | **Wearable × Blood (NLR)** | **Unfavorable** | **Irregular sleep skewing immune balance** |
| **29C** | **Wearable × Blood (CRP)** | **Exploratory** | **Reduced REM and inflammation — watching the connection** |
| **30A** | **Oral × Blood × Wearable (full favorable)** | **Favorable** | **All-panel favorable alignment — oral, blood, sleep** |
| **30B** | **Oral × Blood (favorable)** | **Favorable** | **Diverse oral ecosystem and younger blood age** |
| **30C** | **Wearable × Blood (favorable)** | **Favorable** | **Recovery and inflammation both in strong alignment** |
| **31A** | **Wearable (steps) × Blood (CRP) × Wearable (HRV)** | **Unfavorable** | **Low steps, elevated inflammation, and stressed autonomic system reinforcing each other** |
| **31B** | **Wearable (steps) × Blood (CRP) × Wearable (HRV)** | **Favorable** | **Active movement, low inflammation, and strong recovery in alignment** |
| **32A** | **Oral (Neisseria) × Blood (CRP) × Wearable (HRV)** | **Unfavorable** | **Depleted NO bacteria + elevated inflammation + stressed autonomic tone — the full oral-to-heart cascade** |
| **32B** | **Oral (Neisseria) × Blood (CRP) × Wearable (HRV)** | **Favorable** | **NO pathway intact, inflammation low, autonomic recovery strong — the chain is working** |

**Total: 73 rules (41 unfavorable, 21 favorable, 3 exploratory, 5 trend-based, 2 Phase 2 pending, 1 internal)**

*v1.3 adds: 27 new rules across 10 rule groups (Rules 23 through 32). Net gain: 17 unfavorable, 9 favorable, 1 exploratory.*

---

## v1.3 Changelog

| Change | Details |
|---|---|
| **New Rule 23A** | Oral barrier disruption composite: Tier 1 pathogen > 85th pct + hs-CRP > 3.0 + WBC > 9.0 = "leaky gums" systemic entry signal |
| **New Rule 23B** | Oral barrier + HRV/RHR: adds wearable dimension to oral-barrier signal |
| **New Rule 24A** | Low Shannon diversity + elevated CRP: oral diversity as independent inflammatory signal |
| **New Rule 24B** | Low Shannon diversity + elevated pathogens: internal diversity-pathogen connection |
| **New Rule 24C** | High Shannon diversity + low CRP: favorable oral diversity signal |
| **New Rule 25A** | Metabolic triple convergence: blood glucose/HbA1c + RHR/HRV + oral DNRA/S. mutans |
| **New Rule 25B** | Metabolic dual: HbA1c + LDL + oral NO pathway disruption |
| **New Rule 25C** | Metabolic resilience favorable: blood sugar + heart rate + oral all strong |
| **New Rule 26A** | InflammAging triple: CRP + oral pathogens + sleep disruption + RHR |
| **New Rule 26B** | InflammAging early signal: oral + sleep only, CRP in intermediate range |
| **New Rule 26C** | InflammAging all-clear favorable: all inflammation inputs low |
| **New Rule 27A** | Immune overload triple: WBC + oral pathogens + short sleep |
| **New Rule 27B** | Immune balance favorable triple: WBC normal + pathogens low + sleep adequate + regular |
| **New Rule 27C** | NLR elevated + oral pathogens: neutrophil dominance from oral infection burden; requires CBC differential |
| **New Rule 28A** | Fusobacterium + LDL: arterial-plaque-associated bacteria with elevated cholesterol |
| **New Rule 28B** | Fusobacterium + CRP + RHR: three-panel cardiovascular convergence with specific pathogen |
| **New Rule 28C** | Fusobacterium age-flagged: surfaces CRC risk context for users 45+ |
| **New Rule 29A** | Deep sleep + WBC: low N3 sleep contributing to elevated immune activation |
| **New Rule 29B** | Sleep regularity + NLR: irregular sleep skewing neutrophil-lymphocyte balance; requires CBC differential |
| **New Rule 29C** | REM + CRP: exploratory — bidirectional relationship, wearable uncertainty noted |
| **New Rule 30A** | Full-panel all-clear: OMA + CRP + pathogens + sleep — all favorable |
| **New Rule 30B** | Oral + blood favorable: diversity + PhenoAge younger + low CRP |
| **New Rule 30C** | Wearable + blood favorable: HRV + sleep + CRP all strong |
| **New Rule 31A** | Step count sedentary convergence: daily steps < 5,000 + hs-CRP > 2.0 + RMSSD < 35th pct = compounding cardiometabolic risk |
| **New Rule 31B** | Step count favorable: daily steps > 7,000 + hs-CRP < 1.0 + RMSSD > 60th pct = cardiometabolic resilience |
| **Step count added as wearable input** | Rules 31A, 31B use daily step average from WHOOP/Oura; confirm field mapping in wearable API |
| **New Rule 32A** | Oral-to-autonomic inflammatory cascade: Neisseria < 10th pct + hsCRP > 2.0 + RMSSD < 35th pct = full three-panel chain confirming NO pathway disruption with downstream inflammation and autonomic stress |
| **New Rule 32B** | Oral-to-autonomic favorable: Neisseria > 40th pct + hsCRP < 1.0 + RMSSD > 60th pct = NO pathway intact, all three panels confirm |
| **Rule 32 integrates all three collaborator lines** | Cites Vanhatalo 2018 (Neisseria → plasma nitrite), Kapil 2013 (mouthwash ablation), Tegegne 2023 (phenotypic HRV mortality), Tegegne 2018 (Lifelines population norms), Joshipura 2017 (mouthwash → metabolic disruption, n=945), and Adibi 2026 (RMSSD-CRP correlation framework) |
| **Future rules table expanded** | New entries: TMA/TMAO pathway, oral mucin degradation (RNA-level), glycemic response prediction, custom supplements, atopy/allergy + oral diversity, hepcidin/iron pathway, NLR × age, oral bacteria × depression signal |
| **Competitive context added** | Section 1: Viome vs Oravi competitive map — defines what Oravi can address with existing panels vs. structural gaps requiring new infrastructure |
| **NLR added as required biomarker** | Rules 27C, 29B require neutrophil-to-lymphocyte ratio from CBC differential. This should be a standard output if not already. |
| **Favorable rule count** | Increased from 12 (v1.2) to 21 (v1.3). Ratio of favorable to unfavorable: 12:28 → 21:41 (ratio improved from 1:2.3 to 1:2.0) |

---

## Rules Requiring New Data Fields (v1.3)

| New Data Needed | Rules Affected | Notes |
|---|---|---|
| Shannon diversity index from oral 16S | 24A, 24B, 24C, 30B | Should be derivable from existing Zymo 16S sequencing; confirm pipeline outputs this |
| Neutrophil-to-lymphocyte ratio (NLR) | 27C, 29B | Requires CBC differential; confirm if CBC panel includes differential WBC |
| Deep sleep (N3) in minutes | 29A, (existing 16B, 19C) | Already available from WHOOP/Oura; confirm field mapping |
| Daily step count average | 31A, 31B | Available from WHOOP/Oura; confirm 7-day or 14-day rolling average output |
| Fusobacterium at species level | 28A, 28B, 28C | Available from 16S; confirm it appears as named species in output, not collapsed to genus |
| Fasting ferritin + serum iron | Future Rule (hepcidin pathway) | Not currently in standard Oravi blood panel; flag as Phase 2 addition |

---

## Notes on "Humanized" Copy Principles Applied in v1.3

1. No hyphenated compound adjectives where avoidable — "low-grade inflammation" → "ongoing inflammation" or "chronic inflammation running at a low level"
2. No Latin species names in connection lines or expanded copy — "Fusobacterium" in connection lines is replaced with "bacteria found in arterial plaques" or similar; species appear only in firing conditions and citations
3. Every connection line written as something a smart, informed friend would say, not a clinical finding
4. No "we detected elevated X" — always "your panel shows" or "your results show"
5. Action nudge ends every rule — never a finding without a next step
6. Exploratory rules (Priority 3) explicitly use "we are watching" or "emerging science" language
7. Favorable rules use present-tense reinforcement: "is working," "is contributing," "is protecting" — not past or conditional framing

---

*End of INSIGHTS v1.3 Draft*

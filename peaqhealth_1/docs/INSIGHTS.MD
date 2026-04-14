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

## RULE 1: Oral Nitrate Pathway × Cardiovascular Risk

**Biological basis:** Neisseria, Rothia, and Haemophilus species reduce dietary nitrate to nitrite in saliva. Nitrite converts to nitric oxide (NO), which relaxes blood vessels, lowers blood pressure, and enhances endothelial function. When these bacteria are depleted, the entire pathway shuts down. (Kapil 2013, Vanhatalo 2018, Goh 2022)

---

### Rule 1A: Neisseria Depleted + LDL Elevated
**Panels:** Oral × Blood  
**Firing:** Neisseria < 5th pct AND LDL > 130 mg/dL  
**Priority:** 1

**Connection line:** Your oral bacteria may be making this harder to manage.

**Expanded:** The bacteria that help produce nitric oxide in your body are running low. Nitric oxide keeps blood vessels flexible and helps manage cholesterol transport. When this pathway weakens, LDL particles have a harder time being cleared efficiently. This is one of the connections only Peaq can see — your oral panel and blood panel are telling the same story.

**Action:** Check if you are using antiseptic mouthwash daily. That alone can wipe out the bacteria driving this connection.

---

### Rule 1B: Neisseria Depleted + hs-CRP Elevated
**Panels:** Oral × Blood  
**Firing:** Neisseria < 5th pct AND hs-CRP > 3.0 mg/L  
**Priority:** 1

**Connection line:** Your oral microbiome and inflammation markers are connected here.

**Expanded:** The bacteria responsible for nitric oxide production are depleted. At the same time, your inflammation marker is elevated. These are not two separate problems — they share a biological pathway. When nitric oxide drops, blood vessels stiffen, blood pressure rises, and systemic inflammation increases. Your CRP is reflecting what your oral panel is already showing.

**Action:** The oral side is the most actionable. Removing antiseptic mouthwash, adding nitrate-rich vegetables, and considering a hydroxyapatite rinse can start rebuilding these bacteria within weeks.

---

### Rule 1C: Neisseria Healthy + CRP Low
**Panels:** Oral × Blood  
**Firing:** Neisseria > 10th pct AND hs-CRP < 1.0 mg/L  
**Priority:** 2

**Connection line:** Your oral health and inflammation levels are working together.

**Expanded:** The bacteria that produce nitric oxide are present in healthy numbers, and your systemic inflammation is low. When these two panels align, it is a strong signal of cardiovascular resilience.

**Action:** Maintain your current oral care routine. Retest in 6 months to confirm stability.

---

### Rule 1D: Neisseria Depleted + RHR Elevated
**Panels:** Oral × Wearable  
**Firing:** Neisseria < 5th pct AND RHR > expected + 8 bpm  
**Priority:** 1

**Connection line:** Your resting heart rate may be connected to what is happening in your mouth.

**Expanded:** Nitric oxide helps blood vessels relax. When the bacteria that produce it are depleted, the heart works harder to push blood through stiffer vessels — which shows up as a higher resting heart rate. Most people think resting heart rate is purely a fitness metric. It is. But it is also downstream of your oral microbiome through the nitric oxide pathway.

**Action:** Two fronts: rebuild the oral bacteria (stop antiseptic mouthwash, eat more leafy greens and beets) and support cardiovascular fitness (consistent zone 2 exercise). These work on the same problem from two directions.

---

### Rule 1E: Neisseria Depleted + HbA1c Elevated
**Panels:** Oral × Blood  
**Firing:** Neisseria < 5th pct AND HbA1c > 5.6%  
**Priority:** 1

**Connection line:** Your oral bacteria and blood sugar control may be influencing each other.

**Expanded:** Research found that people with higher levels of nitrate-reducing oral bacteria had better insulin sensitivity. When these bacteria decline, nitric oxide production falls — and NO plays a direct role in how the body handles glucose. A large study also found that people using antiseptic mouthwash twice daily had a 55% higher risk of developing prediabetes, likely through this exact pathway.

**Action:** The oral microbiome is the most overlooked factor in metabolic health. Rebuilding nitrate-reducing bacteria through diet and mouthwash changes may support the same glucose pathways your doctor is watching.

---

## RULE 2: Oral Pathogens × Systemic Inflammation

**Biological basis:** Periodontal pathogens (Porphyromonas, Fusobacterium, Tannerella) drive chronic low-grade inflammation through bacterial translocation and immune activation. CRP is both a consequence of oral dysbiosis and a predictor of mortality. (De Souza 2017, npj Biofilms Microbiomes 2026)

---

### Rule 2A: Porphyromonas Elevated + hs-CRP Elevated
**Panels:** Oral × Blood  
**Firing:** Porphyromonas > 90th pct AND hs-CRP > 3.0 mg/L  
**Priority:** 1

**Connection line:** The bacteria linked to gum disease may be driving your inflammation higher.

**Expanded:** Porphyromonas is one of the primary bacteria behind chronic gum inflammation. When elevated, it does not just affect your mouth — it triggers an immune response that raises inflammation throughout your body. CRP is a direct measure of that systemic inflammation. This is a connection your doctor cannot see from blood work alone, and your dentist cannot see from a cleaning. Peaq sees both sides.

**Action:** Schedule a periodontal evaluation with your dentist and mention that your oral microbiome test showed elevated pathogen levels. Consistent flossing, interdental cleaning, and avoiding alcohol-based mouthwash matter more than any supplement here.

---

### Rule 2B: Porphyromonas Elevated + HRV Low
**Panels:** Oral × Wearable  
**Firing:** Porphyromonas > 90th pct AND RMSSD < 25th pct for age/sex  
**Priority:** 1

**Connection line:** This recovery metric is linked to what we found in your oral panel.

**Expanded:** When inflammatory bacteria are elevated in your mouth, the immune system stays in a low-grade alert state. That chronic activation suppresses the parasympathetic nervous system — the "rest and recover" side — which shows up as lower heart rate variability. HRV is one of the strongest real-time signals of recovery. Right now, your oral health may be holding it back.

**Action:** Addressing oral pathogens is the upstream fix. Once periodontal bacteria are managed, HRV often improves within weeks — even without changing exercise or sleep routine.

---

### Rule 2C: Pathogen Load Low + hs-CRP Low
**Panels:** Oral × Blood  
**Firing:** Tier 1 pathogen abundance < 30th pct AND hs-CRP < 1.0 mg/L  
**Priority:** 2

**Connection line:** Your oral health is contributing to low inflammation throughout your body.

**Expanded:** Pathogen levels in your mouth are well controlled, and your systemic inflammation reflects it. Managing oral bacteria is one of the most effective ways to keep whole-body inflammation low — and your profile shows this working.

**Action:** Protect this. Continue your oral care routine and retest in 6 months.

---

## RULE 3: Sleep Quality × Systemic Inflammation

**Biological basis:** Poor sleep drives systemic inflammation through NF-κB activation. Sleep restriction elevates CRP, IL-6, and TNF-alpha within days. CRP is a PhenoAge input — poor sleep literally ages your blood panel. (Irwin 2019, Meier-Ewert 2004, Adibi 2026)

---

### Rule 3A: Poor Sleep + hs-CRP Elevated
**Panels:** Wearable × Blood  
**Firing:** Sleep duration < 6h (30-night avg) OR sleep regularity SD > 45 min AND hs-CRP > 3.0 mg/L  
**Priority:** 1

**Connection line:** Inflammation and irregular sleep are compounding each other in your profile.

**Expanded:** When you consistently sleep less than six hours, or your sleep schedule is highly variable, your body's inflammatory response ramps up. CRP — one of the nine markers in your blood age — is directly affected. A controlled study showed that just 10 days of restricted sleep elevated CRP in otherwise healthy people. Your sleep pattern is not just affecting how you feel — it is actively aging your blood panel.

**Action:** Sleep consistency matters as much as duration. Anchor your bedtime within a 30-minute window for two weeks. Regularity alone reduces inflammation even without sleeping longer.

---

### Rule 3B: Good Sleep + hs-CRP Low
**Panels:** Wearable × Blood  
**Firing:** Sleep 7–8h avg AND SD < 30 min AND hs-CRP < 1.0 mg/L  
**Priority:** 2

**Connection line:** Your sleep pattern is helping keep inflammation in check.

**Expanded:** Consistent, adequate sleep is one of the strongest natural anti-inflammatory signals your body has. Your sleep data and CRP are both in favorable ranges — this means your sleep is actively contributing to a younger blood age.

**Action:** Protect your sleep schedule. It is doing more for your longevity than most supplements could.

---

### Rule 3C: Poor Sleep + RHR Elevated
**Panels:** Wearable × Wearable  
**Firing:** Sleep < 6h OR SD > 45 min AND RHR > expected + 8 bpm  
**Priority:** 1

**Connection line:** Your sleep and heart rate are both signaling the same thing.

**Expanded:** Chronic sleep debt raises resting heart rate by keeping your sympathetic nervous system running hotter than it should. This is not a coincidence — your body is in a sustained stress state, and both metrics reflect it.

**Action:** When sleep normalizes, resting heart rate typically drops within one to two weeks. Start by setting a consistent bedtime, even on weekends.

---

## RULE 4: Oral Nitrate Pathway × Sleep/Recovery

**Biological basis:** Nitric oxide influences vascular tone during sleep. Depleted nitrate reducers impair nocturnal vascular relaxation and recovery. Connection line is informational — not scored in formula. (Exploratory — deferred from V5 cross-panel scoring)

---

### Rule 4A: Neisseria Depleted + Poor Sleep Efficiency
**Panels:** Oral × Wearable  
**Firing:** Neisseria < 5th pct AND sleep efficiency < 80% (30-night avg)  
**Priority:** 3

**Connection line:** We are watching a possible connection between your oral bacteria and sleep quality.

**Expanded:** Nitric oxide helps blood vessels relax, which is especially important during deep sleep when your body does its heaviest repair work. Your nitrate-reducing bacteria are low, and your sleep efficiency suggests your body may not be getting the recovery it needs. This connection is still emerging in the research — Peaq is tracking it because we can see both signals simultaneously. No other platform has this view.

**Action:** Focus on the oral side first — it is more actionable. Stop antiseptic mouthwash, add nitrate-rich foods. If sleep efficiency improves alongside your next oral retest, that is a signal worth paying attention to.

---

## RULE 5: Oral Ecosystem × Cardiovascular Fitness

**Biological basis:** A healthy oral microbiome supports NO production, enhancing exercise performance and cardiovascular efficiency. Better oral health correlates with lower resting heart rate. (Vanhatalo 2018, Kapil pathway)

---

### Rule 5A: OMA Strong + RHR Low
**Panels:** Oral × Wearable  
**Firing:** OMA > 70th pct AND RHR < expected − 5 bpm  
**Priority:** 2

**Connection line:** Your oral health and cardiovascular fitness are reinforcing each other.

**Expanded:** A strong oral microbiome produces more nitric oxide, which supports better blood flow and more efficient heart function. Your low resting heart rate reflects cardiovascular fitness, and your oral panel suggests the NO pathway is working in your favor. This is the positive feedback loop Peaq is designed to surface.

**Action:** Maintain your routine. Retest oral in 6 months to confirm stability.

---

### Rule 5B: OMA Weak + RHR Elevated
**Panels:** Oral × Wearable  
**Firing:** OMA < 30th pct AND RHR > expected + 10 bpm  
**Priority:** 1

**Connection line:** Your oral microbiome and cardiovascular metrics may be pulling each other down.

**Expanded:** When the oral microbiome is out of balance, nitric oxide production drops. Blood vessels become stiffer, the heart works harder, and resting heart rate reflects the extra effort. This is not just about your mouth or just about your heart — both are linked through the same pathway.

**Action:** Two fronts: oral care (stop antiseptic rinses, nitrate-rich diet) and cardiovascular fitness (consistent zone 2 cardio, 150 minutes per week).

---

## RULE 6: DNRA Organisms × Nitrate Reducers (Oral Internal)

**Biological basis:** DNRA organisms (Prevotella melaninogenica, Veillonella spp.) compete against true nitrate reducers (Neisseria, Rothia) for the same substrate. When DNRA organisms dominate, dietary nitrate is shunted to a dead-end pathway — never becoming NO. P. melaninogenica abundance negatively correlated with plasma nitrite response (r = −0.57, Vanhatalo 2018).

---

### Rule 6A: DNRA High + Neisseria Low
**Panels:** Oral (internal)  
**Firing:** P. melaninogenica > 75th pct OR Veillonella > 75th pct AND Neisseria < 25th pct  
**Priority:** 1

**Connection line:** Some bacteria in your mouth are competing against the ones your body needs most.

**Expanded:** Your mouth has two types of bacteria that process nitrate from food — but they do it differently. The beneficial ones (Neisseria, Rothia) turn nitrate into nitric oxide, which protects your heart and blood vessels. The competing ones (certain Prevotella and Veillonella species) divert that nitrate into a dead-end pathway — it never becomes nitric oxide. Right now, the competing bacteria are more abundant than the beneficial ones. The nitrate from your spinach and beets is not doing what it should.

**Action:** A nitrate-rich diet combined with stopping antiseptic mouthwash can shift the balance within weeks. A 2025 study showed erythritol plus nitrate specifically increased the abundance of the bacteria you want more of.

---

## RULE 7: Cavity Risk × Overall Profile

**Biological basis:** S. mutans and S. sobrinus produce acid that demineralizes enamel. Antiseptic mouthwash kills protective competitors alongside pathogens, paradoxically allowing cariogenic species to expand.

---

### Rule 7A: Cavity Risk Elevated + Protective Bacteria Depleted
**Panels:** Oral (caries panel × OMA)  
**Firing:** S. mutans or S. sobrinus > 75th pct AND Neisseria < 10th pct  
**Priority:** 1

**Connection line:** The bacteria causing cavity risk are thriving while your protective bacteria are depleted.

**Expanded:** Antiseptic mouthwash kills bacteria indiscriminately — but not equally. The protective species that compete with cavity-causing bacteria get wiped out too. Ironically, daily mouthwash can create conditions where cavity bacteria face less competition and expand. Your profile shows exactly this pattern.

**Action:** Stop antiseptic mouthwash. Switch to a hydroxyapatite rinse (blocks bacterial adhesion without killing bacteria) and xylitol gum after meals (specifically targets cavity-causing species without disrupting the rest of the microbiome). Retest in 6 weeks.

---

## RULE 8: Trend-Based Connection Lines

These require at least two data points per panel (two blood draws, two oral tests, or 60+ days of wearable data).

---

### Rule 8A: OMA Improving + PhenoAge Improving
**Panels:** Oral trend × Blood trend  
**Firing:** OMA pct increased ≥ 10 points AND PhenoAge decreased ≥ 1.0 year  
**Priority:** 2

**Connection line:** Your oral health improved — and your blood age followed.

**Expanded:** Between your last two tests, your oral microbiome shifted toward a healthier balance, and your blood-based biological age dropped. This is the connection at the heart of what Peaq measures. When one panel improves, the others often follow.

**Action:** Whatever you changed between tests, keep doing it.

---

### Rule 8B: OMA Worsening + hs-CRP Rising
**Panels:** Oral trend × Blood trend  
**Firing:** OMA pct decreased ≥ 10 points AND hs-CRP increased ≥ 1.0 mg/L  
**Priority:** 1

**Connection line:** Your oral health declined — and your inflammation increased.

**Expanded:** Between your last two tests, the balance of bacteria in your mouth shifted away from protective species, and your inflammation marker went up. Something changed — a new mouthwash, antibiotics, a dietary shift, or increased stress. Identifying what changed is the first step.

**Action:** Review what changed in the weeks before your tests. Common culprits: new mouthwash, antibiotics, dietary changes, extended illness. Consider retesting oral in 6 weeks to see if the trend reverses.

---

### Rule 8C: Sleep Improving + RHR Dropping
**Panels:** Wearable trend × Wearable trend  
**Firing:** Sleep duration trending into 7–8h range AND RHR dropped ≥ 3 bpm over 30 days  
**Priority:** 2

**Connection line:** Better sleep is already showing up in your heart rate.

**Action:** This is momentum. Keep the sleep schedule consistent and watch for this to compound over the next month.

---

## RULE 9: Oral Pathogens × Neurological Health

**Biological basis:** P. gingivalis gingipains detected in human brain tissue in Alzheimer's patients (Dominy et al., Science Advances 2019). Treponema denticola found in trigeminal nerve pathways. Periodontal pathogen severity negatively associated with multiple measures of cognitive performance in older adults. Oral infection may occur decades before dementia manifests. (Dominy 2019, J Oral Microbiol 2015)

**Important:** This is emerging science. Surface as informational, not diagnostic. Always recommend discussing with a healthcare provider.

---

### Rule 9A: High Periodontal Pathogens + Age ≥ 45
**Panels:** Oral × Demographics  
**Firing:** Porphyromonas > 75th pct OR Fusobacterium > 75th pct AND age ≥ 45  
**Priority:** 1

**Connection line:** Research is watching a connection between these bacteria and long-term brain health.

**Expanded:** Periodontal pathogens — including the species elevated in your oral panel — have been detected in brain tissue in research studies on Alzheimer's disease. The relationship appears bidirectional: these bacteria promote neuroinflammation, while cognitive decline later impairs self-care, accelerating the cycle. Oral infection may occur decades before any neurological symptoms. This is an emerging area — Peaq surfaces it because we can see both signals simultaneously, and early action is always more effective.

**Action:** Discuss your oral microbiome findings with your dentist and your primary care physician, particularly if you have family history of neurodegenerative conditions. Addressing periodontal pathogens now is the most evidence-aligned action available.

---

### Rule 9B: High Periodontal Pathogens + Low HRV
**Panels:** Oral × Wearable (neuroinflammatory pathway)  
**Firing:** Porphyromonas > 75th pct AND RMSSD < 25th pct for age/sex  
**Priority:** 1

**Connection line:** Chronic oral inflammation may be affecting how well your nervous system recovers.

**Expanded:** When inflammatory oral bacteria are persistently elevated, the immune system stays activated. This chronic activation suppresses the vagus nerve's anti-inflammatory function — one of the pathways that both regulates HRV and protects against neuroinflammation. Low HRV and elevated oral pathogens appearing together is a pattern Peaq watches closely.

**Action:** Managing the oral pathogen burden is the upstream intervention. A periodontal evaluation, consistent flossing, and potentially L. reuteri probiotic therapy have RCT evidence for reducing Porphyromonas counts.

---

## RULE 10: Oral Pathogens × Autoimmune Markers

**Biological basis:** P. gingivalis possesses a unique enzyme (PPAD) that citrullinates host proteins, potentially triggering the anti-citrullinated protein antibodies (ACPA) that are the hallmark biomarker of rheumatoid arthritis. RA patients are 4.68× more likely to have periodontitis (meta-analysis, Tang 2017, n up to 151,569). Periodontal treatment reduces TNF-α, ESR, and disease activity scores in RA patients.

---

### Rule 10A: High Porphyromonas + Elevated CRP (RA Context)
**Panels:** Oral × Blood  
**Firing:** Porphyromonas > 90th pct AND hs-CRP > 3.0 mg/L AND lifestyle.known_conditions includes 'autoimmune' or 'joint_pain'  
**Priority:** 1

**Connection line:** The bacteria elevated in your oral panel have a known connection to joint inflammation.

**Expanded:** Porphyromonas gingivalis carries a unique enzyme that modifies proteins in a way that can trigger an immune response affecting joints. RA patients are significantly more likely to have elevated periodontal pathogens — and treating the oral infection reduces inflammatory markers that directly affect joint disease. This is a two-way relationship your rheumatologist and dentist rarely discuss together. Peaq connects both sides.

**Action:** Mention your oral microbiome findings to both your dentist and your physician. Periodontal treatment has clinical evidence for reducing systemic inflammatory markers in people with joint conditions.

---

## RULE 11: Breath Health × Social/Systemic Signal

**Biological basis:** VSC-producing bacteria (Fusobacterium, Solobacterium moorei, Peptostreptococcus) are the primary cause of halitosis but are also markers of anaerobic dysbiosis. Elevated VSC producers correlate with periodontal pathogen burden and reduced protective species. (Tonzetich 1977, Quirynen 2002)

---

### Rule 11A: Breath Health Poor + Harmful Bacteria Elevated
**Panels:** Oral (internal — breath × pathogen)  
**Firing:** VSC-producing species (Fusobacterium or Solobacterium) > 3% AND Tier 1 pathogen > 75th pct  
**Priority:** 1

**Connection line:** The bacteria affecting breath health are the same ones linked to broader oral dysbiosis.

**Expanded:** The species producing odor compounds in your mouth are also among the species linked to gum inflammation. These are not separate problems — they are different expressions of the same imbalance in your oral ecosystem. Addressing one tends to improve the other.

**Action:** The most effective intervention is rebuilding the protective species that naturally suppress anaerobic overgrowth. Stop antiseptic mouthwash, increase nitrate-rich foods, consider tongue scraping daily. These work faster on breath-related bacteria than on periodontal pathogens — you may notice improvement within one to two weeks.

---

## RULE 12: Metabolic Health × Oral Microbiome

**Biological basis:** Streptococcus mutans overgrowth correlates with poor glycemic control. Oral DNRA organisms compete for nitrate reducing capacity, impairing the NO pathway involved in insulin sensitivity. A large cohort study found antiseptic mouthwash users had 55% higher risk of prediabetes/diabetes over 3 years. (Goh 2022, Joshipura 2017)

---

### Rule 12A: Cavity Risk Elevated + HbA1c Elevated
**Panels:** Oral × Blood  
**Firing:** S. mutans > 75th pct AND HbA1c > 5.6%  
**Priority:** 1

**Connection line:** Elevated cavity bacteria and blood sugar control may be influencing each other.

**Expanded:** Streptococcus mutans — the primary cavity-associated bacterium elevated in your oral panel — thrives in high-sugar environments and produces acids that worsen the oral environment. At the same time, elevated blood sugar creates conditions that suppress protective oral bacteria and promote pathogen growth. These two findings are reinforcing each other.

**Action:** Reducing dietary sugar frequency (not just quantity) directly starves S. mutans. Xylitol specifically inhibits this species. Improving blood sugar control reduces the sugar availability in saliva that feeds cavity bacteria. Both interventions work on both problems simultaneously.

---

### Rule 12B: DNRA High + Fasting Glucose Elevated
**Panels:** Oral × Blood  
**Firing:** P. melaninogenica > 75th pct AND glucose > 100 mg/dL  
**Priority:** 1

**Connection line:** Certain bacteria in your mouth may be reducing the benefit of the vegetables you eat for blood sugar.

**Expanded:** DNRA bacteria in your oral cavity divert dietary nitrate away from the nitric oxide pathway. Nitric oxide plays a direct role in insulin sensitivity — it helps muscle cells take up glucose efficiently. When the oral pathway is blocked, the metabolic benefit of nitrate-rich foods is reduced, and blood sugar control can suffer.

**Action:** The most actionable step is dietary: increase nitrate-rich vegetables while stopping antiseptic mouthwash. This combination shifts the oral ecosystem toward true nitrate reducers and restores the NO pathway that supports glucose metabolism.

---

## RULE 13: Respiratory Health × Sleep × Oral

**Biological basis:** OSA-associated oral taxa (Peptostreptococcus, Prevotella, Veillonella) were identified with AUC 91.9% for OSA prediction in Chen 2022 (n=156). Nasal obstruction drives mouth breathing, which dries the oral mucosa, selects for anaerobic pathogens, and worsens OSA. Dalton 2025 (NIH-AARP, n=1,139) established the bidirectional sleep-oral microbiome relationship.

---

### Rule 13A: OSA-Associated Bacteria + Poor Sleep Efficiency
**Panels:** Oral × Wearable  
**Firing:** Peptostreptococcus > 2% OR Prevotella (OSA-linked strains) elevated AND sleep efficiency < 80%  
**Priority:** 1

**Connection line:** Bacteria in your oral panel are associated with disrupted breathing during sleep.

**Expanded:** Two completely independent data sources — a saliva sample and your wearable — are pointing at a similar pattern. The oral taxa elevated in your panel are among the species most consistently found in people with sleep-disordered breathing. Your sleep efficiency data suggests your sleep may not be as restorative as it should be. Peaq cannot diagnose sleep apnea — but it can tell you when the signals warrant further investigation.

**Action:** Mention this finding to your doctor and describe any symptoms — snoring, waking unrefreshed, morning headaches, daytime fatigue. A home sleep test is inexpensive and would confirm or rule out airway disruption. If you have a history of sinus issues or nasal obstruction, that is especially relevant context to share.

---

### Rule 13B: Nasal Obstruction History + Poor REM
**Panels:** Lifestyle × Wearable  
**Firing:** lifestyle.nasal_obstruction = true OR lifestyle.sinus_history includes surgery AND REM < 60 min avg  
**Priority:** 1

**Connection line:** Your history of nasal issues may be affecting your sleep architecture.

**Expanded:** Nasal obstruction promotes mouth breathing during sleep, which increases airway resistance and can fragment sleep architecture — particularly REM, the stage most dependent on stable airway muscle tone. Your REM average is below the optimal range, and your history of sinus issues creates a biologically plausible connection.

**Action:** An ENT evaluation is the right next step, particularly if nasal obstruction feels subjectively worse at night. Nasal strips or a saline rinse before bed are low-risk interventions worth trying in the meantime.

---

## RULE 14: Mouthwash × Multiple Downstream Effects

**Biological basis:** Antiseptic mouthwash containing alcohol or chlorhexidine suppresses nitrate-reducing bacteria (Neisseria, Rothia) within 7 days. Kapil 2020 (Lancet) showed mouthwash users had measurably higher blood pressure within 24 hours. Joshipura 2017 found 55–117% higher hypertension risk with daily mouthwash use. The same bacterial suppression impairs the NO pathway involved in glucose metabolism, HRV, and potentially neurological protection.

---

### Rule 14A: Antiseptic Mouthwash + Neisseria Depleted + Any Elevated Cardiovascular Marker
**Panels:** Lifestyle × Oral × Blood  
**Firing:** mouthwash_type = 'antiseptic' AND Neisseria < 10th pct AND (LDL > 130 OR hs-CRP > 1.0 OR RHR > expected + 5)  
**Priority:** 1

**Connection line:** A daily habit may be contributing to several of the patterns we are seeing across your panels.

**Expanded:** Antiseptic mouthwash — particularly products containing alcohol or chlorhexidine — suppresses the bacteria that produce nitric oxide in your mouth. These bacteria are already depleted in your oral panel. At the same time, your [LDL / inflammation / heart rate] is outside the optimal range. These findings are connected: the nitric oxide pathway that your mouthwash is disrupting is the same pathway that regulates blood vessels, inflammation, and cardiovascular function.

**Action:** This is the single highest-leverage free intervention on your profile. Switch to a fluoride-only rinse (alcohol-free, no chlorhexidine) or no mouthwash. The bacteria begin recovering within days. A 10-day beetroot juice protocol accelerates recovery significantly (Vanhatalo 2018).

---

## RULE 15: PhenoAge Inputs × Lifestyle Patterns

**Biological basis:** The nine PhenoAge markers respond to modifiable lifestyle factors. CRP responds to sleep, oral health, and diet. RDW responds to iron status and chronic inflammation. WBC responds to stress, sleep, and infection burden.

---

### Rule 15A: PhenoAge Elevated + Poor Sleep Regularity
**Panels:** Blood × Wearable  
**Firing:** PhenoAge > chronoAge + 3 AND sleep regularity SD > 45 min  
**Priority:** 1

**Connection line:** Your blood age is older than expected, and your sleep pattern may be contributing.

**Expanded:** Several of the nine markers in your blood age calculation respond directly to sleep quality and consistency. When sleep is irregular, inflammatory markers rise, immune cell counts shift, and red blood cell metrics worsen — all of which feed directly into the biological age calculation. Your sleep schedule variation is in the range where these effects are measurable.

**Action:** Improving sleep regularity — anchoring bedtime within a 30-minute window — is the most accessible way to start moving the blood age markers in the right direction. The effect on CRP is visible within 2–4 weeks.

---

### Rule 15B: PhenoAge Lower Than Chronological + Strong Oral Panel
**Panels:** Blood × Oral  
**Firing:** PhenoAge < chronoAge − 3 AND OMA > 65th pct  
**Priority:** 2

**Connection line:** Your oral health is likely contributing to your younger blood age.

**Expanded:** The oral microbiome influences several of the markers that go into the blood age calculation — particularly inflammation markers like CRP. When the oral ecosystem is balanced, systemic inflammation stays lower, and blood markers trend younger. Your data shows both panels in a favorable state simultaneously. This alignment is not common and is worth protecting.

**Action:** Whatever you are doing for oral care is working. Retest in 6 months. Consider sharing your findings with your dentist — this is the kind of data most practices have never seen from a patient.

---

## RULE 16: Vitamin D × Multiple Panels

**Biological basis:** Vitamin D deficiency is associated with increased periodontal disease severity, elevated CRP, impaired sleep quality, and increased risk of metabolic conditions. Vitamin D receptors are present in oral tissues and immune cells.

---

### Rule 16A: Vitamin D Low + Oral Pathogens Elevated
**Panels:** Blood × Oral  
**Firing:** vitamin_d < 30 ng/mL AND Tier 1 pathogen > 60th pct  
**Priority:** 1

**Connection line:** Low vitamin D may be reducing your mouth's ability to fight harmful bacteria.

**Expanded:** Vitamin D plays a direct role in the immune response within oral tissues. When levels are low, the mouth's local immune defense against periodontal pathogens is weakened — allowing bacteria like Porphyromonas to establish and persist more easily. Your oral panel and your vitamin D level are telling a connected story.

**Action:** Getting vitamin D into the optimal range (50–80 ng/mL) supports immune function throughout the body, including the oral immune response. Discuss supplementation levels with your doctor — most people require 2,000–5,000 IU daily to maintain optimal levels.

---

### Rule 16B: Vitamin D Low + Poor Sleep
**Panels:** Blood × Wearable  
**Firing:** vitamin_d < 30 ng/mL AND (deep sleep < 60 min OR sleep efficiency < 80%)  
**Priority:** 1

**Connection line:** Low vitamin D is associated with reduced deep sleep in multiple studies.

**Expanded:** Vitamin D receptors in the brain play a role in regulating sleep architecture, particularly deep sleep. Studies have consistently found that people with vitamin D deficiency have shorter, less restorative sleep — and that supplementation improves objective sleep quality. Your low vitamin D and reduced deep sleep may be part of the same pattern.

**Action:** Optimize vitamin D first (supplement to achieve 50–80 ng/mL) and recheck sleep metrics after 8–12 weeks. This is one of the most underappreciated sleep interventions, and it costs less than most sleep supplements.

---

## RULE 17: Cardiovascular Risk Convergence (Triple Signal)

**Biological basis:** When oral, blood, and wearable signals all point toward cardiovascular risk simultaneously, the compound effect is greater than any single signal. This is Peaq's highest-value finding and the clearest expression of the cross-panel thesis.

---

### Rule 17A: Triple Cardiovascular Convergence
**Panels:** Oral × Blood × Wearable  
**Firing:** Neisseria < 5th pct AND (LDL > 130 OR hs-CRP > 3.0) AND (RHR > expected + 8 OR HRV < 25th pct)  
**Priority:** 1

**Connection line:** Three separate signals are pointing at the same pattern — your cardiovascular system is under more strain than any single test would show.

**Expanded:** Your oral bacteria, your blood markers, and your heart rate data are each showing a signal that, alone, might be worth monitoring. Together, they are pointing at the same underlying issue: the nitric oxide pathway is compromised, systemic inflammation is elevated, and your cardiovascular system is working harder than it should be. No single panel can see this — it is only visible when all three are measured simultaneously.

**Action:** This combination warrants a conversation with your doctor — not urgently, but intentionally. Bring your Peaq data. The oral intervention (stopping antiseptic mouthwash, starting beetroot protocol) is free and fast-acting on the upstream driver. The blood panel warrants discussion about LDL management. The heart rate trend is worth monitoring weekly.

---

## Future Rules (Tracked — Not Yet Implemented)

These pathways have biological plausibility and emerging evidence. Implementation pending pilot data or additional literature.

| Rule | Panels | Trigger | Evidence Status |
|---|---|---|---|
| Oral → Colorectal cancer risk | Oral × Demographics | F. nucleatum > 90th pct + age ≥ 45 | Emerging — Science 2012, npj 2024 |
| Oral → Pancreatic cancer signal | Oral × Blood | F. nucleatum elevated + specific blood pattern | Early — requires validation |
| Oral → Preterm birth risk | Oral × Demographics | Pathogen burden + pregnancy status | Moderate — JAMA 2001 |
| WBC → Oral pathogen connection | Blood × Oral | WBC elevation + pathogen burden | Plausible — pilot candidate |
| Iron/Ferritin → Oral bleeding | Blood × Oral | Low ferritin + pathogen pattern | Plausible — pilot candidate |
| Testosterone → Oral health | Blood × Oral | Low testosterone + periodontal burden | Emerging |
| Lp(a) → Systemic inflammation cascade | Blood × Oral × Wearable | Lp(a) > 50 + CRP > 3 + oral pathogens | Proposed — strong mechanistic basis |
| Oral diversity → Long COVID recovery | Oral × Lifestyle | Low diversity + recent illness | Emerging 2023–2025 |
| Sleep → Oral circadian rhythm | Wearable × Oral | Irregular sleep + oral dysbiosis | Deferred from V5 formula — Rule 4A covers surface |
| VO₂ max × Oral NO pathway | Fitness × Oral | VO₂ low + Neisseria depleted | Deferred — pending wearable API access |
| Menstrual cycle × Oral pathogens | Demographics × Oral | Luteal phase + pathogen elevation | Emerging — relevant for female users |

---

## Markers With No Current Connection Rules

When no rule fires for a marker, the connection line is simply absent. No placeholder, no empty state.

| Marker | Why no connection line currently |
|---|---|
| Albumin | PhenoAge input; not meaningfully connected at individual level yet |
| Creatinine | Kidney function; independent pathway |
| MCV | Hematologic; not connected to other panels |
| RDW | Hematologic; future candidate via inflammation |
| ALP | Liver/bone; independent |
| TSH | Thyroid; independent |
| Testosterone | Hormonal; tracked for future |
| Lp(a) | Genetic; not modifiable — future triple convergence candidate |

---

## Connection Line Copy Principles

1. No Latin species names on the surface. Use "the bacteria that produce nitric oxide" not "Neisseria." Species appear only in the collapsed science section.
2. No medical jargon without immediate plain-language translation.
3. Every connection line ends with something the user can do — never just a diagnosis.
4. Favorable connections are as important as unfavorable ones. People need to know what is working.
5. When no rule fires, the space is simply absent. Never say "no connections found."
6. Priority 1 (unfavorable) is shown first when multiple rules fire. Priority 2 (favorable) shown if no Priority 1.
7. Exploratory connections (Priority 3) always include "we are watching" or "emerging research" language — never presented as established.

---

## Data Shape for the Component

```typescript
interface ConnectionLine {
  fires: boolean
  priority: 1 | 2 | 3
  rule_id: string
  headline: string
  expanded: string
  action_nudge: string
  linked_panels: ('oral' | 'blood' | 'wearable' | 'lifestyle')[]
  direction: 'unfavorable' | 'favorable' | 'exploratory'
}

// When fires = false, the entire object is null.
// The component does not render a connection section.
```

---

## Evaluation Order

1. Gather all rules where the current marker appears
2. Filter by QC gates
3. Filter by firing conditions against user data
4. Sort by priority (1 > 2 > 3)
5. Return highest priority rule only
6. If tie in priority: prefer rule involving more panels
7. If still tied: prefer oral-involving rule (Peaq's differentiator)

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

**Total: 33 rules (19 unfavorable, 9 favorable, 1 exploratory, 4 trend-based)**

---

## Changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | April 2026 | Initial 19-rule engine |
| 1.1 | April 2026 | Added Rules 9–17: Alzheimer's, autoimmune, breath, metabolic, respiratory, mouthwash, vitamin D, triple convergence. Expanded future rules table. |

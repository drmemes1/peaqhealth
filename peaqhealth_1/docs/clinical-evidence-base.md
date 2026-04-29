# Oravi Clinical Evidence Base

> **Source of truth for all clinical claims in Oravi user-facing content.**
> Any user-facing claim — in narratives, intervention copy, detail pages, or marketing — must be supportable by a citation in this document or a documented exception.

**Last updated:** 2026-04-24

---

## Oral Microbiome — Periodontal Disease Markers

### 1. Multi-Taxa Dysbiosis Index

> **STATUS: Approved for insight generation and oral scoring. Integrated 2026-04-24.**

**Key finding:** Community-level 16S models achieve AUC 0.87–0.958 for periodontitis detection without requiring P. gingivalis. NHANES XGBoost model (19 genera) hit AUC 0.958. Two-taxon decision tree (T. forsythia + F. fastidiosum) hit AUC 0.94.

**Implication for Oravi:** Current gum health scoring relies on individual red/orange-complex species. A dysbiosis index computed from the full community (which Oravi already sequences via 16S) could provide higher sensitivity than single-species thresholds — particularly for users who carry periodontal disease without detectable P. gingivalis.

**References:**

- Zhuang Z, et al. Subgingival microbiome-based classification and non-surgical treatment for periodontitis. *Acta Odontologica Scandinavica*. 2026;85:45662. DOI: 10.2340/aos.v85.45662
- Soueidan A, et al. Machine learning models for periodontitis diagnosis using 16S rRNA gene sequencing data from NHANES. *mSystems*. 2024;9(10):e00930-24. DOI: 10.1128/msystems.00930-24
- Kageyama S, et al. Salivary microbiome signatures for periodontitis classification: a systematic review with meta-analysis. *Frontiers in Cellular and Infection Microbiology*. 2025;15:1631798. DOI: 10.3389/fcimb.2025.1631798

---

### 2. Filifactor alocis as Geographically Consistent Biomarker

> **STATUS: Approved for insight generation and oral scoring. Integrated 2026-04-24.**

**Key finding:** F. alocis shows OR 10.9 for stage III–IV periodontitis, consistent across Spain/Colombia cohorts where P. gingivalis prevalence varies significantly. F. alocis-centered 8-pathogen co-occurrence group has higher diagnostic value in saliva than any individual pathogen.

**Implication for Oravi:** F. alocis may be a more reliable single-species periodontitis marker than P. gingivalis for a geographically diverse user base. Oravi's Zymo panel detects F. alocis at species level via 16S — no additional infrastructure needed.

**References:**

- Chen H, et al. A Filifactor alocis-centered co-occurrence group associates with periodontitis across different oral habitats. *Scientific Reports*. 2015;5:9053. DOI: 10.1038/srep09053
- Lafaurie GI, et al. Salivary microbiome in periodontitis: differences between healthy and diseased individuals across geographic regions. *PLoS ONE*. 2022;17(8):e0273523. DOI: 10.1371/journal.pone.0273523
- Vashishta A, et al. Filifactor alocis — an emerging periodontal pathogen. *Journal of Dental Research*. 2025;104(5). DOI: 10.1177/00220345251331959

---

### 3. Fretibacterium (formerly classified as Synergistetes Cluster A)

> **STATUS: Approved for insight generation and oral scoring. Integrated 2026-04-24.**

**Key finding:** 82.5% sensitivity/specificity for periodontitis — outperformed all red complex members individually. After multivariate adjustment controlling for smoking, age, and other bacteria, P. gingivalis lost significance while Fretibacterium retained independent predictive value.

**Taxonomy note:** Synergistetes Cluster A is older taxonomic terminology. The clinically relevant organism is Fretibacterium fastidiosum, which Oravi's Zymo panel reports at species level. References citing "Synergistetes Cluster A" should be understood as referring to this genus.

**Implication for Oravi:** Fretibacterium fastidiosum may be a stronger standalone periodontitis signal than traditional red-complex species. Oravi's Zymo panel already reports this species — no primer or parser changes needed.

**References:**

- Al-hebshi NN, et al. Subgingival periodontal pathogens associated with chronic periodontitis in Yemenis. *Journal of Periodontal Research*. 2015;50(1):89–98. DOI: 10.1111/jre.12210
- Belibasakis GN, et al. Synergistetes cluster A in subgingival plaque and association with periodontitis. *Journal of Periodontal Research*. 2013;48(6):727–732. DOI: 10.1111/jre.12061

---

## Pending Clinical Review

### Combined Periodontal Disease and Dental Caries → Ischemic Stroke

> **STATUS: Ready for integration pending Narod sign-off. Not yet wired into insights or scoring.**

**Key findings** (DARIC — Dental ARIC cohort: 5,986 adults, mean age 63, median 21-year follow-up, US cohort):

- Periodontal disease + dental caries together: **86% higher ischemic stroke risk** vs good oral health (adjusted for cardiovascular risk factors)
- Periodontal disease alone: 44% higher risk (HR 1.44, 95% CI 1.09–1.91)
- Regular dental care: 29% lower likelihood of PD; 81% lower likelihood of having both PD + caries
- Absolute stroke incidence over follow-up: 4% (good oral health), 7% (PD only), 10% (PD + caries)

**Reference:**

- Wood S, et al. Combined Influence of Dental Caries and Periodontal Disease on Ischemic Stroke Risk. *Neurology Open Access*. 2025;1(4):e000036. DOI: 10.1212/WN9.0000000000000036

---

## Treatment Response and Longitudinal Monitoring

### 1. Refractory Periodontitis Signature

> **STATUS: Approved for insight generation. Integrated 2026-04-24.**

**Key finding:** Species persisting or increasing in refractory patients despite aggressive therapy include F. alocis, Parvimonas micra, Eubacterium spp., Selenomonas spp., Dialister spp., Catonella morbi, Pseudoramibacter alactolyticus, Shuttlesworthia satelles, Peptostreptococcus sp. OT113. Species enriched in good responders: Haemophilus parainfluenzae, Rothia dentocariosa, Capnocytophaga sputigena, Lautropia mirabilis, Neisseria elongata, Kingella oralis, Gemella haemolysans, Streptococcus australis, Veillonella spp. Dual utility: disease detection AND treatment-response prediction from single-timepoint sampling.

**Implication for Oravi:** Enables a "refractory risk signature" insight from a single oral sample — no serial sampling needed. The combination of persistence-associated species + depleted health-associated taxa identifies communities less likely to respond to standard cleanings.

**Reference:**

- Colombo APV, et al. Subgingival microbiota of refractory and non-refractory periodontitis. *Journal of Periodontology*. 2012;83(2):169–178. DOI: 10.1902/jop.2012.110566

---

### 2. Parvimonas micra as Treatment-Failure Predictor

> **STATUS: Approved for insight generation. Integrated 2026-04-24.**

**Key finding:** Baseline P. micra predicts persistence of PD>4mm + BOP at 12 months with OR 4.38. Combined with Prevotella intermedia, AUC 0.72. Molecular mechanism: P. micra evades lysosomal clearance via AppA surface protein. Detectable at baseline — does not require serial sampling.

**Implication for Oravi:** P. micra elevation is a flag worth surfacing to users: "mention this to your dentist so targeted care can be considered." The OR 4.38 is one of the strongest single-species predictors of treatment non-response in the periodontal literature.

**References:**

- Mombelli A, et al. Subgingival microbiota associated with persistence and non-persistence of residual pockets. *Journal of Periodontology*. 2017;88(9):892–903. DOI: 10.1902/jop.2017.170286
- Li C, et al. Parvimonas micra evades lysosomal clearance via AppA surface protein. *EBioMedicine*. 2026;115:106187. DOI: 10.1016/j.ebiom.2026.106187

---

### 3. Periodontal Therapy Improves Systemic Markers

> **STATUS: Approved for insight generation. Integrated 2026-04-24.**

**Key finding:** Periodontal therapy reduces pro-inflammatory metabolites (succinate, TMA), restores short-chain fatty acids, decreases oral-origin species in stool. Subgingival Porphyromonas correlates with blood glucose. Supports Oravi's oral-systemic axis narrative for existing cross-panel insights.

**Implication for Oravi:** Strengthens the framing of oral health as metabolically actionable. Cleaning your teeth isn't just about your gums — it measurably changes your blood chemistry.

**References:**

- Baima G, et al. Metabolomic changes after periodontal therapy: oral-gut axis. *Journal of Periodontal Research*. 2025;60(4):70055. DOI: 10.1111/jre.70055
- Lu H, et al. Porphyromonas gingivalis association with fasting glucose and HbA1c. *Journal of Periodontology*. 2022;93(11):1644–1653. DOI: 10.1002/JPER.20-0764

**Supporting References:**

- Samulak R, Suwała M, Dembowska E. *Nonsurgical periodontal therapy with/without 980 nm diode laser in patients after myocardial infarction: a randomized clinical trial.* Lasers in Medical Science, 2021.

  Role: Supporting evidence for oral-cardiovascular narrative specifically in post-MI populations. RCT (n=36, under-65, 6 weeks to 6 months post-MI) demonstrated that SRP improves periodontal parameters and reduces periodontal bacteria counts at 3-month follow-up. Adjunctive 980nm diode laser provided additional bacterial reduction over SRP alone.

  Oravi usage: Reference-only. Supports the plausibility of periodontal therapy benefiting medically complex cardiovascular patients. Do NOT use this paper to recommend specific adjunctive therapies (laser, minocycline, aPDT) in insight content — Oravi insights never recommend specific clinical interventions.

---

### 4. Baseline Microbiome Predicts Treatment Outcome

> **STATUS: Pending clinical review. Evidence on file. Requires B2B clinician-facing feature (pre-treatment risk stratification).**

**Key finding:** Baseline microbiome composition predicts treatment outcome better than treatment type. Pre-treatment 16S could guide personalized therapy selection.

**References:**

- Li L, et al. Pre-treatment microbiome as outcome predictor. *Journal of Periodontology*. 2025;96(1). DOI: 10.1002/JPER.24-0141
- Bizzarro S, et al. Subgingival microbiome and treatment outcome. *Scientific Reports*. 2016;6:27167. DOI: 10.1038/srep20205

---

### 5. Filifactor alocis ftxA Toxin Gene

> **STATUS: Pending clinical review. Evidence on file. Requires strain-level detection not yet available in Zymo panel.**

**Key finding:** ftxA toxin gene (~50% of F. alocis strains) associated with enhanced clinical attachment loss progression. ftxA-positive carriers may need more aggressive treatment.

**References:**

- Razooqi M, et al. ftxA gene and clinical outcomes. *Frontiers in Cellular and Infection Microbiology*. 2024;14:1501028. DOI: 10.3389/fcimb.2024.1501028
- Razooqi M, et al. Filifactor alocis virulence factors. *Frontiers in Cellular and Infection Microbiology*. 2024;14:1376358. DOI: 10.3389/fcimb.2024.1376358

---

### 6. Post-Treatment Recolonization Pattern

> **STATUS: Pending clinical review. Evidence on file. Requires serial sampling (baseline + 3mo + 6mo).**

**Key finding:** Post-instrumentation microbiome shifts health-ward by day 1–7, but a subset reforms baseline-like microbiome by day 90. F. nucleatum paradoxically increases post-SRP.

**References:**

- Johnston W, et al. Longitudinal microbiome changes post-SRP. *Scientific Reports*. 2021;11:7134. DOI: 10.1038/s41598-021-89002-z
- Johnston W, et al. Subgingival microbiome after non-surgical therapy. *Journal of Periodontology*. 2023;94(6):725–737. DOI: 10.1002/JPER.22-0749
- Duran-Pinedo AE, et al. Microbiome recolonization after scaling. *Journal of Clinical Periodontology*. 2023;50(9):1167–1179. DOI: 10.1111/jcpe.13737

---

### 7. SMDI Durability

> **STATUS: Pending clinical review. Evidence on file. Requires longitudinal ODI tracking across multiple timepoints.**

**Key finding:** Subgingival Microbial Dysbiosis Index improvements persist at 26 months post-treatment, more durable than alpha/beta diversity changes. Validates ODI approach (shipped in PR #229).

**Reference:**

- Hoener zu Bentrup K, et al. (Hagenfeld D senior author). Long-term stability of subgingival microbial dysbiosis index after therapy. *Journal of Clinical Periodontology*. 2023;50(10):1340–1350. DOI: 10.1111/jcpe.13824

---

## Adjunctive Periodontal Therapies (Reference Only)

**NOTE:** Entries in this section are background evidence about clinical treatment options (adjunctive therapies to SRP). They are NOT used to generate insights, drive scoring, or recommend interventions. Oravi insights never recommend specific clinical treatments. These references exist for:
- Background context when writing B2B or clinician-facing material
- Informing how insights discuss dental follow-up options in general terms
- Supporting the plausibility of "discuss with your dentist" framing

---

**Tabenski L, Moder D, Cieplik F, et al.** *Antimicrobial photodynamic therapy vs. local minocycline in addition to non-surgical therapy of deep periodontal pockets: a controlled randomized clinical trial.* Clinical Oral Investigations. 2017 Sep;21(7):2253-2264. DOI: 10.1007/s00784-016-2018-6. PMID: 27909894.

Key finding: Head-to-head RCT of antimicrobial photodynamic therapy (aPDT) vs. local minocycline as adjuncts to SRP in deep periodontal pockets. Provides comparative evidence on adjunctive therapy choices.

Oravi usage: Reference-only. Do NOT cite in user-facing insights. Do NOT add to the approved mechanisms list in the system prompt.

---

## Change Log

| Date | Change |
|---|---|
| 2026-04-24 | Two supporting references added: Samulak 2021 attached under "Periodontal Therapy Improves Systemic Markers"; Tabenski 2017 filed under new "Adjunctive Periodontal Therapies (Reference Only)" section. Neither creates new mechanisms or changes insight generation. |
| 2026-04-24 | Seven mechanisms added under "Treatment Response and Longitudinal Monitoring." Three approved (Refractory Signature, P. micra failure predictor, periodontal-systemic axis). Four evidence-on-file pending serial sampling or strain-level capability. |
| 2026-04-24 | Three mechanisms promoted from pending to approved: Multi-Taxa Dysbiosis Index, Filifactor alocis, Fretibacterium (terminology corrected from Synergistetes Cluster A). Lab panel capability verified — all taxa present in Zymo species-level reporting. |
| 2026-04-24 | Added: oral disease + ischemic stroke (DARIC cohort, Wood 2025). Ready for integration pending Narod sign-off. |
| 2026-04-24 | Initial file created with 3 pending mechanisms. |

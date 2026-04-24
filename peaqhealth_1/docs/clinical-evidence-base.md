# Cnvrg Clinical Evidence Base

> **Source of truth for all clinical claims in Cnvrg user-facing content.**
> Any user-facing claim — in narratives, intervention copy, detail pages, or marketing — must be supportable by a citation in this document or a documented exception.

**Last updated:** 2026-04-24

---

## Pending Clinical Review — Periodontitis Detection Without P. gingivalis

> **STATUS: Pending clinical review. Not yet wired into insights or scoring. Requires Narod sign-off before integration.**

### 1. Multi-Taxa Dysbiosis Index

**Key finding:** Community-level 16S models achieve AUC 0.87–0.958 for periodontitis detection without requiring P. gingivalis. NHANES XGBoost model (19 genera) hit AUC 0.958. Two-taxon decision tree (T. forsythia + F. fastidiosum) hit AUC 0.94.

**Implication for Cnvrg:** Current gum health scoring relies on individual red/orange-complex species. A dysbiosis index computed from the full community (which Cnvrg already sequences via 16S) could provide higher sensitivity than single-species thresholds — particularly for users who carry periodontal disease without detectable P. gingivalis.

**References:**

- Zhuang Z, et al. Subgingival microbiome-based classification and non-surgical treatment for periodontitis. *Acta Odontologica Scandinavica*. 2026;85:45662. DOI: 10.2340/aos.v85.45662
- Soueidan A, et al. Machine learning models for periodontitis diagnosis using 16S rRNA gene sequencing data from NHANES. *mSystems*. 2024;9(10):e00930-24. DOI: 10.1128/msystems.00930-24
- Kageyama S, et al. Salivary microbiome signatures for periodontitis classification: a systematic review with meta-analysis. *Frontiers in Cellular and Infection Microbiology*. 2025;15:1631798. DOI: 10.3389/fcimb.2025.1631798

---

### 2. Filifactor alocis as Geographically Consistent Biomarker

**Key finding:** F. alocis shows OR 10.9 for stage III–IV periodontitis, consistent across Spain/Colombia cohorts where P. gingivalis prevalence varies significantly. F. alocis-centered 8-pathogen co-occurrence group has higher diagnostic value in saliva than any individual pathogen.

**Implication for Cnvrg:** F. alocis may be a more reliable single-species periodontitis marker than P. gingivalis for a geographically diverse user base. If Cnvrg adds F. alocis detection to its species mapping (it's a 16S-detectable Gram-negative anaerobe), it could improve gum health signal specificity without requiring culture or PCR.

**References:**

- Chen H, et al. A Filifactor alocis-centered co-occurrence group associates with periodontitis across different oral habitats. *Scientific Reports*. 2015;5:9053. DOI: 10.1038/srep09053
- Lafaurie GI, et al. Salivary microbiome in periodontitis: differences between healthy and diseased individuals across geographic regions. *PLoS ONE*. 2022;17(8):e0273523. DOI: 10.1371/journal.pone.0273523
- Vashishta A, et al. Filifactor alocis — an emerging periodontal pathogen. *Journal of Dental Research*. 2025;104(5). DOI: 10.1177/00220345251331959

---

### 3. Oral Synergistetes Cluster A

**Key finding:** 82.5% sensitivity/specificity for periodontitis — outperformed all red complex members individually. After multivariate adjustment controlling for smoking, age, and other bacteria, P. gingivalis lost significance while Synergistetes retained independent predictive value.

**Implication for Cnvrg:** Synergistetes Cluster A may be a stronger standalone periodontitis signal than traditional red-complex species. Currently not in Cnvrg's species mapping. Adding it would require confirming 16S primer coverage and updating the OTU-to-species mapping in the L7 parser.

**References:**

- Al-hebshi NN, et al. Subgingival periodontal pathogens associated with chronic periodontitis in Yemenis. *Journal of Periodontal Research*. 2015;50(1):89–98. DOI: 10.1111/jre.12210
- Belibasakis GN, et al. Synergistetes cluster A in subgingival plaque and association with periodontitis. *Journal of Periodontal Research*. 2013;48(6):727–732. DOI: 10.1111/jre.12061

---

## Change Log

| Date | Change |
|---|---|
| 2026-04-24 | Initial file created with 3 pending mechanisms: multi-taxa dysbiosis index, F. alocis biomarker, Synergistetes Cluster A. All pending clinical review. |

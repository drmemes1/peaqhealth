# NHANES Oral Microbiome Analysis -- Biostatistician Review Package

## Overview

This package contains a NHANES 2009-2012 oral microbiome analysis linking 16S rRNA bacterial genera to cardiometabolic blood markers including systolic/diastolic blood pressure, HbA1c, and hs-CRP. The primary analysis uses survey-weighted Spearman rank correlations with NHANES complex survey weights (WTMEC2YR), with cluster bootstrap confidence intervals accounting for the stratified multistage sampling design (SDMVSTRA, SDMVPSU). Unweighted Spearman results with Fisher-z confidence intervals are reported as supplemental. Bonferroni and FDR (Benjamini-Hochberg) multiple-testing corrections are applied across all 90 genus-marker pairs (10 genera x 9 markers). Covariate-adjusted partial Spearman correlations control for age, sex, BMI, and smoking status via OLS residualization, with their own Bonferroni and FDR corrections applied separately.

## Data Source

The oral microbiome data comes from the NHANES Oral Microbiome Pilot (OMP) study, cycles 2009-2010 and 2011-2012. The data is publicly available from the CDC:

- **2009-2010 cycle:** https://wwwn.cdc.gov/Nchs/Nhanes/omp/Default.aspx (select 2009-2010)
- **2011-2012 cycle:** https://wwwn.cdc.gov/Nchs/Nhanes/omp/Default.aspx (select 2011-2012)

Blood markers (CRP, cholesterol, HDL, triglycerides, glucose, insulin, HbA1c, blood pressure) and demographics are from the standard NHANES laboratory and examination datasets for the same cycles.

**Note to reviewer:** Please download the source data directly from CDC to verify any results independently. The CSV files in `data/nhanes/` are the downloaded and merged intermediates used by our scripts.

## Statistical Methods

**Primary analysis:** Survey-weighted Spearman rank correlations using WTMEC2YR as survey weight (divided by 2 for pooled cycles). Weighted ranks are computed using survey weights, followed by weighted Pearson correlation on those ranks. P-values use Kish effective sample size for degrees of freedom. 95% confidence intervals are computed via cluster bootstrap (1000 resamples) respecting SDMVSTRA (strata) and SDMVPSU (primary sampling units).

**Supplemental analysis:** Unweighted Spearman rank correlations with Fisher z-transformation 95% confidence intervals.

**Multiple testing:** Bonferroni correction (alpha = 0.05 / 90) and FDR Benjamini-Hochberg (alpha = 0.05) applied to both weighted and unweighted results across all 90 tests.

**Covariate adjustment:** Partial Spearman correlations via OLS residualization controlling for age (RIDAGEYR), sex (RIAGENDR), BMI (BMXBMI), and smoking status (SMQ020/SMQ040). Adjusted p-values receive their own Bonferroni and FDR corrections.

## Scripts -- What Each One Does

| Script | Description |
|--------|-------------|
| `survey_utils.py` | Shared statistical utilities: weighted Spearman correlation, Fisher-z CIs, cluster bootstrap CIs accounting for NHANES survey design. |
| `build_nhanes_reference.py` | Builds the NHANES oral microbiome reference JSON from CDC public data, including alpha diversity metrics, genus-level relative abundances, and taxonomy annotations. Outputs `data/nhanes_oral_reference.json`. |
| `analyze_oral_blood_correlations.py` | Analyzes correlations between oral diversity (Shannon index) and blood markers using NHANES 2009-2012 data. Outputs `data/nhanes/oral_blood_correlations.csv`. |
| `analyze_genus_blood_correlations.py` | Tests genus-level oral microbiome correlations with systemic blood markers (CRP, cholesterol, HDL, triglycerides, glucose, insulin) to validate cross-panel signals. Outputs `data/nhanes/genus_blood_correlations.csv`. |
| `analyze_genus_bp_hba1c.py` | Tests correlations between specific oral bacteria (nitrate-reducers and periodontal pathogens) and blood pressure/HbA1c. Outputs `data/nhanes/genus_bp_correlations.csv` and `data/nhanes/genus_hba1c_correlations.csv`. |
| `master_validation.py` | Runs all 90 genus x marker tests with both survey-weighted (primary) and unweighted (supplemental) Spearman correlations, Bonferroni and FDR corrections, and 95% CIs. Outputs `data/nhanes/all_90_tests.csv` and `data/nhanes/master_validation.csv`. |
| `age_adjusted_correlations.py` | Computes age/sex/BMI/smoking-adjusted partial Spearman correlations for all 90 genus x marker pairs using OLS residualization, with Bonferroni and FDR corrections on adjusted p-values. Outputs `data/nhanes/age_adjusted_correlations.csv`. |
| `generate_paper_pdf.py` | Generates the publication-ready PDF white paper with weighted results as primary, unweighted as supplemental, and updated methods section. Outputs `data/peaq_nhanes_oral_blood_paper.pdf`. |
| `nhanes_mortality_analysis.py` | Links oral microbiome genera to NDI mortality follow-up through Dec 31, 2019 using Cox proportional hazards regression. Outputs to `results/mortality_analysis/`. |

## Key Findings

- **90 genus x marker** Spearman correlations tested (10 genera x 9 markers)
- **Neisseria** showed a significant inverse correlation with systolic blood pressure (r = -0.061, p = 2e-9), supporting the oral nitrate-reduction / nitric oxide pathway hypothesis
- **10 out of 20** blood pressure associations (systolic + diastolic) were significant
- **5 out of 10** HbA1c associations were significant
- **Composite nitrate-reducer test** (Neisseria + Rothia + Veillonella combined) was **not** significant, suggesting the signal is genus-specific rather than pathway-composite
- Age/sex/BMI/smoking adjustment preserved the direction and significance of most associations, with a few notable direction changes flagged in the adjusted correlation table

## Review Questions

1. Were NHANES complex survey weights (WTMEC2YR) correctly applied? Are the weighted Spearman and bootstrap CI implementations valid?
2. Were Bonferroni and FDR thresholds correctly applied across all 90 genus x marker tests?
3. Are the partial Spearman correlations correctly implemented with age/sex/BMI/smoking as covariates?
4. Is the Neisseria-specific finding (significant) vs composite nitrate-reducer finding (not significant) a methodological artifact or genuine biological specificity?
5. Do the stated findings accurately match the CSV outputs?

## Files in This Package

### Scripts (`scripts/`)
| File | Description |
|------|-------------|
| `survey_utils.py` | Weighted Spearman, Fisher-z CIs, cluster bootstrap CIs |
| `build_nhanes_reference.py` | Builds reference JSON from CDC oral microbiome data |
| `analyze_oral_blood_correlations.py` | Shannon diversity vs. blood marker correlations |
| `analyze_genus_blood_correlations.py` | Genus-level vs. blood marker correlations |
| `analyze_genus_bp_hba1c.py` | Genus vs. blood pressure and HbA1c correlations |
| `master_validation.py` | Full 90-test validation: weighted (primary) + unweighted (supplemental) with MTC and CIs |
| `age_adjusted_correlations.py` | Covariate-adjusted partial Spearman correlations with MTC and CIs |
| `generate_paper_pdf.py` | PDF white paper generator |
| `nhanes_mortality_analysis.py` | Mortality follow-up analysis (Cox PH) |

### Data (`data/`)
| File | Description |
|------|-------------|
| `peaq_nhanes_oral_blood_paper.pdf` | Publication-ready white paper |
| `nhanes_oral_reference.json` | Reference JSON with genus abundances and diversity metrics |

### Data -- NHANES intermediates (`data/nhanes/`)
| File | Description |
|------|-------------|
| `master_validation.csv` | Significant genus x marker associations (Bonferroni + FDR) |
| `all_90_tests.csv` | All 90 genus x marker tests including non-significant |
| `age_adjusted_correlations.csv` | 90 rows: unadjusted vs. age/sex/BMI/smoking-adjusted correlations with MTC |
| `oral_blood_correlations.csv` | Shannon diversity vs. blood marker results |
| `genus_blood_correlations.csv` | Genus-level vs. CRP/cholesterol/HDL/triglycerides/glucose/insulin |
| `genus_bp_correlations.csv` | Genus vs. blood pressure results |
| `genus_hba1c_correlations.csv` | Genus vs. HbA1c results |
| `nhanes_demographics.csv` | Merged demographics (age, sex, race/ethnicity) |
| `nhanes_demo_f.csv` | Demographics 2009-2010 cycle (includes WTMEC2YR, SDMVSTRA, SDMVPSU) |
| `nhanes_demo_g.csv` | Demographics 2011-2012 cycle (includes WTMEC2YR, SDMVSTRA, SDMVPSU) |
| `nhanes_bmx_f.csv` | Body measures 2009-2010 cycle |
| `nhanes_bmx_g.csv` | Body measures 2011-2012 cycle |
| `nhanes_smq_f.csv` | Smoking questionnaire 2009-2010 cycle |
| `nhanes_smq_g.csv` | Smoking questionnaire 2011-2012 cycle |
| `nhanes_crp_f.csv` | CRP lab data 2009-2010 cycle |
| `nhanes_crp_g.csv` | CRP lab data 2011-2012 cycle |
| `nhanes_chol_f.csv` | Total cholesterol 2009-2010 cycle |
| `nhanes_chol_g.csv` | Total cholesterol 2011-2012 cycle |
| `nhanes_hdl_f.csv` | HDL cholesterol 2009-2010 cycle |
| `nhanes_hdl_g.csv` | HDL cholesterol 2011-2012 cycle |
| `nhanes_trig_f.csv` | Triglycerides 2009-2010 cycle |
| `nhanes_trig_g.csv` | Triglycerides 2011-2012 cycle |
| `nhanes_glucose_f.csv` | Fasting glucose 2009-2010 cycle |
| `nhanes_glucose_g.csv` | Fasting glucose 2011-2012 cycle |
| `nhanes_insulin.csv` | Insulin lab data |
| `nhanes_bp.csv` | Blood pressure examination data |
| `nhanes_hba1c.csv` | HbA1c lab data |
| `mortality_2009_2010.dat` | CDC NDI mortality linkage 2009-2010 cycle |
| `mortality_2011_2012.dat` | CDC NDI mortality linkage 2011-2012 cycle |

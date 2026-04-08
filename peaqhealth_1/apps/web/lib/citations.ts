// lib/citations.ts — canonical citation library for all science claims sitewide

export type Citation = {
  ref: string
  finding: string
  type?: string
  tag: string
}

export const citations: Record<string, Citation> = {

  // ── ORAL → BLOOD ────────────────────────────────────────────────────────
  perio_ascvd_2026: {
    ref: "Tran AH et al. Circulation, 2026 (AHA Scientific Statement)",
    finding: "Periodontal disease increases ASCVD risk through bacteremia and chronic systemic inflammation. Mendelian randomization confirms directional causality.",
    type: "AHA Scientific Statement",
    tag: "Oral \u2192 Blood",
  },
  plaque_bacteria_2023: {
    ref: "Hussain M et al. Frontiers in Immunology, 2023. n=1,791",
    finding: "P. gingivalis directly detected in human coronary artery plaques at autopsy \u2014 not associated, physically present.",
    type: "Pathological study",
    tag: "Oral \u2192 Blood",
  },
  brushing_cvd_2019: {
    ref: "Park SY et al. Eur J Preventive Cardiology, 2019. n=247,696",
    finding: "14% lower cardiovascular disease risk associated with twice-daily brushing and regular dental visits.",
    tag: "Oral \u2192 Blood",
  },
  bacteremia_daily: {
    ref: "Multiple clinical sources \u2014 AHA and orthopedic surgery literature",
    finding: "Routine daily activities (brushing, chewing, flossing) cause bacteremia for approximately 90 hours per month. A dental procedure causes bacteremia for approximately 6 minutes.",
    tag: "Oral \u2192 Blood",
  },
  bop_crp_coronary: {
    ref: "Bokhari SA et al. J Clin Periodontol, 2014. n=317 coronary heart disease patients",
    finding: "Bleeding on probing (BOP) is strongly associated with systemic CRP levels in coronary heart disease patients. BOP was the only periodontal parameter significantly associated with each systemic marker (CRP, fibrinogen, WBC).",
    tag: "Oral \u2192 Blood",
  },

  // ── ORAL ↔ SLEEP ───────────────────────────────────────────────────────
  osa_perio_meta_2024: {
    ref: "Portelli M et al. Dentistry Journal, 2024. Systematic review & meta-analysis. n=88,040",
    finding: "OSA patients are 2.46\u00d7 more likely to have periodontitis (OR=2.46, 95% CI: 1.73\u2013). PRISMA-guided, 10 studies.",
    type: "Systematic review & meta-analysis",
    tag: "Oral \u2194 Sleep",
  },
  osa_perio_meta_2023: {
    ref: "Zhu J et al. Sleep and Breathing, 2023. Meta-analysis. n=31,800",
    finding: "Increased prevalence of periodontitis in OSA populations (OR 2.348). Probing depth and clinical attachment loss significantly elevated.",
    type: "Meta-analysis \u00b7 13 studies",
    tag: "Oral \u2194 Sleep",
  },
  osa_perio_mr_2023: {
    ref: "Mi Z et al. BMC Oral Health, 2023. Mendelian randomization.",
    finding: "Genetically determined OSA causally promotes periodontitis development (IVW OR=1.117, 95% CI: 1.001\u20131.246). Reverse analysis found no causal effect of periodontitis on OSA.",
    type: "Mendelian randomization",
    tag: "Oral \u2192 Sleep",
  },
  nhanes_oral_sleep_2025: {
    ref: "Hao G et al. BMC Oral Health, 2025. NHANES 2009\u20132012. n=4,729 U.S. adults",
    finding: "Lower oral microbiome alpha-diversity associated with higher risk of sleep disorder in a nationally representative U.S. sample.",
    type: "Cross-sectional \u00b7 nationally representative",
    tag: "Oral \u2194 Sleep",
  },
  osa_perio_shared_mechanism_2025: {
    ref: "Incerti-Parenti S et al. Applied Sciences, 2025.",
    finding: "OSA and periodontitis share chronic inflammation and oxidative stress as common pathways. OSA-related intermittent hypoxia accelerates periodontal tissue breakdown.",
    type: "Narrative review",
    tag: "Oral \u2194 Sleep",
  },
  osa_perio_inflam_2017: {
    ref: "Gamsiz-Isik H et al. J Periodontol, 2017. n=163 (83 OSA, 80 controls, polysomnogram-confirmed)",
    finding: "Prevalence of periodontitis in the OSA group was 96.4% vs 75% in controls (p<0.001). OSA patients showed significantly higher GCF IL-1\u03b2 and serum hs-CRP.",
    tag: "Oral \u2194 Sleep",
  },

  // ── BLOOD ───────────────────────────────────────────────────────────────
  crp_cardiac_2025: {
    ref: "Mensah GA et al. (incl. Ridker PM). J Am Coll Cardiol, 2025 (ACC Scientific Statement)",
    finding: "Residual inflammatory risk is predictive of cardiovascular events independent of cholesterol. hsCRP >2.0 mg/L is an independent action threshold.",
    tag: "Blood",
  },
  jupiter_2008: {
    ref: "Ridker PM et al. NEJM, 2008. n=17,802",
    finding: "44% reduction in major cardiovascular events in patients with normal LDL but elevated CRP.",
    tag: "Blood",
  },

  // ── BLOOD → SLEEP ──────────────────────────────────────────────────────
  crp_sleep_2016: {
    ref: "Irwin MR et al. Biological Psychiatry, 2016. Meta-analysis",
    finding: "Elevated CRP fragments sleep architecture and suppresses deep sleep \u2014 which further elevates CRP. Short sleep (<6h) associated with 1.45x higher CRP.",
    tag: "Blood \u2192 Sleep",
  },

  // ── ORAL ↔ DIABETES ───────────────────────────────────────────────────
  perio_diabetes_2_3x: {
    ref: "Multiple sources including Gian-Grasso JE, Nagelberg SB. Pract Diabetol 1997",
    finding: "Diabetics have a 2\u20133x greater chance of developing periodontitis than non-diabetics. Only poorly controlled diabetes (HbA1c >7%) is significantly associated.",
    tag: "Oral \u2194 Diabetes",
  },
  srp_hba1c_reduction: {
    ref: "Altamash M et al. J Oral Rehabil, 2016. n=129",
    finding: "Periodontal treatment reduced HbA1c by a mean of 1% in diabetics with periodontal disease over 6 months.",
    type: "Longitudinal interventional study",
    tag: "Oral \u2192 Diabetes",
  },

  // ── ORAL → BRAIN / ALZHEIMER'S ────────────────────────────────────────
  oral_alzheimers_2015: {
    ref: "Olsen I, Singhrao SK. J Oral Microbiol, 2015",
    finding: "P. gingivalis, treponemes, Prevotella, Fusobacterium among prime candidate pathogens in Alzheimer\u2019s disease brains. Oral infection may occur decades before dementia manifests.",
    tag: "Oral \u2192 Brain",
  },
  pgingivalis_brain_2019: {
    ref: "Dominy SS et al. Science Advances, 2019",
    finding: "P. gingivalis detected in human brain tissue in Alzheimer\u2019s disease patients. Gingipain proteases identified as potential driver of neuroinflammatory cascades.",
    tag: "Oral \u2192 Brain",
  },

  // ── ORAL → RA ─────────────────────────────────────────────────────────
  ra_perio_meta_2017: {
    ref: "Tang Q et al. Int J Periodontics Restorative Dent, 2017. n up to 151,569",
    finding: "RA patients are 4.68x more likely to have periodontitis in case-control studies. Dose-response pattern between periodontitis severity and RA disease activity.",
    type: "Systematic review & meta-analysis",
    tag: "Oral \u2192 RA",
  },

  // ── GENETIC SUSCEPTIBILITY ────────────────────────────────────────────
  perio_heritability: {
    ref: "Twin studies \u2014 multiple sources reviewed in clinical periodontal literature",
    finding: "Heredity accounts for approximately 50% of the enhanced risk for periodontitis. IL-1\u03b2 gene polymorphisms independently increase disease severity.",
    tag: "Genetic susceptibility",
  },

  // ── PREVALENCE ────────────────────────────────────────────────────────
  perio_prevalence_50pct: {
    ref: "Multiple sources including CDC periodontal surveillance data",
    finding: "Periodontal disease is present to some degree in almost 50% of Americans aged 30 years or older. Most are unaware.",
    tag: "Prevalence",
  },

  // ── SMOKING ───────────────────────────────────────────────────────────
  smoking_perio_risk: {
    ref: "World Workshop on Periodontics meta-analysis, 1996 + subsequent studies",
    finding: "Smokers have a 2.8x greater chance of developing periodontitis than non-smokers. Heavy smokers (>10 cigarettes/day) are 7x more likely to develop severe periodontitis.",
    tag: "Smoking \u2192 Oral",
  },

  // ── STRESS ────────────────────────────────────────────────────────────
  stress_perio: {
    ref: "Peruzzo DC et al. J Periodontol, 2007. Systematic review",
    finding: "Majority of studies showed a positive relationship between stress/psychological factors and periodontal disease. Mechanism: corticosteroid-induced immune suppression.",
    tag: "Stress \u2192 Oral",
  },
}

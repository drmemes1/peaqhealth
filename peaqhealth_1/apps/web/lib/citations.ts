// lib/citations.ts — canonical citation library for all science claims sitewide

export const citations = {
  // ── ORAL → BLOOD ────────────────────────────────────────────────────────
  perio_ascvd_2026: {
    ref: "Tran AH et al. Circulation, 2026 (AHA Scientific Statement)",
    finding: "Periodontal disease increases ASCVD risk through bacteremia and chronic systemic inflammation.",
    type: "AHA Scientific Statement",
    tag: "Oral \u2192 Blood",
  },
  plaque_bacteria_2023: {
    ref: "Hussain M et al. Frontiers in Immunology, 2023. n=1,791",
    finding: "P. gingivalis directly detected in human coronary artery plaques at autopsy.",
    type: "Pathological study",
    tag: "Oral \u2192 Blood",
  },
  brushing_cvd_2019: {
    ref: "Park SY et al. Eur J Preventive Cardiology, 2019. n=247,696",
    finding: "14% lower cardiovascular disease risk associated with twice-daily brushing and regular dental visits.",
    tag: "Oral \u2192 Blood",
  },

  // ── BLOOD ───────────────────────────────────────────────────────────────
  crp_cardiac_2025: {
    ref: "Mensah GA et al. (incl. Ridker PM). J Am Coll Cardiol, 2025 (ACC Scientific Statement)",
    finding: "Residual inflammatory risk is predictive of cardiovascular events independent of cholesterol.",
    tag: "Blood",
  },
  jupiter_2008: {
    ref: "Ridker PM et al. NEJM, 2008. n=17,802",
    finding: "hsCRP >2.0 mg/L is an independent cardiovascular action threshold regardless of LDL level.",
    tag: "Blood",
  },

  // ── BLOOD → SLEEP ──────────────────────────────────────────────────────
  crp_sleep_2016: {
    ref: "Irwin MR et al. Biological Psychiatry, 2016. Meta-analysis",
    finding: "Elevated CRP fragments sleep architecture and suppresses deep sleep \u2014 which further elevates CRP.",
    tag: "Blood \u2192 Sleep",
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
}

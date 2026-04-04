export type MarkerInfo = {
  why: string
  target: string
  citation: string
  tip?: string
}

export const markerInfo: Record<string, MarkerInfo> = {
  // ── Sleep ────────────────────────────────────────────────────────────────
  "deep-sleep": {
    why: "Slow-wave sleep drives growth hormone release, glymphatic waste clearance, and immune consolidation. The most clinically meaningful sleep quality indicator.",
    target: "≥17% of total sleep time",
    citation: "Xie et al., Science 2013",
    tip: "Consistent sleep/wake times and a cooler room (65–68°F) improve deep sleep.",
  },
  hrv: {
    why: "Heart rate variability measures autonomic nervous system function. Low HRV independently predicts cardiovascular events and poor stress resilience. Targets are age-adjusted.",
    target: "Age-adjusted — e.g. ≥48 ms at 40–49, ≥35 ms at 60+",
    citation: "Thayer et al., Int J Cardiology 2010",
    tip: "HRV improves with consistent training load, reduced alcohol, and stress management.",
  },
  spo2: {
    why: "Overnight oxygen desaturation events are the primary screening signal for obstructive sleep apnea, which affects 936 million people globally and is massively underdiagnosed.",
    target: "≤2 dips below 90% per night",
    citation: "Benjafield et al., Lancet Respiratory Medicine 2019",
  },
  rem: {
    why: "REM sleep governs emotional memory consolidation and psychological resilience. Chronic REM suppression is associated with depression, anxiety, and impaired threat processing.",
    target: "≥18% of total sleep time",
    citation: "Walker & Stickgold, Annual Review of Psychology 2006",
  },
  "sleep-efficiency": {
    why: "Time asleep as a fraction of time in bed. Low efficiency indicates fragmented sleep regardless of total hours logged.",
    target: "≥85%",
    citation: "Buysse et al., Psychiatry Research 1989",
  },

  // ── Blood ────────────────────────────────────────────────────────────────
  "hs-crp": {
    why: "High-sensitivity CRP is the benchmark inflammatory marker. Values above 3.0 mg/L confer 2× the cardiovascular risk of values below 1.0 mg/L, independent of LDL cholesterol.",
    target: "<0.5 mg/L",
    citation: "Ridker et al., NEJM 2008 — Jupiter trial, n=17,802",
  },
  lpa: {
    why: "Lipoprotein(a) is largely genetically determined and missed by standard lipid panels. Elevated Lp(a) above 125 nmol/L doubles cardiovascular risk independently.",
    target: "<75 nmol/L",
    citation: "Tsimikas, JACC 2017",
  },
  triglycerides: {
    why: "Fasting triglycerides reflect insulin sensitivity. Elevated triglycerides with low HDL is the pattern most predictive of type 2 diabetes and ASCVD.",
    target: "<150 mg/dL",
    citation: "Austin et al., Am J Cardiology 1998",
  },
  hba1c: {
    why: "Glycated haemoglobin reflects average blood glucose over 90 days. Pre-diabetic range elevates risk of kidney disease and cardiovascular events years before diagnosis.",
    target: "<5.4%",
    citation: "Selvin et al., NEJM 2010, n=11,092",
  },
  "vitamin-d": {
    why: "Vitamin D deficiency affects ~40% of Americans and is linked to elevated inflammatory cytokines, impaired sleep quality, and all-cause mortality.",
    target: "30–60 ng/mL",
    citation: "Forrest & Stuhldreher, Nutrition Research 2011, n=4,495",
  },

  // ── Oral ─────────────────────────────────────────────────────────────────
  "shannon-diversity": {
    why: "Shannon diversity measures species richness and evenness in the oral cavity. Low diversity is the hallmark of dysbiosis — where pathogenic species overgrow at the expense of beneficial ones.",
    target: "≥3.0 index",
    citation: "Belstrøm et al., J Oral Microbiology 2014",
  },
  "nitrate-reducing": {
    why: "Neisseria, Rothia, and Veillonella convert dietary nitrate into nitric oxide — a potent vasodilator critical for blood pressure regulation. Antiseptic mouthwash kills these bacteria.",
    target: "≥5% of reads",
    citation: "Kapil et al., Hypertension 2015, n=300",
    tip: "Avoid antiseptic mouthwash. Green leafy vegetables (spinach, arugula, beetroot) feed these bacteria.",
  },
  "periodontal-pathogens": {
    why: "P. gingivalis and T. denticola have been directly detected in human coronary artery plaques in autopsy studies, establishing a bacteraemia pathway from the mouth to vascular tissue.",
    target: "<0.5% of reads",
    citation: "Hussain et al., Frontiers in Immunology 2023, n=1,791",
    tip: "Professional dental cleaning is the most effective way to reduce subgingival pathogen load.",
  },
  "osa-taxa": {
    why: "Prevotella and Fusobacterium species are enriched in patients with obstructive sleep apnea — the direct microbiome bridge between oral health and sleep quality.",
    target: "<1% of reads",
    citation: "Chen et al., mSystems 2022, n=156",
  },
}

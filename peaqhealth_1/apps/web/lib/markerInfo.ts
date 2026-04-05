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
    why: `HRV (RMSSD) is not just a sleep recovery metric — it reflects the balance of your autonomic nervous system. As we age, parasympathetic tone declines. That matters because the parasympathetic system actively suppresses systemic inflammation via the cholinergic anti-inflammatory pathway. When it weakens, the brake on inflammation is released — fuelling inflammaging, now formally recognized as hallmark #11 of aging (López-Otín et al., Cell 2023).

Peaq scores HRV on two axes simultaneously:

1. Population percentile — where you stand relative to healthy people your age and sex, anchored in the Lifelines Cohort (n=84,772), the largest single-cohort RMSSD normative dataset published.

2. Personal trend — whether your HRV is rising or falling relative to your own 30-day rolling baseline. A sustained drop of ≥20% flags Watch regardless of your population score, because acute stress shows up in your personal trend before it shifts your percentile.

Your final HRV status is the more conservative of the two signals. When HRV is low and hsCRP is elevated together, this is not a coincidence — you are seeing two measurements of the same hallmark of aging.`,

    target: `Age and sex adjusted. Examples (50th percentile, male):
  Age 30–34: ≥37 ms · Age 40–44: ≥29 ms · Age 50–54: ≥24 ms · Age 60–64: ≥19 ms
  Women run approximately 5 ms higher in most age bands below 60.
  Personal baseline: ≥20% below your 30-day average flags Watch regardless of percentile.`,

    citation: `Tegegne BS et al. Eur J Prev Cardiol. 2020;27(19):2191–2194. n=84,772 (Lifelines Cohort).
Brozat M, Böckelmann I, Sammito S. J Cardiovasc Dev Dis. 2025;12(6):214 (systematic review, 58 studies).
Olivieri F et al. Ageing Res Rev. 2024 Nov;101:102521. PMID 39341508 (HRV as hallmark of inflammaging).
López-Otín C et al. Cell. 2023;186(2):243–278 (12 hallmarks of aging — dysbiosis #12, inflammaging #11).`,

    tip: `HRV improves over weeks to months — not overnight. The highest-yield interventions: consistent sleep and wake times (your circadian rhythm directly governs parasympathetic tone), reducing evening alcohol (suppresses HRV for 24–48h), sustained aerobic training (zone 2 specifically), and stress reduction. A single bad night will drop your personal trend — that's normal. A sustained multi-week drop is the signal that matters.`,
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

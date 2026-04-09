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
    why: `HRV (RMSSD) is not just a sleep recovery metric. It reflects the balance of your autonomic nervous system. As we age, parasympathetic tone declines. That matters because the parasympathetic system actively suppresses systemic inflammation via the cholinergic anti-inflammatory pathway. When it weakens, the brake on inflammation is released, fuelling inflammaging, now formally recognized as hallmark #11 of aging (López-Otín et al., Cell 2023).

Peaq scores HRV on two axes simultaneously:

1. Population percentile: where you stand relative to healthy people your age and sex, anchored in the Lifelines Cohort (n=84,772), the largest single-cohort RMSSD normative dataset published.

2. Personal trend: whether your HRV is rising or falling relative to your own 30-day rolling baseline. A sustained drop of ≥20% flags Watch regardless of your population score, because acute stress shows up in your personal trend before it shifts your percentile.

Your final HRV status is the more conservative of the two signals. When HRV is low and hsCRP is elevated together, this is not a coincidence. You are seeing two measurements of the same hallmark of aging.`,

    target: `Age and sex adjusted. Examples (50th percentile, male):
  Age 30–34: ≥37 ms · Age 40–44: ≥29 ms · Age 50–54: ≥24 ms · Age 60–64: ≥19 ms
  Women run approximately 5 ms higher in most age bands below 60.
  Personal baseline: ≥20% below your 30-day average flags Watch regardless of percentile.`,

    citation: `Tegegne BS et al. Eur J Prev Cardiol. 2020;27(19):2191–2194. n=84,772 (Lifelines Cohort).
Brozat M, Böckelmann I, Sammito S. J Cardiovasc Dev Dis. 2025;12(6):214 (systematic review, 58 studies).
Olivieri F et al. Ageing Res Rev. 2024 Nov;101:102521. PMID 39341508 (HRV as hallmark of inflammaging).
López-Otín C et al. Cell. 2023;186(2):243–278 (hallmarks of aging, includes dysbiosis and inflammaging).`,

    tip: `HRV improves over weeks to months, not overnight. The highest-yield interventions: consistent sleep and wake times (your circadian rhythm directly governs parasympathetic tone), reducing evening alcohol (suppresses HRV for 24–48h), sustained aerobic training (zone 2 specifically), and stress reduction. A single bad night will drop your personal trend. That's normal. A sustained multi-week drop is the signal that matters.`,
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
    why: "High-sensitivity CRP is the benchmark inflammatory marker. Values above 3.0 mg/L confer 2\u00d7 the cardiovascular risk of values below 1.0 mg/L, independent of LDL cholesterol. Note: statin medications have independent anti-inflammatory effects that may suppress CRP below your true underlying inflammatory burden. If you are taking a statin, your hs-CRP reading may underestimate baseline inflammation.",
    target: "<0.5 mg/L",
    citation: "Ridker et al., NEJM 2008, Jupiter trial, n=17,802; Mensah GA et al. (incl. Ridker PM), J Am Coll Cardiol 2025 (ACC Scientific Statement)",
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
    why: "Glycated haemoglobin reflects average blood glucose over 90 days. Pre-diabetic range elevates risk of kidney disease and cardiovascular events years before diagnosis. The relationship with periodontal disease is bidirectional: poorly controlled diabetes (HbA1c >7%) increases periodontal susceptibility by 2\u20133x, while periodontal treatment has been shown to reduce HbA1c by a mean of 1% over 6 months in diabetics, a clinically meaningful reduction. Well-controlled diabetes (HbA1c <7%) is not significantly associated with increased periodontal risk.",
    target: "<5.4%",
    citation: "Selvin et al., NEJM 2010, n=11,092; Altamash M et al., J Oral Rehabil 2016, n=129 (1% HbA1c reduction from periodontal treatment)",
    tip: "If your HbA1c is in the fair-to-poor range and your oral panel shows elevated periodontal pathogens, treating the gum disease may meaningfully improve your glycemic control, not just your oral score.",
  },
  "vitamin-d": {
    why: "Vitamin D deficiency affects ~40% of Americans and is linked to elevated inflammatory cytokines, impaired sleep quality, and all-cause mortality.",
    target: "30–60 ng/mL",
    citation: "Forrest & Stuhldreher, Nutrition Research 2011, n=4,495",
  },

  // ── Oral ─────────────────────────────────────────────────────────────────
  "shannon-diversity": {
    why: "Shannon diversity measures the richness and evenness of microbial species in the oral cavity. Low diversity (dysbiosis) is the hallmark state where pathogenic species overgrow at the expense of protective ones. Approximately 50% of individual susceptibility to dysbiosis is genetic. Twin studies confirm heritability of periodontal disease risk. Low salivary flow (from stress, medications, mouth breathing, or aging) also reduces diversity. A NHANES analysis of 4,729 U.S. adults found lower oral microbiome diversity associated with higher sleep disorder risk at the population level.",
    target: "\u22653.0 index",
    citation: "Belstr\u00f8m D et al., J Oral Microbiology 2014; Twin study literature, ~50% heritability; Hao G et al., BMC Oral Health 2025, NHANES n=4,729",
  },
  "nitrate-reducing": {
    why: "Neisseria, Rothia, and Veillonella convert dietary nitrate into nitric oxide (NO), the primary vasodilator your blood vessels use to regulate blood pressure. Antiseptic mouthwash kills these bacteria, acutely impairing the NO pathway. Dry mouth (from stress, medications, mouth breathing, or aging) also depletes these bacteria by reducing the salivary flow they depend on. Emotional stress increases sympathetic tone, reducing parasympathetically-driven salivary secretion, creating a direct HRV \u2192 salivary flow \u2192 nitrate-reducer depletion pathway.",
    target: "\u22655% of reads",
    citation: "Kapil V et al., Hypertension 2015, n=300; Petersson J et al., Free Radical Biology & Medicine 2009",
    tip: "Avoid antiseptic mouthwash. Green leafy vegetables (spinach, arugula, beetroot, celery) directly feed nitrate-reducing bacteria. Stress management and adequate hydration also protect salivary flow.",
  },
  "periodontal-pathogens": {
    why: "P. gingivalis, T. denticola, and T. forsythia, the \u201cred complex\u201d periodontal pathogens, have been physically detected in human coronary artery plaques at autopsy (Hussain et al., 2023, n=1,791). They enter the bloodstream through inflamed gum tissue and trigger the same inflammatory cascade measured by your hs-CRP. P. gingivalis has also been detected in Alzheimer\u2019s disease brain tissue, with gingipain proteases implicated in neuroinflammatory cascades. Note: smokers may show low bleeding on probing despite elevated pathogen counts. Nicotine-induced vasoconstriction masks the bleeding response. Heredity accounts for approximately 50% of periodontal susceptibility (twin studies), meaning elevated pathogen load is not simply a hygiene failure.",
    target: "<0.5% of reads",
    citation: "Hussain M et al., Frontiers in Immunology 2023, n=1,791; Dominy SS et al., Science Advances 2019; Twin study literature, ~50% heritability",
    tip: "Professional dental cleaning (scaling and root planing) is the most effective intervention for reducing subgingival pathogen load. Effect is measurable within weeks in oral microbiome sequencing.",
  },
  "osa-taxa": {
    why: "People with obstructive sleep apnea are 2.46\u00d7 more likely to have periodontitis, confirmed across meta-analyses covering 88,000+ patients. OSA-related intermittent hypoxia drives oxidative stress that accelerates periodontal tissue breakdown, while elevated periodontal pathogen load raises systemic CRP, disrupting sleep architecture. Peaq tracks Prevotella and Fusobacterium abundance as a signal that this shared inflammatory pathway may be active in your oral panel.",
    target: "<1% of reads",
    citation: "Portelli et al., Dentistry Journal 2024 (meta-analysis, n=88,040); Mi et al., BMC Oral Health 2023 (Mendelian randomization); Zhu et al., Sleep and Breathing 2023 (meta-analysis, n=31,800)",
    tip: "If OSA-associated taxa are elevated alongside low HRV or SpO2 on your sleep panel, discuss sleep-disordered breathing with your physician. Professional dental cleaning reduces the periodontal pathogen load that may be driving systemic inflammation.",
  },
}

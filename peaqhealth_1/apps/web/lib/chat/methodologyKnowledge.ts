export interface MethodologyEntry {
  scoreName: string
  whatItMeasures: string
  howComputed: string
  inputs: string[]
  thresholds: string
  limitations: string
  /** Optional reference list. Not yet emitted by getMethodologyPrompt; reserved for future detail surfaces. */
  citations?: string[]
}

export const METHODOLOGY: MethodologyEntry[] = [
  {
    scoreName: "Shannon diversity index",
    whatItMeasures: "How many different bacterial species you have and how evenly they're distributed. Higher diversity = more resilient oral ecosystem.",
    howComputed: "Standard Shannon entropy formula (H' = -Σ pi × ln(pi)) applied to species-level relative abundances from 16S rRNA sequencing. Uses Zymo rarefaction-corrected values.",
    inputs: ["All species-level OTU abundances from your oral sample"],
    thresholds: "≥4.0 strong (resilient community), 3.0-4.0 watch, <3.0 attention. Population reference: mean 4.58 in US adults.",
    limitations: "Diversity alone doesn't tell you which species are present — a diverse community with many pathogens is still diverse. That's why Oravi evaluates individual species alongside diversity.",
  },
  {
    scoreName: "Nitrate-reducer composite",
    whatItMeasures: "The total abundance of bacteria that convert dietary nitrate into nitric oxide — supporting blood pressure and cardiovascular function.",
    howComputed: "Sum of five genera: Neisseria + Rothia + Haemophilus + Actinomyces + Veillonella, each measured as a percentage of total oral bacteria.",
    inputs: ["Neisseria %", "Rothia %", "Haemophilus %", "Actinomyces %", "Veillonella %"],
    thresholds: "≥20% strong, 10-20% watch, <10% attention. Individual species have their own thresholds — the composite can be strong while one species is individually low (e.g., Haemophilus sub-insight).",
    limitations: "Measures bacterial abundance, not activity. A user with strong nitrate-reducers who doesn't eat nitrate-rich foods won't get the full cardiovascular benefit.",
  },
  {
    scoreName: "Gum health composite",
    whatItMeasures: "Combined abundance of bacteria linked to gum tissue inflammation. Includes both orange-complex (early-stage) and red-complex (active) species.",
    howComputed: "Sum of seven species: Fusobacterium + Aggregatibacter + Campylobacter + Porphyromonas + Tannerella + Treponema + P. intermedia.",
    inputs: ["All seven gum-associated species percentages"],
    thresholds: "<2% strong, 2-5% watch, >5% attention. Oravi distinguishes orange-complex (early, manageable with hygiene) from red-complex (active, needs professional evaluation).",
    limitations: "Bacterial abundance doesn't equal clinical disease. Some people carry elevated gum bacteria without clinical symptoms. The bacteria indicate risk, not diagnosis.",
  },
  {
    scoreName: "Protective ratio",
    whatItMeasures: "How much your defensive bacteria outnumber cavity-makers. The ratio determines whether your enamel environment is protective or erosive.",
    howComputed: "(S. sanguinis + S. gordonii) / (S. mutans + S. sobrinus + 0.001). The 0.001 prevents division by zero when cavity-makers are absent.",
    inputs: ["S. sanguinis %", "S. gordonii %", "S. mutans %", "S. sobrinus %"],
    thresholds: "≥5× strong defense, 2-5× moderate, <2× weak defense. If no cavity-makers are detected, status is 'no cavity-makers' (positive).",
    limitations: "The ratio is a snapshot. Sugar frequency can shift the balance within days. Your pH buffering provides additional context beyond the ratio alone.",
  },
  {
    scoreName: "pH buffering ratio",
    whatItMeasures: "Whether your mouth leans acidic (erosive for enamel) or alkaline (protective). Computed from the balance between acid-producing and acid-neutralizing bacteria.",
    howComputed: "acid_sum / (acid_sum + buffer_sum + 0.001). Acid producers: Lactobacillus, Scardovia, Actinomyces (0.3×), S. mutans, S. sobrinus. Buffers: Veillonella, Neisseria, Campylobacter, S. sanguinis, S. gordonii.",
    inputs: ["All acid-producing and acid-buffering species percentages"],
    thresholds: "≤0.25 well-buffered (strong), 0.25-0.45 mildly acidogenic (watch), 0.45-0.65 moderately acidogenic, >0.65 strongly acidogenic (attention).",
    limitations: "Reflects bacterial composition, not direct pH measurement. Salivary flow, diet timing, and medications (PPIs, antihistamines) also affect oral pH independently.",
  },
  {
    scoreName: "Breath freshness score",
    whatItMeasures: "How likely your oral bacterial composition is to produce morning breath, based on VSC (volatile sulfur compound) producing species.",
    howComputed: "Weighted VSC burden from six producer species (Solobacterium 2.5×, Prevotella melaninogenica 1.5×, Peptostreptococcus 1.3×, Fusobacterium periodonticum 1.2×, Porphyromonas 1.0×, Atopobium 1.0×). Score = 100 - (vsc_burden × 8).",
    inputs: ["Six VSC-producing species percentages"],
    thresholds: "80-100 fresh (strong), 60-79 mild VSC load (strong), 40-59 moderate VSC (watch), 0-39 high VSC (attention).",
    limitations: "Measures bacterial potential for VSC production, not actual breath quality. Self-reported breath experience is more reliable than any algorithmic score. Tongue coating, hydration, and time since last meal all affect real-world breath independently.",
  },
  {
    scoreName: "Breathing pattern synthesis",
    whatItMeasures: "Whether your nighttime breathing pattern is nasal or mouth-based, using up to three independent data sources.",
    howComputed: "Evaluates questionnaire (self-reported mouth breathing), oral bacteria (Fusobacterium >1.5%, Neisseria >12%, aerobic/anaerobic ratio >3.0, aerobic shift >25%), and wearable data (when available). Two or more sources agreeing is the strongest signal.",
    inputs: ["Questionnaire: mouth_breathing field", "Oral: species-level bacterial signatures", "Wearable: respiratory rate, SpO₂ (when connected)"],
    thresholds: "Nasal (strong) when no sources flag. Watch when one or more sources flag. Two sources agreeing is labeled 'confirmed'.",
    limitations: "Without a wearable, the system relies on questionnaire and bacteria — both are indirect measures. Mouth breathing can be intermittent or positional, which bacteria may not capture from a single sample.",
  },

  // ── Caries v3 (defined in lib/oral/caries-v3.ts; not yet wired to the pipeline — see ADR-0014). ──
  {
    scoreName: "Cariogenic Load Index v3",
    whatItMeasures: "Active demineralization pressure from acid-producing oral bacteria, with synergy-aware weighting.",
    howComputed:
      "Sum of weighted abundances of primary cariogens (S. mutans, S. sobrinus, Scardovia wiggsiae, Lactobacillus at 1.0× each) plus B. dentium (0.6×, unconditional), plus conditional synergists S. sputigena (0.4×) and P. denticola (0.15×) — only contributing when S. mutans ≥ 0.05% — plus moderate-evidence species P. acidifaciens (0.3×) and Leptotrichia wadei/shahii (0.2×).",
    inputs: [
      "S. mutans relative abundance",
      "S. sobrinus",
      "Scardovia wiggsiae",
      "Lactobacillus",
      "Bifidobacterium dentium",
      "Selenomonas sputigena (conditional on S. mutans)",
      "Propionibacterium acidifaciens",
      "Leptotrichia wadei / shahii",
      "Prevotella denticola (conditional on S. mutans)",
    ],
    thresholds: "minimal < 0.2 %, low 0.2–0.5 %, elevated 0.5–1.5 %, high ≥ 1.5 %",
    limitations:
      "No 16S-based caries score has been validated in a longitudinal adult cohort with > 1 year follow-up. Weights are evidence-derived but the composite has not been externally validated. Reflects current microbial state, not lifetime risk or past disease history.",
    citations: [
      "Mazurel 2025 (J Dent Res) — S. mutans meta-analysis",
      "Cho 2023 (Nature Comm) — S. sputigena pathobiont",
      "Henne 2015 (Anaerobe) — B. dentium specificity",
      "Niu 2023 (Arch Oral Biol) — P. denticola synergy",
      "Wolff 2013 (Caries Res) — P. acidifaciens",
      "Kahharova 2023 (J Dent Res) — Leptotrichia pre-dysbiosis",
    ],
  },
  {
    scoreName: "Commensal Sufficiency Index",
    whatItMeasures: "Health of the primary acid-buffering system (arginine deiminase / ADS).",
    howComputed:
      "Sum of ADS-primary species: S. sanguinis + S. gordonii + S. cristatus. Excludes S. mitis (arginine-negative classically) and Veillonella (reclassified as pathobiont per Wei 2024).",
    inputs: [
      "S. sanguinis relative abundance",
      "S. gordonii",
      "S. cristatus",
    ],
    thresholds: "severely_depleted < 0.1 %, depleted 0.1–0.5 %, reduced 0.5–1.0 %, adequate 1.0–2.0 %, robust ≥ 2.0 %",
    limitations:
      "No published cutoff exists. Thresholds are derived from clinical correlation in pilot data and ecological theory (Marsh 2003). Severe depletion as an independent predictor of caries lacks prospective adjusted-model validation in adults.",
    citations: [
      "Huang 2015 (Caries Res) — S. sanguinis ADS prevalence",
      "Liu 2008 (Appl Environ Microbiol) — S. gordonii ADS regulation",
      "Wijeyeweera 1989 (Arch Oral Biol) — ADS > urease for plaque pH",
      "Price 1986 (J Med Microbiol) — S. mitis arginine-negative",
    ],
  },
  {
    scoreName: "pH Balance API v3",
    whatItMeasures: "Ratio of acid-producing to pH-buffering bacterial mass, evidence-tiered.",
    howComputed:
      "acidSum / (acidSum + bufferSum + 0.001). Buffer tiers: ADS-strong (S. sanguinis, S. gordonii) × 2.0; ADS-moderate (S. cristatus, S. parasanguinis, S. australis, A. naeslundii) × 1.0; urease tier (S. salivarius × 1.0, H. parainfluenzae × 0.5); nitrate-reduction tier (Neisseria, Rothia × 0.5). Veillonella excluded from buffer (reclassified as pathobiont).",
    inputs: ["All buffer-tier species", "All acidogenic species (see CLI inputs)"],
    thresholds:
      "well_buffered ≤ 0.25, mildly_acidogenic 0.25–0.45, moderately_acidogenic 0.45–0.65, strongly_acidogenic > 0.65",
    limitations:
      "Should be interpreted alongside CLI and CSI. A 'well_buffered' API with elevated CLI indicates compensated active risk, not safety. Thresholds may need recalibration as the user population grows.",
    citations: [
      "Wei 2024 (Microbiol Spectrum) — Veillonella as pathobiont",
      "Gross 2012 (PLoS One) — Veillonella predicts future caries",
      "Noorda 1988 (Caries Res) — Veillonella does not buffer",
      "Wijeyeweera 1989 — ADS > urease > nitrate hierarchy",
    ],
  },
  {
    scoreName: "Compensated Dysbiosis Flag",
    whatItMeasures: "Identifies the phenotype where pathogens are not yet elevated but defenses are compromised.",
    howComputed: "Boolean flag: TRUE when CLI is minimal/low AND CSI is depleted/severely_depleted.",
    inputs: ["Cariogenic Load Index category", "Commensal Sufficiency Index category"],
    thresholds: "TRUE = ecologically fragile state; recommend monitoring and protective interventions.",
    limitations:
      "This phenotype has not been prospectively validated as a discrete clinical entity in adults. The concept is supported by ecological theory (Marsh 2003) and pediatric longitudinal data (Kahharova 2023, Blostein 2022); adult longitudinal evidence is lacking.",
    citations: [
      "Kahharova 2023 — pre-dysbiosis precedes caries by up to 3 years",
      "Blostein 2022 — commensal depletion predicts ECC at 12 months",
      "Marsh 2003 — ecological plaque hypothesis",
    ],
  },
  {
    scoreName: "Caries Risk Category",
    whatItMeasures: "Composite caries-risk classification combining CLI, CSI, and the synergy state.",
    howComputed:
      "4-quadrant classification: low_risk_stable (CLI low + CSI robust); compensated_active_risk (CLI elevated + CSI robust); compensated_dysbiosis_risk (CLI low + CSI depleted); active_disease_risk (CLI elevated + CSI depleted). insufficient_data when neither pair holds.",
    inputs: ["CLI category", "CSI category", "Synergy active flag", "Confounder adjustments"],
    thresholds: "See category definitions above.",
    limitations:
      "Reflects current microbial state. Past disease history, salivary flow, fluoride exposure, dietary patterns, and clinical findings (DMFT) are independent risk factors not captured by microbiome alone. Not a diagnostic tool.",
    citations: ["Composite of all caries v3 underlying citations"],
  },

  // ── NR-α (ADR-0019) ───────────────────────────────────────────────────────
  {
    scoreName: "NR Capacity Index",
    whatItMeasures:
      "Total nitrate-reducing bacterial biomass weighted by per-cell nitrite-producing efficiency.",
    howComputed:
      "Tiered weighted sum. Tier 1 (×2.0): Neisseria mucosa/flavescens/subflava, Rothia mucilaginosa/dentocariosa/aeria, Actinomyces odontolyticus. Tier 2 (×1.0): H. parainfluenzae, secondary Neisseria (sicca/cinerea/elongata), A. naeslundii. Tier 3 (×0.4): Veillonella spp., other Actinomyces. Tier 4 (×0.2): Schaalia (reserved; not yet parsed).",
    inputs: [
      "Neisseria species abundances (mucosa, flavescens, subflava, other)",
      "Rothia species abundances (mucilaginosa, dentocariosa, aeria)",
      "Actinomyces species abundances (odontolyticus, naeslundii, other)",
      "H. parainfluenzae",
      "Veillonella genus total",
    ],
    thresholds:
      "depleted < 5, low 5–15, moderate 15–35, robust 35–60, exceptional > 60.",
    limitations:
      "Per-cell nitrate reductase activity varies ~15-fold across strains (Doel 2005). Sex differences in oral NR activity not captured (Kapil 2018). Total biomass predicts salivary nitrite but not necessarily plasma nitrite (Burleigh 2018 ceiling effect). Species-level Neisseria/Rothia mostly aren't parsed yet by the upload pipeline; the runner approximates from genus totals — see ADR-0019 § Known gaps.",
    citations: [
      "Doel 2005 (Eur J Oral Sci) — per-cell efficiency hierarchy",
      "Sato-Suzuki 2020 (Sci Rep) — major nitrite-producing genera",
      "Hyde 2014 — Neisseria species nitrite production",
      "L'Heureux 2023 (PLoS One) — site-specific NR localization",
    ],
  },
  {
    scoreName: "NO Signature (Vanhatalo)",
    whatItMeasures:
      "Composition pattern predicting systemic NO response to dietary nitrate intake.",
    howComputed:
      "(Rothia + Neisseria) / (Veillonella + Prevotella). Higher ratios predict greater plasma nitrite increase after nitrate intake. When both depleting genera are zero, a sentinel of 999 is stored to pin the kit to strongly_favorable while avoiding Infinity.",
    inputs: [
      "Rothia genus total",
      "Neisseria genus total",
      "Veillonella genus total",
      "Prevotella genus total",
    ],
    thresholds:
      "strongly_unfavorable < 0.25, unfavorable 0.25–0.5, moderate 0.5–1.5, favorable 1.5–3.0, strongly_favorable > 3.0.",
    limitations:
      "Derived from Vanhatalo 2018 (n=18). Composition pattern, not direct measurement. Assumes substrate is available — patients with low dietary nitrate intake may not realize the predicted NO response regardless of signature. Veillonella mass loss during upload (parser investigation pending) may shift signature upward on affected kits.",
    citations: [
      "Vanhatalo 2018 (Free Radic Biol Med) — primary signature derivation",
      "Goh 2022 (J Am Heart Assoc) — ORIGINS study (n=764) cardiometabolic validation",
      "Burleigh 2018 — salivary nitrite production correlation",
    ],
  },
  {
    scoreName: "NR Risk Category",
    whatItMeasures:
      "Composite classification of nitric oxide pathway health combining capacity and composition.",
    howComputed:
      "4-quadrant: optimal (high capacity + favorable signature); capacity_constrained (low + favorable); composition_constrained (high + unfavorable — the paradox); compromised (low + unfavorable). Falls back to insufficient_data when total NR-relevant input mass is below 1%.",
    inputs: ["NR Capacity Category", "NO Signature Category"],
    thresholds: "See category definitions above.",
    limitations:
      "The composition_constrained category is a novel framing not directly validated against clinical outcomes in adults. Mechanistically supported by Vanhatalo 2018 — Veillonella decreases with nitrate supplementation despite being a dominant NR species. Not a diagnostic for cardiovascular disease; surfaces a microbial pattern, not an outcome.",
    citations: ["All NR Capacity and NO Signature citations"],
  },
  {
    scoreName: "Periodontal Burden Index (PBI)",
    whatItMeasures:
      "Subgingival plaque-specific bacterial burden detectable in saliva — the 16S signal that tracks gum inflammation and periodontal disease.",
    howComputed:
      "Tiered weighted sum of periodontal pathogens. Tier 1 (P. gingivalis 1.0×, T. forsythia 0.9×, Treponema complex 0.8×, F. alocis 0.7×) carries highest weight based on salivary detection evidence and SMDI Gini importance rankings. Tier 2 (F. nucleatum 0.5×/0.8× contextual, P. intermedia 0.5×, S. constellatus 0.4×, P. micra 0.4×) provides secondary signal. Tier 3 includes emerging biomarkers (Mycoplasma faucium, Fretibacterium HMT-362, Treponema HMT-237) at 0.3× — Gini importance is higher than F. alocis but V3-V4 detection is unreliable, so weights are detection-limit aware. Conditional modifiers: F. alocis × P. gingivalis co-occurrence boost (1.2×, Aruni 2011 + Wang 2015); P. gingivalis × Treponema co-occurrence boost (1.2×, Hajishengallis PSD framework); F. nucleatum bridging weight increases 0.5 → 0.8 when P. gingivalis ≥ 0.5%. Stacked co-occurrence boosts capped at 1.3×. PBI is then amplified by the Commensal Depletion Modifier when defense is reduced; the modifier contribution is surfaced as a separate breakdown line item.",
    inputs: [
      "P. gingivalis %", "T. forsythia %", "Treponema (genus) %", "F. alocis %",
      "F. nucleatum %", "P. intermedia %", "S. constellatus %", "P. micra %",
      "Optional Tier 3: M. faucium, Fretibacterium, Treponema HMT-237",
    ],
    thresholds:
      "minimal < 0.5, low 0.5–1.5 (diagnostic uncertainty zone, Lee 2026 AUC 0.736 healthy-vs-Stage-I), moderate 1.5–3.0, high 3.0–6.0, severe > 6.0. Anchored to Kageyama 2017 mean periodontitis cohort SUBP 1.6 ± 1.2%, Ma 2021 cohort range 0–15.4%, Gizaw 2026 P. gingivalis gradient (4% Stage I → 17% Stage IV).",
    limitations:
      "PBI category cutoffs are derived heuristics, not externally validated. V3-V4 sequencing detects Treponema at genus level only (~20–40% relative abundance underestimation vs V1-V3 per Wade & Prosdocimi 2020). Saliva underestimates subgingival pathogen levels in absolute terms. Stage I detection accuracy is the lowest of any disease stage. F. alocis is primarily a severity marker (Stages III–IV). Versioning rule: when sequencing platform supports V1-V3 amplicon or shotgun metagenomics, Tier 3 species (Fretibacterium, Mogibacterium) shift to Tier 2.",
    citations: [
      "Kageyama 2017 (PLoS One)",
      "Ma 2021 (PLoS One)",
      "Lee 2026 (mSystems, AUC 0.924)",
      "Kageyama 2025 (Front Cell Infect Microbiol, n=2,050)",
      "Kim 2018 (PLoS One — PPI grading framework)",
      "Belstrøm 2018",
      "Ji 2023",
      "Yamaguchi 2018 — IHC tissue density",
      "Aruni 2011 — Pg-Fa coculture biology",
      "Wang 2015 — co-occurrence ecology",
      "Vashishta 2025 — F. alocis pathogenicity via TLR2",
      "Wade & Prosdocimi 2020 — V3-V4 vs V1-V3 detection",
      "He 2025",
      "Abdulkareem 2026 systematic review",
      "Hajishengallis 2014 — PSD framework",
    ],
  },
  {
    scoreName: "Periodontal Defense Index (PDI)",
    whatItMeasures:
      "Health-associated commensal bacterial scaffold integrity — the species protecting your gums.",
    howComputed:
      "Tier 1 (C. matruchotii 2.0×, S. mitis group 1.0×, S. sanguinis 1.0×, S. gordonii 1.0×) scores direct periodontal protection via biofilm architecture and ADS-mediated pH buffering. Tier 2 (Rothia 0.5×, Neisseria 0.5×, H. parainfluenzae 0.5×, A. naeslundii 0.5×, Lautropia 0.3×) covers health-associated genera that decline with periodontal severity. Many Tier 2 species are also computed in NR Capacity (NR-α) and Caries CSI (caries v3) — they are shared health markers across multiple oral health dimensions. S. mitis group computation includes cleanly-named S. mitis, S. oralis, AND any hyphenated calls containing 'mitis', 'pneumoniae', or 'oralis' identifiers (V3-V4 cannot reliably distinguish; Mark Welch 2016 functional grouping convention).",
    inputs: [
      "C. matruchotii %", "S. mitis group % (incl. hyphenated calls)", "S. sanguinis %", "S. gordonii %",
      "Rothia (total) %", "Neisseria (total) %", "H. parainfluenzae %", "A. naeslundii %", "Lautropia %",
    ],
    thresholds:
      "depleted < 8, borderline 8–15, adequate 15–28, robust > 28. Calibrated against expected baseline of 20–35 in periodontally healthy adults. Updated in v1.3 to consolidate the prior 4-band shape — 'severely_depleted' and 'depleted' both pointed at the same intervention pathway, so they collapse to a single 'depleted' label, and the prior 'depleted' band becomes 'borderline' (matching the risk-taxonomy term used elsewhere).",
    limitations:
      "PDI thresholds are derived heuristics, not externally validated. C. matruchotii detection may vary by parser configuration. Streptococcus species-level resolution is V3-V4 limited.",
    citations: [
      "Mark Welch 2016 (PNAS) — C. matruchotii corncob biofilm architecture",
      "Kageyama 2017 — health-associated taxa",
      "He 2025 — commensal absolute vs relative dynamics",
    ],
  },
  {
    scoreName: "Commensal Depletion Modifier (CDM)",
    whatItMeasures:
      "Multiplicative amplification factor applied to PBI when periodontal defense is depleted.",
    howComputed:
      "CDM_factor = MAX(1.0, MIN(1.5, 1 + ((30 − PDI) / 30) × 0.5)). Capped at 1.5 for severe depletion. The modifier contribution is surfaced as a separate breakdown line item — UI displays 'Pathogen burden 1.61 + commensal modifier ×1.20 = adjusted burden 1.94' rather than folding the modifier into a single opaque score.",
    inputs: ["PDI"],
    thresholds:
      "PDI = 30 → factor 1.0 (no amplification); PDI = 15 → factor 1.25; PDI = 0 → factor 1.5 (cap).",
    limitations:
      "The 0.5 amplification slope is a derived heuristic, not externally validated. The 30 baseline PDI is calibrated against expected healthy-adult range. Future work: validate CDM against longitudinal periodontal outcomes in the user cohort.",
    citations: [
      "He 2025 — quantitative + relative profiling rationale",
      "Hajishengallis 2014 — PSD framework establishing commensal context as disease modifier",
    ],
  },
  {
    scoreName: "Periodontal Risk Category + Red Complex Status",
    whatItMeasures:
      "4-quadrant composite classification synthesizing burden and defense, plus separate red complex detection status surfaced as a UI flag.",
    howComputed:
      "low burden + adequate/robust defense → stable_low_risk. high/severe + adequate/robust → compensated_active_burden. low + depleted → compensated_dysbiosis_risk. high/severe + depleted → active_disease_risk. moderate burden → borderline (with diagnostic uncertainty caveat). All zero inputs → insufficient_data. Red complex status is reported separately with three states: not_detected (all <0.01%), below_clinical_threshold (any 0.01–0.5%), detected (any ≥ 0.5%).",
    inputs: ["PBI category", "PDI category", "Pg %", "T. forsythia %", "Treponema %"],
    thresholds: "See PBI / PDI thresholds above. Red complex detection floor 0.01%; clinical threshold 0.5%.",
    limitations:
      "Compensated patterns (active burden with intact defense; depleted defense with low burden) are novel framings not directly validated against clinical outcomes — mechanistically supported by SUBP literature and commensal scaffold literature. Red complex presence is not added to the score because trace-level 16S calls aren't clinically reliable; patients with concerning periodontal symptoms and trace red complex signals should consider species-specific qPCR for definitive detection.",
    citations: ["Synthesizes PBI and PDI methodology citations."],
  },

  // ── Upper Airway v1 + Halitosis v2 (ADR-0025, PR-Ε). ──
  {
    scoreName: "Upper Airway Cluster (OSA screening)",
    whatItMeasures:
      "Composite upper-airway phenotype combining bacterial OSA signature (≥3/4 conjunctive), STOP-only symptom questionnaire, and nasal/sinus obstruction. SCREENING TOOL — NOT A DIAGNOSTIC.",
    howComputed:
      "Three lines of evidence run in parallel and synthesize into one of 8 tiers. Bacterial OSA features: Actinobacteria enriched (Rothia >23% OR Actinomyces >10.8%), Prevotella+Alloprevotella combined depleted (<5%), aerobic shift (Neisseria >8%), Shannon reduced (<4.0). Thresholds anchored to NHANES 2025 population means (Chaturvedi 2025, n=8,237). STOP questionnaire: 4 self-reported items (snoring, tiredness, observed apnea, hypertension) + age (≥50) + sex (male) modifiers; ≥2 indicates elevated risk per Patel 2022 (sensitivity 89%). Nasal score: combines self-reported obstruction, dry-mouth-on-waking, and sinus history. Tier classification runs peroxide gating first (acute high-dose returns tier_confounded_peroxide; chronic low-dose adds caveat). Tier 4a routes to ENT/allergy first when symptoms are present without OSA-typical bacteria.",
    inputs: [
      "Rothia (total) %", "Actinomyces (total) %", "Neisseria %",
      "Prevotella + Alloprevotella combined %", "Shannon diversity",
      "snoring_reported", "non_restorative_sleep", "osa_witnessed", "hypertension_dx",
      "age (DOB or age_range)", "biological_sex",
      "nasal_obstruction", "mouth_breathing_confirm", "sinus_history",
      "whitening_tray_last_48h / strips / professional_<7d / toothpaste_daily / peroxide_mouthwash_daily",
    ],
    thresholds:
      "Bacterial: Rothia 23.0% / Actinomyces 10.8% / Neisseria 8.0% / Prevotella combined 5.0% / Shannon 4.0. STOP score ≥2 + total score ≥4 = OSA-likely with bacterial signature. Nasal: <2 none, 2–3 mild, 4–6 moderate, ≥7 severe.",
    limitations:
      "USPSTF DISCLAIMER (always surface): This assessment is a screening tool only and does not diagnose obstructive sleep apnea (OSA) or any other medical condition. The oral microbiome analysis and questionnaire components identify patterns associated with increased OSA risk based on published research, but these associations have not been validated as a combined diagnostic tool. A diagnosis of OSA requires objective overnight sleep testing (polysomnography or home sleep apnea test) ordered and interpreted by a qualified healthcare provider. If this assessment indicates elevated risk, consultation with a physician or board-certified sleep medicine specialist is recommended. The U.S. Preventive Services Task Force has found insufficient evidence to assess the balance of benefits and harms of screening for OSA in asymptomatic adults. The ≥3/4 conjunctive bacterial logic was chosen over 2/4 to reduce false positives observed in the cohort (Pilot 3 case study). Self-reported BMI and neck circumference were excluded from the questionnaire by design — STOP-only outperforms STOP-BANG in self-administered settings (Patel 2022). Peroxide products produce reactive oxygen species that mimic the OSA bacterial signature and cannot be distinguished by composition alone; acute high-dose use returns tier_confounded_peroxide with a hard re-test deferral.",
    citations: [
      "Guo 2025 (Front Microbiol) — OSA bacterial signature meta-analysis n=2,073",
      "Li 2025 (Front Cell Infect Microbiol) — Rothia ROC analysis",
      "Chaturvedi 2025 (JAMA Network Open) — NHANES n=8,237 baseline anchors",
      "Patel 2022 (J Clin Sleep Med) — STOP 4-item validation n=14,268",
      "Mashaqi 2020 (Sleep Medicine) — biological adjunct improves AUC",
      "USPSTF — sleep apnea screening recommendation statement",
    ],
  },
  {
    scoreName: "Halitosis Mass Index (HMI v2)",
    whatItMeasures:
      "Two-pathway VSC (volatile sulfur compound) production estimate from your oral bacterial composition and lifestyle context.",
    howComputed:
      "HMI = (H2S drivers + CH3SH drivers) × protective modifier × LHM (Lifestyle Halitosis Modifier). H2S pathway weights F. nucleatum (1.0×), S. moorei (1.5×), Veillonella (0.10×, capped at absolute contribution 1.0; weight rises to 0.15× when caries dysbiosis is flagged with elevated S. mutans), Leptotrichia wadei (0.5×), Atopobium parvulum (0.5× H2S + 0.6× CH3SH dual-pathway), Selenomonas (magnitude-aware: 0.2× / 0.4× / 0.5× depending on genus total), Eubacterium sulci (0.4×, often null due to V3-V4 limit), Dialister invisus (0.3×). CH3SH pathway weights P. gingivalis (1.0×), Prevotella intermedia / nigrescens (0.8× each), Prevotella denticola (0.6×), Prevotella melaninogenica (0.2× — common commensal, lowered from earlier weights), Treponema genus (0.7×), T. forsythia (0.5×), conditional S. moorei × Pg/Td synergy (0.5× when both elevated), Eikenella corrodens (0.3×). Protective modifier (parity with perio CDM): protective_score = S. salivarius × 1.0 + Rothia × 0.5 + Haemophilus × 0.3, capped at 15. Modifier ranges 0.40 (full protection) to 1.25 (collapsed). LHM compounds lifestyle factors (mouth breathing, snoring, dry mouth on waking, smoking, GERD frequency, last dental cleaning, tongue scraping, age) capped at 1.60×. Phenotype: low_malodor when HMI < 1.0; tongue_dominant or periodontal_dominant when one pathway is 1.5× the other; otherwise borderline / mixed by HMI band.",
    inputs: [
      "8 H2S driver species + Veillonella + Selenomonas (genus)",
      "8 CH3SH driver species + Treponema (genus)",
      "Protective: S. salivarius, Rothia (total), Haemophilus",
      "Caries v3 cross-signal: compensated_dysbiosis flag + S. mutans %",
      "Lifestyle: mouth_breathing(_when), snoring_reported, smoking_status, gerd_frequency, tongue_scraping_freq, last_dental_cleaning, age, xerostomic medications",
      "Peroxide confounder: env_peroxide_flag, whitening_tray/strips/professional_<7d",
    ],
    thresholds:
      "minimal < 1.0, low 1.0–2.5, moderate 2.5–5.0, high ≥ 5.0. Phenotype dominance ratio 1.5×.",
    limitations:
      "DETECTION PANEL LIMITATIONS: We measure 9 of the 12 primary halitosis-driver species at species level. Three secondary species (E. brachy, Centipeda periodontii, Eikenella corrodens in some panels) aren't in our current detection panel. Validation against external test data shows the cumulative contribution of these missing species is typically less than 0.05 HMI points. Candida species require ITS sequencing and are out of scope for this 16S-based test. BLIND SPOTS: Your halitosis score reflects bacterial drivers detectable in saliva. It does not capture postnasal drip, GERD/reflux, tonsil stones, dietary contributors, or non-salivary sources of oral odor. If your halitosis reading is low but you experience halitosis symptoms, the cause may be one of these other factors. PEROXIDE CAVEAT: peroxide product use can artificially inflate the protective community values; the protective modifier may overstate true protective capacity until 7–14 days after the last exposure. The HMI category bands are derived heuristics anchored to NHANES population means; until N=200 internal cohort validation is complete, treat the absolute number as a research estimate and the phenotype + drivers as the primary clinical signal.",
    citations: [
      "Takeshita 2012 (Sci Rep) — H2S/CH3SH bacterial discrimination",
      "Tamahara 2025 — saliva vs tongue coating functional divergence",
      "He 2025 — quantitative + relative profiling rationale",
      "Hajishengallis 2014 — PSD framework",
    ],
  },
]

export function getMethodologyPrompt(): string {
  const lines = METHODOLOGY.map(m =>
    `${m.scoreName}: ${m.whatItMeasures} How computed: ${m.howComputed} Thresholds: ${m.thresholds} Limitations: ${m.limitations}`
  )
  return `METHODOLOGY REFERENCE (how Oravi computes scores):\n${lines.join("\n\n")}`
}

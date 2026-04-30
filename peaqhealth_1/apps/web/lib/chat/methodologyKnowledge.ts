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
]

export function getMethodologyPrompt(): string {
  const lines = METHODOLOGY.map(m =>
    `${m.scoreName}: ${m.whatItMeasures} How computed: ${m.howComputed} Thresholds: ${m.thresholds} Limitations: ${m.limitations}`
  )
  return `METHODOLOGY REFERENCE (how Oravi computes scores):\n${lines.join("\n\n")}`
}

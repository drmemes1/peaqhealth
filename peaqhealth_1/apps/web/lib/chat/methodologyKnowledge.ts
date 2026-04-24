export interface MethodologyEntry {
  scoreName: string
  whatItMeasures: string
  howComputed: string
  inputs: string[]
  thresholds: string
  limitations: string
}

export const METHODOLOGY: MethodologyEntry[] = [
  {
    scoreName: "Shannon diversity index",
    whatItMeasures: "How many different bacterial species you have and how evenly they're distributed. Higher diversity = more resilient oral ecosystem.",
    howComputed: "Standard Shannon entropy formula (H' = -Σ pi × ln(pi)) applied to species-level relative abundances from 16S rRNA sequencing. Uses Zymo rarefaction-corrected values.",
    inputs: ["All species-level OTU abundances from your oral sample"],
    thresholds: "≥4.0 strong (resilient community), 3.0-4.0 watch, <3.0 attention. Population reference: mean 4.58 in US adults.",
    limitations: "Diversity alone doesn't tell you which species are present — a diverse community with many pathogens is still diverse. That's why Cnvrg evaluates individual species alongside diversity.",
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
    thresholds: "<2% strong, 2-5% watch, >5% attention. Cnvrg distinguishes orange-complex (early, manageable with hygiene) from red-complex (active, needs professional evaluation).",
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
]

export function getMethodologyPrompt(): string {
  const lines = METHODOLOGY.map(m =>
    `${m.scoreName}: ${m.whatItMeasures} How computed: ${m.howComputed} Thresholds: ${m.thresholds} Limitations: ${m.limitations}`
  )
  return `METHODOLOGY REFERENCE (how Cnvrg computes scores):\n${lines.join("\n\n")}`
}

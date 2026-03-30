export interface ZymoReport {
  sample_id: string
  collection_date: string
  sequencing_date: string
  total_reads: number
  taxonomy: Record<string, number>
  diversity_metrics?: {
    shannon_index?: number
    observed_species?: number
    chao1?: number
  }
}

export interface SpeciesFinding {
  species: string
  abundance: number
  category: 'protective' | 'pathogenic' | 'neutral'
  significance: string
  flag: 'optimal' | 'good' | 'watch' | 'attention' | 'critical'
}

export interface OralFinding {
  id: string
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'POSITIVE'
  panel: 'nitrate' | 'periodontal' | 'osa' | 'diversity' | 'general'
  title: string
  body: string
  action: string
  impact: string
  retestDays: number
  citation: string
  mouthwashDetected?: boolean
}

export interface OralScore {
  // Panel scores (these match the parser's own scoring, separate from engine)
  total: number             // 0–25
  shannonSub: number        // 0–8
  nitrateSub: number        // 0–6
  periodontalSub: number    // 0–7
  osaSub: number            // 0–4

  // Raw measurements
  shannonDiversity: number
  nitrateReducerPct: number
  periodontalBurden: number
  osaBurden: number

  // Key species
  pGingivalisPct: number
  fNucleatumPct: number
  prevotellaPct: number

  // Inferred signals
  mouthwashDetected: boolean
  highPeriodontalRisk: boolean
  highOsaRisk: boolean
  lowDiversity: boolean

  // Species breakdown
  topSpecies: SpeciesFinding[]
  protectiveSpecies: SpeciesFinding[]
  pathogenicSpecies: SpeciesFinding[]

  // Actionability
  findings: OralFinding[]
  recommendations: string[]

  // Systemic inflammation signals (wellness framing — not disease diagnoses)
  watchSignals: {
    systemicInflammationSignal: number   // formerly alzheimersRisk — P. gingivalis elevation
    metabolicDysbiosisSignal: number     // formerly diabetesSignal
    autoimmuneInflammationSignal: number // formerly raSignal — P. gingivalis-driven inflammation
    gutOralAxisSignal: number            // formerly colorectalSignal — F. nucleatum elevation
  }

  // Protective bacteria combined %
  protectivePct: number

  // Meta
  sampleId: string
  collectionDate: string
  totalReads: number
  speciesCount: number
  engineVersion: string
}

const NITRATE_REDUCERS: Record<string, number> = {
  'Neisseria subflava': 1.0,
  'Neisseria mucosa': 1.0,
  'Neisseria flavescens': 1.0,
  'Neisseria perflava': 0.9,
  'Neisseria': 0.9,
  'Rothia mucilaginosa': 0.9,
  'Rothia dentocariosa': 0.85,
  'Rothia aeria': 0.85,
  'Rothia': 0.8,
  'Veillonella parvula': 0.7,
  'Veillonella dispar': 0.7,
  'Veillonella atypica': 0.65,
  'Veillonella': 0.65,
  'Haemophilus parainfluenzae': 0.5,
  'Haemophilus': 0.4,
  'Actinomyces naeslundii': 0.4,
  'Actinomyces viscosus': 0.35,
}

// Thresholds are in fractional abundance (0–1 scale) to match raw_otu_table values.
// Clinical equivalents: 0.001 = 0.1%, 0.005 = 0.5%, 0.010 = 1.0%
const PERIODONTAL_PATHOGENS: Record<string, { weight: number; threshold: number }> = {
  'Porphyromonas gingivalis': { weight: 3.0, threshold: 0.001 },
  'Treponema denticola': { weight: 2.0, threshold: 0.002 },
  'Tannerella forsythia': { weight: 1.5, threshold: 0.003 },
  'Fusobacterium nucleatum': { weight: 1.0, threshold: 0.010 },
  'Fusobacterium periodonticum': { weight: 0.9, threshold: 0.008 },
  'Prevotella intermedia': { weight: 0.8, threshold: 0.005 },
  'Prevotella nigrescens': { weight: 0.7, threshold: 0.005 },
  'Peptostreptococcus micros': { weight: 0.7, threshold: 0.003 },
  'Micromonas micros': { weight: 0.65, threshold: 0.003 },
  'Aggregatibacter actinomycetemcomitans': { weight: 1.2, threshold: 0.002 },
  'Eikenella corrodens': { weight: 0.5, threshold: 0.005 },
  'Campylobacter rectus': { weight: 0.6, threshold: 0.004 },
}

// Thresholds are in fractional abundance (0–1 scale).
// Clinical equivalents: 0.015 = 1.5%, 0.030 = 3.0%
const OSA_TAXA: Record<string, { weight: number; threshold: number }> = {
  'Prevotella melaninogenica': { weight: 1.5, threshold: 0.030 },
  'Prevotella pallens': { weight: 1.3, threshold: 0.020 },
  'Prevotella': { weight: 1.2, threshold: 0.030 },
  'Fusobacterium nucleatum': { weight: 1.2, threshold: 0.015 },
  'Fusobacterium': { weight: 1.0, threshold: 0.015 },
  'Selenomonas sputigena': { weight: 0.8, threshold: 0.005 },
  'Selenomonas': { weight: 0.7, threshold: 0.005 },
  'Dialister invisus': { weight: 0.6, threshold: 0.005 },
  'Dialister': { weight: 0.5, threshold: 0.005 },
  'Megasphaera micronuciformis': { weight: 0.5, threshold: 0.003 },
}

const PROTECTIVE_SPECIES: Record<string, string> = {
  'Streptococcus salivarius': 'Primary oral coloniser, inhibits pathogen adhesion',
  'Streptococcus thermophilus': 'Bacteriocin producer, suppresses S. mutans',
  'Lactobacillus salivarius': 'Acid-tolerant protector, anti-inflammatory',
  'Bifidobacterium dentium': 'Supports oral immune homeostasis',
  'Rothia mucilaginosa': 'Nitrate-reducer + anti-inflammatory, dual protective role',
  'Neisseria subflava': 'Primary nitrate-reducer, essential for NO pathway',
  'Veillonella parvula': 'Lactate metaboliser, nitrate-reducer, cross-feeds Streptococcus',
}

function calculateShannon(taxonomy: Record<string, number>): number {
  const values = Object.values(taxonomy)
  const total = values.reduce((sum, v) => sum + v, 0)
  if (total === 0) return 0
  return -values.reduce((sum, v) => {
    const p = v / total
    return p > 0 ? sum + p * Math.log(p) : sum
  }, 0)
}

function calculateNitrateReducerPct(taxonomy: Record<string, number>): number {
  let total = 0
  for (const [name, abundance] of Object.entries(taxonomy)) {
    // Check exact match first
    if (name in NITRATE_REDUCERS) {
      total += abundance
      continue
    }
    // Check if name starts with a genus that is a key in NITRATE_REDUCERS
    const genus = name.split(' ')[0]
    if (genus in NITRATE_REDUCERS) {
      total += abundance
    }
  }
  return total
}

// Periodontal burden = simple sum of all periodontal pathogen abundances (fractional 0–1)
// Downstream consumers (burdenLevel, dimensions-v2, modifiers) multiply by 100 for display
function calculatePeriodontalBurden(taxonomy: Record<string, number>): number {
  let burden = 0
  for (const [name, abundance] of Object.entries(taxonomy)) {
    if (name in PERIODONTAL_PATHOGENS) {
      burden += abundance
    }
  }
  return burden
}

// OSA burden = simple sum of all OSA-associated taxa abundances (fractional 0–1)
function calculateOsaBurden(taxonomy: Record<string, number>): number {
  let burden = 0
  for (const [name, abundance] of Object.entries(taxonomy)) {
    if (name in OSA_TAXA) {
      burden += abundance
    }
  }
  return burden
}

function scoreShannon_parser(shannon: number): number {
  if (shannon >= 3.5) return 8
  if (shannon >= 3.0) return 6
  if (shannon >= 2.5) return 4
  if (shannon >= 2.0) return 2
  return 0
}

// pct is fractional (0–1). Clinical thresholds: 0.02=2%, 0.04=4%, 0.07=7%, 0.10=10%, 0.15=15%
function scoreNitrate(pct: number): number {
  if (pct >= 0.15) return 6
  if (pct >= 0.10) return 5
  if (pct >= 0.07) return 4
  if (pct >= 0.04) return 2
  if (pct >= 0.02) return 1
  return 0
}

// burden is now simple sum of pathogen fractional abundances (0–1 scale)
// 0.01 = 1% total pathogen load, 0.05 = 5%, 0.10 = 10%
function scorePeriodontal(burden: number): number {
  if (burden < 0.005) return 7   // <0.5% — excellent
  if (burden < 0.02)  return 5   // <2%
  if (burden < 0.05)  return 3   // <5%
  if (burden < 0.10)  return 1   // <10%
  return 0                       // ≥10% — high pathogen load
}

// burden is simple sum of OSA-associated taxa fractional abundances
function scoreOsa(burden: number): number {
  if (burden < 0.02) return 4    // <2%
  if (burden < 0.05) return 3    // <5%
  if (burden < 0.10) return 1    // <10%
  return 0                       // ≥10%
}

function generateFindings(
  partial: {
    nitrateReducerPct: number
    pGingivalisPct: number
    shannonDiversity: number
    osaBurden: number
    periodontalBurden: number
  },
  _taxonomy: Record<string, number>,
): OralFinding[] {
  const findings: OralFinding[] = []
  const { nitrateReducerPct, pGingivalisPct, shannonDiversity, osaBurden, periodontalBurden } = partial

  // nitrateReducerPct and pGingivalisPct are fractional (0–1); multiply by 100 for display
  if (nitrateReducerPct < 0.02) {
    findings.push({
      id: 'mouthwash-detected',
      priority: 'HIGH',
      panel: 'nitrate',
      title: 'Antiseptic Mouthwash Detected — Nitrate Pathway Blocked',
      body: "Your nitrate-reducing bacteria are near-zero. These species — Neisseria, Rothia, Veillonella — are essential for converting dietary nitrate into nitric oxide, your body's primary vasodilator. The most common cause of this depletion is daily antiseptic mouthwash (Listerine, Scope, and similar products). Tucker 2020 (n=1,000+) found regular antiseptic mouthwash users had significantly higher rates of hypertension and diabetes.",
      action: "Consider switching to an alcohol-free or xylitol-based rinse, and consider discussing your mouthwash choices with your dentist.",
      impact: "Nitrate-reducing bacteria recover within 7–14 days. Blood pressure may decrease 2–5 mmHg.",
      retestDays: 14,
      citation: "Tucker PS, et al. Free Radical Biology & Medicine. 2020. Kapil V, et al. Hypertension. 2015.",
      mouthwashDetected: true,
    })
  }

  if (pGingivalisPct > 0.010) {
    const pct = (pGingivalisPct * 100).toFixed(2)
    findings.push({
      id: 'p-gingivalis-critical',
      priority: 'CRITICAL',
      panel: 'periodontal',
      title: 'P. gingivalis — Critical Level Detected',
      body: `Porphyromonas gingivalis is the primary inflammatory periodontal pathogen. At ${pct}% of your oral reads, it is at a clinically significant level. P. gingivalis has been directly detected inside human coronary artery plaques (Hussain 2023, n=1,791), demonstrating its ability to translocate from the oral cavity into the bloodstream and contribute to systemic inflammation. Its unique virulence factors — gingipains — enable it to evade immune clearance and dysregulate the host inflammatory response. This requires immediate attention.`,
      action: "Schedule a dental cleaning and mention this finding to your dentist. Add daily flossing or a water flosser to your routine.",
      impact: "Professional debridement + daily flossing reduces P. gingivalis by 60–80% within 90 days.",
      retestDays: 90,
      citation: "Hussain M, et al. Frontiers Immunology. 2023. Hajishengallis G. Nature Reviews Immunology. 2015.",
    })
  } else if (pGingivalisPct > 0.005) {
    const pct = (pGingivalisPct * 100).toFixed(2)
    findings.push({
      id: 'p-gingivalis-elevated',
      priority: 'HIGH',
      panel: 'periodontal',
      title: 'P. gingivalis — Elevated',
      body: `P. gingivalis at ${pct}% is above the optimal threshold of <0.1%. This organism is the primary driver of periodontal disease and systemic inflammation, and has been directly detected in coronary artery plaques in autopsy studies. Reducing its burden is your highest-priority oral health action.`,
      action: "Consider scheduling a dental cleaning and discussing this finding with your dentist. Consider adding daily flossing or a water flosser, and discuss mouthwash choices with your dentist.",
      impact: "Target <0.1% P. gingivalis within 90 days with consistent oral hygiene.",
      retestDays: 90,
      citation: "Hajishengallis G. Nature Reviews Immunology. 2015.",
    })
  }

  if (shannonDiversity < 2.5) {
    const h = shannonDiversity.toFixed(2)
    findings.push({
      id: 'low-diversity',
      priority: 'MEDIUM',
      panel: 'diversity',
      title: 'Low Oral Diversity',
      body: `Your Shannon diversity index of ${h} is below the optimal threshold of 3.0. Low oral diversity is a hallmark of dysbiosis — a state where pathogenic species can overgrow at the expense of beneficial commensals. High diversity correlates with systemic resilience, lower inflammatory burden, and better metabolic health. The average American scores 2.4–2.8; hunter-gatherer populations average 3.8–4.2.`,
      action: "Consider increasing dietary fibre from diverse plant sources and adding fermented foods to your diet. Consider discussing mouthwash choices and dietary changes with your dentist or doctor.",
      impact: "Diversity responds to diet changes within 6–8 weeks. Target Shannon ≥ 3.0.",
      retestDays: 60,
      citation: "Sonnenburg JL, et al. Cell. 2016. Sonnenburg & Sonnenburg, Cell Host & Microbe. 2019.",
    })
  }

  if (osaBurden > 2.0) {
    findings.push({
      id: 'osa-signal',
      priority: 'HIGH',
      panel: 'osa',
      title: 'Oral Microbiome Signal for Sleep Apnea',
      body: "Your oral microbiome contains an elevated abundance of taxa associated with obstructive sleep apnea. Chen et al. 2022 demonstrated that oral microbiome composition predicts OSA with an AUC of 91.9% — one of the highest predictive accuracies of any single biomarker. The OSA-enriched taxa in your sample (primarily Prevotella and Fusobacterium) thrive in the low-oxygen environment of the upper airway during apneic episodes, and also worsen airway inflammation through local immune activation.",
      action: "If you have a wearable, consider checking your SpO2 dip data for confirmation. Consider discussing mouth taping or nasal breathing techniques with your doctor. Consider asking your doctor about a sleep study if you experience daytime sleepiness, morning headaches, or snoring.",
      impact: "Nasal breathing interventions reduce OSA-associated taxa within 4–6 weeks.",
      retestDays: 45,
      citation: "Chen X, et al. mSystems. 2022. AUC 91.9%, n=156.",
    })
  }

  if (nitrateReducerPct >= 0.10) {
    const pct = (nitrateReducerPct * 100).toFixed(1)
    findings.push({
      id: 'excellent-nitrate',
      priority: 'POSITIVE',
      panel: 'nitrate',
      title: 'Excellent Nitrate-Reducing Capacity',
      body: `Your nitrate-reducing bacteria — Neisseria, Rothia, Veillonella — are thriving at ${pct}% of oral reads. These species convert dietary nitrate (from leafy greens, beetroot) into nitrite, which your body uses to produce nitric oxide — the primary vasodilator for blood pressure regulation. This is a genuine cardiovascular protective factor.`,
      action: "Consider maintaining leafy green vegetables in your diet and discussing mouthwash choices with your dentist. Beetroot or green powder before exercise may support NO production through this pathway.",
      impact: "Your NO pathway is working optimally. This directly supports healthy blood pressure.",
      retestDays: 90,
      citation: "Kapil V, et al. Hypertension. 2015. ORIGINS study, n=300.",
    })
  }

  if (pGingivalisPct < 0.0005 && periodontalBurden < 0.5) {
    findings.push({
      id: 'excellent-periodontal',
      priority: 'POSITIVE',
      panel: 'periodontal',
      title: 'Excellent Periodontal Health',
      body: "P. gingivalis is below detection threshold and your overall periodontal burden score is excellent. Frontiers in Immunology 2023 (n=1,791) detected P. gingivalis directly in coronary artery plaques — your low burden indicates a healthy inflammatory profile and reflects good oral hygiene habits.",
      action: "Consider maintaining twice-daily brushing, daily flossing, and regular dental visits. Consider discussing mouthwash choices with your dentist.",
      impact: "Continue current habits. Retest in 90 days.",
      retestDays: 90,
      citation: "Hussain M, et al. Frontiers Immunology. 2023. n=1,791.",
    })
  }

  const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, POSITIVE: 4 }
  findings.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return findings
}

// Protective bacteria — match Lactobacillus/Bifidobacterium by genus prefix, others exact
const PROTECTIVE_EXACT = new Set([
  'Streptococcus sanguinis',
  'Streptococcus salivarius',
  'Faecalibacterium prausnitzii',
])
const PROTECTIVE_GENUS_PREFIX = ['Lactobacillus', 'Bifidobacterium']

function calculateProtectivePct(taxonomy: Record<string, number>): number {
  let total = 0
  for (const [name, abundance] of Object.entries(taxonomy)) {
    if (PROTECTIVE_EXACT.has(name)) {
      total += abundance
      continue
    }
    if (PROTECTIVE_GENUS_PREFIX.some(g => name.startsWith(g))) {
      total += abundance
    }
  }
  return total
}

function calculateWatchSignals(
  taxonomy: Record<string, number>,
  periodontalBurden: number,
): OralScore['watchSignals'] {
  const pGingivalis = taxonomy['Porphyromonas gingivalis'] || 0
  const fNucleatum = taxonomy['Fusobacterium nucleatum'] || 0
  const sMutans = taxonomy['Streptococcus mutans'] || 0
  return {
    systemicInflammationSignal: Math.min(1, pGingivalis / 0.02),
    metabolicDysbiosisSignal: Math.min(1, (sMutans / 0.05) * 0.5 + (periodontalBurden / 5.0) * 0.5),
    autoimmuneInflammationSignal: Math.min(1, pGingivalis / 0.015),
    gutOralAxisSignal: Math.min(1, fNucleatum / 0.05),
  }
}

function buildTopSpecies(
  sortedSpecies: [string, number][],
  _taxonomy: Record<string, number>,
): SpeciesFinding[] {
  return sortedSpecies.map(([name, abundance]) => {
    let category: SpeciesFinding['category'] = 'neutral'
    let significance = 'Oral commensal'
    let flag: SpeciesFinding['flag'] = 'watch'

    if (name in PROTECTIVE_SPECIES) {
      category = 'protective'
      significance = PROTECTIVE_SPECIES[name]
      // Check if it's also a nitrate reducer
      const genus = name.split(' ')[0]
      if (name in NITRATE_REDUCERS || genus in NITRATE_REDUCERS) {
        flag = 'optimal'
      } else {
        flag = 'good'
      }
    } else if (name in PERIODONTAL_PATHOGENS || name in OSA_TAXA) {
      category = 'pathogenic'
      if (name in PERIODONTAL_PATHOGENS) {
        significance = 'Periodontal pathogen associated with systemic disease'
        const { threshold } = PERIODONTAL_PATHOGENS[name]
        if (name === 'Porphyromonas gingivalis' && abundance > 0.010) {
          flag = 'critical'
        } else if (abundance > threshold) {
          flag = 'attention'
        } else {
          flag = 'watch'
        }
      } else {
        significance = 'Associated with obstructive sleep apnea'
        const { threshold } = OSA_TAXA[name]
        if (abundance > threshold) {
          flag = 'attention'
        } else {
          flag = 'watch'
        }
      }
    }

    return { species: name, abundance, category, significance, flag }
  })
}

export function parseOralMicrobiome(report: ZymoReport): OralScore {
  const { taxonomy, diversity_metrics } = report

  // 1. Shannon diversity
  const shannonDiversity = diversity_metrics?.shannon_index ?? calculateShannon(taxonomy)

  // 2. Nitrate reducer percentage
  const nitrateReducerPct = calculateNitrateReducerPct(taxonomy)

  // 3. Periodontal burden
  const periodontalBurden = calculatePeriodontalBurden(taxonomy)

  // 4. OSA burden
  const osaBurden = calculateOsaBurden(taxonomy)

  // 5. Key species
  const pGingivalisPct = taxonomy['Porphyromonas gingivalis'] || 0
  const fNucleatumPct = taxonomy['Fusobacterium nucleatum'] || 0
  const prevotellaPct = Object.entries(taxonomy)
    .filter(([k]) => k.startsWith('Prevotella'))
    .reduce((sum, [, v]) => sum + v, 0)

  // 6. Sub-scores
  const shannonSub = scoreShannon_parser(shannonDiversity)
  const nitrateSub = scoreNitrate(nitrateReducerPct)
  const periodontalSub = scorePeriodontal(periodontalBurden)
  const osaSub = scoreOsa(osaBurden)
  const total = shannonSub + nitrateSub + periodontalSub + osaSub

  // 7. Inferred signals
  const mouthwashDetected = nitrateReducerPct < 0.02
  const highPeriodontalRisk = pGingivalisPct > 0.005
  const highOsaRisk = osaBurden > 2.0
  const lowDiversity = shannonDiversity < 2.5

  // 8. Partial score for findings
  const partial = { nitrateReducerPct, pGingivalisPct, shannonDiversity, osaBurden, periodontalBurden }
  const findings = generateFindings(partial, taxonomy)

  // 9. Top 3 recommendations from findings
  const recommendations = findings
    .filter(f => f.priority !== 'POSITIVE')
    .slice(0, 3)
    .map(f => f.action)

  // 10. Species breakdown
  const sortedSpecies = Object.entries(taxonomy)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  const topSpecies = buildTopSpecies(sortedSpecies, taxonomy)
  const protectiveSpecies = topSpecies.filter(s => s.category === 'protective')
  const pathogenicSpecies = topSpecies.filter(s => s.category === 'pathogenic')

  // 11. Watch signals
  const watchSignals = calculateWatchSignals(taxonomy, periodontalBurden)

  // 12. Protective bacteria combined %
  const protectivePct = calculateProtectivePct(taxonomy)

  return {
    total,
    shannonSub,
    nitrateSub,
    periodontalSub,
    osaSub,
    shannonDiversity,
    nitrateReducerPct,
    periodontalBurden,
    osaBurden,
    pGingivalisPct,
    fNucleatumPct,
    prevotellaPct,
    mouthwashDetected,
    highPeriodontalRisk,
    highOsaRisk,
    lowDiversity,
    topSpecies,
    protectiveSpecies,
    pathogenicSpecies,
    findings,
    recommendations,
    watchSignals,
    protectivePct,
    sampleId: report.sample_id,
    collectionDate: report.collection_date,
    totalReads: report.total_reads,
    speciesCount: Object.keys(taxonomy).length,
    engineVersion: '1.1',
  }
}

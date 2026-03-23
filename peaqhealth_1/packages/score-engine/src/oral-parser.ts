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

  // Watch signals
  watchSignals: {
    alzheimersRisk: number
    diabetesSignal: number
    raSignal: number
    colorectalSignal: number
  }

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

const PERIODONTAL_PATHOGENS: Record<string, { weight: number; threshold: number }> = {
  'Porphyromonas gingivalis': { weight: 3.0, threshold: 0.1 },
  'Treponema denticola': { weight: 2.0, threshold: 0.2 },
  'Tannerella forsythia': { weight: 1.5, threshold: 0.3 },
  'Fusobacterium nucleatum': { weight: 1.0, threshold: 1.0 },
  'Fusobacterium periodonticum': { weight: 0.9, threshold: 0.8 },
  'Prevotella intermedia': { weight: 0.8, threshold: 0.5 },
  'Prevotella nigrescens': { weight: 0.7, threshold: 0.5 },
  'Peptostreptococcus micros': { weight: 0.7, threshold: 0.3 },
  'Micromonas micros': { weight: 0.65, threshold: 0.3 },
  'Aggregatibacter actinomycetemcomitans': { weight: 1.2, threshold: 0.2 },
  'Eikenella corrodens': { weight: 0.5, threshold: 0.5 },
  'Campylobacter rectus': { weight: 0.6, threshold: 0.4 },
}

const OSA_TAXA: Record<string, { weight: number; threshold: number }> = {
  'Prevotella melaninogenica': { weight: 1.5, threshold: 3.0 },
  'Prevotella pallens': { weight: 1.3, threshold: 2.0 },
  'Prevotella': { weight: 1.2, threshold: 3.0 },
  'Fusobacterium nucleatum': { weight: 1.2, threshold: 1.5 },
  'Fusobacterium': { weight: 1.0, threshold: 1.5 },
  'Selenomonas sputigena': { weight: 0.8, threshold: 0.5 },
  'Selenomonas': { weight: 0.7, threshold: 0.5 },
  'Dialister invisus': { weight: 0.6, threshold: 0.5 },
  'Dialister': { weight: 0.5, threshold: 0.5 },
  'Megasphaera micronuciformis': { weight: 0.5, threshold: 0.3 },
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

function calculatePeriodontalBurden(taxonomy: Record<string, number>): number {
  let burden = 0
  for (const [name, abundance] of Object.entries(taxonomy)) {
    if (name in PERIODONTAL_PATHOGENS) {
      const { weight, threshold } = PERIODONTAL_PATHOGENS[name]
      if (abundance > threshold) {
        burden += ((abundance - threshold) / threshold) * weight
      }
    }
  }
  return burden
}

function calculateOsaBurden(taxonomy: Record<string, number>): number {
  let burden = 0
  for (const [name, abundance] of Object.entries(taxonomy)) {
    if (name in OSA_TAXA) {
      const { weight, threshold } = OSA_TAXA[name]
      if (abundance > threshold) {
        burden += ((abundance - threshold) / threshold) * weight
      }
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

function scoreNitrate(pct: number): number {
  if (pct >= 15) return 6
  if (pct >= 10) return 5
  if (pct >= 7) return 4
  if (pct >= 4) return 2
  if (pct >= 2) return 1
  return 0
}

function scorePeriodontal(burden: number): number {
  if (burden < 0.5) return 7
  if (burden < 1.5) return 5
  if (burden < 3.0) return 3
  if (burden < 5.0) return 1
  return 0
}

function scoreOsa(burden: number): number {
  if (burden < 1.0) return 4
  if (burden < 2.0) return 3
  if (burden < 3.5) return 1
  return 0
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

  if (nitrateReducerPct < 2) {
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

  if (pGingivalisPct > 1.0) {
    const pct = pGingivalisPct.toFixed(2)
    findings.push({
      id: 'p-gingivalis-critical',
      priority: 'CRITICAL',
      panel: 'periodontal',
      title: 'P. gingivalis — Critical Level Detected',
      body: `Porphyromonas gingivalis is the most systemically dangerous organism in the oral cavity. At ${pct}% of your oral reads, it is at a clinically significant level. P. gingivalis has been physically detected inside human coronary artery plaques (Hussain 2023, n=1,791) and in the brain tissue of 96% of Alzheimer's patients examined (Dominy 2019). Its unique virulence factor — gingipains — enables it to evade immune killing and translocate into the bloodstream. It also citrullinates host proteins, potentially triggering rheumatoid arthritis. This requires immediate action.`,
      action: "Consider scheduling a dental cleaning and mentioning this finding to your dentist. Consider adding daily flossing or a water flosser to your routine.",
      impact: "Professional debridement + daily flossing reduces P. gingivalis by 60–80% within 90 days.",
      retestDays: 90,
      citation: "Hussain M, et al. Frontiers Immunology. 2023. Dominy SS, et al. Science Advances. 2019.",
    })
  } else if (pGingivalisPct > 0.5) {
    const pct = pGingivalisPct.toFixed(2)
    findings.push({
      id: 'p-gingivalis-elevated',
      priority: 'HIGH',
      panel: 'periodontal',
      title: 'P. gingivalis — Elevated',
      body: `P. gingivalis at ${pct}% is above the optimal threshold of <0.1%. This organism drives periodontal disease and has been directly detected in coronary artery plaques and Alzheimer's brain tissue. While not yet at critical levels, reducing its burden is your highest-priority oral health action.`,
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

  if (nitrateReducerPct >= 10) {
    const pct = nitrateReducerPct.toFixed(1)
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

  if (pGingivalisPct < 0.05 && periodontalBurden < 0.5) {
    findings.push({
      id: 'excellent-periodontal',
      priority: 'POSITIVE',
      panel: 'periodontal',
      title: 'Excellent Periodontal Health',
      body: "P. gingivalis is below detection threshold and your overall periodontal burden score is excellent. Frontiers in Immunology 2023 (n=1,791) detected P. gingivalis directly in coronary artery plaques — your low burden is a genuine cardiovascular protective factor. This reflects good oral hygiene habits.",
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

function calculateWatchSignals(
  taxonomy: Record<string, number>,
  periodontalBurden: number,
): OralScore['watchSignals'] {
  const pGingivalis = taxonomy['Porphyromonas gingivalis'] || 0
  const fNucleatum = taxonomy['Fusobacterium nucleatum'] || 0
  const sMutans = taxonomy['Streptococcus mutans'] || 0
  return {
    alzheimersRisk: Math.min(1, pGingivalis / 2.0),
    diabetesSignal: Math.min(1, (sMutans / 5.0) * 0.5 + (periodontalBurden / 5.0) * 0.5),
    raSignal: Math.min(1, pGingivalis / 1.5),
    colorectalSignal: Math.min(1, fNucleatum / 5.0),
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
        if (name === 'Porphyromonas gingivalis' && abundance > 1.0) {
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
  const mouthwashDetected = nitrateReducerPct < 2
  const highPeriodontalRisk = pGingivalisPct > 0.5
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
    sampleId: report.sample_id,
    collectionDate: report.collection_date,
    totalReads: report.total_reads,
    speciesCount: Object.keys(taxonomy).length,
    engineVersion: '1.0',
  }
}

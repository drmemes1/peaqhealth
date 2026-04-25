export interface TopContributor {
  species: string
  displayName: string
  pct: number
  weight: number
  contribution: number
}

export interface BreathScoreResult {
  score: number | null
  baseScore: number | null
  status: "strong" | "watch" | "attention" | "no_data"
  statusText: string
  topContributors: TopContributor[]
  vscBurden: number
  modifierBreakdown?: { id: string; label: string; type: string; value: number; fired: boolean }[]
  effectiveCap?: number
}

interface SpeciesData {
  solobacteriumPct?: number | null
  prevotellaMelaninogenicaPct?: number | null
  peptostreptococcusPct?: number | null
  fusobacteriumPeriodonticumPct?: number | null
  porphyromonasPct?: number | null
  atopobiumPct?: number | null
}

const PRODUCERS: { key: keyof SpeciesData; species: string; displayName: string; weight: number }[] = [
  { key: "solobacteriumPct", species: "solobacterium_moorei", displayName: "Solobacterium moorei", weight: 2.5 },
  { key: "prevotellaMelaninogenicaPct", species: "prevotella_melaninogenica", displayName: "Prevotella melaninogenica", weight: 1.5 },
  { key: "peptostreptococcusPct", species: "peptostreptococcus", displayName: "Peptostreptococcus", weight: 1.3 },
  { key: "fusobacteriumPeriodonticumPct", species: "fusobacterium_periodonticum", displayName: "Fusobacterium periodonticum", weight: 1.2 },
  { key: "porphyromonasPct", species: "porphyromonas_gingivalis", displayName: "Porphyromonas gingivalis", weight: 1.0 },
  { key: "atopobiumPct", species: "atopobium_parvulum", displayName: "Atopobium parvulum", weight: 1.0 },
]

export function getBreathScore(species: SpeciesData, modifierResult?: { effectiveCap: number; bonusTotal: number; modifiers: { id: string; label: string; type: string; value: number; fired: boolean }[] }): BreathScoreResult {
  let hasAnyData = false
  let weightedSum = 0
  let totalWeight = 0
  const contributions: TopContributor[] = []

  for (const { key, species: sp, displayName, weight } of PRODUCERS) {
    const val = species[key]
    if (val != null) hasAnyData = true
    const pct = val ?? 0
    const contribution = pct * weight
    weightedSum += contribution
    totalWeight += weight
    contributions.push({ species: sp, displayName, pct, weight, contribution })
  }

  if (!hasAnyData) {
    return {
      score: null,
      baseScore: null,
      status: "no_data",
      statusText: "Insufficient data",
      topContributors: [],
      vscBurden: 0,
    }
  }

  const vscBurden = totalWeight > 0 ? weightedSum / totalWeight : 0
  let baseScore = Math.max(0, Math.min(100, Math.round(100 - vscBurden * 8)))

  // Apply modifiers if provided
  const effectiveCap = modifierResult?.effectiveCap ?? 100
  const bonusTotal = modifierResult?.bonusTotal ?? 0
  let score = Math.min(baseScore, effectiveCap) + bonusTotal
  score = Math.max(0, Math.min(100, Math.round(score)))

  const topContributors = contributions
    .filter(c => c.pct > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)

  // New thresholds (recalibrated for multi-factor model)
  let status: BreathScoreResult["status"]
  let statusText: string

  if (score >= 90) { status = "strong"; statusText = "Fresh" }
  else if (score >= 75) { status = "strong"; statusText = "Mild" }
  else if (score >= 60) { status = "watch"; statusText = "Moderate" }
  else if (score >= 40) { status = "watch"; statusText = "Elevated" }
  else { status = "attention"; statusText = "High VSC" }

  return {
    score, baseScore, status, statusText, topContributors, vscBurden,
    modifierBreakdown: modifierResult?.modifiers,
    effectiveCap: modifierResult?.effectiveCap,
  }
}

export function getBreathDescription(status: string): string {
  switch (status) {
    case "strong": return "Low levels of the bacteria that cause morning breath."
    case "watch": return "VSC-producing bacteria are moderately elevated."
    case "attention": return "Breath-associated bacteria notably elevated."
    case "no_data": return "Key species weren't captured in this sample."
    default: return ""
  }
}

// ── Multi-factor modifier stack (Kikuchi 2025, Popa 2025, Makeeva 2021, etc.) ──

interface ModifierInput {
  mouthBreathing?: string | null
  mouthBreathingWhen?: string | null
  stressLevel?: string | null
  gerdNocturnal?: boolean | null
  fusobacteriumPctForCorroboration?: number | null
}

interface BreathFactor {
  id: string
  multiplier: number
  label: string
  citation: string
}

function buildModifiers(q: ModifierInput | undefined): BreathFactor[] {
  if (!q) return []
  const factors: BreathFactor[] = []

  const mb = q.mouthBreathing === "confirmed" || q.mouthBreathing === "often" ||
    q.mouthBreathingWhen === "sleep_only" || q.mouthBreathingWhen === "daytime_and_sleep"
  if (mb) {
    const hasBacterialCorroboration = (q.fusobacteriumPctForCorroboration ?? 0) > 1
    factors.push({
      id: "mouth_breathing",
      multiplier: hasBacterialCorroboration ? 0.70 : 0.85,
      label: hasBacterialCorroboration ? "Nighttime mouth breathing (bacterial + questionnaire)" : "Mouth breathing (self-report)",
      citation: "Kikuchi 2025",
    })
  }

  if (q.gerdNocturnal === true) {
    factors.push({ id: "gerd", multiplier: 0.85, label: "Nocturnal reflux", citation: "Struch 2008" })
  }

  const highStress = q.stressLevel === "high" || q.stressLevel === "very_high"
  if (highStress) {
    factors.push({ id: "stress", multiplier: 0.95, label: "Elevated stress", citation: "Apessos 2020" })
  }

  return factors
}

// Legacy compat — used by oral-panel-v4
export function computeHalitosisScore(species: {
  solobacteriumPct?: number | null
  prevotellaCommensalPct?: number | null
  peptostreptococcusPct?: number | null
  fusobacteriumPct?: number | null
  porphyromonasPct?: number | null
}, questionnaire?: ModifierInput): { breathScore: number; vscBurden: number; status: "strong" | "watch" | "attention"; label: string; factors: BreathFactor[] } {
  const result = getBreathScore({
    solobacteriumPct: species.solobacteriumPct,
    prevotellaMelaninogenicaPct: species.prevotellaCommensalPct,
    peptostreptococcusPct: species.peptostreptococcusPct,
    fusobacteriumPeriodonticumPct: species.fusobacteriumPct,
    porphyromonasPct: species.porphyromonasPct,
  })

  const factors = buildModifiers(questionnaire ? {
    ...questionnaire,
    fusobacteriumPctForCorroboration: species.fusobacteriumPct,
  } : undefined)

  const multiplier = factors.reduce((m, f) => m * f.multiplier, 1.0)
  const adjustedScore = Math.max(0, Math.min(100, Math.round((result.score ?? 100) * multiplier)))

  let status: "strong" | "watch" | "attention"
  let label: string
  if (adjustedScore >= 75) { status = "strong"; label = adjustedScore >= 90 ? "Fresh" : "Mild VSC load" }
  else if (adjustedScore >= 50) { status = "watch"; label = "Moderate VSC signal" }
  else { status = "attention"; label = "Elevated VSC producers" }

  return { breathScore: adjustedScore, vscBurden: result.vscBurden, status, label, factors }
}

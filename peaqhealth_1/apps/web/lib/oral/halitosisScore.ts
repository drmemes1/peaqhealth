export interface TopContributor {
  species: string
  displayName: string
  pct: number
  weight: number
  contribution: number
}

export interface BreathScoreResult {
  score: number | null
  status: "strong" | "watch" | "attention" | "no_data"
  statusText: string
  topContributors: TopContributor[]
  vscBurden: number
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

export function getBreathScore(species: SpeciesData): BreathScoreResult {
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
      status: "no_data",
      statusText: "Insufficient data",
      topContributors: [],
      vscBurden: 0,
    }
  }

  const vscBurden = totalWeight > 0 ? weightedSum / totalWeight : 0
  const score = Math.max(0, Math.min(100, Math.round(100 - vscBurden * 8)))

  const topContributors = contributions
    .filter(c => c.pct > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)

  let status: BreathScoreResult["status"]
  let statusText: string

  if (score >= 80) { status = "strong"; statusText = "Fresh" }
  else if (score >= 60) { status = "strong"; statusText = "Mild VSC load" }
  else if (score >= 40) { status = "watch"; statusText = "Moderate VSC" }
  else { status = "attention"; statusText = "High VSC" }

  return { score, status, statusText, topContributors, vscBurden }
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

// Legacy compat — used by oral-panel-v4
export function computeHalitosisScore(species: {
  solobacteriumPct?: number | null
  prevotellaCommensalPct?: number | null
  peptostreptococcusPct?: number | null
  fusobacteriumPct?: number | null
  porphyromonasPct?: number | null
}): { breathScore: number; vscBurden: number; status: "strong" | "watch" | "attention"; label: string } {
  const result = getBreathScore({
    solobacteriumPct: species.solobacteriumPct,
    prevotellaMelaninogenicaPct: species.prevotellaCommensalPct,
    peptostreptococcusPct: species.peptostreptococcusPct,
    fusobacteriumPeriodonticumPct: species.fusobacteriumPct,
    porphyromonasPct: species.porphyromonasPct,
  })
  return {
    breathScore: result.score ?? 100,
    vscBurden: result.vscBurden,
    status: result.status === "no_data" ? "strong" : result.status,
    label: result.statusText,
  }
}

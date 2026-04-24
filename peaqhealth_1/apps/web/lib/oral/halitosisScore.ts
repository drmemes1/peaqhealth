export interface HalitosisResult {
  breathScore: number
  vscBurden: number
  status: "strong" | "watch" | "attention"
  label: string
}

interface SpeciesData {
  solobacteriumPct?: number | null
  prevotellaCommensalPct?: number | null
  peptostreptococcusPct?: number | null
  fusobacteriumPct?: number | null
  porphyromonasPct?: number | null
}

const WEIGHTS: { key: keyof SpeciesData; weight: number; label: string }[] = [
  { key: "solobacteriumPct", weight: 2.5, label: "Solobacterium" },
  { key: "prevotellaCommensalPct", weight: 1.5, label: "Prevotella" },
  { key: "peptostreptococcusPct", weight: 1.3, label: "Peptostreptococcus" },
  { key: "fusobacteriumPct", weight: 1.2, label: "Fusobacterium" },
  { key: "porphyromonasPct", weight: 1.0, label: "Porphyromonas" },
]

export function computeHalitosisScore(species: SpeciesData): HalitosisResult {
  let weightedSum = 0
  let totalWeight = 0

  for (const { key, weight } of WEIGHTS) {
    const val = species[key] ?? 0
    weightedSum += val * weight
    totalWeight += weight
  }

  const vscBurden = totalWeight > 0 ? weightedSum / totalWeight : 0
  const breathScore = Math.max(0, Math.min(100, 100 - vscBurden * 8))

  let status: HalitosisResult["status"]
  let label: string

  if (breathScore >= 80) { status = "strong"; label = "Fresh" }
  else if (breathScore >= 60) { status = "strong"; label = "Mild VSC load" }
  else if (breathScore >= 40) { status = "watch"; label = "Moderate VSC" }
  else { status = "attention"; label = "High VSC" }

  return { breathScore, vscBurden, status, label }
}

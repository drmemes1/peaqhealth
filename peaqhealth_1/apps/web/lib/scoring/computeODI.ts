/**
 * Oral Dysbiosis Index (ODI)
 *
 * Log2 ratio of disease-enriched to health-associated oral taxa.
 * Higher = more dysbiotic. See docs/INSIGHTS.md Oral Dysbiosis Index section.
 *
 * Evidence: docs/clinical-evidence-base.md → Multi-Taxa Dysbiosis Index
 *
 * Version: v1
 */

const DISEASE_ENRICHED_TAXA = [
  "Filifactor alocis",
  "Treponema socranskii",
  "Treponema vincentii",
  "Fretibacterium fastidiosum",
  "Selenomonas noxia",
  "Selenomonas infelix",
  "Selenomonas artemidis",
  "Peptostreptococcus stomatis",
  "Tannerella forsythia",
  "Porphyromonas endodontalis",
  "Porphyromonas gingivalis",
]

const DISEASE_GENUS_PREFIXES = [
  "Selenomonas ",
  "Porphyromonas ",
  "Fretibacterium ",
]

const HEALTH_TAXA = [
  "Streptococcus salivarius",
  "Streptococcus sanguinis",
  "Streptococcus gordonii",
]

const HEALTH_GENUS_PREFIXES = [
  "Capnocytophaga ",
  "Bergeyella ",
  "Haemophilus ",
]

const PSEUDOCOUNT = 1e-6

export type ODIBand = "strongly_health" | "health_leaning" | "borderline" | "dysbiotic" | "strongly_dysbiotic"

export interface ODIResult {
  odi: number
  band: ODIBand
  diseaseSum: number
  healthSum: number
  taxaUsed: { disease: string[]; health: string[] }
}

export function computeODI(otuTable: Record<string, number>): ODIResult {
  const diseaseUsed: string[] = []
  const healthUsed: string[] = []

  let diseaseSum = 0
  let healthSum = 0

  for (const [taxon, abundance] of Object.entries(otuTable)) {
    if (taxon === "__meta") continue
    const val = Number(abundance)
    if (!Number.isFinite(val) || val <= 0) continue

    const isDiseaseExact = DISEASE_ENRICHED_TAXA.some(t => taxon.toLowerCase() === t.toLowerCase())
    const isDiseaseGenus = DISEASE_GENUS_PREFIXES.some(p => taxon.startsWith(p))
    if (isDiseaseExact || isDiseaseGenus) {
      diseaseSum += val
      diseaseUsed.push(taxon)
    }

    const isHealthExact = HEALTH_TAXA.some(t => taxon.toLowerCase() === t.toLowerCase())
    const isHealthGenus = HEALTH_GENUS_PREFIXES.some(p => taxon.startsWith(p))
    if (isHealthExact || isHealthGenus) {
      healthSum += val
      healthUsed.push(taxon)
    }
  }

  const odi = Math.log2((diseaseSum + PSEUDOCOUNT) / (healthSum + PSEUDOCOUNT))

  let band: ODIBand
  if (odi < -1.0) band = "strongly_health"
  else if (odi < 0) band = "health_leaning"
  else if (odi < 1.0) band = "borderline"
  else if (odi < 2.0) band = "dysbiotic"
  else band = "strongly_dysbiotic"

  return { odi, band, diseaseSum, healthSum, taxaUsed: { disease: diseaseUsed, health: healthUsed } }
}

export function odiScoreModifier(band: ODIBand): number {
  switch (band) {
    case "strongly_health": return 3
    case "health_leaning": return 1
    case "borderline": return 0
    case "dysbiotic": return -3
    case "strongly_dysbiotic": return -6
  }
}

/**
 * Oral Dysbiosis Index (ODI)
 *
 * Log2 ratio of disease-enriched to health-associated oral taxa.
 * Higher = more dysbiotic. See docs/INSIGHTS.md Oral Dysbiosis Index section.
 *
 * Evidence: docs/clinical-evidence-base.md → Multi-Taxa Dysbiosis Index
 *
 * IMPORTANT: Only named species with published periodontitis associations
 * are included. No genus-prefix matching — uncharacterized sp-codes are
 * excluded to prevent noise from inflating the index.
 *
 * Version: v2
 */

// ── Zymo key normalization ─────────────────────────────────────────────────
// Zymo uses hyphenated compound labels like "Streptococcus salivarius-vestibularis-sp4753"
// We need to match the primary species name before the first hyphen.

function normalizeZymoKey(key: string): string[] {
  const candidates = [key]
  const hyphenIdx = key.indexOf("-")
  if (hyphenIdx > 0) {
    const parts = key.split(" ")
    if (parts.length >= 2) {
      const genus = parts[0]
      const speciesRaw = parts.slice(1).join(" ")
      const primarySpecies = speciesRaw.split("-")[0]
      if (primarySpecies && primarySpecies !== speciesRaw) {
        candidates.push(`${genus} ${primarySpecies}`)
      }
    }
  }
  return candidates
}

// ── Evidence-validated taxa only ───────────────────────────────────────────
// Each entry has a published periodontitis association. No sp-codes or
// uncharacterized HOMD entries.

const DISEASE_ENRICHED_TAXA = new Set([
  "filifactor alocis",
  "treponema socranskii",
  "treponema vincentii",
  "fretibacterium fastidiosum",
  "selenomonas noxia",
  "selenomonas infelix",
  "selenomonas artemidis",
  "peptostreptococcus stomatis",
  "peptostreptococcus anaerobius",
  "tannerella forsythia",
  "porphyromonas endodontalis",
  "porphyromonas gingivalis",
])

const HEALTH_ASSOCIATED_TAXA = new Set([
  "streptococcus salivarius",
  "streptococcus sanguinis",
  "streptococcus gordonii",
  "capnocytophaga ochracea",
  "capnocytophaga gingivalis",
  "capnocytophaga granulosa",
  "capnocytophaga leadbetteri",
  "capnocytophaga sputigena",
  "bergeyella cardium",
  "haemophilus parainfluenzae",
  "haemophilus haemolyticus",
  "haemophilus pittmaniae",
])

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

    const candidates = normalizeZymoKey(taxon)

    for (const candidate of candidates) {
      const lower = candidate.toLowerCase()
      if (DISEASE_ENRICHED_TAXA.has(lower)) {
        diseaseSum += val
        diseaseUsed.push(taxon)
        break
      }
      if (HEALTH_ASSOCIATED_TAXA.has(lower)) {
        healthSum += val
        healthUsed.push(taxon)
        break
      }
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

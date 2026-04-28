// Translocation risk indicator — weighted indicator of oral bacteria
// reported in literature to translocate to gut and associate with extra-oral
// conditions. NOT a diagnosis. See ADR-0009.

export type TranslocationLevel = "low" | "moderate" | "elevated"
export type TranslocationStatus = "strong" | "watch" | "attention"

export interface TranslocationResult {
  score: number
  level: TranslocationLevel
  status: TranslocationStatus
  contributions: {
    fNucleatum: number
    pGingivalis: number
    fusobacteriumGenus: number
  }
}

export interface TranslocationInputs {
  fNucleatumPct: number | null
  pGingivalisPct: number | null
  fusobacteriumPct: number | null
}

export function computeTranslocation(i: TranslocationInputs): TranslocationResult {
  const fNuc = (i.fNucleatumPct ?? 0) * 2.0
  const pGin = (i.pGingivalisPct ?? 0) * 1.5
  const fGen = (i.fusobacteriumPct ?? 0) * 0.5
  const score = fNuc + pGin + fGen

  let level: TranslocationLevel
  if (score < 1.5) level = "low"
  else if (score < 3.5) level = "moderate"
  else level = "elevated"

  const status: TranslocationStatus =
    level === "low" ? "strong" : level === "moderate" ? "watch" : "attention"

  return { score, level, status, contributions: { fNucleatum: fNuc, pGingivalis: pGin, fusobacteriumGenus: fGen } }
}

export const TRANSLOCATION_LEVEL_LABELS: Record<TranslocationLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  elevated: "Elevated",
}

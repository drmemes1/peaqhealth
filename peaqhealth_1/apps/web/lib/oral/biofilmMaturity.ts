// Biofilm maturity pattern — ratio of late vs early Socransky-style colonizers.
// See ADR-0008.

export type BiofilmStage = "immature" | "developing" | "mature" | "advanced"
export type BiofilmStatus = "strong" | "watch" | "attention"

export interface BiofilmMaturityResult {
  ratio: number
  stage: BiofilmStage
  status: BiofilmStatus
  earlyTotalPct: number
  lateTotalPct: number
}

export interface BiofilmMaturityInputs {
  streptococcusPct: number | null
  actinomycesPct: number | null
  porphyromonasPct: number | null
  treponemaPct: number | null
  tannerellaPct: number | null
}

export function computeBiofilmMaturity(i: BiofilmMaturityInputs): BiofilmMaturityResult {
  const early = (i.streptococcusPct ?? 0) + (i.actinomycesPct ?? 0)
  const late = (i.porphyromonasPct ?? 0) + (i.treponemaPct ?? 0) + (i.tannerellaPct ?? 0)
  const ratio = late / (early + 0.001)

  let stage: BiofilmStage
  if (ratio < 0.05) stage = "immature"
  else if (ratio < 0.15) stage = "developing"
  else if (ratio < 0.30) stage = "mature"
  else stage = "advanced"

  const status: BiofilmStatus =
    stage === "immature" ? "strong"
    : stage === "developing" ? "watch"
    : stage === "mature" ? "watch"
    : "attention"

  return { ratio, stage, status, earlyTotalPct: early, lateTotalPct: late }
}

export const BIOFILM_STAGE_LABELS: Record<BiofilmStage, string> = {
  immature: "Immature",
  developing: "Developing",
  mature: "Mature",
  advanced: "Advanced",
}

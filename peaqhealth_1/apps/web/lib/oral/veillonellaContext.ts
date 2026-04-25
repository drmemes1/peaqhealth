import { ORAL_THRESHOLDS } from "./thresholds"

export type VeillonellaState = "stable" | "flagged" | "shifted"
export type CompoundingPattern = "cariogenic_synergy" | "halitosis_contribution" | "inflammatory_burden"

export interface VeillonellaReading {
  abundance: number
  state: VeillonellaState
  firedPatterns: CompoundingPattern[]
  flagLabel: string | null
  flagTooltip: string | null
  relatedCard: string | null
}

export function computeVeillonellaContext(data: {
  veillonella: number
  sMutans: number
  breathFreshness: number | null
  shannonDiversity: number
}): VeillonellaReading {
  const patterns: CompoundingPattern[] = []
  const v = ORAL_THRESHOLDS.veillonella

  const carioThresh = v.cariogenic_synergy as { veillonella_threshold: number; s_mutans_threshold: number }
  if (data.veillonella >= carioThresh.veillonella_threshold && data.sMutans >= carioThresh.s_mutans_threshold) {
    patterns.push("cariogenic_synergy")
  }

  const haliThresh = v.halitosis_contribution as { veillonella_threshold: number; breath_freshness_threshold: number }
  if (data.veillonella >= haliThresh.veillonella_threshold && data.breathFreshness != null && data.breathFreshness < haliThresh.breath_freshness_threshold) {
    patterns.push("halitosis_contribution")
  }

  const inflThresh = v.inflammatory_burden as { veillonella_threshold: number; shannon_threshold: number }
  if (data.veillonella >= inflThresh.veillonella_threshold && data.shannonDiversity < inflThresh.shannon_threshold) {
    patterns.push("inflammatory_burden")
  }

  let state: VeillonellaState
  if (patterns.length === 0) state = "stable"
  else if (patterns.length === 1) state = "flagged"
  else state = "shifted"

  const flagMap: Record<CompoundingPattern, { label: string; tooltip: string; relatedCard: string }> = {
    cariogenic_synergy: { label: "Cavity context", tooltip: "Veillonella combined with S. mutans — see your cavity risk card", relatedCard: "cavity-risk" },
    halitosis_contribution: { label: "Halitosis", tooltip: "Veillonella may be contributing to your VSC signal — see breath freshness", relatedCard: "breath-freshness" },
    inflammatory_burden: { label: "Inflammation", tooltip: "Pattern consistent with elevated inflammatory state", relatedCard: "methodology" },
  }

  const primary = patterns[0] ?? null

  return {
    abundance: data.veillonella,
    state,
    firedPatterns: patterns,
    flagLabel: primary ? flagMap[primary].label : null,
    flagTooltip: primary ? flagMap[primary].tooltip : null,
    relatedCard: primary ? flagMap[primary].relatedCard : null,
  }
}

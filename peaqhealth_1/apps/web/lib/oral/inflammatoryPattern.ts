// Inflammatory pattern signal — ratio of bacteria associated with
// inflammatory states in published research vs an anti-inflammatory baseline.
// NOT a diagnosis of inflammation. See ADR-0010.

export type InflammatoryLevel = "not_present" | "subtle" | "marked"
export type InflammatoryStatus = "strong" | "watch" | "attention"

export interface InflammatoryPatternResult {
  signal: number
  level: InflammatoryLevel
  status: InflammatoryStatus
  inflammatoryTotalPct: number
  baselineTotalPct: number
}

export interface InflammatoryPatternInputs {
  prevotellaPct: number | null
  veillonellaPct: number | null
  neisseriaPct: number | null
  haemophilusPct: number | null
}

export function computeInflammatoryPattern(i: InflammatoryPatternInputs): InflammatoryPatternResult {
  const inflammatory = (i.prevotellaPct ?? 0) + (i.veillonellaPct ?? 0)
  const baseline = (i.neisseriaPct ?? 0) + (i.haemophilusPct ?? 0) + 0.1
  const signal = inflammatory / baseline

  let level: InflammatoryLevel
  if (signal < 0.5) level = "not_present"
  else if (signal < 1.5) level = "subtle"
  else level = "marked"

  const status: InflammatoryStatus =
    level === "not_present" ? "strong" : level === "subtle" ? "watch" : "attention"

  return { signal, level, status, inflammatoryTotalPct: inflammatory, baselineTotalPct: baseline }
}

export const INFLAMMATORY_LEVEL_LABELS: Record<InflammatoryLevel, string> = {
  not_present: "Not present",
  subtle: "Subtle",
  marked: "Marked",
}

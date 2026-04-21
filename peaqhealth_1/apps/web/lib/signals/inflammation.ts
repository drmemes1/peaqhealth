import type { UserPanelContext } from "../user-context"

export interface InflammationSignal {
  headline: string
  confidence: "high" | "moderate" | "low" | "pending"
  sources: ("blood" | "oral")[]
  hsCrpValue: number | null
  gumBacteriaElevated: boolean
}

export function getInflammationSignal(ctx: UserPanelContext): InflammationSignal {
  const sources: InflammationSignal["sources"] = []
  const hsCrp = ctx.bloodPanel?.hsCrp ?? null
  if (hsCrp != null) sources.push("blood")

  const gumTotal = ctx.oralKit?.gumHealthTotal ?? 0
  const gumElevated = ctx.hasOralKit && gumTotal > 2
  if (ctx.hasOralKit) sources.push("oral")

  if (sources.length === 0) {
    return { headline: "Not yet measured", confidence: "pending", sources: [], hsCrpValue: null, gumBacteriaElevated: false }
  }

  if (hsCrp != null && hsCrp > 1 && gumElevated) {
    return {
      headline: "Inflammation showing in both panels",
      confidence: "high",
      sources,
      hsCrpValue: hsCrp,
      gumBacteriaElevated: true,
    }
  }

  if (hsCrp != null && hsCrp > 1) {
    return { headline: "Blood inflammation above typical", confidence: "moderate", sources, hsCrpValue: hsCrp, gumBacteriaElevated: false }
  }

  if (gumElevated) {
    return {
      headline: "Gum bacteria above typical",
      confidence: ctx.bloodPanel && hsCrp == null ? "low" : "moderate",
      sources,
      hsCrpValue: null,
      gumBacteriaElevated: true,
    }
  }

  return { headline: "Inflammation signals within range", confidence: "moderate", sources, hsCrpValue: hsCrp, gumBacteriaElevated: false }
}

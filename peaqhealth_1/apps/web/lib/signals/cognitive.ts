import type { UserPanelContext } from "../user-context"

export interface CognitiveSignal {
  headline: string
  confidence: "high" | "moderate" | "low" | "pending"
  sources: string[]
  flagCount: number
  flags: string[]
  verdict: "strong" | "watch" | "watch_closely" | "pending"
}

export function getCognitiveSignal(ctx: UserPanelContext): CognitiveSignal {
  const q = ctx.questionnaire
  if (!q) return { headline: "Not yet measured", confidence: "pending", sources: [], flagCount: 0, flags: [], verdict: "pending" }

  const flags: string[] = []
  const occ = (v: string | null) => v === "occasionally" || v === "often" || v === "almost_always" || v === "most_mornings" || v === "most_days"

  if (occ(q.daytimeCognitiveFog)) flags.push("Daytime cognitive fog")
  if (occ(q.morningHeadaches)) flags.push("Morning headaches")
  if (occ(q.nonRestorativeSleep)) flags.push("Non-restorative sleep")
  if (occ(q.daytimeFatigue)) flags.push("Daytime fatigue")

  return {
    headline: flags.length === 0 ? "No cognitive flags" : `${flags.length} occasional signal${flags.length > 1 ? "s" : ""}`,
    confidence: flags.length >= 3 ? "high" : flags.length >= 1 ? "moderate" : "low",
    sources: ["questionnaire"],
    flagCount: flags.length,
    flags,
    verdict: flags.length >= 3 ? "watch_closely" : flags.length >= 2 ? "watch" : flags.length === 0 ? "strong" : "watch",
  }
}

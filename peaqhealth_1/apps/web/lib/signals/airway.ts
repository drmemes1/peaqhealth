import type { UserPanelContext } from "../user-context"

export interface AirwaySignal {
  headline: string
  confidence: "high" | "moderate" | "low" | "pending"
  sources: string[]
  flagCount: number
  flags: string[]
  verdict: "strong" | "watch" | "watch_closely" | "pending"
}

export function getAirwaySignal(ctx: UserPanelContext): AirwaySignal {
  const q = ctx.questionnaire
  if (!q) return { headline: "Not yet measured", confidence: "pending", sources: [], flagCount: 0, flags: [], verdict: "pending" }

  const flags: string[] = []
  const freq = (v: string | null) => v === "often" || v === "chronic" || v === "frequent" || v === "almost_always"
  const occ = (v: string | null) => v === "occasionally" || v === "occasional" || v === "sometimes" || freq(v)

  if (occ(q.snoringReported)) flags.push("Snoring")
  if (occ(q.nasalObstruction) || q.nasalObstructionSeverity === "moderate" || q.nasalObstructionSeverity === "severe") flags.push("Nasal obstruction")
  if (occ(q.morningHeadaches)) flags.push("Morning headaches")
  if (q.sinusHistory && q.sinusHistory !== "none") flags.push("Sinus history")
  if (occ(q.osaWitnessed) || q.osaWitnessed === "yes") flags.push("Witnessed breathing pauses")
  if (q.bmiCalculated != null && q.bmiCalculated > 30) flags.push("BMI above 30")

  const freqCount = [q.snoringReported, q.nasalObstruction, q.morningHeadaches].filter(freq).length

  return {
    headline: flags.length === 0 ? "No airway flags" : `${flags.length} signal${flags.length > 1 ? "s" : ""} flagged`,
    confidence: flags.length >= 3 ? "high" : flags.length >= 1 ? "moderate" : "low",
    sources: ["questionnaire"],
    flagCount: flags.length,
    flags,
    verdict: freqCount >= 2 || flags.length >= 4 ? "watch_closely" : flags.length >= 2 ? "watch" : flags.length === 0 ? "strong" : "watch",
  }
}

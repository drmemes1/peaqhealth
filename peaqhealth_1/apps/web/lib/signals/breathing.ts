import type { UserPanelContext } from "../user-context"

export interface BreathingSignal {
  headline: string
  confidence: "high" | "moderate" | "low" | "pending"
  sources: ("wearable" | "questionnaire" | "oral")[]
  explanation: string
}

export function getBreathingSignal(ctx: UserPanelContext): BreathingSignal {
  const wearableSuggests = ctx.sleepData?.breathingRateAvg != null && ctx.sleepData.breathingRateAvg > 17
  const questionnaireSuggests = ctx.questionnaire?.mouthBreathing === "confirmed" || ctx.questionnaire?.mouthBreathing === "often" ||
    ctx.questionnaire?.mouthBreathingWhen === "sleep_only" || ctx.questionnaire?.mouthBreathingWhen === "daytime_and_sleep"
  const oralSuggests = ctx.oralKit?.envPattern === "mouth_breathing" || ctx.oralKit?.envPattern === "mixed"

  const sources: BreathingSignal["sources"] = []
  if (ctx.hasWearable && ctx.sleepData) sources.push("wearable")
  if (ctx.hasQuestionnaire && ctx.questionnaire?.mouthBreathing != null) sources.push("questionnaire")
  if (ctx.hasOralKit && ctx.oralKit?.envPattern != null) sources.push("oral")

  const positives = [wearableSuggests, questionnaireSuggests, oralSuggests].filter(Boolean).length

  if (positives >= 2) {
    return {
      headline: "Mouth breathing suggested",
      confidence: sources.length === 3 ? "high" : "moderate",
      sources,
      explanation: `Based on ${sources.join(" + ")} — ${positives} of ${sources.length} signals align`,
    }
  }

  if (positives === 1) {
    const which = wearableSuggests ? "wearable" : questionnaireSuggests ? "questionnaire" : "oral"
    return {
      headline: "One signal suggests mouth breathing",
      confidence: "low",
      sources,
      explanation: `Your ${which} data points toward mouth breathing. Additional data sources would help confirm.`,
    }
  }

  if (sources.length === 0) {
    return { headline: "Not yet measured", confidence: "pending", sources: [], explanation: "Your questionnaire, wearable, and oral sample will each add a layer." }
  }

  return { headline: "No breathing pattern detected", confidence: "moderate", sources, explanation: "Your available data does not show a mouth breathing pattern." }
}

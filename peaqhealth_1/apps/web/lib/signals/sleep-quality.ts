import type { UserPanelContext } from "../user-context"

export interface SleepQualitySignal {
  headline: string
  confidence: "high" | "moderate" | "low" | "pending"
  sources: ("wearable" | "questionnaire")[]
  hoursEstimate: number | null
  qualityVerdict: "good" | "watch" | "concern" | null
}

export function getSleepQualitySignal(ctx: UserPanelContext): SleepQualitySignal {
  const sources: SleepQualitySignal["sources"] = []
  if (ctx.hasWearable && ctx.sleepData?.totalSleepMin != null) sources.push("wearable")
  if (ctx.hasQuestionnaire && ctx.questionnaire?.nonRestorativeSleep != null) sources.push("questionnaire")

  if (sources.length === 0) {
    return { headline: "Not yet measured", confidence: "pending", sources: [], hoursEstimate: null, qualityVerdict: null }
  }

  const wearableHrs = ctx.sleepData?.totalSleepMin != null ? ctx.sleepData.totalSleepMin / 60 : null
  const qNonRestorative = ctx.questionnaire?.nonRestorativeSleep === "often" || ctx.questionnaire?.nonRestorativeSleep === "almost_always"
  const qFatigued = ctx.questionnaire?.daytimeFatigue === "moderate" || ctx.questionnaire?.daytimeFatigue === "severe"

  const hrs = wearableHrs
  let verdict: SleepQualitySignal["qualityVerdict"] = null

  if (hrs != null) {
    verdict = hrs >= 7 && hrs <= 9 ? "good" : hrs >= 6 ? "watch" : "concern"
    if (qNonRestorative && verdict === "good") verdict = "watch"
  } else if (qNonRestorative || qFatigued) {
    verdict = "watch"
  }

  const headline = verdict === "good" ? "Sleep looks solid" : verdict === "watch" ? "Sleep worth watching" : verdict === "concern" ? "Sleep patterns need attention" : "Gathering sleep data"

  return {
    headline,
    confidence: sources.length >= 2 ? "high" : "moderate",
    sources,
    hoursEstimate: hrs != null ? parseFloat(hrs.toFixed(1)) : null,
    qualityVerdict: verdict,
  }
}

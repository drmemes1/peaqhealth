import type { UserPanelContext } from "../user-context"

export interface SleepDurationSignal {
  headline: string
  hoursLabel: string
  confidence: "high" | "moderate" | "low" | "pending"
  sources: string[]
  verdict: "strong" | "watch" | "watch_closely" | "pending"
}

const DURATION_MAP: Record<string, { label: string; hrs: number }> = {
  lt6: { label: "< 6 hrs", hrs: 5.5 },
  "6to7": { label: "6–7 hrs", hrs: 6.5 },
  "7to8": { label: "7–8 hrs", hrs: 7.5 },
  gt8: { label: "8+ hrs", hrs: 8.5 },
}

export function getSleepDurationSignal(ctx: UserPanelContext): SleepDurationSignal {
  if (ctx.sleepData?.totalSleepMin != null) {
    const hrs = ctx.sleepData.totalSleepMin / 60
    return {
      headline: `${hrs.toFixed(1)} hrs average`,
      hoursLabel: `${hrs.toFixed(1)} hrs`,
      confidence: "high",
      sources: ["wearable"],
      verdict: hrs >= 7 && hrs <= 9 ? "strong" : hrs >= 6 ? "watch" : "watch_closely",
    }
  }

  const dur = ctx.questionnaire?.sleepDuration
  if (!dur) return { headline: "Not yet measured", hoursLabel: "—", confidence: "pending", sources: [], verdict: "pending" }

  const mapped = DURATION_MAP[dur]
  if (!mapped) return { headline: dur, hoursLabel: dur, confidence: "low", sources: ["questionnaire"], verdict: "watch" }

  return {
    headline: `${mapped.label} (self-reported)`,
    hoursLabel: mapped.label,
    confidence: "moderate",
    sources: ["questionnaire"],
    verdict: mapped.hrs >= 7 && mapped.hrs <= 9 ? "strong" : mapped.hrs >= 6 ? "watch" : "watch_closely",
  }
}

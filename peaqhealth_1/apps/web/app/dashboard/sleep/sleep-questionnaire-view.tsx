"use client"

import { useState } from "react"
import Link from "next/link"
import { SectionHeader, CategoryCard } from "../../components/panels"
import { BreathingIcon, DiversityIcon } from "../../components/panels/icons"
import type { UserPanelContext } from "../../../lib/user-context"
import { getBreathingSignal } from "../../../lib/signals/breathing"
import { getSleepQualitySignal } from "../../../lib/signals/sleep-quality"
import { getAirwaySignal } from "../../../lib/signals/airway"
import { getCognitiveSignal } from "../../../lib/signals/cognitive"
import { getSleepDurationSignal } from "../../../lib/signals/sleep-duration"

const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
const serif = "'Cormorant Garamond', Georgia, serif"
const STATUS_COLORS = { good: "#1A8C4E", watch: "#B8860B", concern: "#A84D4D", info: "rgba(184,134,11,0.6)", mixed: "#B8860B", pending: "#C8C6BE" } as const

type Status = "good" | "watch" | "concern" | "info" | "mixed" | "pending"
function verdictToStatus(v: string): Status {
  return v === "strong" ? "good" : v === "watch" ? "watch" : v === "watch_closely" ? "concern" : v === "attention" ? "concern" : "pending"
}

export default function SleepQuestionnaireView({ ctx }: { ctx: UserPanelContext }) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const toggleRow = (row: number) => setExpandedRow(r => r === row ? null : row)

  const breathing = getBreathingSignal(ctx)
  const sleepQuality = getSleepQualitySignal(ctx)
  const duration = getSleepDurationSignal(ctx)
  const airway = getAirwaySignal(ctx)
  const cognitive = getCognitiveSignal(ctx)

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 24px 80px", background: "#F5F3EE" }}>
      <SectionHeader title="Sleep" subtitle="Based on your questionnaire and oral data. Connect a wearable for objective measurements." />
      <div style={{ marginBottom: 16 }}>
        <Link href="/settings" style={{ fontFamily: sans, fontSize: 12, color: "#B8860B", letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none" }}>
          Connect wearable →
        </Link>
      </div>

      <div className="sleep-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32 }}>

        {/* 1. Breathing Pattern */}
        <CategoryCard
          expanded={expandedRow === 0} onToggle={() => toggleRow(0)}
          icon={<BreathingIcon color={STATUS_COLORS[verdictToStatus(breathing.confidence === "pending" ? "pending" : breathing.headline.includes("No") ? "strong" : "watch")]} />}
          name="Breathing pattern"
          description="Cross-panel signal from questionnaire and oral bacteria"
          contextStrip={breathing.sources.join(" + ") || "Pending"}
          value={breathing.headline}
          status={breathing.confidence === "pending" ? "pending" : breathing.headline.includes("No") ? "good" : "mixed"}
          statusLabel={`${breathing.confidence.toUpperCase()} · ${breathing.sources.length} of 3 signals`}
          narrative={{ paragraph: breathing.explanation }}
          dataShows={ctx.oralKit?.envPattern ? `Your oral bacteria show a "${ctx.oralKit.envPattern.replace(/_/g, " ")}" pattern. Aerobic shift at ${ctx.oralKit.envAerobicScorePct?.toFixed(1) ?? "—"}%, anaerobic load at ${ctx.oralKit.envAnaerobicLoadPct?.toFixed(1) ?? "—"}%.` : undefined}
        />

        {/* 2. Sleep Duration */}
        <CategoryCard
          expanded={expandedRow === 0} onToggle={() => toggleRow(0)}
          icon={<DiversityIcon color={STATUS_COLORS[verdictToStatus(duration.verdict)]} />}
          name="Sleep duration"
          description="How many hours you're sleeping per night"
          value={duration.hoursLabel}
          status={verdictToStatus(duration.verdict)}
          statusLabel={duration.verdict === "strong" ? "Strong" : duration.verdict === "watch" ? "Watch · below 7 hrs" : duration.verdict === "watch_closely" ? "Watch closely · under 6 hrs" : undefined}
          narrative={{ paragraph: duration.headline.includes("Not") ? "Complete your questionnaire to see your sleep duration here." : `You report sleeping ${duration.hoursLabel} per night. Most adults need 7–9 hours for optimal recovery. Shorter sleep associates with higher inflammation and reduced HRV in population research.` }}
        />

        {/* 3. Sleep Quality */}
        <CategoryCard
          expanded={expandedRow === 1} onToggle={() => toggleRow(1)}
          icon={<DiversityIcon color={STATUS_COLORS[sleepQuality.qualityVerdict === "good" ? "good" : sleepQuality.qualityVerdict === "watch" ? "watch" : sleepQuality.qualityVerdict === "concern" ? "concern" : "pending"]} />}
          name="Sleep quality"
          description="How restorative your sleep feels"
          value={sleepQuality.headline}
          status={sleepQuality.qualityVerdict === "good" ? "good" : sleepQuality.qualityVerdict === "watch" ? "watch" : sleepQuality.qualityVerdict === "concern" ? "concern" : "pending"}
          statusLabel={sleepQuality.confidence !== "pending" ? `${sleepQuality.confidence.toUpperCase()} · ${sleepQuality.sources.join(" + ")}` : undefined}
          narrative={{ paragraph: ctx.questionnaire?.nonRestorativeSleep === "often" || ctx.questionnaire?.nonRestorativeSleep === "almost_always" ? "You report frequently waking up feeling unrefreshed despite sleeping adequate hours. This pattern often points to disrupted sleep architecture — your body may not be reaching enough deep or REM sleep." : "Your self-reported sleep quality gives us a baseline. Adding a wearable would show whether your deep sleep and REM percentages match how you feel." }}
        />

        {/* 4. Airway Signals */}
        <CategoryCard
          expanded={expandedRow === 1} onToggle={() => toggleRow(1)}
          icon={<BreathingIcon color={STATUS_COLORS[verdictToStatus(airway.verdict)]} />}
          name="Airway signals"
          description="Snoring, nasal obstruction, and related patterns"
          value={airway.headline}
          status={verdictToStatus(airway.verdict)}
          statusLabel={airway.flagCount > 0 ? `${airway.flags.length} flag${airway.flags.length > 1 ? "s" : ""}` : "Clear"}
          narrative={{ paragraph: airway.flags.length > 0 ? `Your questionnaire flags: ${airway.flags.join(", ")}. These often appear together in people with nighttime airway changes. Addressing nasal breathing can shift several of these.` : "No airway signals flagged in your questionnaire. This is a positive finding." }}
        />

        {/* 5. Autonomic / Stress */}
        <CategoryCard
          expanded={expandedRow === 2} onToggle={() => toggleRow(2)}
          icon={<DiversityIcon color={STATUS_COLORS["pending"]} />}
          name="Recovery & stress"
          description="HRV, resting heart rate, and stress patterns"
          value={ctx.questionnaire?.stressLevel ?? "—"}
          status={ctx.questionnaire?.stressLevel ? "info" : "pending"}
          statusLabel={ctx.hasWearable ? undefined : "Wearable needed for HRV"}
          narrative={{ paragraph: "HRV and resting heart rate require a wearable to measure objectively. Your self-reported stress level gives context, but connecting a wearable would unlock your recovery data — one of the strongest predictors of how your body handles daily demands." }}
        />

        {/* 6. Cognitive & Morning Signals */}
        <CategoryCard
          expanded={expandedRow === 2} onToggle={() => toggleRow(2)}
          icon={<DiversityIcon color={STATUS_COLORS[verdictToStatus(cognitive.verdict)]} />}
          name="Cognitive & morning signals"
          description="Fog, headaches, and how you feel on waking"
          value={cognitive.headline}
          status={verdictToStatus(cognitive.verdict)}
          statusLabel={cognitive.flagCount > 0 ? `${cognitive.flags.length} signal${cognitive.flags.length > 1 ? "s" : ""}` : "Clear"}
          narrative={{ paragraph: cognitive.flags.length > 0 ? `You report: ${cognitive.flags.join(", ")}. These tend to cluster together when sleep architecture is fragmented — even when total hours look adequate. Addressing breathing and consistency often helps these shift.` : "No cognitive or morning signals flagged. Your mornings seem to be starting well." }}
        />
      </div>

      <style>{`@media (max-width: 768px) { .sleep-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}

"use client"

import Link from "next/link"
import type { UserPanelContext } from "../../../lib/user-context"
import { getBreathingSignal } from "../../../lib/signals/breathing"
import { getSleepQualitySignal } from "../../../lib/signals/sleep-quality"
import { getAirwaySignal } from "../../../lib/signals/airway"
import { getCognitiveSignal } from "../../../lib/signals/cognitive"
import { getSleepDurationSignal } from "../../../lib/signals/sleep-duration"
import { SleepCard, Strong, Gold, GoldAccent, type ScaleItem } from "../../components/panels/SleepCard"

const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
const serif = "'Cormorant Garamond', Georgia, serif"

function BreathIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round">
      <path d="M4 12h2c1-3 3-5 6-5s5 2 6 5h2" /><path d="M8 16c1 2 3 3 4 3s3-1 4-3" />
    </svg>
  )
}

function ClockIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
    </svg>
  )
}

function StarIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round">
      <path d="M12 3l2.5 6.5H21l-5 4 2 6.5L12 16l-6 4 2-6.5-5-4h6.5z" />
    </svg>
  )
}

function ShieldIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 4v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V7l7-4z" />
    </svg>
  )
}

function HeartIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <path d="M12 21C12 21 4 14 4 8.5C4 5.5 6.5 3 9 3c1.7 0 2.6.8 3 1.5.4-.7 1.3-1.5 3-1.5 2.5 0 5 2.5 5 5.5C20 14 12 21 12 21z" />
    </svg>
  )
}

function BrainIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round">
      <path d="M12 3c-2 0-3.5 1-4 2.5S6 8 6 10c-1.5.5-2.5 2-2.5 3.5S5 17 7 17.5c.5 2 2 3.5 4 3.5h2c2 0 3.5-1.5 4-3.5 2-.5 3.5-2 3.5-4S19.5 10.5 18 10c0-2-1-3-2-4.5S14 3 12 3z" />
      <path d="M12 3v18" />
    </svg>
  )
}

export default function SleepQuestionnaireView({ ctx }: { ctx: UserPanelContext }) {
  const breathing = getBreathingSignal(ctx)
  const duration = getSleepDurationSignal(ctx)
  const sleepQuality = getSleepQualitySignal(ctx)
  const airway = getAirwaySignal(ctx)
  const cognitive = getCognitiveSignal(ctx)

  const q = ctx.questionnaire
  const mbConfirmed = q?.mouthBreathing === "confirmed" || q?.mouthBreathing === "often"
  const mbWhen = q?.mouthBreathingWhen === "daytime_and_sleep" ? "daytime and sleep" : q?.mouthBreathingWhen === "sleep_only" ? "sleep" : "reported"
  const hasOralBreathing = ctx.oralKit?.envPattern === "mouth_breathing" || ctx.oralKit?.envPattern === "mixed"
  const aerobicShift = ctx.oralKit?.envAerobicScorePct

  const durationStatus = duration.verdict === "strong" ? "good" as const : duration.verdict === "watch" ? "watch" as const : duration.verdict === "watch_closely" ? "concern" as const : "pending" as const
  const qualityStatus = sleepQuality.qualityVerdict === "good" ? "good" as const : sleepQuality.qualityVerdict === "watch" ? "watch" as const : sleepQuality.qualityVerdict === "concern" ? "concern" as const : "pending" as const
  const airwayStatus = airway.verdict === "strong" ? "good" as const : airway.verdict === "watch" ? "watch" as const : airway.verdict === "watch_closely" ? "concern" as const : "pending" as const
  const cognitiveStatus = cognitive.verdict === "strong" ? "good" as const : cognitive.verdict === "watch" ? "watch" as const : cognitive.verdict === "watch_closely" ? "concern" as const : "pending" as const

  const breathingStatus = mbConfirmed && hasOralBreathing ? "watch" as const
    : mbConfirmed ? "watch" as const
    : breathing.confidence === "pending" ? "pending" as const
    : "good" as const

  // Duration scale items
  const durScaleItems: ScaleItem[] = [
    { label: "<6 hrs", status: "concern" },
    { label: "6–7 hrs", value: durationStatus === "watch" ? "(you)" : undefined, status: "watch", isUser: durationStatus === "watch" },
    { label: "7–9 hrs ideal", isTarget: true },
    { label: ">9 hrs", status: "watch" },
  ]
  if (durationStatus === "good") durScaleItems[2] = { label: "7–9 hrs ideal", value: "(you)", isTarget: true, isUser: true }

  // Quality scale items
  const latency = q?.sleepLatency
  const latencyLabel = latency === "lt5" ? "<5 min" : latency === "5_10" ? "5–10 min" : latency === "10_20" ? "10–20 min" : latency === "20_30" ? "20–30 min" : latency === "gt30" ? ">30 min" : "—"
  const wakings = q?.nightWakings
  const wakingsLabel = wakings === "none" ? "0" : wakings === "once" ? "1" : wakings === "twice" ? "2" : wakings === "three_plus" ? "3+" : "—"
  const fatigue = q?.daytimeFatigue
  const fatigueLabel = fatigue === "none" ? "None" : fatigue === "mild" ? "Mild" : fatigue === "moderate" ? "Moderate" : fatigue === "severe" ? "Severe" : "—"

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px", background: "#F5F3EE" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, borderBottom: "1px solid #E8E4D8", paddingBottom: 24 }}>
        <h1 style={{ fontFamily: serif, fontSize: 44, fontWeight: 500, color: "#2C2A24", margin: 0, lineHeight: 1.1 }}>Sleep</h1>
        <p style={{ fontFamily: sans, fontSize: 13, color: "#7A7870", maxWidth: 360, textAlign: "right", lineHeight: 1.5, margin: 0 }}>
          Based on your questionnaire and oral data. Connect a wearable for objective measurements.
        </p>
      </div>

      {/* Wearable CTA */}
      <Link href="/settings" style={{ textDecoration: "none", display: "block", marginBottom: 28 }}>
        <div style={{
          background: "#FAF8F2", border: "1px solid #E8E4D8",
          borderRadius: 8, padding: "12px 18px",
          fontFamily: sans, fontSize: 13, color: "#7A7870",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#B8860B" }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8E4D8" }}
        >
          <span style={{ color: "#B8860B", fontWeight: 500 }}>+</span> Connect wearable for objective metrics
        </div>
      </Link>

      {/* CARD 1 — Breathing pattern (hero) */}
      <SleepCard
        status={breathingStatus}
        icon={<BreathIcon color={breathingStatus === "watch" ? "#B8860B" : breathingStatus === "good" ? "#1A8C4E" : "#9A9894"} />}
        title="Breathing pattern"
        question="How your mouth and airway handle breath during the night — signals pulled from your oral bacteria and your questionnaire answers."
        value="Mouth breathing"
        valueIsText
        pill={mbConfirmed && hasOralBreathing ? "Confirmed · 2 sources" : mbConfirmed ? "Confirmed · questionnaire" : "Not detected"}
        scaleItems={[
          { label: "Nasal", status: "good" },
          { label: "Mixed", isTarget: true },
          { label: "You're here", status: "watch", isUser: true },
        ]}
        sources={hasOralBreathing ? "Sources: Questionnaire · Oral bacteria" : "Source: Questionnaire"}
        explain={<>
          Your questionnaire confirms <Strong>mouth breathing during {mbWhen}</Strong>.
          {hasOralBreathing && aerobicShift != null && <> Your oral bacteria show the same pattern — a {aerobicShift.toFixed(1)}% aerobic shift typical of drier overnight conditions. </>}
          {!hasOralBreathing && <> Your oral data will add the bacterial layer once processed. </>}
          <Gold>Two independent sources agreeing</Gold> on the same finding.
        </>}
        pullquote={mbConfirmed && hasOralBreathing ? {
          label: "THE FINDING",
          body: <>Your questionnaire and your oral bacteria <GoldAccent>agree on mouth breathing</GoldAccent> — one of the clearest cross-panel signals in your data.</>,
        } : undefined}
      />

      {/* CARD 2 — Sleep duration */}
      <SleepCard
        status={durationStatus}
        icon={<ClockIcon color={durationStatus === "watch" ? "#B8860B" : durationStatus === "good" ? "#1A8C4E" : "#9A9894"} />}
        title="Sleep duration"
        question="How many hours you're sleeping per night based on self-report."
        value={duration.hoursLabel || "—"}
        valueIsText={!duration.hoursLabel.match(/^\d/)}
        pill={durationStatus === "good" ? "In target" : durationStatus === "watch" ? "Below target" : durationStatus === "concern" ? "Short sleep" : "Not reported"}
        scaleItems={durScaleItems}
        sources="Source: Self-reported"
        explain={<>
          You report sleeping <Strong>{duration.hoursLabel}</Strong> most nights — {durationStatus === "watch" ? "about an hour short of the adult recommendation" : durationStatus === "concern" ? "well below the 7-hour threshold" : "within the recommended range"}.
          {durationStatus !== "good" && <> Not alarming on its own, but compounded with other factors it can show up as daytime fog or morning headaches{q?.morningHeadaches === "occasional" || q?.morningHeadaches === "frequent" ? ", both of which you also report occasionally" : ""}.</>}
        </>}
      />

      {/* CARD 3 — Sleep quality */}
      <SleepCard
        status={qualityStatus}
        icon={<StarIcon color={qualityStatus === "good" ? "#1A8C4E" : qualityStatus === "watch" ? "#B8860B" : "#9A9894"} />}
        title="Sleep quality"
        question="How restorative your sleep feels based on latency, wakings, and daytime function."
        value={qualityStatus === "good" ? "Good" : qualityStatus === "watch" ? "Watch" : "—"}
        valueIsText
        pill={qualityStatus === "good" ? "Self-rated" : qualityStatus === "watch" ? "Mixed signals" : "Pending"}
        scaleItems={[
          { label: `Latency ${latencyLabel}`, status: latency === "lt5" || latency === "5_10" ? "good" : "watch" },
          { label: `Wakings ${wakingsLabel}`, status: wakings === "none" ? "good" : "watch" },
          { label: `Fatigue ${fatigueLabel}`, status: fatigue === "none" ? "good" : fatigue === "mild" ? "good" : "watch" },
        ]}
        sources="Source: Questionnaire"
        explain={qualityStatus === "good" ? <>
          You fall asleep in under 10 minutes, don't wake during the night, and don't experience daytime fatigue. These are <Gold>all strong signals</Gold> — many people with sleep issues take 30+ minutes to fall asleep or wake multiple times nightly.
        </> : <>
          Your sleep quality shows some signals worth watching. {q?.nonRestorativeSleep === "often" || q?.nonRestorativeSleep === "almost_always" ? "You frequently wake up feeling unrefreshed despite sleeping adequate hours — often a sign of disrupted sleep architecture." : "Your self-reported sleep quality gives us a baseline."} Adding a wearable would show whether your deep sleep and REM percentages match how you feel.
        </>}
      />

      {/* CARD 4 — Airway signals */}
      <SleepCard
        status={airwayStatus}
        icon={<ShieldIcon color={airwayStatus === "watch" ? "#B8860B" : airwayStatus === "good" ? "#1A8C4E" : "#9A9894"} />}
        title="Airway signals"
        question="Snoring, nasal obstruction, and related patterns from your questionnaire."
        value={airway.flagCount > 0 ? `${airway.flagCount} flag${airway.flagCount > 1 ? "s" : ""}` : "Clear"}
        valueIsText={airway.flagCount === 0}
        pill={airway.flagCount > 0 ? "Mild profile" : "All clear"}
        scaleItems={[
          { label: `Snoring ${q?.snoringReported === "yes" || q?.snoringReported === "frequent" ? "Yes" : q?.snoringReported === "occasional" ? "Occasional" : "No"}`, status: q?.snoringReported === "yes" || q?.snoringReported === "frequent" ? "concern" : q?.snoringReported === "occasional" ? "watch" : "good" },
          { label: `Nasal obstruction ${q?.nasalObstruction === "frequent" || q?.nasalObstruction === "constant" ? "Frequent" : q?.nasalObstruction === "occasional" ? "Occasional" : "None"}`, status: q?.nasalObstruction === "frequent" || q?.nasalObstruction === "constant" ? "concern" : q?.nasalObstruction === "occasional" ? "watch" : "good" },
          { label: `Morning headaches ${q?.morningHeadaches === "frequent" || q?.morningHeadaches === "daily" ? "Frequent" : q?.morningHeadaches === "occasional" ? "Occasional" : "None"}`, status: q?.morningHeadaches === "frequent" || q?.morningHeadaches === "daily" ? "concern" : q?.morningHeadaches === "occasional" ? "watch" : "good" },
        ]}
        sources="Source: Questionnaire"
        explain={airway.flagCount > 0 ? <>
          None of these signals is alarming individually. Together they suggest <Strong>partial nasal airway involvement</Strong>.
          {q?.bmiCalculated != null && <> Your BMI of {q.bmiCalculated.toFixed(1)} is healthy</>}
          {q?.osaWitnessed !== "yes" && q?.osaWitnessed !== "frequent" && <> and you haven't had breathing interruptions witnessed by a partner</>}.
          A practical first step: trial nasal strips for 2–4 weeks and see if morning headaches and snoring change.
        </> : <>
          No airway signals flagged in your questionnaire. This is a <Gold>positive finding</Gold>.
        </>}
      />

      {/* CARD 5 — Recovery & stress (pending) */}
      <SleepCard
        status="pending"
        icon={<HeartIcon color="#9A9894" />}
        title="Recovery & stress"
        question="HRV, resting heart rate, and stress patterns — objective recovery data requires a wearable."
        value={q?.stressLevel ? q.stressLevel.charAt(0).toUpperCase() + q.stressLevel.slice(1) : "—"}
        valueIsText
        pill="Wearable needed"
        scaleItems={[
          { label: `Self-rated stress ${q?.stressLevel ?? "—"}`, status: q?.stressLevel === "low" ? "good" : q?.stressLevel === "moderate" ? "watch" : q?.stressLevel === "high" ? "concern" : "pending" },
          { label: `Bruxism ${q?.bruxismNight === "never" ? "Never" : q?.bruxismNight ?? "—"}`, status: q?.bruxismNight === "never" ? "good" : "watch" },
        ]}
        sources="Source: Questionnaire only"
        explain={<>
          Your self-reported stress is {q?.stressLevel ?? "not reported"}{q?.bruxismNight === "never" && <> and you don't grind your teeth at night — a positive signal, since bruxism often tracks with high sympathetic tone</>}.
          {" "}<Gold>Connecting a wearable would unlock your HRV and resting heart rate</Gold>, which are far more informative than self-reporting for this category.
        </>}
      />

      {/* CARD 6 — Cognitive & morning signals */}
      <SleepCard
        status={cognitiveStatus}
        icon={<BrainIcon color={cognitiveStatus === "watch" ? "#B8860B" : cognitiveStatus === "good" ? "#1A8C4E" : "#9A9894"} />}
        title="Cognitive & morning signals"
        question="Fog, headaches, and how you feel on waking — early indicators of sleep quality."
        value={cognitive.flagCount > 0 ? `${cognitive.flagCount} signal${cognitive.flagCount > 1 ? "s" : ""}` : "Clear"}
        valueIsText={cognitive.flagCount === 0}
        pill={cognitive.flagCount > 0 ? `Both occasional` : "All clear"}
        scaleItems={[
          { label: `Daytime fog ${q?.daytimeCognitiveFog === "occasional" ? "Occasional" : q?.daytimeCognitiveFog === "frequent" ? "Frequent" : "None"}`, status: q?.daytimeCognitiveFog === "occasional" || q?.daytimeCognitiveFog === "frequent" ? "watch" : "good" },
          { label: `Morning headaches ${q?.morningHeadaches === "occasional" ? "Occasional" : q?.morningHeadaches === "frequent" || q?.morningHeadaches === "daily" ? "Frequent" : "None"}`, status: q?.morningHeadaches === "occasional" || q?.morningHeadaches === "frequent" || q?.morningHeadaches === "daily" ? "watch" : "good" },
        ]}
        sources="Source: Questionnaire"
        explain={cognitive.flagCount > 0 ? <>
          Both signals are mild on their own. Together with the mouth breathing and slightly short sleep, they form a loose pattern that often improves when airway issues are addressed.
          Many people notice <Gold>significant cognitive improvement</Gold> after starting nasal breathing practice or adding an hour of sleep.
        </> : <>
          No cognitive or morning signals flagged. Your mornings seem to be starting well — a <Gold>positive finding</Gold>.
        </>}
      />

      {/* Converge link */}
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Link href="/dashboard/converge" style={{ fontFamily: sans, fontSize: 13, color: "#B8860B", textDecoration: "none", fontWeight: 500 }}>
          See how this connects to your other panels →
        </Link>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sleep-card-header {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .sleep-card-value {
            text-align: left !important;
          }
          .sleep-card-measure {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </div>
  )
}

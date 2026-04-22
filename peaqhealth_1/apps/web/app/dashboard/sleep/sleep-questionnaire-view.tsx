"use client"

import Link from "next/link"
import type { UserPanelContext } from "../../../lib/user-context"
import { getBreathingSignal } from "../../../lib/signals/breathing"
import { getSleepQualitySignal } from "../../../lib/signals/sleep-quality"
import { getAirwaySignal } from "../../../lib/signals/airway"
import { getCognitiveSignal } from "../../../lib/signals/cognitive"
import { getSleepDurationSignal } from "../../../lib/signals/sleep-duration"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const S = {
  deep: "#2E3E5C", dusk: "#4A6485", mid: "#7A95B5", mist: "#A8BFD4",
  pale: "#D8E3EE", wash: "#EDF2F7", bg: "#F4F7FB",
  ideal: "#5B8A6F", watch: "#C4992E", low: "#9B3838",
}

type Status = "ideal" | "watch" | "low" | "info" | "pending"

const BADGE: Record<Status, { bg: string; text: string }> = {
  ideal: { bg: "rgba(91,138,111,0.1)", text: "#4A7A4A" },
  watch: { bg: "rgba(196,153,46,0.1)", text: "#946F1B" },
  low: { bg: "rgba(155,56,56,0.08)", text: S.low },
  info: { bg: "rgba(74,148,181,0.1)", text: S.dusk },
  pending: { bg: "rgba(122,149,181,0.08)", text: S.mid },
}

const ACCENT: Record<Status, string> = {
  ideal: S.ideal, watch: S.watch, low: S.low, info: S.mid, pending: S.mid,
}

const BADGE_LABEL: Record<Status, string> = {
  ideal: "Strong", watch: "Watch", low: "Attention", info: "Info", pending: "Pending",
}

// ── Icons ──────────────────────────────────────────────────────────────────

function WindIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={S.dusk} strokeWidth={1.5} strokeLinecap="round">
      <path d="M3 8h12a3 3 0 100-3" /><path d="M3 12h15a3 3 0 010 3H3" /><path d="M3 16h9a3 3 0 110 3" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={S.dusk} strokeWidth={1.5} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={S.dusk} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={S.dusk} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 4v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V7l7-4z" />
    </svg>
  )
}
function HeartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={S.dusk} strokeWidth={1.5}>
      <path d="M12 21C12 21 4 14 4 8.5C4 5.5 6.5 3 9 3c1.7 0 2.6.8 3 1.5.4-.7 1.3-1.5 3-1.5 2.5 0 5 2.5 5 5.5C20 14 12 21 12 21z" />
    </svg>
  )
}
function BrainIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={S.dusk} strokeWidth={1.5} strokeLinecap="round">
      <path d="M12 3c-2 0-3.5 1-4 2.5S6 8 6 10c-1.5.5-2.5 2-2.5 3.5S5 17 7 17.5c.5 2 2 3.5 4 3.5h2c2 0 3.5-1.5 4-3.5 2-.5 3.5-2 3.5-4S19.5 10.5 18 10c0-2-1-3-2-4.5S14 3 12 3z" />
      <path d="M12 3v18" />
    </svg>
  )
}

// ── Scale track ────────────────────────────────────────────────────────────

interface ScaleLabel { text: string; status?: Status; isCurrent?: boolean }

function ScaleTrack({ gradient, tickPct, labels }: {
  gradient: string
  tickPct: number
  labels: ScaleLabel[]
}) {
  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${S.pale}` }}>
      <div style={{ position: "relative", height: 6, borderRadius: 3, overflow: "visible", background: gradient }}>
        <div style={{
          position: "absolute", top: -4, left: `${tickPct}%`, width: 3, height: 14,
          background: S.deep, borderRadius: 2, transform: "translateX(-1.5px)",
          boxShadow: "0 0 0 3px #FFFFFF",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        {labels.map((l, i) => {
          const dotColor = l.isCurrent ? S.deep : l.status ? ACCENT[l.status] : S.mid
          return (
            <span key={i} style={{
              fontFamily: sans, fontSize: 11, color: l.isCurrent ? S.deep : S.mid,
              fontWeight: l.isCurrent ? 600 : 400,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              <span style={{
                width: l.isCurrent ? 5 : 4, height: l.isCurrent ? 5 : 4, borderRadius: "50%",
                background: dotColor, flexShrink: 0,
                boxShadow: l.isCurrent ? `0 0 0 3px rgba(46,62,92,0.15)` : "none",
              }} />
              {l.text}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── Corroboration badge ────────────────────────────────────────────────────

function CorroborationBadge({ sources }: { sources: string[] }) {
  if (sources.length < 2) return null
  return (
    <div style={{
      marginTop: 14, padding: "10px 14px", borderRadius: 8,
      background: "linear-gradient(90deg, rgba(232,239,247,0.8) 0%, rgba(244,247,251,0.4) 100%)",
      border: `1px solid ${S.pale}`,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{
        width: 14, height: 14, borderRadius: "50%", background: S.dusk,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#FFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 6l3 3 5-5" />
        </svg>
      </span>
      <span style={{ fontFamily: sans, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: S.dusk, fontWeight: 500 }}>
        Two signals agreeing — {sources.join(" + ")}
      </span>
    </div>
  )
}

// ── Signal card ────────────────────────────────────────────────────────────

function SignalCard({ status, icon, title, description, value, valueIsText, unit, badgeLabel, source, scale, meaning, corroborationSources }: {
  status: Status
  icon: React.ReactNode
  title: string
  description: string
  value: string | number
  valueIsText?: boolean
  unit?: string
  badgeLabel: string
  source: string
  scale?: { gradient: string; tickPct: number; labels: ScaleLabel[] }
  meaning: React.ReactNode
  corroborationSources?: string[]
}) {
  const accent = ACCENT[status]
  const badge = BADGE[status]

  return (
    <div className="sleep-signal-card" style={{
      background: "#FFFFFF", border: `1px solid ${S.pale}`,
      borderRadius: 16, padding: "28px 32px", marginBottom: 16,
      position: "relative", overflow: "hidden",
      transition: "border-color 0.15s, transform 0.15s, box-shadow 0.15s",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = S.mist; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(46,62,92,0.06)" }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = S.pale; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none" }}
    >
      {/* Left accent stripe */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: accent, opacity: 0.7, borderRadius: "16px 0 0 16px" }} />

      {/* Top row */}
      <div className="sleep-card-top" style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: "0 18px", alignItems: "start" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: S.bg, border: `1px solid ${S.pale}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {icon}
        </div>

        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontFamily: serif, fontSize: 26, fontWeight: 500, color: S.deep, margin: "0 0 4px", lineHeight: 1.2 }}>
            {title}
          </h3>
          <p style={{ fontFamily: sans, fontSize: 13, color: S.dusk, lineHeight: 1.55, margin: 0, maxWidth: 520 }}>
            {description}
          </p>
        </div>

        <div className="sleep-card-value-col" style={{ textAlign: "right", minWidth: 120 }}>
          {valueIsText ? (
            <span style={{ fontFamily: serif, fontSize: 28, fontStyle: "italic", color: S.deep, lineHeight: 1.2 }}>{value}</span>
          ) : (
            <span style={{ fontFamily: serif, fontSize: 36, fontWeight: 500, color: S.deep, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {value}{unit && <span style={{ fontSize: 18, fontStyle: "italic", color: S.mid, marginLeft: 3 }}>{unit}</span>}
            </span>
          )}
          <div style={{ marginTop: 6 }}>
            <span style={{
              fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
              background: badge.bg, color: badge.text,
              padding: "4px 10px", borderRadius: 20,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: accent }} />
              {badgeLabel}
            </span>
          </div>
          <div style={{ marginTop: 4 }}>
            <span style={{ fontFamily: serif, fontSize: 11, fontStyle: "italic", color: S.mid }}>{source}</span>
          </div>
        </div>
      </div>

      {/* Scale track */}
      {scale && <ScaleTrack {...scale} />}

      {/* Meaning */}
      <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px dashed ${S.pale}` }}>
        <div style={{ fontFamily: serif, fontSize: 16, fontStyle: "italic", lineHeight: 1.55, color: S.dusk }}>
          {meaning}
        </div>
      </div>

      {/* Corroboration */}
      {corroborationSources && <CorroborationBadge sources={corroborationSources} />}
    </div>
  )
}

function Fact({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: S.deep, fontWeight: 600, fontStyle: "normal" }}>{children}</strong>
}

function Hl({ children }: { children: React.ReactNode }) {
  return <span style={{ color: S.deep, fontWeight: 500 }}>{children}</span>
}

// ── Duration gradients ─────────────────────────────────────────────────────

const DURATION_GRADIENT = "linear-gradient(90deg, rgba(155,56,56,0.25) 0% 18%, rgba(196,153,46,0.25) 18% 35%, rgba(91,138,111,0.5) 35% 70%, rgba(196,153,46,0.25) 70% 90%, rgba(155,56,56,0.25) 90% 100%)"
const BREATHING_GRADIENT = "linear-gradient(90deg, rgba(91,138,111,0.5) 0% 33%, rgba(196,153,46,0.35) 33% 66%, rgba(155,56,56,0.25) 66% 100%)"

// ── Main ───────────────────────────────────────────────────────────────────

export default function SleepQuestionnaireView({ ctx }: { ctx: UserPanelContext }) {
  const breathing = getBreathingSignal(ctx)
  const duration = getSleepDurationSignal(ctx)
  const sleepQuality = getSleepQualitySignal(ctx)
  const airway = getAirwaySignal(ctx)
  const cognitive = getCognitiveSignal(ctx)

  const q = ctx.questionnaire
  const mbConfirmed = q?.mouthBreathing === "confirmed" || q?.mouthBreathing === "often"
  const hasOralBreathing = ctx.oralKit?.envPattern === "mouth_breathing" || ctx.oralKit?.envPattern === "mixed"
  const aerobicShift = ctx.oralKit?.envAerobicScorePct
  const mbWhen = q?.mouthBreathingWhen === "daytime_and_sleep" ? "daytime and sleep" : q?.mouthBreathingWhen === "sleep_only" ? "sleep" : "reported"

  const durStatus: Status = duration.verdict === "strong" ? "ideal" : duration.verdict === "watch" ? "watch" : duration.verdict === "watch_closely" ? "low" : "pending"
  const qualStatus: Status = sleepQuality.qualityVerdict === "good" ? "ideal" : sleepQuality.qualityVerdict === "watch" ? "watch" : sleepQuality.qualityVerdict === "concern" ? "low" : "pending"
  const airStatus: Status = airway.verdict === "strong" ? "ideal" : airway.verdict === "watch" ? "watch" : airway.verdict === "watch_closely" ? "low" : "pending"
  const cogStatus: Status = cognitive.verdict === "strong" ? "ideal" : cognitive.verdict === "watch" ? "watch" : cognitive.verdict === "watch_closely" ? "low" : "pending"
  const breathStatus: Status = mbConfirmed ? "watch" : breathing.confidence === "pending" ? "pending" : "ideal"

  const latency = q?.sleepLatency
  const latencyLabel = latency === "lt5" || latency === "5_10" ? "<10 min" : latency === "10_20" ? "10-20 min" : latency === "20_30" ? "20-30 min" : latency === "gt30" ? ">30 min" : "—"
  const wakings = q?.nightWakings
  const wakingsLabel = wakings === "none" ? "0" : wakings === "once" ? "1" : wakings === "twice" ? "2" : wakings === "three_plus" ? "3+" : "—"

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px", background: "#EDEAE1" }}>

      {/* Hero header */}
      <div className="sleep-hero" style={{
        background: "linear-gradient(135deg, #F4F7FB 0%, #E8EFF7 100%)",
        borderRadius: 20, padding: "40px 48px",
        border: `1px solid ${S.pale}`, marginBottom: 40,
        display: "grid", gridTemplateColumns: "1fr 140px", gap: 32, alignItems: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 300, height: 300, background: "radial-gradient(circle at 70% 30%, rgba(168,191,212,0.2) 0%, transparent 60%)", pointerEvents: "none" }} />

        <div style={{ position: "relative" }}>
          <h1 style={{ fontFamily: serif, fontSize: 64, fontWeight: 500, color: S.deep, margin: "0 0 12px", lineHeight: 1 }}>
            Your <em style={{ fontStyle: "italic", color: S.dusk }}>Sleep</em>
          </h1>
          <p style={{ fontFamily: sans, fontSize: 13, color: S.dusk, lineHeight: 1.6, margin: 0, maxWidth: 440 }}>
            Signals from your <span style={{ color: S.deep, fontWeight: 500 }}>questionnaire</span> and <span style={{ color: S.deep, fontWeight: 500 }}>oral microbiome</span>. Connect a wearable to layer in objective measurements like HRV, sleep stages, and wake events.
          </p>
        </div>

        {/* Moon + stars */}
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%", position: "absolute", top: 30, left: 30,
            background: "radial-gradient(circle at 35% 35%, #FAFCFE 0%, #A8BFD4 100%)",
            boxShadow: "inset 4px -4px 12px rgba(46,62,92,0.15), 0 0 20px rgba(46,62,92,0.1)",
          }} />
          {[{ t: 10, l: 20, s: 3 }, { t: 25, l: 110, s: 2 }, { t: 65, l: 8, s: 2 }, { t: 15, l: 85, s: 3 }].map((star, i) => (
            <div key={i} style={{
              position: "absolute", top: star.t, left: star.l, width: star.s, height: star.s,
              borderRadius: "50%", background: S.mist,
              animation: `twinkle 3s ease-in-out ${i * 0.7}s infinite`,
            }} />
          ))}
        </div>
      </div>

      {/* Connect wearable strip */}
      <Link href="/settings" style={{ textDecoration: "none", display: "block", marginBottom: 32 }}>
        <div style={{
          padding: "18px 24px", borderRadius: 14,
          background: "rgba(255,255,255,0.5)",
          border: `1px dashed ${S.mist}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          transition: "border-color 0.15s, background 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = S.dusk; e.currentTarget.style.background = "rgba(255,255,255,0.8)" }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = S.mist; e.currentTarget.style.background = "rgba(255,255,255,0.5)" }}
        >
          <span style={{ fontFamily: sans, fontSize: 13, color: S.dusk }}>
            <span style={{ color: S.deep, fontWeight: 600 }}>Add a wearable</span> — Apple Watch, Oura, WHOOP, or Garmin — for stage-by-stage data.
          </span>
          <span style={{ fontFamily: sans, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: S.dusk, fontWeight: 500, flexShrink: 0, marginLeft: 12 }}>Connect →</span>
        </div>
      </Link>

      {/* CARD 1 — Breathing pattern */}
      <SignalCard
        status={breathStatus}
        icon={<WindIcon />}
        title="Breathing pattern"
        description="How your mouth and airway handle breath during the night — signals from your questionnaire and oral bacteria."
        value="Mouth breathing"
        valueIsText
        badgeLabel={mbConfirmed && hasOralBreathing ? "Confirmed · 2 sources" : mbConfirmed ? "Confirmed" : "Not detected"}
        source={hasOralBreathing ? "Oral + Questionnaire" : "Self-reported"}
        scale={{
          gradient: BREATHING_GRADIENT,
          tickPct: mbConfirmed ? 80 : 15,
          labels: [
            { text: "Nasal", status: "ideal" },
            { text: "Mixed" },
            { text: mbConfirmed ? `Mouth — you're here` : "Mouth", isCurrent: mbConfirmed },
          ],
        }}
        meaning={<>
          Your questionnaire confirms <Fact>mouth breathing during {mbWhen}</Fact>.
          {hasOralBreathing && aerobicShift != null && <> Your oral bacteria show the same pattern — a <Fact>{aerobicShift.toFixed(1)}% aerobic shift</Fact> typical of drier overnight conditions.</>}
          {" "}<Hl>Two independent sources agreeing on the same finding.</Hl>
        </>}
        corroborationSources={mbConfirmed && hasOralBreathing ? ["oral data", "questionnaire"] : undefined}
      />

      {/* CARD 2 — Sleep duration */}
      <SignalCard
        status={durStatus}
        icon={<ClockIcon />}
        title="Sleep duration"
        description="How many hours you're sleeping per night based on self-report."
        value={duration.hoursLabel.replace(" hrs", "")}
        unit="hrs"
        badgeLabel={durStatus === "ideal" ? "In target" : durStatus === "watch" ? "Below target" : "Short sleep"}
        source="Self-reported"
        scale={{
          gradient: DURATION_GRADIENT,
          tickPct: durStatus === "ideal" ? 52 : durStatus === "watch" ? 28 : 12,
          labels: [
            { text: "<6 hrs", status: "low" },
            { text: durStatus === "watch" ? "6-7 — you're here" : "6-7 hrs", status: "watch", isCurrent: durStatus === "watch" },
            { text: durStatus === "ideal" ? "7-9 — you're here" : "7-9 ideal", status: "ideal", isCurrent: durStatus === "ideal" },
            { text: ">9 hrs", status: "watch" },
          ],
        }}
        meaning={<>
          You report sleeping <Fact>{duration.hoursLabel}</Fact> most nights{durStatus !== "ideal" ? " — about an hour short of the adult recommendation" : ""}.
          {durStatus !== "ideal" && <> Not alarming on its own, but compounded with other factors it can show up as <Hl>daytime fog or morning headaches</Hl>{q?.morningHeadaches === "occasional" || q?.morningHeadaches === "frequent" ? ", both of which you also report" : ""}.</>}
          {durStatus === "ideal" && <> This sits comfortably in the <Hl>7-9 hour window</Hl> associated with the best recovery and cognitive function.</>}
        </>}
      />

      {/* CARD 3 — Sleep quality */}
      <SignalCard
        status={qualStatus}
        icon={<MoonIcon />}
        title="Sleep quality"
        description="How restorative your sleep feels based on latency, wakings, and daytime function."
        value={qualStatus === "ideal" ? "Good" : qualStatus === "watch" ? "Mixed" : "—"}
        valueIsText
        badgeLabel="Self-rated"
        source="Questionnaire"
        scale={undefined}
        meaning={qualStatus === "ideal" ? <>
          You fall asleep in <Fact>{latencyLabel}</Fact>, report <Fact>{wakingsLabel} night wakings</Fact>, and no significant daytime fatigue.
          {" "}<Hl>These are all strong signals</Hl> — many people with sleep issues take 30+ minutes to fall asleep or wake multiple times nightly.
        </> : <>
          Your sleep quality shows mixed signals. {q?.nonRestorativeSleep === "often" || q?.nonRestorativeSleep === "almost_always"
            ? <><Fact>You frequently wake up feeling unrefreshed</Fact> despite sleeping adequate hours — often a sign of disrupted sleep architecture.</>
            : "Your self-reported sleep quality gives a baseline."
          } A wearable would show whether your deep sleep and REM percentages match how you feel.
        </>}
      />

      {/* CARD 4 — Airway signals */}
      <SignalCard
        status={airStatus}
        icon={<ShieldIcon />}
        title="Airway signals"
        description="Snoring, nasal obstruction, and related patterns from your questionnaire."
        value={airway.flagCount > 0 ? String(airway.flagCount) : "Clear"}
        valueIsText={airway.flagCount === 0}
        unit={airway.flagCount > 0 ? (airway.flagCount === 1 ? "flag" : "flags") : undefined}
        badgeLabel={airway.flagCount > 0 ? "Mild profile" : "All clear"}
        source="Questionnaire"
        meaning={airway.flagCount > 0 ? <>
          {airway.flags.length > 0 && <>{airway.flags.map((f, i) => <span key={i}>{i > 0 && ", "}<Fact>{f}</Fact></span>)}. </>}
          None is alarming individually. Together they suggest <Hl>partial nasal airway involvement</Hl>.
          {q?.bmiCalculated != null && <> Your BMI of {q.bmiCalculated.toFixed(1)} is healthy</>}.
          A practical first step: trial nasal strips for 2-4 weeks and see if symptoms shift.
        </> : <>
          No airway signals flagged in your questionnaire. <Hl>This is a positive finding.</Hl>
        </>}
      />

      {/* CARD 5 — Recovery & stress */}
      <SignalCard
        status="pending"
        icon={<HeartIcon />}
        title="Recovery & stress"
        description="HRV, resting heart rate, and stress patterns — objective data requires a wearable."
        value={q?.stressLevel ? q.stressLevel.charAt(0).toUpperCase() + q.stressLevel.slice(1) : "—"}
        valueIsText
        badgeLabel="Wearable needed"
        source="Questionnaire only"
        meaning={<>
          Your self-reported stress is <Fact>{q?.stressLevel ?? "not reported"}</Fact>
          {q?.bruxismNight === "never" && <> and you don't grind your teeth at night — a positive signal</>}.
          {" "}<Hl>Connecting a wearable would unlock your HRV and resting heart rate</Hl>, which are far more informative than self-report for this category.
        </>}
      />

      {/* CARD 6 — Cognitive & morning */}
      <SignalCard
        status={cogStatus}
        icon={<BrainIcon />}
        title="Cognitive & morning signals"
        description="Fog, headaches, and how you feel on waking — early indicators of sleep quality."
        value={cognitive.flagCount > 0 ? String(cognitive.flagCount) : "Clear"}
        valueIsText={cognitive.flagCount === 0}
        unit={cognitive.flagCount > 0 ? (cognitive.flagCount === 1 ? "signal" : "signals") : undefined}
        badgeLabel={cognitive.flagCount > 0 ? "Occasional" : "All clear"}
        source="Questionnaire"
        meaning={cognitive.flagCount > 0 ? <>
          {cognitive.flags.length > 0 && <>{cognitive.flags.map((f, i) => <span key={i}>{i > 0 && ", "}<Fact>{f}</Fact></span>)}</>}
          {" "}— both mild on their own. Together with the mouth breathing and slightly short sleep, they form a loose pattern that often improves when airway issues are addressed.
          Many people notice <Hl>significant cognitive improvement</Hl> after starting nasal breathing practice or adding an hour of sleep.
        </> : <>
          No cognitive or morning signals flagged. <Hl>Your mornings seem to be starting well.</Hl>
        </>}
      />

      {/* Converge link */}
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Link href="/dashboard/converge" style={{ fontFamily: sans, fontSize: 13, color: S.dusk, textDecoration: "none", fontWeight: 500 }}>
          See how this connects to your other panels →
        </Link>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.9; }
        }
        @media (max-width: 768px) {
          .sleep-hero {
            grid-template-columns: 1fr !important;
            padding: 28px 24px !important;
            text-align: center;
          }
          .sleep-hero h1 { font-size: 44px !important; }
          .sleep-hero > div:last-child { margin: 0 auto; }
          .sleep-card-top {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .sleep-card-value-col {
            text-align: left !important;
          }
          .sleep-signal-card {
            padding: 20px 20px !important;
          }
        }
      `}</style>
    </div>
  )
}

"use client"
import React, { useEffect, useState } from "react"
import { useCountUp } from "./use-count-up"
import { ScoreRingComponent } from "./ring"
import { RingLegend } from "./ring-legend"
import { HeroTitle } from "./hero-title"
import { PendingBanner } from "./pending-banners"
import { PanelGrid } from "./panel-grid"
import { MarkerRow, type Flag } from "./marker-row"
import { Insights } from "./insights"
import { NextSteps } from "./next-steps"
import { CTABlocks } from "./cta-blocks"

// Re-export the props type so dashboard-client can import it
export interface ScoreWheelProps {
  score: number
  lastSyncAt?: string | null
  lastSyncRequestedAt?: string | null
  breakdown: {
    sleepSub: number
    bloodSub: number
    oralSub: number
    lifestyleSub: number
    interactionPool: number | null
  }
  sleepConnected: boolean
  labFreshness: "fresh" | "aging" | "stale" | "expired" | "none"
  oralActive: boolean
  sleepData?: {
    deepPct: number
    hrv: number
    spo2Dips: number
    remPct: number
    efficiency: number
    nightsAvg: number
    device: string
    lastSync: string
  }
  bloodData?: {
    hsCRP: number
    vitaminD: number
    apoB: number
    ldlHdlRatio: number
    hba1c: number
    lpa: number
    triglycerides: number
    ldl: number
    hdl: number
    glucose: number
    egfr: number
    hemoglobin: number
    collectionDate: string
    labName: string
    monthsOld: number
    bloodInsight?: string
  }
  oralData?: {
    shannonDiversity: number
    nitrateReducersPct: number
    periodontPathPct: number
    osaTaxaPct: number
    reportDate: string
  }
  lifestyleData?: {
    exerciseTier: "active" | "moderate" | "light" | "sedentary"
    brushingFreq: number
    flossingFreq: number
    dentalVisits: number
    smoking: boolean
    updatedAt: string
  }
  interactions: {
    sleepInflammation:   boolean
    spo2Lipid:           boolean
    dualInflammatory:    boolean
    hrvHomocysteine:     boolean
    periodontCRP:        boolean
    osaTaxaSpO2:         boolean
    lowNitrateCRP:       boolean
    lowDiversitySleep:   boolean
    poorSleepOralQ:      boolean
    poorExerciseSmoking: boolean
    familyCVDApoB?:      boolean
    highStressCRP?:      boolean
    poorNutritionTrig?:  boolean
    highHRPoorSleep?:    boolean
    alcoholPoorSleep?:   boolean
  }
  peaqPercent?:        number
  peaqPercentLabel?:   string
  lpaFlag?:            "elevated" | "very_elevated" | null
  hsCRPRetestFlag?:    boolean
  additionalMarkers?:  Array<{ name: string; value: number; unit: string }>
  labLockExpiresAt?:   string | null  // ISO — null/undefined means locked or no labs
  oralOrdered?:        boolean        // true if any kit order exists (incl. processing)
}

function relTimeSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function flag(good: boolean, watch?: boolean): Flag {
  if (good) return "good"
  if (watch) return "watch"
  return "attention"
}

function formatValue(value: number): string {
  if (value === Math.floor(value)) return value.toString()
  return (Math.round(value * 100) / 100).toString()
}

// Status dot colors
const STATUS_COLORS: Record<Flag, string> = {
  good: "var(--status-optimal)", watch: "var(--gold)", attention: "var(--blood-c)", pending: "var(--ink-12)", not_tested: "var(--ink-12)",
}

// Spectrum bar marker row — positioned dot on track with optional optimal zone
function SpectrumRow({ name, value, unit, f, min, max, optMin, optMax }: {
  name: string; value: number | undefined; unit: string; f: Flag
  min: number; max: number; optMin: number; optMax: number
}) {
  if (!value || value === 0) return null
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  const pct = clamp(((value - min) / (max - min)) * 100)
  const optMinPct = clamp(((optMin - min) / (max - min)) * 100)
  const optMaxPct = clamp(((optMax - min) / (max - min)) * 100)
  const dotColor  = f === "good" ? "var(--status-optimal)" : f === "watch" ? "var(--gold)" : f === "attention" ? "var(--blood-c)" : "var(--ink-30)"
  const badgeBg   = f === "good" ? "var(--oral-bg)"  : f === "watch" ? "var(--amber-bg)"  : f === "attention" ? "var(--blood-bg)" : "var(--warm-50)"
  const badgeText = f === "good" ? "var(--status-optimal)" : f === "watch" ? "var(--amber)" : f === "attention" ? "var(--status-attention)" : "var(--ink-60)"
  const badgeLabel = f === "good" ? "Optimal" : f === "watch" ? "Watch" : f === "attention" ? "Attention" : "—"

  return (
    <div style={{ padding: "10px 0", borderBottom: "0.5px solid var(--ink-06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink)" }}>{name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink)" }}>
            {formatValue(value)} <span style={{ fontSize: 10, color: "var(--ink-30)" }}>{unit}</span>
          </span>
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 8px", borderRadius: 3, background: badgeBg, color: badgeText }}>{badgeLabel}</span>
        </div>
      </div>
      {/* Track */}
      <div style={{ position: "relative", height: 4, borderRadius: 2, background: "var(--ink-06)", margin: "0 0 2px" }}>
        {/* Optimal zone */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${optMinPct}%`, width: `${optMaxPct - optMinPct}%`, background: "rgba(45,106,79,0.15)", borderRadius: 2 }} />
        {/* Dot */}
        <div style={{ position: "absolute", top: "50%", left: `${pct}%`, transform: "translate(-50%, -50%)", width: 8, height: 8, borderRadius: "50%", background: dotColor, border: "1.5px solid var(--off-white)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", zIndex: 1 }} />
      </div>
    </div>
  )
}

function StatusDots({ flags }: { flags: Flag[] }) {
  const top4 = flags.slice(0, 4)
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {top4.map((f, i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: f === "good" ? STATUS_COLORS.good : (f === "not_tested" || f === "pending") ? "transparent" : STATUS_COLORS[f],
          border: f === "good" ? "none" : `1px solid ${STATUS_COLORS[f]}`,
        }} />
      ))}
    </div>
  )
}

function CollapsiblePanel({
  title, score, maxScore, subtitle, statusDots, defaultOpen, delay, fadeUpFn, headerExtra, children,
}: {
  title: string; score?: number; maxScore?: number; subtitle?: string
  statusDots?: Flag[]; defaultOpen: boolean; delay: string
  fadeUpFn: (d: string) => React.CSSProperties; headerExtra?: React.ReactNode; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [hoverToggle, setHoverToggle] = useState(false)
  return (
    <div style={fadeUpFn(delay)}>
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: open ? 12 : 0, cursor: "pointer",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 300, color: "var(--ink)", margin: 0 }}>{title}</h3>
          {score !== undefined && maxScore !== undefined && (
            <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-30)" }}>
              {score}/{maxScore} pts
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {subtitle && (
            <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-60)" }}>{subtitle}</span>
          )}
          {headerExtra}
          {!open && statusDots && <StatusDots flags={statusDots} />}
          <div
            onMouseEnter={() => setHoverToggle(true)}
            onMouseLeave={() => setHoverToggle(false)}
            style={{
              width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              border: `0.5px solid ${hoverToggle ? "var(--gold)" : "var(--ink-12)"}`,
              color: hoverToggle ? "var(--gold)" : "var(--ink-30)",
              fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, lineHeight: 1,
              transition: "border-color 0.2s ease, color 0.2s ease", flexShrink: 0,
            }}
          >
            {open ? "−" : "+"}
          </div>
        </div>
      </div>
      <div style={{
        maxHeight: open ? 2000 : 0, opacity: open ? 1 : 0, overflow: "hidden",
        transition: "max-height 0.3s ease, opacity 0.3s ease",
      }}>
        {children}
      </div>
    </div>
  )
}

export function ScoreWheel({
  score, breakdown, sleepConnected, labFreshness, oralActive,
  sleepData, bloodData, oralData, lifestyleData, interactions,
  lastSyncAt, lastSyncRequestedAt,
  peaqPercent, peaqPercentLabel, lpaFlag, hsCRPRetestFlag, additionalMarkers,
  labLockExpiresAt, oralOrdered,
}: ScoreWheelProps) {
  const [mounted, setMounted] = useState(false)
  const [hoveredRing, setHoveredRing] = useState<string | null>(null)
  const [scorePulse, setScorePulse] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)
  const [displaySleep, setDisplaySleep] = useState(0)
  const [displayBlood, setDisplayBlood] = useState(0)
  const [displayOral, setDisplayOral] = useState(0)
  const [displayIx, setDisplayIx] = useState(0)

  useCountUp(score, 1400, 200, setDisplayScore)
  useCountUp(breakdown.sleepSub, 900, 350, setDisplaySleep)
  useCountUp(breakdown.bloodSub, 900, 450, setDisplayBlood)
  useCountUp(breakdown.oralSub, 900, 550, setDisplayOral)
  useCountUp(breakdown.interactionPool ?? 0, 800, 650, setDisplayIx)

  useEffect(() => {
    setMounted(true)
    // Score pulse after count-up finishes
    const t = setTimeout(() => {
      setScorePulse(true)
      setTimeout(() => setScorePulse(false), 400)
    }, 1800)
    return () => clearTimeout(t)
  }, [])

  const hasBlood = labFreshness !== "none" && labFreshness !== "expired"
  const bloodLocked = !hasBlood

  const RINGS = [
    { r: 96, circumference: 603.2,  color: "var(--sleep-c)", trackColor: "var(--sleep-bg)", fillPct: breakdown.sleepSub / 27, pending: !sleepConnected, animDelay: 300, ringKey: "sleep", glowColor: "rgba(74,127,181,0.5)" },
    { r: 84, circumference: 527.8,  color: "var(--blood-c)", trackColor: "var(--blood-bg)", fillPct: breakdown.bloodSub / 33, pending: bloodLocked,      animDelay: 450, ringKey: "blood", glowColor: "rgba(192,57,43,0.45)" },
    { r: 72, circumference: 452.4,  color: "var(--oral-c)",  trackColor: "var(--oral-bg)",  fillPct: breakdown.oralSub / 27, pending: !oralActive,       animDelay: 600, ringKey: "oral",  glowColor: "rgba(45,106,79,0.45)" },
    { r: 60, circumference: 376.99, color: "var(--gold)",    trackColor: "var(--gold-dim)", fillPct: (breakdown.interactionPool ?? 0) / 15, pending: false,     animDelay: 750, ringKey: "ix",    glowColor: "rgba(184,134,11,0.5)" },
  ]

  const LEGEND = [
    { label: "Sleep",        color: "var(--sleep-c)", active: sleepConnected },
    { label: "Blood",        color: "var(--blood-c)", active: hasBlood },
    { label: `Oral${!oralActive ? " (pending)" : ""}`, color: "var(--oral-c)", active: oralActive },
    { label: "Interactions", color: "var(--gold)",    active: true },
  ]

  const subline = ""

  // Stale badge
  const staleBadge = labFreshness === "stale" && bloodData ? `⚠ ${bloodData.monthsOld} mo old` : labFreshness === "aging" && bloodData ? `${bloodData.monthsOld} mo old` : undefined

  // Panel descriptions — derived from real data only, no hardcoded copy
  const sleepDesc = sleepConnected && sleepData?.lastSync
    ? `Synced ${relTimeSince(sleepData.lastSync)} via ${sleepData.device}`
    : ""

  // Blood: first sentence of AI insight, or empty
  const bloodDesc = bloodData?.bloodInsight
    ? bloodData.bloodInsight.split(".")[0] + "."
    : ""

  const oralDesc = (!oralActive && oralOrdered) ? "Kit processing" : ""

  // Sleep marker flags
  const sf = sleepData ? {
    deep:       flag(sleepData.deepPct >= 17, sleepData.deepPct >= 13),
    hrv:        flag(sleepData.hrv >= 50, sleepData.hrv >= 35),
    spo2Dips:   flag(sleepData.spo2Dips <= 2, sleepData.spo2Dips <= 5),
    rem:        flag(sleepData.remPct >= 18, sleepData.remPct >= 14),
    efficiency: flag(sleepData.efficiency >= 85, sleepData.efficiency >= 78),
  } : null

  // Flag helper: 0 means not tested
  const bflag = (val: number, good: boolean, watch?: boolean): Flag =>
    val === 0 ? "not_tested" : flag(good, watch)

  const bf = bloodData ? {
    hsCRP:     bflag(bloodData.hsCRP, bloodData.hsCRP < 0.5, bloodData.hsCRP < 2.0),
    vitaminD:  bflag(bloodData.vitaminD, bloodData.vitaminD >= 30 && bloodData.vitaminD <= 60, bloodData.vitaminD >= 20),
    apoB:      bflag(bloodData.apoB, bloodData.apoB < 90, bloodData.apoB < 120),
    ldlHdl:    bflag(bloodData.ldlHdlRatio, bloodData.ldlHdlRatio < 2.0, bloodData.ldlHdlRatio < 3.0),
    hba1c:     bflag(bloodData.hba1c, bloodData.hba1c < 5.4, bloodData.hba1c < 5.7),
    lpa:       bflag(bloodData.lpa, bloodData.lpa < 30, bloodData.lpa < 50),
    tg:        bflag(bloodData.triglycerides, bloodData.triglycerides < 150, bloodData.triglycerides < 200),
    ldl:       bflag(bloodData.ldl, bloodData.ldl < 100, bloodData.ldl < 130),
    hdl:       bflag(bloodData.hdl, bloodData.hdl >= 60, bloodData.hdl >= 40),
    glucose:   bflag(bloodData.glucose, bloodData.glucose >= 70 && bloodData.glucose < 100, bloodData.glucose < 126),
    egfr:      bflag(bloodData.egfr, bloodData.egfr >= 90, bloodData.egfr >= 60),
    hemoglobin: bflag(bloodData.hemoglobin, bloodData.hemoglobin >= 12 && bloodData.hemoglobin <= 17.5, bloodData.hemoglobin >= 10),
  } : null

  const of_ = oralData ? {
    shannon:   flag(oralData.shannonDiversity >= 3.0, oralData.shannonDiversity >= 2.0),
    nitrate:   flag(oralData.nitrateReducersPct >= 5, oralData.nitrateReducersPct >= 2),
    periodont: flag(oralData.periodontPathPct < 0.5, oralData.periodontPathPct < 1.5),
    osa:       flag(oralData.osaTaxaPct < 1.0, oralData.osaTaxaPct < 2.0),
  } : null

  const fa = (n: number, max: number) => Math.min((n / max) * 100, 100)

  const fadeUp = (delay: string): React.CSSProperties => ({
    animation: "fadeUp 0.7s ease both",
    animationDelay: delay,
  })

  const exerciseLabel: Record<string, string> = { active: "Active (4+ days/wk)", moderate: "Moderate (2–3 days/wk)", light: "Light (1 day/wk)", sedentary: "Sedentary" }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 0 64px", display: "flex", flexDirection: "column", gap: 40 }}>

      {/* RING */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, ...fadeUp("0s") }}>
        <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--ink-30)", margin: 0 }}>
          YOUR PEAQ SCORE · {new Date().toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
        </p>
        <ScoreRingComponent
          rings={RINGS}
          score={score}
          displayScore={displayScore}
          onRingHover={setHoveredRing}
          hoveredRing={hoveredRing}
          scorePulse={scorePulse}
        />
        <RingLegend items={LEGEND} />
        {peaqPercent !== undefined && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-30)", margin: 0 }}>
              Data Completeness · {peaqPercentLabel}
            </p>
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { label: "Sleep",     pct: breakdown.sleepSub / 27,          color: "var(--sleep-c)" },
                { label: "Blood",     pct: breakdown.bloodSub / 33,          color: "var(--blood-c)" },
                { label: "Oral",      pct: breakdown.oralSub / 27,           color: "var(--oral-c)"  },
                { label: "Lifestyle", pct: breakdown.lifestyleSub / 8,       color: "var(--gold)"    },
              ].map(bar => (
                <div key={bar.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--ink-06)", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, bar.pct * 100)}%`, height: "100%", background: bar.color, borderRadius: 2, transition: "width 0.8s ease" }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 8, color: "var(--ink-30)", textTransform: "uppercase" }}>{bar.label}</span>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--ink-60)", margin: 0 }}>
              {peaqPercent}% complete
            </p>
          </div>
        )}
      </div>

      {/* HERO */}
      <div style={fadeUp("0s")}>
        <HeroTitle sleepConnected={sleepConnected} hasBlood={hasBlood} oralActive={oralActive} subline={subline} />
      </div>

      {/* PENDING BANNERS */}
      {(!sleepConnected || !oralActive || labFreshness === "none" || labFreshness === "expired" || labFreshness === "stale") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, ...fadeUp("0.04s") }}>
          {!sleepConnected && <PendingBanner type="sleep" />}
          {labFreshness === "none" && <PendingBanner type="blood" />}
          {labFreshness === "expired" && <PendingBanner type="blood-expired" />}
          {labFreshness === "stale" && bloodData && <PendingBanner type="blood-stale" monthsOld={bloodData.monthsOld} />}
          {!oralActive && <PendingBanner type="oral" />}
        </div>
      )}

      {/* PANEL GRID */}
      <div style={fadeUp("0.08s")}>
        <PanelGrid
          displaySleep={displaySleep} displayBlood={displayBlood} displayOral={displayOral} displayIx={displayIx}
          sleepConnected={sleepConnected} labFreshness={labFreshness} oralActive={oralActive}
          ixPool={breakdown.interactionPool} interactions={interactions}
          sleepDesc={sleepDesc} bloodDesc={bloodDesc} oralDesc={oralDesc}
          staleBadge={staleBadge} mounted={mounted} hoveredRing={hoveredRing}
        />
      </div>

      {/* CTA BLOCKS */}
      <CTABlocks sleepConnected={sleepConnected} labFreshness={labFreshness} oralActive={oralActive} />

      {/* SLEEP MARKERS */}
      <CollapsiblePanel
        title="Sleep"
        score={Math.round(breakdown.sleepSub * 10) / 10}
        maxScore={27}
        subtitle={sleepData ? `${sleepData.nightsAvg}-NIGHT AVG · ${sleepData.device.toUpperCase()}` : "NO DATA"}
        statusDots={sf ? [sf.deep, sf.hrv, sf.spo2Dips, sf.rem] : undefined}
        defaultOpen={sleepConnected}
        delay="0.14s"
        fadeUpFn={fadeUp}
      >
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
          {sleepData && (
            <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-30)", padding: "8px 0 0", margin: 0 }}>
              Via {sleepData.device} · Last sync {sleepData.lastSync ? new Date(sleepData.lastSync).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
            </p>
          )}
          {[
            { name: "Deep sleep",       sub: "Slow-wave · target ≥17%",    val: sleepData?.deepPct,   unit: "% of TST",  flagKey: "deep",       max: 30 },
            { name: "HRV",              sub: "RMSSD · target ≥50 ms",      val: sleepData?.hrv,       unit: "ms RMSSD",  flagKey: "hrv",        max: 100 },
            { name: "SpO2 dips",        sub: "Events <90% · target ≤2",    val: sleepData?.spo2Dips,  unit: "per night", flagKey: "spo2Dips",   max: 10 },
            { name: "REM",              sub: "Target ≥18%",                 val: sleepData?.remPct,    unit: "% of TST",  flagKey: "rem",        max: 30 },
            { name: "Sleep efficiency", sub: "Target ≥85%",                 val: sleepData?.efficiency,unit: "% in bed",  flagKey: "efficiency", max: 100 },
          ].map(row => (
            <MarkerRow key={row.name} name={row.name} sub={row.sub}
              value={row.val ?? null} unit={row.unit}
              flag={sf ? (sf[row.flagKey as keyof typeof sf] as Flag) : "pending"}
              barPct={row.val !== undefined ? fa(row.val, row.max) : 0}
              color="var(--sleep-c)" trackColor="var(--sleep-bg)"
              hoverBg="rgba(74,127,181,0.04)" mounted={mounted}
            />
          ))}
        </div>
      </CollapsiblePanel>

      {/* BLOOD MARKERS */}
      <CollapsiblePanel
        title="Blood"
        score={breakdown.bloodSub}
        maxScore={33}
        subtitle={bloodData ? `${bloodData.labName.toUpperCase()} · ${new Date(bloodData.collectionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}` : "NO DATA"}
        statusDots={bf ? [bf.hsCRP, bf.apoB, bf.lpa, bf.tg] : undefined}
        defaultOpen={hasBlood}
        delay="0.20s"
        fadeUpFn={fadeUp}
        headerExtra={hasBlood ? (
          <a
            href="/settings/labs"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
              fontSize: 11,
              fontVariant: "small-caps",
              letterSpacing: "0.04em",
              color: "var(--ink-30)",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--gold)" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink-30)" }}
          >
            ↑ re-upload labs
          </a>
        ) : undefined}
      >
        {/* Lock countdown removed — locking still happens in background */}
        {(labFreshness === "stale") && bloodData && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 12, borderRadius: 4, background: "var(--amber-bg)" }}>
            <span style={{ color: "var(--amber)" }}>⚠</span>
            <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--amber)" }}>
              These results are {bloodData.monthsOld} months old. Retest recommended.
            </span>
          </div>
        )}
        {hsCRPRetestFlag && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 8, borderRadius: 4, background: "var(--blood-bg)", border: "0.5px solid rgba(192,57,43,0.25)" }}>
            <span style={{ color: "var(--blood-c)" }}>↑</span>
            <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--blood-c)" }}>
              hsCRP &gt;10 mg/L may indicate acute inflammation. Retest in 2–4 weeks once resolved.
            </span>
          </div>
        )}
        {bloodData?.bloodInsight && (
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", fontSize: 16, color: "var(--ink-80)", lineHeight: 1.55, margin: "0 0 14px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {bloodData.bloodInsight}
          </p>
        )}
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
          {[
            { name: "hsCRP",         sub: "High-sensitivity · target <0.5",  val: bloodData?.hsCRP,         unit: "mg/L",  flagKey: "hsCRP",    max: 5    },
            { name: "Vitamin D",     sub: "25-OH · target 30–60 ng/mL",      val: bloodData?.vitaminD,       unit: "ng/mL", flagKey: "vitaminD", max: 80   },
            { name: "ApoB",          sub: "Particles · target <90",           val: bloodData?.apoB,           unit: "mg/dL", flagKey: "apoB",     max: 150  },
            { name: "LDL : HDL",     sub: "Ratio · target <2.0",             val: bloodData?.ldlHdlRatio,    unit: "ratio", flagKey: "ldlHdl",   max: 5    },
            { name: "HbA1c",         sub: "Glycaemia · target <5.4%",        val: bloodData?.hba1c,          unit: "%",     flagKey: "hba1c",    max: 8    },
            { name: "Lp(a)",         sub: "Lipoprotein(a) · target <30",     val: bloodData?.lpa,            unit: "mg/dL", flagKey: "lpa",      max: 80,   note: lpaFlag ? "Genetic cardiovascular risk factor — discuss with your physician" : undefined },
            { name: "Triglycerides", sub: "Target <150 mg/dL",               val: bloodData?.triglycerides,  unit: "mg/dL", flagKey: "tg",       max: 300  },
          ].map(row => {
            const notTested = row.val === undefined || row.val === 0
            return (
              <MarkerRow key={row.name} name={row.name} sub={row.sub}
                value={notTested ? null : formatValue(row.val!)} unit={row.unit}
                flag={notTested ? "not_tested" : bf ? (bf[row.flagKey as keyof typeof bf] as Flag) : "pending"}
                barPct={notTested ? 0 : fa(row.val!, row.max)}
                color="var(--blood-c)" trackColor="var(--blood-bg)"
                hoverBg="rgba(192,57,43,0.04)" mounted={mounted}
                note={(row as { note?: string }).note}
              />
            )
          })}
        </div>
        {bloodData && (() => {
          const useApoB = bloodData.apoB > 0
          const useLDL  = !useApoB && bloodData.ldl > 0
          const useHbA1c = bloodData.hba1c > 0 && bloodData.glucose === 0
          return (
            <div style={{ marginTop: 4 }}>
              {useApoB && (
                <SpectrumRow name="ApoB" value={bloodData.apoB} unit="mg/dL"
                  f={bf!.apoB} min={40} max={160} optMin={40} optMax={90} />
              )}
              {useLDL && (
                <SpectrumRow name="LDL" value={bloodData.ldl} unit="mg/dL"
                  f={bf!.ldl} min={40} max={220} optMin={40} optMax={100} />
              )}
              {bloodData.hdl > 0 && (
                <SpectrumRow name="HDL" value={bloodData.hdl} unit="mg/dL"
                  f={bf!.hdl} min={20} max={100} optMin={60} optMax={100} />
              )}
              {bloodData.glucose > 0 && (
                <SpectrumRow name="Glucose" value={bloodData.glucose} unit="mg/dL"
                  f={bf!.glucose} min={60} max={180} optMin={70} optMax={99} />
              )}
              {useHbA1c && (
                <SpectrumRow name="HbA1c" value={bloodData.hba1c} unit="%"
                  f={bf!.hba1c} min={4} max={10} optMin={4} optMax={5.4} />
              )}
              {bloodData.egfr > 0 && (
                <SpectrumRow name="eGFR" value={bloodData.egfr} unit="mL/min"
                  f={bf!.egfr} min={0} max={130} optMin={90} optMax={130} />
              )}
              {bloodData.hemoglobin > 0 && (
                <SpectrumRow name="Hemoglobin" value={bloodData.hemoglobin} unit="g/dL"
                  f={bf!.hemoglobin} min={8} max={20} optMin={12} optMax={17.5} />
              )}
            </div>
          )
        })()}
        {bloodData && (() => {
          const missing: Array<{ label: string; pts: number }> = []
          if (!bloodData.hsCRP)   missing.push({ label: "hs-CRP",   pts: 3 })
          if (!bloodData.hba1c)   missing.push({ label: "HbA1c",    pts: 3 })
          if (!bloodData.vitaminD) missing.push({ label: "Vitamin D", pts: 2 })
          if (missing.length === 0) return null
          return (
            <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 6, background: "var(--gold-dim)", border: "0.5px solid rgba(184,134,11,0.2)" }}>
              <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-60)", margin: "0 0 8px" }}>
                These markers would strengthen your score
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {missing.map(m => (
                  <a key={m.label} href="/settings/labs" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 4, background: "var(--off-white)", border: "0.5px solid rgba(184,134,11,0.3)", textDecoration: "none", cursor: "pointer" }}>
                    <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--ink)" }}>{m.label}</span>
                    <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "#B8860B" }}>+{m.pts} pts</span>
                  </a>
                ))}
              </div>
            </div>
          )
        })()}
        {hasBlood && (
          <a href="/dashboard/blood" style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--gold)", display: "block", marginTop: 12 }}>
            View full blood panel →
          </a>
        )}
      </CollapsiblePanel>

      {/* ADDITIONAL MARKERS (collapsible) */}
      {additionalMarkers && additionalMarkers.length > 0 && (
        <CollapsiblePanel
          title="Additional Markers"
          subtitle={`${additionalMarkers.length} markers · not scored`}
          defaultOpen={false}
          delay="0.23s"
          fadeUpFn={fadeUp}
        >
          {additionalMarkers.map((m) => (
            <div
              key={m.name}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 0", borderBottom: "0.5px solid var(--ink-06)",
              }}
            >
              <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink-60)" }}>{m.name}</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink)" }}>{formatValue(m.value)}</span>
                <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, color: "var(--ink-30)" }}>{m.unit}</span>
              </div>
            </div>
          ))}
        </CollapsiblePanel>
      )}

      {/* ORAL MARKERS */}
      <CollapsiblePanel
        title="Oral Microbiome"
        score={breakdown.oralSub}
        maxScore={27}
        subtitle={oralData ? `ZYMO RESEARCH · ${new Date(oralData.reportDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()}` : (oralOrdered ? "PROCESSING" : "")}
        statusDots={of_ ? [of_.shannon, of_.nitrate, of_.periodont, of_.osa] : undefined}
        defaultOpen={oralActive}
        delay="0.26s"
        fadeUpFn={fadeUp}
      >
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
          {[
            { name: "Shannon diversity",   sub: "16S species richness · target ≥3.0",         val: oralData?.shannonDiversity,   unit: "index",   flagKey: "shannon",  max: 5  },
            { name: "Nitrate-reducing",    sub: "Neisseria · Rothia · Veillonella · ≥5%",     val: oralData?.nitrateReducersPct, unit: "% reads", flagKey: "nitrate",  max: 20 },
            { name: "Periodontal path.",   sub: "P. gingivalis · T. denticola · target <0.5%", val: oralData?.periodontPathPct,   unit: "% reads", flagKey: "periodont",max: 3  },
            { name: "OSA-associated taxa", sub: "Prevotella · Fusobacterium · target <1%",     val: oralData?.osaTaxaPct,         unit: "% reads", flagKey: "osa",      max: 5  },
          ].map(row => (
            <MarkerRow key={row.name} name={row.name} sub={row.sub}
              value={row.val ?? null} unit={row.unit}
              flag={of_ ? (of_[row.flagKey as keyof typeof of_] as Flag) : "pending"}
              barPct={row.val !== undefined ? fa(row.val, row.max) : 0}
              color="var(--oral-c)" trackColor="var(--oral-bg)"
              hoverBg="rgba(45,106,79,0.04)" mounted={mounted}
            />
          ))}
        </div>
      </CollapsiblePanel>

      {/* LIFESTYLE */}
      <CollapsiblePanel
        title="Lifestyle"
        score={Math.round(breakdown.lifestyleSub * 10) / 10}
        maxScore={8}
        subtitle={lifestyleData ? `QUESTIONNAIRE · ${new Date(lifestyleData.updatedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()}` : "QUESTIONNAIRE"}
        defaultOpen={!!lifestyleData}
        delay="0.30s"
        fadeUpFn={fadeUp}
      >
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
          {[
            { name: "Exercise", val: lifestyleData ? exerciseLabel[lifestyleData.exerciseTier] : null, flag: lifestyleData ? (lifestyleData.exerciseTier === "sedentary" ? "attention" : lifestyleData.exerciseTier === "light" ? "watch" : "good") as Flag : "pending" as Flag },
            { name: "Oral hygiene", val: lifestyleData ? `Brushing ${lifestyleData.brushingFreq}×/day${lifestyleData.flossingFreq >= 5 ? " + flossing" : ""}` : null, flag: lifestyleData ? (lifestyleData.brushingFreq >= 2 ? "good" : "watch") as Flag : "pending" as Flag },
            { name: "Dental visits", val: lifestyleData ? (lifestyleData.dentalVisits >= 2 ? "Twice per year" : lifestyleData.dentalVisits >= 1 ? "Once per year" : "Rarely") : null, flag: lifestyleData ? (lifestyleData.dentalVisits >= 1 ? "good" : "attention") as Flag : "pending" as Flag },
            { name: "Smoking", val: lifestyleData ? (lifestyleData.smoking ? "Current smoker" : "Non-smoker") : null, flag: lifestyleData ? (lifestyleData.smoking ? "attention" : "good") as Flag : "pending" as Flag },
          ].map(row => (
            <div key={row.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid var(--ink-06)" }}>
              <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink)" }}>{row.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink-60)" }}>{row.val ?? "—"}</span>
                <span style={{
                  fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 8px", borderRadius: 3,
                  background: row.flag === "good" ? "var(--oral-bg)" : row.flag === "watch" ? "var(--amber-bg)" : row.flag === "attention" ? "var(--blood-bg)" : "var(--warm-50)",
                  color: row.flag === "good" ? "var(--status-optimal)" : row.flag === "watch" ? "var(--amber)" : row.flag === "attention" ? "var(--status-attention)" : "var(--ink-60)",
                }}>
                  {row.flag === "pending" ? "Pending" : row.flag === "good" ? "Good" : row.flag === "watch" ? "Watch" : "Attention"}
                </span>
              </div>
            </div>
          ))}
        </div>
        <a href="/settings/lifestyle" style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--gold)", display: "block", marginTop: 12 }}>
          Update lifestyle answers →
        </a>
      </CollapsiblePanel>

      {/* INSIGHTS */}
      <div style={fadeUp("0.32s")}>
        <Insights
          sleepConnected={sleepConnected} hasBlood={hasBlood} oralActive={oralActive}
          sleepHrv={sleepData?.hrv} sleepDeepPct={sleepData?.deepPct}
          bloodHsCrp={bloodData?.hsCRP} bloodApoB={bloodData?.apoB}
          oralPeriodont={oralData?.periodontPathPct}
        />
      </div>

      {/* NEXT STEPS */}
      <div style={fadeUp("0.38s")}>
        <NextSteps
          sleepConnected={sleepConnected} hasBlood={hasBlood} oralActive={oralActive}
          bloodLdl={bloodData?.ldl}
          bloodHsCrp={bloodData?.hsCRP}
          bloodVitaminD={bloodData?.vitaminD}
          bloodGlucose={bloodData?.glucose}
          bloodHba1c={bloodData?.hba1c}
        />
      </div>

      {/* FOOTER */}
      <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, textAlign: "center", color: "var(--ink-30)", maxWidth: 400, margin: "0 auto", lineHeight: 1.7 }}>
        For informational purposes only. Peaq does not provide medical advice. Always consult a licensed healthcare provider regarding your results.
      </p>
    </div>
  )
}

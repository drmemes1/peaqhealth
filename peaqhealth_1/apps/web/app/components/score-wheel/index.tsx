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
    interactionPool: number
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
    collectionDate: string
    labName: string
    monthsOld: number
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
  }
  peaqPercent?:      number
  peaqPercentLabel?: string
  lpaFlag?:          "elevated" | "very_elevated" | null
  hsCRPRetestFlag?:  boolean
}

function flag(good: boolean, watch?: boolean): Flag {
  if (good) return "good"
  if (watch) return "watch"
  return "attention"
}

export function ScoreWheel({
  score, breakdown, sleepConnected, labFreshness, oralActive,
  sleepData, bloodData, oralData, lifestyleData, interactions,
  lastSyncAt, lastSyncRequestedAt,
  peaqPercent, peaqPercentLabel, lpaFlag, hsCRPRetestFlag,
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
  useCountUp(breakdown.interactionPool, 800, 650, setDisplayIx)

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
    { r: 60, circumference: 376.99, color: "var(--gold)",    trackColor: "var(--gold-dim)", fillPct: breakdown.interactionPool / 15, pending: false,     animDelay: 750, ringKey: "ix",    glowColor: "rgba(184,134,11,0.5)" },
  ]

  const LEGEND = [
    { label: "Sleep",        color: "var(--sleep-c)", active: sleepConnected },
    { label: "Blood",        color: "var(--blood-c)", active: hasBlood },
    { label: `Oral${!oralActive ? " (pending)" : ""}`, color: "var(--oral-c)", active: oralActive },
    { label: "Interactions", color: "var(--gold)",    active: true },
  ]

  // Dynamic headline subline
  let subline = "Connect a wearable or upload lab results to begin building your Peaq Score."
  if (sleepConnected && hasBlood && oralActive) subline = "All three panels active. Your Peaq Score reflects a complete metabolic picture."
  else if (sleepConnected && hasBlood) subline = "Blood panel is strong. Sleep is your main lever. Add your oral microbiome panel to complete the picture."
  else if (sleepConnected && oralActive) subline = "Two panels complete. Add blood results to unlock all cross-panel interactions."
  else if (sleepConnected) subline = "Wearable connected. Add blood labs and your oral kit to complete your profile."

  // Stale badge
  const staleBadge = labFreshness === "stale" && bloodData ? `⚠ ${bloodData.monthsOld} mo old` : labFreshness === "aging" && bloodData ? `${bloodData.monthsOld} mo old` : undefined

  // Panel descriptions
  const sleepDesc = sleepConnected ? "Deep sleep and HRV are your main levers." : "No wearable connected. Connect Apple Watch, Oura, WHOOP, or Garmin."
  const bloodDesc = hasBlood ? "hsCRP, ApoB, and Lp(a) in excellent range. Glycemic tracking well." : "No lab results. Upload your most recent blood panel."
  const oralDesc = oralActive ? "Shannon diversity and periodontal burden in range." : "Kit results pending. High diversity and low periodontal burden are your targets."
  const ixDesc = oralActive ? "All interaction terms evaluated." : "4 oral interaction terms locked pending kit results."

  // Sleep marker flags
  const sf = sleepData ? {
    deep:       flag(sleepData.deepPct >= 17, sleepData.deepPct >= 13),
    hrv:        flag(sleepData.hrv >= 50, sleepData.hrv >= 35),
    spo2Dips:   flag(sleepData.spo2Dips <= 2, sleepData.spo2Dips <= 5),
    rem:        flag(sleepData.remPct >= 18, sleepData.remPct >= 14),
    efficiency: flag(sleepData.efficiency >= 85, sleepData.efficiency >= 78),
  } : null

  const bf = bloodData ? {
    hsCRP:     flag(bloodData.hsCRP < 0.5, bloodData.hsCRP < 2.0),
    vitaminD:  flag(bloodData.vitaminD >= 30 && bloodData.vitaminD <= 60, bloodData.vitaminD >= 20),
    apoB:      flag(bloodData.apoB < 90, bloodData.apoB < 120),
    ldlHdl:    flag(bloodData.ldlHdlRatio < 2.0, bloodData.ldlHdlRatio < 3.0),
    hba1c:     flag(bloodData.hba1c < 5.4, bloodData.hba1c < 5.7),
    lpa:       flag(bloodData.lpa < 30, bloodData.lpa < 50),
    tg:        flag(bloodData.triglycerides < 150, bloodData.triglycerides < 200),
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
          sleepDesc={sleepDesc} bloodDesc={bloodDesc} oralDesc={oralDesc} ixDesc={ixDesc}
          staleBadge={staleBadge} mounted={mounted} hoveredRing={hoveredRing}
        />
      </div>

      {/* CTA BLOCKS */}
      <CTABlocks sleepConnected={sleepConnected} labFreshness={labFreshness} oralActive={oralActive} />

      {/* SLEEP MARKERS */}
      <div style={fadeUp("0.14s")}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 300, color: "var(--ink)", margin: 0 }}>Sleep</h3>
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-60)" }}>
            {sleepData ? `${sleepData.nightsAvg}-NIGHT AVG · ${sleepData.device.toUpperCase()}` : "NO DATA"}
          </span>
        </div>
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
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
      </div>

      {/* BLOOD MARKERS */}
      <div style={fadeUp("0.20s")}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 300, color: "var(--ink)", margin: 0 }}>Blood</h3>
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-60)" }}>
            {bloodData ? `${bloodData.labName.toUpperCase()} · ${new Date(bloodData.collectionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}` : "NO DATA"}
          </span>
        </div>
        {(labFreshness === "stale") && bloodData && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 12, borderRadius: 4, background: "var(--amber-bg)" }}>
            <span style={{ color: "var(--amber)" }}>⚠</span>
            <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--amber)" }}>
              These results are {bloodData.monthsOld} months old. Retest recommended.
            </span>
          </div>
        )}
        {hsCRPRetestFlag && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 8, borderRadius: 4, background: "rgba(220,38,38,0.06)", border: "0.5px solid rgba(220,38,38,0.2)" }}>
            <span style={{ color: "#dc2626" }}>↑</span>
            <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "#991b1b" }}>
              hsCRP &gt;10 mg/L may indicate acute inflammation. Retest in 2–4 weeks once resolved.
            </span>
          </div>
        )}
        {lpaFlag && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 8, borderRadius: 4, background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.3)" }}>
            <span style={{ color: "#d97706" }}>⚑</span>
            <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "#92400e" }}>
              Lp(a) {lpaFlag === "very_elevated" ? "very elevated (>50 mg/dL)" : "elevated (30–50 mg/dL)"}. Genetic cardiovascular risk factor — discuss with your physician.
            </span>
          </div>
        )}
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
          {[
            { name: "hsCRP",         sub: "High-sensitivity · target <0.5",  val: bloodData?.hsCRP,         unit: "mg/L",  flagKey: "hsCRP",    max: 5    },
            { name: "Vitamin D",     sub: "25-OH · target 30–60 ng/mL",      val: bloodData?.vitaminD,       unit: "ng/mL", flagKey: "vitaminD", max: 80   },
            { name: "ApoB",          sub: "Particles · target <90",           val: bloodData?.apoB,           unit: "mg/dL", flagKey: "apoB",     max: 150  },
            { name: "LDL : HDL",     sub: "Ratio · target <2.0",             val: bloodData?.ldlHdlRatio,    unit: "ratio", flagKey: "ldlHdl",   max: 5    },
            { name: "HbA1c",         sub: "Glycaemia · target <5.4%",        val: bloodData?.hba1c,          unit: "%",     flagKey: "hba1c",    max: 8    },
            { name: "Lp(a)",         sub: "Lipoprotein(a) · target <30",     val: bloodData?.lpa,            unit: "mg/dL", flagKey: "lpa",      max: 80   },
            { name: "Triglycerides", sub: "Target <150 mg/dL",               val: bloodData?.triglycerides,  unit: "mg/dL", flagKey: "tg",       max: 300  },
          ].map(row => (
            <MarkerRow key={row.name} name={row.name} sub={row.sub}
              value={row.val ?? null} unit={row.unit}
              flag={bf ? (bf[row.flagKey as keyof typeof bf] as Flag) : "pending"}
              barPct={row.val !== undefined ? fa(row.val, row.max) : 0}
              color="var(--blood-c)" trackColor="var(--blood-bg)"
              hoverBg="rgba(192,57,43,0.04)" mounted={mounted}
            />
          ))}
        </div>
      </div>

      {/* ORAL MARKERS */}
      <div style={fadeUp("0.26s")}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 300, color: "var(--ink)", margin: 0 }}>Oral Microbiome</h3>
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-60)" }}>
            {oralData ? `ZYMO RESEARCH · ${new Date(oralData.reportDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()}` : "ZYMO RESEARCH · PENDING"}
          </span>
        </div>
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
      </div>

      {/* LIFESTYLE */}
      <div style={fadeUp("0.30s")}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 300, color: "var(--ink)", margin: 0 }}>Lifestyle</h3>
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-60)" }}>
            {lifestyleData ? `QUESTIONNAIRE · ${new Date(lifestyleData.updatedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()}` : "QUESTIONNAIRE"}
          </span>
        </div>
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
                  background: row.flag === "good" ? "#EAF3DE" : row.flag === "watch" ? "#FEF3C7" : row.flag === "attention" ? "#FEE2E2" : "#F7F5F0",
                  color: row.flag === "good" ? "#2D6A4F" : row.flag === "watch" ? "#92400E" : row.flag === "attention" ? "#991B1B" : "rgba(20,20,16,0.6)",
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
      </div>

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
          sleepHrv={sleepData?.hrv} sleepDeepPct={sleepData?.deepPct}
          labFreshness={labFreshness} bloodMonthsOld={bloodData?.monthsOld}
        />
      </div>

      {/* FOOTER */}
      <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, textAlign: "center", color: "var(--ink-30)", maxWidth: 400, margin: "0 auto", lineHeight: 1.7 }}>
        For informational purposes only. Peaq does not provide medical advice. Always consult a licensed healthcare provider regarding your results.
      </p>
    </div>
  )
}

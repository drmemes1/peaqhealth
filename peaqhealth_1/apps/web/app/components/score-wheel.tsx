"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ScoreRing } from "./score-ring"
import { MarkerRow } from "./marker-row"
import { PendingBanner } from "./pending-banner"
import { InsightCard } from "./insight-card"
import { sleepFlags, bloodFlags, oralFlags, type Flag } from "@peaq/score-engine/flags"

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ScoreWheelProps {
  score: number
  breakdown: {
    sleepSub: number
    bloodSub: number
    oralSub: number
    lifestyleSub: number
    interactionPool: number
  }
  sleepConnected: boolean
  labFreshness: 'fresh' | 'aging' | 'stale' | 'expired' | 'none'
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
    exerciseTier: 'active' | 'moderate' | 'light' | 'sedentary'
    brushingFreq: number
    flossingFreq: number
    dentalVisits: number
    smoking: boolean
    updatedAt: string
  }
  interactions: {
    sleepInflammation: boolean
    spo2Lipid: boolean
    dualInflammatory: boolean
    hrvHomocysteine: boolean
    periodontCRP: boolean
    osaTaxaSpO2: boolean
    lowNitrateCRP: boolean
    lowDiversitySleep: boolean
  }
}

// ─── Count-up helper ────────────────────────────────────────────────────────────

function countUp(from: number, to: number, duration: number, setter: (n: number) => void) {
  const start = performance.now()
  const ease = (t: number) => 1 - Math.pow(1 - t, 3)
  const step = (now: number) => {
    const p = Math.min((now - start) / duration, 1)
    setter(Math.round(from + (to - from) * ease(p)))
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// ─── Interaction chip data ──────────────────────────────────────────────────────

const IX_CHIPS = [
  { key: "sleepInflammation", label: "Sleep × CRP",       requiresOral: false },
  { key: "spo2Lipid",         label: "SpO2 × Lipids",     requiresOral: false },
  { key: "dualInflammatory",  label: "ESR + CRP dual",    requiresOral: false },
  { key: "hrvHomocysteine",   label: "HRV × Homocysteine",requiresOral: false },
  { key: "periodontCRP",      label: "Oral path × CRP",   requiresOral: true  },
  { key: "osaTaxaSpO2",       label: "OSA taxa × SpO2",   requiresOral: true  },
  { key: "lowNitrateCRP",     label: "Nitrate × CRP",     requiresOral: true  },
  { key: "lowDiversitySleep", label: "Diversity × Sleep", requiresOral: true  },
]

// ─── Main component ─────────────────────────────────────────────────────────────

export function ScoreWheel({
  score,
  breakdown,
  sleepConnected,
  labFreshness,
  oralActive,
  sleepData,
  bloodData,
  oralData,
  lifestyleData,
  interactions,
}: ScoreWheelProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Displayed scores (count-up)
  const [displayScore,     setDisplayScore]     = useState(0)
  const [displaySleep,     setDisplaySleep]     = useState(0)
  const [displayBlood,     setDisplayBlood]     = useState(0)
  const [displayOral,      setDisplayOral]      = useState(0)
  const [displayIx,        setDisplayIx]        = useState(0)

  const RINGS = [
    { r: 96,  circumference: 603.2,  color: "var(--sleep-c)", trackColor: "var(--sleep-bg)",  fillPct: breakdown.sleepSub / 32,  pending: !sleepConnected, animDelay: 300  },
    { r: 84,  circumference: 527.8,  color: "var(--blood-c)", trackColor: "var(--blood-bg)",  fillPct: breakdown.bloodSub / 28,  pending: labFreshness === 'none' || labFreshness === 'expired', animDelay: 450 },
    { r: 72,  circumference: 452.4,  color: "var(--oral-c)",  trackColor: "var(--oral-bg)",   fillPct: breakdown.oralSub / 25,   pending: !oralActive,      animDelay: 600  },
    { r: 60,  circumference: 376.99, color: "var(--gold)",    trackColor: "var(--gold-dim)",   fillPct: breakdown.interactionPool / 15, pending: false,     animDelay: 750  },
  ]

  useEffect(() => {
    setMounted(true)
    const t = setTimeout(() => {
      countUp(0, score, 1400, setDisplayScore)
      setTimeout(() => countUp(0, breakdown.sleepSub,      900, setDisplaySleep),  150)
      setTimeout(() => countUp(0, breakdown.bloodSub,      900, setDisplayBlood),  250)
      setTimeout(() => countUp(0, breakdown.oralSub,       900, setDisplayOral),   350)
      setTimeout(() => countUp(0, breakdown.interactionPool, 900, setDisplayIx), 450)
    }, 200)
    return () => clearTimeout(t)
  }, [score, breakdown])

  // ─── Derived flags ──────────────────────────────────────────────────────────
  const sf = sleepData ? sleepFlags(sleepData) : null
  const bf = bloodData ? bloodFlags(bloodData) : null
  const of_ = oralData ? oralFlags(oralData) : null

  // ─── Dynamic headline ───────────────────────────────────────────────────────
  const hasBlood = labFreshness !== 'none' && labFreshness !== 'expired'
  let headline: React.ReactNode
  let subline: string
  if (sleepConnected && hasBlood && oralActive) {
    headline = <>Looking <em style={{ color: "var(--gold)", fontStyle: "italic" }}>really good.</em></>
    subline = "All three panels active. Your Peaq Score reflects a complete metabolic picture."
  } else if (sleepConnected && hasBlood) {
    headline = <>Looking <em style={{ color: "var(--gold)", fontStyle: "italic" }}>good.</em><br />Room to optimise.</>
    subline = "Blood panel is strong. Sleep is your main lever. Add your oral microbiome panel to complete the picture."
  } else if (sleepConnected && oralActive) {
    headline = <>Sleep and oral <em style={{ color: "var(--gold)", fontStyle: "italic" }}>active.</em></>
    subline = "Two panels complete. Add blood results to unlock all cross-panel interactions."
  } else if (sleepConnected) {
    headline = <>Sleep data <em style={{ color: "var(--gold)", fontStyle: "italic" }}>active.</em></>
    subline = "Wearable connected. Add blood labs and your oral kit to complete your profile."
  } else {
    headline = <>Getting <em style={{ color: "var(--gold)", fontStyle: "italic" }}>started.</em></>
    subline = "Connect a wearable or upload lab results to begin building your Peaq Score."
  }

  // ─── Lifestyle display ──────────────────────────────────────────────────────
  const exerciseLabel: Record<string, string> = { active: "Active (4+ days/wk)", moderate: "Moderate (2–3 days/wk)", light: "Light (1 day/wk)", sedentary: "Sedentary" }
  const oralHygieneLabel = (brushing: number, flossing: number) => {
    const b = brushing >= 2 ? "Daily brushing" : brushing >= 1 ? "Once daily brushing" : "Infrequent brushing"
    const f = flossing >= 5 ? " + daily flossing" : flossing >= 1 ? " + occasional flossing" : ""
    return b + f
  }
  const dentalLabel = (v: number) => v >= 2 ? "Twice per year" : v === 1 ? "Once per year" : "Rarely / never"
  const smokingLabel = (s: boolean) => s ? "Current smoker" : "Non-smoker"

  // ─── Next steps ─────────────────────────────────────────────────────────────
  type NextStep = { num: number; bold: string; rest: string }
  const nextSteps: NextStep[] = []
  if (sleepConnected && sf && sf.hrv !== 'good') {
    nextSteps.push({ num: 1, bold: "Prioritise sleep timing consistency.", rest: " HRV responds strongly to consistent sleep and wake times — a 30-minute variance reduction shifts RMSSD by 5–8 ms over 4 weeks." })
  }
  if (sleepData && sleepData.deepPct < 17) {
    nextSteps.push({ num: nextSteps.length + 1, bold: "Temperature for deep sleep.", rest: " Core temperature drop drives slow-wave entry. A cooler room (65–68°F) is the highest-evidence environmental lever for increasing SWS." })
  }
  if (!oralActive) {
    nextSteps.push({ num: nextSteps.length + 1, bold: "Complete your oral kit.", rest: " 25 points and 4 interaction terms pending. The oral panel is the only measurement that directly bridges sleep, cardiovascular risk, and metabolic health in a single test." })
  } else {
    nextSteps.push({ num: nextSteps.length + 1, bold: "Retest oral in 90 days.", rest: " Shannon diversity responds to fibre intake and sleep quality within 6–8 weeks." })
  }
  if (bloodData && (labFreshness === 'stale')) {
    nextSteps.push({ num: nextSteps.length + 1, bold: `Retest blood in ${Math.max(0, 365 - bloodData.monthsOld * 30)} days.`, rest: " ApoB and Lp(a) are stable markers. Request HbA1c at the same draw to track glycaemic trend alongside sleep improvements." })
  } else if (!hasBlood) {
    nextSteps.push({ num: nextSteps.length + 1, bold: "Upload recent lab results", rest: " to unlock your blood panel and 28 additional points." })
  }
  // Ensure at least 1
  if (nextSteps.length === 0) {
    nextSteps.push({ num: 1, bold: "Your profile is complete.", rest: " Keep syncing your wearable daily and retest labs in 90 days to track your progress." })
  }

  const fadeUp = (delay: string) => ({
    animation: `fadeUp 0.7s ease both`,
    animationDelay: delay,
  } as React.CSSProperties)

  return (
    <div className="flex flex-col gap-10 pb-16" style={{ maxWidth: 720, margin: "0 auto" }}>

      {/* ── SCORE RING ────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-5" style={fadeUp("0s")}>
        <p className="font-body text-[10px] uppercase tracking-[0.15em]" style={{ color: "var(--ink-30)" }}>
          YOUR PEAQ SCORE · {new Date().toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
        </p>

        <div style={{ position: "relative", width: 220, height: 220 }}>
          {/* SVG rings */}
          <svg
            viewBox="0 0 220 220"
            width={220}
            height={220}
            style={{ transform: "rotate(-90deg)" }}
          >
            {RINGS.map((ring, i) => (
              <ScoreRing key={i} {...ring} fillPct={mounted ? ring.fillPct : 0} />
            ))}
          </svg>

          {/* Center score */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <span
              className="font-display font-light"
              style={{ fontSize: 70, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--ink)" }}
            >
              {displayScore}
            </span>
            <span
              className="font-body uppercase"
              style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--ink-60)", marginTop: 2 }}
            >
              of 100
            </span>
          </div>
        </div>

        {/* Ring legend */}
        <div className="flex items-center gap-5 flex-wrap justify-center">
          {[
            { label: "Sleep",        color: "var(--sleep-c)", active: sleepConnected },
            { label: "Blood",        color: "var(--blood-c)", active: hasBlood },
            { label: "Oral" + (!oralActive ? " (pending)" : ""), color: "var(--oral-c)", active: oralActive },
            { label: "Interactions", color: "var(--gold)",    active: true },
          ].map(({ label, color, active }) => (
            <div key={label} className="flex items-center gap-1.5">
              {active ? (
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
              ) : (
                <div style={{ width: 7, height: 7, borderRadius: "50%", border: `1.5px dashed ${color}`, opacity: 0.5 }} />
              )}
              <span className="font-body text-[11px]" style={{ color: "var(--ink-60)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── HERO HEADLINE ─────────────────────────────────────────────────── */}
      <div className="text-center" style={fadeUp("0s")}>
        <h2
          className="font-display font-light"
          style={{ fontSize: 34, letterSpacing: "-0.01em", color: "var(--ink)", lineHeight: 1.2 }}
        >
          {headline}
        </h2>
        <p className="font-body text-[13px] mt-3 mx-auto leading-[1.7]" style={{ color: "var(--ink-60)", maxWidth: 360 }}>
          {subline}
        </p>
      </div>

      {/* ── PENDING BANNERS ───────────────────────────────────────────────── */}
      {((!sleepConnected) || (!oralActive) || labFreshness === 'none' || labFreshness === 'expired' || labFreshness === 'stale') && (
        <div className="flex flex-col gap-2" style={fadeUp("0.04s")}>
          {!sleepConnected && <PendingBanner type="sleep" />}
          {labFreshness === 'none' && <PendingBanner type="blood" />}
          {labFreshness === 'expired' && <PendingBanner type="blood" />}
          {labFreshness === 'stale' && bloodData && <PendingBanner type="blood-stale" monthsOld={bloodData.monthsOld} />}
          {!oralActive && <PendingBanner type="oral" />}
        </div>
      )}

      {/* ── PANEL BREAKDOWN GRID ──────────────────────────────────────────── */}
      <div style={fadeUp("0.08s")}>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-display text-[22px] font-light" style={{ color: "var(--ink)" }}>Panel breakdown</h3>
          <span className="font-body text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-30)" }}>Score composition</span>
        </div>

        {/* 3-col grid top */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-3">
          {/* Sleep */}
          <PanelCard
            label="Sleep"
            color="var(--sleep-c)"
            trackColor="var(--sleep-bg)"
            score={displaySleep}
            max={32}
            active={sleepConnected}
            desc={sleepConnected ? "Deep sleep and HRV are your main levers. SpO2 and REM within range." : "No wearable connected. Connect Apple Watch, Oura, WHOOP, or Garmin."}
            mounted={mounted}
          />
          {/* Blood */}
          <PanelCard
            label="Blood"
            color="var(--blood-c)"
            trackColor="var(--blood-bg)"
            score={displayBlood}
            max={28}
            active={hasBlood}
            desc={hasBlood ? "hsCRP, ApoB, and Lp(a) in excellent range. Glycemic tracking well." : "No lab results. Upload your most recent blood panel."}
            staleBadge={labFreshness === 'stale' && bloodData ? `${bloodData.monthsOld} months old` : undefined}
            mounted={mounted}
          />
          {/* Oral */}
          <PanelCard
            label="Oral Microbiome"
            color="var(--oral-c)"
            trackColor="var(--oral-bg)"
            score={displayOral}
            max={25}
            active={oralActive}
            desc={oralActive ? "Shannon diversity and periodontal burden in range." : "Kit results pending. High diversity and low periodontal burden are your targets."}
            mounted={mounted}
          />
        </div>

        {/* Interactions — full width */}
        <div
          style={{
            background: "white",
            border: "0.5px solid var(--ink-12)",
            borderRadius: 4,
            borderTop: "2px solid var(--gold)",
            padding: "14px 16px",
          }}
        >
          <div className="flex items-start gap-4">
            {/* Left: score + desc */}
            <div style={{ flex: "0 0 55%" }}>
              <span className="font-body text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--ink-60)" }}>Cross-panel Interactions</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-[32px] font-light" style={{ color: "var(--gold)" }}>{displayIx}</span>
                <span className="font-body text-[12px]" style={{ color: "var(--ink-30)" }}>/ 15</span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 3, borderRadius: 2, background: "var(--warm-100)", margin: "6px 0 8px" }}>
                <div style={{
                  height: "100%",
                  width: mounted ? `${(breakdown.interactionPool / 15) * 100}%` : "0%",
                  background: "var(--gold)",
                  borderRadius: 2,
                  transition: "width 600ms ease 400ms",
                }} />
              </div>
              <p className="font-body text-[12px]" style={{ color: "var(--ink-60)" }}>
                {breakdown.interactionPool === 15
                  ? "No interactions detected. All terms clear."
                  : `No interactions detected. ${!oralActive ? "4 oral interaction terms locked pending kit results." : "All terms evaluated."}`
                }
              </p>
            </div>

            {/* Right: IX chips */}
            <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: "6px", paddingTop: 2 }}>
              {IX_CHIPS.map(chip => {
                const locked = chip.requiresOral && !oralActive
                return (
                  <span
                    key={chip.key}
                    className="font-body text-[10px] px-2.5 py-1 rounded"
                    style={
                      locked
                        ? { background: "var(--warm-50)", color: "var(--ink-30)", border: "0.5px dashed var(--ink-12)" }
                        : { background: "#EAF3DE", color: "#2D6A4F" }
                    }
                  >
                    {chip.label}{!locked ? " — clear" : ""}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── SLEEP CTA ─────────────────────────────────────────────────────── */}
      {!sleepConnected && (
        <CTABlock
          color="var(--sleep-c)"
          title={<>Unlock your <em>sleep panel.</em></>}
          points="+32 pts"
          features={[
            "Deep sleep % — slow-wave and metabolic recovery",
            "HRV RMSSD — autonomic recovery and resilience",
            "SpO2 dips — sleep-breathing and OSA signal",
            "REM % — cognitive and emotional processing",
            "Unlocks all 7 cross-panel interaction terms",
            "Score updates nightly — 7-night minimum to unlock",
          ]}
          buttonLabel="Connect wearable — Apple Health, Oura, WHOOP"
          onClick={() => router.push("/onboarding")}
        />
      )}

      {/* ── BLOOD CTA ─────────────────────────────────────────────────────── */}
      {(labFreshness === 'none' || labFreshness === 'expired') && (
        <CTABlock
          color="var(--blood-c)"
          title={<>Unlock your <em>blood panel.</em></>}
          points="+28 pts"
          features={[
            "hsCRP — inflammatory status",
            "ApoB — primary atherogenic particle marker",
            "Vitamin D — immune and metabolic function",
            "Lp(a) — genetic cardiovascular risk",
            "LDL:HDL ratio and triglycerides",
            "Lab freshness tracked — score adjusts over time",
          ]}
          buttonLabel="Upload lab results"
          onClick={() => router.push("/settings/labs")}
        />
      )}

      {/* ── ORAL CTA ──────────────────────────────────────────────────────── */}
      {!oralActive && (
        <CTABlock
          color="var(--oral-c)"
          title={<>Complete your <em>Peaq profile.</em></>}
          points="+25 pts"
          features={[
            "Shannon diversity index from 16S sequencing",
            "Nitrate-reducing bacteria — your NO production pathway",
            "Periodontal pathogen burden — cardiovascular signal",
            "OSA-associated taxa — oral sleep-breathing prediction",
            "4 cross-panel interaction terms unlocked",
            "Results in 10–14 days via Zymo Research",
          ]}
          buttonLabel="Order oral microbiome kit — $129"
          onClick={() => router.push("/shop")}
        />
      )}

      {/* ── SLEEP MARKERS ─────────────────────────────────────────────────── */}
      <div style={fadeUp("0.14s")}>
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-display text-[22px] font-light" style={{ color: "var(--ink)" }}>Sleep</h3>
          <span className="font-body text-[11px]" style={{ color: "var(--ink-60)" }}>
            {sleepData ? `${sleepData.nightsAvg}-NIGHT AVG · ${sleepData.device.toUpperCase()}` : "NO DATA"}
          </span>
        </div>
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
          {[
            { name: "Deep sleep",       sub: "Slow-wave · target ≥17%",        val: sleepData?.deepPct ?? null,  unit: "% of TST",  flagKey: "deep",       max: 30 },
            { name: "HRV",              sub: "RMSSD · target ≥50 ms",          val: sleepData?.hrv ?? null,      unit: "ms RMSSD",  flagKey: "hrv",        max: 100 },
            { name: "SpO2 dips",        sub: "Events <90% · target ≤2",        val: sleepData?.spo2Dips ?? null, unit: "per night", flagKey: "spo2Dips",   max: 10 },
            { name: "REM",              sub: "Target ≥18%",                     val: sleepData?.remPct ?? null,   unit: "% of TST",  flagKey: "rem",        max: 30 },
            { name: "Sleep efficiency", sub: "Target ≥85%",                     val: sleepData?.efficiency ?? null, unit: "% in bed",flagKey: "efficiency", max: 100 },
          ].map(row => (
            <MarkerRow
              key={row.name}
              name={row.name}
              sub={row.sub}
              value={row.val}
              unit={row.unit}
              flag={sf ? sf[row.flagKey] as Flag : "pending"}
              max={row.max}
              color="var(--sleep-c)"
              trackColor="var(--sleep-bg)"
              mounted={mounted}
            />
          ))}
        </div>
      </div>

      {/* ── BLOOD MARKERS ─────────────────────────────────────────────────── */}
      <div style={fadeUp("0.20s")}>
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-display text-[22px] font-light" style={{ color: "var(--ink)" }}>Blood</h3>
          <span className="font-body text-[11px]" style={{ color: "var(--ink-60)" }}>
            {bloodData ? `${bloodData.labName.toUpperCase()} · ${new Date(bloodData.collectionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}` : "NO DATA"}
          </span>
        </div>
        {labFreshness === 'stale' && bloodData && (
          <div className="flex items-center gap-2 px-4 py-2.5 mb-3 rounded" style={{ background: "var(--amber-bg)" }}>
            <span style={{ color: "var(--amber)" }}>⚠</span>
            <span className="font-body text-[12px]" style={{ color: "var(--amber)" }}>
              These results are {bloodData.monthsOld} months old. Retest recommended.
            </span>
          </div>
        )}
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
          {[
            { name: "hsCRP",         sub: "High-sensitivity · target <0.5",  val: bloodData?.hsCRP ?? null,          unit: "mg/L",   flagKey: "hsCRP",    max: 5    },
            { name: "Vitamin D",     sub: "25-OH · target 30–60 ng/mL",      val: bloodData?.vitaminD ?? null,       unit: "ng/mL",  flagKey: "vitaminD", max: 80   },
            { name: "ApoB",          sub: "Particles · target <90",           val: bloodData?.apoB ?? null,           unit: "mg/dL",  flagKey: "apoB",     max: 150  },
            { name: "LDL : HDL",     sub: "Ratio · target <2.0",             val: bloodData?.ldlHdlRatio ?? null,    unit: "ratio",  flagKey: "ldlHdl",   max: 5    },
            { name: "HbA1c",         sub: "Glycaemia · target <5.4%",        val: bloodData?.hba1c ?? null,          unit: "%",      flagKey: "hba1c",    max: 8    },
            { name: "Lp(a)",         sub: "Lipoprotein(a) · target <30",     val: bloodData?.lpa ?? null,            unit: "mg/dL",  flagKey: "lpa",      max: 80   },
            { name: "Triglycerides", sub: "Target <150 mg/dL",               val: bloodData?.triglycerides ?? null,  unit: "mg/dL",  flagKey: "tg",       max: 300  },
          ].map(row => (
            <MarkerRow
              key={row.name}
              name={row.name}
              sub={row.sub}
              value={row.val}
              unit={row.unit}
              flag={bf ? bf[row.flagKey] as Flag : "pending"}
              max={row.max}
              color="var(--blood-c)"
              trackColor="var(--blood-bg)"
              mounted={mounted}
            />
          ))}
        </div>
      </div>

      {/* ── ORAL MARKERS ──────────────────────────────────────────────────── */}
      <div style={fadeUp("0.26s")}>
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-display text-[22px] font-light" style={{ color: "var(--ink)" }}>Oral Microbiome</h3>
          <span className="font-body text-[11px]" style={{ color: "var(--ink-60)" }}>
            {oralData ? `ZYMO RESEARCH · ${new Date(oralData.reportDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}` : "ZYMO RESEARCH · PENDING"}
          </span>
        </div>
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
          {[
            { name: "Shannon diversity",    sub: "16S species richness · target ≥3.0",      val: oralData?.shannonDiversity ?? null,    unit: "index",   flagKey: "shannon",   max: 5    },
            { name: "Nitrate-reducing",     sub: "Neisseria · Rothia · Veillonella · ≥5%",  val: oralData?.nitrateReducersPct ?? null,  unit: "% reads", flagKey: "nitrate",   max: 20   },
            { name: "Periodontal path.",    sub: "P. gingivalis · T. denticola · target <0.5%", val: oralData?.periodontPathPct ?? null, unit: "% reads", flagKey: "periodont", max: 3    },
            { name: "OSA-associated taxa",  sub: "Prevotella · Fusobacterium · target <1%", val: oralData?.osaTaxaPct ?? null,          unit: "% reads", flagKey: "osa",       max: 5    },
          ].map(row => (
            <MarkerRow
              key={row.name}
              name={row.name}
              sub={row.sub}
              value={row.val}
              unit={row.unit}
              flag={of_ ? of_[row.flagKey] as Flag : "pending"}
              max={row.max}
              color="var(--oral-c)"
              trackColor="var(--oral-bg)"
              mounted={mounted}
            />
          ))}
        </div>
      </div>

      {/* ── LIFESTYLE SECTION ─────────────────────────────────────────────── */}
      <div style={fadeUp("0.30s")}>
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-display text-[22px] font-light" style={{ color: "var(--ink)" }}>Lifestyle</h3>
          <span className="font-body text-[11px]" style={{ color: "var(--ink-60)" }}>
            {lifestyleData ? `QUESTIONNAIRE · UPDATED ${new Date(lifestyleData.updatedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()}` : "QUESTIONNAIRE"}
          </span>
        </div>
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
          {[
            { name: "Exercise", sub: "Physical activity level", val: lifestyleData ? exerciseLabel[lifestyleData.exerciseTier] : null, flag: lifestyleData ? (lifestyleData.exerciseTier === 'sedentary' ? 'attention' : lifestyleData.exerciseTier === 'light' ? 'watch' : 'good') as Flag : 'pending' as Flag },
            { name: "Oral hygiene", sub: "Daily brushing and flossing", val: lifestyleData ? oralHygieneLabel(lifestyleData.brushingFreq, lifestyleData.flossingFreq) : null, flag: lifestyleData ? (lifestyleData.brushingFreq >= 2 && lifestyleData.flossingFreq >= 5 ? 'good' : lifestyleData.brushingFreq >= 1 ? 'watch' : 'attention') as Flag : 'pending' as Flag },
            { name: "Dental visits", sub: "Annual frequency", val: lifestyleData ? dentalLabel(lifestyleData.dentalVisits) : null, flag: lifestyleData ? (lifestyleData.dentalVisits >= 2 ? 'good' : lifestyleData.dentalVisits >= 1 ? 'watch' : 'attention') as Flag : 'pending' as Flag },
            { name: "Smoking", sub: "Tobacco use", val: lifestyleData ? smokingLabel(lifestyleData.smoking) : null, flag: lifestyleData ? (lifestyleData.smoking ? 'attention' : 'good') as Flag : 'pending' as Flag },
          ].map(row => (
            <div key={row.name} className="flex items-center gap-3 py-3" style={{ borderBottom: "0.5px solid var(--ink-06)" }}>
              <div style={{ flex: 1 }}>
                <p className="font-body text-[13px]" style={{ color: "var(--ink)" }}>{row.name}</p>
                <p className="font-body text-[11px]" style={{ color: "var(--ink-60)" }}>{row.sub}</p>
              </div>
              <div style={{ flex: 1 }}>
                <p className="font-body text-[13px]" style={{ color: "var(--ink)" }}>{row.val ?? "—"}</p>
              </div>
              <span
                className="font-body text-[9px] uppercase tracking-[0.05em] px-2 py-0.5 rounded"
                style={
                  row.flag === 'good'      ? { background: "#EAF3DE", color: "#2D6A4F" } :
                  row.flag === 'watch'     ? { background: "#FEF3C7", color: "#92400E" } :
                  row.flag === 'attention' ? { background: "#FEE2E2", color: "#991B1B" } :
                                            { background: "#F7F5F0", color: "rgba(20,20,16,0.6)" }
                }
              >
                {row.flag === 'pending' ? 'Pending' : row.flag === 'good' ? 'Good' : row.flag === 'watch' ? 'Watch' : 'Attention'}
              </span>
            </div>
          ))}
        </div>
        <a href="/settings/lifestyle" className="font-body text-[12px] mt-3 block" style={{ color: "var(--gold)" }}>
          Update lifestyle answers →
        </a>
      </div>

      {/* ── INSIGHTS ──────────────────────────────────────────────────────── */}
      <div style={fadeUp("0.32s")}>
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-display text-[22px] font-light" style={{ color: "var(--ink)" }}>Insights</h3>
          <span className="font-body text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--ink-30)" }}>What your data is telling you</span>
        </div>
        <div className="flex flex-col gap-3">
          {sleepConnected && sleepData && sf && sf.hrv !== 'good' && (
            <InsightCard
              title="HRV below target — autonomic recovery opportunity"
              body={`RMSSD at ${sleepData.hrv}ms is below the ≥50ms target. Dalton 2025 (n=1,139 NIH-AARP): consistent sleep timing variance under 30 minutes shifts RMSSD by 5–8ms over 4 weeks. Your deep sleep at ${sleepData.deepPct}% is the linked lever.`}
              tag="Sleep · Recovery"
              accentColor="var(--sleep-c)"
              tagBg="var(--sleep-bg)"
              tagColor="var(--sleep-c)"
            />
          )}
          {hasBlood && bloodData && bf && bf.hsCRP === 'good' && (
            <InsightCard
              title="hsCRP at threshold — inflammatory baseline good"
              body={`At ${bloodData.hsCRP} mg/L you sit at the optimal ceiling. JUPITER trial (n=17,802): below 2.0 represents low inflammatory cardiovascular risk. ApoB at ${bloodData.apoB} mg/dL provides strong atherogenic protection.`}
              tag="Blood · Cardiovascular"
              accentColor="var(--blood-c)"
              tagBg="var(--blood-bg)"
              tagColor="var(--blood-c)"
            />
          )}
          {oralActive && oralData && of_ && of_.periodont === 'good' && (
            <InsightCard
              title="Periodontal burden low — cardiovascular protective"
              body={`Periodontal pathogen burden at ${oralData.periodontPathPct}% is optimal. Frontiers Immunology 2023 (n=1,791) detected P. gingivalis directly in coronary plaques. This is a genuine cardiovascular protective factor most people never measure.`}
              tag="Oral × Blood · Cross-panel"
              accentColor="var(--gold)"
              tagBg="var(--gold-dim)"
              tagColor="var(--gold)"
            />
          )}
          {!oralActive && (
            <InsightCard
              title="Oral microbiome unlocks 4 interaction terms"
              body="Your oral bacteria directly predict sleep-breathing risk, cardiovascular inflammation, and nitric oxide production. Dalton 2025 (n=1,139 NIH-AARP): oral microbiome diversity independently predicts sleep quality scores."
              tag="Oral · Pending"
              accentColor="var(--oral-c)"
              tagBg="var(--oral-bg)"
              tagColor="var(--oral-c)"
              muted={true}
            />
          )}
        </div>
      </div>

      {/* ── NEXT STEPS ────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--ink)",
          borderRadius: 4,
          padding: "26px",
          ...fadeUp("0.38s"),
        }}
      >
        <h3
          className="font-display font-light mb-6"
          style={{ fontSize: 25, color: "white" }}
        >
          What to focus on{" "}
          <em style={{ color: "var(--gold)", fontStyle: "italic" }}>next.</em>
        </h3>
        <div className="flex flex-col gap-5">
          {nextSteps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <span
                className="font-display shrink-0"
                style={{ fontSize: 20, color: "var(--gold)", width: 18 }}
              >
                {step.num}
              </span>
              <p className="font-body text-[13px] leading-[1.65]" style={{ color: "rgba(255,255,255,0.7)" }}>
                <strong style={{ color: "white", fontWeight: 500 }}>{step.bold}</strong>
                {step.rest}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <p
        className="font-body text-[11px] text-center leading-[1.7] mx-auto"
        style={{ color: "var(--ink-30)", maxWidth: 400 }}
      >
        For informational purposes only. Peaq does not provide medical advice.
        Always consult a licensed healthcare provider regarding your results.
      </p>
    </div>
  )
}

// ─── Sub-components defined inline ─────────────────────────────────────────────

function PanelCard({
  label, color, trackColor, score, max, active, desc, staleBadge, mounted,
}: {
  label: string; color: string; trackColor: string; score: number; max: number;
  active: boolean; desc: string; staleBadge?: string; mounted: boolean;
}) {
  return (
    <div style={{
      background: "white",
      border: "0.5px solid var(--ink-12)",
      borderRadius: 4,
      borderTop: `2px solid ${color}`,
      padding: "14px 16px",
    }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-body text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--ink-60)" }}>{label}</span>
        {staleBadge && (
          <span className="font-body text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--amber-bg)", color: "var(--amber)" }}>{staleBadge}</span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-[32px] font-light" style={{ color: active ? color : "var(--ink-30)" }}>
          {active ? score : "—"}
        </span>
        <span className="font-body text-[12px]" style={{ color: "var(--ink-30)" }}>/ {max}</span>
      </div>
      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, background: trackColor, margin: "6px 0 8px", overflow: "hidden" }}>
        {active ? (
          <div style={{
            height: "100%",
            width: mounted ? `${(score / max) * 100}%` : "0%",
            background: color,
            borderRadius: 2,
            transition: "width 600ms ease 400ms",
          }} />
        ) : (
          <div style={{
            height: "100%",
            width: "100%",
            backgroundImage: `repeating-linear-gradient(90deg, ${color}22 0, ${color}22 6px, transparent 6px, transparent 14px)`,
          }} />
        )}
      </div>
      <p className="font-body text-[12px]" style={{ color: "var(--ink-60)" }}>{desc}</p>
    </div>
  )
}

function CTABlock({
  color, title, points, features, buttonLabel, onClick,
}: {
  color: string; title: React.ReactNode; points: string; features: string[]; buttonLabel: string; onClick: () => void;
}) {
  return (
    <div style={{ borderRadius: 4, overflow: "hidden", marginBottom: 0 }}>
      <div className="flex items-baseline justify-between px-5 py-4" style={{ background: color }}>
        <h3
          className="font-display text-[20px] font-light"
          style={{ color: "white" }}
        >
          {title}
        </h3>
        <span className="font-body text-[11px] uppercase" style={{ color: "rgba(255,255,255,0.65)" }}>{points} available</span>
      </div>
      <div style={{ background: "white", border: "0.5px solid var(--ink-12)", borderTop: "none", padding: "16px 20px", borderRadius: "0 0 4px 4px" }}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-4">
          {features.map(f => (
            <div key={f} className="flex gap-1.5">
              <span className="font-body text-[12px] shrink-0 font-medium" style={{ color }}>→</span>
              <span className="font-body text-[12px]" style={{ color: "var(--ink-60)" }}>{f}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onClick}
          className="w-full font-body text-[12px] uppercase tracking-[0.08em] text-white py-3"
          style={{ background: color, borderRadius: 2 }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

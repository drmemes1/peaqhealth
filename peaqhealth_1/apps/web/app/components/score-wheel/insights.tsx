"use client"
import { useEffect, useRef, useState } from "react"

interface InsightCardProps {
  title: string
  body: string
  tag: string
  accentColor: string
  tagBg: string
  tagColor: string
  muted?: boolean
  cardIndex: number
}

function InsightCard({ title, body, tag, accentColor, tagBg, tagColor, muted, cardIndex }: InsightCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scrolled = window.innerHeight - rect.top
      const rate = 0.04
      const offset = Math.max(0, scrolled) * rate * (cardIndex % 2 === 0 ? 1 : -0.5)
      el.style.transform = `translateY(${-offset}px) ${visible ? "" : "translateY(14px)"}`
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [cardIndex, visible])

  return (
    <div
      ref={ref}
      className="insight-card"
      style={{
        background: "white",
        border: "0.5px solid var(--ink-12)",
        borderRadius: 4,
        borderLeft: `3px solid ${accentColor}`,
        padding: "16px 18px",
        opacity: visible ? (muted ? 0.6 : 1) : 0,
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}
    >
      <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 17, fontWeight: 400, color: "var(--ink)", margin: "0 0 6px" }}>{title}</p>
      <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, lineHeight: 1.7, color: "var(--ink-60)", margin: "0 0 12px" }}>{body}</p>
      <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 8px", borderRadius: 3, background: tagBg, color: tagColor }}>
        {tag}
      </span>
    </div>
  )
}

interface InsightsProps {
  sleepConnected: boolean
  hasBlood: boolean
  oralActive: boolean
  sleepHrv?: number
  sleepDeepPct?: number
  bloodHsCrp?: number
  bloodApoB?: number
  oralPeriodont?: number
  // New v4.2 props
  familyHistoryCVD?: boolean
  stressLevel?: string
  alcoholDrinksPerWeek?: number
  sleepEfficiency?: number
}

export function Insights({ sleepConnected, hasBlood, oralActive, sleepHrv, sleepDeepPct, bloodHsCrp, bloodApoB, oralPeriodont, familyHistoryCVD, stressLevel, alcoholDrinksPerWeek, sleepEfficiency }: InsightsProps) {
  const cards = []
  let idx = 0

  // Only generate an insight when the value is real (> 0 and physiologically plausible)
  const realHrv   = sleepHrv   !== undefined && sleepHrv   > 0
  const realCrp   = bloodHsCrp !== undefined && bloodHsCrp > 0
  const realApoB  = bloodApoB  !== undefined && bloodApoB  > 0
  const deepLabel = (sleepDeepPct !== undefined && sleepDeepPct > 0) ? `${sleepDeepPct}%` : "—"
  const apoBLabel = realApoB ? `${bloodApoB} mg/dL` : "—"

  if (sleepConnected && realHrv && sleepHrv! < 50) {
    cards.push(
      <InsightCard key="hrv" cardIndex={idx++}
        title="HRV below target — autonomic recovery opportunity"
        body={`RMSSD at ${sleepHrv}ms is below the ≥50ms target. Dalton 2025 (n=1,139 NIH-AARP): consistent sleep timing variance under 30 minutes shifts RMSSD by 5–8ms over 4 weeks. Your deep sleep at ${deepLabel} is the linked lever.`}
        tag="Sleep · Recovery" accentColor="var(--sleep-c)" tagBg="var(--sleep-bg)" tagColor="var(--sleep-c)"
      />
    )
  }

  if (hasBlood && realCrp && bloodHsCrp! > 0 && bloodHsCrp! < 2.0) {
    cards.push(
      <InsightCard key="crp" cardIndex={idx++}
        title={`hsCRP at ${bloodHsCrp} mg/L — inflammatory baseline good`}
        body={`Below 2.0 mg/L represents low inflammatory cardiovascular risk (JUPITER trial, n=17,802). ApoB at ${apoBLabel} provides additional atherogenic context.`}
        tag="Blood · Cardiovascular" accentColor="var(--blood-c)" tagBg="var(--blood-bg)" tagColor="var(--blood-c)"
      />
    )
  }

  if (hasBlood && realCrp && bloodHsCrp! >= 2.0) {
    cards.push(
      <InsightCard key="crp-elevated" cardIndex={idx++}
        title={`hsCRP at ${bloodHsCrp} mg/L — inflammation elevated`}
        body={`Above 2.0 mg/L indicates elevated cardiovascular inflammatory risk. JUPITER trial (n=17,802): reducing hsCRP below 2.0 is an independent treatment target. Discuss with your physician.`}
        tag="Blood · Cardiovascular" accentColor="var(--blood-c)" tagBg="var(--blood-bg)" tagColor="var(--blood-c)"
      />
    )
  }

  if (oralActive && oralPeriodont !== undefined && oralPeriodont < 0.5) {
    cards.push(
      <InsightCard key="periodont" cardIndex={idx++}
        title="Periodontal burden low — cardiovascular protective"
        body={`Periodontal pathogen burden at ${oralPeriodont}% is optimal. Frontiers Immunology 2023 (n=1,791) detected P. gingivalis directly in coronary plaques. This is a genuine cardiovascular protective factor most people never measure.`}
        tag="Oral × Blood · Cross-panel" accentColor="var(--gold)" tagBg="var(--gold-dim)" tagColor="var(--gold)"
      />
    )
  }

  if (familyHistoryCVD && realApoB && bloodApoB! > 100) {
    cards.push(
      <InsightCard key="fam-cvd" cardIndex={idx++}
        title="Family history + elevated ApoB — cardiovascular priority"
        body={`Your family history of cardiovascular disease combined with ApoB at ${bloodApoB} mg/dL puts cardiovascular health as your top priority. Sniderman 2019: ApoB is a superior predictor of events vs LDL-C alone.`}
        tag="Blood · Genetic risk" accentColor="var(--blood-c)" tagBg="var(--blood-bg)" tagColor="var(--blood-c)"
      />
    )
  }

  if (stressLevel === "high" && realCrp && bloodHsCrp! > 3) {
    cards.push(
      <InsightCard key="stress-crp" cardIndex={idx++}
        title="High stress amplifying inflammation markers"
        body={`Chronic stress is amplifying your inflammatory markers — hsCRP at ${bloodHsCrp} mg/L. Irwin 2016: stress-inflammation pathways are bidirectional and self-reinforcing.`}
        tag="Lifestyle × Blood" accentColor="var(--gold)" tagBg="var(--gold-dim)" tagColor="var(--gold)"
      />
    )
  }

  if (alcoholDrinksPerWeek !== undefined && alcoholDrinksPerWeek > 10 && sleepConnected && sleepEfficiency !== undefined && sleepEfficiency > 0 && sleepEfficiency < 80) {
    cards.push(
      <InsightCard key="alcohol-sleep" cardIndex={idx++}
        title="Alcohol use affecting sleep quality"
        body={`${alcoholDrinksPerWeek} drinks/week appears to be affecting your sleep architecture — efficiency at ${sleepEfficiency}%. Alcohol suppresses REM sleep and fragments overnight recovery.`}
        tag="Lifestyle × Sleep" accentColor="var(--sleep-c)" tagBg="var(--sleep-bg)" tagColor="var(--sleep-c)"
      />
    )
  }

  // No data at all — show empty state instead of silently disappearing
  if (cards.length === 0 && !sleepConnected && !hasBlood && !oralActive) {
    return (
      <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", fontSize: 18, color: "rgba(20,20,16,0.4)", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
        Upload your lab results to unlock<br />personalized insights
      </p>
    )
  }

  if (cards.length === 0) return null

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 300, color: "var(--ink)", margin: 0 }}>Insights</h3>
        <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-30)" }}>What your data is telling you</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{cards}</div>
    </div>
  )
}

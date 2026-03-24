import React from "react"

interface HeroTitleProps {
  score: number
  sleepConnected: boolean
  hasBlood: boolean
  oralActive: boolean
  subline: string
}

export function HeroTitle({ score, sleepConnected, hasBlood, oralActive, subline }: HeroTitleProps) {
  const dataComplete = sleepConnected && hasBlood && oralActive
  const panelsLoaded = [sleepConnected, hasBlood, oralActive].filter(Boolean).length

  let headline: React.ReactNode

  if (!sleepConnected && !hasBlood && !oralActive) {
    // Nothing connected yet
    headline = <>Your journey <em style={{ color: "var(--gold)", fontStyle: "italic" }}>begins here.</em></>
  } else if (!dataComplete) {
    // Partial data — never judge the score, acknowledge what's active
    if (panelsLoaded === 1) {
      if (sleepConnected) {
        headline = <>Sleep data <em style={{ color: "var(--gold)", fontStyle: "italic" }}>connected.</em><br />Two panels still to come.</>
      } else if (hasBlood) {
        headline = <>Blood panel <em style={{ color: "var(--gold)", fontStyle: "italic" }}>active.</em><br />More to unlock.</>
      } else {
        headline = <>Oral panel <em style={{ color: "var(--gold)", fontStyle: "italic" }}>active.</em><br />More to unlock.</>
      }
    } else {
      // 2 of 3 panels
      headline = <>Picture is <em style={{ color: "var(--gold)", fontStyle: "italic" }}>coming together.</em><br />One panel still to come.</>
    }
  } else {
    // All three panels active — score is meaningful
    if (score >= 85) {
      headline = <>Excellent <em style={{ color: "var(--gold)", fontStyle: "italic" }}>health profile.</em></>
    } else if (score >= 70) {
      headline = <>Strong <em style={{ color: "var(--gold)", fontStyle: "italic" }}>foundation.</em><br />A few areas to refine.</>
    } else if (score >= 55) {
      headline = <>Real room to <em style={{ color: "var(--gold)", fontStyle: "italic" }}>improve.</em><br />The data shows you where.</>
    } else {
      headline = <>Your results <em style={{ color: "var(--gold)", fontStyle: "italic" }}>need attention.</em><br />Start with the highest-impact panel.</>
    }
  }

  return (
    <div style={{ textAlign: "center" }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 34, fontWeight: 300, letterSpacing: "-0.01em", color: "var(--ink)", lineHeight: 1.2, margin: 0 }}>
        {headline}
      </h2>
      <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, marginTop: 12, color: "var(--ink-60)", maxWidth: 360, margin: "12px auto 0", lineHeight: 1.7 }}>
        {subline}
      </p>
    </div>
  )
}

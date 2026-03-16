import React from "react"

interface HeroTitleProps {
  sleepConnected: boolean
  hasBlood: boolean
  oralActive: boolean
  subline: string
}

export function HeroTitle({ sleepConnected, hasBlood, oralActive, subline }: HeroTitleProps) {
  let headline: React.ReactNode

  if (sleepConnected && hasBlood && oralActive) {
    headline = <>Looking <em style={{ color: "var(--gold)", fontStyle: "italic" }}>really good.</em></>
  } else if (sleepConnected && hasBlood) {
    headline = <>Looking <em style={{ color: "var(--gold)", fontStyle: "italic" }}>good.</em><br />Room to optimise.</>
  } else if (sleepConnected && oralActive) {
    headline = <>Sleep and oral <em style={{ color: "var(--gold)", fontStyle: "italic" }}>active.</em></>
  } else if (sleepConnected) {
    headline = <>Sleep data <em style={{ color: "var(--gold)", fontStyle: "italic" }}>active.</em></>
  } else {
    headline = <>Getting <em style={{ color: "var(--gold)", fontStyle: "italic" }}>started.</em></>
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

"use client"

import Link from "next/link"
import { Nav } from "../components/nav"

const PANELS = [
  {
    key: "blood",
    label: "Blood",
    color: "#C0392B",
    bg: "var(--panel-blood-bg, #FCEBEB)",
    border: "var(--panel-blood-border, #A32D2D)",
    text: "var(--panel-blood-text, #791F1F)",
    href: "/dashboard/blood",
    description: "40+ biomarkers from your bloodwork — cardiovascular, metabolic, inflammatory, and organ function markers scored against clinical thresholds.",
    source: "LabCorp · Quest · Any standard lab",
    score: "/ 40 pts",
  },
  {
    key: "sleep",
    label: "Sleep",
    color: "#4A7FB5",
    bg: "var(--panel-sleep-bg, #E6F1FB)",
    border: "var(--panel-sleep-border, #185FA5)",
    text: "var(--panel-sleep-text, #0C447C)",
    href: "/dashboard/sleep",
    description: "Nightly deep sleep, HRV, SpO₂, REM, and sleep efficiency — synced from your wearable and scored against age-adjusted clinical targets.",
    source: "WHOOP · Oura · Garmin",
    score: "/ 30 pts",
  },
  {
    key: "oral",
    label: "Oral Microbiome",
    color: "#2D6A4F",
    bg: "var(--panel-oral-bg, #EAF3DE)",
    border: "var(--panel-oral-border, #3B6D11)",
    text: "var(--panel-oral-text, #27500A)",
    href: "/dashboard/oral",
    description: "16S rRNA species-level sequencing of your oral microbiome — Shannon diversity, nitrate reducers, periodontal pathogens, and OSA-associated taxa.",
    source: "Zymo Research 16S rRNA",
    score: "/ 30 pts",
  },
]

export default function PanelsPage() {
  return (
    <div className="min-h-svh bg-off-white">
      <Nav />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>

        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 36, fontWeight: 300, color: "var(--ink)",
          margin: "0 0 8px",
        }}>
          Panels
        </h1>
        <p style={{
          fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
          fontSize: 14, color: "var(--ink-60)", lineHeight: 1.7,
          margin: "0 0 40px", maxWidth: 480,
        }}>
          Your Peaq score is built from three biological panels. Each measures a different system — together they reveal what no single test can see.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {PANELS.map(p => (
            <Link
              key={p.key}
              href={p.href}
              style={{
                textDecoration: "none", color: "inherit", display: "block",
                borderRadius: 10,
                border: "0.5px solid var(--ink-08)",
                borderLeft: `3px solid ${p.color}`,
                background: "var(--peaq-bg-card, #fff)",
                padding: "20px 24px",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                cursor: "pointer",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = "translateY(-2px)"
                el.style.boxShadow = `0 8px 24px rgba(0,0,0,0.06), 0 0 0 1.5px ${p.border}`
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = ""
                el.style.boxShadow = ""
              }}
            >
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: p.color, flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                    fontSize: 15, fontWeight: 500, color: "var(--ink)",
                  }}>
                    {p.label}
                  </span>
                </div>
                <span style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 14, color: "var(--ink-30)",
                }}>
                  {p.score}
                </span>
              </div>

              {/* Description */}
              <p style={{
                fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                fontSize: 13, color: "var(--ink-60)", lineHeight: 1.6,
                margin: "0 0 10px",
              }}>
                {p.description}
              </p>

              {/* Source */}
              <span style={{
                fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                fontSize: 10, fontWeight: 500,
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: p.text, background: p.bg,
                padding: "2px 8px 2px 6px", borderRadius: 4,
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: p.color }} />
                {p.source}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}

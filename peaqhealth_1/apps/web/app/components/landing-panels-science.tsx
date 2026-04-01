"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { LandingCitations } from "./landing-citations"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', system-ui, sans-serif"

const INK    = "#141410"
const INK_40 = "rgba(20,20,16,0.40)"
const INK_60 = "rgba(20,20,16,0.60)"
const BORDER = "rgba(20,20,16,0.10)"
const ORAL   = "#2D6A4F"
const BLOOD  = "#C0392B"
const SLEEP  = "#4A7FB5"

const wrap: React.CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  padding: "0 10%",
}

const eyebrow: React.CSSProperties = {
  fontFamily: sans,
  fontSize: 11,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: INK_40,
  margin: "0 0 16px",
}

const rule: React.CSSProperties = {
  border: "none",
  borderTop: `0.5px solid ${BORDER}`,
  margin: 0,
}

const panels = [
  { key: "oral",  label: "Oral Microbiome", color: ORAL,  lines: ["16S rRNA sequencing", "Species-level resolution"] },
  { key: "blood", label: "Blood",           color: BLOOD, lines: ["40+ biomarkers", "from any lab"] },
  { key: "sleep", label: "Sleep",           color: SLEEP, lines: ["Nightly wearable", "HRV, deep sleep, SpO\u2082"] },
] as const

export function LandingPanelsAndScience() {
  const [activePanels, setActivePanels] = useState<string[]>([])

  const handleActivePanels = useCallback((p: string[]) => {
    setActivePanels(p)
  }, [])

  const hasActive = activePanels.length > 0

  return (
    <>
      {/* ══ SECTION 2 — THREE PANELS ══════════════════════════════════════ */}
      <section style={{ ...wrap, paddingTop: 96, paddingBottom: 96 }}>
        <p style={eyebrow}>Three panels. One score.</p>

        <p style={{
          fontFamily: serif, fontSize: "clamp(28px, 3.5vw, 42px)",
          fontWeight: 400, lineHeight: 1.3, margin: "0 0 48px", maxWidth: 560,
        }}>
          Most health platforms measure one thing.
          Peaq measures three — and finds the connections between them.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 48, marginBottom: 48,
        }}>
          {panels.map(p => {
            const isActive = activePanels.includes(p.key)
            return (
              <div key={p.key} style={{
                paddingTop: 24,
                transition: "opacity 0.3s ease",
                opacity: hasActive ? (isActive ? 1 : 0.3) : 1,
              }}>
                {/* Color rule */}
                <div style={{
                  height: hasActive && isActive ? 4 : 2,
                  background: p.color,
                  marginBottom: 20,
                  transition: "height 0.3s ease, box-shadow 0.3s ease",
                  boxShadow: hasActive && isActive ? `0 0 8px ${p.color}44` : "none",
                  borderRadius: 1,
                }} />

                <p style={{
                  fontFamily: sans, fontSize: 11, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  color: p.color, margin: "0 0 10px",
                  transition: "opacity 0.3s ease",
                  opacity: hasActive ? (isActive ? 1 : 0.4) : 1,
                }}>
                  {p.label}
                </p>
                {p.lines.map(l => (
                  <p key={l} style={{
                    fontFamily: sans, fontSize: 15, color: INK_60,
                    lineHeight: 1.7, margin: "2px 0",
                  }}>
                    {l}
                  </p>
                ))}
              </div>
            )
          })}
        </div>

        <p style={{
          fontFamily: serif, fontSize: 20, fontWeight: 400,
          fontStyle: "italic", color: INK_40, maxWidth: 520,
        }}>
          The insight isn&apos;t in any single panel.
          It&apos;s in what they reveal about each other.
        </p>
      </section>

      <hr style={rule} />

      {/* ══ SECTION 4 — SCIENCE ═══════════════════════════════════════════ */}
      <section style={{ ...wrap, paddingTop: 96, paddingBottom: 96 }}>
        <p style={eyebrow}>Grounded in peer-reviewed research</p>

        <p style={{
          fontFamily: sans, fontSize: 16, color: INK_60,
          lineHeight: 1.75, maxWidth: 560, margin: "0 0 48px",
        }}>
          The oral-systemic connection isn&apos;t new — it&apos;s just never
          been made measurable for individuals.
        </p>

        <LandingCitations onActivePanels={handleActivePanels} />

        <Link href="/science" style={{
          fontFamily: sans, fontSize: 13, color: INK_40,
          textDecoration: "none", display: "inline-block", marginTop: 32,
        }}>
          View full evidence base →
        </Link>
      </section>
    </>
  )
}

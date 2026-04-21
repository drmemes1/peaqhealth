"use client"

import Link from "next/link"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

interface Observation {
  panels: string[]
  statement: string
  pullPhrase?: string
}

export function ConvergeStrip({ observations }: { observations: Observation[] }) {
  if (observations.length === 0) return null

  return (
    <div style={{
      background: "#2C2A24", position: "relative", overflow: "hidden",
      borderRadius: 12, marginBottom: 24,
    }}>
      <div style={{ position: "absolute", top: -60, right: -60, width: 320, height: 320, background: "radial-gradient(circle, rgba(212,169,52,0.12) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -40, width: 240, height: 240, background: "radial-gradient(circle, rgba(212,169,52,0.06) 0%, transparent 65%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", padding: "28px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(212,169,52,0.9)" }}>
            What converges today
          </div>
          <Link href="/dashboard/cross-panel" style={{ fontFamily: sans, fontSize: 11, color: "rgba(212,169,52,0.7)", textDecoration: "none", letterSpacing: "0.06em" }}>
            Open Converge →
          </Link>
        </div>

        <div className="converge-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(observations.length, 3)}, 1fr)`, gap: 20 }}>
          {observations.map((obs, i) => (
            <div key={i}>
              <div style={{ fontFamily: sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,243,238,0.4)", marginBottom: 8 }}>
                {obs.panels.join(" + ")}
              </div>
              <p style={{ fontFamily: serif, fontSize: 15, color: "rgba(245,243,238,0.85)", lineHeight: 1.55, margin: 0 }}>
                {obs.statement}
                {obs.pullPhrase && <span style={{ color: "#D4A934", fontStyle: "italic" }}> {obs.pullPhrase}</span>}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`@media (max-width: 768px) { .converge-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}

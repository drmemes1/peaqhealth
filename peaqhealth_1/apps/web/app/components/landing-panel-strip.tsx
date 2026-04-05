"use client"

import { useEffect, useRef, useState } from "react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', system-ui, sans-serif"

interface PanelChip {
  color: string
  label: string
  max: number
  scoreMin: number
  scoreMax: number
  pctMin: number
  pctMax: number
  cycleSec: number
  pulseDelay: number // ms offset for pulsing dot
}

const PANELS: PanelChip[] = [
  { color: "var(--sleep-c, #185FA5)", label: "Sleep", max: 30, scoreMin: 18, scoreMax: 27, pctMin: 60, pctMax: 85, cycleSec: 4.5, pulseDelay: 0 },
  { color: "var(--blood-c, #A32D2D)", label: "Blood", max: 40, scoreMin: 28, scoreMax: 38, pctMin: 75, pctMax: 95, cycleSec: 5.2, pulseDelay: 600 },
  { color: "var(--oral-c, #3B6D11)",  label: "Oral",  max: 30, scoreMin: 6,  scoreMax: 14, pctMin: 20, pctMax: 45, cycleSec: 3.8, pulseDelay: 1200 },
]

function useOscillate(min: number, max: number, cycleSec: number) {
  const [value, setValue] = useState(min)
  const rafRef = useRef(0)
  const startRef = useRef(0)

  useEffect(() => {
    startRef.current = performance.now()
    const tick = (now: number) => {
      const elapsed = (now - startRef.current) / 1000
      const t = (Math.sin((elapsed / cycleSec) * Math.PI * 2 - Math.PI / 2) + 1) / 2
      setValue(min + t * (max - min))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [min, max, cycleSec])

  return value
}

function AnimatedChip({ panel }: { panel: PanelChip }) {
  const score = useOscillate(panel.scoreMin, panel.scoreMax, panel.cycleSec)
  const pct = useOscillate(panel.pctMin, panel.pctMax, panel.cycleSec)

  return (
    <div style={{
      flex: 1,
      minWidth: 180,
      background: "var(--off-white, #F6F4EF)",
      padding: "24px 32px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
    }}>
      {/* Label + pulsing dot */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          width: 3, height: 3, borderRadius: "50%",
          background: panel.color,
          animation: `chipPulse 2s ease-in-out infinite`,
          animationDelay: `${panel.pulseDelay}ms`,
        }} />
        <span style={{
          fontFamily: sans,
          fontSize: 10,
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: "#bbb",
        }}>
          {panel.label}
        </span>
      </div>

      {/* Animated score */}
      <span style={{
        fontFamily: serif,
        fontSize: 56,
        fontWeight: 300,
        lineHeight: 1,
        color: panel.color,
      }}>
        {Math.round(score)}
      </span>

      <span style={{ fontFamily: sans, fontSize: 9, color: "#bbb" }}>/{panel.max}</span>

      {/* Animated bar */}
      <div style={{
        width: "100%", height: 3,
        background: "rgba(0,0,0,0.06)", borderRadius: 1.5,
      }}>
        <div style={{
          height: 3, borderRadius: 1.5,
          width: `${pct}%`,
          background: panel.color,
          transition: "width 100ms linear",
        }} />
      </div>
    </div>
  )
}

export function LandingPanelStrip() {
  return (
    <div>
      <div style={{
        display: "flex",
        gap: 1,
        background: "rgba(0,0,0,0.08)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        {/* TODO: replace with real user data once authenticated
            These are sample scores — not global averages */}
        {PANELS.map(p => (
          <AnimatedChip key={p.label} panel={p} />
        ))}
      </div>
      <p style={{
        textAlign: "center",
        marginTop: 12,
        fontFamily: sans,
        fontSize: 9,
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        color: "#bbb",
      }}>
        Sample &middot; Your numbers will be different
      </p>

      <style>{`
        @keyframes chipPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}

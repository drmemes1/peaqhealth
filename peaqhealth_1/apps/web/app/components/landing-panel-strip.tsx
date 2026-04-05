"use client"

import { useEffect, useRef, useState, useCallback } from "react"

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
  pulseDelay: number
}

const PANELS: PanelChip[] = [
  { color: "var(--sleep-c, #185FA5)", label: "Sleep", max: 30, scoreMin: 18, scoreMax: 27, pctMin: 60, pctMax: 85, cycleSec: 4.5, pulseDelay: 0 },
  { color: "var(--blood-c, #A32D2D)", label: "Blood", max: 40, scoreMin: 28, scoreMax: 38, pctMin: 75, pctMax: 95, cycleSec: 5.2, pulseDelay: 600 },
  { color: "var(--oral-c, #3B6D11)",  label: "Oral",  max: 30, scoreMin: 16, scoreMax: 24, pctMin: 53, pctMax: 80, cycleSec: 3.8, pulseDelay: 1200 },
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
      flex: "0 0 auto",
      minWidth: 180,
      background: "var(--off-white, #F6F4EF)",
      padding: "24px 32px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          width: 3, height: 3, borderRadius: "50%",
          background: panel.color,
          animation: "chipPulse 2s ease-in-out infinite",
          animationDelay: `${panel.pulseDelay}ms`,
        }} />
        <span style={{
          fontFamily: sans, fontSize: 10,
          letterSpacing: "2px", textTransform: "uppercase",
          color: "#bbb",
        }}>
          {panel.label}
        </span>
      </div>

      <span style={{
        fontFamily: serif, fontSize: 56, fontWeight: 300,
        lineHeight: 1, color: panel.color,
      }}>
        {Math.round(score)}
      </span>

      <span style={{ fontFamily: sans, fontSize: 9, color: "#bbb" }}>/{panel.max}</span>

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

// ── Auto-scroll: breathe right→left on a loop, pause on hover ────────────

const SCROLL_DUR = 3000  // 3s each direction
const SCROLL_PAUSE = 1000 // 1s pause at each end
const RESUME_DELAY = 2000 // 2s after user stops interacting

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function LandingPanelStrip() {
  const containerRef = useRef<HTMLDivElement>(null)
  const paused = useRef(false)
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const rafRef = useRef(0)
  const [, forceRender] = useState(0)

  const pauseScroll = useCallback(() => {
    paused.current = true
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
  }, [])

  const scheduleResume = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
    resumeTimer.current = setTimeout(() => {
      paused.current = false
      forceRender(n => n + 1) // restart the animation loop
    }, RESUME_DELAY)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let phase: "right" | "pause-right" | "left" | "pause-left" = "right"
    let phaseStart = performance.now()
    const maxScroll = () => el.scrollWidth - el.clientWidth

    const tick = (now: number) => {
      if (paused.current) { rafRef.current = requestAnimationFrame(tick); return }

      const elapsed = now - phaseStart

      if (phase === "right") {
        const t = Math.min(elapsed / SCROLL_DUR, 1)
        el.scrollLeft = easeInOut(t) * maxScroll()
        if (t >= 1) { phase = "pause-right"; phaseStart = now }
      } else if (phase === "pause-right") {
        if (elapsed >= SCROLL_PAUSE) { phase = "left"; phaseStart = now }
      } else if (phase === "left") {
        const t = Math.min(elapsed / SCROLL_DUR, 1)
        el.scrollLeft = (1 - easeInOut(t)) * maxScroll()
        if (t >= 1) { phase = "pause-left"; phaseStart = now }
      } else if (phase === "pause-left") {
        if (elapsed >= SCROLL_PAUSE) { phase = "right"; phaseStart = now }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div
        ref={containerRef}
        onMouseEnter={pauseScroll}
        onMouseLeave={scheduleResume}
        onTouchStart={pauseScroll}
        onTouchEnd={scheduleResume}
        style={{
          display: "flex",
          gap: 1,
          background: "rgba(0,0,0,0.08)",
          borderRadius: 12,
          overflowX: "scroll",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* TODO: replace with real user data once authenticated
            These are sample scores — not global averages */}
        {PANELS.map(p => (
          <AnimatedChip key={p.label} panel={p} />
        ))}
      </div>
      <p style={{
        textAlign: "center", marginTop: 12,
        fontFamily: sans, fontSize: 9,
        letterSpacing: "1.5px", textTransform: "uppercase",
        color: "#bbb",
      }}>
        Sample &middot; Your numbers will be different
      </p>

      <style>{`
        @keyframes chipPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        /* Hide scrollbar across browsers */
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

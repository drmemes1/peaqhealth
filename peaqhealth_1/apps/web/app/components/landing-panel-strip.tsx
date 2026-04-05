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

function AnimatedChip({ panel, dimmed, onToggle }: {
  panel: PanelChip
  dimmed: boolean
  onToggle?: () => void
}) {
  const score = useOscillate(panel.scoreMin, panel.scoreMax, panel.cycleSec)
  const pct = useOscillate(panel.pctMin, panel.pctMax, panel.cycleSec)

  const chipBg = dimmed ? "rgba(255,255,255,0.04)" : "var(--off-white, #F6F4EF)"
  const isSleep = panel.label === "Sleep"
  const isSleepDimmed = dimmed && isSleep
  const showToggle = isSleep && onToggle

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      background: chipBg,
      padding: "24px 32px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
      transition: "background 400ms ease 200ms",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          width: 3, height: 3, borderRadius: "50%",
          background: isSleepDimmed ? "rgba(255,255,255,0.15)" : panel.color,
          animation: isSleepDimmed ? "none" : "chipPulse 2s ease-in-out infinite",
          animationDelay: `${panel.pulseDelay}ms`,
          transition: "background 400ms ease 200ms",
        }} />
        <span style={{
          fontFamily: sans, fontSize: 10,
          letterSpacing: "2px", textTransform: "uppercase",
          color: dimmed ? "rgba(255,255,255,0.35)" : "#bbb",
          transition: "color 400ms ease 200ms",
        }}>
          {isSleepDimmed ? "Recovery" : panel.label}
        </span>
      </div>

      <span style={{
        fontFamily: serif, fontSize: 56, fontWeight: 300,
        lineHeight: 1,
        color: isSleepDimmed ? "rgba(255,255,255,0.15)" : panel.color,
        transition: "color 400ms ease 200ms",
      }}>
        {isSleepDimmed ? "\u2014" : Math.round(score)}
      </span>

      <span style={{
        fontFamily: sans, fontSize: 9,
        color: dimmed ? "rgba(255,255,255,0.2)" : "#bbb",
        transition: "color 400ms ease 200ms",
      }}>
        /{panel.max}
      </span>

      <div style={{
        width: "100%", height: 3,
        background: dimmed ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        borderRadius: 1.5,
        transition: "background 400ms ease 200ms",
      }}>
        <div style={{
          height: 3, borderRadius: 1.5,
          width: isSleepDimmed ? "0%" : `${pct}%`,
          background: panel.color,
          transition: isSleepDimmed ? "width 400ms ease 200ms" : "width 100ms linear",
        }} />
      </div>

      {/* Inline on/off toggle — only in Sleep chip */}
      {showToggle && (
        <button
          onClick={onToggle}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 4,
            padding: "3px 8px",
            borderRadius: 999,
            border: "none",
            background: dimmed ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            cursor: "pointer",
            transition: "background 400ms ease 200ms",
          }}
        >
          {/* Track */}
          <span style={{
            width: 22, height: 12,
            borderRadius: 6,
            background: dimmed ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
            position: "relative",
            flexShrink: 0,
            transition: "background 250ms ease",
          }}>
            <span style={{
              position: "absolute",
              top: 2,
              left: dimmed ? 2 : 12,
              width: 8, height: 8,
              borderRadius: 4,
              background: dimmed ? "rgba(255,255,255,0.3)" : "#C49A3C",
              transition: "left 250ms cubic-bezier(0.4,0.0,0.2,1), background 250ms ease",
            }} />
          </span>
          <span style={{
            fontFamily: sans,
            fontSize: 7,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: dimmed ? "rgba(255,255,255,0.3)" : "#bbb",
            transition: "color 400ms ease 200ms",
          }}>
            {dimmed ? "Off" : "On"}
          </span>
        </button>
      )}
    </div>
  )
}

// ── Auto-scroll + drag-to-scroll ────────────────────────────────────────

const SCROLL_DUR = 3000
const SCROLL_PAUSE = 1000
const RESUME_DELAY = 2000

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function LandingPanelStrip({ wearableOff = false, onToggle }: { wearableOff?: boolean; onToggle?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const paused = useRef(false)
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const rafRef = useRef(0)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, scrollLeft: 0 })

  const pauseScroll = useCallback(() => {
    paused.current = true
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
  }, [])

  const scheduleResume = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
    resumeTimer.current = setTimeout(() => {
      paused.current = false
    }, RESUME_DELAY)
  }, [])

  // Auto-scroll loop
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let phase: "right" | "pause-right" | "left" | "pause-left" = "right"
    let phaseStart = performance.now()
    const maxScroll = () => Math.max(0, el.scrollWidth - el.clientWidth)

    const tick = (now: number) => {
      if (paused.current) {
        phaseStart = now - (phase.startsWith("pause") ? 0 : 0)
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const ms = maxScroll()
      if (ms <= 0) { rafRef.current = requestAnimationFrame(tick); return }

      const elapsed = now - phaseStart

      if (phase === "right") {
        const t = Math.min(elapsed / SCROLL_DUR, 1)
        el.scrollLeft = easeInOut(t) * ms
        if (t >= 1) { phase = "pause-right"; phaseStart = now }
      } else if (phase === "pause-right") {
        if (elapsed >= SCROLL_PAUSE) { phase = "left"; phaseStart = now }
      } else if (phase === "left") {
        const t = Math.min(elapsed / SCROLL_DUR, 1)
        el.scrollLeft = (1 - easeInOut(t)) * ms
        if (t >= 1) { phase = "pause-left"; phaseStart = now }
      } else if (phase === "pause-left") {
        if (elapsed >= SCROLL_PAUSE) { phase = "right"; phaseStart = now }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Mouse drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    pauseScroll()
    setDragging(true)
    dragStart.current = { x: e.clientX, scrollLeft: containerRef.current?.scrollLeft ?? 0 }
  }, [pauseScroll])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return
    const dx = e.clientX - dragStart.current.x
    containerRef.current.scrollLeft = dragStart.current.scrollLeft - dx
  }, [dragging])

  const onMouseUp = useCallback(() => {
    setDragging(false)
    scheduleResume()
  }, [scheduleResume])

  // Touch already scrolls natively — just pause/resume auto
  const onTouchStart = useCallback(() => { pauseScroll() }, [pauseScroll])
  const onTouchEnd = useCallback(() => { scheduleResume() }, [scheduleResume])

  return (
    <div>
      <div
        ref={containerRef}
        onMouseEnter={pauseScroll}
        onMouseLeave={() => { setDragging(false); scheduleResume() }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          display: "flex",
          gap: 1,
          background: wearableOff ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
          borderRadius: 12,
          overflow: "hidden",
          transition: "background 400ms ease 200ms",
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
      >
        {/* TODO: replace with real user data once authenticated
            These are sample scores — not global averages */}
        {PANELS.map(p => (
          <AnimatedChip
            key={p.label}
            panel={p}
            dimmed={wearableOff}
            onToggle={p.label === "Sleep" ? onToggle : undefined}
          />
        ))}
      </div>
      <p style={{
        textAlign: "center", marginTop: 12,
        fontFamily: sans, fontSize: 9,
        letterSpacing: "1.5px", textTransform: "uppercase",
        color: wearableOff ? "rgba(255,255,255,0.2)" : "#bbb",
        transition: "color 400ms ease 200ms",
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

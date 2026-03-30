"use client"
import { useEffect, useRef } from "react"

// ─── Layout constants ────────────────────────────────────────────────────────
// ViewBox 700 × 420; peaks centered in 40–660 range
const VB_H         = 420   // viewBox height — taller to give peaks room
const BASELINE     = 360   // y-position of the baseline rule
const MAX_H        = 300   // reference height for ratio calculations (not a hard cap)
const TOP_PAD      = 56    // minimum clearance above tallest apex for score number
const SCALE_TO     = 0.92  // tallest active peak fills this fraction of available space
const BASE_HALF_W  = 55    // base half-width — peaks widen proportionally with height
const CENTERS: readonly [number, number, number] = [150, 350, 550]
const DURATION = 700        // ms each peak takes to rise
const STAGGER  = 130        // ms between peaks

const PANELS = [
  { key: "sleep",     label: "SLEEP",     max: 30, color: "#4A7FB5" },
  { key: "blood",     label: "BLOOD",     max: 40, color: "#C0392B" },
  { key: "oral",      label: "ORAL",      max: 30, color: "#2D6A4F" },
] as const

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface PeaksProps {
  breakdown:       { sleepSub: number; bloodSub: number; oralSub: number; lifestyleSub: number }
  sleepConnected:  boolean
  hasBlood:        boolean
  oralActive:      boolean
  hasLifestyle:    boolean
  onPeakHover?:    (key: string | null) => void
  onPeakClick?:    (key: string) => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PeaksVisualization({
  breakdown, sleepConnected, hasBlood, oralActive, hasLifestyle, onPeakHover, onPeakClick,
}: PeaksProps) {
  const rawScores = [
    breakdown.sleepSub,
    breakdown.bloodSub,
    breakdown.oralSub,
  ]
  const pending = [!sleepConnected, !hasBlood, !oralActive]

  // Score ratios (0–1) for height and width scaling
  const ratios = rawScores.map((s, i) => {
    if (pending[i] || s <= 0) return 0
    return Math.min(s / PANELS[i].max, 1)
  })

  // Raw heights using MAX_H as reference scale
  const rawHeights = ratios.map(r => r * MAX_H)

  // Dynamic scaling: tallest active peak fills SCALE_TO of available vertical space
  const availableH = BASELINE - TOP_PAD
  const maxRawH    = Math.max(10, ...rawHeights)
  const scale      = (availableH * SCALE_TO) / maxRawH

  const finalHeights = rawHeights.map((h, i) =>
    (pending[i] || rawScores[i] <= 0) ? 10 : Math.max(h * scale, 10)
  )
  const apexYs = finalHeights.map(h => BASELINE - h)

  // Peak widths scale proportionally with height — taller = wider for dramatic effect
  const halfWidths = ratios.map(r =>
    Math.max(36, Math.round(BASE_HALF_W * Math.max(r, 0.3) * 1.15))
  )

  const polyRefs  = useRef<(SVGPolygonElement | null)[]>([null, null, null])
  const decorRefs = useRef<(SVGGElement | null)[]>([null, null, null])

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    CENTERS.forEach((cx, i) => {
      const el = polyRefs.current[i]
      if (!el) return

      const hw = halfWidths[i]
      el.setAttribute("points", `${cx - hw},${BASELINE} ${cx},${BASELINE} ${cx + hw},${BASELINE}`)

      const id = setTimeout(() => {
        const start  = performance.now()
        const endH   = finalHeights[i]
        const target = el

        function frame() {
          const t     = Math.min((performance.now() - start) / DURATION, 1)
          const ease  = easeOutCubic(t)
          const apexY = BASELINE - endH * ease
          target.setAttribute("points", `${cx - hw},${BASELINE} ${cx},${apexY} ${cx + hw},${BASELINE}`)
          if (t < 1) requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      }, 100 + i * STAGGER)

      timers.push(id)
    })

    // Reveal decorations after all peaks finish
    const revealAt = 100 + 2 * STAGGER + DURATION + 100
    timers.push(setTimeout(() => {
      decorRefs.current.forEach(el => { if (el) el.style.opacity = "1" })
    }, revealAt))

    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <svg
      viewBox={`0 0 700 ${VB_H}`}
      width="100%"
      style={{ display: "block", overflow: "visible" }}
      aria-label="Score breakdown peaks"
    >
      <defs>
        {PANELS.map(p => (
          <linearGradient key={p.key} id={`pg-${p.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={p.color} stopOpacity={0.62} />
            <stop offset="75%"  stopColor={p.color} stopOpacity={0.14} />
            <stop offset="100%" stopColor={p.color} stopOpacity={0.03} />
          </linearGradient>
        ))}
      </defs>

      {/* Baseline rule */}
      <line x1={36} y1={BASELINE} x2={664} y2={BASELINE}
        stroke="var(--ink-12)" strokeWidth={0.75} />

      {PANELS.map((p, i) => {
        const cx         = CENTERS[i]
        const isPending  = pending[i]
        const score      = rawScores[i]
        const apexY      = apexYs[i]
        const displayVal = isPending || score <= 0
          ? "—"
          : String(Math.round(score))

        return (
          <g key={p.key}>
            {/* Peak polygon — animated */}
            <polygon
              ref={el => { polyRefs.current[i] = el }}
              points={`${cx - halfWidths[i]},${BASELINE} ${cx},${BASELINE} ${cx + halfWidths[i]},${BASELINE}`}
              fill={isPending ? "none" : `url(#pg-${p.key})`}
              stroke={p.color}
              strokeWidth={1.25}
              strokeLinejoin="round"
              strokeDasharray={isPending ? "6 4" : undefined}
              opacity={isPending ? 0.28 : 1}
              style={{ cursor: onPeakClick ? "pointer" : "default", transition: "opacity 0.2s ease" }}
              onMouseEnter={e => {
                e.currentTarget.style.opacity = isPending ? "0.28" : "0.62"
                onPeakHover?.(p.key)
              }}
              onMouseLeave={e => {
                e.currentTarget.style.opacity = isPending ? "0.28" : "1"
                onPeakHover?.(null)
              }}
              onClick={() => onPeakClick?.(p.key)}
            />

            {/* Apex dot + score + labels — fade in after animation */}
            <g
              ref={el => { decorRefs.current[i] = el }}
              style={{ opacity: 0, transition: "opacity 500ms ease" }}
            >
              {/* Apex dot */}
              <circle cx={cx} cy={apexY} r={4.5} fill={p.color} />

              {/* Score value above apex */}
              <text
                x={cx} y={apexY - 16}
                textAnchor="middle"
                fontFamily="'Cormorant Garamond', Georgia, serif"
                fontSize={26}
                fontWeight={400}
                fill={p.color}
              >
                {displayVal}
              </text>

              {/* Panel name below baseline */}
              <text
                x={cx} y={BASELINE + 22}
                textAnchor="middle"
                fontFamily="var(--font-body, 'Instrument Sans', sans-serif)"
                fontSize={10}
                letterSpacing="0.13em"
                fill="var(--ink-60)"
              >
                {p.label}
              </text>

              {/* /max */}
              <text
                x={cx} y={BASELINE + 36}
                textAnchor="middle"
                fontFamily="var(--font-body, 'Instrument Sans', sans-serif)"
                fontSize={10}
                fill="var(--ink-30)"
              >
                /{p.max}
              </text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}

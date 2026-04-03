"use client"
import { useEffect, useRef } from "react"

// ─── Layout constants ────────────────────────────────────────────────────────
// ViewBox 700 × 440; peaks occupy left ~70%, cross-panel element on right ~30%
const VB_H         = 440
const BASELINE     = 360
const MAX_H        = 300
const TOP_PAD      = 56
const SCALE_TO     = 0.92
const BASE_HALF_W  = 50
// Peaks bunched left: centered at 110, 260, 410 (spanning ~60–460)
const CENTERS: readonly [number, number, number] = [110, 260, 410]
const DURATION = 700
const STAGGER  = 130

// Divider x-position — between peaks zone and cross-panel zone
const DIVIDER_X = 488
// Cross-panel element center
const CP_CX = 595

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
  sleepGhosted?:   boolean
  onPeakHover?:    (key: string | null) => void
  onPeakClick?:    (key: string) => void
  netModifier?:    number
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PeaksVisualization({
  breakdown, sleepConnected, hasBlood, oralActive, hasLifestyle, sleepGhosted, onPeakHover, onPeakClick, netModifier = 0,
}: PeaksProps) {
  const rawScores = [
    breakdown.sleepSub,
    breakdown.bloodSub,
    breakdown.oralSub,
  ]
  const pending = [!sleepConnected || (sleepGhosted ?? false), !hasBlood, !oralActive]

  const ratios = rawScores.map((s, i) => {
    if (pending[i] || s <= 0) return 0
    return Math.min(s / PANELS[i].max, 1)
  })

  const rawHeights = ratios.map(r => r * MAX_H)

  const availableH = BASELINE - TOP_PAD
  const maxRawH    = Math.max(10, ...rawHeights)
  const scale      = (availableH * SCALE_TO) / maxRawH

  const finalHeights = rawHeights.map((h, i) =>
    (pending[i] || rawScores[i] <= 0) ? 10 : Math.max(h * scale, 10)
  )
  const apexYs = finalHeights.map(h => BASELINE - h)

  const halfWidths = ratios.map(r =>
    Math.max(32, Math.round(BASE_HALF_W * Math.max(r, 0.3) * 1.15))
  )

  const polyRefs  = useRef<(SVGPolygonElement | null)[]>([null, null, null])
  const decorRefs = useRef<(SVGGElement | null)[]>([null, null, null])
  const cpRef     = useRef<SVGGElement | null>(null)

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

    // Reveal decorations + cross-panel after all peaks finish
    const revealAt = 100 + 2 * STAGGER + DURATION + 100
    timers.push(setTimeout(() => {
      decorRefs.current.forEach(el => { if (el) el.style.opacity = "1" })
      if (cpRef.current) cpRef.current.style.opacity = "1"
    }, revealAt))

    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-panel element geometry
  const absModifier = Math.abs(netModifier)
  const isBonus     = netModifier > 0
  const cpHalfW     = 50
  const cpDepth     = absModifier * 8
  const cpTopY      = BASELINE   // base of the inverted triangle sits on baseline
  const cpTipY      = isBonus ? BASELINE - cpDepth : BASELINE + cpDepth
  // Position the number above the shape
  const cpNumberY   = isBonus ? Math.min(cpTipY, BASELINE) - 14 : BASELINE - 14

  // Tallest peak apex for divider
  const tallestApexY = Math.min(...apexYs)

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
        <linearGradient id="pg-cp-valley" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#9A7200" stopOpacity={0.04} />
          <stop offset="100%" stopColor="#9A7200" stopOpacity={0.16} />
        </linearGradient>
        <linearGradient id="pg-cp-bonus" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor="#9A7200" stopOpacity={0.04} />
          <stop offset="100%" stopColor="#9A7200" stopOpacity={0.16} />
        </linearGradient>
      </defs>

      {/* Baseline rule — extends across full width */}
      <line x1={36} y1={BASELINE} x2={664} y2={BASELINE}
        stroke="var(--ink-12)" strokeWidth={0.75} />

      {/* ── Three peaks (left 70%) ────────────────────────────────────────── */}
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

            <g
              ref={el => { decorRefs.current[i] = el }}
              style={{ opacity: 0, transition: "opacity 500ms ease" }}
            >
              <circle cx={cx} cy={apexY} r={4.5} fill={p.color} />

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

      {/* ── Vertical divider ──────────────────────────────────────────────── */}
      {netModifier !== 0 && (
        <line
          x1={DIVIDER_X} y1={tallestApexY} x2={DIVIDER_X} y2={BASELINE}
          stroke="rgba(20,20,16,0.15)"
          strokeWidth={0.5}
          strokeDasharray="3 4"
        />
      )}

      {/* ── Cross-panel element (right 30%) ───────────────────────────────── */}
      {netModifier !== 0 && (
        <g ref={cpRef} style={{ opacity: 0, transition: "opacity 600ms ease" }}>
          {/* Net modifier number */}
          <text
            x={CP_CX} y={cpNumberY}
            textAnchor="middle"
            fontFamily="'Cormorant Garamond', Georgia, serif"
            fontSize={22}
            fontWeight={400}
            fill="#9A7200"
            opacity={0.75}
          >
            {isBonus ? "+" : "−"}{absModifier}
          </text>

          {/* Inverted triangle */}
          <polygon
            points={isBonus
              ? `${CP_CX - cpHalfW},${BASELINE} ${CP_CX},${cpTipY} ${CP_CX + cpHalfW},${BASELINE}`
              : `${CP_CX - cpHalfW},${BASELINE} ${CP_CX},${cpTipY} ${CP_CX + cpHalfW},${BASELINE}`
            }
            fill={isBonus ? "url(#pg-cp-bonus)" : "url(#pg-cp-valley)"}
            stroke="#9A7200"
            strokeWidth={0.8}
            strokeDasharray="3 4"
            strokeLinejoin="round"
            opacity={0.45}
          />

          {/* Tip dot */}
          <circle
            cx={CP_CX} cy={cpTipY} r={3}
            fill="#9A7200" opacity={0.5}
          />

          {/* CROSS-PANEL label */}
          <text
            x={CP_CX}
            y={isBonus ? BASELINE + 22 : cpTipY + 18}
            textAnchor="middle"
            fontFamily="var(--font-body, 'Instrument Sans', sans-serif)"
            fontSize={10}
            letterSpacing="1.5"
            fill="#9A7200"
            opacity={0.55}
          >
            CROSS-PANEL
          </text>

          {/* "modifier" italic label */}
          <text
            x={CP_CX}
            y={isBonus ? BASELINE + 35 : cpTipY + 31}
            textAnchor="middle"
            fontFamily="'Cormorant Garamond', Georgia, serif"
            fontSize={9}
            fontStyle="italic"
            fill="#9A7200"
            opacity={0.4}
          >
            modifier
          </text>
        </g>
      )}
    </svg>
  )
}

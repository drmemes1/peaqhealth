"use client"
import { useEffect, useRef } from "react"

// ─── Layout constants ────────────────────────────────────────────────────────
// ViewBox 700 × 312; peaks centered in 40–660 range
const BASELINE = 250
const MAX_H    = 200   // 100% ratio → apex y=50; score label at y=36
const HALF_W   = 44    // base width 88px; 155px spacing → 67px gaps between peaks
const CENTERS: readonly [number, number, number, number] = [120, 275, 430, 585]
const LIFESTYLE_CAP = 0.65   // lifestyle (13 pts) visually capped at 65% of max height
const DURATION = 700         // ms each peak takes to rise
const STAGGER  = 130         // ms between peaks

const PANELS = [
  { key: "sleep",     label: "SLEEP",     max: 27, color: "#4A7FB5" },
  { key: "blood",     label: "BLOOD",     max: 33, color: "#C0392B" },
  { key: "oral",      label: "ORAL",      max: 27, color: "#2D6A4F" },
  { key: "lifestyle", label: "LIFESTYLE", max: 13, color: "#B8860B" },
] as const

// ─── Age-based benchmark helpers ─────────────────────────────────────────────

type AgeGroup = "under40" | "40to55" | "over55"

export function getAgeGroup(ageRange: string | undefined): AgeGroup {
  if (ageRange === "60_69" || ageRange === "70_plus") return "over55"
  if (ageRange === "40_49" || ageRange === "50_59")   return "40to55"
  return "under40"
}

// Returns [sleepOptimal, bloodOptimal, oralOptimal, lifestyleOptimal]
// Sources: ACC/AHA 2019, AASM sleep guidelines, published oral microbiome studies
export function getOptimalScores(ageRange: string | undefined): [number, number, number, number] {
  const g = getAgeGroup(ageRange)
  const blood = g === "under40" ? 28 : g === "40to55" ? 26 : 24
  const sleep = g === "under40" ? 22 : g === "40to55" ? 20 : 18
  return [sleep, blood, 22, 11]  // oral + lifestyle are age-independent
}

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
  ageRange?:       string
  onPeakHover?:    (key: string | null) => void
  onPeakClick?:    (key: string) => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PeaksVisualization({
  breakdown, sleepConnected, hasBlood, oralActive, hasLifestyle, ageRange, onPeakHover, onPeakClick,
}: PeaksProps) {
  const rawScores = [
    breakdown.sleepSub,
    breakdown.bloodSub,
    breakdown.oralSub,
    breakdown.lifestyleSub,
  ]
  const pending = [!sleepConnected, !hasBlood, !oralActive, !hasLifestyle]

  const finalHeights = rawScores.map((s, i) => {
    if (pending[i] || s <= 0) return 10
    const ratio = s / PANELS[i].max
    const h = ratio * MAX_H
    return i === 3 ? Math.min(h, LIFESTYLE_CAP * MAX_H) : h
  })
  const apexYs = finalHeights.map(h => BASELINE - h)

  const polyRefs  = useRef<(SVGPolygonElement | null)[]>([null, null, null, null])
  const decorRefs = useRef<(SVGGElement | null)[]>([null, null, null, null])

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    CENTERS.forEach((cx, i) => {
      const el = polyRefs.current[i]
      if (!el) return

      el.setAttribute("points", `${cx - HALF_W},${BASELINE} ${cx},${BASELINE} ${cx + HALF_W},${BASELINE}`)

      const id = setTimeout(() => {
        const start  = performance.now()
        const endH   = finalHeights[i]
        const target = el

        function frame() {
          const t     = Math.min((performance.now() - start) / DURATION, 1)
          const ease  = easeOutCubic(t)
          const apexY = BASELINE - endH * ease
          target.setAttribute("points", `${cx - HALF_W},${BASELINE} ${cx},${apexY} ${cx + HALF_W},${BASELINE}`)
          if (t < 1) requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      }, 100 + i * STAGGER)

      timers.push(id)
    })

    // Reveal decorations after all peaks finish
    const revealAt = 100 + 3 * STAGGER + DURATION + 100
    timers.push(setTimeout(() => {
      decorRefs.current.forEach(el => { if (el) el.style.opacity = "1" })
    }, revealAt))

    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <svg
      viewBox="0 0 700 312"
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
        stroke="rgba(20,20,16,0.10)" strokeWidth={0.75} />

      {PANELS.map((p, i) => {
        const cx         = CENTERS[i]
        const isPending  = pending[i]
        const score      = rawScores[i]
        const apexY      = apexYs[i]
        const displayVal = isPending || score <= 0
          ? "—"
          : Number.isInteger(score) ? String(score) : score.toFixed(1)

        return (
          <g key={p.key}>
            {/* Peak polygon — animated */}
            <polygon
              ref={el => { polyRefs.current[i] = el }}
              points={`${cx - HALF_W},${BASELINE} ${cx},${BASELINE} ${cx + HALF_W},${BASELINE}`}
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
              <circle cx={cx} cy={apexY} r={4} fill={p.color} />

              {/* Score value above apex */}
              <text
                x={cx} y={apexY - 14}
                textAnchor="middle"
                fontFamily="'Cormorant Garamond', Georgia, serif"
                fontSize={20}
                fontWeight={300}
                fill={p.color}
              >
                {displayVal}
              </text>

              {/* Panel name below baseline */}
              <text
                x={cx} y={BASELINE + 22}
                textAnchor="middle"
                fontFamily="var(--font-body, 'Instrument Sans', sans-serif)"
                fontSize={9}
                letterSpacing="0.14em"
                fill="rgba(20,20,16,0.50)"
              >
                {p.label}
              </text>

              {/* /max */}
              <text
                x={cx} y={BASELINE + 36}
                textAnchor="middle"
                fontFamily="var(--font-body, 'Instrument Sans', sans-serif)"
                fontSize={9}
                fill="rgba(20,20,16,0.28)"
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

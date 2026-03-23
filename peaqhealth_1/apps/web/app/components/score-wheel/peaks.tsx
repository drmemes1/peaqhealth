"use client"
import { useEffect, useRef } from "react"

// ─── Layout constants ────────────────────────────────────────────────────────
const BASELINE = 210
const MAX_H    = 178   // 100% score → apex at y=32, leaving room for score label
const HALF_W   = 46
const CENTERS: [number, number, number, number] = [112, 224, 336, 448]
const LIFESTYLE_CAP = 0.65  // lifestyle (13 pts) capped at 65% of visual height
const DURATION = 700   // peak rise duration ms
const STAGGER  = 120   // ms between peaks

const PANELS = [
  { key: "sleep",     label: "SLEEP",     max: 27, color: "#4A7FB5" },
  { key: "blood",     label: "BLOOD",     max: 33, color: "#C0392B" },
  { key: "oral",      label: "ORAL",      max: 27, color: "#2D6A4F" },
  { key: "lifestyle", label: "LIFESTYLE", max: 13, color: "#B8860B" },
] as const

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

// Catmull-Rom smooth path through 4 points
function catmullRomPath(pts: [number, number][]): string {
  if (pts.length < 2) return ""
  const ext: [number, number][] = [
    [pts[0][0] * 2 - pts[1][0],         pts[0][1] * 2 - pts[1][1]],
    ...pts,
    [pts[pts.length-1][0] * 2 - pts[pts.length-2][0],
     pts[pts.length-1][1] * 2 - pts[pts.length-2][1]],
  ]
  let d = `M ${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [p0, p1, p2, p3] = [ext[i-1], ext[i], ext[i+1], ext[i+2]]
    const s = 1 / 3
    d += ` C ${p1[0] + (p2[0]-p0[0])*s},${p1[1] + (p2[1]-p0[1])*s} ${p2[0] - (p3[0]-p1[0])*s},${p2[1] - (p3[1]-p1[1])*s} ${p2[0]},${p2[1]}`
  }
  return d
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface PeaksProps {
  breakdown:       { sleepSub: number; bloodSub: number; oralSub: number; lifestyleSub: number }
  sleepConnected:  boolean
  hasBlood:        boolean
  oralActive:      boolean
  hasLifestyle:    boolean
  onPeakHover?:    (key: string | null) => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PeaksVisualization({
  breakdown, sleepConnected, hasBlood, oralActive, hasLifestyle, onPeakHover,
}: PeaksProps) {
  const rawScores = [
    breakdown.sleepSub,
    breakdown.bloodSub,
    breakdown.oralSub,
    breakdown.lifestyleSub,
  ]
  const pending = [!sleepConnected, !hasBlood, !oralActive, !hasLifestyle]

  // Final target heights in px
  const finalHeights = rawScores.map((s, i) => {
    if (pending[i] || s <= 0) return 8   // stub for inactive panel
    const ratio = s / PANELS[i].max
    const h = ratio * MAX_H
    return i === 3 ? Math.min(h, LIFESTYLE_CAP * MAX_H) : h
  })
  const apexYs = finalHeights.map(h => BASELINE - h)

  const polyRefs  = useRef<(SVGPolygonElement | null)[]>([null, null, null, null])
  const curveRef  = useRef<SVGPathElement | null>(null)
  const decorRefs = useRef<(SVGGElement | null)[]>([null, null, null, null])

  const curvePath = catmullRomPath(CENTERS.map((cx, i) => [cx, apexYs[i]] as [number, number]))

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    // Animate each peak from flat → full height using RAF
    CENTERS.forEach((cx, i) => {
      const el = polyRefs.current[i]
      if (!el) return

      // Flat starting state
      el.setAttribute("points", `${cx - HALF_W},${BASELINE} ${cx},${BASELINE} ${cx + HALF_W},${BASELINE}`)

      const id = setTimeout(() => {
        const start = performance.now()
        const endH   = finalHeights[i]
        const target = el  // captured, non-null

        function frame() {
          const t    = Math.min((performance.now() - start) / DURATION, 1)
          const ease = easeOutCubic(t)
          const apexY = BASELINE - endH * ease
          target.setAttribute("points", `${cx - HALF_W},${BASELINE} ${cx},${apexY} ${cx + HALF_W},${BASELINE}`)
          if (t < 1) requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      }, 100 + i * STAGGER)

      timers.push(id)
    })

    // Reveal curve + dots + score/label decorations after all peaks finish
    const revealAt = 100 + 3 * STAGGER + DURATION + 80
    const revealId = setTimeout(() => {
      if (curveRef.current) curveRef.current.style.opacity = "1"
      decorRefs.current.forEach(el => { if (el) el.style.opacity = "1" })
    }, revealAt)
    timers.push(revealId)

    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <svg
      viewBox="0 0 560 260"
      width="100%"
      style={{ maxWidth: 560, display: "block", overflow: "visible" }}
      aria-label="Score breakdown peaks"
    >
      <defs>
        {PANELS.map(p => (
          <linearGradient key={p.key} id={`pg-${p.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={p.color} stopOpacity={0.80} />
            <stop offset="100%" stopColor={p.color} stopOpacity={0.05} />
          </linearGradient>
        ))}
      </defs>

      {/* Baseline rule */}
      <line x1={44} y1={BASELINE} x2={516} y2={BASELINE}
        stroke="var(--ink-12)" strokeWidth={0.5} />

      {PANELS.map((p, i) => {
        const cx   = CENTERS[i]
        const isPending = pending[i]
        const score = rawScores[i]
        const apexY = apexYs[i]

        return (
          <g key={p.key}>
            {/* Peak polygon — animated via RAF */}
            <polygon
              ref={el => { polyRefs.current[i] = el }}
              points={`${cx - HALF_W},${BASELINE} ${cx},${BASELINE} ${cx + HALF_W},${BASELINE}`}
              fill={isPending ? "none" : `url(#pg-${p.key})`}
              stroke={p.color}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeDasharray={isPending ? "5 4" : undefined}
              opacity={isPending ? 0.3 : 1}
              style={{ cursor: "default", transition: "opacity 0.18s ease" }}
              onMouseEnter={e => {
                e.currentTarget.style.opacity = isPending ? "0.3" : "0.65"
                onPeakHover?.(p.key)
              }}
              onMouseLeave={e => {
                e.currentTarget.style.opacity = isPending ? "0.3" : "1"
                onPeakHover?.(null)
              }}
            />

            {/* Apex dot + score number + panel label — all fade in after animation */}
            <g
              ref={el => { decorRefs.current[i] = el }}
              style={{ opacity: 0, transition: "opacity 420ms ease" }}
            >
              {/* Apex dot */}
              <circle cx={cx} cy={apexY} r={3.5} fill={p.color} />

              {/* Score value above apex */}
              <text
                x={cx} y={apexY - 11}
                textAnchor="middle"
                fontFamily="'Cormorant Garamond', Georgia, serif"
                fontSize={17}
                fontWeight={300}
                fill={p.color}
              >
                {isPending ? "—" : (Number.isInteger(score) ? score : Number(score.toFixed(1)))}
              </text>

              {/* Panel name below baseline */}
              <text
                x={cx} y={BASELINE + 18}
                textAnchor="middle"
                fontFamily="var(--font-body, 'Instrument Sans', sans-serif)"
                fontSize={8.5}
                letterSpacing="0.13em"
                fill="var(--ink-60)"
              >
                {p.label}
              </text>

              {/* /max */}
              <text
                x={cx} y={BASELINE + 30}
                textAnchor="middle"
                fontFamily="var(--font-body, 'Instrument Sans', sans-serif)"
                fontSize={8.5}
                fill="var(--ink-30)"
              >
                /{p.max}
              </text>
            </g>
          </g>
        )
      })}

      {/* Skyline dashed curve connecting all 4 apexes */}
      <path
        ref={curveRef}
        d={curvePath}
        fill="none"
        stroke="var(--ink-30)"
        strokeWidth={1}
        strokeDasharray="5 4"
        style={{ opacity: 0, transition: "opacity 400ms ease" }}
      />
    </svg>
  )
}

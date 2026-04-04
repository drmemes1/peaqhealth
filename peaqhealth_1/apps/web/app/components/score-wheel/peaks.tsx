"use client"
import { useEffect, useRef } from "react"

// ─── Compact layout: viewBox 560 × 180 ─────────────────────────────────────
const BASELINE   = 162
const MAX_HEIGHT = 144   // 162 - 18 = 144px available above baseline
const DURATION   = 700
const STAGGER    = 130

const PANELS = [
  { key: "sleep", label: "SLEEP", max: 30, cx: 118, halfW: 40, color: "#185FA5", gradId: "gs" },
  { key: "blood", label: "BLOOD", max: 40, cx: 278, halfW: 50, color: "#A32D2D", gradId: "gb" },
  { key: "oral",  label: "ORAL",  max: 30, cx: 398, halfW: 30, color: "#3B6D11", gradId: "go" },
] as const

const CP_CX = 496

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
  const rawScores = [breakdown.sleepSub, breakdown.bloodSub, breakdown.oralSub]
  const pending = [!sleepConnected || (sleepGhosted ?? false), !hasBlood, !oralActive]

  // Apex y = baseline minus proportional height
  const apexYs = rawScores.map((s, i) => {
    if (pending[i] || s <= 0) return BASELINE - 8
    const ratio = Math.min(s / PANELS[i].max, 1)
    return BASELINE - ratio * MAX_HEIGHT
  })

  const polyRefs  = useRef<(SVGPolygonElement | null)[]>([null, null, null])
  const decorRefs = useRef<(SVGGElement | null)[]>([null, null, null])
  const cpRef     = useRef<SVGGElement | null>(null)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    PANELS.forEach((p, i) => {
      const el = polyRefs.current[i]
      if (!el) return
      const hw = p.halfW
      el.setAttribute("points", `${p.cx - hw},${BASELINE} ${p.cx},${BASELINE} ${p.cx + hw},${BASELINE}`)

      const id = setTimeout(() => {
        const start = performance.now()
        const targetY = apexYs[i]
        const target = el

        function frame() {
          const t    = Math.min((performance.now() - start) / DURATION, 1)
          const ease = easeOutCubic(t)
          const y    = BASELINE - (BASELINE - targetY) * ease
          target.setAttribute("points", `${p.cx - hw},${BASELINE} ${p.cx},${y} ${p.cx + hw},${BASELINE}`)
          if (t < 1) requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      }, 100 + i * STAGGER)
      timers.push(id)
    })

    const revealAt = 100 + 2 * STAGGER + DURATION + 100
    timers.push(setTimeout(() => {
      decorRefs.current.forEach(el => { if (el) el.style.opacity = "1" })
      if (cpRef.current) cpRef.current.style.opacity = "1"
    }, revealAt))

    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-panel geometry
  const absModifier = Math.abs(netModifier)
  const isBonus     = netModifier > 0
  const cpDepth     = Math.min(absModifier * 6, MAX_HEIGHT * 0.4)
  const cpTipY      = isBonus ? BASELINE - cpDepth : BASELINE + cpDepth
  const cpNumberY   = isBonus ? Math.min(cpTipY, BASELINE) - 10 : BASELINE - 10

  return (
    <div style={{ width: "100%", height: 220, position: "relative" }}>
      <svg
        viewBox="0 0 560 180"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%", display: "block" }}
        aria-label="Score breakdown peaks"
      >
        <defs>
          <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#185FA5" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#185FA5" stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A32D2D" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#A32D2D" stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="go" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B6D11" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#3B6D11" stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A32D2D" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#A32D2D" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="gmtn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8E5DE" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#E8E5DE" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Mountain background silhouette */}
        <path
          d="M0 170 L60 110 L120 130 L200 60 L260 90 L340 40 L400 80 L460 50 L520 100 L560 90 L560 170 Z"
          fill="url(#gmtn)" opacity={0.4}
        />

        {/* Baseline */}
        <line x1={30} y1={BASELINE} x2={530} y2={BASELINE} stroke="#E0DDD7" strokeWidth={0.5} />

        {/* Three peaks */}
        {PANELS.map((p, i) => {
          const isPending  = pending[i]
          const score      = rawScores[i]
          const apexY      = apexYs[i]
          const displayVal = isPending || score <= 0 ? "—" : String(Math.round(score))

          return (
            <g key={p.key}>
              <polygon
                ref={el => { polyRefs.current[i] = el }}
                points={`${p.cx - p.halfW},${BASELINE} ${p.cx},${BASELINE} ${p.cx + p.halfW},${BASELINE}`}
                fill={isPending ? "none" : `url(#${p.gradId})`}
                stroke={p.color}
                strokeWidth={1}
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
                <circle cx={p.cx} cy={apexY} r={3} fill={p.color} />
                <text
                  x={p.cx} y={apexY - 10}
                  textAnchor="middle"
                  fontFamily="'Cormorant Garamond', Georgia, serif"
                  fontSize={13} fontWeight={400}
                  fill={p.color}
                >
                  {displayVal}
                </text>
                <text
                  x={p.cx} y={BASELINE + 14}
                  textAnchor="middle"
                  fontFamily="var(--font-body, 'Instrument Sans', sans-serif)"
                  fontSize={8} letterSpacing="0.1em"
                  fill="var(--ink-60, rgba(20,20,16,0.6))"
                >
                  {p.label}
                </text>
                <text
                  x={p.cx} y={BASELINE + 24}
                  textAnchor="middle"
                  fontFamily="var(--font-body, 'Instrument Sans', sans-serif)"
                  fontSize={8}
                  fill="var(--ink-30, rgba(20,20,16,0.3))"
                >
                  /{p.max}
                </text>
              </g>
            </g>
          )
        })}

        {/* Cross-panel inverted triangle */}
        {netModifier !== 0 && (
          <g
            ref={cpRef}
            style={{ opacity: 0, transition: "opacity 600ms ease", cursor: onPeakClick ? "pointer" : "default" }}
            onClick={() => onPeakClick?.("cross-panel")}
            onMouseEnter={e => { (e.currentTarget as SVGGElement).style.opacity = "0.8" }}
            onMouseLeave={e => { (e.currentTarget as SVGGElement).style.opacity = "1" }}
          >
            <rect x={CP_CX - 40} y={cpNumberY - 16} width={80} height={80} fill="transparent" />

            <text
              x={CP_CX} y={cpNumberY}
              textAnchor="middle"
              fontFamily="'Cormorant Garamond', Georgia, serif"
              fontSize={14} fontWeight={400}
              fill="#9A7200" opacity={0.9}
            >
              {isBonus ? "+" : "−"}{absModifier}
            </text>

            <polygon
              points={
                isBonus
                  ? `${CP_CX - 30},${BASELINE} ${CP_CX},${BASELINE - cpDepth} ${CP_CX + 30},${BASELINE}`
                  : `${CP_CX - 30},${BASELINE} ${CP_CX},${BASELINE + cpDepth} ${CP_CX + 30},${BASELINE}`
              }
              fill="url(#gc)"
              stroke="#9A7200"
              strokeWidth={0.8}
              strokeDasharray="3 2"
              strokeLinejoin="round"
              opacity={0.65}
            />

            <circle cx={CP_CX} cy={isBonus ? BASELINE - cpDepth : BASELINE + cpDepth} r={2.5} fill="#9A7200" opacity={0.8} />

            <text
              x={CP_CX}
              y={isBonus ? BASELINE + 14 : BASELINE + cpDepth + 14}
              textAnchor="middle"
              fontFamily="var(--font-body, 'Instrument Sans', sans-serif)"
              fontSize={7} letterSpacing="1"
              fill="#9A7200" opacity={0.7}
            >
              CROSS-PANEL
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

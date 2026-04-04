"use client"
import { useEffect, useRef } from "react"

// ─── Layout: viewBox 680 × 380 ─────────────────────────────────────────────
const BL         = 240    // baseline y
const MAX_HEIGHT = 200    // available above baseline
const DURATION   = 700
const STAGGER    = 130

const PANELS = [
  { key: "sleep", label: "SLEEP", max: 30, cx: 175, left: 137, right: 213, color: "#185FA5", gradId: "gs" },
  { key: "blood", label: "BLOOD", max: 40, cx: 305, left: 259, right: 351, color: "#A32D2D", gradId: "gb" },
  { key: "oral",  label: "ORAL",  max: 30, cx: 430, left: 400, right: 460, color: "#3B6D11", gradId: "go" },
] as const

const CP_CX = 545

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

  const apexYs = rawScores.map((s, i) => {
    if (pending[i] || s <= 0) return BL - 10
    const ratio = Math.min(s / PANELS[i].max, 1)
    return BL - ratio * MAX_HEIGHT
  })

  const polyRefs  = useRef<(SVGPolygonElement | null)[]>([null, null, null])
  const decorRefs = useRef<(SVGGElement | null)[]>([null, null, null])
  const cpRef     = useRef<SVGGElement | null>(null)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    PANELS.forEach((p, i) => {
      const el = polyRefs.current[i]
      if (!el) return
      el.setAttribute("points", `${p.left},${BL} ${p.cx},${BL} ${p.right},${BL}`)

      const id = setTimeout(() => {
        const start = performance.now()
        const targetY = apexYs[i]
        const target = el

        function frame() {
          const t    = Math.min((performance.now() - start) / DURATION, 1)
          const ease = easeOutCubic(t)
          const y    = BL - (BL - targetY) * ease
          target.setAttribute("points", `${p.left},${BL} ${p.cx},${y} ${p.right},${BL}`)
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
  const crossLabel = netModifier > 0 ? `+${absModifier}` : `−${absModifier}`
  const crossH = (Math.min(absModifier, 10) / 10) * (MAX_HEIGHT * 0.28)

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <svg
        viewBox="0 0 680 400"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "auto", display: "block" }}
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
          <linearGradient id="pviz-cross" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C49A3C" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#C49A3C" stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="gmtn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8E5DE" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#E8E5DE" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Mountain background silhouette */}
        <path
          d="M0 250 L80 160 L160 185 L260 90 L340 130 L440 60 L520 110 L600 75 L680 130 L680 250 Z"
          fill="url(#gmtn)" opacity={0.4}
        />

        {/* Baseline */}
        <line x1={80} y1={BL} x2={620} y2={BL} stroke="#E0DDD7" strokeWidth={0.5} />

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
                points={`${p.left},${BL} ${p.cx},${BL} ${p.right},${BL}`}
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
                <circle cx={p.cx} cy={apexY} r={3.5} fill={p.color} />
                <text
                  x={p.cx} y={apexY - 12}
                  textAnchor="middle"
                  fontFamily="'Cormorant Garamond', Georgia, serif"
                  fontSize={18} fontWeight={400}
                  fill={p.color}
                >
                  {displayVal}
                </text>
                <text
                  x={p.cx} y={BL + 18}
                  textAnchor="middle"
                  fontFamily="var(--font-body, 'Instrument Sans', sans-serif)"
                  fontSize={10} letterSpacing="0.1em"
                  fill="var(--ink-60, rgba(20,20,16,0.6))"
                >
                  {p.label}
                </text>
                <text
                  x={p.cx} y={BL + 30}
                  textAnchor="middle"
                  fontFamily="var(--font-body, 'Instrument Sans', sans-serif)"
                  fontSize={10}
                  fill="var(--ink-30, rgba(20,20,16,0.3))"
                >
                  /{p.max}
                </text>
              </g>
            </g>
          )
        })}

        {/* Cross-panel — base ON baseline, direction driven by sign */}
        {netModifier !== 0 && (
          <g
            ref={cpRef}
            style={{ opacity: 0, transition: "opacity 600ms ease", cursor: onPeakClick ? "pointer" : "default" }}
            onClick={() => onPeakClick?.("cross-panel")}
            onMouseEnter={e => { (e.currentTarget as SVGGElement).style.opacity = "0.8" }}
            onMouseLeave={e => { (e.currentTarget as SVGGElement).style.opacity = "1" }}
          >
            {/* Touch target */}
            <rect x={CP_CX - 35} y={BL - 30} width={70} height={120} fill="transparent" />

            {netModifier < 0 ? (
              <>
                {/* NEGATIVE — inverted, wide edge ON baseline, point goes DOWN */}
                <polygon
                  points={`${CP_CX - 23},${BL} ${CP_CX + 23},${BL} ${CP_CX},${BL + crossH}`}
                  fill="url(#pviz-cross)" stroke="#C49A3C" strokeWidth={0.9} strokeDasharray="4 3"
                />
                <circle cx={CP_CX} cy={BL + crossH} r={3.5} fill="#C49A3C" />
                <text
                  x={CP_CX} y={BL - 12} textAnchor="middle"
                  fontFamily="'Cormorant Garamond', Georgia, serif"
                  fontSize={16} fill="#C49A3C"
                >
                  {crossLabel}
                </text>
              </>
            ) : (
              <>
                {/* POSITIVE — normal upward, base ON baseline, point goes UP */}
                <polygon
                  points={`${CP_CX - 23},${BL} ${CP_CX + 23},${BL} ${CP_CX},${BL - crossH}`}
                  fill="url(#pviz-cross)" stroke="#C49A3C" strokeWidth={0.9} strokeDasharray="4 3"
                />
                <circle cx={CP_CX} cy={BL - crossH} r={3.5} fill="#C49A3C" />
                <text
                  x={CP_CX} y={BL - crossH - 12} textAnchor="middle"
                  fontFamily="'Cormorant Garamond', Georgia, serif"
                  fontSize={16} fill="#C49A3C"
                >
                  {crossLabel}
                </text>
              </>
            )}

            {/* Labels below baseline */}
            <text
              x={CP_CX} y={netModifier < 0 ? BL + crossH + 18 : BL + 18}
              textAnchor="middle"
              fontFamily="var(--font-body, 'Instrument Sans', sans-serif)"
              fontSize={10} letterSpacing="1.5"
              fill="#C49A3C"
            >
              CROSS-PANEL
            </text>
            <text
              x={CP_CX} y={netModifier < 0 ? BL + crossH + 30 : BL + 30}
              textAnchor="middle"
              fontFamily="var(--font-body, 'Instrument Sans', sans-serif)"
              fontSize={9}
              fill="#C49A3C" opacity={0.55}
            >
              modifier
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

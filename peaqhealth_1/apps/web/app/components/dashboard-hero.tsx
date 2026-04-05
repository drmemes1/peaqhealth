"use client"
import { useEffect, useRef, useState } from "react"

/* ─── Font stacks ──────────────────────────────────────────────────────────── */
const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "-apple-system, BlinkMacSystemFont, sans-serif"

/* ─── Panel constants ──────────────────────────────────────────────────────── */
const PANELS = [
  { key: "sleep", label: "SLEEP", max: 30, color: "#185FA5", cx: 90,  scoreKey: "sleepSub" as const },
  { key: "blood", label: "BLOOD", max: 40, color: "#A32D2D", cx: 195, scoreKey: "bloodSub" as const },
  { key: "oral",  label: "ORAL",  max: 30, color: "#3B6D11", cx: 300, scoreKey: "oralSub"  as const },
] as const

/* ─── SVG constants ────────────────────────────────────────────────────────── */
const BASELINE_Y  = 155
const MAX_HEIGHT  = 130
const PEAK_HALF_W = 38
const DURATION    = 700
const STAGGER     = 130

/* ─── Easing ───────────────────────────────────────────────────────────────── */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/* ─── Props ────────────────────────────────────────────────────────────────── */
export interface DashboardHeroProps {
  score: number
  breakdown: { sleepSub: number; bloodSub: number; oralSub: number; lifestyleSub: number }
  sleepConnected: boolean
  modifier_total?: number
  modifiers_applied?: Array<{
    id: string
    panels: string[]
    direction: "penalty" | "bonus"
    points: number
    label: string
    rationale: string
  }>
}

/* ─── Component ────────────────────────────────────────────────────────────── */
export function DashboardHero({
  score,
  breakdown,
  modifier_total = 0,
}: DashboardHeroProps) {
  /* ── Peaks animation refs ────────────────────────────────────────────────── */
  const polyRefs  = useRef<(SVGPolygonElement | null)[]>([null, null, null])
  const decorRefs = useRef<(SVGGElement | null)[]>([null, null, null])
  const cpRef     = useRef<SVGGElement | null>(null)

  /* ── Animated score counter ──────────────────────────────────────────────── */
  const [displayScore, setDisplayScore] = useState(0)

  /* ── Chip hover state ────────────────────────────────────────────────────── */
  const [hoveredChip, setHoveredChip] = useState<number | null>(null)

  /* ── Score count-up ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const delay = setTimeout(() => {
      const start = performance.now()
      function frame() {
        const elapsed = performance.now() - start
        const t = Math.min(elapsed / DURATION, 1)
        const ease = easeOutCubic(t)
        setDisplayScore(Math.round(ease * score))
        if (t < 1) requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    }, 300)
    return () => clearTimeout(delay)
  }, [score])

  /* ── Peaks grow animation ────────────────────────────────────────────────── */
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    PANELS.forEach((p, i) => {
      const el = polyRefs.current[i]
      if (!el) return
      const left  = p.cx - PEAK_HALF_W
      const right = p.cx + PEAK_HALF_W
      el.setAttribute("points", `${left},${BASELINE_Y} ${p.cx},${BASELINE_Y} ${right},${BASELINE_Y}`)

      const raw   = breakdown[p.scoreKey]
      const ratio = Math.max(0, Math.min(raw / p.max, 1))
      const targetApexY = BASELINE_Y - ratio * MAX_HEIGHT

      const id = setTimeout(() => {
        const start = performance.now()
        function frame() {
          const t    = Math.min((performance.now() - start) / DURATION, 1)
          const ease = easeOutCubic(t)
          const y    = BASELINE_Y - (BASELINE_Y - targetApexY) * ease
          el!.setAttribute("points", `${left},${BASELINE_Y} ${p.cx},${y} ${right},${BASELINE_Y}`)
          if (t < 1) requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      }, 300 + i * STAGGER)
      timers.push(id)
    })

    /* Reveal score numbers + labels after peaks finish */
    const revealAt = 300 + 2 * STAGGER + DURATION
    timers.push(setTimeout(() => {
      decorRefs.current.forEach(el => { if (el) el.style.opacity = "1" })
      if (cpRef.current) cpRef.current.style.opacity = "1"
    }, revealAt))

    return () => timers.forEach(clearTimeout)
  }, [breakdown])

  /* ── Derived values ──────────────────────────────────────────────────────── */
  const baseScore    = score - (modifier_total ?? 0)
  const modSign      = modifier_total > 0 ? "+" : ""
  const absModifier  = Math.abs(modifier_total)

  /* Cross-panel triangle geometry */
  const cpCx    = 370
  const cpHalfW = 18
  const cpH     = Math.min(absModifier, 10) / 10 * (MAX_HEIGHT * 0.25)

  return (
    <div
      style={{
        background: "#fff",
        borderBottom: "0.5px solid rgba(0,0,0,0.06)",
        padding: 24,
      }}
    >
      {/* ── 1. Stat Chips Row ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {PANELS.map((p, i) => {
          const raw   = breakdown[p.scoreKey]
          const ratio = Math.max(0, Math.min(raw / p.max, 1))
          const isH   = hoveredChip === i

          return (
            <div
              key={p.key}
              onMouseEnter={() => setHoveredChip(i)}
              onMouseLeave={() => setHoveredChip(null)}
              style={{
                flex: 1,
                background: "var(--off-white, #F6F4EF)",
                border: "0.5px solid rgba(0,0,0,0.06)",
                borderRadius: 8,
                padding: "8px 12px",
                transform: isH ? "translateY(-2px)" : "translateY(0)",
                transition: "transform 150ms ease",
                animation: `chipIn 300ms ease ${200 + i * 60}ms both`,
              }}
            >
              {/* Label row */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: p.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: sans,
                    fontSize: 9,
                    textTransform: "uppercase",
                    color: "#bbb",
                    letterSpacing: 1,
                  }}
                >
                  {p.label}
                </span>
              </div>

              {/* Score */}
              <div
                style={{
                  fontFamily: serif,
                  fontSize: 20,
                  color: p.color,
                  marginTop: 2,
                }}
              >
                {Math.round(raw)}
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: 2,
                  borderRadius: 1,
                  background: "rgba(0,0,0,0.04)",
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 1,
                    background: p.color,
                    width: `${ratio * 100}%`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 2 + 3. Peaks SVG + PRI Score Block ─────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center" }}>
        {/* ── Peaks SVG ───────────────────────────────────────────────────── */}
        <div style={{ flex: 1 }}>
          <svg
            viewBox="0 0 420 185"
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
            aria-label="PRI peaks visualization"
          >
            <defs>
              {/* Mountain background gradient */}
              <linearGradient id="dh-mountainGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="rgb(200,205,216)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="rgb(200,205,216)" stopOpacity={0.05} />
              </linearGradient>

              {/* Peak gradients */}
              <linearGradient id="dh-gs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#185FA5" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#185FA5" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="dh-gb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#A32D2D" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#A32D2D" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="dh-go" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#3B6D11" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#3B6D11" stopOpacity={0.04} />
              </linearGradient>

              {/* Cross-panel gradient */}
              <linearGradient id="dh-cross" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#C49A3C" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#C49A3C" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Mountain background silhouette */}
            <path
              d="M0,155 L60,110 L120,130 L180,90 L240,120 L300,80 L360,110 L420,155"
              fill="url(#dh-mountainGrad)"
              stroke="none"
            />

            {/* Baseline */}
            <line
              x1="0" y1="155" x2="420" y2="155"
              stroke="rgba(0,0,0,0.07)"
              strokeWidth="0.5"
            />

            {/* Three peaks */}
            {PANELS.map((p, i) => {
              const raw   = breakdown[p.scoreKey]
              const ratio = Math.max(0, Math.min(raw / p.max, 1))
              const apexY = BASELINE_Y - ratio * MAX_HEIGHT
              const left  = p.cx - PEAK_HALF_W
              const right = p.cx + PEAK_HALF_W
              const gradIds = ["dh-gs", "dh-gb", "dh-go"]

              return (
                <g key={p.key}>
                  <polygon
                    ref={el => { polyRefs.current[i] = el }}
                    points={`${left},${BASELINE_Y} ${p.cx},${BASELINE_Y} ${right},${BASELINE_Y}`}
                    fill={`url(#${gradIds[i]})`}
                    stroke={p.color}
                    strokeWidth={0.8}
                    strokeLinejoin="round"
                  />

                  <g
                    ref={el => { decorRefs.current[i] = el }}
                    style={{ opacity: 0, transition: "opacity 500ms ease" }}
                  >
                    {/* Score above apex */}
                    <text
                      x={p.cx}
                      y={apexY - 8}
                      textAnchor="middle"
                      fontFamily={serif}
                      fontSize={15}
                      fill={p.color}
                    >
                      {Math.round(raw)}
                    </text>

                    {/* Label below baseline */}
                    <text
                      x={p.cx}
                      y={BASELINE_Y + 14}
                      textAnchor="middle"
                      fontFamily={sans}
                      fontSize={7}
                      letterSpacing="1"
                      fill={p.color}
                      style={{ textTransform: "uppercase" }}
                    >
                      {p.label}
                    </text>

                    {/* /max below label */}
                    <text
                      x={p.cx}
                      y={BASELINE_Y + 24}
                      textAnchor="middle"
                      fontFamily={sans}
                      fontSize={6.5}
                      fill="#bbb"
                    >
                      /{p.max}
                    </text>
                  </g>
                </g>
              )
            })}

            {/* Cross-panel inverted triangle */}
            {modifier_total !== 0 && (
              <g
                ref={cpRef}
                style={{ opacity: 0, transition: "opacity 600ms ease" }}
              >
                <polygon
                  points={`${cpCx - cpHalfW},${BASELINE_Y} ${cpCx + cpHalfW},${BASELINE_Y} ${cpCx},${BASELINE_Y + cpH}`}
                  fill="url(#dh-cross)"
                  stroke="#C49A3C"
                  strokeWidth={0.7}
                  strokeDasharray="3,2.5"
                />
                <text
                  x={cpCx}
                  y={BASELINE_Y - 8}
                  textAnchor="middle"
                  fontFamily={serif}
                  fontSize={13}
                  fill="#C49A3C"
                >
                  {modSign}{modifier_total}
                </text>
                <text
                  x={cpCx}
                  y={BASELINE_Y + cpH + 14}
                  textAnchor="middle"
                  fontFamily={sans}
                  fontSize={6.5}
                  letterSpacing="1"
                  fill="#C49A3C"
                >
                  CROSS-PANEL
                </text>
                <text
                  x={cpCx}
                  y={BASELINE_Y + cpH + 22}
                  textAnchor="middle"
                  fontFamily={sans}
                  fontSize={6}
                  fill="rgba(196,154,60,0.38)"
                >
                  modifier
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* ── PRI Score Block ─────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            minWidth: 160,
            textAlign: "right",
          }}
        >
          {/* Index label */}
          <span
            style={{
              fontFamily: sans,
              fontSize: 9,
              textTransform: "uppercase",
              color: "#bbb",
              letterSpacing: 2,
              marginBottom: 2,
            }}
          >
            PEAQ RESILIENCE INDEX
          </span>

          {/* Big score */}
          <span
            style={{
              fontFamily: serif,
              fontSize: 80,
              fontWeight: 300,
              color: "#1a1a18",
              lineHeight: 1,
            }}
          >
            {displayScore}
          </span>

          {/* Tagline */}
          <span
            style={{
              fontFamily: serif,
              fontStyle: "italic",
              fontSize: 14,
              color: "#bbb",
              marginTop: 4,
            }}
          >
            Three signals. One measure of{" "}
            <span style={{ color: "#C49A3C" }}>resilience.</span>
          </span>

          {/* Base + modifier sub-text */}
          <span
            style={{
              fontSize: 10,
              color: "#bbb",
              marginTop: 6,
            }}
          >
            {baseScore} base · {modSign}{modifier_total} cross-panel
          </span>

          {/* Cross-panel pill */}
          <div
            style={{
              marginTop: 8,
              background: "#16150F",
              borderRadius: 20,
              padding: "5px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#C49A3C",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: sans,
                fontSize: 8,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.38)",
                letterSpacing: 1,
              }}
            >
              CROSS-PANEL
            </span>
            <span
              style={{
                fontFamily: serif,
                fontSize: 15,
                color: "#C49A3C",
              }}
            >
              {modSign}{modifier_total}
            </span>
          </div>
        </div>
      </div>

      {/* ── Chip entrance keyframes ─────────────────────────────────────────── */}
      <style>{`
        @keyframes chipIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

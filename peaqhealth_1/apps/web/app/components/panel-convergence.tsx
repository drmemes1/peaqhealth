"use client"

import { useEffect, useState } from "react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, sans-serif"

interface PanelState {
  key: string
  label: string
  color: string
  colorMuted: string
  score: number
  max: number
  connected: boolean
  source: string
  cta: string
  href: string
}

interface PanelConvergenceProps {
  score: number
  breakdown: { sleepSub: number; bloodSub: number; oralSub: number; lifestyleSub: number }
  sleepConnected: boolean
  oralActive: boolean
  hasBlood: boolean
  wearableProvider?: string
  bloodLabName?: string
  oralKitStatus?: "none" | "ordered" | "complete"
  sleepHidden?: boolean
  trendDeltas?: { sleep: number | null; blood: number | null; oral: number | null }
}

export function PanelConvergence({
  score, breakdown, sleepConnected, oralActive, hasBlood,
  wearableProvider, bloodLabName, oralKitStatus, sleepHidden = false,
  trendDeltas,
}: PanelConvergenceProps) {
  const panels: PanelState[] = [
    {
      key: "sleep", label: sleepHidden ? "Recovery" : "Sleep", color: "#4A7FB5", colorMuted: "#B4B2A9",
      score: sleepHidden ? 0 : breakdown.sleepSub, max: 30,
      connected: !sleepHidden && sleepConnected && breakdown.sleepSub > 0,
      source: wearableProvider ? ({ whoop: "WHOOP", oura: "Oura", garmin: "Garmin" } as Record<string,string>)[wearableProvider] ?? "Wearable" : "",
      cta: "Connect wearable", href: "/settings#wearables",
    },
    {
      key: "blood", label: "Blood", color: "#C0392B", colorMuted: "#B4B2A9",
      score: breakdown.bloodSub, max: 40, connected: hasBlood && breakdown.bloodSub > 0,
      source: bloodLabName ?? "",
      cta: "Upload labs", href: "/settings/labs",
    },
    {
      key: "oral", label: "Oral", color: "#2D6A4F", colorMuted: "#B4B2A9",
      score: breakdown.oralSub, max: 30, connected: oralActive && breakdown.oralSub > 0,
      source: oralActive ? "Zymo" : "",
      cta: oralKitStatus === "ordered" ? "Kit pending" : "Order kit", href: "/shop",
    },
  ]

  // Animation: lines draw in, score fades
  const [mounted, setMounted] = useState(false)
  const [scoreVisible, setScoreVisible] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setMounted(true), 100)
    const t2 = setTimeout(() => setScoreVisible(true), 900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Count-up for score
  const [displayScore, setDisplayScore] = useState(0)
  useEffect(() => {
    if (!scoreVisible) return
    const start = performance.now()
    function tick(now: number) {
      const t = Math.min((now - start) / 700, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplayScore(Math.round(ease * score))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [scoreVisible, score])

  // SVG layout constants
  const W = 520, H = 340
  const panelY = 24
  const panelW = 136, panelH = 90
  const panelGap = (W - panelW * 3) / 4
  const panelXs = panels.map((_, i) => panelGap + i * (panelW + panelGap))
  const circleR = 46
  const circleCx = W / 2
  const circleCy = H - circleR - 16

  // Curve control points for each line
  function curvePath(px: number, py: number) {
    const startX = px + panelW / 2
    const startY = py + panelH
    const midY = (startY + circleCy) / 2
    return `M ${startX} ${startY} C ${startX} ${midY}, ${circleCx} ${midY}, ${circleCx} ${circleCy - circleR}`
  }

  return (
    <div style={{ width: "100%", maxWidth: 520, margin: "0 auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
      >
        <defs>
          {/* Subtle noise texture for background feel */}
          <filter id="pc-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
            <feBlend in="SourceGraphic" in2="gray" mode="multiply" />
          </filter>
        </defs>

        {/* Connection lines — draw from each panel to score circle */}
        {panels.map((p, i) => {
          const path = curvePath(panelXs[i], panelY)
          const isSleepDimmed = p.key === "sleep" && sleepHidden
          const lineColor = isSleepDimmed ? "rgba(0,0,0,0.10)" : (p.connected ? p.color : p.colorMuted)
          return (
            <path
              key={`line-${p.key}`}
              d={path}
              fill="none"
              stroke={lineColor}
              strokeWidth={p.connected ? 1.5 : 1}
              strokeDasharray={p.connected ? "none" : "4,3"}
              strokeLinecap="round"
              opacity={mounted ? (isSleepDimmed ? 0.15 : (p.connected ? 0.6 : 0.25)) : 0}
              style={{
                transition: `opacity 400ms ease ${300 + i * 150}ms, stroke 400ms ease`,
              }}
            />
          )
        })}

        {/* Panel boxes */}
        {panels.map((p, i) => {
          const x = panelXs[i]
          const isSleepDimmed = p.key === "sleep" && sleepHidden
          const borderColor = isSleepDimmed ? "rgba(0,0,0,0.10)" : (p.connected ? p.color : p.colorMuted)
          const fillColor = isSleepDimmed ? "rgba(0,0,0,0.03)" : (p.connected ? `${p.color}1A` : "#F1EFE8")
          return (
            <g
              key={p.key}
              opacity={mounted ? 1 : 0}
              style={{ transition: `opacity 400ms ease ${i * 100}ms` }}
            >
              {/* Box background */}
              <rect
                x={x} y={panelY} width={panelW} height={panelH}
                rx={8} ry={8}
                fill={fillColor}
                stroke={borderColor}
                strokeWidth={0.5}
                strokeDasharray={p.connected ? "none" : "4,3"}
                style={{ transition: "fill 400ms ease, stroke 400ms ease" }}
              />

              {/* Panel label */}
              <text
                x={x + panelW / 2} y={panelY + 24}
                textAnchor="middle"
                fontFamily={serif}
                fontSize={16}
                fontWeight={400}
                fill={isSleepDimmed ? "rgba(0,0,0,0.2)" : (p.connected ? "#141410" : "#B4B2A9")}
                style={{ transition: "fill 400ms ease" }}
              >
                {p.label}
              </text>

              {/* Score */}
              <text
                x={x + panelW / 2} y={panelY + 50}
                textAnchor="middle"
                fontFamily={serif}
                fontSize={22}
                fontWeight={300}
                fill={isSleepDimmed ? "rgba(0,0,0,0.2)" : (p.connected ? p.color : "#B4B2A9")}
                style={{ transition: "fill 400ms ease" }}
              >
                {isSleepDimmed ? "0" : (p.connected ? Math.round(p.score) : "\u2014")}
              </text>

              {/* Source or CTA */}
              <text
                x={x + panelW / 2} y={panelY + 72}
                textAnchor="middle"
                fontFamily={sans}
                fontSize={8.5}
                letterSpacing="1.2"
                fill={isSleepDimmed ? "rgba(0,0,0,0.15)" : (p.connected ? "#8C8A82" : "#C49A3C")}
                style={{ textTransform: "uppercase", transition: "fill 400ms ease" } as React.CSSProperties}
              >
                {isSleepDimmed ? "No wearable" : (p.connected ? p.source : p.cta)}
              </text>

              {/* Trend indicator (Fix 7) */}
              {(() => {
                const delta = trendDeltas?.[p.key as "sleep" | "blood" | "oral"] ?? null
                if (delta === null || delta === 0 || !p.connected) return null
                const arrow = delta > 0 ? "\u2191" : "\u2193"
                const color = delta > 0 ? "#2D6A4F" : "#C0392B"
                return (
                  <text
                    x={x + panelW - 10} y={panelY + panelH - 8}
                    textAnchor="end"
                    fontFamily={sans}
                    fontSize={10}
                    fill={color}
                    opacity={isSleepDimmed ? 0 : 1}
                    style={{ transition: "opacity 400ms ease" }}
                  >
                    {arrow}
                  </text>
                )
              })()}
            </g>
          )
        })}

        {/* Score circle */}
        <g
          opacity={scoreVisible ? 1 : 0}
          style={{ transition: "opacity 500ms ease" }}
        >
          <circle
            cx={circleCx} cy={circleCy} r={circleR}
            fill="#FFFFFF"
            stroke="rgba(20,20,16,0.2)"
            strokeWidth={1}
          />
          {/* Score number */}
          <text
            x={circleCx} y={circleCy - 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily={serif}
            fontSize={38}
            fontWeight={300}
            fill="#141410"
          >
            {displayScore}
          </text>
          {/* Date label */}
          <text
            x={circleCx} y={circleCy + 24}
            textAnchor="middle"
            fontFamily={sans}
            fontSize={9}
            letterSpacing="1.5"
            fill="rgba(20,20,16,0.35)"
          >
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
          </text>
        </g>
      </svg>
    </div>
  )
}

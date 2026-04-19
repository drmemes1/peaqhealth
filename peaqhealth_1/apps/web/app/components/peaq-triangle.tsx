// LEGACY: Not imported anywhere. Remove after V5 migration confirmed.
"use client"

import { useState, useEffect, useRef } from "react"

interface CnvrgTriangleProps {
  score: number
  breakdown: { sleepSub: number; bloodSub: number; oralSub: number; lifestyleSub: number }
  modifier_total?: number
}

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "-apple-system, BlinkMacSystemFont, sans-serif"

// Triangle vertices (equilateral, 30% smaller, centered in 400x400)
const TOP = { x: 200, y: 107 }
const BL  = { x: 98,  y: 282 }
const BR  = { x: 302, y: 282 }

function lineLength(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

function tierFor(pct: number) {
  if (pct <= 33)  return { strokeWidth: 0.8, opacity: 0.4 }
  if (pct <= 66)  return { strokeWidth: 1.5, opacity: 0.7 }
  return { strokeWidth: 2.5, opacity: 1.0 }
}

function easeOut(t: number) {
  return 1 - (1 - t) ** 3
}

export function CnvrgTriangle({ score, breakdown, modifier_total }: CnvrgTriangleProps) {
  const sleepPct = (breakdown.sleepSub / 30) * 100
  const bloodPct = (breakdown.bloodSub / 40) * 100
  const oralPct  = (breakdown.oralSub / 30) * 100

  const sleepTier = tierFor(sleepPct)
  const bloodTier = tierFor(bloodPct)
  const oralTier  = tierFor(oralPct)

  // Side lengths
  const leftLen  = lineLength(TOP, BL)
  const rightLen = lineLength(TOP, BR)
  const baseLen  = lineLength(BL, BR)

  // Stroke animation refs
  const leftRef  = useRef<SVGLineElement>(null)
  const rightRef = useRef<SVGLineElement>(null)
  const baseRef  = useRef<SVGLineElement>(null)

  // Fill animation
  const [fillHeight, setFillHeight] = useState(0)
  const triHeight = BR.y - TOP.y // 250

  // Score inside triangle
  const [scoreVisible, setScoreVisible] = useState(false)

  // Label opacity
  const [labelsVisible, setLabelsVisible] = useState(false)

  // Count-up for PRI score
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    const startTime = performance.now()

    // Animate strokes
    function animateLine(
      el: SVGLineElement | null,
      len: number,
      delay: number,
      duration: number,
    ) {
      if (!el) return
      el.style.strokeDasharray = `${len}`
      el.style.strokeDashoffset = `${len}`
      const start = performance.now()
      function tick(now: number) {
        const elapsed = now - start - delay
        if (elapsed < 0) { requestAnimationFrame(tick); return }
        const t = Math.min(elapsed / duration, 1)
        el!.style.strokeDashoffset = `${len * (1 - easeOut(t))}`
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    // Blood base first, Sleep left 150ms, Oral right 300ms
    animateLine(baseRef.current, baseLen, 0, 800)
    animateLine(leftRef.current, leftLen, 150, 800)
    animateLine(rightRef.current, rightLen, 300, 800)

    // Fill animation: delay 400ms, 600ms duration
    const fillStart = startTime
    function fillTick(now: number) {
      const elapsed = now - fillStart - 400
      if (elapsed < 0) { requestAnimationFrame(fillTick); return }
      const t = Math.min(elapsed / 600, 1)
      const target = (score / 100) * triHeight
      setFillHeight(easeOut(t) * target)
      if (t < 1) requestAnimationFrame(fillTick)
    }
    requestAnimationFrame(fillTick)

    // Score inside triangle at 600ms
    const scoreTimer = setTimeout(() => setScoreVisible(true), 600)

    // Labels at 700ms
    const labelTimer = setTimeout(() => setLabelsVisible(true), 700)

    // Count-up score: delay 800ms, 700ms duration
    const countStart = performance.now()
    function countTick(now: number) {
      const elapsed = now - countStart - 800
      if (elapsed < 0) { requestAnimationFrame(countTick); return }
      const t = Math.min(elapsed / 700, 1)
      setDisplayScore(Math.round(easeOut(t) * score))
      if (t < 1) requestAnimationFrame(countTick)
    }
    requestAnimationFrame(countTick)

    return () => {
      clearTimeout(scoreTimer)
      clearTimeout(labelTimer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fill color based on score
  const fillColor =
    score <= 40 ? "rgba(196,154,60,0.08)" :
    score <= 70 ? "rgba(196,154,60,0.12)" :
                  "rgba(196,154,60,0.18)"

  const centroidY = (TOP.y + BL.y + BR.y) / 3

  return (
    <div>
      <svg viewBox="0 0 400 400" style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <clipPath id="tri-clip">
            <polygon points={`${TOP.x},${TOP.y} ${BL.x},${BL.y} ${BR.x},${BR.y}`} />
          </clipPath>
        </defs>

        {/* Fill rect clipped to triangle */}
        <rect
          clipPath="url(#tri-clip)"
          x={0}
          y={BR.y - fillHeight}
          width={400}
          height={fillHeight}
          fill={fillColor}
        />

        {/* Triangle sides */}
        {/* Base: Blood */}
        <line
          ref={baseRef}
          x1={BL.x} y1={BL.y} x2={BR.x} y2={BR.y}
          stroke="#A32D2D"
          strokeWidth={bloodTier.strokeWidth}
          opacity={bloodTier.opacity}
          strokeLinecap="round"
        />
        {/* Left: Sleep */}
        <line
          ref={leftRef}
          x1={TOP.x} y1={TOP.y} x2={BL.x} y2={BL.y}
          stroke="#185FA5"
          strokeWidth={sleepTier.strokeWidth}
          opacity={sleepTier.opacity}
          strokeLinecap="round"
        />
        {/* Right: Oral */}
        <line
          ref={rightRef}
          x1={TOP.x} y1={TOP.y} x2={BR.x} y2={BR.y}
          stroke="#3B6D11"
          strokeWidth={oralTier.strokeWidth}
          opacity={oralTier.opacity}
          strokeLinecap="round"
        />

        {/* PRI score inside triangle */}
        <g style={{ opacity: scoreVisible ? 1 : 0, transition: "opacity 400ms ease" }}>
          <text
            x={200} y={centroidY - 12}
            textAnchor="middle"
            style={{ fontFamily: sans, fontSize: 8, letterSpacing: "2px", textTransform: "uppercase" as const, fill: "#bbb" }}
          >
            CNVRG RESILIENCE INDEX
          </text>
          <text
            x={200} y={centroidY + 28}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontFamily: serif, fontSize: 52, fontWeight: 300, fill: "#1a1a18" }}
          >
            {displayScore}
          </text>
        </g>

        {/* Panel labels */}
        {/* Sleep — top-left */}
        <g style={{ opacity: labelsVisible ? 1 : 0, transition: "opacity 400ms ease" }}>
          <text
            x={BL.x - 8} y={TOP.y + 4}
            textAnchor="end"
            style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase" as const, fill: "#185FA5" }}
          >
            SLEEP
          </text>
          <text
            x={BL.x - 8} y={TOP.y + 30}
            textAnchor="end"
            style={{ fontFamily: serif, fontSize: 22, fill: "#185FA5" }}
          >
            {Math.round(breakdown.sleepSub)}
          </text>
          <text
            x={BL.x - 8} y={TOP.y + 44}
            textAnchor="end"
            style={{ fontFamily: sans, fontSize: 10, fill: "#bbb" }}
          >
            /30
          </text>
        </g>

        {/* Oral — top-right */}
        <g style={{ opacity: labelsVisible ? 1 : 0, transition: "opacity 400ms ease" }}>
          <text
            x={BR.x + 8} y={TOP.y + 4}
            textAnchor="start"
            style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", fill: "#3B6D11" }}
          >
            ORAL
          </text>
          <text
            x={BR.x + 8} y={TOP.y + 30}
            textAnchor="start"
            style={{ fontFamily: serif, fontSize: 22, fill: "#3B6D11" }}
          >
            {Math.round(breakdown.oralSub)}
          </text>
          <text
            x={BR.x + 8} y={TOP.y + 44}
            textAnchor="start"
            style={{ fontFamily: sans, fontSize: 10, fill: "#bbb" }}
          >
            /30
          </text>
        </g>

        {/* Blood — bottom center */}
        <g style={{ opacity: labelsVisible ? 1 : 0, transition: "opacity 400ms ease" }}>
          <text
            x={200} y={BL.y + 22}
            textAnchor="middle"
            style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", fill: "#A32D2D" }}
          >
            BLOOD
          </text>
          <text
            x={200} y={BL.y + 48}
            textAnchor="middle"
            style={{ fontFamily: serif, fontSize: 22, fill: "#A32D2D" }}
          >
            {Math.round(breakdown.bloodSub)}
          </text>
          <text
            x={200} y={BL.y + 62}
            textAnchor="middle"
            style={{ fontFamily: sans, fontSize: 10, fill: "#bbb" }}
          >
            /40
          </text>
        </g>
      </svg>

      {/* Below SVG: tagline */}
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <div style={{
          fontFamily: serif,
          fontStyle: "italic",
          fontSize: 14,
          color: "#bbb",
        }}>
          Three signals. One measure of{" "}
          <span style={{ color: "#C49A3C" }}>resilience.</span>
        </div>
      </div>
    </div>
  )
}

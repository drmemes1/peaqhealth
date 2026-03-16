"use client"
import { useEffect, useRef } from "react"

interface ScoreRingProps {
  r: number
  circumference: number
  color: string
  trackColor: string
  fillPct: number       // 0–1
  pending?: boolean     // show dashed instead of filled arc
  animDelay?: number    // ms
}

export function ScoreRing({ r, circumference, color, trackColor, fillPct, pending = false, animDelay = 0 }: ScoreRingProps) {
  const arcRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const el = arcRef.current
    if (!el) return
    el.style.strokeDashoffset = String(circumference)
    const id = setTimeout(() => {
      el.style.transition = "stroke-dashoffset 1.8s cubic-bezier(.16,1,.3,1)"
      el.style.strokeDashoffset = String(circumference * (1 - fillPct))
    }, animDelay)
    return () => clearTimeout(id)
  }, [fillPct, circumference, animDelay])

  const cx = 110, cy = 110

  return (
    <>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={8} />
      {/* Fill or pending dashes */}
      {pending ? (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray="5 7"
          opacity={0.3}
        />
      ) : (
        <circle
          ref={arcRef}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
      )}
    </>
  )
}

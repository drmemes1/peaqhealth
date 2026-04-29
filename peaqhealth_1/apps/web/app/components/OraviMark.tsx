"use client"

import { useState } from "react"

/**
 * OraviMark — the small circular dotted brand mark used in the top nav.
 *
 * Tries the asset at /brand/oravi-mark.svg first; if that 404s, falls back
 * to an inline-SVG dotted-circle. The fallback ships in this PR so we don't
 * block on the asset PR.
 */
export function OraviMark({ size = 28, color = "currentColor" }: { size?: number; color?: string }) {
  const [broken, setBroken] = useState(false)

  if (!broken) {
    return (
      <img
        src="/brand/oravi-mark.svg"
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        onError={() => setBroken(true)}
        style={{ display: "block" }}
      />
    )
  }

  // Inline fallback: 8 dots evenly spaced on a circle.
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.36
  const dotR = size * 0.08
  const N = 8

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ display: "block" }}>
      {Array.from({ length: N }).map((_, i) => {
        const theta = (i / N) * Math.PI * 2 - Math.PI / 2
        return <circle key={i} cx={cx + Math.cos(theta) * r} cy={cy + Math.sin(theta) * r} r={dotR} fill={color} />
      })}
    </svg>
  )
}

export default OraviMark

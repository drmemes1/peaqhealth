"use client"

import { useState, useEffect } from "react"

export interface RangeTrackProps {
  zones: Array<{ label: string; color: string; min: number; max: number }>
  value: number | null
  panelColor: string
  unit: string
  optimal?: string
  animate?: boolean
  delay?: number
}

export function RangeTrack({
  zones,
  value,
  panelColor,
  unit,
  optimal,
  animate = true,
  delay = 0,
}: RangeTrackProps) {
  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20)
    return () => clearTimeout(t)
  }, [])

  const totalMin = zones.length > 0 ? zones[0].min : 0
  const totalMax = zones.length > 0 ? zones[zones.length - 1].max : 1
  const totalRange = totalMax - totalMin || 1

  const isEmpty = value === null || value === 0

  const clampedValue = isEmpty
    ? 0
    : Math.min(Math.max(value, totalMin), totalMax)
  const dotPct = ((clampedValue - totalMin) / totalRange) * 100

  return (
    <div style={{ position: "relative" }}>
      {/* Track bar */}
      <div
        style={{
          position: "relative",
          height: 6,
          display: "flex",
          borderRadius: 3,
          overflow: "hidden",
          gap: 0.5,
        }}
      >
        {zones.map((zone, i) => (
          <div
            key={i}
            style={{
              flex: (zone.max - zone.min) / totalRange,
              background: zone.color,
              minWidth: 0,
            }}
          />
        ))}
      </div>

      {/* Dot */}
      {!isEmpty && (
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: "absolute",
            top: 3,
            left: animate && !mounted ? "0%" : `${dotPct}%`,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: panelColor,
            border: "1.5px solid white",
            transform: `translate(-50%, -50%) scale(${hovered ? 1.3 : 1})`,
            transition: `left 600ms ease-out ${delay}ms, transform 200ms ease`,
            cursor: "default",
            zIndex: 1,
          }}
        />
      )}

      {/* Labels below */}
      <div
        style={{
          marginTop: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        {isEmpty ? (
          <span
            style={{
              fontSize: 10,
              fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
              color: "#bbb",
            }}
          >
            Not tested
          </span>
        ) : (
          <span style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#1a1a18",
                fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
              }}
            >
              {value}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "#bbb",
                fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
              }}
            >
              {unit}
            </span>
          </span>
        )}
        {optimal && !isEmpty && (
          <span
            style={{
              fontSize: 9,
              color: "#bbb",
              fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            optimal: {optimal}
          </span>
        )}
      </div>
    </div>
  )
}

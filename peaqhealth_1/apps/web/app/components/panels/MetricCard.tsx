"use client"

import { useState } from "react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const STATUS_COLORS = {
  good: "#1A8C4E",
  watch: "#E07B00",
  concern: "#D42B2B",
  info: "#B8860B",
  pending: "#C8C6BE",
} as const

interface Props {
  label: string
  value: number | string
  valueSuffix?: string
  status: keyof typeof STATUS_COLORS
  targetMin?: number
  targetMax?: number
  targetLabel?: string
  valueForIndicator?: number
  rangeMin?: number
  rangeMax?: number
  explanation: string
  source?: string
  species?: string
}

export function MetricCard({
  label, value, valueSuffix, status, targetMin, targetMax, targetLabel,
  valueForIndicator, rangeMin = 0, rangeMax = 100, explanation, source, species,
}: Props) {
  const [open, setOpen] = useState(false)
  const color = STATUS_COLORS[status]
  const range = rangeMax - rangeMin || 1

  const hasBar = typeof valueForIndicator === "number" && (targetMin != null || targetMax != null)
  const targetZoneLeft = targetMin != null ? ((targetMin - rangeMin) / range) * 100 : 0
  const targetZoneWidth = targetMin != null && targetMax != null
    ? ((targetMax - targetMin) / range) * 100
    : targetMax != null ? ((targetMax - rangeMin) / range) * 100 : 0
  const indicatorLeft = typeof valueForIndicator === "number"
    ? Math.max(0, Math.min(100, ((valueForIndicator - rangeMin) / range) * 100))
    : 0

  const targetStr =
    targetLabel ?? (targetMin != null && targetMax != null
      ? `${targetMin}–${targetMax}${valueSuffix ?? ""}`
      : targetMin != null ? `≥ ${targetMin}${valueSuffix ?? ""}`
      : targetMax != null ? `< ${targetMax}${valueSuffix ?? ""}` : "")

  return (
    <div className="metric-card" style={{
      background: "#FFFFFF",
      border: "1px solid #E8E6E0",
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      padding: "14px 16px",
      transition: "background 150ms ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, color: "#5C5A54" }}>
          {label}
        </span>
        <span style={{
          fontFamily: sans, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
          color, display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
          {status === "pending" ? "Pending" : status === "info" ? "Info" : status === "good" ? "Good" : status === "watch" ? "Watch" : "Concern"}
        </span>
      </div>

      {species && (
        <p style={{ fontFamily: sans, fontSize: 11, fontStyle: "italic", color: "#888780", margin: "0 0 6px" }}>{species}</p>
      )}
      <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 500, lineHeight: 1, color: "#2C2A24", marginBottom: 6 }}>
        {typeof value === "number" ? (value < 10 ? value.toFixed(2) : value < 100 ? value.toFixed(1) : Math.round(value)) : value}
        {valueSuffix && <span style={{ fontSize: 16, fontWeight: 400, color: "#9B9891", marginLeft: 2 }}>{valueSuffix}</span>}
      </div>

      {targetStr && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: hasBar ? 8 : 4 }}>
          <span style={{ fontFamily: sans, fontSize: 10, textTransform: "uppercase", color: "#9B9891" }}>Target</span>
          <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, color: "#B8860B" }}>{targetStr}</span>
        </div>
      )}

      {hasBar && (
        <div style={{ position: "relative", height: 7, marginBottom: 8 }}>
          <div style={{ position: "absolute", top: 2, left: 0, right: 0, height: 3, background: "#F0EDE6", borderRadius: 2 }} />
          {(targetZoneWidth > 0) && (
            <div style={{
              position: "absolute", top: 2, height: 3, borderRadius: 2,
              left: `${targetZoneLeft}%`, width: `${targetZoneWidth}%`,
              background: "rgba(184,134,11,0.15)",
            }} />
          )}
          <div style={{
            position: "absolute", top: 0, width: 2, height: 7, borderRadius: 1,
            background: "#2C2A24", left: `${indicatorLeft}%`, transform: "translateX(-1px)",
          }} />
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontFamily: sans, fontSize: 11, fontWeight: 500, color: "#B8860B",
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        {open ? "Less ↑" : "Why this matters ↓"}
      </button>

      <div style={{
        maxHeight: open ? 300 : 0, overflow: "hidden",
        transition: "max-height 0.3s ease",
      }}>
        <p style={{ fontFamily: sans, fontSize: 13, color: "#5C5A54", lineHeight: 1.6, margin: "8px 0 0" }}>
          {explanation}
        </p>
        {source && (
          <p style={{ fontFamily: sans, fontSize: 11, fontStyle: "italic", color: "#9B9891", margin: "6px 0 0" }}>
            {source}
          </p>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const STATUS_COLORS = {
  good: "#1A8C4E",
  watch: "#B8860B",
  concern: "#A84D4D",
  info: "rgba(184,134,11,0.6)",
  pending: "#C8C6BE",
} as const

const STATUS_LABELS: Record<string, string> = {
  good: "Good",
  watch: "Watch",
  concern: "Watch closely",
  info: "Info",
  pending: "Pending",
}

interface CardProps {
  label: string
  subtitle?: string
  value: number | string | null
  unit?: string
  status: keyof typeof STATUS_COLORS
  statusLabel?: string
  target?: string
  targetPrefix?: string
  rangeMin?: number
  rangeMax?: number
  targetMin?: number
  targetMax?: number
  pendingNote?: string
  expandContent?: {
    why: string
    action?: string
    source?: string
  }
}

export function Card({
  label, subtitle, value, unit, status, statusLabel,
  target, targetPrefix = "Target", rangeMin, rangeMax, targetMin, targetMax,
  pendingNote, expandContent,
}: CardProps) {
  const [open, setOpen] = useState(false)
  const color = STATUS_COLORS[status]
  const pill = statusLabel ?? STATUS_LABELS[status]
  const isPending = value == null || status === "pending"
  const hasBar = !isPending && typeof value === "number" && rangeMin != null && rangeMax != null && (targetMin != null || targetMax != null)

  const range = (rangeMax ?? 1) - (rangeMin ?? 0) || 1
  const tLeft = targetMin != null ? ((targetMin - (rangeMin ?? 0)) / range) * 100 : 0
  const tWidth = targetMin != null && targetMax != null
    ? ((targetMax - targetMin) / range) * 100
    : targetMax != null ? ((targetMax - (rangeMin ?? 0)) / range) * 100 : 0
  const tickLeft = typeof value === "number" && rangeMin != null
    ? Math.max(0, Math.min(100, ((value - rangeMin) / range) * 100))
    : 0

  return (
    <div style={{
      background: "#FAFAF8",
      border: "1px solid #D6D3C8",
      borderRadius: 10,
      padding: "20px 22px",
      borderLeft: `3px solid ${color}`,
      transition: "background 0.25s ease, border-color 0.25s ease",
      cursor: expandContent ? "default" : undefined,
    }}
    onMouseEnter={e => { e.currentTarget.style.background = "#FFFEFB"; e.currentTarget.style.borderColor = "#B8AA88"; e.currentTarget.style.borderLeftColor = color }}
    onMouseLeave={e => { e.currentTarget.style.background = "#FAFAF8"; e.currentTarget.style.borderColor = "#D6D3C8"; e.currentTarget.style.borderLeftColor = color }}
    >
      {/* Header: label + status pill */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: subtitle ? 2 : 10 }}>
        <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: "#2C2A24", letterSpacing: "0.01em" }}>{label}</span>
        <span style={{
          fontFamily: sans, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em",
          textTransform: "uppercase", color, whiteSpace: "nowrap",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
          {pill}
        </span>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p style={{ fontFamily: serif, fontSize: 12, fontStyle: "italic", color: "#8C897F", margin: "0 0 10px" }}>{subtitle}</p>
      )}

      {/* Value */}
      {isPending ? (
        <p style={{ fontFamily: serif, fontSize: 22, fontStyle: "italic", color: "#8C897F", margin: "0 0 8px", lineHeight: 1 }}>
          Not yet measured
        </p>
      ) : (
        <div style={{ fontFamily: serif, fontSize: 42, fontWeight: 500, color: "#2C2A24", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 8 }}>
          {typeof value === "number" ? (value < 1 ? value.toFixed(3) : value < 10 ? value.toFixed(2) : value < 100 ? value.toFixed(1) : Math.round(value)) : value}
          {unit && <span style={{ fontSize: 20, fontWeight: 400, color: "#8C897F", marginLeft: 2 }}>{unit}</span>}
        </div>
      )}

      {/* Target */}
      {target ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: hasBar ? 10 : 6 }}>
          <span style={{ fontFamily: sans, fontSize: 11, color: "#8C897F" }}>{targetPrefix}</span>
          <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, color: "#B8860B" }}>{target}</span>
        </div>
      ) : status === "info" ? (
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontFamily: sans, fontSize: 11, color: "#8C897F" }}>No target — reference only</span>
        </div>
      ) : null}

      {/* Indicator bar */}
      {hasBar && (
        <div style={{ position: "relative", height: 8, marginBottom: 10 }}>
          <div style={{ position: "absolute", top: 3, left: 0, right: 0, height: 2, background: "#E8E4D8", borderRadius: 1 }} />
          {tWidth > 0 && (
            <div style={{
              position: "absolute", top: 3, height: 2, borderRadius: 1,
              left: `${tLeft}%`, width: `${tWidth}%`,
              background: "rgba(184,134,11,0.25)",
            }} />
          )}
          <div style={{
            position: "absolute", top: 0, width: 2, height: 8, borderRadius: 1,
            background: "#2C2A24", left: `${tickLeft}%`, transform: "translateX(-1px)",
          }} />
        </div>
      )}

      {/* Pending note */}
      {isPending && pendingNote && (
        <p style={{ fontFamily: sans, fontSize: 12, color: "#7A7870", lineHeight: 1.55, margin: "0 0 4px" }}>{pendingNote}</p>
      )}

      {/* Expand toggle */}
      {expandContent && !isPending && (
        <>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              fontFamily: sans, fontSize: 11, fontWeight: 500, color: "#B8860B",
              background: "none", border: "none", cursor: "pointer", padding: 0,
              marginTop: 4,
            }}
          >
            {open ? "Less ↑" : "Why this matters ↓"}
          </button>
          <div style={{ maxHeight: open ? 400 : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}>
            <p style={{ fontFamily: sans, fontSize: 12, color: "#7A7870", lineHeight: 1.55, margin: "10px 0 0" }}>
              {expandContent.why}
            </p>
            {expandContent.action && (
              <p style={{ fontFamily: sans, fontSize: 12, color: "#7A7870", lineHeight: 1.55, margin: "8px 0 0" }}>
                <span style={{ fontWeight: 500, color: "#5C5A54" }}>What you can do: </span>{expandContent.action}
              </p>
            )}
            {expandContent.source && (
              <p style={{ fontFamily: sans, fontSize: 11, fontStyle: "italic", color: "#8C897F", margin: "6px 0 0" }}>{expandContent.source}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

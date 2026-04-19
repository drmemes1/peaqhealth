"use client"

import { useState } from "react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const STATUS_COLORS = {
  good: "#1A8C4E",
  watch: "#E07B00",
  concern: "#D42B2B",
  pending: "#C8C6BE",
} as const

interface Props {
  title: string
  description: string
  value: number | string
  valueSuffix?: string
  target: string
  status: keyof typeof STATUS_COLORS
  explanation: string
  source?: string
}

export function FeatureCard({
  title, description, value, valueSuffix, target, status, explanation, source,
}: Props) {
  const [open, setOpen] = useState(false)
  const color = STATUS_COLORS[status]

  return (
    <div className="feature-card" style={{
      background: "#FFFFFF",
      border: "1px solid #E8E6E0",
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      padding: "14px 16px",
      transition: "background 150ms ease",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
        <div>
          <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 500, color: "#2C2A24", margin: "0 0 2px" }}>
            {title}
          </p>
          <p style={{ fontFamily: sans, fontSize: 11, color: "#9B9891", margin: 0 }}>
            {description}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontFamily: serif, fontSize: 24, fontWeight: 500, color: "#2C2A24" }}>
            {typeof value === "number" ? (value < 1 ? value.toFixed(3) : value < 10 ? value.toFixed(2) : value.toFixed(1)) : value}
            {valueSuffix && <span style={{ fontSize: 14, fontWeight: 400, color: "#9B9891" }}>{valueSuffix}</span>}
          </span>
          <div style={{ fontFamily: sans, fontSize: 10, color, fontWeight: 500, marginTop: 2 }}>
            Target: {target}
          </div>
        </div>
      </div>

      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontFamily: sans, fontSize: 11, fontWeight: 500, color: "#B8860B",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          marginTop: 8,
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

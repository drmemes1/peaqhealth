"use client"
import { useState } from "react"

export type Flag = "good" | "watch" | "attention" | "elevated" | "pending" | "not_tested"

const FLAG_STYLES: Record<Flag, { bg: string; text: string; label: string }> = {
  good:       { bg: "#EAF3DE", text: "#2D6A4F",          label: "Good" },
  watch:      { bg: "#FEF3C7", text: "#92400E",          label: "Watch" },
  attention:  { bg: "#FEF0E6", text: "#C2510A",          label: "Attention" },
  elevated:   { bg: "#FEECEC", text: "#C0392B",          label: "Elevated" },
  pending:    { bg: "var(--warm-50)", text: "var(--ink-60)",  label: "Pending" },
  not_tested: { bg: "var(--warm-50)", text: "var(--ink-30)", label: "—" },
}

interface MarkerRowProps {
  name: string
  sub: string
  value: number | string | null
  unit: string
  flag: Flag
  barPct: number  // 0–100
  color: string
  trackColor: string
  hoverBg: string
  mounted: boolean
}

export function MarkerRow({ name, sub, value, unit, flag, barPct, color, trackColor, hoverBg, mounted }: MarkerRowProps) {
  const [hovered, setHovered] = useState(false)
  const isNotTested = value === null || value === 0 || value === "0"
  const isPending = flag === "pending" || isNotTested
  const effectiveFlag = isNotTested && flag !== "pending" ? "not_tested" : flag
  const fs = FLAG_STYLES[effectiveFlag]

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 8px", margin: "0 -8px",
        borderRadius: 3,
        borderBottom: "0.5px solid var(--ink-06)",
        background: hovered ? hoverBg : "transparent",
        transition: "background 0.15s ease",
        opacity: isPending ? 0.5 : 1,
      }}
    >
      {/* Name + sub */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink)", margin: 0, fontStyle: isPending ? "italic" : "normal" }}>{name}</p>
        <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-60)", margin: "1px 0 0" }}>{sub}</p>
      </div>

      {/* Bar */}
      <div style={{ flex: 1, minWidth: 60 }}>
        <div style={{ height: 3, borderRadius: 2, background: trackColor, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: mounted ? `${barPct}%` : "0%",
            background: isPending ? "transparent" : color,
            borderRadius: 2, transition: "width 1.4s cubic-bezier(.16,1,.3,1) 400ms",
          }} />
        </div>
      </div>

      {/* Value + unit */}
      <div style={{ width: 80, textAlign: "right" }}>
        {isNotTested ? (
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-30)" }}>
            Not tested
          </span>
        ) : (
          <>
            <span style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 14,
              color: isPending ? "var(--ink-30)"
                : effectiveFlag === "good"      ? color
                : effectiveFlag === "elevated"  ? "#C0392B"
                : effectiveFlag === "attention" ? "#C2510A"
                : "#92400E",
            }}>
              {isPending ? "—" : typeof value === "number" ? (Math.round(value * 10) / 10) : value}
            </span>
            {!isPending && <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, color: "var(--ink-30)", marginLeft: 3 }}>{unit}</span>}
          </>
        )}
      </div>

      {/* Flag badge */}
      <div style={{ width: 70, textAlign: "right" }}>
        <span style={{
          fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
          fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em",
          padding: "3px 8px", borderRadius: 3,
          background: fs.bg, color: fs.text,
          transition: "transform 0.15s ease",
          display: "inline-block",
          transform: hovered ? "scale(1.05)" : "scale(1)",
        }}>
          {fs.label}
        </span>
      </div>
    </div>
  )
}

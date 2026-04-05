"use client"

import { useState } from "react"
import { RangeTrack } from "./range-track"

const sans = "-apple-system, BlinkMacSystemFont, sans-serif"

const flagStyles: Record<
  string,
  { bg: string; text: string }
> = {
  good: { bg: "#EAF3DE", text: "#3B6D11" },
  watch: { bg: "#FEF3C7", text: "#92400E" },
  attention: { bg: "#FEF0E6", text: "#C2510A" },
  elevated: { bg: "#FEECEC", text: "#A32D2D" },
  pending: { bg: "var(--warm-50)", text: "var(--ink-60)" },
  not_tested: { bg: "var(--warm-50)", text: "var(--ink-30)" },
}

export interface BiomarkerRowProps {
  name: string
  value: number | null
  unit: string
  flag: "good" | "watch" | "attention" | "elevated" | "pending" | "not_tested"
  zones: Array<{ label: string; color: string; min: number; max: number }> | null
  panelColor: string
  optimal?: string
  info?: {
    measures: string
    whyPeaq: string
    optimalRange: string
    yourValue: string
    trend?: string
  }
  animDelay?: number
}

export function BiomarkerRow({
  name,
  value,
  unit,
  flag,
  zones,
  panelColor,
  optimal,
  info,
  animDelay = 0,
}: BiomarkerRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [rowHovered, setRowHovered] = useState(false)
  const [infoBtnHovered, setInfoBtnHovered] = useState(false)

  const flagStyle = flagStyles[flag] || flagStyles.not_tested
  const isEmpty = value === null || value === 0

  const formattedValue = isEmpty
    ? "\u2014"
    : Number.isInteger(value)
      ? String(value)
      : value.toFixed(1)

  const flagLabel = flag === "not_tested" ? "NOT TESTED" : flag.toUpperCase()

  return (
    <div>
      {/* Main row */}
      <div
        onMouseEnter={() => setRowHovered(true)}
        onMouseLeave={() => setRowHovered(false)}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 56px 74px 78px",
          alignItems: "center",
          padding: "10px 24px",
          borderBottom: "0.5px solid rgba(0,0,0,0.03)",
          background: rowHovered ? "rgba(0,0,0,0.013)" : "transparent",
          transition: "background 80ms ease",
        }}
      >
        {/* Column 1: Name + info button */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              fontSize: 12,
              fontFamily: sans,
              color: "var(--ink, #1a1a18)",
            }}
          >
            {name}
          </span>
          {info && (
            <button
              onClick={() => setExpanded((p) => !p)}
              onMouseEnter={() => setInfoBtnHovered(true)}
              onMouseLeave={() => setInfoBtnHovered(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: `0.5px solid ${infoBtnHovered ? "#C49A3C" : "#bbb"}`,
                color: infoBtnHovered ? "#C49A3C" : "#bbb",
                fontSize: 10,
                fontFamily: sans,
                background: "none",
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
                transition: "border-color 150ms, color 150ms",
                flexShrink: 0,
              }}
              aria-label={`Info about ${name}`}
            >
              i
            </button>
          )}
        </div>

        {/* Column 2: Value */}
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: isEmpty ? "#bbb" : "#1a1a18",
              fontFamily: sans,
            }}
          >
            {formattedValue}
          </div>
          {!isEmpty && (
            <div
              style={{
                fontSize: 10,
                color: "#bbb",
                fontFamily: sans,
              }}
            >
              {unit}
            </div>
          )}
        </div>

        {/* Column 3: Range track */}
        <div>
          {zones && !isEmpty ? (
            <RangeTrack
              zones={zones}
              value={value}
              panelColor={panelColor}
              unit={unit}
              animate
              delay={animDelay}
            />
          ) : (
            <div
              style={{
                height: 6,
                background: "rgba(0,0,0,0.04)",
                borderRadius: 3,
              }}
            />
          )}
        </div>

        {/* Column 4: Status badge */}
        <div>
          <span
            style={{
              display: "inline-block",
              padding: "3px 8px",
              borderRadius: 3,
              fontSize: 9,
              textTransform: "uppercase",
              fontFamily: sans,
              letterSpacing: 0.3,
              background: flagStyle.bg,
              color: flagStyle.text,
            }}
          >
            {flagLabel}
          </span>
        </div>
      </div>

      {/* Info expand panel */}
      <div
        style={{
          maxHeight: expanded ? 200 : 0,
          opacity: expanded ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 200ms ease, opacity 200ms ease",
        }}
      >
        {info && (
          <div
            style={{
              margin: "0 24px 4px",
              border: "0.5px solid rgba(0,0,0,0.06)",
              borderRadius: 8,
              padding: "12px 16px",
              background: "white",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#555",
                lineHeight: 1.55,
                fontFamily: sans,
              }}
            >
              <strong>What this measures:</strong> {info.measures}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#555",
                lineHeight: 1.55,
                marginTop: 6,
                fontFamily: sans,
              }}
            >
              <strong>Why Peaq tests for it:</strong> {info.whyPeaq}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "#bbb",
                marginTop: 8,
                fontFamily: sans,
              }}
            >
              Optimal range: {info.optimalRange}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "#bbb",
                fontFamily: sans,
              }}
            >
              Your value: {info.yourValue}
            </div>
            {info.trend && (
              <div
                style={{
                  fontSize: 10,
                  color: "#bbb",
                  fontFamily: sans,
                }}
              >
                Trend: {info.trend}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

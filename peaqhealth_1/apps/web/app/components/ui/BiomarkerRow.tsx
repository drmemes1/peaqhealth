import React from "react"
import { StatusBadge, type Status } from "./StatusBadge"

interface BiomarkerRowProps {
  label: string
  sublabel: string
  value: number | string
  unit: string
  status: Status
  barPosition: number // 0-100
  barDirection?: "asc" | "desc"
  zoneLabels?: [string, string, string, string]
  even?: boolean
}

const ZONE_COLORS_ASC = ["#FCEBEB", "#FAEEDA", "#E1F5EE", "#EAF3DE"]
const ZONE_COLORS_DESC = ["#EAF3DE", "#E1F5EE", "#FAEEDA", "#FCEBEB"]
const DEFAULT_LABELS_ASC: [string, string, string, string] = ["Low", "Watch", "Good", "Optimal"]
const DEFAULT_LABELS_DESC: [string, string, string, string] = ["Optimal", "Good", "Watch", "High"]

export function BiomarkerRow({
  label, sublabel, value, unit, status, barPosition, barDirection = "asc", zoneLabels, even = false,
}: BiomarkerRowProps) {
  const zones = barDirection === "asc" ? ZONE_COLORS_ASC : ZONE_COLORS_DESC
  const labels = zoneLabels ?? (barDirection === "asc" ? DEFAULT_LABELS_ASC : DEFAULT_LABELS_DESC)
  const clampedPos = Math.max(0, Math.min(100, barPosition))

  return (
    <div style={{
      padding: "var(--spacing-inset) 16px",
      background: even ? "var(--peaq-bg-secondary, #F0EFE8)" : "transparent",
    }}>
      {/* Top row: label + value + badge */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
      }}>
        <div>
          <span style={{
            fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--peaq-ink, #141410)",
            display: "block",
            lineHeight: 1.3,
          }}>
            {label}
          </span>
          <span style={{
            fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
            fontSize: 11,
            color: "var(--peaq-ink-tertiary, #888780)",
            display: "block",
            marginTop: 2,
          }}>
            {sublabel}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--peaq-ink, #141410)",
            }}>
              {typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
            </span>
            <span style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
              fontSize: 11,
              color: "var(--peaq-ink-tertiary, #888780)",
            }}>
              {unit}
            </span>
          </span>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Zone bar */}
      <div style={{
        position: "relative",
        height: 6,
        borderRadius: 3,
        display: "flex",
        overflow: "hidden",
        marginBottom: 6,
      }}>
        {zones.map((color, i) => (
          <div key={i} style={{ flex: 1, background: color }} />
        ))}
        {/* Dot indicator */}
        <div style={{
          position: "absolute",
          left: `${clampedPos}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--peaq-ink, #141410)",
          border: "2px solid var(--peaq-bg-card, #fff)",
          boxShadow: "0 0 0 0.5px rgba(20,20,16,0.15)",
        }} />
      </div>

      {/* Zone labels */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
      }}>
        {labels.map((lbl, i) => (
          <span key={i} style={{
            fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
            fontSize: 10,
            color: "var(--peaq-ink-tertiary, #888780)",
          }}>
            {lbl}
          </span>
        ))}
      </div>
    </div>
  )
}

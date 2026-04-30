"use client"

import Link from "next/link"
import type { MarkerDefinition, Verdict } from "../../../../lib/markers/registry"
import { computeScalePosition } from "../../../../lib/markers/registry"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const STATUS_COLORS: Record<string, string> = {
  good: "#1A8C4E", watch: "#B8860B", concern: "#A84D4D", recheck: "#9B8B6E", pending: "#C8C6BE",
}
const STATUS_LABELS: Record<string, string> = {
  good: "Good", watch: "Watch", concern: "Attention", recheck: "Recheck", pending: "Not tested",
}

export function MarkerTile({ marker, value, verdict, href, subtitle }: {
  marker: MarkerDefinition
  value: number | null
  verdict: Verdict
  href?: string
  subtitle?: string
}) {
  const color = STATUS_COLORS[verdict] ?? "#C8C6BE"
  const hasValue = value != null
  const scalePos = computeScalePosition(value, marker)
  const linkHref = href ?? `/dashboard/panels/${marker.panel}/markers/${marker.id}`

  const formatValue = (v: number) => v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : Math.round(v).toString()

  return (
    <Link
      href={linkHref}
      style={{
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        height: 120, padding: "14px 16px",
        background: hasValue ? "#FAFAF8" : "#F7F6F2",
        border: "1px solid #D6D3C8", borderLeft: `3px solid ${color}`,
        borderRadius: 8, textDecoration: "none",
        transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
        opacity: hasValue ? 1 : 0.7,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(20,20,16,0.08)"; e.currentTarget.style.borderColor = "#B8AA88"; e.currentTarget.style.borderLeftColor = color }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#D6D3C8"; e.currentTarget.style.borderLeftColor = color }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: hasValue ? "#2C2A24" : "#8C897F" }}>
          {marker.shortLabel ?? marker.label}
        </span>
        <span style={{
          fontFamily: sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase",
          color, display: "flex", alignItems: "center", gap: 3,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
          {STATUS_LABELS[verdict] ?? verdict}
        </span>
      </div>

      <div>
        <span style={{ fontFamily: serif, fontSize: 28, fontWeight: 500, color: hasValue ? "#2C2A24" : "#B8B4AA", lineHeight: 1 }}>
          {hasValue ? formatValue(value) : "—"}
        </span>
        {hasValue && marker.unit && <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 400, color: "#8C897F", marginLeft: 2 }}>{marker.unit}</span>}
        {subtitle && <div style={{ fontFamily: sans, fontSize: 9, color: "#9B9891", marginTop: 2 }}>{subtitle}</div>}
      </div>

      {hasValue && scalePos != null ? (
        <div style={{ position: "relative", height: 3, background: "#E8E4D8", borderRadius: 2 }}>
          <div style={{ position: "absolute", top: -1, left: `${scalePos}%`, width: 2, height: 5, borderRadius: 1, background: "#2C2A24", transform: "translateX(-1px)" }} />
        </div>
      ) : (
        <div style={{ height: 3 }} />
      )}
    </Link>
  )
}

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

export const SLEEP_ZONES: Record<string, {
  zones: { label: string; color: string; min: number; max: number }[]
  markerColor: string
}> = {
  deep: {
    markerColor: '#4A7FB5',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 0,  max: 10 },
      { label: 'Watch',   color: '#FFE0B2', min: 10, max: 17 },
      { label: 'Good',    color: '#FFF3CD', min: 17, max: 22 },
      { label: 'Optimal', color: '#D4EDDA', min: 22, max: 35 },
    ]
  },
  hrv: {
    markerColor: '#4A7FB5',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 0,  max: 20  },
      { label: 'Watch',   color: '#FFE0B2', min: 20, max: 40  },
      { label: 'Good',    color: '#FFF3CD', min: 40, max: 60  },
      { label: 'Optimal', color: '#D4EDDA', min: 60, max: 120 },
    ]
  },
  spo2Avg: {
    markerColor: '#4A7FB5',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 85, max: 90 },
      { label: 'Watch',   color: '#FFE0B2', min: 90, max: 94 },
      { label: 'Good',    color: '#FFF3CD', min: 94, max: 96 },
      { label: 'Optimal', color: '#D4EDDA', min: 96, max: 100 },
    ]
  },
  rem: {
    markerColor: '#4A7FB5',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 0,  max: 12 },
      { label: 'Watch',   color: '#FFE0B2', min: 12, max: 18 },
      { label: 'Good',    color: '#FFF3CD', min: 18, max: 25 },
      { label: 'Optimal', color: '#D4EDDA', min: 25, max: 35 },
    ]
  },
  efficiency: {
    markerColor: '#4A7FB5',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 60, max: 70 },
      { label: 'Watch',   color: '#FFE0B2', min: 70, max: 78 },
      { label: 'Good',    color: '#FFF3CD', min: 78, max: 85 },
      { label: 'Optimal', color: '#D4EDDA', min: 85, max: 100 },
    ]
  },
}

interface MarkerRowProps {
  name: string
  sub: string
  value: number | string | null
  unit: string
  flag: Flag
  barPct: number  // 0–100, used when zoneKey is absent
  color: string
  trackColor: string
  hoverBg: string
  mounted: boolean
  zoneKey?: string  // when provided, renders zone bar instead of progress bar
  infoKey?: string
  expandedKey?: string | null
  onInfoToggle?: (key: string) => void
  infoContent?: { explanation: string; source: string }
}

export function MarkerRow({ name, sub, value, unit, flag, barPct, color, trackColor, hoverBg, mounted, zoneKey, infoKey, expandedKey, onInfoToggle, infoContent }: MarkerRowProps) {
  const [hovered, setHovered] = useState(false)
  const isNotTested = value === null || value === 0 || value === "0"
  const isPending = flag === "pending" || isNotTested
  const effectiveFlag = isNotTested && flag !== "pending" ? "not_tested" : flag
  const fs = FLAG_STYLES[effectiveFlag]
  const isExpanded = infoKey != null && expandedKey === infoKey

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 8px", margin: "0 -8px",
          borderRadius: 3,
          borderBottom: isExpanded ? "none" : "0.5px solid var(--ink-06)",
          background: hovered ? hoverBg : "transparent",
          transition: "background 0.15s ease",
          opacity: isPending ? 0.5 : 1,
        }}
      >
        {/* Name + sub + info button */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink)", margin: 0, fontStyle: isPending ? "italic" : "normal" }}>{name}</p>
            {infoContent && infoKey && (
              <button
                onClick={(e) => { e.stopPropagation(); onInfoToggle?.(infoKey) }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: isExpanded ? "var(--ink-60)" : "var(--ink-20)",
                  fontSize: 13, padding: "0 2px", lineHeight: 1, flexShrink: 0,
                  transition: "color 0.15s ease",
                }}
              >
                ⓘ
              </button>
            )}
          </div>
          <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-60)", margin: "1px 0 0" }}>{sub}</p>
        </div>

        {/* Bar — zone bar when zoneKey provided, else progress bar */}
        <div style={{ flex: 1, minWidth: 60 }}>
          {zoneKey && !isPending && typeof value === 'number' && (() => {
            const config = SLEEP_ZONES[zoneKey]
            if (!config) return (
              <div style={{ height: 3, borderRadius: 2, background: trackColor, overflow: "hidden" }}>
                <div style={{ height: "100%", width: mounted ? `${barPct}%` : "0%", background: color, borderRadius: 2, transition: "width 1.4s cubic-bezier(.16,1,.3,1) 400ms" }} />
              </div>
            )
            const zones = config.zones
            const totalMin = zones[0].min
            const totalMax = zones[zones.length - 1].max
            const totalRange = totalMax - totalMin
            const clampedValue = Math.max(totalMin, Math.min(totalMax, value))
            const markerPct = ((clampedValue - totalMin) / totalRange) * 100
            const zonePcts = zones.map(z => ((z.max - z.min) / totalRange) * 100)
            return (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', height: '7px', borderRadius: '4px', overflow: 'hidden', gap: '1px' }}>
                  {zones.map((zone, i) => (
                    <div key={i} style={{
                      flex: `0 0 ${zonePcts[i]}%`,
                      background: zone.color,
                      borderRadius: i === 0 ? '4px 0 0 4px' : i === zones.length - 1 ? '0 4px 4px 0' : '0',
                    }} />
                  ))}
                </div>
                <div style={{
                  position: 'absolute', top: '50%', left: `${markerPct}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '11px', height: '11px', borderRadius: '50%',
                  background: config.markerColor,
                  border: '2px solid white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  zIndex: 2,
                }} />
                <div style={{ display: 'flex', marginTop: '3px', gap: '1px' }}>
                  {zones.map((zone, i) => (
                    <div key={i} style={{
                      flex: `0 0 ${zonePcts[i]}%`,
                      fontSize: '8px', color: 'var(--ink-30)', textAlign: 'center' as const,
                      letterSpacing: '0.04em', textTransform: 'uppercase' as const,
                      overflow: 'hidden', whiteSpace: 'nowrap' as const,
                    }}>
                      {zone.label}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
          {(!zoneKey || isPending || typeof value !== 'number') && (
            <div style={{ height: 3, borderRadius: 2, background: trackColor, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: mounted ? `${barPct}%` : "0%",
                background: isPending ? "transparent" : color,
                borderRadius: 2, transition: "width 1.4s cubic-bezier(.16,1,.3,1) 400ms",
              }} />
            </div>
          )}
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

      {/* Expandable info drawer */}
      {isExpanded && infoContent && (
        <div style={{
          margin: "0 0 0 0",
          padding: "12px 14px",
          background: "var(--ink-04)",
          borderRadius: 8,
          borderLeft: `3px solid ${color}`,
          borderBottom: "0.5px solid var(--ink-06)",
          marginBottom: 2,
        }}>
          <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink-60)", lineHeight: 1.65, margin: "0 0 8px" }}>
            {infoContent.explanation}
          </p>
          <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-30)", fontStyle: "italic", margin: 0 }}>
            Source: {infoContent.source}
          </p>
        </div>
      )}
    </div>
  )
}

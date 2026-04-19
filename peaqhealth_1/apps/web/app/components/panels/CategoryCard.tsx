"use client"

import { useState, type ReactNode } from "react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const STATUS_COLORS = {
  good: "#1A8C4E", watch: "#B8860B", concern: "#A84D4D",
  info: "rgba(184,134,11,0.6)", mixed: "#B8860B", pending: "#C8C6BE",
} as const

const ICON_BG = {
  good: "rgba(26,140,78,0.1)", watch: "rgba(184,134,11,0.1)", concern: "rgba(168,77,77,0.1)",
  mixed: "rgba(184,134,11,0.08)", info: "rgba(184,134,11,0.06)", pending: "rgba(200,198,190,0.3)",
} as const

const PILL = { good: "Good", watch: "Watch", concern: "Watch closely", mixed: "Mixed signals", info: "Info", pending: "Waiting on sample" }

type Status = keyof typeof STATUS_COLORS

interface SpeciesItem { name: string; value: number; unit?: string; status: "good" | "watch" | "concern" }

interface CategoryCardProps {
  icon: ReactNode
  name: string
  description: string
  value: number | string | null
  unit?: string
  status: Status
  statusLabel?: string
  narrative?: { paragraph: string; pullquotes?: string[]; source?: string; meta?: string[] }
  species?: SpeciesItem[]
}

function renderPullquotes(text: string, pullquotes?: string[]): ReactNode {
  if (!pullquotes || pullquotes.length === 0) return text
  const parts: ReactNode[] = []
  let remaining = text
  let key = 0
  for (const pq of pullquotes) {
    const idx = remaining.indexOf(pq)
    if (idx === -1) continue
    if (idx > 0) parts.push(remaining.slice(0, idx))
    parts.push(<span key={key++} style={{ color: "#B8860B", fontWeight: 500 }}>{pq}</span>)
    remaining = remaining.slice(idx + pq.length)
  }
  if (remaining) parts.push(remaining)
  return <>{parts}</>
}

export function CategoryCard({ icon, name, description, value, unit, status, statusLabel, narrative, species }: CategoryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showSpecies, setShowSpecies] = useState(false)
  const color = STATUS_COLORS[status]
  const pill = statusLabel ?? PILL[status]
  const isPending = value == null || status === "pending"

  return (
    <div style={{
      background: "#FAFAF8", border: "1px solid #D6D3C8", borderLeft: `3px solid ${color}`,
      borderRadius: 10, transition: "background 0.25s ease, border-color 0.25s ease",
    }}
    onMouseEnter={e => { e.currentTarget.style.background = "#FFFEFB"; e.currentTarget.style.borderColor = "#B8AA88"; e.currentTarget.style.borderLeftColor = color }}
    onMouseLeave={e => { e.currentTarget.style.background = "#FAFAF8"; e.currentTarget.style.borderColor = "#D6D3C8"; e.currentTarget.style.borderLeftColor = color }}
    >
      {/* Layer 1 — Summary row */}
      <button
        onClick={() => setExpanded(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 14, width: "100%",
          padding: "18px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 8, background: ICON_BG[status], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 500, color: "#2C2A24", marginBottom: 2 }}>{name}</div>
          <div style={{ fontFamily: sans, fontSize: 11, color: "#8C897F" }}>{description}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {isPending ? (
            <div style={{ fontFamily: serif, fontSize: 18, fontStyle: "italic", color: "#8C897F" }}>—</div>
          ) : (
            <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 500, color: "#2C2A24", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {typeof value === "number" ? (value < 1 ? value.toFixed(2) : value < 10 ? value.toFixed(1) : Math.round(value)) : value}
              {unit && <span style={{ fontSize: 16, fontWeight: 400, color: "#8C897F", marginLeft: 2 }}>{unit}</span>}
            </div>
          )}
          <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
            {pill}
            <span style={{ fontSize: 8, transition: "transform 0.25s", transform: expanded ? "rotate(180deg)" : "none" }}>▼</span>
          </div>
        </div>
      </button>

      {/* Layer 2 — Narrative */}
      <div style={{ maxHeight: expanded ? 600 : 0, overflow: "hidden", transition: "max-height 0.35s ease" }}>
        {narrative && (
          <div style={{ padding: "0 20px 16px", borderTop: "1px solid #E8E4D8" }}>
            <p style={{ fontFamily: serif, fontSize: 14, fontStyle: "italic", color: "#5C5A54", lineHeight: 1.65, margin: "16px 0 0" }}>
              {renderPullquotes(narrative.paragraph, narrative.pullquotes)}
            </p>
            {narrative.source && (
              <p style={{ fontFamily: sans, fontSize: 10, color: "#8C897F", margin: "8px 0 0", fontStyle: "italic" }}>{narrative.source}</p>
            )}
            {narrative.meta && (
              <p style={{ fontFamily: sans, fontSize: 10, color: "#8C897F", margin: "6px 0 0" }}>{narrative.meta.join(" · ")}</p>
            )}
            {species && species.length > 0 && !showSpecies && (
              <button
                onClick={e => { e.stopPropagation(); setShowSpecies(true) }}
                style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, color: "#B8860B", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 12 }}
              >
                Show {species.length} species →
              </button>
            )}
          </div>
        )}

        {/* Layer 3 — Species breakdown */}
        {showSpecies && species && (
          <div style={{ padding: "0 20px 18px", borderTop: narrative ? undefined : "1px solid #E8E4D8" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, marginTop: narrative ? 0 : 16 }}>
              {species.map(sp => {
                const spColor = STATUS_COLORS[sp.status]
                return (
                  <div key={sp.name} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                    padding: "8px 12px", background: "#F5F3EE", borderRadius: 6, border: "1px solid #E8E4D8",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: spColor, flexShrink: 0 }} />
                      <span style={{ fontFamily: serif, fontSize: 12, fontStyle: "italic", color: "#5C5A54", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sp.name}</span>
                    </div>
                    <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, color: "#2C2A24", flexShrink: 0 }}>
                      {sp.value < 1 ? sp.value.toFixed(3) : sp.value.toFixed(2)}{sp.unit ?? "%"}
                    </span>
                  </div>
                )
              })}
            </div>
            <button
              onClick={e => { e.stopPropagation(); setShowSpecies(false) }}
              style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, color: "#8C897F", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 10 }}
            >
              Hide species ↑
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

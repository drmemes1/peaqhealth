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

export interface SpeciesItem { name: string; value: number; unit?: string; status: "good" | "watch" | "concern"; target?: string }

export interface CategoryCardProps {
  icon: ReactNode
  name: string
  description: string
  value: number | string | null
  unit?: string
  status: Status
  statusLabel?: string
  contextStrip?: string
  narrative?: { paragraph: string; pullquotes?: string[]; source?: string; meta?: string[] }
  species?: SpeciesItem[]
  expandedContent?: ReactNode
  dataShows?: string
  crossPanel?: string
  expanded?: boolean
  onToggle?: () => void
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

function SpeciesName({ name }: { name: string }) {
  const isBinomial = name.includes(" ") || name.includes(".")
  return (
    <span style={{
      fontFamily: serif, fontSize: 12,
      fontStyle: isBinomial ? "italic" : "normal",
      fontWeight: isBinomial ? 400 : 500,
      color: isBinomial ? "#5C5A54" : "#3D3B35",
    }}>
      {name}
    </span>
  )
}

export function CategoryCard({ icon, name, description, value, unit, status, statusLabel, contextStrip, narrative, species, expandedContent, dataShows, crossPanel, expanded: controlledExpanded, onToggle }: CategoryCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const expanded = controlledExpanded ?? internalExpanded
  const toggle = onToggle ?? (() => setInternalExpanded(o => !o))

  const color = STATUS_COLORS[status]
  const pill = statusLabel ?? PILL[status]
  const isPending = value == null || status === "pending"

  return (
    <div style={{
      background: "#FAFAF8", border: "1px solid #D6D3C8", borderLeft: `3px solid ${color}`,
      borderRadius: 10, transition: "background 0.25s ease, border-color 0.25s ease",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}
    onMouseEnter={e => { if (!expanded) { e.currentTarget.style.background = "#FFFEFB"; e.currentTarget.style.borderColor = "#B8AA88"; e.currentTarget.style.borderLeftColor = color } }}
    onMouseLeave={e => { e.currentTarget.style.background = "#FAFAF8"; e.currentTarget.style.borderColor = "#D6D3C8"; e.currentTarget.style.borderLeftColor = color }}
    >
      {/* Tier 1 — Header/summary */}
      <button
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center", gap: 14, width: "100%",
          padding: "18px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 8, background: ICON_BG[status], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, color: "#2C2A24", letterSpacing: "-0.01em", marginBottom: 2 }}>{name}</div>
          <div style={{ fontFamily: sans, fontSize: 12, color: "#7A7870" }}>{description}</div>
          {contextStrip && (
            <div style={{ fontFamily: sans, fontSize: 11, color: "#B8860B", letterSpacing: "0.02em", marginTop: 3 }}>{contextStrip}</div>
          )}
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

      {/* Expanded tiers */}
      <div style={{ maxHeight: expanded ? 2000 : 0, overflow: "hidden", transition: "max-height 0.4s ease" }}>

        {/* Tier 2 — Narrative */}
        {narrative && (
          <div style={{ background: "#F5F3EE", padding: "18px 22px", borderTop: "1px solid #E8E4D8", borderBottom: "1px solid #E8E4D8" }}>
            <p style={{ fontFamily: serif, fontSize: 15, color: "#3D3B35", lineHeight: 1.65, margin: 0 }}>
              {renderPullquotes(narrative.paragraph, narrative.pullquotes)}
            </p>
            {narrative.source && (
              <p style={{ fontFamily: sans, fontSize: 10, color: "#8C897F", margin: "8px 0 0" }}>{narrative.source}</p>
            )}
            {narrative.meta && (
              <p style={{ fontFamily: sans, fontSize: 10, color: "#8C897F", margin: "6px 0 0" }}>{narrative.meta.join(" · ")}</p>
            )}
          </div>
        )}

        {/* Tier 3 — Data shows + Cross-panel */}
        {(dataShows || crossPanel) && (
          <div style={{ background: "#FAFAF8", padding: "18px 22px", borderBottom: "1px solid #E8E4D8" }}>
            {dataShows && (
              <div>
                <div style={{ fontFamily: sans, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#B8860B", marginBottom: 6 }}>What your data shows</div>
                <p style={{ fontFamily: sans, fontSize: 13, color: "#5C5A54", lineHeight: 1.6, margin: 0 }}>{dataShows}</p>
              </div>
            )}
            {crossPanel && (
              <div style={{ marginTop: dataShows ? 16 : 0 }}>
                <div style={{ fontFamily: sans, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#B8860B", marginBottom: 6 }}>Why this matters for you</div>
                <p style={{ fontFamily: sans, fontSize: 13, color: "#5C5A54", lineHeight: 1.6, margin: 0 }}>{crossPanel}</p>
              </div>
            )}
          </div>
        )}

        {/* Tier 4 — Custom expanded content (env index grid, pattern card) */}
        {expandedContent && (
          <div style={{ borderBottom: species ? "1px solid #E8E4D8" : undefined }}>
            {expandedContent}
          </div>
        )}

        {/* Tier 5 — Species/Marker breakdown */}
        {species && species.length > 0 && (
          <div style={{ background: "#FAFAF8", padding: "20px 22px", borderTop: expandedContent ? undefined : "1px solid #E8E4D8" }}>
            <div style={{ fontFamily: sans, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#B8860B", marginBottom: 10 }}>Detail breakdown</div>
            <div className="species-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {species.map(sp => {
                const spColor = STATUS_COLORS[sp.status]
                return (
                  <div key={sp.name} style={{
                    padding: "10px 12px", background: "#F5F3EE", borderRadius: 8, border: "1px solid #E8E4D8",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: spColor, flexShrink: 0 }} />
                      <SpeciesName name={sp.name} />
                    </div>
                    <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, color: "#2C2A24", lineHeight: 1 }}>
                      {sp.value < 1 ? sp.value.toFixed(3) : sp.value.toFixed(2)}{sp.unit ?? "%"}
                    </div>
                    {sp.target && (
                      <div style={{ fontFamily: sans, fontSize: 10, color: "#B8860B", marginTop: 3 }}>Target: {sp.target}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

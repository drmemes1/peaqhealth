// ============================================================================
// BLOOD PANEL — 2-COLUMN GRID, CLICKABLE MARKERS, AI INSIGHTS
// ============================================================================
"use client"

import { useState, type ReactNode } from "react"
import { SectionHeader } from "../../components/panels"
import { BLOOD_CATEGORIES, getCategoryStatus } from "../../../lib/blood/categories"
import { MARKERS } from "../../../lib/blood/marker-content"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
const STATUS_COLORS = { good: "#1A8C4E", watch: "#B8860B", concern: "#A84D4D", info: "rgba(184,134,11,0.6)", mixed: "#B8860B", pending: "#C8C6BE" } as const

function MarkerChip({ name, dbKey, value, unit, status, role }: {
  name: string; dbKey: string; value: number | null; unit: string; status: "good" | "watch" | "concern" | "pending"; role: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [insight, setInsight] = useState<{ content: string; pullquotes: string[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const color = STATUS_COLORS[status]
  const hasValue = value != null

  async function loadInsight() {
    if (insight) return
    setLoading(true)
    try {
      const res = await fetch("/api/blood/marker-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marker_key: dbKey, marker_name: name }),
      })
      if (res.ok) {
        const data = await res.json() as { content: string; pullquotes: string[] }
        if (data.content) setInsight(data)
      }
    } catch { /* silent */ }
    setLoading(false)
  }

  function handleClick() {
    setExpanded(o => !o)
    if (!expanded && !insight) loadInsight()
  }

  return (
    <div style={{
      background: "#FAFAF8", border: "1px solid #D6D3C8", borderLeft: `3px solid ${color}`,
      borderRadius: 8, overflow: "hidden", transition: "border-color 0.2s",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = "#B8AA88"; e.currentTarget.style.borderLeftColor = color }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "#D6D3C8"; e.currentTarget.style.borderLeftColor = color }}
    >
      <button onClick={handleClick} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
        padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 10,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: "#2C2A24", marginBottom: 2 }}>{name}</div>
          <div style={{ fontFamily: sans, fontSize: 10, color: "#8C897F" }}>{role.slice(0, 60)}{role.length > 60 ? "..." : ""}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, color: hasValue ? "#2C2A24" : "#8C897F", lineHeight: 1 }}>
            {hasValue ? (value < 1 ? value.toFixed(2) : value < 10 ? value.toFixed(1) : Math.round(value)) : "—"}
            {hasValue && <span style={{ fontSize: 12, fontWeight: 400, color: "#8C897F", marginLeft: 2 }}>{unit}</span>}
          </div>
          <div style={{ fontFamily: sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color, marginTop: 3, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
            {hasValue ? (status === "good" ? "Good" : status === "watch" ? "Watch" : "Watch closely") : "Not tested"}
            <span style={{ fontSize: 7, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>▼</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: "1px solid #E8E4D8", padding: "14px 16px", background: "#F5F3EE" }}>
          {loading ? (
            <p style={{ fontFamily: sans, fontSize: 12, color: "#8C897F", fontStyle: "italic", margin: 0 }}>Generating your personalized insight...</p>
          ) : insight ? (
            <p style={{ fontFamily: serif, fontSize: 14, fontStyle: "italic", color: "#5C5A54", lineHeight: 1.65, margin: 0 }}>
              {renderPullquotes(insight.content, insight.pullquotes)}
            </p>
          ) : (
            <p style={{ fontFamily: sans, fontSize: 12, color: "#7A7870", lineHeight: 1.55, margin: 0 }}>
              {hasValue ? role : `This marker measures ${role.toLowerCase()} It wasn't on your most recent panel. Tap to learn whether it might be worth adding.`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function renderPullquotes(text: string, pullquotes: string[]): ReactNode {
  if (!pullquotes.length) return text
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

export default function BloodPanelClient({ lab, hasOral, hasSleep }: {
  lab: Record<string, unknown> | null
  hasOral: boolean
  hasSleep: boolean
}) {
  if (!lab) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px", background: "#F5F3EE" }}>
        <SectionHeader title="Blood panel" subtitle="No blood results on file." />
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: 16 }}>
          <p style={{ fontFamily: sans, fontSize: 13, color: "#92400E", margin: 0 }}>Upload your lab results to populate this panel.</p>
        </div>
      </div>
    )
  }

  const data = lab as Record<string, number | null>

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 24px 80px", background: "#F5F3EE" }}>
      <SectionHeader title="What your blood data is showing" subtitle="Tap any marker to see what it means for you." />

      <div className="blood-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        {BLOOD_CATEGORIES.map(cat => {
          const status = getCategoryStatus(cat, data)
          const headlineVal = data[cat.headlineMarker]
          const headlineMarker = MARKERS[cat.headlineMarker]
          const populatedCount = cat.markerKeys.filter(k => data[k] != null).length
          const totalCount = cat.markerKeys.length

          return (
            <div key={cat.key} style={{
              background: "#FAFAF8", border: "1px solid #D6D3C8", borderRadius: 10,
              borderLeft: `3px solid ${STATUS_COLORS[status]}`, overflow: "hidden",
            }}>
              {/* Category header */}
              <div style={{ padding: "16px 18px", borderBottom: "1px solid #E8E4D8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, color: "#2C2A24", marginBottom: 2 }}>{cat.name}</div>
                    <div style={{ fontFamily: sans, fontSize: 11, color: "#8C897F" }}>{cat.description}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {headlineVal != null ? (
                      <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 500, color: "#2C2A24", lineHeight: 1 }}>
                        {Number(headlineVal) < 1 ? Number(headlineVal).toFixed(2) : Number(headlineVal) < 10 ? Number(headlineVal).toFixed(1) : Math.round(Number(headlineVal))}
                        {headlineMarker && <span style={{ fontSize: 14, color: "#8C897F", marginLeft: 2 }}>{headlineMarker.unit}</span>}
                      </div>
                    ) : (
                      <div style={{ fontFamily: serif, fontSize: 18, fontStyle: "italic", color: "#8C897F" }}>—</div>
                    )}
                    <div style={{ fontFamily: sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: STATUS_COLORS[status], marginTop: 3 }}>
                      {populatedCount}/{totalCount} markers
                    </div>
                  </div>
                </div>
                {headlineVal != null && (
                  <p style={{ fontFamily: sans, fontSize: 12, color: "#7A7870", lineHeight: 1.5, margin: "8px 0 0" }}>
                    {cat.narrative(data)}
                  </p>
                )}
              </div>

              {/* Marker list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {cat.markerKeys.map(k => {
                  const m = MARKERS[k]
                  if (!m) return null
                  const v = data[k] != null ? Number(data[k]) : null
                  let mStatus: "good" | "watch" | "concern" | "pending" = v == null ? "pending" : "good"
                  if (v != null && m.optimal) {
                    const { min, max } = m.optimal
                    if (min != null && max != null) mStatus = v >= min && v <= max ? "good" : "watch"
                    else if (max != null) mStatus = v <= max ? "good" : v <= max * 1.5 ? "watch" : "concern"
                    else if (min != null) mStatus = v >= min ? "good" : v >= min * 0.7 ? "watch" : "concern"
                  }
                  return (
                    <MarkerChip
                      key={k}
                      name={m.displayName}
                      dbKey={k}
                      value={v}
                      unit={m.unit}
                      status={mStatus}
                      role={m.role}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .blood-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

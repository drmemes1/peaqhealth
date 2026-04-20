// ============================================================================
// BLOOD PANEL — CATEGORY CARD LAYOUT (matches oral pattern)
// ============================================================================
"use client"

import { CategoryCard, SectionHeader, PanelInsight, FillInTheGapsHeader } from "../../components/panels"
import { BLOOD_CATEGORIES, getCategoryStatus } from "../../../lib/blood/categories"
import { MARKERS } from "../../../lib/blood/marker-content"
import { computeConvergeStrength } from "../../../lib/converge-strength"

const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
const STATUS_COLORS = { good: "#1A8C4E", watch: "#B8860B", concern: "#A84D4D", info: "rgba(184,134,11,0.6)", mixed: "#B8860B", pending: "#C8C6BE" } as const

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
  const panelCoverage = {
    oral: { percent: hasOral ? 100 : 0, status: (hasOral ? "complete" : "none") as "complete" | "partial" | "none" },
    blood: { percent: 80, status: "complete" as const },
    sleep: { percent: hasSleep ? 90 : 0, status: (hasSleep ? "complete" : "none") as "complete" | "partial" | "none" },
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px", background: "#F5F3EE" }}>
      <FillInTheGapsHeader panelCoverage={panelCoverage} convergeStrength={computeConvergeStrength(panelCoverage)} currentPanel="blood" />

      <SectionHeader title="What your blood data is showing" subtitle="Markers organized by what they measure." />

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        {BLOOD_CATEGORIES.map(cat => {
          const status = getCategoryStatus(cat, data)
          const headlineVal = data[cat.headlineMarker]
          const headlineMarker = MARKERS[cat.headlineMarker]
          const markers = cat.markerKeys
            .filter(k => MARKERS[k] && data[k] != null)
            .map(k => {
              const m = MARKERS[k]
              const v = Number(data[k])
              let mStatus: "good" | "watch" | "concern" = "good"
              if (m.optimal) {
                const { min, max } = m.optimal
                if (min != null && max != null) mStatus = v >= min && v <= max ? "good" : "watch"
                else if (max != null) mStatus = v <= max ? "good" : v <= max * 1.5 ? "watch" : "concern"
                else if (min != null) mStatus = v >= min ? "good" : v >= min * 0.7 ? "watch" : "concern"
              }
              return { name: m.displayName, value: v, unit: m.unit, status: mStatus }
            })

          return (
            <CategoryCard
              key={cat.key}
              icon={<span style={{ fontFamily: sans, fontSize: 16, fontWeight: 600, color: STATUS_COLORS[status] }}>{cat.name.charAt(0)}</span>}
              name={cat.name}
              description={cat.description}
              value={headlineVal != null ? Number(headlineVal) : null}
              unit={headlineMarker?.unit}
              status={status}
              statusLabel={status === "pending" ? "Not yet measured" : undefined}
              narrative={headlineVal != null ? {
                paragraph: cat.narrative(data),
                source: headlineMarker?.source,
              } : undefined}
              species={markers.length > 0 ? markers : undefined}
            />
          )
        })}
      </div>

      <SectionHeader title="Converge" subtitle="How your blood data connects to oral and sleep." />
      <PanelInsight panel="blood" />

      <style>{`@media (max-width: 768px) { .panel-grid-3 { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}

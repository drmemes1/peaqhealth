/**
 * Hero card for the marker detail page. Shows category eyebrow, marker
 * title, value + unit, status pill, and the distribution visualization.
 */
import { getMarkerById, type MarkerCategory } from "../../../lib/blood/markerRegistry"
import { getMarkerStatus } from "../../../lib/blood/status"
import { MarkerDistributionViz } from "./MarkerDistributionViz"

const CATEGORY_LABELS: Partial<Record<MarkerCategory, string>> = {
  lipids: "Heart & lipids",
  metabolic: "Metabolic",
  kidney: "Kidney",
  liver: "Liver",
  blood_count: "Complete blood count",
  immune: "White blood cells",
  electrolytes: "Electrolytes",
  hormones: "Hormones",
  thyroid: "Thyroid",
  nutrients: "Nutrients",
  stress_aging: "Stress & aging",
  inflammation: "Inflammation",
  advanced_lipids: "Advanced lipids",
  advanced_nutrients: "Omega & methylation",
  advanced_thyroid: "Thyroid antibodies",
  heavy_metals: "Heavy metals",
  male_health: "Prostate / male health",
  pancreas: "Pancreas",
}

export function MarkerHeroCard({
  markerId,
  value,
}: {
  markerId: string
  value: number | null
}) {
  const m = getMarkerById(markerId)
  if (!m) return null

  const status = getMarkerStatus(value, markerId)
  const categoryLabel = m.categories[0] ? CATEGORY_LABELS[m.categories[0]] ?? m.categories[0] : null

  const sans = "var(--font-body), 'Instrument Sans', sans-serif"
  const serif = "var(--font-display), 'Manrope', sans-serif"

  return (
    <div>
      {/* Eyebrow */}
      {categoryLabel && (
        <p
          style={{
            fontFamily: sans,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: "var(--gold, #B8860B)",
            margin: "0 0 8px",
          }}
        >
          {categoryLabel}
        </p>
      )}

      {/* Title */}
      <h1
        style={{
          fontFamily: serif,
          fontSize: 36,
          fontWeight: 400,
          color: "var(--ink, #141410)",
          margin: "0 0 28px",
          letterSpacing: "-0.025em",
          lineHeight: 1.15,
        }}
      >
        {m.displayName}
      </h1>

      {/* Hero card */}
      <div
        style={{
          background: "var(--paper, #FAFAF8)",
          border: "0.5px solid var(--ink-12, rgba(20,20,16,0.12))",
          borderRadius: 14,
          padding: "28px 28px 32px",
          boxShadow: "0 2px 6px rgba(20,20,16,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          {/* Value + unit */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: serif, fontSize: 56, fontWeight: 300, color: "var(--ink, #141410)", lineHeight: 1, letterSpacing: "-0.035em" }}>
              {value != null ? value : "—"}
            </span>
            <span style={{ fontFamily: sans, fontSize: 14, color: "var(--ink-50, rgba(20,20,16,0.5))" }}>{m.unit}</span>
          </div>

          {/* Status pill — dot + label, exact match to panel page (Strong / Watch / Attention). */}
          {status && (() => {
            const meta =
              status.pillColor === "green" ? { dot: "#4A7A4A", bg: "rgba(74,122,74,0.1)",  fg: "#3A6A3A", label: "Strong" }
              : status.pillColor === "amber" ? { dot: "#C4992E", bg: "rgba(196,153,46,0.12)", fg: "#946F1B", label: "Watch" }
              :                                 { dot: "#9B3838", bg: "rgba(155,56,56,0.1)",  fg: "#9B3838", label: "Attention" }
            return (
              <span
                style={{
                  fontFamily: sans,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  background: meta.bg,
                  color: meta.fg,
                  padding: "3px 9px",
                  borderRadius: 20,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.dot }} />
                {meta.label}
              </span>
            )
          })()}
        </div>

        {/* Distribution viz */}
        <MarkerDistributionViz markerId={markerId} value={value} />
      </div>
    </div>
  )
}

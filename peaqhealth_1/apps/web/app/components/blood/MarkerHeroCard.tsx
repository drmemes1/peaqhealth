/**
 * Marker detail-page hero — pixel-exact clone of PopulatedCard from
 * blood-panel-rebuild.tsx (the tile rendered on /dashboard/blood). Every
 * dimension, color, font size, and gap matches the panel tile so the
 * detail-page hero is the same visual element the user clicked from.
 */
import { getMarkerById, type MarkerCategory, type StatusBand } from "../../../lib/blood/markerRegistry"
import { getMarkerStatus, type PillColor } from "../../../lib/blood/status"
import { MarkerDistributionViz } from "./MarkerDistributionViz"

const CATEGORY_LABELS: Partial<Record<MarkerCategory, string>> = {
  lipids: "Heart",
  inflammation: "Heart",
  metabolic: "Metabolic",
  kidney: "Kidney",
  liver: "Liver",
  blood_count: "Blood cells",
  immune: "Immune",
  electrolytes: "Electrolytes",
  hormones: "Hormones",
  thyroid: "Thyroid",
  nutrients: "Nutrients",
  stress_aging: "Stress & aging",
  advanced_lipids: "Heart",
  advanced_nutrients: "Nutrients",
  advanced_thyroid: "Thyroid",
  heavy_metals: "Heavy metals",
  male_health: "Male health",
  pancreas: "Pancreas",
}

const STATUS_META: Record<PillColor, {
  dot: string; bg: string; border: string; bar: string;
  badgeBg: string; badgeText: string; label: string;
}> = {
  green: { dot: "#4A7A4A", bg: "#F7FAF4", border: "#C8D8C0", bar: "#4A7A4A", badgeBg: "rgba(74,122,74,0.1)",  badgeText: "#3A6A3A", label: "Strong" },
  amber: { dot: "#C4992E", bg: "#FDFAF1", border: "#E8D5A0", bar: "#C4992E", badgeBg: "rgba(196,153,46,0.12)", badgeText: "#946F1B", label: "Watch" },
  red:   { dot: "#9B3838", bg: "#FDF8F6", border: "#E5C4C4", bar: "#9B3838", badgeBg: "rgba(155,56,56,0.1)",  badgeText: "#9B3838", label: "Attention" },
}

const NEUTRAL = { dot: "#A8A59B", bg: "transparent", border: "rgba(20,20,16,0.12)", bar: "#C4C1B6", badgeBg: "rgba(168,165,155,0.1)", badgeText: "#8C897F", label: "Not tested" }

const SERIF = "var(--font-display), 'Manrope', sans-serif"
const SANS  = "var(--font-body), 'Instrument Sans', sans-serif"

function deltaLabel(value: number, bands: StatusBand[], pillColor: PillColor): { text: string; color: string } | null {
  if (pillColor === "green") return { text: "optimal", color: "#4A7A4A" }
  const targets = bands.filter(b => b.status === "target")
  if (targets.length === 0) return null
  const targetMin = Math.min(...targets.map(b => Number.isFinite(b.min) ? b.min : Number.NEGATIVE_INFINITY))
  const targetMax = Math.max(...targets.map(b => b.max ?? Number.POSITIVE_INFINITY))
  const below = Number.isFinite(targetMin) && value < targetMin
  const above = Number.isFinite(targetMax) && value > targetMax
  if (pillColor === "amber") {
    return below ? { text: "↓ borderline", color: "#C4992E" }
         : above ? { text: "↑ borderline", color: "#C4992E" }
         : null
  }
  return below ? { text: "↓ below range", color: "#9B3838" }
       : above ? { text: "↑ above range", color: "#9B3838" }
       : null
}

function formatValue(v: number): string {
  return v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : Math.round(v).toString()
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
  const meta = status ? STATUS_META[status.pillColor] : NEUTRAL
  const categoryLabel = m.categories[0] ? CATEGORY_LABELS[m.categories[0]] ?? m.categories[0] : null

  const delta = value != null && status && m.statusBands
    ? deltaLabel(value, m.statusBands, status.pillColor)
    : null

  return (
    <div
      style={{
        position: "relative",
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        borderRadius: 14,
        padding: "20px 22px",
        overflow: "hidden",
      }}
    >
      {/* Left accent stripe */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: meta.bar, opacity: 0.7, borderRadius: "14px 0 0 14px" }} />

      {/* Category + status row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: SERIF, fontSize: 12, fontStyle: "italic", color: "#A8A59B" }}>
          {categoryLabel}
        </span>
        <span style={{
          fontFamily: SANS, fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase",
          background: meta.badgeBg, color: meta.badgeText,
          padding: "3px 9px", borderRadius: 20,
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.dot }} />
          {meta.label}
        </span>
      </div>

      {/* Marker name */}
      <h1 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#2C2A24", margin: "0 0 12px", lineHeight: 1.2 }}>
        {m.displayName}
      </h1>

      {/* Value + delta row */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <span style={{ fontFamily: SERIF, fontSize: 46, fontWeight: 500, color: "#2C2A24", lineHeight: 1, letterSpacing: "-0.02em" }}>
            {value != null ? formatValue(value) : "—"}
          </span>
          <span style={{ fontFamily: SERIF, fontSize: 18, fontStyle: "italic", color: "#8C897F", marginLeft: 4 }}>{m.unit}</span>
        </div>
        {delta && (
          <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500, color: delta.color }}>{delta.text}</span>
        )}
      </div>

      {/* Range bar + scale labels */}
      <MarkerDistributionViz markerId={markerId} value={value} />
    </div>
  )
}

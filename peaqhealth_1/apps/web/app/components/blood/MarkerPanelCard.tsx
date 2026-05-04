/**
 * MarkerPanelCard — single source of truth for the panel tile/card visual.
 * Used by both /dashboard/blood (panel grid) and /dashboard/blood/[marker]
 * (detail hero). Pixel-identical output for any given marker id, so every
 * marker renders the same tile on both pages.
 *
 * Data resolution:
 *   1. registry.statusBands target band(s) → derive optimal {min, max}
 *   2. MARKERS[markerId].optimal as fallback (15 curated markers)
 *   3. No optimal → tile shows category + name + value + pill, no bar
 */
import Link from "next/link"
import {
  getMarkerById,
  type MarkerCategory,
  type StatusBand,
} from "../../../lib/blood/markerRegistry"
import { MARKERS } from "../../../lib/blood/marker-content"

type Status = "attention" | "watch" | "strong" | "not_tested"

const SERIF = "var(--font-display), 'Manrope', sans-serif"
const SANS  = "var(--font-body), 'Instrument Sans', sans-serif"

const STATUS_META: Record<Status, {
  dot: string; bg: string; border: string; bar: string;
  badgeBg: string; badgeText: string; label: string;
}> = {
  attention: { dot: "#9B3838", bg: "#FDF8F6",     border: "#E5C4C4",            bar: "#9B3838", badgeBg: "rgba(155,56,56,0.1)",   badgeText: "#9B3838", label: "Attention" },
  watch:     { dot: "#C4992E", bg: "#FDFAF1",     border: "#E8D5A0",            bar: "#C4992E", badgeBg: "rgba(196,153,46,0.12)", badgeText: "#946F1B", label: "Watch" },
  strong:    { dot: "#4A7A4A", bg: "#F7FAF4",     border: "#C8D8C0",            bar: "#4A7A4A", badgeBg: "rgba(74,122,74,0.1)",   badgeText: "#3A6A3A", label: "Strong" },
  not_tested:{ dot: "#A8A59B", bg: "transparent", border: "rgba(20,20,16,0.12)", bar: "#C4C1B6", badgeBg: "rgba(168,165,155,0.1)", badgeText: "#8C897F", label: "Not tested" },
}

const CATEGORY_LABELS: Partial<Record<MarkerCategory, string>> = {
  lipids: "Heart",
  inflammation: "Heart",
  advanced_lipids: "Heart",
  metabolic: "Metabolic",
  kidney: "Kidney",
  liver: "Liver",
  blood_count: "Blood cells",
  immune: "Immune",
  electrolytes: "Electrolytes",
  hormones: "Hormones",
  thyroid: "Thyroid",
  advanced_thyroid: "Thyroid",
  nutrients: "Nutrients",
  advanced_nutrients: "Nutrients",
  stress_aging: "Stress & aging",
  heavy_metals: "Heavy metals",
  male_health: "Male health",
  pancreas: "Pancreas",
}

interface Optimal { min?: number; max?: number }

function optimalFromBands(bands: StatusBand[]): Optimal | null {
  const targets = bands.filter(b => b.status === "target")
  if (targets.length === 0) return null

  // Open-ended above (any target band with max === null) → higher-is-better,
  // no upper bound; values above the highest finite target should still read
  // as Strong. Open-ended below (min === -Infinity) → lower-is-better,
  // no lower bound; very low values should still read as Strong.
  const openAbove = targets.some(b => b.max == null)
  const openBelow = targets.some(b => !Number.isFinite(b.min))

  let min: number | undefined
  let max: number | undefined

  if (!openBelow) {
    for (const b of targets) {
      if (Number.isFinite(b.min)) {
        min = min === undefined ? b.min : Math.min(min, b.min)
      }
    }
  }
  if (!openAbove) {
    for (const b of targets) {
      if (b.max != null) {
        max = max === undefined ? b.max : Math.max(max, b.max)
      }
    }
  }

  if (min === undefined && max === undefined) return null
  return { min, max }
}

function deriveOptimal(markerId: string): Optimal | null {
  const reg = getMarkerById(markerId)
  if (reg?.statusBands?.length) {
    const opt = optimalFromBands(reg.statusBands)
    if (opt) return opt
  }
  const m = MARKERS[markerId]
  if (m?.optimal) return m.optimal
  return null
}

/** Status used by both panel grouping and the tile UI — single source of truth. */
export function getMarkerCardStatus(markerId: string, value: number | null): Status {
  return getStatus(value, deriveOptimal(markerId))
}

function getStatus(value: number | null, opt: Optimal | null): Status {
  if (value == null) return "not_tested"
  if (!opt) return "strong"
  const { min, max } = opt
  if (min != null && max != null) {
    if (value >= min && value <= max) return "strong"
    const range = max - min
    if (value < min - range * 0.3 || value > max + range * 0.3) return "attention"
    return "watch"
  }
  if (max != null) return value <= max ? "strong" : value <= max * 1.3 ? "watch" : "attention"
  if (min != null) return value >= min ? "strong" : value >= min * 0.7 ? "watch" : "attention"
  return "strong"
}

function computeTickPosition(value: number, opt: Optimal): number {
  const { min, max } = opt
  if (min != null && max != null) {
    const scaleMin = Math.min(min * 0.5, value * 0.7)
    const scaleMax = Math.max(max * 1.5, value * 1.3)
    return Math.max(2, Math.min(98, ((value - scaleMin) / (scaleMax - scaleMin)) * 100))
  }
  if (max != null) {
    const scaleMax = Math.max(max * 2, value * 1.3)
    return Math.max(2, Math.min(98, (value / scaleMax) * 100))
  }
  if (min != null) {
    const scaleMax = Math.max(min * 3, value * 1.5)
    return Math.max(2, Math.min(98, (value / scaleMax) * 100))
  }
  return 50
}

function deltaLabel(value: number, opt: Optimal): { text: string; color: string } | null {
  const { min, max } = opt
  if (min != null && max != null) {
    if (value >= min && value <= max) return { text: "optimal", color: "#4A7A4A" }
    if (value < min) return { text: "↓ below range", color: "#C4992E" }
    const overPct = ((value - max) / max) * 100
    return { text: overPct > 30 ? "↑ above range" : "↑ borderline", color: overPct > 30 ? "#9B3838" : "#C4992E" }
  }
  if (max != null) {
    if (value <= max) return { text: "optimal", color: "#4A7A4A" }
    const overPct = ((value - max) / max) * 100
    return { text: overPct > 30 ? "↑ above range" : "↑ borderline", color: overPct > 30 ? "#9B3838" : "#C4992E" }
  }
  if (min != null) {
    if (value >= min) return { text: "optimal", color: "#4A7A4A" }
    return { text: "↓ below range", color: "#C4992E" }
  }
  return null
}

function scaleLabels(opt: Optimal): string[] {
  const { min, max } = opt
  if (min != null && max != null) {
    return [
      String(Math.round(min * 0.5)),
      String(min),
      String(Math.round((min + max) / 2)),
      String(max),
      String(Math.round(max * 1.5)),
    ]
  }
  if (max != null) {
    return ["0", String(Math.round(max * 0.5)), String(max), String(Math.round(max * 1.3)), String(Math.round(max * 2))]
  }
  if (min != null) {
    return [
      String(Math.round(min * 0.5)),
      String(min),
      String(Math.round(min * 1.5)),
      String(Math.round(min * 2)),
      String(Math.round(min * 3)),
    ]
  }
  return []
}

function formatValue(v: number): string {
  return v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : Math.round(v).toString()
}

export interface MarkerPanelCardProps {
  markerId: string
  value: number | null
  /** When provided, the card renders as a clickable link with hover affordance. */
  href?: string
}

export function MarkerPanelCard({ markerId, value, href }: MarkerPanelCardProps) {
  const reg = getMarkerById(markerId)
  if (!reg) return null

  const opt = deriveOptimal(markerId)
  const status = getStatus(value, opt)
  const meta = STATUS_META[status]
  const categoryLabel = reg.categories[0] ? CATEGORY_LABELS[reg.categories[0]] ?? reg.categories[0] : null

  const tickPos = value != null && opt ? computeTickPosition(value, opt) : null
  const delta = value != null && opt ? deltaLabel(value, opt) : null
  const labels = opt ? scaleLabels(opt) : []

  const cardStyle: React.CSSProperties = {
    display: "block",
    textDecoration: "none",
    position: "relative",
    background: meta.bg,
    border: `1px solid ${meta.border}`,
    borderRadius: 14,
    padding: "20px 22px",
    transition: "transform 0.15s, box-shadow 0.15s",
    cursor: href ? "pointer" : "default",
    overflow: "hidden",
  }

  const inner = (
    <>
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
      <h3 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#2C2A24", margin: "0 0 12px", lineHeight: 1.2 }}>
        {reg.displayName}
      </h3>

      {/* Value + delta row */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <span style={{ fontFamily: SERIF, fontSize: 46, fontWeight: 500, color: "#2C2A24", lineHeight: 1, letterSpacing: "-0.02em" }}>
            {value != null ? formatValue(value) : "—"}
          </span>
          <span style={{ fontFamily: SERIF, fontSize: 18, fontStyle: "italic", color: "#8C897F", marginLeft: 4 }}>{reg.unit}</span>
        </div>
        {delta && (
          <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500, color: delta.color }}>{delta.text}</span>
        )}
      </div>

      {/* Range bar — rendered when an optimal range is available */}
      {opt && (
        <>
          <div style={{
            position: "relative", height: 4, borderRadius: 2, marginBottom: 6,
            background: "linear-gradient(90deg, rgba(229,196,196,0.3) 0% 18%, rgba(232,213,160,0.35) 18% 30%, #C8D8C0 30% 70%, rgba(232,213,160,0.35) 70% 82%, rgba(229,196,196,0.3) 82% 100%)",
          }}>
            {tickPos != null && (
              <div style={{
                position: "absolute", top: -3, left: `${tickPos}%`, width: 2, height: 10,
                background: meta.dot, borderRadius: 1, transform: "translateX(-1px)",
                boxShadow: "0 0 0 2px #FAFAF8",
              }} />
            )}
          </div>
          {labels.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {labels.map((l, i) => (
                <span key={i} style={{ fontFamily: SANS, fontSize: 9, color: "#A8A59B", fontVariantNumeric: "tabular-nums" }}>{l}</span>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        style={cardStyle}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(44,42,36,0.08)" }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none" }}
      >
        {inner}
      </Link>
    )
  }
  return <div style={cardStyle}>{inner}</div>
}

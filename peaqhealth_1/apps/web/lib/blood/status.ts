/**
 * Marker status interpretation — given a value + marker id, returns the
 * matching status band's status, label, and pill color.
 *
 * Color logic (drives the status pill on the marker detail page):
 *   favorableDirection 'lower'  + status 'above' → amber
 *   favorableDirection 'higher' + status 'below' → amber
 *   favorableDirection 'mid'    + status !== 'target' → amber
 *   any 'target' → sage
 *   'below' on lower-favorable, 'above' on higher-favorable → sage
 *
 * Returns null if the value is null/undefined or the marker isn't in the
 * registry or the marker has no statusBands populated.
 */

import { getMarkerById, type MarkerStatus, type RangeLabel } from "./markerRegistry"

export type PillColor = "sage" | "amber"

export interface StatusResult {
  status: MarkerStatus
  label: RangeLabel
  pillColor: PillColor
}

export function getMarkerStatus(
  value: number | null | undefined,
  markerId: string,
): StatusResult | null {
  if (value == null || !Number.isFinite(value)) return null
  const m = getMarkerById(markerId)
  if (!m || !m.statusBands || m.statusBands.length === 0) return null
  if (!m.favorableDirection) return null

  // Bands are ordered low → high. Match the first band whose [min, max) contains value.
  // For the highest band, max may be null (open-ended).
  let matched: (typeof m.statusBands)[number] | null = null
  for (const b of m.statusBands) {
    const lowerOk = value >= b.min
    const upperOk = b.max == null || value < b.max
    if (lowerOk && upperOk) {
      matched = b
      break
    }
  }
  // Fallback: if value is below first band's min, use the first band.
  // If value is above last band's max, use the last band.
  if (!matched) {
    if (value < m.statusBands[0].min) matched = m.statusBands[0]
    else matched = m.statusBands[m.statusBands.length - 1]
  }

  const pillColor = pillColorFor(matched.status, m.favorableDirection)
  return { status: matched.status, label: matched.label, pillColor }
}

function pillColorFor(
  status: MarkerStatus,
  favorable: "lower" | "higher" | "mid",
): PillColor {
  if (status === "target") return "sage"
  if (favorable === "lower")  return status === "above" ? "amber" : "sage"
  if (favorable === "higher") return status === "below" ? "amber" : "sage"
  // mid-favorable: anything other than target is amber
  return "amber"
}

/**
 * Marker status interpretation.
 *
 * Returns a 3-state display label (Optimal / Watch / Attention) derived
 * from the user's band position relative to the target zone:
 *
 *   • In a target band                    → Optimal   (green)
 *   • In a band ADJACENT to a target band → Watch     (amber)
 *   • In a band further from target       → Attention (red)
 *
 * Vocabulary mirrors the blood panel page (/dashboard/blood) so the
 * detail-page status pill matches the panel-page status. The granular
 * band label ("Lower range", "Higher range", etc.) is still surfaced for
 * the distribution-viz axis labels.
 *
 * Returns null if value is null/undefined, marker isn't in the registry,
 * or the marker has no statusBands populated.
 */

import { getMarkerById, type MarkerStatus, type RangeLabel, type StatusBand } from "./markerRegistry"

export type DisplayStatus = "optimal" | "watch" | "attention"
export type DisplayLabel  = "Optimal" | "Watch" | "Attention"
export type PillColor     = "green" | "amber" | "red"

export interface StatusResult {
  /** Tri-state display status used by the UI pill on both panel and detail pages. */
  displayStatus: DisplayStatus
  displayLabel: DisplayLabel
  pillColor: PillColor
  /** Underlying band's status (target/above/below). */
  status: MarkerStatus
  /** Underlying band's label (Lower range / Mid range / etc.) — used by the distribution viz. */
  label: RangeLabel
}

const DISPLAY_TO_COLOR: Record<DisplayStatus, PillColor> = {
  optimal:   "green",
  watch:     "amber",
  attention: "red",
}

const DISPLAY_TO_LABEL: Record<DisplayStatus, DisplayLabel> = {
  optimal:   "Optimal",
  watch:     "Watch",
  attention: "Attention",
}

/**
 * Compute display status from the matched band's position relative to
 * target bands. Adjacent (distance ≤ 1) → Watch; further → Attention.
 */
function deriveDisplayStatus(bands: StatusBand[], matchIndex: number): DisplayStatus {
  if (bands[matchIndex].status === "target") return "optimal"
  const targetIndices: number[] = []
  for (let i = 0; i < bands.length; i++) {
    if (bands[i].status === "target") targetIndices.push(i)
  }
  if (targetIndices.length === 0) return "watch"
  const minDistance = Math.min(...targetIndices.map(i => Math.abs(i - matchIndex)))
  return minDistance <= 1 ? "watch" : "attention"
}

export function getMarkerStatus(
  value: number | null | undefined,
  markerId: string,
): StatusResult | null {
  if (value == null || !Number.isFinite(value)) return null
  const m = getMarkerById(markerId)
  if (!m || !m.statusBands || m.statusBands.length === 0) return null

  let matchIndex = -1
  for (let i = 0; i < m.statusBands.length; i++) {
    const b = m.statusBands[i]
    const lowerOk = value >= b.min
    const upperOk = b.max == null || value < b.max
    if (lowerOk && upperOk) { matchIndex = i; break }
  }
  if (matchIndex < 0) {
    matchIndex = value < m.statusBands[0].min ? 0 : m.statusBands.length - 1
  }
  const matched = m.statusBands[matchIndex]
  const displayStatus = deriveDisplayStatus(m.statusBands, matchIndex)

  return {
    displayStatus,
    displayLabel: DISPLAY_TO_LABEL[displayStatus],
    pillColor: DISPLAY_TO_COLOR[displayStatus],
    status: matched.status,
    label: matched.label,
  }
}

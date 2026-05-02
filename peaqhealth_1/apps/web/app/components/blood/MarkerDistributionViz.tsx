/**
 * Range bar matching the panel page exactly. 4px gradient track with the
 * five-zone soft palette (pink → amber → sage → amber → pink), a 2×10
 * vertical tick in status color over the user's value, and five numeric
 * scale labels underneath. Mirrors PopulatedCard in blood-panel-rebuild.tsx.
 */
import { getMarkerById, type StatusBand } from "../../../lib/blood/markerRegistry"
import { getMarkerStatus } from "../../../lib/blood/status"

const TICK_COLOR = {
  green: "#4A7A4A",
  amber: "#C4992E",
  red:   "#9B3838",
  none:  "#A8A59B",
} as const

const SANS = "var(--font-body), 'Instrument Sans', sans-serif"

interface Optimal { min?: number; max?: number }

function optimalFromBands(bands: StatusBand[]): Optimal | null {
  const targets = bands.filter(b => b.status === "target")
  if (targets.length === 0) return null
  let min: number | undefined
  let max: number | undefined
  for (const b of targets) {
    if (Number.isFinite(b.min)) {
      min = min === undefined ? b.min : Math.min(min, b.min)
    }
    if (b.max != null) {
      max = max === undefined ? b.max : Math.max(max, b.max)
    }
  }
  if (min === undefined && max === undefined) return null
  return { min, max }
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

export function MarkerDistributionViz({
  markerId,
  value,
}: {
  markerId: string
  value: number | null
}) {
  const m = getMarkerById(markerId)
  if (!m || !m.statusBands || m.statusBands.length === 0) return null

  const opt = optimalFromBands(m.statusBands)
  if (!opt) return null

  const status = value != null ? getMarkerStatus(value, markerId) : null
  const tickColor = status
    ? status.pillColor === "green" ? TICK_COLOR.green
      : status.pillColor === "amber" ? TICK_COLOR.amber
      : TICK_COLOR.red
    : TICK_COLOR.none

  const tickPos = value != null ? computeTickPosition(value, opt) : null
  const labels = scaleLabels(opt)

  return (
    <div style={{ marginTop: 20 }}>
      {/* 4px gradient track — exact panel-page palette */}
      <div
        style={{
          position: "relative",
          height: 4,
          borderRadius: 2,
          marginBottom: 6,
          background:
            "linear-gradient(90deg, rgba(229,196,196,0.3) 0% 18%, rgba(232,213,160,0.35) 18% 30%, #C8D8C0 30% 70%, rgba(232,213,160,0.35) 70% 82%, rgba(229,196,196,0.3) 82% 100%)",
        }}
      >
        {tickPos != null && (
          <div
            style={{
              position: "absolute",
              top: -3,
              left: `${tickPos}%`,
              width: 2,
              height: 10,
              background: tickColor,
              borderRadius: 1,
              transform: "translateX(-1px)",
              boxShadow: "0 0 0 2px var(--paper, #FAFAF8)",
            }}
            aria-label={`Your value: ${value} ${m.unit}`}
          />
        )}
      </div>

      {labels.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {labels.map((l, i) => (
            <span
              key={i}
              style={{
                fontFamily: SANS,
                fontSize: 9,
                color: "rgba(20,20,16,0.4)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Segmented horizontal bar showing the marker's status bands with a dot
 * positioned at the user's value. Each band's color is determined by the
 * band's status + the marker's favorableDirection.
 */
import { getMarkerById, type StatusBand } from "../../../lib/blood/markerRegistry"

const SAGE  = "#7B9971"
const AMBER = "#C99A4A"
const NEUTRAL = "rgba(20,20,16,0.18)"

function bandColor(band: StatusBand, favorable: "lower" | "higher" | "mid" | undefined): string {
  if (!favorable) return NEUTRAL
  if (band.status === "target") return SAGE
  if (favorable === "lower")  return band.status === "above" ? AMBER : SAGE
  if (favorable === "higher") return band.status === "below" ? AMBER : SAGE
  return AMBER // mid-favorable, anything off-target is amber
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

  // Compute the visualization range. Use the first band's min (or registry
  // validRange.min if -inf) and the last band's max (or 1.5x the cap).
  const first = m.statusBands[0]
  const last  = m.statusBands[m.statusBands.length - 1]
  const vizMin = Number.isFinite(first.min) ? first.min : m.validRange.min
  const vizMax = last.max ?? Math.max(m.validRange.max, vizMin + 1)
  const vizRange = vizMax - vizMin

  const dotPct =
    value == null
      ? null
      : Math.max(0, Math.min(100, ((value - vizMin) / vizRange) * 100))

  return (
    <div style={{ marginTop: 16 }}>
      {/* Segmented bar */}
      <div
        style={{
          position: "relative",
          height: 10,
          borderRadius: 6,
          overflow: "hidden",
          display: "flex",
          background: NEUTRAL,
        }}
      >
        {m.statusBands.map((band, i) => {
          const segMin = Number.isFinite(band.min) ? band.min : vizMin
          const segMax = band.max ?? vizMax
          const widthPct = ((segMax - segMin) / vizRange) * 100
          return (
            <div
              key={i}
              style={{
                width: `${widthPct}%`,
                background: bandColor(band, m.favorableDirection),
                opacity: 0.85,
              }}
            />
          )
        })}
        {/* User dot */}
        {dotPct != null && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: `${dotPct}%`,
              transform: "translate(-50%, -50%)",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "white",
              border: "2px solid var(--ink, #141410)",
              boxShadow: "0 1px 3px rgba(20,20,16,0.25)",
            }}
            aria-label={`Your value: ${value} ${m.unit}`}
          />
        )}
      </div>

      {/* Range labels under each segment */}
      <div
        style={{
          display: "flex",
          marginTop: 6,
          fontFamily: "var(--font-body), 'Instrument Sans', sans-serif",
          fontSize: 9,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-40, rgba(20,20,16,0.4))",
        }}
      >
        {m.statusBands.map((band, i) => {
          const segMin = Number.isFinite(band.min) ? band.min : vizMin
          const segMax = band.max ?? vizMax
          const widthPct = ((segMax - segMin) / vizRange) * 100
          return (
            <div
              key={i}
              style={{
                width: `${widthPct}%`,
                textAlign: "center",
                paddingTop: 2,
              }}
            >
              {band.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

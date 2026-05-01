/**
 * Renders the descriptor.reflection paragraph(s) with %VALUE% interpolated.
 * If the marker has no descriptor or value is null, renders nothing
 * (the page should suppress this section in those states).
 */
import { getMarkerById } from "../../../lib/blood/markerRegistry"

export function MarkerReflection({
  markerId,
  value,
}: {
  markerId: string
  value: number | null
}) {
  const m = getMarkerById(markerId)
  if (!m || !m.descriptor || value == null) return null

  const text = m.descriptor.reflection.replaceAll("%VALUE%", String(value))

  return (
    <section style={{ marginBottom: 32 }}>
      <p
        style={{
          fontFamily: "var(--font-body), 'Instrument Sans', sans-serif",
          fontSize: 16,
          lineHeight: 1.7,
          color: "var(--ink-80, rgba(20,20,16,0.85))",
          margin: 0,
        }}
      >
        {text}
      </p>
    </section>
  )
}

/**
 * Horizontal composition bar — five segments, each linking to
 * /explore?category=<segment>. Below the bar, a legend with swatches.
 */
import Link from "next/link"
import {
  CATEGORY_META,
  COMPOSITION_CATEGORIES_ORDERED,
  type CompositionCategory,
} from "../../../../lib/oral/v3/composition-categories"

const SANS = "var(--font-body)"

export function CompositionBar({
  composition,
}: {
  composition: Record<CompositionCategory, number>
}) {
  const total = COMPOSITION_CATEGORIES_ORDERED.reduce(
    (sum, c) => sum + (composition[c] ?? 0),
    0,
  )
  if (total <= 0) return null

  const segments = COMPOSITION_CATEGORIES_ORDERED
    .map(c => ({
      category: c,
      pct: composition[c] ?? 0,
      widthPct: ((composition[c] ?? 0) / total) * 100,
      meta: CATEGORY_META[c],
    }))
    .filter(s => s.widthPct > 0)

  return (
    <div>
      <div
        style={{
          display: "flex",
          height: 36,
          borderRadius: 8,
          overflow: "hidden",
          border: "0.5px solid var(--ink-12)",
        }}
        role="group"
        aria-label="Bacterial composition by functional category"
      >
        {segments.map(s => (
          <Link
            key={s.category}
            href={`/explore?category=${s.category}`}
            title={`${s.meta.label} — ${s.pct.toFixed(1)}% of classified bacteria`}
            style={{
              width: `${s.widthPct}%`,
              background: s.meta.swatchVar,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SANS,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.92)",
              textDecoration: "none",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {s.widthPct >= 8 ? s.meta.label : ""}
          </Link>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
          marginTop: 16,
        }}
      >
        {COMPOSITION_CATEGORIES_ORDERED.map(c => {
          const meta = CATEGORY_META[c]
          const pct = composition[c] ?? 0
          return (
            <div key={c} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: meta.swatchVar,
                  marginTop: 5,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: SANS,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  {meta.label} <span style={{ fontWeight: 400, color: "var(--ink-60)" }}>· {pct.toFixed(1)}%</span>
                </div>
                <div style={{ fontFamily: SANS, fontSize: 11, color: "var(--ink-60)", marginTop: 2, lineHeight: 1.4 }}>
                  {meta.blurb}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

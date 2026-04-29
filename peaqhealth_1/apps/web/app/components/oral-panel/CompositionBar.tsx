"use client"

export type CompositionCategoryKey =
  | "heart"
  | "remin"
  | "commensal"
  | "context"
  | "cavity"
  | "orange"
  | "red"

const CATEGORY_VARS: Record<CompositionCategoryKey, string> = {
  heart: "var(--c-heart)",
  remin: "var(--c-remin)",
  commensal: "var(--c-commensal)",
  context: "var(--c-context)",
  cavity: "var(--c-cavity)",
  orange: "var(--c-orange)",
  red: "var(--c-red)",
}

export interface CompositionCategory {
  key: CompositionCategoryKey
  label: string
  /** Width as a percentage of the bar. 0–100. */
  percentage: number
  /** Optional descriptive text shown in the legend (e.g. representative bacteria). */
  description?: string
}

export interface CompositionBarProps {
  categories: CompositionCategory[]
  /** Show the swatch + label legend below the bar. Default true. */
  showLegend?: boolean
  /** Surface a "tap to explore (coming soon)" hint. */
  showHint?: boolean
  /** Optional click handler. If provided, segments become buttons with focus rings. */
  onCategoryClick?: (key: CompositionCategoryKey) => void
}

/**
 * CompositionBar — horizontal stacked bar showing the bacterial category
 * breakdown for an oral sample.
 *
 * Use as the headline visualization at the top of a "what's in your mouth"
 * section. Inline labels render only on segments wide enough to read; the
 * legend below is the durable surface. On mobile, all inline labels hide.
 *
 * Future-proofed for click-through: pass `onCategoryClick` to enable a
 * future drill-down without changing the component contract.
 */
export default function CompositionBar({
  categories,
  showLegend = true,
  showHint = false,
  onCategoryClick,
}: CompositionBarProps) {
  const interactive = !!onCategoryClick
  // Threshold below which we hide the inline label (segment too narrow).
  const labelThreshold = 7

  return (
    <div>
      <div
        role="img"
        aria-label="Bacterial category composition"
        style={{
          display: "flex",
          width: "100%",
          height: 44,
          borderRadius: 4,
          border: "1px solid var(--hairline)",
          overflow: "hidden",
        }}
      >
        {categories.map(c => {
          const showInlineLabel = c.percentage >= labelThreshold
          const segmentStyle: React.CSSProperties = {
            background: CATEGORY_VARS[c.key],
            width: `${c.percentage}%`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            fontFamily: "var(--font-manrope), sans-serif",
            fontWeight: 600,
            fontSize: showInlineLabel ? 11 : 0,
            letterSpacing: "0.04em",
            border: "none",
            padding: 0,
            cursor: interactive ? "pointer" : "default",
            transition: "filter 150ms ease",
          }
          const inner = (
            <span className="oravi-composition-label" style={{ pointerEvents: "none" }}>
              {c.label} {c.percentage}%
            </span>
          )
          if (interactive) {
            return (
              <button
                key={c.key}
                type="button"
                aria-label={`${c.label} ${c.percentage}%`}
                onClick={() => onCategoryClick!(c.key)}
                style={segmentStyle}
                onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.06)" }}
                onMouseLeave={e => { e.currentTarget.style.filter = "" }}
              >
                {inner}
              </button>
            )
          }
          return (
            <div key={c.key} role="presentation" style={segmentStyle}>{inner}</div>
          )
        })}
      </div>

      {showHint ? (
        <p
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            fontSize: 11,
            color: "var(--ink-soft-2)",
            marginTop: 8,
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          tap to explore (coming soon)
        </p>
      ) : null}

      {showLegend ? (
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "8px 18px",
          }}
        >
          {categories.map(c => (
            <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: CATEGORY_VARS[c.key],
                  flexShrink: 0,
                }}
              />
              <span style={{ fontFamily: "var(--font-manrope), sans-serif", fontSize: 12, color: "var(--ink-soft)", minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{c.label}</span>{" "}
                <span style={{ color: "var(--ink-soft-2)", fontWeight: 500 }}>{c.percentage}%</span>
                {c.description ? (
                  <span style={{ color: "var(--ink-soft-2)", fontWeight: 400 }}> · {c.description}</span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <style jsx>{`
        @media (max-width: 640px) {
          :global(.oravi-composition-label) {
            font-size: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}

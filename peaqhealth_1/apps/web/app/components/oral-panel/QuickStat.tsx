"use client"

export interface QuickStatProps {
  /** Eyebrow-style label above the value — e.g. "Species detected". */
  label: string
  /** The headline value. Pre-formatted. */
  value: string | number
  /** Small contextual sub-line — e.g. "across 53 genera". */
  detail?: string
}

/**
 * QuickStat — compact stat tile used in the snapshot row of the oral
 * panel. Smaller than Panel; a single number with a one-line label and
 * optional detail.
 *
 * Use QuickStat for non-actionable summary stats (species count,
 * diversity index, "X% rare" headline). For first-class data surfaces
 * with body copy, distribution viz, or status, use Panel.
 */
export default function QuickStat({ label, value, detail }: QuickStatProps) {
  return (
    <article
      style={{
        background: "var(--paper-warm)",
        borderLeft: "3px solid var(--gold)",
        borderRadius: 4,
        padding: "20px 22px",
      }}
    >
      <div className="eyebrow-subtle" style={{ marginBottom: 6 }}>{label}</div>
      <div className="metric-medium" style={{ color: "var(--ink)" }}>{value}</div>
      {detail ? (
        <div
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            fontWeight: 500,
            fontSize: 11,
            color: "var(--ink-soft-2)",
            marginTop: 4,
          }}
        >
          {detail}
        </div>
      ) : null}
    </article>
  )
}

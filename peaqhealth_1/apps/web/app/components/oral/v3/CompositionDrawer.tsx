/**
 * Top-15 species table drawer. Each row shows category swatch, name, and
 * percentage abundance.
 */
import {
  CATEGORY_META,
  type CompositionCategory,
} from "../../../../lib/oral/v3/composition-categories"

const SANS = "var(--font-body)"
const SERIF = "var(--font-display)"

export function CompositionDrawer({
  topSpecies,
}: {
  topSpecies: Array<{ name: string; pct: number; category: CompositionCategory }>
}) {
  return (
    <details
      style={{
        border: "0.5px solid var(--ink-12)",
        borderRadius: 12,
        padding: "18px 22px",
        background: "var(--off-white)",
        marginBottom: 12,
      }}
    >
      <summary
        style={{
          fontFamily: SANS,
          fontSize: 13,
          fontWeight: 600,
          color: "var(--ink)",
          cursor: "pointer",
          listStyle: "none",
        }}
      >
        Top species in your sample ({topSpecies.length})
      </summary>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 14,
          fontFamily: SANS,
          fontSize: 13,
        }}
      >
        <thead>
          <tr style={{ textAlign: "left", color: "var(--ink-60)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            <th style={{ padding: "8px 0", fontWeight: 600 }}>Species</th>
            <th style={{ padding: "8px 0", fontWeight: 600 }}>Group</th>
            <th style={{ padding: "8px 0", fontWeight: 600, textAlign: "right" }}>Abundance</th>
          </tr>
        </thead>
        <tbody>
          {topSpecies.map(s => {
            const meta = CATEGORY_META[s.category]
            return (
              <tr key={s.name} style={{ borderTop: "0.5px solid var(--ink-12)" }}>
                <td
                  style={{
                    padding: "10px 0",
                    fontFamily: SERIF,
                    fontStyle: "italic",
                    color: "var(--ink)",
                  }}
                >
                  {s.name}
                </td>
                <td style={{ padding: "10px 0", color: "var(--ink-80)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: meta.swatchVar,
                      }}
                    />
                    {meta.label}
                  </span>
                </td>
                <td style={{ padding: "10px 0", textAlign: "right", color: "var(--ink-80)", fontVariantNumeric: "tabular-nums" }}>
                  {s.pct.toFixed(2)}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </details>
  )
}

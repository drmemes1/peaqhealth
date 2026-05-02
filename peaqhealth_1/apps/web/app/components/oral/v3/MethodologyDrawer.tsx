/**
 * Methodology drawer — short notes on what was measured and how.
 * Citations live in ReferencesDrawer.
 */
const SANS = "var(--font-body)"
const SERIF = "var(--font-display)"

const NOTES: Array<{ heading: string; body: string }> = [
  {
    heading: "Sequencing",
    body: "16S rRNA gene sequencing of the V3–V4 hypervariable region. Identifies bacteria at genus and species level for the dominant taxa in each sample.",
  },
  {
    heading: "Caries v3 — pathogen × defense balance",
    body: "Three signals are computed independently: cariogenic load (acid producers + aciduric species), commensal sufficiency (defensive Streptococcus + ADS-active species), and a pH-balance ratio. Risk category synthesizes them and accounts for synergy and compensated dysbiosis. Lifestyle confounders (sugar frequency, mouthwash use, xerostomia) are applied as adjustments rather than score changes.",
  },
  {
    heading: "NR-α — nitric oxide pathway",
    body: "Two scores surfaced honestly. NR Capacity weighs nitrate-reducing biomass with per-cell efficiency (Neisseria + Rothia weighted highest, Veillonella lowest). NO Signature is a Vanhatalo-derived ratio that estimates how favorably the species mix predicts systemic nitrite response. Risk category is the synthesis. Paradox flag fires when biomass is adequate but composition is unfavorable.",
  },
  {
    heading: "Confidence flags",
    body: "Each score carries a confidence label (low / moderate / high) reflecting reliability flags from the upstream pipeline — sequencing depth, abundance ceiling, and coverage of the reference taxa. Low confidence does not mean a wrong answer; it means the underlying signal is thinner.",
  },
]

export function MethodologyDrawer() {
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
        Methodology — what was measured and how
      </summary>
      <div style={{ marginTop: 14 }}>
        {NOTES.map((n, i) => (
          <div
            key={n.heading}
            style={{
              padding: "16px 0",
              borderTop: i === 0 ? undefined : "0.5px solid var(--ink-12)",
            }}
          >
            <h4
              style={{
                fontFamily: SERIF,
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                margin: "0 0 6px",
                letterSpacing: "-0.01em",
              }}
            >
              {n.heading}
            </h4>
            <p
              style={{
                fontFamily: SANS,
                fontSize: 13,
                color: "var(--ink-80)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {n.body}
            </p>
          </div>
        ))}
      </div>
    </details>
  )
}

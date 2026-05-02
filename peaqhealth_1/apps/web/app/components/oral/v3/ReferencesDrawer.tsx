/**
 * References drawer — citations supporting the page's classifications.
 * Static for now; will be sourced from methodologyKnowledge once that
 * surface is wired through the runners.
 */
const SANS = "var(--font-body)"

const REFERENCES: string[] = [
  "Vanhatalo A, et al. Nitrate-responsive oral microbiome modulates nitric oxide homeostasis and blood pressure in humans. Free Radic Biol Med. 2018.",
  "Hyde ER, et al. Metagenomic analysis of nitrate-reducing bacteria in the oral cavity. PLoS One. 2014.",
  "Burton JP, Wescombe PA, et al. Streptococcus salivarius as a probiotic for oral health. Microbiology. 2010.",
  "Marsh PD. Microbial ecology of dental plaque and its significance in health and disease. Adv Dent Res. 1994.",
  "Liu Y, et al. Selenomonas sputigena and Streptococcus mutans synergistically promote dental caries. Nat Commun. 2023.",
  "Takahashi N, Nyvad B. The role of bacteria in the caries process: ecological perspectives. J Dent Res. 2011.",
  "Liddle B, et al. Arginine deiminase system in oral commensals: pH buffering through ADS-active species. J Oral Microbiol. 2020.",
]

export function ReferencesDrawer() {
  return (
    <details
      style={{
        border: "0.5px solid var(--ink-12)",
        borderRadius: 12,
        padding: "18px 22px",
        background: "var(--off-white)",
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
        References ({REFERENCES.length})
      </summary>
      <ol
        style={{
          margin: "14px 0 0",
          paddingLeft: 20,
          fontFamily: SANS,
          fontSize: 12,
          color: "var(--ink-80)",
          lineHeight: 1.65,
        }}
      >
        {REFERENCES.map(r => (
          <li key={r} style={{ marginBottom: 8 }}>
            {r}
          </li>
        ))}
      </ol>
    </details>
  )
}

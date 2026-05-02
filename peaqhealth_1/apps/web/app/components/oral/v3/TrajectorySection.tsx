/**
 * Trajectory framing — "this is your baseline" + future test window.
 * The watch-list metrics are derived from caries v3 + NR v1 categories.
 */
import type { OralPageData } from "../../../../lib/oral/v3/page-data"

const SANS = "var(--font-body)"
const SERIF = "var(--font-display)"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function addMonths(iso: string, months: number): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return null
  d.setMonth(d.getMonth() + months)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function watchList(data: OralPageData): string[] {
  const items: string[] = []
  if (data.caries) {
    if (data.caries.cli_category === "elevated" || data.caries.cli_category === "high") {
      items.push("Cariogenic load — does it ease with sugar-frequency changes?")
    }
    if (data.caries.csi_category === "depleted" || data.caries.csi_category === "low") {
      items.push("Commensal sufficiency — does the protective community recover?")
    }
    if (data.caries.api_category === "moderately_acidogenic" || data.caries.api_category === "strongly_acidogenic") {
      items.push("pH balance — does buffering reserve return?")
    }
  }
  if (data.nr) {
    if (data.nr.capacity_category === "low" || data.nr.capacity_category === "depleted") {
      items.push("NR Capacity — does nitrate-reducer biomass increase?")
    }
    if (data.nr.no_signature_category === "unfavorable" || data.nr.no_signature_category === "strongly_unfavorable") {
      items.push("NO Signature — does the species mix shift toward Tier 1 reducers?")
    }
    if (data.nr.paradox_flag) {
      items.push("NO paradox — does the composition pattern resolve as biomass shifts?")
    }
  }
  if (items.length === 0) {
    items.push("Shannon diversity — does the community stay resilient?")
    items.push("Caries balance — does the favorable picture hold?")
    items.push("NR pathway — does NO conversion stay strong?")
  }
  return items.slice(0, 3)
}

export function TrajectorySection({ data }: { data: OralPageData }) {
  const baselineDate = data.kit.results_date ?? data.kit.ordered_at
  const nextWindow = baselineDate ? addMonths(baselineDate, 6) : null
  const items = watchList(data)

  return (
    <section id="trajectory" style={{ marginBottom: 16 }}>
      <p
        style={{
          fontFamily: SANS,
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 600,
          color: "var(--gold)",
          margin: "0 0 12px",
        }}
      >
        Trajectory · this is your baseline
      </p>
      <h2
        style={{
          fontFamily: SERIF,
          fontSize: 36,
          fontWeight: 700,
          color: "var(--ink)",
          margin: "0 0 14px",
          letterSpacing: "-0.025em",
          lineHeight: 1.1,
        }}
      >
        Three numbers to watch next time
      </h2>
      <p
        style={{
          fontFamily: SANS,
          fontSize: 15,
          color: "var(--ink-80)",
          margin: "0 0 22px",
          maxWidth: 720,
          lineHeight: 1.6,
        }}
      >
        Your microbiome is dynamic. The point of a follow-up isn&apos;t a grade — it&apos;s seeing
        whether the levers you can move (diet, oral care, breathing pattern) actually move the
        underlying community.
        {nextWindow ? ` Suggested re-test window: ${nextWindow}.` : ""}
      </p>

      <ol
        style={{
          listStyle: "decimal",
          paddingLeft: 22,
          margin: 0,
          fontFamily: SANS,
          fontSize: 14,
          color: "var(--ink-80)",
          lineHeight: 1.7,
        }}
      >
        {items.map(it => (
          <li key={it} style={{ marginBottom: 6 }}>{it}</li>
        ))}
      </ol>
    </section>
  )
}

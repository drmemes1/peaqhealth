/**
 * Editorial hero. Eyebrow + H1 + dynamic lede + tagline.
 */
import { generateLede } from "../../../../lib/oral/v3/lede-generator"
import type { OralPageData } from "../../../../lib/oral/v3/page-data"

const SERIF = "var(--font-display)"
const SANS = "var(--font-body)"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function formatMonthYear(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return ""
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function OralPageHero({ data }: { data: OralPageData }) {
  const eyebrowParts: string[] = ["Oral microbiome"]
  if (data.user.first_name) eyebrowParts.push(data.user.first_name)
  const monthYear = formatMonthYear(data.kit.results_date ?? data.kit.ordered_at)
  if (monthYear) eyebrowParts.push(monthYear)
  const eyebrow = eyebrowParts.join(" · ")

  return (
    <section style={{ marginBottom: 48 }}>
      <p
        style={{
          fontFamily: SANS,
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 600,
          color: "var(--gold)",
          margin: "0 0 16px",
        }}
      >
        {eyebrow}
      </p>
      <h1
        style={{
          fontFamily: SERIF,
          fontSize: 56,
          fontWeight: 700,
          color: "var(--ink)",
          margin: "0 0 24px",
          letterSpacing: "-0.035em",
          lineHeight: 1.05,
        }}
      >
        A look at your mouth.
      </h1>
      <p
        style={{
          fontFamily: SANS,
          fontSize: 18,
          fontWeight: 400,
          color: "var(--ink-80)",
          margin: "0 0 18px",
          lineHeight: 1.6,
          maxWidth: 720,
        }}
      >
        {generateLede(data)}
      </p>
      <p
        style={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 16,
          color: "var(--ink-60)",
          margin: 0,
          lineHeight: 1.55,
          maxWidth: 720,
        }}
      >
        A look at your mouth tells a story about the rest of your body.
      </p>
    </section>
  )
}

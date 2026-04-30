"use client"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export function HeroLine({ strong, watch, attention, watchCategories }: {
  strong: number; watch: number; attention: number; watchCategories: string[]
}) {
  const total = strong + watch + attention
  if (total === 0) return null

  const needsNoticing = watch + attention

  let headline: string
  let sub: string

  if (needsNoticing === 0) {
    headline = "Your mouth is in a strong place overall."
    sub = `${strong} signals, all in the strong range.`
  } else if (strong >= needsNoticing && needsNoticing <= 2) {
    const areas = watchCategories.length > 0 ? watchCategories.join(" and ") : "a couple of"
    headline = attention > 0
      ? `Your mouth is in a good place overall — one signal needs attention and ${watch > 0 ? "a couple are" : "it's"} worth noticing.`
      : `Your mouth is in a good place overall — a few ${areas} signals are worth your attention.`
    sub = `${strong} strong · ${needsNoticing} worth noticing`
  } else if (strong >= needsNoticing) {
    headline = "Your mouth has strong signals and a few that need a closer look."
    sub = `${strong} strong · ${needsNoticing} worth noticing`
  } else {
    headline = "Your mouth has several signals that need attention — here's what we're seeing."
    sub = `${attention > 0 ? `${attention} need attention · ` : ""}${watch} worth noticing · ${strong} strong`
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        fontFamily: serif, fontSize: 28, fontWeight: 400,
        color: "#2C2A24", margin: "0 0 6px", lineHeight: 1.3,
        letterSpacing: "-0.005em",
      }}>
        {headline}
      </h2>
      <p style={{ fontFamily: sans, fontSize: 12, color: "#8C897F", margin: 0 }}>{sub}</p>
    </div>
  )
}

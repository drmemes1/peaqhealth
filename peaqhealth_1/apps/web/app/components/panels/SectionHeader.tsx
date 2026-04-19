const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

interface Props {
  title: string
  subtitle: string
}

export function SectionHeader({ title, subtitle }: Props) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      borderBottom: "1px solid #E8E6E0", paddingBottom: "0.75rem", marginBottom: "1rem",
    }}>
      <h2 style={{
        fontFamily: serif, fontSize: 22, fontWeight: 500,
        color: "#2C2A24", margin: 0,
      }}>
        {title}
      </h2>
      <span style={{
        fontFamily: sans, fontSize: 12, color: "#9B9891",
        maxWidth: "60%", textAlign: "right",
      }}>
        {subtitle}
      </span>
    </div>
  )
}

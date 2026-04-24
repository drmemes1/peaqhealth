"use client"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const ACCENT: Record<string, string> = { strong: "#4A7A4A", watch: "#B8860B", attention: "#9B3838" }

export function EcoCard({ name, value, unit, label, status }: {
  name: string; value: string | number; unit?: string; label: string; status: "strong" | "watch" | "attention"
}) {
  const color = ACCENT[status]
  return (
    <div style={{
      background: "#FAFAF8", border: "1px solid #E8E4D8",
      borderRadius: 12, padding: "16px 18px",
      borderLeft: `3px solid ${color}`,
      flex: "1 1 0", minWidth: 140,
    }}>
      <span style={{ fontFamily: sans, fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.14em", color: "#8C897F", display: "block", marginBottom: 6 }}>
        {name}
      </span>
      <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 500, color: "#2C2A24", lineHeight: 1, marginBottom: 4 }}>
        {value}{unit && <span style={{ fontSize: 14, color: "#8C897F", fontWeight: 400, marginLeft: 2 }}>{unit}</span>}
      </div>
      <span style={{
        fontFamily: sans, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
        color, display: "inline-flex", alignItems: "center", gap: 3,
      }}>
        <span style={{ width: 4, height: 4, borderRadius: "50%", background: color }} />
        {label}
      </span>
    </div>
  )
}

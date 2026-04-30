"use client"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const ACCENT: Record<string, string> = { strong: "#4A7A4A", watch: "#B8860B", attention: "#9B3838", no_data: "#A8A59B" }

export function EcoCard({ name, value, unit, label, status, description }: {
  name: string; value: string | number; unit?: string; label: string
  status: "strong" | "watch" | "attention" | "no_data"
  description?: string
}) {
  const color = ACCENT[status] ?? "#A8A59B"
  return (
    <div style={{
      background: "#FAFAF8", border: "1px solid #E8E4D8",
      borderRadius: 12, padding: "16px 18px",
      borderLeft: `3px solid ${color}`,
      flex: "1 1 0", minWidth: 140,
      opacity: status === "no_data" ? 0.7 : 1,
      transition: "transform 0.15s, box-shadow 0.15s",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(44,42,36,0.06)" }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none" }}
    >
      <span style={{ fontFamily: sans, fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.14em", color: "#8C897F", display: "block", marginBottom: 6 }}>
        {name}
      </span>
      <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 500, color: status === "no_data" ? "#A8A59B" : "#2C2A24", lineHeight: 1, marginBottom: 4 }}>
        {value}{unit && <span style={{ fontSize: 14, color: "#8C897F", fontWeight: 400, marginLeft: 2 }}>{unit}</span>}
      </div>
      <span style={{
        fontFamily: sans, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
        color, display: "inline-flex", alignItems: "center", gap: 3, marginBottom: description ? 6 : 0,
      }}>
        <span style={{ width: 4, height: 4, borderRadius: "50%", background: color }} />
        {label}
      </span>
      {description && (
        <p style={{ fontFamily: sans, fontSize: 11, color: "#8C897F", lineHeight: 1.4, margin: "4px 0 0" }}>
          {description}
        </p>
      )}
    </div>
  )
}

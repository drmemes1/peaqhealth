"use client"

const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export function UnitToggle({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: [string, string]
}) {
  return (
    <div style={{
      display: "flex", gap: 4, background: "#F0EDE3",
      borderRadius: 10, padding: 4, width: "fit-content", marginBottom: 20,
    }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: "6px 14px", background: value === opt ? "#2C2A24" : "transparent",
            border: "none", borderRadius: 7,
            fontFamily: sans, fontSize: 11, fontWeight: 500,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: value === opt ? "#EDEAE1" : "#8C897F",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

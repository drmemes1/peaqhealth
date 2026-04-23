"use client"

const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export function RadioOption({ label, sublabel, selected, onSelect }: {
  label: string; sublabel?: string; selected: boolean; onSelect: () => void
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: selected ? "13px 17px" : "14px 18px",
        background: selected ? "#FAF6ED" : "#FFFFFF",
        border: `${selected ? 2 : 1}px solid ${selected ? "#2C2A24" : "#D6D3C8"}`,
        borderRadius: 10, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 12,
        transition: "all 0.15s", fontSize: 14,
      }}
    >
      <div style={{
        width: 14, height: 14,
        border: `${selected ? 4 : 1.5}px solid ${selected ? "#2C2A24" : "#D6D3C8"}`,
        borderRadius: "50%", flexShrink: 0,
      }} />
      <span style={{ fontFamily: sans, fontWeight: 500, color: "#2C2A24", flex: 1 }}>{label}</span>
      {sublabel && <span style={{ fontSize: 11, color: "#8C897F", fontStyle: "italic", marginLeft: 8 }}>{sublabel}</span>}
    </div>
  )
}

export function CheckboxOption({ label, sublabel, selected, onSelect }: {
  label: string; sublabel?: string; selected: boolean; onSelect: () => void
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: selected ? "13px 17px" : "14px 18px",
        background: selected ? "#FAF6ED" : "#FFFFFF",
        border: `${selected ? 2 : 1}px solid ${selected ? "#2C2A24" : "#D6D3C8"}`,
        borderRadius: 10, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 12,
        transition: "all 0.15s", fontSize: 14,
      }}
    >
      <div style={{
        width: 14, height: 14,
        border: `1.5px solid ${selected ? "#2C2A24" : "#D6D3C8"}`,
        borderRadius: 4, flexShrink: 0, position: "relative",
        background: selected ? "#2C2A24" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {selected && <span style={{ color: "#FFF", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontFamily: sans, fontWeight: 500, color: "#2C2A24", flex: 1 }}>{label}</span>
      {sublabel && <span style={{ fontSize: 11, color: "#8C897F", fontStyle: "italic", marginLeft: 8 }}>{sublabel}</span>}
    </div>
  )
}

interface LegendItem {
  label: string
  color: string
  active: boolean
}

export function RingLegend({ items }: { items: LegendItem[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
      {items.map(({ label, color, active }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {active ? (
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
          ) : (
            <div style={{ width: 7, height: 7, borderRadius: "50%", border: `1.5px dashed ${color}`, opacity: 0.5 }} />
          )}
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-60)" }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

"use client"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export function CategoryPullquote({ finding, findingAccent, crossPanelSources }: {
  finding: string
  findingAccent?: string
  crossPanelSources?: string[]
}) {
  return (
    <div style={{
      background: "#2C2A24", position: "relative", overflow: "hidden",
      padding: "16px 20px", borderRadius: "0 0 10px 10px",
    }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, background: "radial-gradient(circle, rgba(212,169,52,0.10) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <div style={{ fontFamily: sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(212,169,52,0.8)", marginBottom: 6 }}>
          The finding
        </div>
        <p style={{ fontFamily: serif, fontSize: 15, color: "#F5F3EE", lineHeight: 1.4, margin: 0 }}>
          {finding}
          {findingAccent && <span style={{ color: "#D4A934", fontStyle: "italic" }}> {findingAccent}</span>}
        </p>
        {crossPanelSources && crossPanelSources.length >= 2 && (
          <p style={{ fontFamily: sans, fontSize: 10, color: "rgba(245,243,238,0.55)", margin: "8px 0 0", fontStyle: "italic" }}>
            Confirmed across your {crossPanelSources.join(" and ")}
          </p>
        )}
      </div>
    </div>
  )
}

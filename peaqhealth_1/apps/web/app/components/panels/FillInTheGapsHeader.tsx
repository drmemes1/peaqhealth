"use client"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const PANEL_COLORS = { oral: "#2D6A4F", blood: "#C0392B", sleep: "#4A7FB5" } as const
const RING_BG = "#E8E4D8"

interface PanelInfo { percent: number; score?: number; status: "complete" | "partial" | "none" }

interface FillInTheGapsHeaderProps {
  panelCoverage: { oral: PanelInfo; blood: PanelInfo; sleep: PanelInfo }
  convergeStrength: number
  currentPanel?: "oral" | "blood" | "sleep" | null
}

function Ring({ panel, info, active }: { panel: "oral" | "blood" | "sleep"; info: PanelInfo; active: boolean }) {
  const color = PANEL_COLORS[panel]
  const r = 22, cx = 26, cy = 26, stroke = 4
  const circ = 2 * Math.PI * r
  const filled = circ * (info.percent / 100)
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={52} height={52} style={{ transform: "rotate(-90deg)", filter: active ? `drop-shadow(0 0 6px ${color}40)` : undefined }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={RING_BG} strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.5s ease" }} />
      </svg>
      <span style={{ position: "relative", top: -36, fontFamily: serif, fontSize: 16, fontWeight: 500, color: "#2C2A24" }}>
        {info.score != null ? info.score : "—"}
      </span>
      <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: active ? color : "#8C897F", marginTop: -20 }}>
        {panel}
      </span>
    </div>
  )
}

export function FillInTheGapsHeader({ panelCoverage, convergeStrength, currentPanel }: FillInTheGapsHeaderProps) {
  return (
    <div style={{
      background: "#F5F3EE", border: "1px solid #D6D3C8", borderRadius: 12,
      padding: "24px 28px", marginBottom: 28,
      borderImage: "linear-gradient(135deg, #B8860B20, #D6D3C8, #B8860B20) 1",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
        <div>
          <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 500, color: "#2C2A24", margin: "0 0 6px" }}>
            We fill in the gaps.
          </h2>
          <p style={{ fontFamily: sans, fontSize: 13, color: "#7A7870", margin: 0, lineHeight: 1.5, maxWidth: 400 }}>
            Your overlap across oral, blood, and sleep creates the picture none of them can show alone.
          </p>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <Ring panel="oral" info={panelCoverage.oral} active={currentPanel === "oral"} />
          <Ring panel="blood" info={panelCoverage.blood} active={currentPanel === "blood"} />
          <Ring panel="sleep" info={panelCoverage.sleep} active={currentPanel === "sleep"} />
        </div>
      </div>
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8C897F", whiteSpace: "nowrap" }}>
          Converge strength
        </span>
        <div style={{ flex: 1, height: 3, background: RING_BG, borderRadius: 2, position: "relative" }}>
          <div style={{ height: 3, background: "#B8860B", borderRadius: 2, width: `${convergeStrength}%`, transition: "width 0.5s ease" }} />
        </div>
        <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, color: "#B8860B" }}>{convergeStrength}%</span>
      </div>
    </div>
  )
}

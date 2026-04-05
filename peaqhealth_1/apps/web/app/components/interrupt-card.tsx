"use client"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', system-ui, sans-serif"

interface Signal {
  panel: "sleep" | "blood" | "oral"
  label: string
  detail: string
  value: string
  unit?: string
  status: "Optimal" | "Good" | "Watch" | "Attention"
}

interface Connector {
  text: string
}

interface InterruptCardProps {
  headline: string
  headlineEmphasis?: string
  subtitle: string
  signals: Signal[]
  connectors: Connector[]
  insight: string
  basePRI: number
  finalPRI: number
  modifierPoints: number
  modifierLabel: string
  modifierPanels: string
  citation: string
  onDismiss?: () => void
}

const PANEL_COLORS: Record<string, string> = {
  sleep: "var(--sleep-c, #185FA5)",
  blood: "var(--blood-c, #A32D2D)",
  oral:  "var(--oral-c, #3B6D11)",
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Optimal:   { bg: "rgba(234,243,222,0.1)", color: "#EAF3DE" },
  Good:      { bg: "rgba(225,245,238,0.1)", color: "#E1F5EE" },
  Watch:     { bg: "rgba(250,238,218,0.1)", color: "#FAEEDA" },
  Attention: { bg: "rgba(252,235,235,0.1)", color: "#FCEBEB" },
}

export function InterruptCard({
  headline,
  headlineEmphasis,
  subtitle,
  signals,
  connectors,
  insight,
  basePRI,
  finalPRI,
  modifierPoints,
  modifierLabel,
  modifierPanels,
  citation,
  onDismiss,
}: InterruptCardProps) {

  return (
    <div style={{
      background: "#16150F",
      borderRadius: 16,
      overflow: "hidden",
      position: "relative",
      animation: "cardIn 600ms cubic-bezier(0.0,0.0,0.2,1) both",
      animationDelay: "200ms",
    }}>
      {/* Flag bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 24px",
        borderBottom: "0.5px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "var(--gold, #C49A3C)",
          position: "relative",
          flexShrink: 0,
        }}>
          <span style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: "1px solid var(--gold, #C49A3C)",
            opacity: 0,
            animation: "pulse 2s ease-out infinite",
          }} />
        </div>
        <span style={{
          fontFamily: sans,
          fontSize: 9, letterSpacing: "2.5px", textTransform: "uppercase",
          color: "var(--gold, #C49A3C)", flex: 1,
        }}>
          Your data flagged something
        </span>
        <button
          onClick={() => onDismiss?.()}
          style={{
            fontFamily: sans,
            fontSize: 9, letterSpacing: "1px", textTransform: "uppercase",
            color: "rgba(255,255,255,0.25)",
            background: "none", border: "none", cursor: "pointer",
            padding: "4px 0",
          }}
        >
          Dismiss &times;
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "28px 24px 24px" }}>
        {/* Headline */}
        <h2 style={{
          fontFamily: serif,
          fontSize: 28, fontWeight: 300,
          color: "#fff",
          lineHeight: 1.2,
          margin: "0 0 12px",
          maxWidth: 520,
        }}>
          {headline}
          {headlineEmphasis && (
            <>
              <br />
              <em style={{ fontStyle: "italic", color: "var(--gold, #C49A3C)" }}>
                {headlineEmphasis}
              </em>
            </>
          )}
        </h2>

        <p style={{
          fontFamily: sans,
          fontSize: 12,
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.6,
          maxWidth: 560,
          margin: "0 0 28px",
        }}>
          {subtitle}
        </p>

        {/* Signal stack */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          marginBottom: 24,
          borderRadius: 10,
          overflow: "hidden",
        }}>
          {signals.map((sig, i) => {
            const ss = STATUS_STYLES[sig.status]
            return (
              <div key={sig.label}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.04)",
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: PANEL_COLORS[sig.panel],
                    flexShrink: 0,
                  }} />
                  <span style={{
                    flex: 1, fontFamily: sans, fontSize: 12,
                    color: "rgba(255,255,255,0.7)",
                  }}>
                    {sig.label}{" "}
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>
                      &middot; {sig.detail}
                    </span>
                  </span>
                  <span style={{
                    fontFamily: serif, fontSize: 16,
                    color: "#fff", textAlign: "right", minWidth: 80,
                  }}>
                    {sig.value}
                    {sig.unit && (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 2 }}>
                        {sig.unit}
                      </span>
                    )}
                  </span>
                  <span style={{
                    fontFamily: sans,
                    fontSize: 8, letterSpacing: "0.5px", textTransform: "uppercase",
                    fontWeight: 500,
                    padding: "2px 8px", borderRadius: 3,
                    minWidth: 64, textAlign: "center",
                    background: ss.bg, color: ss.color,
                  }}>
                    {sig.status}
                  </span>
                </div>

                {/* Connector after this signal (if exists) */}
                {connectors[i] && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 16px",
                    background: "rgba(196,154,60,0.06)",
                    borderLeft: "2px solid var(--gold, #C49A3C)",
                  }}>
                    <span style={{
                      fontFamily: sans,
                      fontSize: 10,
                      color: "rgba(196,154,60,0.8)",
                      lineHeight: 1.5,
                      fontStyle: "italic",
                    }}>
                      {connectors[i].text}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Score modifier */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 16px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: 8,
          marginBottom: 16,
        }}>
          <span style={{ fontFamily: serif, fontSize: 32, color: "rgba(255,255,255,0.3)", lineHeight: 1 }}>
            {basePRI}
          </span>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.15)" }}>&rarr;</span>
          <span style={{ fontFamily: serif, fontSize: 32, color: "var(--gold, #C49A3C)", lineHeight: 1 }}>
            {finalPRI}
          </span>
          <span style={{ flex: 1, fontFamily: sans, fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
            Cross-panel modifier applied<br />
            <span style={{ fontSize: 9 }}>{modifierLabel}</span>
          </span>
          <span style={{ fontFamily: sans, fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "right", lineHeight: 1.6 }}>
            {modifierPoints > 0 ? "+" : ""}{modifierPoints} pts<br />
            <span style={{ fontSize: 9 }}>{modifierPanels}</span>
          </span>
        </div>

        {/* Insight */}
        <div style={{
          fontFamily: sans,
          fontSize: 13,
          color: "rgba(255,255,255,0.65)",
          lineHeight: 1.65,
          padding: 16,
          background: "rgba(255,255,255,0.03)",
          borderRadius: 8,
          marginBottom: 20,
          borderLeft: "2px solid rgba(255,255,255,0.08)",
        }}
          dangerouslySetInnerHTML={{ __html: insight }}
        />

        {/* Footer */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 16,
          borderTop: "0.5px solid rgba(255,255,255,0.07)",
        }}>
          <span style={{
            fontFamily: sans,
            fontSize: 10,
            color: "rgba(255,255,255,0.25)",
            lineHeight: 1.5,
            maxWidth: 340,
          }}>
            {citation}
          </span>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button style={{
              fontFamily: sans,
              fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase",
              padding: "7px 14px", borderRadius: 6,
              border: "0.5px solid rgba(255,255,255,0.12)",
              background: "transparent", color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
            }}>
              Learn more
            </button>
            <button style={{
              fontFamily: sans,
              fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase",
              padding: "7px 16px", borderRadius: 6,
              background: "var(--gold, #C49A3C)", color: "#fff", border: "none",
              cursor: "pointer",
            }}>
              Share with doctor &rarr;
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0; transform: scale(2.2); }
        }
      `}</style>
    </div>
  )
}

"use client"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

type Status = "good" | "watch" | "concern" | "pending"

const ACCENT: Record<Status, string> = {
  good: "#1A8C4E", watch: "#B8860B", concern: "#A84D4D", pending: "#9A9894",
}

export interface ScaleItem {
  label: string
  value?: string
  status?: Status
  isUser?: boolean
  isTarget?: boolean
}

export interface SleepCardProps {
  status: Status
  icon: React.ReactNode
  title: string
  question: string
  value: string | number
  valueIsText?: boolean
  pill: string
  scaleItems: ScaleItem[]
  sources: string
  explain: React.ReactNode
  pullquote?: { label: string; body: React.ReactNode }
}

export function SleepCard({ status, icon, title, question, value, valueIsText, pill, scaleItems, sources, explain, pullquote }: SleepCardProps) {
  const accent = ACCENT[status]

  return (
    <div style={{
      borderRadius: 14, overflow: "hidden", marginBottom: 16,
      border: "1px solid #E8E4D8", borderLeft: `3px solid ${accent}`,
      boxShadow: "0 1px 3px rgba(20,20,16,0.05)",
      opacity: status === "pending" ? 0.85 : 1,
    }}>

      {/* TIER 1 — Header */}
      <div className="sleep-card-header" style={{
        background: "#FAF8F2", padding: "24px 28px 20px",
        display: "grid", gridTemplateColumns: "52px 1fr auto", gap: "0 18px", alignItems: "start",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 12,
          background: status === "pending" ? "#EEEBE3" : "#E8DCC4",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: status === "pending" ? 0.7 : 1,
        }}>
          {icon}
        </div>

        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontFamily: serif, fontSize: 26, fontWeight: 500, letterSpacing: "-0.01em", color: "#2C2A24", margin: "0 0 4px", lineHeight: 1.2 }}>
            {title}
          </h3>
          <p style={{ fontFamily: sans, fontSize: 13.5, color: "#7A7870", lineHeight: 1.5, margin: 0, maxWidth: 480 }}>
            {question}
          </p>
        </div>

        <div className="sleep-card-value" style={{ minWidth: 140, textAlign: "right" }}>
          {valueIsText ? (
            <span style={{ fontFamily: serif, fontSize: 20, fontStyle: "italic", color: status === "pending" ? "#9A9894" : "#2C2A24", lineHeight: 1.3 }}>
              {value}
            </span>
          ) : (
            <span style={{ fontFamily: serif, fontSize: 38, fontWeight: 500, color: status === "pending" ? "#9A9894" : "#2C2A24", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {value}
            </span>
          )}
          <div style={{ marginTop: 6 }}>
            <span style={{
              fontFamily: sans, fontSize: 10, fontWeight: 500,
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: accent, display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: accent }} />
              {pill}
            </span>
          </div>
        </div>
      </div>

      {/* TIER 2 — Measure row */}
      <div className="sleep-card-measure" style={{
        background: "#E8DCC4", padding: "16px 28px",
        borderTop: "1px solid rgba(44, 42, 36, 0.06)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          {scaleItems.map((item, i) => {
            const dotColor = item.isTarget ? "#6B5B3E" : item.status ? ACCENT[item.status] : "#9A9894"
            return (
              <span key={i} style={{
                fontFamily: sans, fontSize: 11.5, color: "#4A4640",
                display: "inline-flex", alignItems: "center", gap: 5,
                fontWeight: item.isUser ? 600 : 400,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                {item.label}{item.value && <strong style={{ color: "#2C2A24", fontWeight: 600 }}>{item.value}</strong>}
              </span>
            )
          })}
        </div>
        <span style={{ fontFamily: sans, fontSize: 10.5, fontStyle: "italic", color: "rgba(74, 70, 64, 0.75)" }}>
          {sources}
        </span>
      </div>

      {/* TIER 3 — Explain */}
      <div style={{
        background: "#EDE9DE", padding: "22px 28px 24px",
        borderTop: "1px solid rgba(44, 42, 36, 0.04)",
      }}>
        <span style={{
          fontFamily: sans, fontSize: 10, fontWeight: 500,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "#B8860B", display: "block", marginBottom: 10,
        }}>
          WHAT THIS MEANS
        </span>
        <div style={{ fontFamily: serif, fontSize: 16, lineHeight: 1.7, color: "#3D3B35", maxWidth: 700 }}>
          {explain}
        </div>
      </div>

      {/* TIER 4 — Pullquote (optional) */}
      {pullquote && (
        <div style={{
          background: "#2C2A24", padding: "18px 28px",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -30, right: -30, width: 150, height: 150,
            background: "radial-gradient(circle, rgba(212, 169, 52, 0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <span style={{
            fontFamily: sans, fontSize: 9.5, fontWeight: 500,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "rgba(212, 169, 52, 0.9)", display: "block", marginBottom: 8,
            position: "relative",
          }}>
            {pullquote.label}
          </span>
          <div style={{
            fontFamily: serif, fontSize: 17, lineHeight: 1.55,
            color: "#F5F3EE", position: "relative",
          }}>
            {pullquote.body}
          </div>
        </div>
      )}
    </div>
  )
}

export function Strong({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: "#2C2A24", fontWeight: 500 }}>{children}</strong>
}

export function Gold({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#B8860B", fontWeight: 500 }}>{children}</span>
}

export function GoldAccent({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#D4A934", fontStyle: "italic", fontWeight: 500 }}>{children}</span>
}

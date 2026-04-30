"use client"

import Link from "next/link"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export type SignalDot = "red" | "amber" | "green"

export interface CrossPanelSignal {
  dot: SignalDot
  title: string
  desc: string
  link?: string
}

export interface CrossPanelCardProps {
  signals: CrossPanelSignal[]
  updatedAt: string | null
  panelsActive: { oral: boolean; blood: boolean; sleep: boolean }
}

const DOT_COLORS: Record<SignalDot, string> = {
  red: "#D42B2B",
  amber: "#E07B00",
  green: "#1A8C4E",
}

export function CrossPanelCard({ signals, updatedAt, panelsActive }: CrossPanelCardProps) {
  const unfavorableCount = signals.filter(s => s.dot === "red" || s.dot === "amber").length
  const dateStr = updatedAt
    ? new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null

  return (
    <div style={{
      background: "#FAFAF8",
      border: "1px solid #E8E6E0",
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 36,
    }}>
      {/* Header */}
      <div style={{ padding: "24px 24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <span style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#9B9891", fontWeight: 500,
          }}>
            YOUR HEALTH PICTURE
          </span>
          {unfavorableCount > 0 ? (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: sans, fontSize: 12, color: "#6B6762",
              background: "#F0EDE6", padding: "5px 12px", borderRadius: 20,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E07B00" }} />
              {unfavorableCount} signal{unfavorableCount === 1 ? "" : "s"} need attention
            </span>
          ) : (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: sans, fontSize: 12, color: "#6B6762",
              background: "#F0EDE6", padding: "5px 12px", borderRadius: 20,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1A8C4E" }} />
              All panels looking good
            </span>
          )}
        </div>
        {dateStr && (
          <p style={{ fontFamily: sans, fontSize: 13, color: "#9B9891", margin: 0 }}>
            Updated {dateStr} · Based on your latest oral, blood, and sleep data
          </p>
        )}
      </div>

      {/* Signals */}
      <div>
        {signals.length === 0 ? (
          <p style={{
            fontFamily: sans, fontSize: 13, color: "#7A7A6E",
            padding: "0 24px 20px", margin: 0,
          }}>
            Connect more panels to surface cross-panel signals.
          </p>
        ) : (
          signals.map((s, i) => {
            const inner = (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "18px 24px",
                borderTop: "1px solid #F5F3EE",
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", background: DOT_COLORS[s.dot],
                  flexShrink: 0, marginTop: 7,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: sans, fontSize: 14, fontWeight: 500, color: "#2C2A24",
                    margin: "0 0 4px", lineHeight: 1.4,
                  }}>
                    {s.title}
                  </p>
                  <p style={{
                    fontFamily: sans, fontSize: 13, color: "#7A7870",
                    lineHeight: 1.5, margin: 0,
                  }}>
                    {s.desc}
                  </p>
                </div>
                {s.link && (
                  <span style={{
                    color: "#B8860B", fontSize: 14, flexShrink: 0,
                    fontWeight: 500, marginTop: 3,
                  }}>→</span>
                )}
              </div>
            )
            return s.link ? (
              <Link key={i} href={s.link} style={{
                textDecoration: "none", color: "inherit", display: "block",
              }}>
                {inner}
              </Link>
            ) : <div key={i}>{inner}</div>
          })
        )}
      </div>

      {/* Footer */}
      <div style={{
        background: "#F5F3EE", padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {[
            { label: "Oral", color: "#2D6A4F", active: panelsActive.oral },
            { label: "Blood", color: "#C0392B", active: panelsActive.blood },
            { label: "Sleep", color: "#4A7FB5", active: panelsActive.sleep },
          ].map(p => (
            <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: p.active ? p.color : "#D1CFC7",
              }} />
              <span style={{
                fontFamily: sans, fontSize: 10, letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: p.active ? p.color : "#9B9891",
                fontWeight: 500,
              }}>
                {p.label}
              </span>
            </div>
          ))}
        </div>
        <Link href="/dashboard/plan" style={{
          fontFamily: sans, fontSize: 13, color: "#B8860B",
          textDecoration: "none", fontWeight: 500,
        }}>
          See full picture →
        </Link>
      </div>

      {/* tsx-unused-var shim to keep serif import referenced if needed downstream */}
      <span style={{ display: "none", fontFamily: serif }}>.</span>
    </div>
  )
}

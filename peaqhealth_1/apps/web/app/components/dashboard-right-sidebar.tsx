"use client"

import React from "react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "-apple-system, BlinkMacSystemFont, sans-serif"

interface DashboardRightSidebarProps {
  modifiers: Array<{
    id: string
    panels: string[]
    direction: "penalty" | "bonus"
    points: number
    label: string
    rationale: string
  }>
  modifierTotal: number
  score: number
}

const panelTagColor = (panels: string[]): string => {
  if (panels.includes("sleep")) return "#185FA5"
  if (panels.includes("blood")) return "#A32D2D"
  return "#3B6D11"
}

const chipColors: Record<string, { border: string; text: string; bg: string }> = {
  sleep: { border: "rgba(24,95,165,0.35)", text: "rgba(24,95,165,0.75)", bg: "rgba(24,95,165,0.08)" },
  blood: { border: "rgba(163,45,45,0.35)", text: "rgba(163,45,45,0.75)", bg: "rgba(163,45,45,0.08)" },
  oral:  { border: "rgba(59,109,17,0.35)", text: "rgba(59,109,17,0.75)", bg: "rgba(59,109,17,0.08)" },
}

export function DashboardRightSidebar({ modifiers, modifierTotal, score }: DashboardRightSidebarProps) {
  const baseScore = score - modifierTotal
  const modSign = modifierTotal > 0 ? "+" : ""

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      height: "100%",
    }}>
      {/* Top — Insights (white) */}
      <div style={{
        padding: "14px 16px",
        borderBottom: "0.5px solid rgba(0,0,0,0.06)",
        flexShrink: 0,
        background: "#fff",
        animation: "rsidebarIn 400ms ease both",
        animationDelay: "200ms",
      }}>
        <div style={{
          fontFamily: sans, fontSize: 9,
          letterSpacing: "2px", textTransform: "uppercase",
          color: "#bbb", marginBottom: 12,
        }}>
          Top Insights
        </div>

        {modifiers.slice(0, 3).map((m, i, arr) => (
          <div key={m.id} style={{
            padding: "8px 0",
            borderBottom: i < arr.length - 1 ? "0.5px solid rgba(0,0,0,0.04)" : "none",
          }}>
            <div style={{
              fontFamily: sans, fontSize: 8,
              letterSpacing: "1.5px", textTransform: "uppercase",
              fontWeight: 600,
              color: panelTagColor(m.panels),
              marginBottom: 3,
            }}>
              {m.panels.join(" \u00D7 ")}
            </div>
            <div style={{
              fontFamily: sans, fontSize: 11,
              color: "#555", lineHeight: 1.55,
            }}>
              {m.label}
            </div>
          </div>
        ))}

        {modifiers.length === 0 && (
          <div style={{ fontFamily: sans, fontSize: 11, color: "#bbb", lineHeight: 1.55 }}>
            Complete all three panels to unlock cross-panel insights.
          </div>
        )}
      </div>

      {/* Bottom — Cross-panel signals (dark) */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        background: "#16150F",
        padding: 16,
        animation: "rsidebarIn 400ms ease both",
        animationDelay: "300ms",
      }}>
        <div style={{
          fontFamily: sans, fontSize: 9,
          letterSpacing: "2px", textTransform: "uppercase",
          color: "rgba(255,255,255,0.28)",
          marginBottom: 4,
        }}>
          Cross-Panel Signals
        </div>

        <div style={{
          fontFamily: serif, fontSize: 42,
          color: "#C49A3C", lineHeight: 1,
        }}>
          {modifierTotal > 0 ? "+" : ""}{modifierTotal}
        </div>

        <div style={{
          fontFamily: sans, fontSize: 10,
          color: "rgba(255,255,255,0.28)",
          marginBottom: 14,
        }}>
          {baseScore} base &middot; {modSign}{modifierTotal} applied
        </div>

        {/* Modifier items */}
        {modifiers.map((m, i) => (
          <div key={m.id} style={{
            padding: "10px 0",
            borderBottom: i < modifiers.length - 1 ? "0.5px solid rgba(255,255,255,0.06)" : "none",
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
              <span style={{
                fontFamily: sans, fontSize: 12, fontWeight: 500,
                color: m.direction === "penalty" ? "#E24B4A" : "#C49A3C",
              }}>
                {m.direction === "penalty" ? "\u2212" : "+"}{m.points}
              </span>
              <span style={{
                fontFamily: sans, fontSize: 11,
                color: "rgba(255,255,255,0.62)",
                lineHeight: 1.3,
              }}>
                {m.label}
              </span>
            </div>
            <div style={{
              fontFamily: sans, fontSize: 10,
              color: "rgba(255,255,255,0.28)",
              lineHeight: 1.5,
              paddingLeft: 32,
            }}>
              {m.rationale}
            </div>
          </div>
        ))}

        {modifiers.length === 0 && (
          <div style={{
            fontFamily: sans, fontSize: 11,
            color: "rgba(255,255,255,0.28)",
            lineHeight: 1.5, marginTop: 8,
          }}>
            No cross-panel signals active yet.
          </div>
        )}

        {/* Hallmark chips */}
        {modifiers.length > 0 && (
          <div style={{
            display: "flex", gap: 6, flexWrap: "wrap",
            marginTop: 14, paddingTop: 14,
            borderTop: "0.5px solid rgba(255,255,255,0.06)",
          }}>
            {[...new Set(modifiers.flatMap(m => m.panels))].map(panel => {
              const c = chipColors[panel] ?? chipColors.sleep
              return (
                <span key={panel} style={{
                  fontFamily: sans, fontSize: 8,
                  letterSpacing: "0.8px", textTransform: "uppercase",
                  padding: "3px 9px", borderRadius: 20,
                  border: `0.5px solid ${c.border}`,
                  color: c.text,
                  background: c.bg,
                  whiteSpace: "nowrap",
                }}>
                  {panel}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

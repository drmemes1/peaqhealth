"use client"

import { useState } from "react"
import type { ConnectionLine } from "@peaq/score-engine"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const DIRECTION_STYLES = {
  unfavorable: { border: "#C0392B", bg: "rgba(192,57,43,0.04)", headline: "#141410" },
  favorable:   { border: "#2D6A4F", bg: "rgba(45,106,79,0.04)", headline: "#0F6E56" },
  exploratory: { border: "#B8860B", bg: "rgba(184,134,11,0.04)", headline: "#854F0B" },
} as const

function SingleConnectionLine({ connection }: { connection: ConnectionLine }) {
  const [expanded, setExpanded] = useState(false)
  const style = DIRECTION_STYLES[connection.direction]

  return (
    <div style={{
      borderLeft: `3px solid ${style.border}`,
      background: style.bg,
      borderRadius: "0 8px 8px 0",
      padding: "14px 16px",
    }}>
      <span style={{
        fontFamily: sans, fontSize: 9, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "#7A7A6E",
        display: "block", marginBottom: 4,
      }}>
        ORAVI CONNECTION
      </span>

      <p style={{
        fontFamily: serif, fontSize: 18, fontStyle: "italic",
        color: style.headline, margin: "0 0 6px", lineHeight: 1.3,
      }}>
        {connection.headline}
      </p>

      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          fontFamily: sans, fontSize: 11, color: "#B8860B",
          background: "none", border: "none", cursor: "pointer",
          padding: 0, marginTop: 6,
        }}
      >
        {expanded ? "Show less ↑" : "Read why →"}
      </button>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          {connection.expanded && (
            <p style={{
              fontFamily: sans, fontSize: 14, fontWeight: 300,
              color: "#7A7A6E", lineHeight: 1.7, margin: "0 0 8px",
            }}>
              {connection.expanded}
            </p>
          )}
          <div style={{
            paddingTop: 8, marginTop: 8,
            borderTop: "0.5px solid rgba(20,20,16,0.08)",
          }}>
            <p style={{
              fontFamily: sans, fontSize: 13, fontWeight: 500,
              color: "#141410", margin: 0, lineHeight: 1.5,
            }}>
              → {connection.action_nudge}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function ConnectionLineCard({ connection }: { connection: ConnectionLine[] }) {
  if (!connection || connection.length === 0) return null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "16px 0" }}>
      {connection.map(c => (
        <SingleConnectionLine key={c.rule_id} connection={c} />
      ))}
    </div>
  )
}

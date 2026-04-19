"use client"

import { useState } from "react"

const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
const serif = "'Cormorant Garamond', Georgia, serif"

type Tab = "picture" | "converge" | "actions"

interface PanelInsightProps {
  picture?: string | null
  converge?: string | null
  actions?: string | null
}

function renderWithPullquotes(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} style={{ color: "#B8860B", fontWeight: 500 }}>{part}</span>
      : <span key={i}>{part}</span>
  )
}

export function PanelInsight({ picture, converge, actions }: PanelInsightProps) {
  const [tab, setTab] = useState<Tab>("picture")
  const hasAny = picture || converge || actions

  if (!hasAny) return null

  const tabs: { key: Tab; label: string }[] = [
    { key: "picture", label: "Overall picture" },
    { key: "converge", label: "Converge" },
    { key: "actions", label: "What you can do" },
  ]

  const content = tab === "picture" ? picture : tab === "converge" ? converge : actions

  return (
    <div style={{
      borderLeft: "3px solid #B8860B",
      borderRadius: 10,
      background: "linear-gradient(135deg, #FDFAF2, #FAFAF8)",
      overflow: "hidden",
      marginTop: 32,
    }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #E8E6E0" }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: "12px 16px",
              background: "transparent",
              border: "none",
              borderBottom: tab === t.key ? "2px solid #B8860B" : "2px solid transparent",
              fontFamily: sans,
              fontSize: 12,
              fontWeight: tab === t.key ? 600 : 400,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: tab === t.key ? "#B8860B" : "#9B9891",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "20px 24px", minHeight: 120 }}>
        {content ? (
          <p style={{
            fontFamily: serif,
            fontSize: 15,
            fontStyle: "italic",
            color: "#3D3B35",
            lineHeight: 1.65,
            margin: 0,
          }}>
            {renderWithPullquotes(content)}
          </p>
        ) : (
          <p style={{
            fontFamily: sans,
            fontSize: 13,
            color: "#9B9891",
            fontStyle: "italic",
            margin: 0,
          }}>
            {tab === "picture" ? "Your overall picture will appear here once your data is processed."
              : tab === "converge" ? "Cross-panel connections will appear here as more panels are completed."
              : "Personalised recommendations will appear here based on your results."}
          </p>
        )}
      </div>
    </div>
  )
}

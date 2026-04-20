"use client"

import { useState, useEffect, type ReactNode } from "react"

const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
const serif = "'Cormorant Garamond', Georgia, serif"

type Tab = "picture" | "converge" | "actions"
type TabData = { content: string | null; pullquotes: string[]; citations: string[] }

interface PanelInsightProps {
  panel: "oral" | "blood" | "sleep"
  fallback?: { picture?: string | null; converge?: string | null; actions?: string | null }
}

const ROUTES: Record<Tab, Record<string, string>> = {
  picture: { oral: "/api/oral/panel-summary", blood: "/api/blood/panel-summary", sleep: "/api/sleep/panel-summary" },
  converge: { oral: "/api/oral/converge", blood: "/api/blood/converge", sleep: "/api/sleep/converge" },
  actions: { oral: "/api/oral/questions", blood: "/api/blood/questions", sleep: "/api/sleep/questions" },
}

function renderWithPullquotes(text: string, pullquotes: string[]): ReactNode {
  if (!pullquotes.length) return text
  const parts: ReactNode[] = []
  let remaining = text
  let key = 0
  for (const pq of pullquotes) {
    const idx = remaining.indexOf(pq)
    if (idx === -1) continue
    if (idx > 0) parts.push(remaining.slice(0, idx))
    parts.push(<span key={key++} style={{ color: "#B8860B", fontWeight: 500 }}>{pq}</span>)
    remaining = remaining.slice(idx + pq.length)
  }
  if (remaining) parts.push(remaining)
  return <>{parts}</>
}

export function PanelInsight({ panel, fallback }: PanelInsightProps) {
  const [tab, setTab] = useState<Tab>("picture")
  const [data, setData] = useState<Record<Tab, TabData | null>>({ picture: null, converge: null, actions: null })
  const [loading, setLoading] = useState<Record<Tab, boolean>>({ picture: false, converge: false, actions: false })

  useEffect(() => {
    const fetchTab = async (t: Tab) => {
      const route = ROUTES[t][panel]
      if (!route) return
      setLoading(prev => ({ ...prev, [t]: true }))
      try {
        const res = await fetch(route)
        if (res.ok) {
          const json = await res.json() as TabData
          if (json.content) setData(prev => ({ ...prev, [t]: json }))
        }
      } catch { /* silent */ }
      setLoading(prev => ({ ...prev, [t]: false }))
    }
    fetchTab("picture")
    fetchTab("converge")
    fetchTab("actions")
  }, [panel])

  const tabs: { key: Tab; label: string }[] = [
    { key: "picture", label: "Overall picture" },
    { key: "converge", label: "Converge" },
    { key: "actions", label: "Questions to discuss" },
  ]

  const current = data[tab]
  const fallbackContent = tab === "picture" ? fallback?.picture : tab === "converge" ? fallback?.converge : fallback?.actions
  const content = current?.content ?? fallbackContent
  const pullquotes = current?.pullquotes ?? []

  return (
    <div style={{
      borderLeft: "3px solid #B8860B", borderRadius: 10,
      background: "linear-gradient(135deg, #FDFAF2, #FAFAF8)",
      overflow: "hidden", marginTop: 32,
    }}>
      <div style={{ display: "flex", borderBottom: "1px solid #E8E6E0" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "12px 16px", background: "transparent", border: "none",
            borderBottom: tab === t.key ? "2px solid #B8860B" : "2px solid transparent",
            fontFamily: sans, fontSize: 12, fontWeight: tab === t.key ? 600 : 400,
            letterSpacing: "0.06em", textTransform: "uppercase",
            color: tab === t.key ? "#B8860B" : "#9B9891", cursor: "pointer",
            transition: "color 0.15s, border-color 0.15s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 24px", minHeight: 120 }}>
        {loading[tab] ? (
          <p style={{ fontFamily: sans, fontSize: 13, color: "#9B9891", fontStyle: "italic", margin: 0 }}>
            Generating...
          </p>
        ) : content ? (
          <>
            <p style={{ fontFamily: serif, fontSize: 15, fontStyle: "italic", color: "#3D3B35", lineHeight: 1.65, margin: 0 }}>
              {renderWithPullquotes(content, pullquotes)}
            </p>
            {current?.citations && current.citations.length > 0 && (
              <p style={{ fontFamily: sans, fontSize: 10, color: "#8C897F", fontStyle: "italic", margin: "12px 0 0" }}>
                {current.citations.join(" · ")}
              </p>
            )}
          </>
        ) : (
          <p style={{ fontFamily: sans, fontSize: 13, color: "#9B9891", fontStyle: "italic", margin: 0 }}>
            {tab === "picture" ? "Your overall picture will appear here once your data is processed."
              : tab === "converge" ? "Converge insights will appear here as more panels are completed."
              : "Questions to discuss with your provider will appear here based on your results."}
          </p>
        )}
      </div>
    </div>
  )
}

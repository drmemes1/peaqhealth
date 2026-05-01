"use client"

import { useState, useMemo } from "react"
import Link from "next/link"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const PANEL_COLORS: Record<string, string> = {
  oral: "#2D6A4F", blood: "#C0392B", sleep: "#4A7FB5", lifestyle: "#B8860B",
}

export interface ArticleItem {
  slug: string
  title: string
  summary: string
  readTime: number
  primaryPanel: string | null
}

type Filter = "all" | "oral" | "blood" | "sleep" | "lifestyle"

export function LearnGrid({ items }: { items: ArticleItem[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(a => {
      if (filter !== "all" && a.primaryPanel !== filter) return false
      if (!q) return true
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        (a.primaryPanel ?? "").toLowerCase().includes(q)
      )
    })
  }, [items, query, filter])

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `All (${items.length})` },
    { key: "oral", label: "Oral" },
    { key: "blood", label: "Blood" },
    { key: "sleep", label: "Sleep" },
    { key: "lifestyle", label: "Lifestyle" },
  ]

  return (
    <>
      {/* Search + filter bar */}
      <div style={{ marginBottom: 28 }}>
        <input
          type="search"
          placeholder="Search articles…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: "100%", fontFamily: sans, fontSize: 14, color: "#141410",
            background: "#FFFFFF", border: "0.5px solid #D6D3C8",
            borderRadius: 8, padding: "12px 14px", outline: "none", marginBottom: 12,
          }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {filters.map(f => {
            const active = filter === f.key
            const color = f.key === "all" ? "#141410" : PANEL_COLORS[f.key] ?? "#141410"
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  fontFamily: sans, fontSize: 11, fontWeight: 500,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  padding: "6px 12px", borderRadius: 20, cursor: "pointer",
                  border: `1px solid ${active ? color : "#D6D3C8"}`,
                  background: active ? color : "transparent",
                  color: active ? "#FFFFFF" : "#7A7A6E",
                  transition: "all 0.15s",
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontFamily: sans, fontSize: 14, color: "#7A7A6E", textAlign: "center", padding: 40 }}>
          No articles match your search.
        </p>
      ) : (
        <div className="learn-grid" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
        }}>
          {filtered.map(a => {
            const panelColor = PANEL_COLORS[a.primaryPanel ?? ""] ?? "#7A7A6E"
            return (
              <Link
                key={a.slug}
                href={`/learn/${a.slug}`}
                style={{
                  textDecoration: "none", display: "block",
                  background: "#FFFFFF", border: "0.5px solid #EDE9E0",
                  borderRadius: 12, padding: "22px 24px",
                  boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
                  transition: "transform 150ms ease, box-shadow 150ms ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(20,20,16,0.08)" }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 3px rgba(20,20,16,0.06)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  {a.primaryPanel && (
                    <span style={{
                      fontFamily: sans, fontSize: 9, letterSpacing: "0.1em",
                      textTransform: "uppercase", fontWeight: 600,
                      color: panelColor, background: `${panelColor}14`,
                      border: `0.5px solid ${panelColor}30`,
                      borderRadius: 20, padding: "2px 10px",
                    }}>
                      {a.primaryPanel}
                    </span>
                  )}
                  <span style={{ fontFamily: sans, fontSize: 11, color: "#7A7A6E" }}>
                    {a.readTime} min read
                  </span>
                </div>
                <h2 style={{
                  fontFamily: serif, fontSize: 20, fontWeight: 500,
                  color: "#141410", margin: "0 0 6px", lineHeight: 1.25,
                }}>
                  {a.title}
                </h2>
                <p style={{
                  fontFamily: sans, fontSize: 13, color: "#7A7A6E",
                  lineHeight: 1.55, margin: 0,
                }}>
                  {a.summary}
                </p>
              </Link>
            )
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .learn-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}

"use client"

import Link from "next/link"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const PANEL_COLORS: Record<string, string> = {
  oral: "#2D6A4F", blood: "#C0392B", sleep: "#4A7FB5", lifestyle: "#B8860B",
}

interface ArticleItem {
  slug: string
  title: string
  summary: string
  readTime: number
  primaryPanel: string | null
}

export function LearnGrid({ items }: { items: ArticleItem[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {items.map(a => {
        const panelColor = PANEL_COLORS[a.primaryPanel ?? ""] ?? "#7A7A6E"
        return (
          <Link
            key={a.slug}
            href={`/learn/${a.slug}`}
            style={{
              textDecoration: "none", display: "block",
              background: "#FFFFFF", border: "0.5px solid #EDE9E0",
              borderRadius: 12, padding: "28px 32px",
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
              fontFamily: serif, fontSize: 26, fontWeight: 400,
              color: "#141410", margin: "0 0 8px", lineHeight: 1.2,
            }}>
              {a.title}
            </h2>
            <p style={{
              fontFamily: sans, fontSize: 14, color: "#7A7A6E",
              lineHeight: 1.6, margin: 0,
            }}>
              {a.summary}
            </p>
          </Link>
        )
      })}
    </div>
  )
}

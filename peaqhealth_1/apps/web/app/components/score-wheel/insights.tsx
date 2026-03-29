"use client"
import { useEffect, useRef, useState } from "react"

interface InsightCardData {
  id: string
  panels: string[]
  headline: string
  body: string
  mechanism: string
  action: string
  category: "POSITIVE" | "WATCH" | "EXPLORE"
  priority: number
  citations?: string[]
}

export interface InsightsProps {
  sleepConnected: boolean
  hasBlood: boolean
  oralActive: boolean
  lifestyleActive?: boolean
  [key: string]: unknown
}

// ── Panel & category styling ───────────────────────────────────────────────────

const PANEL_COLOR: Record<string, string> = {
  blood:     "var(--blood-c)",
  sleep:     "var(--sleep-c)",
  oral:      "var(--oral-c)",
  lifestyle: "var(--gold)",
}

const CATEGORY: Record<string, { bg: string; text: string; label: string; border: string }> = {
  POSITIVE: { bg: "rgba(34,197,94,0.06)",   text: "#15803D", label: "Positive", border: "#22c55e" },
  WATCH:    { bg: "rgba(184,134,11,0.08)",  text: "#92400E", label: "Watch",    border: "#b8860b" },
  EXPLORE:  { bg: "rgba(59,130,246,0.06)",  text: "#1D4ED8", label: "Explore",  border: "#3b82f6" },
}

function PanelTag({ panel }: { panel: string }) {
  const color = PANEL_COLOR[panel.toLowerCase()] ?? "rgba(20,20,16,0.3)"
  return (
    <span style={{
      fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.06em",
      padding: "2px 7px", background: `color-mix(in srgb, ${color} 14%, transparent)`,
      color, fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
    }}>
      {panel}
    </span>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const c = CATEGORY[category] ?? CATEGORY.EXPLORE
  return (
    <span style={{
      fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.06em",
      padding: "3px 8px", background: c.bg, color: c.text,
      fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
    }}>
      {c.label}
    </span>
  )
}

// ── AI insight card ─────────────────────────────────────────────────────────────

function InsightCard({ item, isPrimary }: { item: InsightCardData; isPrimary?: boolean }) {
  const el = useRef<HTMLDivElement>(null)
  const [visible, setVisible]   = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const hasCitations = Array.isArray(item.citations) && item.citations.length > 0

  useEffect(() => {
    const node = el.current
    if (!node) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.08 }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  const cat         = CATEGORY[item.category] ?? CATEGORY.EXPLORE
  const borderColor = cat.border
  // Panel color still used for the Action label
  const panelColor  = item.panels[0]
    ? (PANEL_COLOR[item.panels[0].toLowerCase()] ?? "var(--gold)")
    : "var(--gold)"

  return (
    <div
      ref={el}
      style={{
        background: "white",
        border: "0.5px solid var(--ink-12)",
        borderLeft: `3px solid ${borderColor}`,
        padding: isPrimary ? "20px 22px 18px" : "16px 18px 14px",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.55s ease",
      }}
    >
      {/* Panels + category */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isPrimary ? 10 : 7, flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {item.panels.map(p => <PanelTag key={p} panel={p} />)}
        </div>
        <CategoryBadge category={item.category} />
      </div>

      {/* Headline */}
      <p style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: isPrimary ? 21 : 17, fontWeight: 400,
        color: "var(--ink)", margin: "0 0 8px", lineHeight: 1.25,
      }}>
        {item.headline}
      </p>

      {/* Body */}
      <p style={{
        fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
        fontSize: 12.5, lineHeight: 1.75, color: "var(--ink-60)", margin: "0 0 8px",
      }}>
        {item.body}
      </p>

      {/* Mechanism */}
      <p style={{
        fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
        fontSize: 12, lineHeight: 1.65, color: "rgba(20,20,16,0.42)",
        margin: "0 0 10px", fontStyle: "italic",
      }}>
        {item.mechanism}
      </p>

      {/* Action */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span style={{
          fontSize: 9, fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
          textTransform: "uppercase", letterSpacing: "0.08em",
          color: panelColor, marginTop: 2, flexShrink: 0,
        }}>
          Action
        </span>
        <p style={{
          fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
          fontSize: 12.5, lineHeight: 1.65, color: "var(--ink)", margin: 0, fontWeight: 500,
        }}>
          {item.action}
        </p>
      </div>

      {/* Sources toggle */}
      {hasCitations && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setSourcesOpen(o => !o)}
            style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
              fontSize: 11, color: "rgba(20,20,16,0.35)",
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
          >
            Sources {sourcesOpen ? "↑" : "↓"}
          </button>
          <div style={{
            maxHeight: sourcesOpen ? 300 : 0, overflow: "hidden",
            transition: "max-height 0.3s ease, opacity 0.3s ease",
            opacity: sourcesOpen ? 1 : 0,
          }}>
            <div style={{ paddingTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
              {item.citations!.map((c, i) => (
                <p key={i} style={{
                  fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                  fontSize: 11, fontStyle: "italic", color: "rgba(20,20,16,0.35)",
                  margin: 0, lineHeight: 1.4,
                }}>
                  {c}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ isPrimary }: { isPrimary?: boolean }) {
  return (
    <div style={{
      background: "white",
      border: "0.5px solid var(--ink-12)",
      borderLeft: "3px solid var(--ink-12)",
      padding: isPrimary ? "20px 22px 18px" : "16px 18px 14px",
      animation: "shimmer 1.8s ease-in-out infinite",
    }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:.55}50%{opacity:1}}`}</style>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <div style={{ height: 17, width: 55, background: "var(--ink-06)", borderRadius: 2 }} />
        <div style={{ height: 17, width: 45, background: "var(--ink-06)", borderRadius: 2 }} />
      </div>
      <div style={{ height: isPrimary ? 26 : 20, background: "var(--ink-06)", borderRadius: 2, marginBottom: 8, width: "72%" }} />
      <div style={{ height: 13, background: "var(--ink-06)", borderRadius: 2, marginBottom: 5 }} />
      <div style={{ height: 13, background: "var(--ink-06)", borderRadius: 2, marginBottom: 5, width: "88%" }} />
      <div style={{ height: 13, background: "var(--ink-06)", borderRadius: 2, marginBottom: 12, width: "62%" }} />
      <div style={{ height: 13, background: "var(--ink-06)", borderRadius: 2, width: "78%" }} />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function Insights({ sleepConnected, hasBlood, oralActive, lifestyleActive }: InsightsProps) {
  const [loading, setLoading] = useState(true)
  const [cards, setCards]     = useState<InsightCardData[]>([])

  const anyData = sleepConnected || hasBlood || oralActive || !!lifestyleActive

  useEffect(() => {
    if (!anyData) { setLoading(false); return }
    fetch("/api/labs/insight")
      .then(r => r.ok ? r.json() as Promise<InsightCardData[]> : Promise.reject())
      .then(d => {
        setCards(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [anyData])

  if (!anyData) return null

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 300, color: "var(--ink)", margin: 0 }}>
          Insights
        </h3>
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <style>{`
              @keyframes dotPulse{0%,100%{opacity:.2}50%{opacity:1}}
            `}</style>
            {[0, 0.4, 0.8].map((delay, i) => (
              <span key={i} style={{
                fontSize: 24, color: "rgba(20,20,16,0.3)",
                animation: `dotPulse 1.2s ease-in-out ${delay}s infinite`,
                lineHeight: 1,
              }}>·</span>
            ))}
          </span>
        ) : (
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-30)" }}>
            AI · Tailored to your data
          </span>
        )}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Skeleton isPrimary />
          <Skeleton />
          <Skeleton />
        </div>
      )}

      {/* AI insight cards */}
      {!loading && cards.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cards.map((card, i) => (
            <InsightCard key={card.id ?? i} item={card} isPrimary={i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}

"use client"
import { useEffect, useRef, useState } from "react"

interface InsightItem {
  title: string
  finding: string
  mechanism: string
  action: string
  urgency: "routine" | "watch" | "act"
  panels: string[]
}

interface AIInsightData {
  primaryFinding?: InsightItem
  insights?: InsightItem[]
  trajectoryNote?: string
  allPanelsBonus?: string
}

export interface InsightsProps {
  sleepConnected: boolean
  hasBlood: boolean
  oralActive: boolean
  lifestyleActive?: boolean
  // legacy individual props — kept for call-site compat, unused in rendering
  [key: string]: unknown
}

// ── Panel & urgency styling ────────────────────────────────────────────────────

const PANEL_COLOR: Record<string, string> = {
  blood:     "var(--blood-c)",
  sleep:     "var(--sleep-c)",
  oral:      "var(--oral-c)",
  lifestyle: "var(--gold)",
}

const URGENCY: Record<string, { bg: string; text: string; label: string }> = {
  routine: { bg: "rgba(20,20,16,0.06)",    text: "rgba(20,20,16,0.4)", label: "Routine" },
  watch:   { bg: "rgba(184,134,11,0.12)",  text: "#92400E",            label: "Watch"   },
  act:     { bg: "rgba(220,38,38,0.08)",   text: "#991B1B",            label: "Act"     },
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

function UrgencyBadge({ urgency }: { urgency: string }) {
  const u = URGENCY[urgency] ?? URGENCY.routine
  return (
    <span style={{
      fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.06em",
      padding: "3px 8px", background: u.bg, color: u.text,
      fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
    }}>
      {u.label}
    </span>
  )
}

// ── AI insight card ────────────────────────────────────────────────────────────

function InsightCard({ item, isPrimary }: { item: InsightItem; isPrimary?: boolean }) {
  const el = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

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

  const accentColor = item.panels[0]
    ? (PANEL_COLOR[item.panels[0].toLowerCase()] ?? "var(--gold)")
    : "var(--gold)"

  return (
    <div
      ref={el}
      style={{
        background: "white",
        border: "0.5px solid var(--ink-12)",
        borderLeft: `3px solid ${accentColor}`,
        padding: isPrimary ? "20px 22px 18px" : "16px 18px 14px",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.55s ease",
      }}
    >
      {/* Panels + urgency */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isPrimary ? 10 : 7, flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {item.panels.map(p => <PanelTag key={p} panel={p} />)}
        </div>
        <UrgencyBadge urgency={item.urgency} />
      </div>

      {/* Title */}
      <p style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: isPrimary ? 21 : 17, fontWeight: 400,
        color: "var(--ink)", margin: "0 0 8px", lineHeight: 1.25,
      }}>
        {item.title}
      </p>

      {/* Finding */}
      <p style={{
        fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
        fontSize: 12.5, lineHeight: 1.75, color: "var(--ink-60)", margin: "0 0 8px",
      }}>
        {item.finding}
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
          color: accentColor, marginTop: 2, flexShrink: 0,
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

function isTemplateText(s: string): boolean {
  const lower = s.toLowerCase()
  return (
    lower.includes("only include") ||
    lower.includes("omit this") ||
    lower.includes("if no previous") ||
    lower.includes("previous labs exist") ||
    lower.includes("1-2 sentences") ||
    s.trim().length === 0
  )
}

export function Insights({ sleepConnected, hasBlood, oralActive, lifestyleActive }: InsightsProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData]       = useState<AIInsightData | null>(null)

  const anyData = sleepConnected || hasBlood || oralActive || !!lifestyleActive

  useEffect(() => {
    if (!anyData) { setLoading(false); return }
    fetch("/api/labs/insight")
      .then(r => r.ok ? r.json() as Promise<AIInsightData> : Promise.reject())
      .then(d => { setData(d); setLoading(false) })
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
        <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-30)" }}>
          {loading ? "Analyzing your data…" : "AI · Tailored to your data"}
        </span>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Skeleton isPrimary />
          <Skeleton />
          <Skeleton />
        </div>
      )}

      {/* AI insights */}
      {!loading && data?.primaryFinding && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Trajectory banner */}
          {data.trajectoryNote && !isTemplateText(data.trajectoryNote) && (
            <div style={{
              padding: "10px 14px",
              background: "rgba(184,134,11,0.06)",
              border: "0.5px solid rgba(184,134,11,0.22)",
            }}>
              <span style={{
                display: "block", marginBottom: 3,
                fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                fontSize: 9, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.08em", color: "#B8860B",
              }}>
                Since your last labs
              </span>
              <p style={{
                fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                fontSize: 12.5, lineHeight: 1.6, color: "rgba(20,20,16,0.6)", margin: 0,
              }}>
                {data.trajectoryNote}
              </p>
            </div>
          )}

          {/* Primary finding — larger */}
          <InsightCard item={data.primaryFinding} isPrimary />

          {/* Supporting insights */}
          {(data.insights ?? []).map((insight, i) => (
            <InsightCard key={i} item={insight} />
          ))}

          {/* Full Peaqture Unlocked */}
          {data.allPanelsBonus && (
            <div style={{
              background: "rgba(184,134,11,0.035)",
              border: "1px solid var(--gold)",
              padding: "20px 22px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "var(--gold)" }}>✦</span>
                <span style={{
                  fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                  fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em",
                  color: "var(--gold)", fontWeight: 600,
                }}>
                  Full Peaqture Unlocked
                </span>
              </div>
              <p style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 18, fontWeight: 400, color: "var(--ink)",
                margin: "0 0 9px", lineHeight: 1.3,
              }}>
                The complete picture
              </p>
              <p style={{
                fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                fontSize: 12.5, lineHeight: 1.75, color: "var(--ink-60)", margin: 0,
              }}>
                {data.allPanelsBonus}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

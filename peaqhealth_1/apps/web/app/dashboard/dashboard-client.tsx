"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Nav } from "../components/nav"
import { type ScoreWheelProps } from "../components/score-wheel"
import { PushNotificationPrompt } from "../components/push-notification-prompt"
import { IOSInstallBanner } from "../components/ios-install-banner"
import { PanelConvergence } from "../components/panel-convergence"
import { PeaqAgeHero } from "../components/peaq-age-hero"
import { RefreshCw } from "lucide-react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const PANEL_COLORS: Record<string, string> = {
  sleep: "#185FA5",
  blood: "#A32D2D",
  oral:  "#3B6D11",
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface InsightItem {
  panels: string[]
  title: string
  explanation: string
  actions?: string[]
}

interface CrossPanelSignal {
  panels: string[]
  title: string
  description: string
  positive: boolean
  actions?: string[]
}

interface InsightData {
  headline: string
  headline_sub: string
  insights_positive: InsightItem[]
  insights_watch: InsightItem[]
  cross_panel_signals: CrossPanelSignal[]
  panels_available: string[]
}

interface LabHistoryPoint {
  locked_at: string
  total_score: number | null
  blood_score: number | null
  collection_date: string | null
  ldl_mgdl: number | null
  hdl_mgdl: number | null
  hs_crp_mgl: number | null
  vitamin_d_ngml: number | null
}

// ─── Skeleton Loading Components ─────────────────────────────────────────────

function ShimmerBar({ width, height, delay = 0, bg = "rgba(0,0,0,0.06)", radius = 3 }: {
  width: string | number; height: number; delay?: number; bg?: string; radius?: number
}) {
  return (
    <div style={{
      width, height, background: bg, borderRadius: radius,
      animation: "shimmer 1.8s ease-in-out infinite",
      animationDelay: `${delay}ms`,
    }} />
  )
}

function SkeletonInsightCard({ delay = 0 }: { delay?: number }) {
  return (
    <div style={{
      background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
      borderRadius: 10, padding: "18px 20px",
    }}>
      <ShimmerBar width={60} height={16} delay={delay} />
      <div style={{ marginTop: 10 }}><ShimmerBar width="80%" height={14} delay={delay + 200} /></div>
      <div style={{ marginTop: 6 }}><ShimmerBar width="55%" height={14} delay={delay + 400} /></div>
      <div style={{ marginTop: 12 }}><ShimmerBar width="100%" height={10} bg="rgba(0,0,0,0.04)" radius={2} delay={delay + 600} /></div>
      <div style={{ marginTop: 4 }}><ShimmerBar width="75%" height={10} bg="rgba(0,0,0,0.04)" radius={2} delay={delay + 800} /></div>
    </div>
  )
}

function SkeletonSignalRow({ delay = 0 }: { delay?: number }) {
  return (
    <div style={{ padding: "14px 0", borderBottom: "0.5px solid rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <ShimmerBar width={48} height={16} delay={delay} />
        <ShimmerBar width={48} height={16} delay={delay + 200} />
      </div>
      <div style={{ marginBottom: 4 }}><ShimmerBar width={200} height={13} delay={delay + 400} /></div>
      <ShimmerBar width={320} height={10} bg="rgba(0,0,0,0.04)" radius={2} delay={delay + 600} />
    </div>
  )
}

// ─── Panel Tag Pill ───────────────────────────────────────────���──────────────

function PanelPill({ panel }: { panel: string }) {
  const color = PANEL_COLORS[panel] ?? "#8C8A82"
  return (
    <span style={{
      fontFamily: sans, fontSize: 8, letterSpacing: "1px",
      textTransform: "uppercase", fontWeight: 600,
      color, background: `${color}14`, border: `0.5px solid ${color}30`,
      borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {panel}
    </span>
  )
}

// ─── "See why" Expandable ────────────────────────────────────────────────────

function SeeWhy({ title, explanation, panels }: { title: string; explanation: string; panels: string[] }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)

  const expand = useCallback(async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (content) return // already loaded
    setLoading(true)
    try {
      const res = await fetch("/api/insights/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insight_title: title, insight_explanation: explanation, panels }),
      })
      if (!res.ok || !res.body) { setContent("Unable to load explanation."); setLoading(false); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setContent(text)
      }
    } catch { setContent("Unable to load explanation.") }
    finally { setLoading(false) }
  }, [open, content, title, explanation, panels])

  return (
    <div>
      <button onClick={expand} style={{
        fontFamily: sans, fontSize: 11, color: "#9A7200",
        textTransform: "uppercase", letterSpacing: "1px",
        background: "none", border: "none", cursor: "pointer", padding: 0,
        marginTop: 8, display: "block",
      }}>
        {open ? "Close" : "See why →"}
      </button>
      {open && (
        <div style={{
          marginTop: 10, padding: "12px 14px",
          background: "#F6F4EF", borderRadius: 8,
          borderLeft: "2px solid rgba(196,154,60,0.3)",
        }}>
          {loading && !content ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0" }}>
              <span style={{
                display: "inline-block", width: 8, height: 8,
                borderRadius: "50%", background: "#C49A3C",
                animation: "seeWhyPulse 1.2s ease-in-out infinite",
              }} />
              <span style={{
                fontFamily: sans, fontSize: 9, color: "#bbb",
                letterSpacing: "1px", marginTop: 10,
                animation: "seeWhyFadeIn 300ms ease 600ms both",
              }}>
                Analyzing your data...
              </span>
            </div>
          ) : (
            <p style={{ fontFamily: sans, fontSize: 12, color: "#555", lineHeight: 1.65, margin: 0 }}>
              {content}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Cross-Panel Signal Row ──────────────────────────────────────────────────

function SignalRow({ signal }: { signal: CrossPanelSignal }) {
  return (
    <div style={{ padding: "14px 0", borderBottom: "0.5px solid rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
          background: signal.positive ? "#3B6D11" : "#D4A017",
        }} />
        {signal.panels.map(p => <PanelPill key={p} panel={p} />)}
      </div>
      <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 400, color: "#1a1a18", marginBottom: 4 }}>
        {signal.title}
      </div>
      <div style={{ fontFamily: sans, fontSize: 11, color: "#8C8A82", lineHeight: 1.5 }}>
        {signal.description}
      </div>
      <SeeWhy title={signal.title} explanation={signal.description} panels={signal.panels} />
    </div>
  )
}

// ─── Insight Card ────────────────────────────────────────────────────────────

function InsightCard({ item, type, dimmed }: { item: InsightItem; type: "positive" | "watch"; dimmed?: boolean }) {
  const borderColor = type === "positive" ? "#3B6D11" : "#C49A3C"
  return (
    <div style={{
      background: "#fff",
      border: "0.5px solid rgba(0,0,0,0.06)",
      borderRadius: 10,
      borderLeft: `3px solid ${borderColor}`,
      padding: "16px 18px",
      opacity: dimmed ? 0.4 : 1,
      position: "relative",
    }}>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
        {item.panels.map(p => <PanelPill key={p} panel={p} />)}
      </div>
      <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: "#1a1a18", marginBottom: 4 }}>
        {item.title}
      </div>
      <div style={{ fontFamily: sans, fontSize: 11, color: "#8C8A82", lineHeight: 1.5 }}>
        {item.explanation}
      </div>
      <SeeWhy title={item.title} explanation={item.explanation} panels={item.panels} />
    </div>
  )
}

// ─── Triangle Watermark ──────────────────────────────────────────────────────

function TriangleWatermark() {
  return (
    <div style={{
      position: "absolute", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      width: 320, height: 320, pointerEvents: "none", opacity: 0.04,
    }}>
      <svg viewBox="0 0 400 400" style={{ width: "100%", height: "100%" }}>
        <polygon
          points="200,55 55,305 345,305"
          fill="none" stroke="#1a1a18" strokeWidth="2"
        />
      </svg>
    </div>
  )
}

// ─── Panel Card ─────────────────────────────────────────────────────────────

function PanelCard({ name, color, href, delta, metrics, freshness }: {
  name: string; color: string; href: string; delta: number
  metrics: { label: string; value: string; bar: number }[]
  freshness?: string
}) {
  const deltaColor = delta < -0.1 ? "#34d399" : delta > 0.1 ? "#f87171" : "rgba(250,250,248,0.4)"
  const deltaStr = delta < 0 ? `${delta.toFixed(2)} yrs` : delta > 0 ? `+${delta.toFixed(2)} yrs` : "0.00 yrs"
  const status = delta < -0.1 ? "Positive" : delta > 0.5 ? "Attention" : "On Pace"
  const statusColor = delta < -0.1 ? "#34d399" : delta > 0.5 ? "#f87171" : "#fbbf24"

  return (
    <a href={href} style={{
      background: "var(--card-bg, rgba(250,250,248,0.04))",
      border: "var(--card-border, 0.5px solid rgba(250,250,248,0.10))",
      borderRadius: 12, padding: "18px 16px", textDecoration: "none",
      display: "flex", flexDirection: "column", gap: 12,
      transition: "border-color 200ms ease",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40` }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(250,250,248,0.10)" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
          <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-primary, #FAFAF8)" }}>
            {name}
          </span>
        </div>
        <span style={{
          fontFamily: sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase",
          padding: "2px 10px", borderRadius: 20,
          background: `${statusColor}18`, color: statusColor, border: `0.5px solid ${statusColor}40`,
        }}>
          {status}
        </span>
      </div>
      <span style={{ fontFamily: serif, fontSize: 16, fontStyle: "italic", color: deltaColor, lineHeight: 1 }}>
        {deltaStr}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: sans, fontSize: 9, color: "var(--text-muted, rgba(250,250,248,0.45))", width: 52, textAlign: "right", flexShrink: 0 }}>
              {m.label}
            </span>
            <div style={{ flex: 1, height: 3, background: "rgba(250,250,248,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${Math.max(0, Math.min(100, m.bar * 100))}%`, height: "100%", background: color, borderRadius: 2, opacity: 0.7 }} />
            </div>
            <span style={{ fontFamily: sans, fontSize: 10, color: "var(--text-primary, #FAFAF8)", width: 48, textAlign: "right", flexShrink: 0 }}>
              {m.value}
            </span>
          </div>
        ))}
      </div>
      {freshness && (
        <span style={{ fontFamily: sans, fontSize: 9, color: "var(--text-muted, rgba(250,250,248,0.45))" }}>
          {freshness}
        </span>
      )}
    </a>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DashboardClient(props: ScoreWheelProps & {
  labHistory?: LabHistoryPoint[];
  wearableNeedsReconnect?: boolean;
  firstName?: string;
  latestSleepDate?: string | null;
  trendDeltas?: { sleep: number | null; blood: number | null; oral: number | null };
  peaqAgeBreakdown?: Record<string, unknown> | null;
}) {
  const { wearableNeedsReconnect = false, firstName, latestSleepDate, trendDeltas, peaqAgeBreakdown } = props

  // ── Insight data state ─────────────────────────────────────────────────────
  const [insights, setInsights] = useState<InsightData | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/insights/generate", { method: "POST" })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setInsights(data)
        }
      } catch (e) { console.error("[insights] load error:", e) }
      finally { if (!cancelled) setInsightsLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Sync logic (kept from original) ────────────────────────────────────────
  const [syncingNow, setSyncingNow] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const handleSyncNow = async () => {
    setSyncingNow(true)
    setSyncResult(null)
    try {
      const res = await fetch("/api/sync/now", { method: "POST" })
      if (res.status === 429) setSyncResult("Rate limited — try again in an hour")
      else if (res.ok) {
        const data = await res.json() as { records?: number }
        setSyncResult(`Synced ${data.records ?? 0} nights`)
        setTimeout(() => window.location.reload(), 1500)
      } else setSyncResult("Sync failed — try again later")
    } catch { setSyncResult("Sync failed — try again later") }
    finally { setSyncingNow(false) }
  }

  // ── Sleep toggle (persisted in localStorage, shared with landing page) ──────
  const [sleepHidden, setSleepHidden] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("peaq-sleep-panel-hidden") === "true"
  })
  const toggleSleep = () => {
    const next = !sleepHidden
    setSleepHidden(next)
    localStorage.setItem("peaq-sleep-panel-hidden", next ? "true" : "false")
  }

  // Determine available panels
  const hasSleep = !sleepHidden && props.sleepConnected && props.breakdown.sleepSub > 0
  const hasBlood = !!props.bloodData
  const hasOral  = props.oralActive

  // Cross-panel signals: separate positive/negative
  const crossPanelNeg = (insights?.cross_panel_signals ?? []).filter(s => !s.positive)
  const crossPanelPos = (insights?.cross_panel_signals ?? []).filter(s => s.positive)
  const hasCrossPanel = (insights?.cross_panel_signals ?? []).length > 0
  const panelCount = [hasSleep, hasBlood, hasOral].filter(Boolean).length

  return (
    <div className="min-h-svh" style={peaqAgeBreakdown ? {
      background: "#141410",
      // Card baseline CSS custom properties — all child panel components
      // use var(--card-bg) etc. so they adapt to dark mode automatically.
      "--card-bg":      "rgba(250,250,248,0.04)",
      "--card-border":  "0.5px solid rgba(250,250,248,0.10)",
      "--text-primary": "#FAFAF8",
      "--text-muted":   "rgba(250,250,248,0.45)",
    } as React.CSSProperties : { background: "#F6F4EF" }}>
      <Nav />
      <main className="mx-auto" style={{ maxWidth: 760, padding: "28px 24px 60px" }}>

        {/* Reconnect banner */}
        {wearableNeedsReconnect && (
          <div style={{
            background: "rgba(154,114,0,0.08)",
            border: "0.5px solid rgba(154,114,0,0.25)",
            borderRadius: 8, padding: "14px 18px", marginBottom: 20,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          }}>
            <p style={{ fontFamily: sans, fontSize: 13, color: "#9A7200", margin: 0, lineHeight: 1.5 }}>
              Your {({ whoop: "WHOOP", oura: "Oura Ring", garmin: "Garmin", fitbit: "Fitbit" } as Record<string,string>)[props.wearableProvider ?? ""] ?? "wearable"} connection expired.
            </p>
            <Link href="/settings" style={{
              fontFamily: sans, fontSize: 12, fontWeight: 500,
              letterSpacing: "0.06em", textTransform: "uppercase",
              color: "#9A7200", textDecoration: "none", whiteSpace: "nowrap",
            }}>
              Reconnect →
            </Link>
          </div>
        )}

        <PushNotificationPrompt />

        {/* ── HEADER ROW — date + sync button ──────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 8,
        }}>
          <span style={{
            fontFamily: sans, fontSize: 10, letterSpacing: "1.5px",
            textTransform: "uppercase", color: "rgba(20,20,16,0.35)",
          }}>
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
          </span>

          {props.sleepConnected && !wearableNeedsReconnect && (
            <button
              onClick={handleSyncNow}
              disabled={syncingNow}
              className="sync-btn"
              style={{
                fontFamily: sans, fontSize: 11, color: "rgba(20,20,16,0.4)",
                background: "none", border: "none", cursor: syncingNow ? "default" : "pointer",
                padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: 5,
                transition: "opacity 150ms ease",
              }}
            >
              <RefreshCw
                size={12}
                strokeWidth={1.5}
                style={{
                  animation: syncingNow ? "syncSpin 800ms linear infinite" : "none",
                }}
              />
              <span>{syncResult ?? "sync"}</span>
            </button>
          )}
        </div>

        {/* ── GREETING ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{
            fontFamily: serif, fontSize: 22, fontWeight: 400,
            color: "rgba(20,20,16,0.5)", margin: 0, lineHeight: 1.2,
          }}>
            {(() => {
              const h = new Date().getHours()
              const name = firstName ?? ""
              const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
              return name ? `${greeting}, ${name}.` : `${greeting}.`
            })()}
          </h1>
        </div>

        {/* ── SLEEP TOGGLE ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div
            onClick={toggleSleep}
            style={{
              display: "inline-flex", alignItems: "center",
              background: "#1a1a18", borderRadius: 14, border: "none",
              padding: "4px 5px", cursor: "pointer",
              position: "relative", height: 28, width: 140,
            }}
          >
            <div style={{
              position: "absolute",
              top: 4, left: sleepHidden ? 74 : 4,
              width: 20, height: 20, borderRadius: "50%",
              background: "#C49A3C",
              transition: "left 250ms cubic-bezier(0.4,0.0,0.2,1)",
              zIndex: 1,
            }} />
            <span style={{
              fontFamily: sans, fontSize: 8, letterSpacing: "1px", textTransform: "uppercase",
              color: !sleepHidden ? "#fff" : "rgba(255,255,255,0.35)",
              transition: "color 250ms cubic-bezier(0.4,0.0,0.2,1)",
              flex: 1, textAlign: "center", position: "relative", zIndex: 2,
            }}>
              Wearable
            </span>
            <span style={{
              fontFamily: sans, fontSize: 8, letterSpacing: "1px", textTransform: "uppercase",
              color: sleepHidden ? "#fff" : "rgba(255,255,255,0.35)",
              transition: "color 250ms cubic-bezier(0.4,0.0,0.2,1)",
              flex: 1, textAlign: "center", position: "relative", zIndex: 2,
            }}>
              No wearable
            </span>
          </div>
        </div>

        {/* ── PEAQ AGE HERO (V5) or LEGACY CONVERGENCE ──────────────────── */}
        {peaqAgeBreakdown && typeof peaqAgeBreakdown.peaqAge === "number" ? (<>
          <PeaqAgeHero
            peaqAge={peaqAgeBreakdown.peaqAge as number}
            chronoAge={peaqAgeBreakdown.chronoAge as number}
            delta={peaqAgeBreakdown.delta as number}
            band={(peaqAgeBreakdown.band as string) ?? "ON PACE"}
            phenoAge={peaqAgeBreakdown.phenoAge as number | null}
            firstName={firstName}
            headline={insights?.headline_sub}
          />

          {/* ── WHAT'S WORKING FOR YOU (strengths from Peaq Age deltas) ──── */}
          {(() => {
            const b = peaqAgeBreakdown
            const strengths: { label: string; detail: string; color: string }[] = []

            if (typeof b.phenoDelta === "number" && b.phenoDelta < -1)
              strengths.push({ label: "Metabolic health", detail: `PhenoAge ${(b.phenoAge as number)?.toFixed(1)} — ${Math.abs(b.phenoDelta as number).toFixed(1)} yrs younger than expected`, color: "#C0392B" })
            if (typeof b.omaDelta === "number" && b.omaDelta < -0.5)
              strengths.push({ label: "Oral microbiome", detail: `OMA ${(b.omaPct as number)?.toFixed(0)}th percentile — protective bacteria working for you`, color: "#2D6A4F" })
            if (typeof b.vo2Delta === "number" && b.vo2Delta < -0.5)
              strengths.push({ label: "Cardiorespiratory fitness", detail: `VO₂ max ${(b.vo2Pct as number)}th percentile for your age and sex`, color: "#4A7FB5" })
            if (typeof b.rhrDelta === "number" && b.rhrDelta < -0.3)
              strengths.push({ label: "Resting heart rate", detail: `RHR ${Math.abs(b.rhrDelta as number).toFixed(1)} yrs below expected — cardiovascular conditioning evident`, color: "#4A7FB5" })
            if (typeof b.durDelta === "number" && b.durDelta === 0)
              strengths.push({ label: "Sleep duration", detail: "7-8 hours — optimal range", color: "#4A7FB5" })
            if (typeof b.regDelta === "number" && b.regDelta < 0)
              strengths.push({ label: "Sleep regularity", detail: "Consistent bedtime — associated with lower mortality risk", color: "#4A7FB5" })

            if (strengths.length === 0) return null

            return (
              <div style={{
                background: "var(--card-bg, rgba(250,250,248,0.04))",
                border: "var(--card-border, 0.5px solid rgba(250,250,248,0.10))",
                borderRadius: 12, padding: "20px 22px", marginBottom: 24,
              }}>
                <span style={{
                  fontFamily: sans, fontSize: 9, letterSpacing: "1.5px",
                  textTransform: "uppercase", color: "var(--text-muted, rgba(250,250,248,0.45))",
                  display: "block", marginBottom: 14,
                }}>
                  What&rsquo;s working for you
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {strengths.map(s => (
                    <div key={s.label} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, marginTop: 5, flexShrink: 0, opacity: 0.8 }} />
                      <div>
                        <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: "var(--text-primary, #FAFAF8)", display: "block", lineHeight: 1.3 }}>
                          {s.label}
                        </span>
                        <span style={{ fontFamily: sans, fontSize: 12, color: "var(--text-muted, rgba(250,250,248,0.45))", lineHeight: 1.4 }}>
                          {s.detail}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ── COMPONENT BREAKDOWN BAR ──────────────────────────────────── */}
          {(() => {
            const b = peaqAgeBreakdown
            const components: { label: string; weight: number; delta: number; color: string }[] = [
              { label: "PhenoAge",  weight: (b.wP as number ?? 0), delta: (b.wP as number ?? 0) * (b.phenoDelta as number ?? 0), color: "#C0392B" },
              { label: "OMA",       weight: (b.wO as number ?? 0), delta: (b.wO as number ?? 0) * (b.omaDelta as number ?? 0),   color: "#2D6A4F" },
              { label: "VO₂ max",   weight: (b.wV as number ?? 0), delta: (b.wV as number ?? 0) * (b.vo2Delta as number ?? 0),   color: "#4A7FB5" },
              { label: "RHR",       weight: (b.wR as number ?? 0), delta: (b.wR as number ?? 0) * (b.rhrDelta as number ?? 0),   color: "#4A7FB5" },
              { label: "Sleep",     weight: (b.wD as number ?? 0) + (b.wG as number ?? 0), delta: (b.wD as number ?? 0) * (b.durDelta as number ?? 0) + (b.wG as number ?? 0) * (b.regDelta as number ?? 0), color: "#4A7FB5" },
              { label: "Cross",     weight: (b.crossW as number ?? 0), delta: (b.crossW as number ?? 0) * (b.crossPanel as number ?? 0), color: "#B8860B" },
            ].filter(c => c.weight > 0)
            const maxAbsDelta = Math.max(...components.map(c => Math.abs(c.delta)), 0.1)

            return (
              <div style={{
                background: "var(--card-bg, rgba(250,250,248,0.04))",
                border: "var(--card-border, 0.5px solid rgba(250,250,248,0.10))",
                borderRadius: 12, padding: "18px 20px", marginBottom: 24,
              }}>
                <span style={{
                  fontFamily: sans, fontSize: 9, letterSpacing: "1.5px",
                  textTransform: "uppercase", color: "var(--text-muted, rgba(250,250,248,0.45))",
                  display: "block", marginBottom: 14,
                }}>
                  Component breakdown
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {components.map(c => (
                    <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: sans, fontSize: 10, color: "var(--text-muted, rgba(250,250,248,0.45))", width: 60, textAlign: "right", flexShrink: 0 }}>
                        {c.label}
                      </span>
                      <div style={{ flex: 1, height: 5, background: "rgba(250,250,248,0.04)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                        <div style={{
                          position: "absolute",
                          top: 0, height: "100%", borderRadius: 3,
                          left: c.delta < 0 ? `${50 - (Math.abs(c.delta) / maxAbsDelta) * 50}%` : "50%",
                          width: `${(Math.abs(c.delta) / maxAbsDelta) * 50}%`,
                          background: c.delta < 0 ? "#34d399" : c.delta > 0 ? "#f87171" : "rgba(250,250,248,0.1)",
                          opacity: 0.7,
                        }} />
                        <div style={{ position: "absolute", left: "50%", top: 0, width: "1px", height: "100%", background: "rgba(250,250,248,0.12)" }} />
                      </div>
                      <span style={{ fontFamily: sans, fontSize: 10, width: 48, textAlign: "right", flexShrink: 0, color: c.delta < 0 ? "#34d399" : c.delta > 0 ? "#f87171" : "var(--text-muted, rgba(250,250,248,0.45))" }}>
                        {c.delta < 0 ? "" : "+"}{c.delta.toFixed(2)}
                      </span>
                      <span style={{ fontFamily: sans, fontSize: 9, color: "var(--text-muted, rgba(250,250,248,0.45))", width: 28, textAlign: "right", flexShrink: 0 }}>
                        {Math.round(c.weight * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ── PANEL CARDS (Sleep · Blood · Oral) ──────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
            {/* Sleep card */}
            {hasSleep && props.sleepData && (
              <PanelCard
                name="Sleep" color="#4A7FB5" href="/dashboard/sleep"
                delta={(peaqAgeBreakdown.durDelta as number ?? 0) + (peaqAgeBreakdown.regDelta as number ?? 0)}
                metrics={[
                  { label: "Deep", value: `${props.sleepData.deepPct.toFixed(0)}%`, bar: props.sleepData.deepPct / 25 },
                  { label: "REM", value: `${props.sleepData.remPct.toFixed(0)}%`, bar: props.sleepData.remPct / 25 },
                  { label: "HRV", value: `${props.sleepData.hrv.toFixed(0)} ms`, bar: Math.min(1, props.sleepData.hrv / 60) },
                  { label: "Efficiency", value: `${props.sleepData.efficiency.toFixed(0)}%`, bar: props.sleepData.efficiency / 100 },
                ]}
                freshness={latestSleepDate ? `Last: ${latestSleepDate}` : undefined}
              />
            )}
            {/* Blood card */}
            {hasBlood && props.bloodData && (
              <PanelCard
                name="Blood" color="#C0392B" href="/dashboard/blood"
                delta={peaqAgeBreakdown.phenoDelta as number ?? 0}
                metrics={[
                  { label: "LDL", value: `${props.bloodData.ldl.toFixed(0)}`, bar: Math.min(1, 1 - props.bloodData.ldl / 200) },
                  { label: "HbA1c", value: `${props.bloodData.hba1c.toFixed(1)}%`, bar: Math.min(1, 1 - (props.bloodData.hba1c - 4) / 3) },
                  { label: "hs-CRP", value: props.bloodData.hsCRP > 0 ? `${props.bloodData.hsCRP.toFixed(1)}` : "pending", bar: props.bloodData.hsCRP > 0 ? Math.min(1, 1 - props.bloodData.hsCRP / 5) : 0 },
                  { label: "PhenoAge", value: peaqAgeBreakdown.phenoAge != null ? `${(peaqAgeBreakdown.phenoAge as number).toFixed(1)}` : "needs hs-CRP", bar: 0 },
                ]}
                freshness={props.bloodData.collectionDate ? `Labs: ${props.bloodData.collectionDate}` : undefined}
              />
            )}
            {/* Oral card */}
            {hasOral && props.oralData && (
              <PanelCard
                name="Oral" color="#2D6A4F" href="/dashboard/oral"
                delta={peaqAgeBreakdown.omaDelta as number ?? 0}
                metrics={[
                  { label: "OMA", value: `${(peaqAgeBreakdown.omaPct as number ?? 50).toFixed(0)}th`, bar: (peaqAgeBreakdown.omaPct as number ?? 50) / 100 },
                  { label: "Shannon", value: `${props.oralData.shannonDiversity.toFixed(1)}`, bar: Math.min(1, props.oralData.shannonDiversity / 5) },
                  { label: "Nitrate", value: `${props.oralData.nitrateReducersPct.toFixed(0)}%`, bar: Math.min(1, props.oralData.nitrateReducersPct / 25) },
                  { label: "Pathogen", value: `${props.oralData.periodontPathPct.toFixed(1)}%`, bar: Math.min(1, 1 - props.oralData.periodontPathPct / 5) },
                ]}
              />
            )}
          </div>

          {/* ── ACTION PLAN (ordered by impact × speed) ─────────────────── */}
          {(() => {
            const b = peaqAgeBreakdown
            const mwType = props.lifestyleData?.mouthwashType
            const usesAntiseptic = mwType === "antiseptic" || mwType === "alcohol"
            const noHsCrp = !(b.hasBW && (b.missingPhenoMarkers as string[] ?? []).length === 0)
            const hasNoVO2 = !b.hasVO2
            const omaQcFail = typeof b.omaPct === "number" && (b.omaPct as number) < 40

            const actions: { label: string; timing: string; cost: string }[] = []
            if (usesAntiseptic)
              actions.push({ label: "Switch from antiseptic mouthwash", timing: "Today", cost: "Free" })
            if (omaQcFail)
              actions.push({ label: "Leafy greens or beetroot a few times a week", timing: "Week 1", cost: "~$8/wk" })
            if (noHsCrp)
              actions.push({ label: "Add hs-CRP to next blood draw", timing: "Next draw", cost: "~$15" })
            if (hasNoVO2)
              actions.push({ label: "Complete VO₂ max estimate in Settings", timing: "Today", cost: "Free" })
            if (typeof b.rhrDelta === "number" && (b.rhrDelta as number) > 1)
              actions.push({ label: "Increase aerobic exercise frequency", timing: "This month", cost: "Free" })

            if (actions.length === 0) return null

            return (
              <div style={{
                background: "var(--card-bg, rgba(250,250,248,0.04))",
                border: "var(--card-border, 0.5px solid rgba(250,250,248,0.10))",
                borderRadius: 12, padding: "18px 20px", marginBottom: 24,
              }}>
                <span style={{
                  fontFamily: sans, fontSize: 9, letterSpacing: "1.5px",
                  textTransform: "uppercase", color: "var(--text-muted, rgba(250,250,248,0.45))",
                  display: "block", marginBottom: 14,
                }}>
                  Action plan
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {actions.map((a, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        fontFamily: serif, fontSize: 16, fontWeight: 300,
                        color: "#B8860B", width: 20, textAlign: "center", flexShrink: 0,
                      }}>
                        {i + 1}
                      </span>
                      <span style={{ fontFamily: sans, fontSize: 13, color: "var(--text-primary, #FAFAF8)", flex: 1, lineHeight: 1.4 }}>
                        {a.label}
                      </span>
                      <span style={{ fontFamily: sans, fontSize: 10, color: "var(--text-muted, rgba(250,250,248,0.45))", flexShrink: 0 }}>
                        {a.timing}
                      </span>
                      <span style={{ fontFamily: sans, fontSize: 10, color: "var(--text-muted, rgba(250,250,248,0.45))", flexShrink: 0, width: 48, textAlign: "right" }}>
                        {a.cost}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ── DATA FRESHNESS FOOTER ───────────────────────────────────── */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center",
            padding: "12px 0", borderTop: "0.5px solid rgba(250,250,248,0.06)",
          }}>
            {props.bloodData?.collectionDate && (
              <span style={{ fontFamily: sans, fontSize: 10, color: "var(--text-muted, rgba(250,250,248,0.45))", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#C0392B" }} />
                Blood: {props.bloodData.collectionDate}
              </span>
            )}
            {hasOral && (
              <span style={{ fontFamily: sans, fontSize: 10, color: "var(--text-muted, rgba(250,250,248,0.45))", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#2D6A4F" }} />
                Oral: active
              </span>
            )}
            {hasSleep && latestSleepDate && (
              <span style={{ fontFamily: sans, fontSize: 10, color: "var(--text-muted, rgba(250,250,248,0.45))", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4A7FB5" }} />
                Sleep: {(() => {
                  const nights = props.sleepNightsAvailable ?? 0
                  const src = props.wearableProvider ?? "wearable"
                  return `${nights} nights (${src})`
                })()}
              </span>
            )}
            {/* QC warnings */}
            {peaqAgeBreakdown.phenoAge == null && (peaqAgeBreakdown.hasBW as boolean) && (
              <span style={{ fontFamily: sans, fontSize: 10, color: "#fb923c" }}>
                ⚠ hs-CRP pending — add to next draw
              </span>
            )}
            {!peaqAgeBreakdown.hasVO2 && (
              <span style={{ fontFamily: sans, fontSize: 10, color: "#fb923c" }}>
                ⚠ VO₂ max — complete estimate in Settings
              </span>
            )}
          </div>

        </>) : (
          <div style={{ marginBottom: 12 }}>
            <PanelConvergence
              score={sleepHidden ? props.score - props.breakdown.sleepSub : props.score}
              breakdown={props.breakdown}
              sleepConnected={props.sleepConnected}
            oralActive={props.oralActive}
            hasBlood={hasBlood}
            wearableProvider={props.wearableProvider}
            bloodLabName={props.bloodData?.labName}
            oralKitStatus={props.oralKitStatus}
            sleepHidden={sleepHidden}
            trendDeltas={trendDeltas}
          />
        </div>
        )}

        {/* ── PANEL NAV ANCHORS ───────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, marginBottom: 28,
        }}>
          {[
            { label: "Sleep", href: "#panel-sleep" },
            { label: "Blood", href: "#panel-blood" },
            { label: "Oral", href: "#panel-oral" },
          ].map((nav, i) => (
            <span key={nav.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <span style={{ color: "rgba(20,20,16,0.15)", fontSize: 10 }}>&middot;</span>}
              <a href={nav.href} style={{
                fontFamily: sans, fontSize: 11, letterSpacing: "1px",
                color: "#9A7200", textDecoration: "none", textTransform: "uppercase",
              }}>
                {nav.label}
              </a>
            </span>
          ))}
        </div>

        {/* ── CROSS-PANEL SIGNALS ──────────────────────────────────────────── */}
        {insightsLoading && panelCount >= 2 && (
          <div style={{
            background: "var(--card-bg, #fff)", border: "var(--card-border, 0.5px solid rgba(0,0,0,0.06))",
            borderRadius: 12, padding: 24, marginBottom: 32,
          }}>
            <div style={{ marginBottom: 12 }}>
              <ShimmerBar width={120} height={10} delay={0} />
            </div>
            <SkeletonSignalRow delay={0} />
            <SkeletonSignalRow delay={200} />
          </div>
        )}
        {!insightsLoading && hasCrossPanel && panelCount >= 2 && (
          <div style={{
            background: "var(--card-bg, #fff)", border: "var(--card-border, 0.5px solid rgba(0,0,0,0.06))",
            borderLeft: "3px solid rgba(192,57,43,0.3)",
            borderRadius: 12, padding: 24, marginBottom: 32,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--text-muted, #bbb)" }}>
                Cross-Panel Signals
              </span>
              <span style={{ fontFamily: sans, fontSize: 9, color: "var(--text-muted, #bbb)" }}>
                {(insights?.cross_panel_signals ?? []).length} pattern{(insights?.cross_panel_signals ?? []).length !== 1 ? "s" : ""} detected
              </span>
            </div>

            {/* Negative signals first */}
            {crossPanelNeg.map((s, i) => (
              <SignalRow key={`neg-${i}`} signal={s} />
            ))}

            {/* Divider + positive signals */}
            {crossPanelPos.length > 0 && (
              <>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, margin: "8px 0",
                }}>
                  <div style={{ flex: 1, height: "0.5px", background: "rgba(0,0,0,0.06)" }} />
                  <span style={{ fontFamily: sans, fontSize: 9, color: "#bbb", whiteSpace: "nowrap" }}>
                    Also working together
                  </span>
                  <div style={{ flex: 1, height: "0.5px", background: "rgba(0,0,0,0.06)" }} />
                </div>
                {crossPanelPos.map((s, i) => <SignalRow key={`pos-${i}`} signal={s} />)}
              </>
            )}
          </div>
        )}

        {/* ── 3. INSIGHT GRID — equal height cards, 2-col desktop / 1-col mobile ── */}
        {insightsLoading && (
          <div style={{ marginBottom: 40 }}>
            <div className="insight-grid-headers" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
              <ShimmerBar width={100} height={10} delay={0} />
              <ShimmerBar width={100} height={10} delay={200} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="insight-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <SkeletonInsightCard delay={0} />
                <SkeletonInsightCard delay={100} />
              </div>
              <div className="insight-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <SkeletonInsightCard delay={200} />
                <SkeletonInsightCard delay={300} />
              </div>
            </div>
          </div>
        )}
        {!insightsLoading && insights && ((insights.insights_positive.length > 0) || (insights.insights_watch.length > 0)) && (
          <div style={{ position: "relative", marginBottom: 40 }}>
            <TriangleWatermark />

            {/* Column headers */}
            <div className="insight-grid-headers" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, position: "relative", marginBottom: 12 }}>
              <div style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#3B6D11" }}>
                What&rsquo;s Working
              </div>
              <div style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#C49A3C" }}>
                Worth Watching
              </div>
            </div>

            {/* Paired rows — each row is a 2-col grid so cards match height */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
              {Array.from({ length: Math.max(insights.insights_positive.length, insights.insights_watch.length, 1) }).map((_, i) => {
                const pos = insights.insights_positive[i]
                const watch = insights.insights_watch[i]
                const isSleepOnly = (item: InsightItem | undefined) => item?.panels.length === 1 && item.panels[0] === "sleep"
                return (
                  <div key={i} className="insight-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "stretch" }}>
                    <div style={{ display: "flex" }}>
                      {pos ? (
                        <div style={{ flex: 1 }}>
                          <InsightCard item={pos} type="positive" dimmed={!hasSleep && isSleepOnly(pos)} />
                        </div>
                      ) : (
                        i === 0 ? (
                          <p style={{ fontFamily: sans, fontSize: 11, color: "#bbb", lineHeight: 1.5, padding: "16px 18px" }}>
                            More data needed to identify positive patterns.
                          </p>
                        ) : <div />
                      )}
                    </div>
                    <div style={{ display: "flex" }}>
                      {watch ? (
                        <div style={{ flex: 1 }}>
                          <InsightCard item={watch} type="watch" dimmed={!hasSleep && isSleepOnly(watch)} />
                        </div>
                      ) : (
                        i === 0 ? (
                          <p style={{ fontFamily: sans, fontSize: 11, color: "#bbb", lineHeight: 1.5, padding: "16px 18px" }}>
                            Nothing flagged. Your markers are in range.
                          </p>
                        ) : <div />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Adaptive note for single panel */}
            {panelCount === 1 && (
              <p style={{
                fontFamily: sans, fontSize: 9, color: "#bbb",
                textAlign: "center", marginTop: 16,
              }}>
                {hasOral && !hasBlood ? "Connect blood panel to unlock cross-panel signals" :
                 hasBlood && !hasOral ? "Add oral microbiome test to unlock cross-panel signals" :
                 "Add more panels to unlock cross-panel signals"}
              </p>
            )}
          </div>
        )}

        {/* ── GUIDANCE LINK ─────────────────────────────────────────────────── */}
        {!insightsLoading && panelCount >= 1 && (
          <Link href="/dashboard/guidance" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 0", marginBottom: 24,
            borderTop: "0.5px solid rgba(0,0,0,0.06)",
            textDecoration: "none",
          }}>
            <span style={{ fontFamily: sans, fontSize: 12, color: "#9A7200" }}>
              See full guidance for all signals
            </span>
            <span style={{ fontFamily: sans, fontSize: 12, color: "#9A7200" }}>&rarr;</span>
          </Link>
        )}

        {/* ── 4. PANEL CARDS ──────────────────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 40,
        }}>
          {[
            { key: "sleep", label: "Sleep", color: "#4A7FB5", active: hasSleep, score: props.breakdown.sleepSub, max: 30, href: "/dashboard/sleep", insight: props.sleepData ? `${props.sleepData.hrv.toFixed(0)}ms HRV · ${props.sleepData.deepPct.toFixed(0)}% deep` : undefined },
            { key: "blood", label: "Blood", color: "#C0392B", active: hasBlood, score: props.breakdown.bloodSub, max: 40, href: "/dashboard/blood", insight: props.bloodData ? `hs-CRP ${props.bloodData.hsCRP.toFixed(1)} · LDL ${props.bloodData.ldl.toFixed(0)}` : undefined },
            { key: "oral",  label: "Oral",  color: "#2D6A4F", active: hasOral,  score: props.breakdown.oralSub,  max: 30, href: "/dashboard/oral",  insight: props.oralData ? `Shannon ${props.oralData.shannonDiversity.toFixed(1)} · ${props.oralData.nitrateReducersPct.toFixed(0)}% nitrate` : undefined },
          ].map((p) => (
            p.active ? (
              <Link key={p.key} id={`panel-${p.key}`} href={p.href} style={{
                textDecoration: "none", color: "inherit", display: "block",
                background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
                borderRadius: 12, padding: "20px 24px", cursor: "pointer",
                transition: "transform 150ms cubic-bezier(0.34,1.56,0.64,1)",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: serif, fontSize: 18, color: "#1a1a18" }}>{p.label}</span>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontFamily: serif, fontSize: 48, fontWeight: 300, color: p.color, lineHeight: 1 }}>
                    {Math.round(p.score)}
                  </span>
                  <span style={{ fontFamily: serif, fontSize: 14, color: "#bbb", marginLeft: 4 }}>/{p.max}</span>
                </div>
                {p.insight && (
                  <p style={{
                    fontFamily: sans, fontSize: 11, color: "#8C8A82",
                    lineHeight: 1.5, margin: "0 0 8px",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{p.insight}</p>
                )}

                {/* Wearable pill inside sleep card (Fix 2) */}
                {p.key === "sleep" && (
                  <div style={{ marginTop: 8 }}>
                    {props.sleepConnected ? (
                      <>
                        <span style={{
                          fontFamily: sans, fontSize: 10, color: "#4A7FB5",
                          opacity: 0.7, display: "inline-flex", alignItems: "center", gap: 5,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4A7FB5" }} />
                          {({ whoop: "WHOOP", oura: "Oura", garmin: "Garmin" } as Record<string,string>)[props.wearableProvider ?? ""] ?? "Wearable"}
                        </span>
                        {/* Sync freshness (Fix 3) */}
                        {latestSleepDate && (
                          <span style={{
                            fontFamily: sans, fontSize: 9, color: "rgba(20,20,16,0.3)",
                            display: "block", marginTop: 3,
                          }}>
                            {(() => {
                              const days = Math.floor((Date.now() - new Date(latestSleepDate).getTime()) / 86400000)
                              if (days === 0) return "Synced today"
                              if (days === 1) return "Synced yesterday"
                              return `Synced ${days} days ago`
                            })()}
                          </span>
                        )}
                      </>
                    ) : (
                      <Link href="/settings" onClick={e => e.stopPropagation()} style={{
                        fontFamily: sans, fontSize: 10, color: "rgba(20,20,16,0.35)",
                        textDecoration: "none",
                      }}>
                        + connect wearable
                      </Link>
                    )}
                  </div>
                )}

                <span style={{ fontFamily: sans, fontSize: 9, color: "#9A7200", textTransform: "uppercase", letterSpacing: "1.5px", display: "block", marginTop: p.key === "sleep" ? 4 : 0 }}>
                  View details →
                </span>
              </Link>
            ) : (
              <div key={p.key} id={`panel-${p.key}`} style={{
                background: "transparent",
                border: "0.5px dashed rgba(0,0,0,0.12)",
                borderRadius: 12, padding: "20px 24px",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                minHeight: 140, textAlign: "center",
              }}>
                <span style={{ fontFamily: serif, fontSize: 18, color: "#bbb", marginBottom: 8 }}>{p.label}</span>
                <span style={{ fontFamily: sans, fontSize: 9, color: "#9A7200", textTransform: "uppercase", letterSpacing: "1.5px" }}>
                  Add {p.label.toLowerCase()} →
                </span>
              </div>
            )
          ))}
        </div>
      </main>
      <IOSInstallBanner />
    </div>
  )
}

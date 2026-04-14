"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Nav } from "../components/nav"
import { type ScoreWheelProps } from "../components/score-wheel"
import { PushNotificationPrompt } from "../components/push-notification-prompt"
import { IOSInstallBanner } from "../components/ios-install-banner"
import { PanelConvergence } from "../components/panel-convergence"
import { RefreshCw } from "lucide-react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

// ─── Design System Colors ───────────────────────────────────────────────────
const DS = {
  pageBg:    "#FAFAF8",
  sectionBg: "#F7F5F0",
  cardBg:    "#FFFFFF",
  cardBorder:"#EDE9E0",
  ink:       "#141410",
  inkMuted:  "#7A7A6E",
  gold:      "#B8860B",
  sleep:     "#4A7FB5",
  blood:     "#C0392B",
  oral:      "#2D6A4F",
}

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Skeleton Loaders ───────────────────────────────────────────────────────

function ShimmerBar({ width, height, delay = 0, radius = 3 }: {
  width: string | number; height: number; delay?: number; radius?: number
}) {
  return (
    <div style={{
      width, height, background: "rgba(20,20,16,0.06)", borderRadius: radius,
      animation: "shimmer 1.8s ease-in-out infinite",
      animationDelay: `${delay}ms`,
    }} />
  )
}

function SkeletonCard() {
  return (
    <div style={{
      background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
      borderRadius: 12, padding: 20,
    }}>
      <ShimmerBar width={80} height={10} />
      <div style={{ marginTop: 12 }}><ShimmerBar width="70%" height={14} delay={200} /></div>
      <div style={{ marginTop: 8 }}><ShimmerBar width="50%" height={12} delay={400} /></div>
    </div>
  )
}

// ─── "See why" Expandable ───────────────────────────────────────────────────

function SeeWhy({ title, explanation, panels }: { title: string; explanation: string; panels: string[] }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)

  const expand = useCallback(async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (content) return
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
        fontFamily: sans, fontSize: 11, color: DS.gold,
        textTransform: "uppercase", letterSpacing: "1px",
        background: "none", border: "none", cursor: "pointer", padding: 0,
        marginTop: 8, display: "block",
      }}>
        {open ? "Close" : "See why →"}
      </button>
      {open && (
        <div style={{
          marginTop: 10, padding: "12px 14px",
          background: DS.sectionBg, borderRadius: 8,
          borderLeft: `2px solid rgba(184,134,11,0.3)`,
        }}>
          {loading && !content ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0" }}>
              <span style={{
                display: "inline-block", width: 8, height: 8,
                borderRadius: "50%", background: DS.gold,
                animation: "seeWhyPulse 1.2s ease-in-out infinite",
              }} />
              <span style={{
                fontFamily: sans, fontSize: 9, color: DS.inkMuted,
                letterSpacing: "1px", marginTop: 10,
                animation: "seeWhyFadeIn 300ms ease 600ms both",
              }}>
                Analyzing your data...
              </span>
            </div>
          ) : (
            <p style={{ fontFamily: sans, fontSize: 12, color: DS.inkMuted, lineHeight: 1.65, margin: 0 }}>
              {content}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Cross-Panel Signal Row ─────────────────────────────────────────────────

function PanelPill({ panel }: { panel: string }) {
  const color = ({ sleep: DS.sleep, blood: DS.blood, oral: DS.oral } as Record<string,string>)[panel] ?? DS.inkMuted
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

function SignalRow({ signal }: { signal: CrossPanelSignal }) {
  return (
    <div style={{ padding: "14px 0", borderBottom: `0.5px solid ${DS.cardBorder}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
          background: signal.positive ? DS.oral : DS.gold,
        }} />
        {signal.panels.map(p => <PanelPill key={p} panel={p} />)}
      </div>
      <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 400, color: DS.ink, marginBottom: 4 }}>
        {signal.title}
      </div>
      <div style={{ fontFamily: sans, fontSize: 11, color: DS.inkMuted, lineHeight: 1.5 }}>
        {signal.description}
      </div>
      <SeeWhy title={signal.title} explanation={signal.description} panels={signal.panels} />
    </div>
  )
}

// ─── Panel Node (Sleep / Blood / Oral) ──────────────────────────────────────

type PanelStatus = "Active" | "Review" | "Connect"

function PanelNode({ name, color, status, href }: {
  name: string; color: string; status: PanelStatus; href: string
}) {
  const dotColor = status === "Active" ? DS.oral : status === "Review" ? DS.gold : DS.inkMuted
  return (
    <Link href={href} style={{
      background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
      borderRadius: 12, padding: 20, textDecoration: "none",
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 10, flex: "1 1 0", minWidth: 0,
      boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
      transition: "transform 150ms ease, box-shadow 150ms ease",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(20,20,16,0.08)" }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 3px rgba(20,20,16,0.06)" }}
    >
      <span style={{
        fontFamily: sans, fontSize: 11, letterSpacing: "0.08em",
        textTransform: "uppercase", color: DS.inkMuted, fontWeight: 500,
      }}>
        {name}
      </span>
      <span style={{
        width: 8, height: 8, borderRadius: "50%", background: dotColor,
        ...(status === "Active" ? { animation: "panelDotPulse 3s ease-in-out infinite" } : {}),
      }} />
      <span style={{
        fontFamily: sans, fontSize: 12, color: status === "Connect" ? DS.inkMuted : DS.ink,
        fontWeight: 500,
      }}>
        {status}
      </span>
    </Link>
  )
}

// ─── Connection Lines SVG ───────────────────────────────────────────────────

function ConnectionLines({ statuses }: { statuses: [PanelStatus, PanelStatus, PanelStatus] }) {
  const allActive = statuses.every(s => s !== "Connect")
  const line1Active = statuses[0] !== "Connect" && statuses[1] !== "Connect"
  const line2Active = statuses[1] !== "Connect" && statuses[2] !== "Connect"

  return (
    <svg
      style={{
        position: "absolute", top: "50%", left: 0, width: "100%", height: 2,
        transform: "translateY(-50%)", pointerEvents: "none", overflow: "visible",
      }}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="glow">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={DS.gold} floodOpacity="0.35" />
        </filter>
      </defs>
      {/* Line between card 1 and 2 — ~33% to ~66% */}
      <line
        x1="33%" y1="0" x2="66%" y2="0"
        stroke={DS.gold}
        strokeWidth={1.5}
        opacity={line1Active ? 0.4 : 0.12}
        filter={line1Active && allActive ? "url(#glow)" : undefined}
        style={line1Active && allActive ? { animation: "glowPulse 3s ease-in-out infinite" } : undefined}
      />
      {/* Line between card 2 and 3 — ~33% to ~66% from center */}
      <line
        x1="66%" y1="0" x2="100%" y2="0"
        stroke={DS.gold}
        strokeWidth={1.5}
        opacity={line2Active ? 0.4 : 0.12}
        filter={line2Active && allActive ? "url(#glow)" : undefined}
        style={line2Active && allActive ? { animation: "glowPulse 3s ease-in-out infinite" } : undefined}
      />
    </svg>
  )
}

// ─── Band Chip ──────────────────────────────────────────────────────────────

function BandChip({ band }: { band: string }) {
  const upper = band.toUpperCase()
  const isGood = upper === "EXCEPTIONAL" || upper === "OPTIMIZED"
  const isMid = upper === "ON PACE"
  const bg = isGood ? "#E1F5EE" : isMid ? "#FAEEDA" : "#FCEBEB"
  const color = isGood ? "#0F6E56" : isMid ? "#854F0B" : "#A32D2D"
  const border = color

  return (
    <span style={{
      display: "inline-block", fontFamily: sans, fontSize: 11,
      textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500,
      padding: "4px 14px", borderRadius: 20,
      background: bg, color, border: `1px solid ${border}`,
    }}>
      {band}
    </span>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function DashboardClient(props: ScoreWheelProps & {
  labHistory?: LabHistoryPoint[];
  wearableNeedsReconnect?: boolean;
  firstName?: string;
  latestSleepDate?: string | null;
  trendDeltas?: { sleep: number | null; blood: number | null; oral: number | null };
  peaqAgeBreakdown?: Record<string, unknown> | null;
}) {
  const { wearableNeedsReconnect = false, firstName, latestSleepDate, peaqAgeBreakdown } = props

  // ── Insight data ──────────────────────────────────────────────────────────
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

  // ── Sync logic ────────────────────────────────────────────────────────────
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

  // ── Sleep toggle ──────────────────────────────────────────────────────────
  const [sleepHidden, setSleepHidden] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("peaq-sleep-panel-hidden") === "true"
  })

  const hasSleep = !sleepHidden && props.sleepConnected && props.breakdown.sleepSub > 0
  const hasBlood = !!props.bloodData
  const hasOral  = props.oralActive

  const crossPanelNeg = (insights?.cross_panel_signals ?? []).filter(s => !s.positive)
  const crossPanelPos = (insights?.cross_panel_signals ?? []).filter(s => s.positive)
  const hasCrossPanel = (insights?.cross_panel_signals ?? []).length > 0
  const panelCount = [hasSleep, hasBlood, hasOral].filter(Boolean).length

  // ── Panel statuses ────────────────────────────────────────────────────────
  const sleepStatus: PanelStatus = hasSleep ? "Active" : "Connect"
  const bloodStatus: PanelStatus = hasBlood
    ? (peaqAgeBreakdown && peaqAgeBreakdown.phenoAge == null && peaqAgeBreakdown.hasBW ? "Review" : "Active")
    : "Connect"
  const oralStatus: PanelStatus = hasOral
    ? (typeof peaqAgeBreakdown?.omaPct === "number" && (peaqAgeBreakdown.omaPct as number) < 40 ? "Review" : "Active")
    : "Connect"

  // ── Panel summary sentences ───────────────────────────────────────────────
  function panelSummary(panel: "sleep" | "blood" | "oral"): string {
    if (panel === "sleep") {
      if (!hasSleep) return "Not connected yet"
      if (props.sleepData) {
        const parts: string[] = []
        if (props.sleepData.deepPct >= 15) parts.push("Deep sleep strong")
        else parts.push("Deep sleep could improve")
        if (props.sleepData.hrv >= 30) parts.push("HRV in healthy range")
        else parts.push("HRV trending low")
        return parts.join(", ")
      }
      return "Sleep data processing"
    }
    if (panel === "blood") {
      if (!hasBlood) return "Not connected yet"
      if (props.bloodData) {
        const watch = insights?.insights_watch?.find(i => i.panels.includes("blood"))
        if (watch) return watch.title
        const pos = insights?.insights_positive?.find(i => i.panels.includes("blood"))
        if (pos) return pos.title
        return "Blood panel active, markers in range"
      }
      return "Processing lab results"
    }
    if (panel === "oral") {
      if (!hasOral) return "Not connected yet"
      if (props.oralData) {
        const watch = insights?.insights_watch?.find(i => i.panels.includes("oral"))
        if (watch) return watch.title
        const pos = insights?.insights_positive?.find(i => i.panels.includes("oral"))
        if (pos) return pos.title
        return "Microbiome active, protective species present"
      }
      return "Awaiting oral results"
    }
    return ""
  }

  // ── Action plan items ─────────────────────────────────────────────────────
  function getActionItems(): { label: string; timing: string }[] {
    if (!peaqAgeBreakdown) return []
    const b = peaqAgeBreakdown
    const mwType = props.lifestyleData?.mouthwashType
    const usesAntiseptic = mwType === "antiseptic" || mwType === "alcohol"
    const noHsCrp = !(b.hasBW && (b.missingPhenoMarkers as string[] ?? []).length === 0)
    const omaQcFail = typeof b.omaPct === "number" && (b.omaPct as number) < 40

    const actions: { label: string; timing: string }[] = []
    if (usesAntiseptic) actions.push({ label: "Switch from antiseptic mouthwash", timing: "Today" })
    if (omaQcFail) actions.push({ label: "Leafy greens or beetroot a few times a week", timing: "Week 1" })
    if (noHsCrp) actions.push({ label: "Add hs-CRP to next blood draw", timing: "Next draw" })
    if (typeof b.rhrDelta === "number" && (b.rhrDelta as number) > 1) actions.push({ label: "Increase aerobic exercise frequency", timing: "This month" })
    if (!hasSleep) actions.push({ label: "Connect a wearable for sleep data", timing: "Today" })
    if (!hasOral) actions.push({ label: "Order oral microbiome kit", timing: "This week" })
    return actions.slice(0, 3)
  }

  // ── V5 Dashboard (Peaq Age breakdown exists) ──────────────────────────────
  if (peaqAgeBreakdown && typeof peaqAgeBreakdown.peaqAge === "number") {
    const peaqAge = peaqAgeBreakdown.peaqAge as number
    const chronoAge = peaqAgeBreakdown.chronoAge as number
    const delta = peaqAgeBreakdown.delta as number
    const band = (peaqAgeBreakdown.band as string) ?? "ON PACE"
    const actionItems = getActionItems()
    const statuses: [PanelStatus, PanelStatus, PanelStatus] = [sleepStatus, bloodStatus, oralStatus]
    const anyMissing = !hasSleep || !hasBlood || !hasOral

    // Target range for 6-month goal
    const targetLow = Math.max(18, peaqAge - 2).toFixed(0)
    const targetHigh = Math.max(18, peaqAge - 0.5).toFixed(0)

    return (
      <div className="min-h-svh" style={{ background: DS.pageBg }}>
        <Nav />
        <PushNotificationPrompt />

        <main style={{ maxWidth: 1060, margin: "0 auto", padding: "40px 40px 80px" }}>

          {/* Reconnect banner */}
          {wearableNeedsReconnect && (
            <div style={{
              background: "rgba(184,134,11,0.08)", border: `0.5px solid rgba(184,134,11,0.25)`,
              borderRadius: 8, padding: "14px 18px", marginBottom: 20,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            }}>
              <p style={{ fontFamily: sans, fontSize: 13, color: DS.gold, margin: 0, lineHeight: 1.5 }}>
                Your {({ whoop: "WHOOP", oura: "Oura Ring", garmin: "Garmin", fitbit: "Fitbit" } as Record<string,string>)[props.wearableProvider ?? ""] ?? "wearable"} connection expired.
              </p>
              <Link href="/settings" style={{
                fontFamily: sans, fontSize: 12, fontWeight: 500,
                letterSpacing: "0.06em", textTransform: "uppercase",
                color: DS.gold, textDecoration: "none", whiteSpace: "nowrap",
              }}>
                Reconnect →
              </Link>
            </div>
          )}

          {/* ── TWO-COLUMN LAYOUT ─────────────────────────────────────────── */}
          <div className="dashboard-two-col" style={{
            display: "flex", gap: 32, alignItems: "flex-start",
          }}>

            {/* ── LEFT COLUMN (main) ──────────────────────────────────────── */}
            <div style={{ flex: "1 1 0", minWidth: 0, maxWidth: 700 }}>

              {/* 1. GREETING */}
              <div style={{ marginBottom: 32 }}>
                <h1 style={{
                  fontFamily: serif, fontSize: 36, fontWeight: 300,
                  color: DS.ink, margin: 0, lineHeight: 1.2,
                }}>
                  {(() => {
                    const h = new Date().getHours()
                    const name = firstName ?? ""
                    const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
                    return name ? `${greeting}, ${name}.` : `${greeting}.`
                  })()}
                </h1>
                <p style={{
                  fontFamily: sans, fontSize: 11, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: DS.inkMuted,
                  margin: "6px 0 0", fontVariantNumeric: "tabular-nums",
                }}>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>

                {/* Sync button */}
                {props.sleepConnected && !wearableNeedsReconnect && (
                  <button
                    onClick={handleSyncNow}
                    disabled={syncingNow}
                    style={{
                      fontFamily: sans, fontSize: 11, color: DS.inkMuted,
                      background: "none", border: "none", cursor: syncingNow ? "default" : "pointer",
                      padding: "4px 0", marginTop: 8,
                      display: "inline-flex", alignItems: "center", gap: 5,
                    }}
                  >
                    <RefreshCw
                      size={12} strokeWidth={1.5}
                      style={{ animation: syncingNow ? "syncSpin 800ms linear infinite" : "none" }}
                    />
                    <span>{syncResult ?? "Sync wearable"}</span>
                  </button>
                )}
              </div>

              {/* 2. THREE PANEL NODES */}
              <div style={{ position: "relative", marginBottom: 32 }}>
                <ConnectionLines statuses={statuses} />
                <div style={{ display: "flex", gap: 16, position: "relative", zIndex: 1 }}>
                  <PanelNode name="Sleep" color={DS.sleep} status={sleepStatus} href="/dashboard/sleep" />
                  <PanelNode name="Blood" color={DS.blood} status={bloodStatus} href="/dashboard/blood" />
                  <PanelNode name="Oral"  color={DS.oral}  status={oralStatus}  href="/dashboard/oral" />
                </div>
              </div>

              {/* 3. AI INSIGHT CARD */}
              {insightsLoading ? (
                <div style={{
                  background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
                  borderLeft: `3px solid ${DS.gold}`, borderRadius: 12,
                  padding: "24px 28px", marginBottom: 32,
                  boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
                }}>
                  <ShimmerBar width={100} height={10} />
                  <div style={{ marginTop: 14 }}><ShimmerBar width="85%" height={18} delay={200} /></div>
                  <div style={{ marginTop: 10 }}><ShimmerBar width="60%" height={14} delay={400} /></div>
                </div>
              ) : insights ? (
                <div style={{
                  background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
                  borderLeft: `3px solid ${DS.gold}`, borderRadius: 12,
                  padding: "24px 28px", marginBottom: 32,
                  boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
                }}>
                  <span style={{
                    fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: DS.inkMuted,
                  }}>
                    PEAQ INSIGHT
                  </span>
                  <h2 style={{
                    fontFamily: serif, fontSize: 22, fontStyle: "italic",
                    fontWeight: 400, color: DS.ink, margin: "10px 0 8px",
                    lineHeight: 1.3,
                  }}>
                    {insights.headline}
                  </h2>
                  <p style={{
                    fontFamily: sans, fontSize: 15, fontWeight: 300,
                    color: DS.inkMuted, lineHeight: 1.6, margin: "0 0 12px",
                  }}>
                    {insights.headline_sub}
                  </p>
                  <Link href="/dashboard/insights" style={{
                    fontFamily: sans, fontSize: 12, color: DS.gold,
                    textDecoration: "none",
                  }}>
                    Read why →
                  </Link>
                </div>
              ) : null}

              {/* 4. PANEL SUMMARY — THREE ROWS */}
              <div style={{
                background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
                borderRadius: 12, marginBottom: 32, overflow: "hidden",
                boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
              }}>
                {(["sleep", "blood", "oral"] as const).map((panel, i) => {
                  const color = ({ sleep: DS.sleep, blood: DS.blood, oral: DS.oral })[panel]
                  const status = ({ sleep: sleepStatus, blood: bloodStatus, oral: oralStatus })[panel]
                  const href = `/dashboard/${panel}`
                  const summary = panelSummary(panel)
                  const statusColor = status === "Active" ? DS.oral : status === "Review" ? DS.gold : DS.inkMuted

                  return (
                    <Link key={panel} href={href} style={{ textDecoration: "none", display: "block" }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "16px 20px",
                        borderBottom: i < 2 ? `0.5px solid ${DS.cardBorder}` : "none",
                        transition: "background 150ms ease",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = DS.sectionBg }}
                      onMouseLeave={e => { e.currentTarget.style.background = "" }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <span style={{
                          fontFamily: sans, fontSize: 13, color: DS.ink,
                          fontWeight: 500, width: 48, flexShrink: 0,
                          textTransform: "capitalize",
                        }}>
                          {panel}
                        </span>
                        <span style={{
                          fontFamily: sans, fontSize: 13, color: DS.inkMuted,
                          flex: 1, minWidth: 0,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {summary}
                        </span>
                        <span style={{
                          fontFamily: sans, fontSize: 10, fontWeight: 500,
                          letterSpacing: "0.06em", textTransform: "uppercase",
                          padding: "3px 10px", borderRadius: 20, flexShrink: 0,
                          background: `${statusColor}14`, color: statusColor,
                          border: `0.5px solid ${statusColor}40`,
                        }}>
                          {status}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* CROSS-PANEL SIGNALS (kept, repositioned) */}
              {insightsLoading && panelCount >= 2 && (
                <div style={{
                  background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
                  borderRadius: 12, padding: 24, marginBottom: 32,
                  boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
                }}>
                  <ShimmerBar width={120} height={10} />
                  <div style={{ marginTop: 16 }}><ShimmerBar width="80%" height={14} delay={200} /></div>
                  <div style={{ marginTop: 8 }}><ShimmerBar width="60%" height={12} delay={400} /></div>
                </div>
              )}
              {!insightsLoading && hasCrossPanel && panelCount >= 2 && (
                <div style={{
                  background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
                  borderLeft: `3px solid rgba(192,57,43,0.3)`,
                  borderRadius: 12, padding: 24, marginBottom: 32,
                  boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: DS.inkMuted }}>
                      Cross-Panel Signals
                    </span>
                    <span style={{ fontFamily: sans, fontSize: 9, color: DS.inkMuted }}>
                      {(insights?.cross_panel_signals ?? []).length} pattern{(insights?.cross_panel_signals ?? []).length !== 1 ? "s" : ""} detected
                    </span>
                  </div>
                  {crossPanelNeg.map((s, i) => <SignalRow key={`neg-${i}`} signal={s} />)}
                  {crossPanelPos.length > 0 && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0" }}>
                        <div style={{ flex: 1, height: "0.5px", background: DS.cardBorder }} />
                        <span style={{ fontFamily: sans, fontSize: 9, color: DS.inkMuted, whiteSpace: "nowrap" }}>Also working together</span>
                        <div style={{ flex: 1, height: "0.5px", background: DS.cardBorder }} />
                      </div>
                      {crossPanelPos.map((s, i) => <SignalRow key={`pos-${i}`} signal={s} />)}
                    </>
                  )}
                </div>
              )}

              {/* 5. PEAQ+ AGE CARD */}
              <div style={{
                background: DS.sectionBg, border: `0.5px solid ${DS.cardBorder}`,
                borderRadius: 12, padding: 40, textAlign: "center",
                marginBottom: 32,
              }}>
                <span style={{
                  fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: DS.inkMuted,
                }}>
                  YOUR PEAQ+ AGE
                </span>

                <div className="peaq-age-number" style={{
                  fontFamily: serif, fontSize: 88, fontWeight: 300,
                  color: DS.ink, letterSpacing: -2, lineHeight: 1,
                  margin: "12px 0 8px",
                }}>
                  {peaqAge.toFixed(1)}
                </div>

                <p style={{
                  fontFamily: serif, fontSize: 20, fontStyle: "italic",
                  color: DS.inkMuted, margin: "0 0 16px",
                }}>
                  {delta < 0
                    ? `${Math.abs(delta).toFixed(1)} years younger than your calendar age`
                    : delta > 0
                    ? `${delta.toFixed(1)} years older than your calendar age`
                    : "Exactly your calendar age"
                  }
                </p>

                <BandChip band={band} />

                <p style={{
                  fontFamily: sans, fontSize: 12, color: DS.inkMuted,
                  margin: "16px 0 0",
                }}>
                  6-month target: {targetLow}–{targetHigh}
                </p>

                <Link href="/science" style={{
                  fontFamily: sans, fontSize: 11, color: DS.inkMuted,
                  textDecoration: "none", display: "inline-block",
                  marginTop: 12,
                }}>
                  How is this calculated? →
                </Link>
              </div>

            </div>

            {/* ── RIGHT RAIL ──────────────────────────────────────────────── */}
            <div className="dashboard-rail" style={{
              width: 280, flexShrink: 0,
              display: "flex", flexDirection: "column", gap: 24,
            }}>

              {/* ZONE 1 — YOUR PLAN */}
              <div style={{
                background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
                borderRadius: 12, padding: 20,
                boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
              }}>
                <span style={{
                  fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: DS.inkMuted,
                  display: "block", marginBottom: 14,
                }}>
                  YOUR PLAN
                </span>
                {actionItems.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {actionItems.map((a, i) => (
                      <div key={i} style={{
                        padding: "10px 0",
                        borderBottom: i < actionItems.length - 1 ? `0.5px solid ${DS.cardBorder}` : "none",
                      }}>
                        <p style={{
                          fontFamily: sans, fontSize: 14, color: DS.ink,
                          margin: 0, lineHeight: 1.4,
                        }}>
                          {a.label}
                        </p>
                        <p style={{
                          fontFamily: sans, fontSize: 12, color: DS.inkMuted,
                          margin: "2px 0 0",
                        }}>
                          {a.timing}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : insightsLoading ? (
                  <div>
                    <ShimmerBar width="80%" height={14} />
                    <div style={{ marginTop: 8 }}><ShimmerBar width="60%" height={12} delay={200} /></div>
                  </div>
                ) : (
                  <p style={{ fontFamily: sans, fontSize: 13, color: DS.inkMuted, margin: 0 }}>
                    All markers in range. Keep going.
                  </p>
                )}
                <Link href="/dashboard/guidance" style={{
                  fontFamily: sans, fontSize: 12, color: DS.gold,
                  textDecoration: "none", display: "block", marginTop: 14,
                }}>
                  View full plan →
                </Link>
              </div>

              {/* ZONE 2 — FROM PEAQ */}
              {/* TODO: replace with dynamic blog posts when peaqhealth.me/learn launches */}
              <div style={{
                background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
                borderRadius: 12, padding: 20,
                boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
              }}>
                <span style={{
                  fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: DS.inkMuted,
                  display: "block", marginBottom: 14,
                }}>
                  FROM PEAQ
                </span>
                {[
                  { title: "How your oral health affects your heart", sub: "5 min read", href: "/science" },
                  { title: "Why sleep timing matters more than duration", sub: "4 min read", href: "/science" },
                ].map((post, i) => (
                  <Link key={i} href={post.href} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 8, padding: "14px 0", textDecoration: "none",
                    borderBottom: i === 0 ? `0.5px solid ${DS.cardBorder}` : "none",
                    transition: "background 150ms ease",
                  }}>
                    <div>
                      <p style={{
                        fontFamily: sans, fontSize: 13, color: DS.ink,
                        margin: 0, lineHeight: 1.4,
                      }}>
                        {post.title}
                      </p>
                      <p style={{
                        fontFamily: sans, fontSize: 11, color: DS.inkMuted,
                        margin: "2px 0 0",
                      }}>
                        {post.sub}
                      </p>
                    </div>
                    <span style={{ color: DS.inkMuted, fontSize: 14, flexShrink: 0 }}>→</span>
                  </Link>
                ))}
              </div>

              {/* ZONE 3 — GET MORE FROM PEAQ (only if panels missing) */}
              {anyMissing && (
                <div style={{
                  background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
                  borderRadius: 12, padding: 20,
                  boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
                }}>
                  <span style={{
                    fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: DS.inkMuted,
                    display: "block", marginBottom: 14,
                  }}>
                    GET MORE FROM PEAQ
                  </span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {!hasSleep && (
                      <Link href="/settings#wearables" style={{
                        padding: "10px 0", textDecoration: "none",
                        borderBottom: (!hasBlood || !hasOral) ? `0.5px solid ${DS.cardBorder}` : "none",
                      }}>
                        <p style={{ fontFamily: sans, fontSize: 13, color: DS.ink, margin: 0 }}>
                          Unlock sleep &amp; HRV data
                        </p>
                        <p style={{ fontFamily: sans, fontSize: 12, color: DS.gold, margin: "2px 0 0" }}>
                          Connect wearable →
                        </p>
                      </Link>
                    )}
                    {!hasBlood && (
                      <Link href="/settings/labs" style={{
                        padding: "10px 0", textDecoration: "none",
                        borderBottom: !hasOral ? `0.5px solid ${DS.cardBorder}` : "none",
                      }}>
                        <p style={{ fontFamily: sans, fontSize: 13, color: DS.ink, margin: 0 }}>
                          Complete your health picture
                        </p>
                        <p style={{ fontFamily: sans, fontSize: 12, color: DS.gold, margin: "2px 0 0" }}>
                          Upload blood panel →
                        </p>
                      </Link>
                    )}
                    {!hasOral && (
                      <Link href="/shop" style={{ padding: "10px 0", textDecoration: "none" }}>
                        <p style={{ fontFamily: sans, fontSize: 13, color: DS.ink, margin: 0 }}>
                          Discover your oral microbiome
                        </p>
                        <p style={{ fontFamily: sans, fontSize: 12, color: DS.gold, margin: "2px 0 0" }}>
                          Order kit →
                        </p>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <IOSInstallBanner />

        {/* ── Animations ────────────────────────────────────────────────── */}
        <style>{`
          @keyframes glowPulse {
            0%, 100% { opacity: 0.35; }
            50%      { opacity: 0.55; }
          }
          @keyframes panelDotPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%      { opacity: 0.6; transform: scale(0.85); }
          }
          @keyframes shimmer {
            0%, 100% { opacity: 0.5; }
            50%      { opacity: 1; }
          }
          @keyframes syncSpin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes seeWhyPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%      { opacity: 0.4; transform: scale(0.8); }
          }
          @keyframes seeWhyFadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          /* Mobile: single column */
          @media (max-width: 768px) {
            .dashboard-two-col {
              flex-direction: column !important;
            }
            .dashboard-rail {
              width: 100% !important;
            }
            .peaq-age-number {
              font-size: 64px !important;
            }
          }
        `}</style>
      </div>
    )
  }

  // ── LEGACY DASHBOARD (no Peaq Age breakdown — pre-V5) ───────────────────
  return (
    <div className="min-h-svh" style={{ background: "#F6F4EF" }}>
      <Nav />
      <main className="mx-auto" style={{ maxWidth: 760, padding: "28px 24px 60px" }}>
        {wearableNeedsReconnect && (
          <div style={{
            background: "rgba(154,114,0,0.08)", border: "0.5px solid rgba(154,114,0,0.25)",
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
            trendDeltas={props.trendDeltas}
          />
        </div>
      </main>
      <IOSInstallBanner />
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Nav } from "../components/nav"
import { type ScoreWheelProps } from "../components/score-wheel"
import { PushNotificationPrompt } from "../components/push-notification-prompt"
import { IOSInstallBanner } from "../components/ios-install-banner"
import { PanelConvergence } from "../components/panel-convergence"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "-apple-system, BlinkMacSystemFont, sans-serif"

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

function SkeletonHeadline() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <ShimmerBar width={480} height={28} delay={0} radius={4} />
      <div style={{ marginTop: 8 }}><ShimmerBar width={320} height={28} delay={200} radius={4} /></div>
      <div style={{ marginTop: 16 }}><ShimmerBar width={420} height={12} bg="rgba(0,0,0,0.04)" delay={400} radius={2} /></div>
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
        fontFamily: sans, fontSize: 9, color: "#C49A3C",
        textTransform: "uppercase", letterSpacing: "1.5px",
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
      <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: "#1a1a18", marginBottom: 4 }}>
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

// ─── Main Component ──────────────────────────────────────────────────────────

export function DashboardClient(props: ScoreWheelProps & { labHistory?: LabHistoryPoint[]; wearableNeedsReconnect?: boolean }) {
  const { wearableNeedsReconnect = false } = props

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
    <div className="min-h-svh" style={{ background: "#F6F4EF" }}>
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

        {/* Sync */}
        {props.sleepConnected && !wearableNeedsReconnect && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <button onClick={handleSyncNow} disabled={syncingNow} style={{
              fontFamily: sans, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase",
              color: syncingNow ? "var(--ink-30)" : "var(--ink-40)",
              background: "none", border: `0.5px solid ${syncingNow ? "var(--ink-08)" : "var(--ink-12)"}`,
              borderRadius: 4, padding: "6px 14px", cursor: syncingNow ? "default" : "pointer",
            }}>
              {syncingNow ? "Syncing…" : "Sync now"}
            </button>
            {props.lastSyncAt && (
              <span style={{ fontFamily: sans, fontSize: 11, color: "var(--ink-30)" }}>
                Last synced {new Date(props.lastSyncAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}, {new Date(props.lastSyncAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
            {syncResult && <span style={{ fontFamily: sans, fontSize: 11, color: "#3B6D11" }}>{syncResult}</span>}
          </div>
        )}

        <PushNotificationPrompt />

        {/* ── SCORE HEADER — panel chips only, no PRI duplicate ────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 32 }}>
          {[
            { key: "sleep", label: sleepHidden ? "RECOVERY" : "SLEEP", color: "#185FA5", score: hasSleep ? props.breakdown.sleepSub : null, max: 30 },
            { key: "blood", label: "BLOOD", color: "#A32D2D", score: hasBlood ? props.breakdown.bloodSub : null, max: 40 },
            { key: "oral",  label: "ORAL",  color: "#3B6D11", score: hasOral  ? props.breakdown.oralSub  : null, max: 30 },
          ].map((p) => (
            <div key={p.key} style={{
              flex: 1, background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
              borderRadius: 8, padding: "10px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                <span style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "1.5px", color: "#8C8A82" }}>
                  {p.label}
                </span>
                <span style={{ fontFamily: serif, fontSize: 24, color: p.color, marginLeft: "auto" }}>
                  {p.score !== null ? Math.round(p.score) : "\u2014"}
                </span>
              </div>
              <div style={{ height: 2, borderRadius: 1, background: "rgba(0,0,0,0.04)", marginTop: 4 }}>
                <div style={{
                  height: "100%", borderRadius: 1, background: p.color,
                  width: p.score !== null ? `${(p.score / p.max) * 100}%` : "0%",
                  transition: "width 300ms ease",
                }} />
              </div>
              {/* Sleep toggle — small, unobtrusive */}
              {p.key === "sleep" && (
                <div
                  onClick={toggleSleep}
                  style={{
                    display: "inline-flex", alignItems: "center",
                    background: "#1a1a18", borderRadius: 14, border: "none",
                    padding: "4px 5px", marginTop: 6, cursor: "pointer",
                    position: "relative", height: 28, width: 140,
                  }}
                >
                  {/* Gold knob */}
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
              )}
            </div>
          ))}
        </div>

        {/* ── CONVERGENCE GRAPHIC ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <PanelConvergence
            score={props.score}
            breakdown={props.breakdown}
            sleepConnected={props.sleepConnected}
            oralActive={props.oralActive}
            hasBlood={hasBlood}
            wearableProvider={props.wearableProvider}
            bloodLabName={props.bloodData?.labName}
            oralKitStatus={props.oralKitStatus}
          />
        </div>

        {/* ── 1. DYNAMIC HEADLINE ─────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 40px" }}>
          {insightsLoading ? (
            <SkeletonHeadline />
          ) : insights ? (
            <>
              <h1 style={{
                fontFamily: serif, fontSize: 36, fontWeight: 300,
                color: "#1a1a18", margin: "0 0 10px", lineHeight: 1.2,
              }}>
                {insights.headline}
              </h1>
              <p style={{ fontFamily: sans, fontSize: 13, color: "#8C8A82", lineHeight: 1.6, margin: 0 }}>
                {insights.headline_sub}
              </p>
            </>
          ) : (
            <p style={{ fontFamily: sans, fontSize: 13, color: "#bbb" }}>
              Complete at least one panel to unlock insights.
            </p>
          )}
        </div>

        {/* ── 2. CROSS-PANEL SIGNALS ──────────────────────────────────────────── */}
        {insightsLoading && panelCount >= 2 && (
          <div style={{
            background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
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
            background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
            borderRadius: 12, padding: 24, marginBottom: 32,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#bbb" }}>
                Cross-Panel Signals
              </span>
              <span style={{ fontFamily: sans, fontSize: 9, color: "#bbb" }}>
                {(insights?.cross_panel_signals ?? []).length} pattern{(insights?.cross_panel_signals ?? []).length !== 1 ? "s" : ""} detected
              </span>
            </div>

            {/* Negative signals first */}
            {crossPanelNeg.map((s, i) => <SignalRow key={`neg-${i}`} signal={s} />)}

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

        {/* ── 4. PANEL CARDS ──────────────────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 40,
        }}>
          {[
            { key: "sleep", label: "Sleep", color: "#185FA5", active: hasSleep, score: props.breakdown.sleepSub, max: 30, href: "/dashboard/sleep", insight: props.sleepData ? `${props.sleepData.hrv.toFixed(0)}ms HRV · ${props.sleepData.deepPct.toFixed(0)}% deep` : undefined },
            { key: "blood", label: "Blood", color: "#A32D2D", active: hasBlood, score: props.breakdown.bloodSub, max: 40, href: "/dashboard/blood", insight: props.bloodData ? `hs-CRP ${props.bloodData.hsCRP.toFixed(1)} · LDL ${props.bloodData.ldl.toFixed(0)}` : undefined },
            { key: "oral",  label: "Oral",  color: "#3B6D11", active: hasOral,  score: props.breakdown.oralSub,  max: 30, href: "/dashboard/oral",  insight: props.oralData ? `Shannon ${props.oralData.shannonDiversity.toFixed(1)} · ${props.oralData.nitrateReducersPct.toFixed(0)}% nitrate` : undefined },
          ].map((p) => (
            p.active ? (
              <Link key={p.key} href={p.href} style={{
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
                <span style={{ fontFamily: sans, fontSize: 9, color: "#C49A3C", textTransform: "uppercase", letterSpacing: "1.5px" }}>
                  View details →
                </span>
              </Link>
            ) : (
              <div key={p.key} style={{
                background: "transparent",
                border: "0.5px dashed rgba(0,0,0,0.12)",
                borderRadius: 12, padding: "20px 24px",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                minHeight: 140, textAlign: "center",
              }}>
                <span style={{ fontFamily: serif, fontSize: 18, color: "#bbb", marginBottom: 8 }}>{p.label}</span>
                <span style={{ fontFamily: sans, fontSize: 9, color: "#C49A3C", textTransform: "uppercase", letterSpacing: "1.5px" }}>
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

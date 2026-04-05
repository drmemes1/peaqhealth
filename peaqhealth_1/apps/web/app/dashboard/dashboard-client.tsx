"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { DashboardSidebar } from "../components/dashboard-sidebar"
import { DashboardTopbar } from "../components/dashboard-topbar"
import { ScoreWheel, type ScoreWheelProps } from "../components/score-wheel"
import { ScoreHistoryChart } from "../components/score-history-chart"
import { PushNotificationPrompt } from "../components/push-notification-prompt"
import { IOSInstallBanner } from "../components/ios-install-banner"
import { InterruptCard } from "../components/interrupt-card"
import { PeaqChat } from "../components/peaq-chat"

interface LabHistoryPoint {
  locked_at:       string
  total_score:     number | null
  blood_score:     number | null
  collection_date: string | null
  ldl_mgdl:        number | null
  hdl_mgdl:        number | null
  hs_crp_mgl:      number | null
  vitamin_d_ngml:  number | null
}

const PROVIDER_LABELS: Record<string, string> = {
  whoop: "WHOOP",
  oura: "Oura Ring",
  garmin: "Garmin",
  fitbit: "Fitbit",
}

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "-apple-system, BlinkMacSystemFont, sans-serif"

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardClient(props: ScoreWheelProps & { labHistory?: LabHistoryPoint[]; wearableNeedsReconnect?: boolean }) {
  const { labHistory = [], wearableNeedsReconnect = false } = props
  const [syncingNow, setSyncingNow] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const handleSyncNow = async () => {
    setSyncingNow(true)
    setSyncResult(null)
    try {
      const res = await fetch("/api/sync/now", { method: "POST" })
      if (res.status === 429) {
        setSyncResult("Rate limited — try again in an hour")
      } else if (res.ok) {
        const data = await res.json() as { records?: number }
        setSyncResult(`Synced ${data.records ?? 0} nights`)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setSyncResult("Sync failed — try again later")
      }
    } catch {
      setSyncResult("Sync failed — try again later")
    } finally {
      setSyncingNow(false)
    }
  }

  // Syncing state: wearable connected but no sleep sub yet (backfill in progress)
  const startSyncing = props.sleepConnected && props.breakdown.sleepSub === 0
  const [isSyncing, setIsSyncing]       = useState(startSyncing)
  const [liveScore, setLiveScore]       = useState(props.score)
  const [liveSleepSub, setLiveSleepSub] = useState(props.breakdown.sleepSub)

  useEffect(() => {
    if (!isSyncing) return
    let attempts = 0
    const maxAttempts = 20
    const poll = setInterval(async () => {
      attempts++
      try {
        const res  = await fetch("/api/score/latest")
        const data = await res.json() as { score?: number; sleep_sub?: number }
        if ((data.sleep_sub ?? 0) > 0) {
          setLiveSleepSub(data.sleep_sub!)
          setLiveScore(data.score ?? liveScore)
          setIsSyncing(false)
          clearInterval(poll)
        }
      } catch (e) { console.error("[poll] error:", e) }
      if (attempts >= maxAttempts) { setIsSyncing(false); clearInterval(poll) }
    }, 3000)
    return () => clearInterval(poll)
  }, [isSyncing]) // eslint-disable-line react-hooks/exhaustive-deps

  const liveBreakdown = { ...props.breakdown, sleepSub: liveSleepSub }
  const liveProps: ScoreWheelProps = {
    ...props,
    score: liveScore,
    breakdown: liveBreakdown,
    isSyncing,
  }

  // ── Interrupt card ──────────────────────────────────────────────────────────
  const modTotal = props.modifier_total ?? 0
  const modifiers = props.modifiers_applied ?? []
  const penalties = modifiers.filter(m => m.direction === "penalty")
  const showInterrupt = modTotal < 0 && penalties.length > 0

  const [interruptReady, setInterruptReady] = useState(false)
  useEffect(() => {
    if (!showInterrupt) return
    const t = setTimeout(() => setInterruptReady(true), 800)
    return () => clearTimeout(t)
  }, [showInterrupt])

  const modFingerprint = penalties.map(m => m.id).sort().join(",")
  const [interruptDismissed, setInterruptDismissed] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("peaq_interrupt_dismissed") === modFingerprint
  })
  const handleInterruptDismiss = () => {
    setInterruptDismissed(true)
    localStorage.setItem("peaq_interrupt_dismissed", modFingerprint)
  }
  const primaryPenalty = penalties[0]
  const basePRI = liveScore - modTotal

  // User initials for sidebar avatar
  const firstName = props.lifestyleData?.ageRange ? "IK" : "IK" // fallback initials

  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white, #F6F4EF)" }}>
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <DashboardSidebar initials={firstName} />

      {/* ── Topbar ───────────────────────────────────────────── */}
      <DashboardTopbar
        firstName="Igor"
        lastSyncAt={props.lastSyncAt}
        wearableProvider={props.wearableProvider}
        onSync={props.sleepConnected && !wearableNeedsReconnect ? handleSyncNow : undefined}
        syncing={syncingNow}
      />

      {/* ── Body grid ────────────────────────────────────────── */}
      <div style={{
        marginLeft: 62,
        display: "grid",
        gridTemplateColumns: "1fr 284px",
        height: "calc(100vh - 52px)",
        overflow: "hidden",
      }}>
        {/* ── CENTER COLUMN ──────────────────────────────────── */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRight: "0.5px solid rgba(0,0,0,0.06)",
        }}>
          {/* Reconnect banner */}
          {wearableNeedsReconnect && (
            <div style={{
              background: "rgba(154,114,0,0.08)",
              border: "0.5px solid rgba(154,114,0,0.25)",
              padding: "10px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexShrink: 0,
            }}>
              <p style={{ fontFamily: sans, fontSize: 12, color: "#9A7200", margin: 0, lineHeight: 1.5 }}>
                Your {PROVIDER_LABELS[props.wearableProvider ?? ""] ?? "wearable"} connection expired.
              </p>
              <Link href="/settings" style={{
                fontFamily: sans, fontSize: 10, fontWeight: 500,
                letterSpacing: "0.06em", textTransform: "uppercase",
                color: "#9A7200", textDecoration: "none", whiteSpace: "nowrap",
              }}>
                Reconnect →
              </Link>
            </div>
          )}

          {syncResult && (
            <div style={{
              padding: "8px 24px",
              fontFamily: sans, fontSize: 11,
              color: "#3B6D11", flexShrink: 0,
            }}>
              {syncResult}
            </div>
          )}

          <PushNotificationPrompt />

          {/* Scrollable center content */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(0,0,0,0.1) transparent",
          }}>
            {/* ScoreWheel — renders peaks, panels, markers, insights */}
            <ScoreWheel {...liveProps} />

            {/* Interrupt card */}
            {showInterrupt && interruptReady && !interruptDismissed && primaryPenalty && (
              <div style={{ margin: "16px 24px 0" }}>
                <InterruptCard
                  headline={
                    primaryPenalty.panels.length >= 3
                      ? "Your mouth, your blood, and your sleep"
                      : `Your ${primaryPenalty.panels.join(" and your ")}`
                  }
                  headlineEmphasis="are telling the same story."
                  subtitle={`${penalties.length} cross-panel signal${penalties.length > 1 ? "s" : ""} detected. ${
                    penalties.length > 1
                      ? "These patterns are only visible when panels are measured together."
                      : "This pattern is only visible when panels are measured together."
                  }`}
                  signals={penalties.flatMap(p =>
                    p.panels.map(panel => ({
                      panel: panel as "sleep" | "blood" | "oral",
                      label: p.label,
                      detail: p.panels.join(" + "),
                      value: p.direction === "penalty" ? `\u2212${p.points}` : `+${p.points}`,
                      unit: "pts",
                      status: (p.direction === "penalty" ? "Attention" : "Good") as "Attention" | "Good",
                    })).slice(0, 1)
                  )}
                  connectors={penalties.slice(0, -1).map(p => ({ text: p.rationale }))}
                  insight={`<strong>What this means:</strong> ${penalties.map(p => p.rationale).join(" ")}`}
                  basePRI={basePRI}
                  finalPRI={liveScore}
                  modifierPoints={modTotal}
                  modifierLabel={penalties.map(p => p.label).join(" + ")}
                  modifierPanels={[...new Set(penalties.flatMap(p => p.panels))].map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" + ")}
                  citation="Based on cross-panel modifier logic. Not a diagnosis. Share with your clinician."
                  onDismiss={handleInterruptDismiss}
                />
              </div>
            )}

            {/* Progress chart */}
            {labHistory.length >= 2 && (
              <div style={{ padding: "0 24px", marginTop: 48, marginBottom: 32 }}>
                <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)", paddingTop: 32, marginBottom: 20 }}>
                  <h2 style={{ fontFamily: serif, fontSize: 24, fontWeight: 300, color: "var(--ink, #1a1a18)", margin: 0 }}>
                    Your progress
                  </h2>
                </div>
                <ScoreHistoryChart data={labHistory} />
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ──────────────────────────────────── */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Top — Insights (white) */}
          <div style={{
            padding: "14px 16px",
            borderBottom: "0.5px solid rgba(0,0,0,0.06)",
            flexShrink: 0,
            background: "#fff",
            animation: "rsidebarIn 400ms ease both",
            animationDelay: "200ms",
          }}>
            <div style={{
              fontFamily: sans, fontSize: 9,
              letterSpacing: "2px", textTransform: "uppercase",
              color: "#bbb", marginBottom: 12,
            }}>
              Top Insights
            </div>

            {/* Insight items — pulled from modifiers + data */}
            {(props.modifiers_applied ?? []).slice(0, 3).map((m, i, arr) => (
              <div key={m.id} style={{
                padding: "8px 0",
                borderBottom: i < arr.length - 1 ? "0.5px solid rgba(0,0,0,0.04)" : "none",
              }}>
                <div style={{
                  fontFamily: sans, fontSize: 8,
                  letterSpacing: "1.5px", textTransform: "uppercase",
                  fontWeight: 600,
                  color: m.panels.includes("sleep") ? "var(--sleep-c, #185FA5)" :
                         m.panels.includes("blood") ? "var(--blood-c, #A32D2D)" :
                         "var(--oral-c, #3B6D11)",
                  marginBottom: 3,
                }}>
                  {m.panels.join(" \u00D7 ")}
                </div>
                <div style={{
                  fontFamily: sans, fontSize: 11,
                  color: "#555", lineHeight: 1.55,
                }}>
                  {m.label}
                </div>
              </div>
            ))}

            {(props.modifiers_applied ?? []).length === 0 && (
              <div style={{ fontFamily: sans, fontSize: 11, color: "#bbb", lineHeight: 1.55 }}>
                Complete all three panels to unlock cross-panel insights.
              </div>
            )}
          </div>

          {/* Bottom — Cross-panel signals (dark) */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            background: "#16150F",
            padding: 16,
            animation: "rsidebarIn 400ms ease both",
            animationDelay: "300ms",
          }}>
            <div style={{
              fontFamily: sans, fontSize: 9,
              letterSpacing: "2px", textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
              marginBottom: 4,
            }}>
              Cross-Panel Signals
            </div>

            <div style={{
              fontFamily: serif, fontSize: 42,
              color: "#C49A3C", lineHeight: 1,
            }}>
              {modTotal > 0 ? "+" : ""}{modTotal}
            </div>

            <div style={{
              fontFamily: sans, fontSize: 10,
              color: "rgba(255,255,255,0.28)",
              marginBottom: 14,
            }}>
              {basePRI} base &middot; {modTotal > 0 ? "+" : ""}{modTotal} applied
            </div>

            {/* Modifier items */}
            {modifiers.map((m, i) => (
              <div key={m.id} style={{
                padding: "10px 0",
                borderBottom: i < modifiers.length - 1 ? "0.5px solid rgba(255,255,255,0.06)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                  <span style={{
                    fontFamily: sans, fontSize: 12, fontWeight: 500,
                    color: m.direction === "penalty" ? "#E24B4A" : "#C49A3C",
                  }}>
                    {m.direction === "penalty" ? "\u2212" : "+"}{m.points}
                  </span>
                  <span style={{
                    fontFamily: sans, fontSize: 11,
                    color: "rgba(255,255,255,0.62)",
                    lineHeight: 1.3,
                  }}>
                    {m.label}
                  </span>
                </div>
                <div style={{
                  fontFamily: sans, fontSize: 10,
                  color: "rgba(255,255,255,0.28)",
                  lineHeight: 1.5,
                  paddingLeft: 32,
                }}>
                  {m.rationale}
                </div>
              </div>
            ))}

            {modifiers.length === 0 && (
              <div style={{
                fontFamily: sans, fontSize: 11,
                color: "rgba(255,255,255,0.28)",
                lineHeight: 1.5, marginTop: 8,
              }}>
                No cross-panel signals active yet.
              </div>
            )}

            {/* Hallmark chips */}
            {modifiers.length > 0 && (
              <div style={{
                display: "flex", gap: 6, flexWrap: "wrap",
                marginTop: 14, paddingTop: 14,
                borderTop: "0.5px solid rgba(255,255,255,0.06)",
              }}>
                {[...new Set(modifiers.flatMap(m => m.panels))].map(panel => {
                  const colors: Record<string, { border: string; text: string; bg: string }> = {
                    sleep: { border: "rgba(24,95,165,0.35)", text: "rgba(24,95,165,0.75)", bg: "rgba(24,95,165,0.08)" },
                    blood: { border: "rgba(163,45,45,0.35)", text: "rgba(163,45,45,0.75)", bg: "rgba(163,45,45,0.08)" },
                    oral:  { border: "rgba(59,109,17,0.35)", text: "rgba(59,109,17,0.75)", bg: "rgba(59,109,17,0.08)" },
                  }
                  const c = colors[panel] ?? colors.sleep
                  return (
                    <span key={panel} style={{
                      fontFamily: sans, fontSize: 8,
                      letterSpacing: "0.8px", textTransform: "uppercase",
                      padding: "3px 9px", borderRadius: 20,
                      border: `0.5px solid ${c.border}`,
                      color: c.text,
                      background: c.bg,
                      whiteSpace: "nowrap",
                    }}>
                      {panel}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <IOSInstallBanner />
      <PeaqChat />
    </div>
  )
}

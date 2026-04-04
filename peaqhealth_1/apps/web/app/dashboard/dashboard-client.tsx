"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Nav } from "../components/nav"
import { ScoreWheel, type ScoreWheelProps } from "../components/score-wheel"
import { ScoreHistoryChart } from "../components/score-history-chart"
import { PushNotificationPrompt } from "../components/push-notification-prompt"
import { IOSInstallBanner } from "../components/ios-install-banner"

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
        // Reload page after short delay to reflect new data
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
    const maxAttempts = 20 // 60 seconds

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
      } catch (e) {
        console.error("[poll] error:", e)
      }
      if (attempts >= maxAttempts) {
        setIsSyncing(false)
        clearInterval(poll)
      }
    }, 3000)

    return () => clearInterval(poll)
  }, [isSyncing]) // eslint-disable-line react-hooks/exhaustive-deps

  const liveBreakdown = { ...props.breakdown, sleepSub: liveSleepSub }
  const liveProps: ScoreWheelProps = {
    ...props,
    score:     liveScore,
    breakdown: liveBreakdown,
    isSyncing,
  }

  return (
    <div className="min-h-svh bg-off-white">
      <Nav />
      <main className="mx-auto px-6 pt-14 pb-10" style={{ maxWidth: "var(--layout-max-width, 760px)" }}>

        {/* Reconnect banner */}
        {wearableNeedsReconnect && (
          <div style={{
            background: "rgba(154,114,0,0.08)",
            border: "0.5px solid rgba(154,114,0,0.25)",
            borderRadius: 8,
            padding: "14px 18px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}>
            <p style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
              fontSize: 13,
              color: "#9A7200",
              margin: 0,
              lineHeight: 1.5,
            }}>
              Your {PROVIDER_LABELS[props.wearableProvider ?? ""] ?? "wearable"} connection expired. Nightly syncing is paused.
            </p>
            <Link href="/settings" style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#9A7200",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}>
              Reconnect →
            </Link>
          </div>
        )}

        {/* Sync now button */}
        {props.sleepConnected && !wearableNeedsReconnect && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}>
            <button
              onClick={handleSyncNow}
              disabled={syncingNow}
              style={{
                fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: syncingNow ? "var(--ink-30)" : "var(--ink-40)",
                background: "none",
                border: `0.5px solid ${syncingNow ? "var(--ink-08)" : "var(--ink-12)"}`,
                borderRadius: 4,
                padding: "6px 14px",
                cursor: syncingNow ? "default" : "pointer",
              }}
            >
              {syncingNow ? "Syncing…" : "Sync now"}
            </button>
            {props.lastSyncAt && (
              <span style={{
                fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                fontSize: 11,
                color: "var(--ink-30)",
              }}>
                Last synced {new Date(props.lastSyncAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {", "}
                {new Date(props.lastSyncAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
            {syncResult && (
              <span style={{
                fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                fontSize: 11,
                color: "#2D6A4F",
              }}>
                {syncResult}
              </span>
            )}
          </div>
        )}

        <PushNotificationPrompt />
        <ScoreWheel {...liveProps} />

        {/* PROGRESS CHART — only shown when 2+ history entries exist */}
        {labHistory.length >= 2 && (
          <div style={{ marginTop: 48 }}>
            <div style={{ borderTop: "0.5px solid var(--ink-12)", paddingTop: 32, marginBottom: 20 }}>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 24,
                fontWeight: 300,
                color: "var(--ink)",
                margin: 0,
              }}>
                Your progress
              </h2>
            </div>
            <ScoreHistoryChart data={labHistory} />
          </div>
        )}
      </main>
      <IOSInstallBanner />
    </div>
  )
}

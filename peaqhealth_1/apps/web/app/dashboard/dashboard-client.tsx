"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Nav } from "../components/nav"
import { ScoreWheel, type ScoreWheelProps } from "../components/score-wheel"
import { ScoreHistoryChart } from "../components/score-history-chart"

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

// ─── Relative time formatter ──────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
}

function minutesUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000))
}

// ─── Component ────────────────────────────────────────────────────────────────

type SyncState = "idle" | "loading" | "success" | "rate-limited" | "no-wearable"

export function DashboardClient(props: ScoreWheelProps & { labHistory?: LabHistoryPoint[] }) {
  const { sleepConnected, lastSyncAt, lastSyncRequestedAt, labHistory = [] } = props

  const [syncState, setSyncState] = useState<SyncState>(
    sleepConnected ? "idle" : "no-wearable"
  )
  const [nextSyncAt, setNextSyncAt] = useState<string | null>(null)
  const [minsUntilSync, setMinsUntilSync] = useState(0)

  // Auto-refresh polling state
  const [isPolling, setIsPolling] = useState(false)
  const [liveScore, setLiveScore] = useState(props.score)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCount = useRef(0)
  const MAX_POLLS = 12 // 12 × 10s = 2 minutes

  // Countdown timer for rate-limit display
  useEffect(() => {
    if (syncState !== "rate-limited" || !nextSyncAt) return
    const interval = setInterval(() => {
      const mins = minutesUntil(nextSyncAt)
      setMinsUntilSync(mins)
      if (mins <= 0) {
        setSyncState("idle")
        clearInterval(interval)
      }
    }, 30000)
    setMinsUntilSync(minutesUntil(nextSyncAt))
    return () => clearInterval(interval)
  }, [syncState, nextSyncAt])

  // Check if already rate-limited on mount (e.g. page refresh after sync)
  useEffect(() => {
    if (!sleepConnected) return
    if (lastSyncRequestedAt) {
      const mins = minutesUntil(
        new Date(new Date(lastSyncRequestedAt).getTime() + 60 * 60000).toISOString()
      )
      if (mins > 0) {
        const expiry = new Date(
          new Date(lastSyncRequestedAt).getTime() + 60 * 60000
        ).toISOString()
        setNextSyncAt(expiry)
        setMinsUntilSync(mins)
        setSyncState("rate-limited")
      }
    }
  }, [sleepConnected, lastSyncRequestedAt])

  // Auto-refresh polling after sync
  const startPolling = useCallback((baselineScore: number) => {
    setIsPolling(true)
    pollCount.current = 0

    pollRef.current = setInterval(async () => {
      pollCount.current++
      if (pollCount.current > MAX_POLLS) {
        clearInterval(pollRef.current!)
        setIsPolling(false)
        return
      }
      try {
        const res = await fetch("/api/dashboard/score-poll")
        if (!res.ok) return
        const { score } = await res.json() as { score: number }
        if (score !== baselineScore) {
          setLiveScore(score)
          clearInterval(pollRef.current!)
          setIsPolling(false)
        }
      } catch {
        // network blip — keep polling
      }
    }, 10000)
  }, [])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const handleSync = async () => {
    setSyncState("loading")
    try {
      const res = await fetch("/api/wearable/resync", { method: "POST" })
      const body = await res.json() as {
        success?: boolean
        next_sync_available_at?: string
        error?: string
      }

      if (res.status === 429 && body.next_sync_available_at) {
        setNextSyncAt(body.next_sync_available_at)
        setMinsUntilSync(minutesUntil(body.next_sync_available_at))
        setSyncState("rate-limited")
        return
      }

      if (!res.ok) {
        setSyncState("idle")
        return
      }

      if (body.next_sync_available_at) setNextSyncAt(body.next_sync_available_at)
      setSyncState("success")
      startPolling(liveScore)

      setTimeout(() => setSyncState("idle"), 5000)
    } catch {
      setSyncState("idle")
    }
  }

  // Button label / color
  const syncLabel =
    syncState === "loading"     ? "Syncing..."
    : syncState === "success"   ? "✓ Sync requested — updates in ~2 min"
    : syncState === "rate-limited" ? `Synced recently — available in ${minsUntilSync}m`
    : "↻ Sync now"

  const syncColor =
    syncState === "success"      ? "var(--gold)"
    : syncState === "rate-limited" ? "rgba(20,20,16,0.25)"
    : "rgba(20,20,16,0.4)"

  return (
    <div className="min-h-svh bg-off-white">
      <Nav />
      <main className="mx-auto max-w-[720px] px-6 pt-14 pb-10">

        {/* Sync bar — only shown when wearable is connected */}
        {sleepConnected && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              paddingBottom: 12,
              borderBottom: "0.5px solid var(--ink-06)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                fontSize: 11,
                letterSpacing: "0.04em",
                color: "rgba(20,20,16,0.35)",
              }}
            >
              {lastSyncAt
                ? `Sleep data · Last synced ${relativeTime(lastSyncAt)}`
                : "Sleep data · Not yet synced"}
              {isPolling && (
                <span style={{ marginLeft: 10, color: "var(--gold)" }}>
                  Waiting for new data...
                </span>
              )}
            </span>

            <button
              onClick={handleSync}
              disabled={syncState === "loading" || syncState === "rate-limited"}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: syncState === "loading" || syncState === "rate-limited"
                  ? "default"
                  : "pointer",
                fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: syncColor,
                transition: "color 0.2s ease",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                if (syncState === "idle")
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--gold)"
              }}
              onMouseLeave={(e) => {
                if (syncState === "idle")
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "rgba(20,20,16,0.4)"
              }}
            >
              {syncLabel}
            </button>
          </div>
        )}

        <ScoreWheel {...props} score={liveScore} />

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
    </div>
  )
}

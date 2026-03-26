"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Nav } from "../components/nav"
import { ScoreWheel, type ScoreWheelProps } from "../components/score-wheel"
import { ScoreHistoryChart } from "../components/score-history-chart"
import { WearableManager } from "../components/wearable-manager"

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

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardClient(props: ScoreWheelProps & { labHistory?: LabHistoryPoint[] }) {
  const { lastSyncAt, lastSyncRequestedAt, labHistory = [] } = props

  // Auto-refresh polling state
  const [isPolling, setIsPolling] = useState(false)
  const [liveScore, setLiveScore] = useState(props.score)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCount = useRef(0)
  const MAX_POLLS = 12 // 12 × 10s = 2 minutes

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

  return (
    <div className="min-h-svh bg-off-white">
      <Nav />
      <main className="mx-auto max-w-[720px] px-6 pt-14 pb-10">

        {/* Wearable connections */}
        <div style={{ marginBottom: 24 }}>
          <p style={{
            fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
            fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em",
            color: "var(--ink-30)", marginBottom: 8,
          }}>
            Wearables
          </p>
          <WearableManager
            whoopConnected={props.whoopData?.connected ?? false}
            whoopLastSynced={lastSyncAt ?? null}
            lastSyncRequestedAt={lastSyncRequestedAt ?? null}
            isPolling={isPolling}
            onSyncSuccess={() => startPolling(liveScore)}
            onDisconnected={() => window.location.reload()}
          />
        </div>

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

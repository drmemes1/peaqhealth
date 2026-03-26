"use client"

import { useEffect } from "react"
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

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardClient(props: ScoreWheelProps & { labHistory?: LabHistoryPoint[] }) {
  const { labHistory = [] } = props

  // If WHOOP is connected but has never synced, trigger a one-time background sync.
  // Handles cases where the OAuth callback backfill failed silently.
  useEffect(() => {
    if (props.whoopData?.connected && !props.whoopData?.lastSynced) {
      fetch("/api/whoop/sync", { method: "POST" }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-svh bg-off-white">
      <Nav />
      <main className="mx-auto max-w-[720px] px-6 pt-14 pb-10">

        <ScoreWheel {...props} />

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

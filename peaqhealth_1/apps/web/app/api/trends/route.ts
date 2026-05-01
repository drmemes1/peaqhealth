import { createClient } from "../../../lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const userId = user.id

  const [
    { data: snapshotRows },
    { data: sleepRows },
    eventResults,
    { data: lastCheckinRow },
    { data: checkinHistoryRows },
    { data: wearableConn },
    { data: oralData },
  ] = await Promise.all([
    // Score snapshots
    supabase
      .from("score_snapshots")
      .select("score, sleep_sub, blood_sub, oral_sub, lifestyle_sub, calculated_at")
      .eq("user_id", userId)
      .order("calculated_at", { ascending: true })
      .limit(50),

    // Sleep nightly detail — last 30 nights
    supabase
      .from("sleep_data")
      .select("date, hrv_rmssd, sleep_efficiency, deep_sleep_minutes, rem_sleep_minutes, total_sleep_minutes, spo2, resting_heart_rate, source")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(30),

    // Event markers
    Promise.all([
      supabase.from("blood_results").select("uploaded_at").eq("user_id", userId).order("uploaded_at"),
      supabase.from("oral_kit_orders").select("results_date").eq("user_id", userId).not("results_date", "is", null).order("results_date", { ascending: false }),
      supabase.from("wearable_connections_v2").select("created_at, provider").eq("user_id", userId),
    ]),

    // Last lifestyle check-in
    supabase
      .from("lifestyle_checkins")
      .select("*")
      .eq("user_id", userId)
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Check-in history
    supabase
      .from("lifestyle_checkins")
      .select("checked_in_at, exercise_frequency, diet_quality, stress_level, alcohol_frequency, sleep_priority")
      .eq("user_id", userId)
      .order("checked_in_at", { ascending: false })
      .limit(10),

    // Current wearable for "last night" card
    supabase
      .from("wearable_connections_v2")
      .select("provider")
      .eq("user_id", userId)
      .eq("needs_reconnect", false)
      .order("connected_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Oral data for cross-panel signal
    supabase
      .from("oral_kit_orders")
      .select("nitrate_reducers_pct")
      .eq("user_id", userId)
      .not("shannon_diversity", "is", null)
      .order("ordered_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // ─── Snapshots — deduplicate to one row per calendar day ───────────────────
  // Every recalculate() call creates a new row, so testing creates dozens of
  // same-day points. Keep only the latest snapshot per calendar date.
  const allRows = snapshotRows ?? []
  const byDay = new Map<string, typeof allRows[0]>()
  for (const r of allRows) {
    const day = r.calculated_at.slice(0, 10) // "YYYY-MM-DD"
    const existing = byDay.get(day)
    if (!existing || r.calculated_at > existing.calculated_at) {
      byDay.set(day, r)
    }
  }
  const dedupedRows = Array.from(byDay.values()).sort((a, b) =>
    a.calculated_at < b.calculated_at ? -1 : 1
  )

  const snapshots = dedupedRows.map(r => ({
    date: r.calculated_at,
    total: r.score ?? 0,
    sleep: r.sleep_sub ?? 0,
    blood: r.blood_sub ?? 0,
    oral: r.oral_sub ?? 0,
    lifestyle: r.lifestyle_sub ?? 0,
  }))

  const current  = snapshots.length > 0  ? snapshots[snapshots.length - 1] : null
  const previous = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null
  const first    = snapshots.length > 0  ? snapshots[0] : null

  // ─── Sleep processing ───────────────────────────────────────────────────────
  const rawSleep = sleepRows ?? []

  const sleepNights = [...rawSleep].reverse().map(r => ({
    date: r.date,
    hrv: r.hrv_rmssd ?? null,
    efficiency: r.sleep_efficiency ?? null,
    deepPct: r.total_sleep_minutes > 0
      ? Math.round((r.deep_sleep_minutes / r.total_sleep_minutes) * 100)
      : null,
    remPct: r.total_sleep_minutes > 0
      ? Math.round((r.rem_sleep_minutes / r.total_sleep_minutes) * 100)
      : null,
    totalMinutes: r.total_sleep_minutes ?? null,
    spo2: r.spo2 ?? null,
    restingHeartRate: r.resting_heart_rate ?? null,
    provider: r.source ?? null,
  }))

  // Streak — consecutive days with sleep data, anchored to most recent night
  // (not today) so users with stale data don't always show 0
  const sleepDates = new Set(rawSleep.map(n => n.date))
  const sortedSleepDates = [...sleepDates].sort().reverse()
  let streak = 0
  if (sortedSleepDates.length > 0) {
    const mostRecent = new Date(sortedSleepDates[0])
    for (let i = 0; i < sortedSleepDates.length; i++) {
      const expected = new Date(mostRecent)
      expected.setDate(mostRecent.getDate() - i)
      const expectedStr = expected.toISOString().split("T")[0]
      if (sleepDates.has(expectedStr)) streak++
      else break
    }
  }

  // 7-day avg HRV
  const last7 = rawSleep.slice(0, 7).filter(n => n.hrv_rmssd != null && n.hrv_rmssd > 0)
  const avgHrv = last7.length > 0
    ? Math.round(last7.reduce((sum, n) => sum + n.hrv_rmssd!, 0) / last7.length)
    : null

  // HRV trend — this week vs last week
  const thisWeekHrv = rawSleep.slice(0, 7).filter(n => n.hrv_rmssd).map(n => n.hrv_rmssd!)
  const lastWeekHrv = rawSleep.slice(7, 14).filter(n => n.hrv_rmssd).map(n => n.hrv_rmssd!)
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  const hrvTrendPct = thisWeekHrv.length && lastWeekHrv.length
    ? Math.round(((avg(thisWeekHrv) - avg(lastWeekHrv)) / avg(lastWeekHrv)) * 100)
    : null

  // ─── Events ─────────────────────────────────────────────────────────────────
  const [labEvents, oralEvents, wearableEvents] = eventResults
  const events = [
    ...(labEvents.data ?? []).map(e => ({ type: "blood" as const, date: e.uploaded_at, label: "Lab upload" })),
    ...(oralEvents.data ?? []).map(e => ({ type: "oral" as const, date: e.results_date, label: "Oral results" })),
    ...(wearableEvents.data ?? []).map(e => ({ type: "wearable" as const, date: e.created_at, label: `${e.provider} connected` })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // ─── Lab recency ────────────────────────────────────────────────────────────
  const allLabs = labEvents.data ?? []
  const lastLabDate = allLabs.length > 0 ? allLabs[allLabs.length - 1].uploaded_at : null
  const daysSinceLastLab = lastLabDate
    ? Math.floor((Date.now() - new Date(lastLabDate).getTime()) / 86400000)
    : null

  // ─── Oral recency ──────────────────────────────────────────────────────────
  const allOral = oralEvents.data ?? []
  const lastOralDate = allOral.length > 0 ? allOral[0].results_date : null
  const daysSinceOral = lastOralDate
    ? Math.floor((Date.now() - new Date(lastOralDate).getTime()) / 86400000)
    : null

  // ─── Check-in ───────────────────────────────────────────────────────────────
  const daysSinceCheckin = lastCheckinRow
    ? Math.floor((Date.now() - new Date(lastCheckinRow.checked_in_at).getTime()) / 86400000)
    : null
  const shouldPromptCheckin = daysSinceCheckin === null || daysSinceCheckin >= 30

  // ─── Cross-panel signal ─────────────────────────────────────────────────────
  const nitrateReducersLow = (oralData?.nitrate_reducers_pct ?? 100) < 5
  const hrvDown = hrvTrendPct != null && hrvTrendPct <= -10
  const showCrossPanelAlert = hrvDown && nitrateReducersLow && oralData != null

  console.log(`[trends-api] displaying: score=${current?.total} sleep=${current?.sleep} blood=${current?.blood} oral=${current?.oral} date=${current?.date}`)

  const daysSinceLastSleep = sortedSleepDates[0]
    ? Math.floor((Date.now() - new Date(sortedSleepDates[0]).getTime()) / 86400000)
    : null

  return Response.json({
    current,
    previous,
    first,
    snapshots,
    sleepNights,
    streak,
    avgHrv,
    hrvTrendPct,
    daysSinceLastLab,
    lastLabDate,
    lastOralDate,
    daysSinceOral,
    daysSinceLastSleep,
    lastCheckin: lastCheckinRow,
    checkinHistory: checkinHistoryRows ?? [],
    shouldPromptCheckin,
    showCrossPanelAlert,
    hrvTrendPctValue: hrvTrendPct,
    wearableProvider: wearableConn?.provider ?? null,
    events,
  })
}

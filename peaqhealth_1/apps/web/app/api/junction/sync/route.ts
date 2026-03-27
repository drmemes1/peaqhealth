import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createClient } from "../../../../lib/supabase/server"
import { recalculateScore } from "../../../../lib/score/recalculate"

export const dynamic = "force-dynamic"

// Re-fetch sleep sessions from Vital API and update wearable_connections
export async function POST() {
  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Get the user's Junction user ID from their wearable connection
  const { data: conn } = await supabase
    .from("wearable_connections")
    .select("junction_user_id, provider")
    .eq("user_id", user.id)
    .eq("status", "connected")
    .not("junction_user_id", "is", null)
    .order("connected_at", { ascending: false })
    .limit(1)
    .single()

  if (!conn?.junction_user_id) {
    return NextResponse.json({ error: "No Junction wearable connected" }, { status: 404 })
  }

  const junctionUserId = conn.junction_user_id as string
  const baseUrl = process.env.JUNCTION_ENV === "production"
    ? "https://api.tryvital.io"
    : "https://api.sandbox.tryvital.io"

  const endDate = new Date().toISOString().split("T")[0]
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const url = `${baseUrl}/v2/summary/sleep/${junctionUserId}?start_date=${startDate}&end_date=${endDate}`

  let sessions: Array<Record<string, unknown>> = []
  try {
    const res = await fetch(url, { headers: { "x-vital-api-key": process.env.JUNCTION_API_KEY! } })
    if (res.ok) {
      const data = await res.json() as Record<string, unknown>
      sessions = (data.sleep ?? data.data ?? []) as Array<Record<string, unknown>>
    } else {
      console.error("[junction/sync] Vital API error:", res.status, await res.text())
    }
  } catch (err) {
    console.error("[junction/sync] fetch error:", err instanceof Error ? err.message : "unknown")
  }

  const fullSessions = sessions.filter(s => {
    const total = (s.total as number) || (s.duration as number) || 0
    const type = s.type as string | undefined
    return total > 3600 && type !== "acknowledged_nap" && type !== "nap"
  })

  if (fullSessions.length === 0) {
    return NextResponse.json({ status: "no_data", nightsAvailable: 0 })
  }

  // Build averaged payload from all full nights
  const avg = (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length
  const deepPcts: number[] = [], remPcts: number[] = [], efficiencies: number[] = []
  const hrvs: number[] = [], restingHRs: number[] = [], totalSecsList: number[] = []

  for (const s of fullSessions) {
    const totalSecs = (s.total as number) || (s.duration as number) || 0
    const deepSecs  = (s.deep      as number) || 0
    const remSecs   = (s.rem       as number) || 0
    const efficiency = (s.efficiency as number) || 0
    const hrv       = (s.hrv_rmssd ?? s.hrv ?? null) as number | null
    const hrLowest  = (s.hr_lowest  as number) || 0
    const spo2Avg   = s.spo2_avg   as number | undefined

    totalSecsList.push(totalSecs)
    if (deepSecs  > 0) deepPcts.push((deepSecs / totalSecs) * 100)
    if (remSecs   > 0) remPcts.push((remSecs   / totalSecs) * 100)
    if (efficiency > 0) efficiencies.push(efficiency)
    if (hrv !== null && hrv > 0) hrvs.push(hrv)
    if (hrLowest  > 0) restingHRs.push(hrLowest)
  }

  // Use the most recent session's SpO2 for dip estimate
  const latestSpo2 = fullSessions[0].spo2_avg as number | undefined

  const updatePayload: Record<string, unknown> = {
    last_sync_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "connected",
    nights_available: fullSessions.length,
    total_sleep_seconds: Math.round(avg(totalSecsList)),
  }
  if (deepPcts.length)     updatePayload.deep_sleep_pct    = Math.round(avg(deepPcts)     * 10) / 10
  if (remPcts.length)      updatePayload.rem_pct            = Math.round(avg(remPcts)      * 10) / 10
  if (efficiencies.length) updatePayload.sleep_efficiency   = Math.round(avg(efficiencies) * 10) / 10
  if (hrvs.length)         updatePayload.hrv_rmssd           = Math.round(avg(hrvs)         * 10) / 10
  if (restingHRs.length)   updatePayload.latest_resting_hr   = Math.round(avg(restingHRs))
  if (latestSpo2 !== undefined && latestSpo2 > 0) {
    updatePayload.latest_spo2_dips = latestSpo2 >= 95 ? 0 : latestSpo2 >= 92 ? 2 : 5
  }

  const { error } = await supabase
    .from("wearable_connections")
    .update(updatePayload)
    .eq("junction_user_id", junctionUserId)

  if (error) {
    console.error("[junction/sync] update error:", error.message)
    return NextResponse.json({ error: "DB update failed" }, { status: 500 })
  }

  await recalculateScore(user.id, supabase)
  console.log("[junction/sync] synced", fullSessions.length, "nights for user:", user.id)

  return NextResponse.json({ status: "synced", nightsAvailable: fullSessions.length })
}

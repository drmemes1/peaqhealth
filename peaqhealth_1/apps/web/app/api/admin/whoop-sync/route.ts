import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { fetchWhoopSleepData } from "../../../../lib/whoop/fetch"
import { recalculateScore } from "../../../../lib/score/recalculate"

/**
 * Admin endpoint: POST /api/admin/whoop-sync
 * Body: { userId: string, secret: string }
 *
 * Triggers a WHOOP sync + score recalculation for any user.
 * Requires ADMIN_SECRET env var (set in Vercel → Project Settings → Environment Variables).
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as { userId?: string; secret?: string }

  if (!body.secret || body.secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!body.userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const startIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const endIso   = new Date().toISOString()
  console.log(`[admin-whoop-sync] userId=${body.userId} start=${startIso} end=${endIso}`)

  let records
  try {
    records = await fetchWhoopSleepData(body.userId, startIso, endIso)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[admin-whoop-sync] fetch error:", msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  if (records.length === 0) {
    return NextResponse.json({ success: true, records: 0, note: "No sleep records returned from WHOOP" })
  }

  // Upsert individual records
  const rows = records.map(r => ({ ...r, user_id: body.userId }))
  const { error: upsertErr } = await serviceClient
    .from("whoop_sleep_data")
    .upsert(rows, { onConflict: "sleep_id" })
  if (upsertErr) console.error("[admin-whoop-sync] upsert error:", upsertErr.message)

  // Compute aggregates
  const validNights = records.filter(r => r.sleep_efficiency > 0)
  const n = validNights.length || 1
  const avg = (key: keyof typeof validNights[0]) =>
    validNights.reduce((s, r) => s + (Number(r[key]) || 0), 0) / n

  const totalMinutes = avg("total_sleep_minutes")
  const deepMinutes  = avg("deep_sleep_minutes")
  const remMinutes   = avg("rem_sleep_minutes")
  const deepPct      = totalMinutes > 0 ? (deepMinutes / totalMinutes) * 100 : 0
  const remPct       = totalMinutes > 0 ? (remMinutes  / totalMinutes) * 100 : 0
  const efficiency   = avg("sleep_efficiency")
  const hrv          = avg("hrv_rmssd")
  const restingHR    = avg("resting_heart_rate")
  const spo2         = avg("spo2")
  const spo2Dips     = spo2 >= 95 ? 0 : spo2 >= 92 ? 2 : 5

  const now = new Date().toISOString()
  await serviceClient.from("wearable_connections").upsert({
    user_id:            body.userId,
    provider:           "whoop",
    status:             "connected",
    connected_at:       now,
    deep_sleep_pct:     deepPct,
    rem_pct:            remPct,
    sleep_efficiency:   efficiency,
    hrv_rmssd:          hrv,
    latest_resting_hr:  Math.round(restingHR) || null,
    latest_spo2_dips:   spo2Dips,
    nights_available:   validNights.length,
    last_sync_at:       now,
    updated_at:         now,
  }, { onConflict: "user_id,provider" })

  await serviceClient.from("whoop_connections")
    .update({ last_synced_at: now })
    .eq("user_id", body.userId)

  await recalculateScore(body.userId, serviceClient)

  return NextResponse.json({
    success: true,
    records: records.length,
    validNights: validNights.length,
    averages: { efficiency: Math.round(efficiency), hrv: Math.round(hrv * 10) / 10, deepPct: Math.round(deepPct), remPct: Math.round(remPct) },
  })
}

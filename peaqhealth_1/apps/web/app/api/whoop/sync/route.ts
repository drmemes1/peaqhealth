import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { fetchWhoopSleepData } from "../../../../lib/whoop/fetch"
import { recalculateScore } from "../../../../lib/score/recalculate"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Fetch last 7 days of WHOOP data
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  let records
  try {
    records = await fetchWhoopSleepData(user.id, startDate)
  } catch (err) {
    console.error("[whoop-sync] fetch error:", err)
    return NextResponse.json({ error: "Failed to fetch WHOOP data" }, { status: 502 })
  }

  if (records.length === 0) {
    return NextResponse.json({ success: true, records: 0 })
  }

  // 2. Upsert individual records into whoop_sleep_data
  const rows = records.map(r => ({ ...r, user_id: user.id }))
  const { error: upsertErr } = await serviceClient
    .from("whoop_sleep_data")
    .upsert(rows, { onConflict: "user_id,date" })

  if (upsertErr) console.error("[whoop-sync] upsert error:", upsertErr.message)

  // 3. Compute 7-night averages for wearable_connections
  const validNights = records.filter(r => r.sleep_efficiency > 0)
  const n = validNights.length || 1

  const avg = (key: keyof typeof validNights[0]) =>
    validNights.reduce((s, r) => s + (Number(r[key]) || 0), 0) / n

  const totalMinutes  = avg("total_sleep_minutes")
  const deepMinutes   = avg("deep_sleep_minutes")
  const remMinutes    = avg("rem_sleep_minutes")
  const deepPct       = totalMinutes > 0 ? (deepMinutes / totalMinutes) * 100 : 0
  const remPct        = totalMinutes > 0 ? (remMinutes  / totalMinutes) * 100 : 0
  const efficiency    = avg("sleep_efficiency")
  const hrv           = avg("hrv_rmssd")
  const restingHR     = avg("resting_heart_rate")
  const spo2          = avg("spo2")
  const spo2Dips      = spo2 >= 95 ? 0 : spo2 >= 92 ? 2 : 5  // estimate dips from SpO2

  // 4. Upsert aggregated metrics into wearable_connections (feeds score calc)
  await serviceClient.from("wearable_connections").upsert({
    user_id:            user.id,
    provider:           "whoop",
    status:             "connected",
    deep_sleep_pct:     deepPct,
    rem_pct:            remPct,
    sleep_efficiency:   efficiency,
    hrv_rmssd:          hrv,
    latest_resting_hr:  Math.round(restingHR) || null,
    latest_spo2_dips:   spo2Dips,
    nights_available:   validNights.length,
    last_sync_at:       new Date().toISOString(),
    updated_at:         new Date().toISOString(),
  }, { onConflict: "user_id,provider" })

  // 5. Update last_synced_at in whoop_connections
  await serviceClient.from("whoop_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", user.id)

  // 6. Recalculate score
  await recalculateScore(user.id, serviceClient)

  return NextResponse.json({ success: true, records: records.length })
}

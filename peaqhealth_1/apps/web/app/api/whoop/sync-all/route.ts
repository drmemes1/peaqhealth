import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { fetchWhoopSleepData } from "../../../../lib/whoop/fetch"
import { recalculateScore } from "../../../../lib/score/recalculate"

/**
 * POST /api/whoop/sync-all
 * Called by Vercel cron at 06:00 UTC daily.
 * Syncs all WHOOP-connected users and recalculates their scores.
 * TODO: add proper auth before public launch.
 */
export async function POST(_request: NextRequest) {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all WHOOP-connected users
  const { data: connections, error } = await serviceClient
    .from("whoop_connections")
    .select("user_id")

  if (error) {
    console.error("[sync-all] failed to fetch connections:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const userIds = (connections ?? []).map(c => c.user_id as string)
  console.log(`[sync-all] syncing ${userIds.length} WHOOP users`)

  const startIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const endIso   = new Date().toISOString()

  const results = await Promise.allSettled(
    userIds.map(async (userId) => {
      const records = await fetchWhoopSleepData(userId, startIso, endIso)
      if (records.length === 0) return { userId, records: 0 }

      const rows = records.map(r => ({ ...r, user_id: userId }))
      await serviceClient.from("whoop_sleep_data")
        .upsert(rows, { onConflict: "user_id,date" })

      const validNights = records.filter(r => r.sleep_efficiency > 0)
      const n = validNights.length || 1
      const avg = (key: keyof typeof validNights[0]) =>
        validNights.reduce((s, r) => s + (Number(r[key]) || 0), 0) / n

      const totalMin = avg("total_sleep_minutes")
      const deepPct  = totalMin > 0 ? (avg("deep_sleep_minutes") / totalMin) * 100 : 0
      const remPct   = totalMin > 0 ? (avg("rem_sleep_minutes")  / totalMin) * 100 : 0
      const spo2     = avg("spo2")
      const now      = new Date().toISOString()

      await serviceClient.from("wearable_connections").upsert({
        user_id:           userId,
        provider:          "whoop",
        status:            "connected",
        connected_at:      now,
        deep_sleep_pct:    deepPct,
        rem_pct:           remPct,
        sleep_efficiency:  avg("sleep_efficiency"),
        hrv_rmssd:         avg("hrv_rmssd"),
        latest_resting_hr: Math.round(avg("resting_heart_rate")) || null,
        latest_spo2_dips:  spo2 >= 95 ? 0 : spo2 >= 92 ? 2 : 5,
        nights_available:  validNights.length,
        last_sync_at:      now,
        updated_at:        now,
      }, { onConflict: "user_id,provider" })

      await serviceClient.from("whoop_connections")
        .update({ last_synced_at: now })
        .eq("user_id", userId)

      await recalculateScore(userId, serviceClient)
      return { userId, records: records.length }
    })
  )

  const succeeded = results.filter(r => r.status === "fulfilled").length
  const failed    = results.filter(r => r.status === "rejected").length
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[sync-all] failed for user ${userIds[i]}:`, r.reason)
    }
  })

  console.log(`[sync-all] done — ${succeeded} succeeded, ${failed} failed`)
  return NextResponse.json({ succeeded, failed, total: userIds.length })
}

import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { fetchAndStoreWhoopData, WhoopReconnectError } from "../../../../lib/whoop/fetch"
import { fetchAndStoreOuraData } from "../../../../lib/oura/fetch"
import { recalculateScore } from "../../../../lib/score/recalculate"

/**
 * POST /api/whoop/sync-all
 * Called by Vercel cron at 06:00 UTC daily.
 * Syncs all WHOOP-connected users (needs_reconnect = false) and recalculates scores.
 */
export async function POST(_request: NextRequest) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch all WHOOP-connected users that don't need reconnection
  const { data: connections, error } = await supabase
    .from("whoop_connections")
    .select("user_id")
    .eq("needs_reconnect", false)

  if (error) {
    console.error("[sync-all] failed to fetch connections:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const userIds = (connections ?? []).map(c => c.user_id as string)
  console.log(`[sync-all] syncing ${userIds.length} WHOOP users`)

  const results = await Promise.allSettled(
    userIds.map(async (userId) => {
      const count = await fetchAndStoreWhoopData(userId, 7) // nightly cron: 7 days (initial connect uses 30)
      await recalculateScore(userId, supabase)
      console.log(`[sync-all] user=${userId} records=${count}`)
      return { userId, records: count }
    })
  )

  const succeeded = results.filter(r => r.status === "fulfilled").length
  const failed    = results.filter(r => r.status === "rejected").length

  await Promise.all(
    results.map(async (r, i) => {
      if (r.status === "rejected") {
        const userId = userIds[i]
        console.error(`[sync-all] failed for user ${userId}:`, r.reason)
        if (r.reason instanceof WhoopReconnectError) {
          await supabase.from("whoop_connections")
            .update({ needs_reconnect: true, last_sync_error: "Reconnect required — token refresh failed" })
            .eq("user_id", userId)
        }
      }
    })
  )

  console.log(`[sync-all] done — ${succeeded} succeeded, ${failed} failed`)

  // ── Oura (Junction) daily sync — 1 day lookback ──────────────────────────
  const { data: ouraConnections } = await supabase
    .from("wearable_connections")
    .select("user_id")
    .eq("provider", "oura")
    .eq("status", "connected")

  const ouraUserIds = (ouraConnections ?? []).map(c => c.user_id as string)
  console.log(`[sync-all] syncing ${ouraUserIds.length} Oura users`)

  const ouraResults = await Promise.allSettled(
    ouraUserIds.map(async (userId) => {
      const count = await fetchAndStoreOuraData(userId, 1)
      await recalculateScore(userId, supabase)
      console.log(`[sync-all] oura user=${userId} records=${count}`)
      return { userId, records: count }
    })
  )

  const ouraSucceeded = ouraResults.filter(r => r.status === "fulfilled").length
  const ouraFailed    = ouraResults.filter(r => r.status === "rejected").length
  console.log(`[sync-all] oura done — ${ouraSucceeded} succeeded, ${ouraFailed} failed`)

  return NextResponse.json({
    whoop:  { succeeded, failed, total: userIds.length },
    oura:   { succeeded: ouraSucceeded, failed: ouraFailed, total: ouraUserIds.length },
  })
}

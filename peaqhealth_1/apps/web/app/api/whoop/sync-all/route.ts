import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { fetchAndStoreWhoopData, WhoopReconnectError } from "../../../../lib/whoop/fetch"
import { fetchAndStoreOuraData } from "../../../../lib/oura/fetch"
import { recalculateScore } from "../../../../lib/score/recalculate"

/**
 * POST /api/whoop/sync-all
 * Called by Vercel cron at 06:00 UTC daily.
 * Syncs all connected wearable users (WHOOP + Oura) and recalculates scores.
 */
export async function POST(_request: NextRequest) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // ── WHOOP sync ─────────────────────────────────────────────────────────────
  const { data: whoopConns, error } = await supabase
    .from("wearable_connections_v2")
    .select("user_id")
    .eq("provider", "whoop")
    .eq("needs_reconnect", false)

  if (error) {
    console.error("[sync-all] failed to fetch WHOOP connections:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const whoopUserIds = (whoopConns ?? []).map(c => c.user_id as string)
  console.log(`[sync-all] syncing ${whoopUserIds.length} WHOOP users`)

  const whoopResults = await Promise.allSettled(
    whoopUserIds.map(async (userId) => {
      const count = await fetchAndStoreWhoopData(userId, 7) // nightly cron: 7 days
      await recalculateScore(userId, supabase)
      console.log(`[sync-all] whoop user=${userId} records=${count}`)
      return { userId, records: count }
    })
  )

  const whoopSucceeded = whoopResults.filter(r => r.status === "fulfilled").length
  const whoopFailed    = whoopResults.filter(r => r.status === "rejected").length

  await Promise.all(
    whoopResults.map(async (r, i) => {
      if (r.status === "rejected") {
        const userId = whoopUserIds[i]
        console.error(`[sync-all] WHOOP failed for user ${userId}:`, r.reason)
        if (r.reason instanceof WhoopReconnectError) {
          await supabase.from("wearable_connections_v2")
            .update({ needs_reconnect: true, last_sync_error: "Reconnect required — token refresh failed" })
            .eq("user_id", userId)
            .eq("provider", "whoop")
        }
      }
    })
  )

  console.log(`[sync-all] WHOOP done — ${whoopSucceeded} succeeded, ${whoopFailed} failed`)

  // ── Oura daily sync ────────────────────────────────────────────────────────
  const { data: ouraConns } = await supabase
    .from("wearable_connections_v2")
    .select("user_id")
    .eq("provider", "oura")
    .eq("needs_reconnect", false)

  const ouraUserIds = (ouraConns ?? []).map(c => c.user_id as string)
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
  console.log(`[sync-all] Oura done — ${ouraSucceeded} succeeded, ${ouraFailed} failed`)

  return NextResponse.json({
    whoop: { succeeded: whoopSucceeded, failed: whoopFailed, total: whoopUserIds.length },
    oura:  { succeeded: ouraSucceeded,  failed: ouraFailed,  total: ouraUserIds.length },
  })
}

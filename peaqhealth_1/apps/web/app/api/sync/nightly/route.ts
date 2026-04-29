import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient, SupabaseClient } from "@supabase/supabase-js"
import { fetchAndStoreWhoopData, WhoopReconnectError } from "../../../../lib/whoop/fetch"
import { fetchAndStoreJunctionData } from "../../../../lib/junction/fetch"
import { recalculateScore } from "../../../../lib/score/recalculate"
import { sendReconnectEmail } from "../../../../lib/email/reconnect"
import webpush from "web-push"

export const maxDuration = 300

async function sendSleepPush(userId: string, supabase: SupabaseClient) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return

  const { data: sub } = await supabase.from("push_subscriptions").select("subscription").eq("user_id", userId).maybeSingle()
  if (!sub) return

  const { data: latest } = await supabase.from("sleep_data").select("hrv_rmssd, sleep_efficiency, deep_sleep_minutes, total_sleep_minutes").eq("user_id", userId).order("date", { ascending: false }).limit(1).maybeSingle()
  if (!latest) return

  const hrv = latest.hrv_rmssd ? `HRV ${Math.round(latest.hrv_rmssd as number)}ms` : null
  const eff = latest.sleep_efficiency ? `Sleep ${Math.round(latest.sleep_efficiency as number)}%` : null
  const deep = latest.total_sleep_minutes && latest.deep_sleep_minutes
    ? `Deep ${Math.round(((latest.deep_sleep_minutes as number) / (latest.total_sleep_minutes as number)) * 100)}%`
    : null
  const parts = [hrv, eff, deep].filter(Boolean).join(" · ")
  if (!parts) return

  webpush.setVapidDetails("mailto:igor@oravi.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
  const subscription = JSON.parse(sub.subscription as string)
  await webpush.sendNotification(subscription, JSON.stringify({
    title: "Your morning Oravi signal",
    body: parts,
    url: "/dashboard/sleep",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  }))
}

/**
 * POST /api/sync/nightly
 * Called by Vercel cron at 06:00 UTC daily.
 * Syncs all connected wearable users across all providers and recalculates scores.
 */
export async function POST(_request: NextRequest) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch all active wearable connections
  const { data: allConns, error } = await supabase
    .from("wearable_connections_v2")
    .select("user_id, provider, external_user_id")
    .eq("needs_reconnect", false)

  if (error) {
    console.error("[sync/nightly] failed to fetch wearable connections:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const connections = allConns ?? []
  console.log(`[sync/nightly] found ${connections.length} active connections`)

  // Group by provider for logging
  const byProvider: Record<string, typeof connections> = {}
  for (const conn of connections) {
    const p = conn.provider as string
    if (!byProvider[p]) byProvider[p] = []
    byProvider[p].push(conn)
  }
  for (const [provider, conns] of Object.entries(byProvider)) {
    console.log(`[sync/nightly] ${provider}: ${conns.length} users`)
  }

  type ProviderStats = { succeeded: number; failed: number; total: number }
  const stats: Record<string, ProviderStats> = {}

  // Process all connections
  const results = await Promise.allSettled(
    connections.map(async (conn) => {
      const userId   = conn.user_id as string
      const provider = conn.provider as string

      // apple_health pushes directly from mobile — skip
      if (provider === "apple_health") {
        console.log(`[sync/nightly] skipping apple_health for user=${userId}`)
        return { userId, provider, records: 0, skipped: true }
      }

      let count: number

      if (provider === "whoop") {
        count = await fetchAndStoreWhoopData(userId, 7)
      } else {
        count = await fetchAndStoreJunctionData(userId, provider, 7)
      }

      await recalculateScore(userId, supabase)
      console.log(`[sync/nightly] ${provider} user=${userId} records=${count}`)

      try {
        await sendSleepPush(userId, supabase)
      } catch (e) {
        console.error(`[sync/nightly] push failed user=${userId}`, e)
      }

      return { userId, provider, records: count, skipped: false }
    })
  )

  // Tally stats and handle failures
  for (let i = 0; i < results.length; i++) {
    const result   = results[i]
    const conn     = connections[i]
    const userId   = conn.user_id as string
    const provider = conn.provider as string

    if (!stats[provider]) stats[provider] = { succeeded: 0, failed: 0, total: 0 }
    stats[provider].total++

    if (result.status === "fulfilled") {
      stats[provider].succeeded++
    } else {
      stats[provider].failed++
      const err = result.reason
      console.error(`[sync/nightly] ${provider} failed for user=${userId}:`, err)

      const isReconnectError =
        err instanceof WhoopReconnectError ||
        (err instanceof Error && err.message.includes("401"))

      if (isReconnectError) {
        await supabase
          .from("wearable_connections_v2")
          .update({
            needs_reconnect: true,
            last_sync_error: "Reconnect required — token refresh failed",
          })
          .eq("user_id", userId)
          .eq("provider", provider)

        // Look up email and send reconnect notification
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", userId)
          .maybeSingle()

        if (profile?.email) {
          await sendReconnectEmail(profile.email as string, provider)
        }
      }
    }
  }

  console.log("[sync/nightly] done", JSON.stringify(stats))
  return NextResponse.json({ stats })
}

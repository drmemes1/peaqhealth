import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { fetchAndStoreWhoopData } from "@/lib/whoop/fetch"
import { fetchAndStoreOuraData } from "@/lib/oura/fetch"
import { recalculateScore } from "@/lib/score/recalculate"

export const maxDuration = 300

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  console.log("[morning-sync] starting —", new Date().toISOString())

  const { data: connections } = await svc
    .from("wearable_connections_v2")
    .select("user_id, provider, needs_reconnect")
    .eq("needs_reconnect", false)

  if (!connections?.length) {
    console.log("[morning-sync] no active connections found")
    return NextResponse.json({ synced: 0 })
  }

  console.log(`[morning-sync] found ${connections.length} active connections`)

  const results = {
    succeeded: [] as string[],
    failed: [] as string[],
    skipped: [] as string[],
  }

  for (const conn of connections) {
    const { user_id, provider } = conn

    try {
      if (provider === "whoop") {
        const records = await fetchAndStoreWhoopData(user_id, 7)
        console.log(`[morning-sync] WHOOP user=${user_id.slice(0, 8)} records=${records}`)

      } else if (provider === "oura" || provider === "garmin") {
        // fetchAndStoreOuraData resolves junction_user_id internally from wearable_connections_v2
        const records = await fetchAndStoreOuraData(user_id, 7)
        console.log(`[morning-sync] ${provider} user=${user_id.slice(0, 8)} records=${records}`)

      } else {
        console.log(`[morning-sync] unknown provider=${provider} user=${user_id.slice(0, 8)} — skipping`)
        results.skipped.push(user_id)
        continue
      }

      await recalculateScore(user_id, svc)

      // Invalidate sleep narrative cache so it regenerates with fresh data on next /trends load
      await svc
        .from("sleep_narratives")
        .delete()
        .eq("user_id", user_id)
        .eq("period_end", new Date().toISOString().split("T")[0])
      console.log(`[morning-sync] invalidated sleep narrative for user=${user_id.slice(0, 8)}`)

      results.succeeded.push(user_id)

    } catch (err) {
      console.error(`[morning-sync] failed for user=${user_id.slice(0, 8)} provider=${provider}:`, err)
      results.failed.push(user_id)
    }

    // Rate limit — 500ms between users to avoid thundering herd
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(
    `[morning-sync] complete — succeeded=${results.succeeded.length}`,
    `failed=${results.failed.length} skipped=${results.skipped.length}`,
  )

  return NextResponse.json(results)
}

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createSessionClient } from "@/lib/supabase/server"
import { fetchAndStoreWhoopData } from "@/lib/whoop/fetch"
import { fetchAndStoreOuraData } from "@/lib/oura/fetch"
import { recalculateScore } from "@/lib/score/recalculate"

export async function POST() {
  const sessionClient = await createSessionClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: conn } = await svc
    .from("wearable_connections_v2")
    .select("provider, needs_reconnect")
    .eq("user_id", user.id)
    .eq("needs_reconnect", false)
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!conn) {
    return NextResponse.json({ error: "No wearable connected" }, { status: 400 })
  }

  if (conn.needs_reconnect) {
    return NextResponse.json({ error: "Wearable needs reconnection" }, { status: 400 })
  }

  let records = 0

  if (conn.provider === "whoop") {
    records = await fetchAndStoreWhoopData(user.id, 7)
  } else if (conn.provider === "oura" || conn.provider === "garmin") {
    records = await fetchAndStoreOuraData(user.id, 7)
  } else {
    return NextResponse.json({ error: `Unsupported provider: ${conn.provider}` }, { status: 400 })
  }

  await recalculateScore(user.id, svc)

  console.log(`[sync-now] user=${user.id.slice(0, 8)} provider=${conn.provider} records=${records}`)

  return NextResponse.json({ success: true, records, provider: conn.provider })
}

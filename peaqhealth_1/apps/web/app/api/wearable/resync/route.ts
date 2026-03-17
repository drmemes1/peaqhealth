import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

const JUNCTION_BASE_URL =
  process.env.JUNCTION_ENV === "production"
    ? "https://api.us.junction.com"
    : "https://api.sandbox.us.junction.com"

const RATE_LIMIT_MINUTES = 60

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // 1. Get junction_user_id from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("junction_user_id")
    .eq("id", user.id)
    .single()

  if (!profile?.junction_user_id) {
    return NextResponse.json({ error: "No wearable connected" }, { status: 400 })
  }

  // 2. Check rate limit via wearable_connections
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: wearable } = await serviceClient
    .from("wearable_connections")
    .select("last_sync_requested_at")
    .eq("user_id", user.id)
    .eq("status", "connected")
    .order("connected_at", { ascending: false })
    .limit(1)
    .single()

  if (wearable?.last_sync_requested_at) {
    const lastReq = new Date(wearable.last_sync_requested_at).getTime()
    const msSince = Date.now() - lastReq
    const msLimit = RATE_LIMIT_MINUTES * 60 * 1000

    if (msSince < msLimit) {
      const nextAvailableAt = new Date(lastReq + msLimit).toISOString()
      return NextResponse.json(
        {
          error: "Sync requested recently",
          next_sync_available_at: nextAvailableAt,
        },
        { status: 429 }
      )
    }
  }

  // 3. Request fresh sleep data from Junction
  const junctionUserId = profile.junction_user_id as string
  try {
    await fetch(
      `${JUNCTION_BASE_URL}/v2/user/${junctionUserId}/resources/sleep/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vital-api-key": process.env.JUNCTION_API_KEY ?? "",
        },
      }
    )
  } catch (err) {
    console.error("[resync] Junction refresh call failed:", err)
    // Non-fatal — still stamp the timestamp so we don't hammer Junction on retry
  }

  // 4. Stamp last_sync_requested_at
  const now = new Date().toISOString()
  await serviceClient
    .from("wearable_connections")
    .update({ last_sync_requested_at: now })
    .eq("user_id", user.id)
    .eq("status", "connected")

  const nextSyncAvailableAt = new Date(
    Date.now() + RATE_LIMIT_MINUTES * 60 * 1000
  ).toISOString()

  return NextResponse.json({
    success: true,
    message: "Sync requested — your score will update in a few minutes",
    next_sync_available_at: nextSyncAvailableAt,
  })
}

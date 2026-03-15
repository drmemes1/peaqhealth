import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../lib/score/recalculate"

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const webhookSecret = process.env.JUNCTION_WEBHOOK_SECRET
  if (webhookSecret) {
    const incoming = request.headers.get("x-vital-webhook-secret")
    if (incoming !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { event_type, client_user_id } = body as { event_type: string; client_user_id: string }

  // Only handle sleep events
  if (event_type !== "daily.data.sleep.created" && event_type !== "daily.data.sleep.updated") {
    return NextResponse.json({ status: "ignored" })
  }

  if (!client_user_id) {
    return NextResponse.json({ error: "Missing client_user_id" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const userId = client_user_id

  // Recalculate full score with all panels
  const newScore = await recalculateScore(userId, supabase)

  // Update last_sync_at on wearable_connections
  await supabase
    .from("wearable_connections")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "connected")

  return NextResponse.json({ status: "processed", score: newScore })
}

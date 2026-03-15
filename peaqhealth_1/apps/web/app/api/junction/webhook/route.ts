import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../lib/score/recalculate"

const HANDLED_EVENTS = new Set([
  "daily.data.sleep.created",
  "daily.data.sleep.updated",
  "daily.data.sleep_cycle.created",
  "daily.data.sleep_cycle.updated",
  "daily.data.sleep_breathing_disturbance.created",
  "daily.data.sleep_breathing_disturbance.updated",
  "daily.data.sleep_apnea_alert.created",
  "historical.data",
])

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
    body = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { event_type, client_user_id } = body as { event_type: string; client_user_id: string }

  if (!HANDLED_EVENTS.has(event_type)) {
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

  // ── sleep_apnea_alert: flag high_osa_risk ────────────────────────────────
  if (event_type === "daily.data.sleep_apnea_alert.created") {
    await supabase
      .from("wearable_connections")
      .update({ high_osa_risk: true, last_sync_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "connected")

    const newScore = await recalculateScore(userId, supabase)
    return NextResponse.json({ status: "processed", event: "sleep_apnea_alert", score: newScore })
  }

  // ── historical.data: upsert all sleep records then recalculate once ──────
  if (event_type === "historical.data") {
    const data = body.data as Record<string, unknown> | undefined
    const sleepRecords = (data?.sleep ?? []) as Array<Record<string, unknown>>

    if (sleepRecords.length > 0) {
      // Upsert each record into junction_sleep_summaries if that table exists,
      // otherwise just update retro_nights count on the wearable connection.
      const retroNights = sleepRecords.filter(r => (r.duration as number) > 0).length

      await supabase
        .from("wearable_connections")
        .update({
          retro_nights: retroNights,
          last_sync_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("status", "connected")
    }

    const newScore = await recalculateScore(userId, supabase)
    return NextResponse.json({ status: "processed", event: "historical.data", retroNights: sleepRecords.length, score: newScore })
  }

  // ── All other sleep events: update last_sync_at + recalculate ────────────
  await supabase
    .from("wearable_connections")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "connected")

  const newScore = await recalculateScore(userId, supabase)
  return NextResponse.json({ status: "processed", score: newScore })
}

import { NextRequest, NextResponse } from "next/server"
import { Webhook } from "svix"
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
  "provider.connection.created",
])

export async function POST(request: NextRequest) {
  // ── Signature verification (Svix) ────────────────────────────────────────
  // Junction uses Svix to deliver webhooks. Svix signs each request with
  // three headers: svix-id, svix-timestamp, svix-signature.
  const webhookSecret = process.env.JUNCTION_WEBHOOK_SECRET
  const payload = await request.text()

  if (webhookSecret) {
    const svixId        = request.headers.get("svix-id")
    const svixTimestamp = request.headers.get("svix-timestamp")
    const svixSignature = request.headers.get("svix-signature")

    console.log("[webhook] svix headers — id:", svixId, "timestamp:", svixTimestamp, "signature present:", !!svixSignature)

    const wh = new Webhook(webhookSecret)
    try {
      wh.verify(payload, {
        "svix-id":        svixId        ?? "",
        "svix-timestamp": svixTimestamp ?? "",
        "svix-signature": svixSignature ?? "",
      })
      console.log("[webhook] Webhook signature verified")
    } catch {
      console.error("[webhook] Svix signature verification failed")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  } else {
    console.warn("[webhook] JUNCTION_WEBHOOK_SECRET not set — skipping verification")
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = JSON.parse(payload) as Record<string, unknown>
  } catch {
    console.error("[webhook] failed to parse JSON body")
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Junction webhook payload shape:
  //   event_type    — e.g. "daily.data.sleep.created"
  //   user_id       — Junction's own UUID for this user (stable, not hashed)
  //   client_user_id — our ID passed at user-creation time, BUT Junction
  //                    hashes it in webhook payloads, so we CANNOT use it
  //                    directly as a Supabase user ID.
  const event_type      = body.event_type      as string | undefined
  const junctionUserId  = body.user_id         as string | undefined
  const clientUserIdRaw = body.client_user_id  as string | undefined

  console.log("[webhook] received event:", event_type,
    "| junction user_id:", junctionUserId,
    "| client_user_id (hashed):", clientUserIdRaw)

  if (!event_type || !HANDLED_EVENTS.has(event_type)) {
    console.log("[webhook] ignoring event:", event_type)
    return NextResponse.json({ status: "ignored" })
  }

  if (!junctionUserId) {
    console.error("[webhook] missing user_id in payload")
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── Resolve Supabase user from Junction user_id ───────────────────────────
  // client_user_id is hashed by Junction in webhook payloads, so we look up
  // the real Supabase user ID via profiles.junction_user_id instead.
  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("junction_user_id", junctionUserId)
    .single()

  if (profileErr || !profileRow) {
    // For provider.connection.created: junction_user_id may not be stamped yet.
    // Try client_user_id directly as the Supabase UUID (unhashed for this event type).
    if (event_type === "provider.connection.created" && clientUserIdRaw) {
      const { error: stampErr } = await supabase
        .from("profiles")
        .update({ junction_user_id: junctionUserId })
        .eq("id", clientUserIdRaw)
      if (!stampErr) {
        console.log("[webhook] provider.connection.created — stamped junction_user_id via client_user_id fallback:", clientUserIdRaw)
      } else {
        console.error("[webhook] provider.connection.created — fallback stamp failed:", stampErr.message)
      }
    }
    console.error("[webhook] No profile found for junction_user_id:", junctionUserId, "— skipping event")
    return NextResponse.json({ received: true, skipped: true })
  }

  const userId = profileRow.id as string
  console.log("[webhook] resolved Supabase userId:", userId, "for junction_user_id:", junctionUserId)

  // ── provider.connection.created: stamp junction_user_id + upsert connection ─
  if (event_type === "provider.connection.created") {
    await supabase
      .from("profiles")
      .update({ junction_user_id: junctionUserId })
      .eq("id", userId)

    const data = body.data as Record<string, unknown> | undefined
    const provider = (data?.source ?? data?.provider_slug ?? data?.provider ?? "unknown") as string

    const { error: connErr } = await supabase
      .from("wearable_connections")
      .upsert({
        user_id: userId,
        provider,
        junction_user_id: junctionUserId,
        connected_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
        status: "connected",
      }, { onConflict: "user_id,provider" })

    if (connErr) console.error("[webhook] provider.connection.created — wearable_connections upsert error:", connErr.message)
    else console.log("[webhook] provider.connection.created — upserted wearable_connections for user:", userId, "provider:", provider)

    return NextResponse.json({ received: true })
  }

  // ── sleep_breathing_disturbance: store spo2 dip estimate ─────────────────
  if (
    event_type === "daily.data.sleep_breathing_disturbance.created" ||
    event_type === "daily.data.sleep_breathing_disturbance.updated"
  ) {
    const data = body.data as Record<string, unknown> | undefined
    const disturbanceCount = (data?.disturbance_count as number) ?? 0
    const spo2Dips =
      disturbanceCount === 0  ? 0 :
      disturbanceCount <= 3   ? 1 :
      disturbanceCount <= 10  ? 3 : 8

    console.log("[webhook] sleep_breathing_disturbance — disturbanceCount:", disturbanceCount, "→ spo2Dips:", spo2Dips)

    const { error: updateErr } = await supabase
      .from("wearable_connections")
      .update({ latest_spo2_dips: spo2Dips, last_sync_at: new Date().toISOString(), status: "connected" })
      .eq("user_id", userId)

    if (updateErr) console.error("[webhook] wearable_connections update error:", updateErr.message)

    return NextResponse.json({ status: "processed", event: "sleep_breathing_disturbance", spo2Dips })
  }

  // ── sleep_apnea_alert: flag high_osa_risk ─────────────────────────────────
  if (event_type === "daily.data.sleep_apnea_alert.created") {
    console.log("[webhook] sleep_apnea_alert — flagging high_osa_risk for user:", userId)

    const { error: updateErr } = await supabase
      .from("wearable_connections")
      .update({ high_osa_risk: true, last_sync_at: new Date().toISOString(), status: "connected" })
      .eq("user_id", userId)

    if (updateErr) console.error("[webhook] wearable_connections update error:", updateErr.message)

    const newScore = await recalculateScore(userId, supabase)
    console.log("[webhook] sleep_apnea_alert — recalculated score:", newScore)
    return NextResponse.json({ status: "processed", event: "sleep_apnea_alert", score: newScore })
  }

  // ── historical.data: upsert sleep records then recalculate once ───────────
  if (event_type === "historical.data") {
    const data = body.data as Record<string, unknown> | undefined
    const sleepRecords = (data?.sleep ?? []) as Array<Record<string, unknown>>
    console.log("[webhook] historical.data — sleep records:", sleepRecords.length)

    if (sleepRecords.length > 0) {
      const retroNights = sleepRecords.filter(r => (r.duration as number) > 0).length
      const { error: updateErr } = await supabase
        .from("wearable_connections")
        .update({ retro_nights: retroNights, last_sync_at: new Date().toISOString(), status: "connected" })
        .eq("user_id", userId)

      if (updateErr) console.error("[webhook] wearable_connections update error:", updateErr.message)
    }

    const newScore = await recalculateScore(userId, supabase)
    console.log("[webhook] historical.data — recalculated score:", newScore)
    return NextResponse.json({ status: "processed", event: "historical.data", retroNights: sleepRecords.length, score: newScore })
  }

  // ── All other sleep events: update last_sync_at + recalculate ─────────────
  console.log("[webhook] sleep event:", event_type, "— updating last_sync_at and recalculating for user:", userId)

  const { error: updateErr } = await supabase
    .from("wearable_connections")
    .update({ last_sync_at: new Date().toISOString(), status: "connected" })
    .eq("user_id", userId)

  if (updateErr) console.error("[webhook] wearable_connections update error:", updateErr.message)

  const newScore = await recalculateScore(userId, supabase)
  console.log("[webhook] recalculated score:", newScore, "for user:", userId)
  return NextResponse.json({ status: "processed", score: newScore })
}

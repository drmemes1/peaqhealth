import { after } from "next/server"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { getSleepSummaries, requestHistoricalPull } from "@peaq/api-client/junction"
import { recalculateScore } from "../../../../lib/score/recalculate"
import { fetchAndStoreOuraData } from "../../../../lib/oura/fetch"

export async function POST(request: NextRequest) {
  console.log("[wearable] connected route called")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error("[wearable] auth failed — no user session")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  console.log("[wearable] auth userId:", user.id)

  let provider: string
  let junctionUserId: string
  try {
    const body = await request.json() as Record<string, unknown>
    console.log("[wearable] full body:", JSON.stringify(body))
    const rawMetadata = body.rawMetadata as Record<string, unknown> | undefined
    console.log("[wearable] rawMetadata:", JSON.stringify(rawMetadata ?? "(not sent)"))

    // Extract provider with fallback chain — widget sometimes sends "unknown"
    // so we dig into rawMetadata.source_slug which reliably contains "oura" etc.
    const bodyProvider = body.provider as string | undefined
    provider = (
      bodyProvider && bodyProvider !== "unknown" ? bodyProvider : null
    ) ??
      (rawMetadata?.source_slug as string | undefined)?.toLowerCase() ??
      (rawMetadata?.source    as string | undefined)?.toLowerCase() ??
      (((body.connected as Array<Record<string, unknown>>)?.[0]?.source as Record<string, unknown>)?.slug as string | undefined) ??
      "unknown"

    console.log("[wearable] extracted provider:", provider,
      "| from source_slug:", rawMetadata?.source_slug,
      "| from source:", rawMetadata?.source)

    junctionUserId = (body.junctionUserId as string) ?? ""
  } catch {
    console.error("[wearable] failed to parse request body")
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  console.log("[wearable] step 1 — auth OK, userId:", user.id)

  // Hard guard: WHOOP has its own OAuth callback and must never reach this handler.
  // If it does, something in the frontend routing is broken.
  if (provider === "whoop") {
    console.error("[wearable] ERROR: WHOOP connect should not reach this handler — use /api/auth/whoop/callback")
    return NextResponse.json({ error: "Wrong handler for WHOOP" }, { status: 400 })
  }

  if (!provider || provider === "unknown") {
    console.error("[wearable] could not resolve provider from body — cannot save connection")
    return NextResponse.json({ error: "Missing provider" }, { status: 400 })
  }

  // If junctionUserId not sent by client widget, fall back to profile lookup
  // (it was stored there during link-token creation)
  if (!junctionUserId) {
    console.log("[wearable] junctionUserId missing from body — looking up from profile")
    const { data: profile } = await supabase
      .from("profiles")
      .select("junction_user_id")
      .eq("id", user.id)
      .single()
    junctionUserId = (profile?.junction_user_id as string | null) ?? ""
    console.log("[wearable] profile junction_user_id lookup:", junctionUserId || "(not found)")
  }

  if (!junctionUserId) {
    console.error("[wearable] junctionUserId not found in body or profile — aborting")
    return NextResponse.json({ error: "Missing junctionUserId" }, { status: 400 })
  }

  console.log("[wearable] step 2 — body parsed, provider:", provider, "junctionUserId:", junctionUserId)

  // Step 3: stamp profile with junction_user_id so webhook lookups resolve correctly
  await supabase
    .from("profiles")
    .update({ junction_user_id: junctionUserId })
    .eq("id", user.id)
  console.log("[wearable] step 3 — profile stamped with junction_user_id")

  // Step 4: fetch retroactive sleep data (90 days)
  let retroNights = 0
  try {
    const summaries = await getSleepSummaries(junctionUserId, { days: 90 })
    retroNights = summaries.filter(s => s.duration > 0).length
  } catch {
    // proceed with 0 retro nights
  }
  console.log("[wearable] step 4 — retro nights fetched:", retroNights)

  // Step 5: upsert wearable_connections_v2 row
  const { error: insertError } = await supabase
    .from("wearable_connections_v2")
    .upsert({
      user_id:          user.id,
      provider,
      external_user_id: junctionUserId,
      connected_at:     new Date().toISOString(),
      last_synced_at:   new Date().toISOString(),
      needs_reconnect:  false,
    }, { onConflict: "user_id,provider" })

  console.log("[wearable] step 5 — upsert result:", insertError ?? "success")
  if (insertError) {
    console.error("[wearable] upsert error:", insertError.message, insertError.code)
    return NextResponse.json({ error: "Failed to save connection" }, { status: 500 })
  }

  // Step 6: recalculate score if we have enough sleep data
  let newScore: number | undefined
  if (retroNights >= 7) {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    newScore = await recalculateScore(user.id, serviceClient)
    console.log("[wearable] step 6 — score recalculated:", newScore)
  } else {
    console.log("[wearable] step 6 — skipped recalculate (retroNights < 7)")
  }

  // Request historical data pull (90 days) — Junction will backfill via historical.data webhook
  try {
    await requestHistoricalPull(junctionUserId, { days: 90 })
    console.log("[wearable] historical pull requested for junctionUserId:", junctionUserId)
  } catch (err) {
    // non-fatal — 405 in sandbox is expected; webhook backfill still fires
    console.warn("[wearable] historical pull request failed (non-fatal):", err instanceof Error ? err.message : err)
  }

  // Backfill 30 days of sleep data into sleep_data after response (provider-specific)
  const capturedUserId = user.id
  const capturedProvider = provider
  after(async () => {
    console.log("[wearable] backfill starting for userId:", capturedUserId, "provider:", capturedProvider)
    try {
      const svc = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
      if (capturedProvider === "oura") {
        const count = await fetchAndStoreOuraData(capturedUserId, 30)
        console.log("[wearable] oura backfill complete, records:", count)
      } else {
        console.log("[wearable] no dedicated fetch function for provider:", capturedProvider, "— skipping backfill")
      }
      await recalculateScore(capturedUserId, svc)
      console.log("[wearable] score recalculated after backfill")
    } catch (err) {
      console.error("[wearable] backfill error:", err)
    }
  })

  return NextResponse.json({ connected: true, retroNights, score: newScore })
}

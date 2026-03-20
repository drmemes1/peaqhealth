import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { getSleepSummaries, requestHistoricalPull } from "@peaq/api-client/junction"
import { recalculateScore } from "../../../../lib/score/recalculate"

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
    provider = (body.provider as string) ?? ""
    junctionUserId = (body.junctionUserId as string) ?? ""
  } catch {
    console.error("[wearable] failed to parse request body")
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  console.log("[wearable] step 1 — auth OK, userId:", user.id)

  if (!provider || !junctionUserId) {
    return NextResponse.json({ error: "Missing provider or junctionUserId" }, { status: 400 })
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

  // Step 5: upsert wearable_connections row
  const { data: wearableRow, error: insertError } = await supabase
    .from("wearable_connections")
    .upsert({
      user_id: user.id,
      provider,
      junction_user_id: junctionUserId,
      status: "connected",
      connected_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      retro_nights: retroNights,
    }, { onConflict: "user_id,provider" })
    .select()
    .single()

  console.log("[wearable] step 5 — upsert result:", insertError ?? "success", "row id:", wearableRow?.id)
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
  } catch {
    // non-fatal — historical pull can fail silently; webhook will not fire
  }

  return NextResponse.json({ connected: true, retroNights, score: newScore })
}

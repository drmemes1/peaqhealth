import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { getSleepSummaries } from "@peaq/api-client/junction"
import { recalculateScore } from "../../../../lib/score/recalculate"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { provider, junctionUserId } = await request.json() as { provider: string; junctionUserId: string }

  if (!provider || !junctionUserId) {
    return NextResponse.json({ error: "Missing provider or junctionUserId" }, { status: 400 })
  }

  // Fetch retroactive sleep data (90 days)
  let retroNights = 0
  try {
    const summaries = await getSleepSummaries(junctionUserId, { days: 90 })
    retroNights = summaries.filter(s => s.duration > 0).length
  } catch {
    // proceed with 0 retro nights
  }

  // Insert wearable_connections row
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

  if (insertError) {
    console.error("wearable_connections insert error:", insertError)
    return NextResponse.json({ error: "Failed to save connection" }, { status: 500 })
  }

  // Recalculate score if we have enough sleep data
  let newScore: number | undefined
  if (retroNights >= 7) {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    newScore = await recalculateScore(user.id, serviceClient)
  }

  return NextResponse.json({ connected: true, retroNights, score: newScore })
}

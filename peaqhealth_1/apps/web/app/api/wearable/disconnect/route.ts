/**
 * Generic wearable disconnect — handles any provider.
 * WHOOP uses /api/auth/whoop/disconnect (adds token revocation).
 * Oura uses /api/auth/oura/disconnect (dedicated route).
 * All other devices (Garmin, Fitbit, Samsung, Polar, etc.) use this route.
 *
 * POST body: { provider: string }
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../lib/score/recalculate"

// Providers with dedicated disconnect routes — route to the right endpoint client-side.
// This route is for everything else.
const DEDICATED_ROUTES = new Set(["whoop", "oura"])

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let provider: string
  try {
    const body = await request.json() as { provider?: string }
    provider = body.provider?.trim().toLowerCase() ?? ""
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!provider) return NextResponse.json({ error: "Missing provider" }, { status: 400 })

  if (DEDICATED_ROUTES.has(provider)) {
    return NextResponse.json(
      { error: `Use /api/auth/${provider}/disconnect for this provider` },
      { status: 400 },
    )
  }

  const userId = user.id
  console.log(`[wearable-disconnect] starting for provider=${provider} user=${userId}`)

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch external_user_id for Junction API unlink
  const { data: conn } = await svc
    .from("wearable_connections_v2")
    .select("external_user_id")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle()

  // Best-effort: unlink from Junction/Vital (non-fatal)
  if (conn?.external_user_id) {
    const baseUrl = process.env.JUNCTION_ENV === "production"
      ? "https://api.tryvital.io"
      : "https://api.sandbox.tryvital.io"
    try {
      const res = await fetch(
        `${baseUrl}/v2/user/${conn.external_user_id}/providers/${provider}`,
        {
          method: "DELETE",
          headers: { "x-vital-api-key": process.env.JUNCTION_API_KEY! },
        },
      )
      if (!res.ok) {
        console.warn(`[wearable-disconnect] Vital unlink returned ${res.status} (non-fatal)`)
      } else {
        console.log(`[wearable-disconnect] Vital unlink OK for provider=${provider}`)
      }
    } catch (err) {
      console.warn("[wearable-disconnect] Vital unlink failed (non-fatal):", err)
    }
  }

  // Step 1: Null score_snapshots FK
  console.log(`[wearable-disconnect] step 1 — nulling score_snapshots.wearable_connection_id`)
  const { error: snapErr } = await svc
    .from("score_snapshots")
    .update({ wearable_connection_id: null })
    .eq("user_id", userId)
  if (snapErr) console.warn("[wearable-disconnect] score_snapshots update failed (non-fatal):", snapErr.message)

  // Step 2: Delete from wearable_connections_v2
  console.log(`[wearable-disconnect] step 2 — deleting wearable_connections_v2 for provider=${provider}`)
  const { error: connErr, count: connCount } = await svc
    .from("wearable_connections_v2")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("provider", provider)
  console.log(`[wearable-disconnect] wearable_connections_v2 deleted:`, { rows: connCount, error: connErr?.message ?? null })

  if (connErr) {
    console.error("[wearable-disconnect] delete failed:", connErr.message)
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
  }

  // Step 3: Delete sleep_data for this source
  console.log(`[wearable-disconnect] step 3 — deleting sleep_data for source=${provider}`)
  const { error: sdErr, count: sdCount } = await svc
    .from("sleep_data")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("source", provider)
  console.log(`[wearable-disconnect] sleep_data deleted:`, { rows: sdCount, error: sdErr?.message ?? null })

  // Step 4: Recalculate score
  console.log(`[wearable-disconnect] step 4 — recalculating score`)
  try {
    await recalculateScore(userId, svc)
    console.log("[wearable-disconnect] score recalculated")
  } catch (err) {
    console.warn("[wearable-disconnect] recalculate failed (non-fatal):", (err as Error).message)
  }

  console.log(`[wearable-disconnect] complete for provider=${provider}`)
  return NextResponse.json({ success: true })
}

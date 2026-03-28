import { NextResponse } from "next/server"
import { createClient } from "../../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../../lib/score/recalculate"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = user.id
  console.log("[oura-disconnect] starting for:", userId)

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch external_user_id so we can unlink from Vital/Junction
  const { data: conn } = await svc
    .from("wearable_connections_v2")
    .select("external_user_id")
    .eq("user_id", userId)
    .eq("provider", "oura")
    .maybeSingle()

  // Best-effort: unlink from Junction/Vital (non-fatal if fails)
  if (conn?.external_user_id) {
    const baseUrl = process.env.JUNCTION_ENV === "production"
      ? "https://api.tryvital.io"
      : "https://api.sandbox.tryvital.io"
    try {
      const res = await fetch(
        `${baseUrl}/v2/user/${conn.external_user_id}/providers/oura`,
        {
          method: "DELETE",
          headers: { "x-vital-api-key": process.env.JUNCTION_API_KEY! },
        },
      )
      if (!res.ok) {
        console.warn(`[oura-disconnect] Vital unlink returned ${res.status} (non-fatal)`)
      } else {
        console.log("[oura-disconnect] Vital unlink OK")
      }
    } catch (err) {
      console.warn("[oura-disconnect] Vital unlink failed (non-fatal):", err)
    }
  }

  // Step 1: Null score_snapshots FK to allow parent row deletion
  console.log("[oura-disconnect] step 1 — nulling score_snapshots.wearable_connection_id")
  const { error: snapErr } = await svc
    .from("score_snapshots")
    .update({ wearable_connection_id: null })
    .eq("user_id", userId)
  if (snapErr) console.warn("[oura-disconnect] score_snapshots update failed (non-fatal):", snapErr.message)

  // Step 2: Delete connection from unified table
  console.log("[oura-disconnect] step 2 — deleting wearable_connections_v2 for provider=oura")
  const { error: connErr, count: connCount } = await svc
    .from("wearable_connections_v2")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("provider", "oura")
  console.log("[oura-disconnect] wearable_connections_v2 deleted:", { rows: connCount, error: connErr?.message ?? null })

  if (connErr) {
    console.error("[oura-disconnect] delete failed:", connErr.message)
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
  }

  // Step 3: Delete sleep_data for source=oura (preserves WHOOP rows)
  console.log("[oura-disconnect] step 3 — deleting sleep_data for source=oura")
  const { error: sdErr, count: sdCount } = await svc
    .from("sleep_data")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("source", "oura")
  console.log("[oura-disconnect] sleep_data deleted:", { rows: sdCount, error: sdErr?.message ?? null })

  // Step 4: Recalculate score — rebuilds snapshot from remaining panels
  console.log("[oura-disconnect] step 4 — recalculating score")
  try {
    await recalculateScore(userId, svc)
    console.log("[oura-disconnect] score recalculated")
  } catch (err) {
    console.warn("[oura-disconnect] recalculate failed (non-fatal):", (err as Error).message)
  }

  console.log("[oura-disconnect] complete")
  return NextResponse.json({ success: true })
}

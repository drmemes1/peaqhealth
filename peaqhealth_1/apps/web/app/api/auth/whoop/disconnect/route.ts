import { NextResponse } from "next/server"
import { createClient } from "../../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../../lib/score/recalculate"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  console.log("[whoop-disconnect] starting for user:", user.id)

  // Use service client for all operations to bypass RLS
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch the access token so we can revoke it with WHOOP
  const { data: conn } = await svc
    .from("wearable_connections_v2")
    .select("access_token")
    .eq("user_id", user.id)
    .eq("provider", "whoop")
    .maybeSingle()

  console.log("[whoop-disconnect] wearable_connections_v2 row found:", !!conn)

  // Best-effort token revocation — don't fail if WHOOP rejects it
  if (conn?.access_token) {
    try {
      await fetch("https://api.prod.whoop.com/oauth/oauth2/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token:         conn.access_token,
          client_id:     process.env.WHOOP_CLIENT_ID!,
          client_secret: process.env.WHOOP_CLIENT_SECRET!,
        }),
      })
      console.log("[whoop-disconnect] token revoked")
    } catch (err) {
      console.warn("[whoop-disconnect] revocation request failed (non-fatal):", err)
    }
  }

  // Step 1: Null out wearable_connection_id on score_snapshots to break the FK reference.
  // Preserves score history — we just detach the foreign key before deleting the parent row.
  console.log("[whoop-disconnect] step 1 — nulling score_snapshots.wearable_connection_id")
  const { error: snapErr } = await svc
    .from("score_snapshots")
    .update({ wearable_connection_id: null })
    .eq("user_id", user.id)
  if (snapErr) console.warn("[whoop-disconnect] score_snapshots update failed (non-fatal):", snapErr.message)

  // Step 2: Delete sleep_data for source=whoop only (preserves Oura rows)
  console.log("[whoop-disconnect] step 2 — deleting sleep_data for source=whoop")
  const { error: wsdErr, count: wsdCount } = await svc
    .from("sleep_data")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .eq("source", "whoop")
  console.log("[whoop-disconnect] sleep_data deleted:", { rows: wsdCount, error: wsdErr?.message ?? null })

  // Step 3: Delete connection from unified table
  console.log("[whoop-disconnect] step 3 — deleting wearable_connections_v2 for provider=whoop")
  const { error: whoopErr, count: whoopCount } = await svc
    .from("wearable_connections_v2")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .eq("provider", "whoop")
  console.log("[whoop-disconnect] wearable_connections_v2 deleted:", { rows: whoopCount, error: whoopErr?.message ?? null })

  if (whoopErr) {
    console.error("[whoop-disconnect] wearable_connections_v2 delete failed:", whoopErr.message)
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
  }

  // Step 5: Recalculate score — rebuilds a fresh snapshot from blood, oral, lifestyle.
  // Safe now that the filter fixes are in place (oral uses no status filter, wearable
  // query requires status=connected so sleep_sub will be 0 with no wearable row).
  console.log("[whoop-disconnect] step 5 — recalculating score")
  try {
    await recalculateScore(user.id, svc)
    console.log("[whoop-disconnect] score recalculated")
  } catch (err) {
    console.warn("[whoop-disconnect] recalculate failed (non-fatal):", (err as Error).message)
  }

  console.log("[whoop-disconnect] complete")
  return NextResponse.json({ success: true })
}

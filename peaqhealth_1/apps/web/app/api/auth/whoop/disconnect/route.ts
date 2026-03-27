import { NextResponse } from "next/server"
import { createClient } from "../../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  console.log("[whoop-disconnect] starting for user:", user.id)

  // Use service client for all deletes to bypass RLS
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch the access token so we can revoke it with WHOOP
  const { data: conn } = await serviceClient
    .from("whoop_connections")
    .select("access_token")
    .eq("user_id", user.id)
    .maybeSingle()

  console.log("[whoop-disconnect] whoop_connections row found:", !!conn)

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

  // Step 1: Delete wearable_connections (all providers including legacy "unknown")
  console.log("[whoop-disconnect] step 1 — deleting wearable_connections")
  const { error: wcErr, count: wcCount } = await serviceClient
    .from("wearable_connections")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
  console.log("[whoop-disconnect] wearable_connections deleted:", { rows: wcCount, error: wcErr?.message ?? null })

  // Step 2: Delete whoop_sleep_data
  console.log("[whoop-disconnect] step 2 — deleting whoop_sleep_data")
  const { error: wsdErr, count: wsdCount } = await serviceClient
    .from("whoop_sleep_data")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
  console.log("[whoop-disconnect] whoop_sleep_data deleted:", { rows: wsdCount, error: wsdErr?.message ?? null })

  // Step 3: Delete whoop_connections
  console.log("[whoop-disconnect] step 3 — deleting whoop_connections")
  const { error: whoopErr, count: whoopCount } = await serviceClient
    .from("whoop_connections")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
  console.log("[whoop-disconnect] whoop_connections deleted:", { rows: whoopCount, error: whoopErr?.message ?? null })

  if (whoopErr) {
    console.error("[whoop-disconnect] whoop_connections delete failed:", whoopErr.message)
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
  }

  // NOTE: Do NOT call recalculateScore here. The dashboard already displays sleep_sub=0
  // when no wearable_connections row exists (via the `wearable ? snapshot.sleep_sub : 0`
  // logic in dashboard/page.tsx). Calling recalculate here caused a regression where
  // blood/oral/lifestyle scores were zeroed in the new snapshot if those queries returned
  // no data (e.g. oral kit status filter mismatch). The next cron run will correctly
  // recalculate with all data present.

  console.log("[whoop-disconnect] complete")
  return NextResponse.json({ success: true })
}

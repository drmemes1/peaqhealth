import { NextResponse } from "next/server"
import { createClient } from "../../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../../lib/score/recalculate"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Fetch the access token so we can revoke it with WHOOP
  const { data: conn } = await supabase
    .from("whoop_connections")
    .select("access_token")
    .eq("user_id", user.id)
    .maybeSingle()

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
    } catch (err) {
      console.warn("[whoop-disconnect] revocation request failed (non-fatal):", err)
    }
  }

  // Delete the connection row — this frees the test user slot
  const { error } = await supabase
    .from("whoop_connections")
    .delete()
    .eq("user_id", user.id)

  if (error) {
    console.error("[whoop-disconnect] delete failed:", error.message)
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
  }

  // Also wipe the aggregated sleep metrics so sleep_sub → 0 on next score
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  await serviceClient
    .from("wearable_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", "whoop")

  // Recalculate score immediately so dashboard reflects 0 sleep
  try {
    await recalculateScore(user.id, serviceClient)
  } catch (err) {
    console.warn("[whoop-disconnect] recalculate failed (non-fatal):", err)
  }

  return NextResponse.json({ success: true })
}

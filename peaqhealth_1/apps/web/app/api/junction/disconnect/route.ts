import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let provider: string
  try {
    const body = await request.json() as { provider?: string }
    provider = body.provider?.trim() ?? ""
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!provider) return NextResponse.json({ error: "Missing provider" }, { status: 400 })

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch the junction_user_id so we can call the Vital API
  const { data: conn } = await serviceClient
    .from("wearable_connections")
    .select("junction_user_id")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .maybeSingle()

  // Best-effort: unlink the provider from the Vital/Junction user
  if (conn?.junction_user_id) {
    const baseUrl = process.env.JUNCTION_ENV === "production"
      ? "https://api.tryvital.io"
      : "https://api.sandbox.tryvital.io"
    try {
      const res = await fetch(
        `${baseUrl}/v2/user/${conn.junction_user_id}/providers/${provider}`,
        {
          method: "DELETE",
          headers: { "x-vital-api-key": process.env.JUNCTION_API_KEY! },
        },
      )
      if (!res.ok) {
        console.warn(`[junction-disconnect] Vital unlink returned ${res.status} (non-fatal)`)
      } else {
        console.log(`[junction-disconnect] Vital unlink OK for provider:${provider} junctionUserId:${conn.junction_user_id}`)
      }
    } catch (err) {
      console.warn("[junction-disconnect] Vital unlink request failed (non-fatal):", err)
    }
  }

  // Delete the wearable_connections row
  const { error } = await serviceClient
    .from("wearable_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider)

  if (error) {
    console.error("[junction-disconnect] delete failed:", error.message)
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
  }

  // NOTE: Do NOT call recalculateScore here — see /api/auth/whoop/disconnect for explanation.
  // Dashboard displays sleep_sub=0 when no wearable row exists. Next cron recalculates correctly.

  return NextResponse.json({ success: true })
}

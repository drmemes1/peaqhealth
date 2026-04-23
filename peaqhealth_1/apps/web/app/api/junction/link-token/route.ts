import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createJunctionUser, createLinkToken, seedSandboxSleepData } from "@peaq/api-client/junction"

/**
 * POST /api/junction/link-token
 *
 * Creates a Junction user if one doesn't exist for the current
 * authenticated user, then returns a link token for the frontend widget.
 */
export async function POST() {
  // Guard: verify API key is configured before making any external calls
  if (!process.env.JUNCTION_API_KEY) {
    console.error("[link-token] JUNCTION_API_KEY env var is not set")
    return NextResponse.json(
      { error: "Junction API not configured", detail: "JUNCTION_API_KEY env var is missing" },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("[link-token] request, env:", process.env.JUNCTION_ENV ?? "sandbox")

  // Check if this user already has a Junction user_id stored
  const { data: profile } = await supabase
    .from("profiles")
    .select("junction_user_id")
    .eq("id", user.id)
    .single()

  let junctionUserId = profile?.junction_user_id as string | null

  if (!junctionUserId) {
    try {
      const { junctionUserId: newId } = await createJunctionUser({
        clientUserId: user.id,
        ...(user.email ? { email: user.email } : {}),
      })
      junctionUserId = newId
      console.log("[link-token] created Junction user")
    } catch (err) {
      console.error("[link-token] createJunctionUser failed:", err)
      return NextResponse.json(
        { error: "Failed to create Junction user", detail: String(err) },
        { status: 502 }
      )
    }

    // Persist the Junction user_id on the profile
    await supabase
      .from("profiles")
      .update({ junction_user_id: junctionUserId })
      .eq("id", user.id)

    // In sandbox: seed 30 days of synthetic sleep data so the full pipeline
    // can be tested without a real wearable. Fire-and-forget.
    if (process.env.JUNCTION_ENV !== "production") {
      seedSandboxSleepData(junctionUserId, { daysToBackfill: 30 }).catch((err) =>
        console.warn("[link-token] sandbox seed failed (non-fatal):", err)
      )
    }
  } else {
    console.log("[link-token] reusing existing Junction user")
  }

  try {
    const { linkToken } = await createLinkToken(junctionUserId)
    console.log("[link-token] link token created")
    return NextResponse.json({ link_token: linkToken })
  } catch (err) {
    console.error("[link-token] createLinkToken failed:", err)
    return NextResponse.json(
      { error: "Failed to create link token", detail: String(err) },
      { status: 502 }
    )
  }
}

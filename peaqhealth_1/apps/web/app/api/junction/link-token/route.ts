import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createJunctionUser, createLinkToken } from "@peaq/api-client/junction"

/**
 * POST /api/junction/link-token
 *
 * Creates a Junction user if one doesn't exist for the current
 * authenticated user, then returns a link token for the frontend widget.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
    } catch (err) {
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
  }

  try {
    const { linkToken } = await createLinkToken(junctionUserId)
    return NextResponse.json({ link_token: linkToken })
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create link token", detail: String(err) },
      { status: 502 }
    )
  }
}

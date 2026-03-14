import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"

const JUNCTION_API_KEY = process.env.JUNCTION_API_KEY!
const JUNCTION_ENV = process.env.JUNCTION_ENV ?? "sandbox"

const BASE_URL =
  JUNCTION_ENV === "production"
    ? "https://api.tryvital.io"
    : "https://api.sandbox.tryvital.io"

/**
 * POST /api/junction/link-token
 *
 * Creates a Junction (Vital) user if one doesn't exist for the current
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
    // Create a Junction user using our Supabase user ID as client_user_id
    const createRes = await fetch(`${BASE_URL}/v2/user/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vital-api-key": JUNCTION_API_KEY,
      },
      body: JSON.stringify({ client_user_id: user.id }),
    })

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}))

      // 400 means user already exists — extract the user_id from error
      if (createRes.status === 400 && err.user_id) {
        junctionUserId = err.user_id
      } else {
        return NextResponse.json(
          { error: "Failed to create Junction user", detail: err },
          { status: 502 }
        )
      }
    } else {
      const created = await createRes.json()
      junctionUserId = created.user_id
    }

    // Persist the Junction user_id on the profile
    await supabase
      .from("profiles")
      .update({ junction_user_id: junctionUserId })
      .eq("id", user.id)
  }

  // Generate a link token for the frontend widget
  const tokenRes = await fetch(`${BASE_URL}/v2/link/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-vital-api-key": JUNCTION_API_KEY,
    },
    body: JSON.stringify({ user_id: junctionUserId }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}))
    return NextResponse.json(
      { error: "Failed to create link token", detail: err },
      { status: 502 }
    )
  }

  const { link_token } = await tokenRes.json()

  return NextResponse.json({ link_token })
}

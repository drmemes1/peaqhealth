import { NextResponse } from "next/server"
import { createClient } from "../../../../../lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Guard: skip OAuth if already connected — prevents draining test user slots
  const { data: existing } = await supabase
    .from("whoop_connections")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (existing) {
    const { origin } = new URL(process.env.WHOOP_REDIRECT_URI!)
    return NextResponse.redirect(`${origin}/dashboard?whoop=already_connected`)
  }

  const params = new URLSearchParams({
    client_id:     process.env.WHOOP_CLIENT_ID!,
    redirect_uri:  process.env.WHOOP_REDIRECT_URI!,
    response_type: "code",
    scope:         "read:recovery read:cycles read:sleep read:workout read:profile",
    state:         user.id,
  })

  return NextResponse.redirect(
    `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`
  )
}

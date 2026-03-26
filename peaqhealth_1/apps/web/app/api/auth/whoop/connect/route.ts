import { NextResponse } from "next/server"
import { createClient } from "../../../../../lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

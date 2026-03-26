import { NextResponse } from "next/server"
import { createClient } from "../../../../../lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", request.url))

  const params = new URLSearchParams({
    client_id:     process.env.WHOOP_CLIENT_ID!,
    redirect_uri:  process.env.WHOOP_REDIRECT_URI!,
    response_type: "code",
    scope:         "read:recovery read:cycles read:sleep read:workout read:profile",
    state:         user.id,
  })

  console.log("[whoop-connect] userId:", user.id)
  console.log("[whoop-connect] redirect_uri:", process.env.WHOOP_REDIRECT_URI)

  return NextResponse.redirect(
    `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`
  )
}

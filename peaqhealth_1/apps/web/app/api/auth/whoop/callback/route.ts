import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code   = searchParams.get("code")
  const userId = searchParams.get("state")

  if (!code || !userId) {
    return NextResponse.redirect(`${origin}/dashboard?whoop=error`)
  }

  // 1. Exchange authorization code for tokens
  const tokenRes = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      redirect_uri:  process.env.WHOOP_REDIRECT_URI!,
      client_id:     process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
  })

  if (!tokenRes.ok) {
    console.error("[whoop-callback] token exchange failed:", tokenRes.status)
    return NextResponse.redirect(`${origin}/dashboard?whoop=error`)
  }

  const rawTokens = await tokenRes.json() as {
    access_token: string; refresh_token?: string | null; expires_in: number; scope: string
  }
  console.log("[whoop-callback] token fields:", Object.keys(rawTokens))

  const tokens = {
    access_token:  rawTokens.access_token,
    refresh_token: rawTokens.refresh_token ?? "",   // WHOOP may omit on first auth
    expires_in:    rawTokens.expires_in,
    scope:         rawTokens.scope,
  }
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // 2. Fetch WHOOP user profile
  const profileRes = await fetch("https://api.prod.whoop.com/developer/v1/user/profile/basic", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })

  if (!profileRes.ok) {
    console.error("[whoop-callback] profile fetch failed:", profileRes.status)
    return NextResponse.redirect(`${origin}/dashboard?whoop=error`)
  }

  const profile = await profileRes.json() as { user_id: number | string }
  const whoopUserId = String(profile.user_id)

  // 3. Upsert into whoop_connections (service client — bypasses RLS)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await serviceClient.from("whoop_connections").upsert({
    user_id:         userId,
    whoop_user_id:   whoopUserId,
    access_token:    tokens.access_token,
    refresh_token:   tokens.refresh_token,
    token_expires_at: tokenExpiresAt,
    scopes:          tokens.scope?.split(" ") ?? [],
    connected_at:    new Date().toISOString(),
  }, { onConflict: "user_id" })

  if (error) {
    console.error("[whoop-callback] upsert error:", error.message)
    return NextResponse.redirect(`${origin}/dashboard?whoop=error`)
  }

  // 4. Redirect to dashboard
  return NextResponse.redirect(`${origin}/dashboard?whoop=connected`)
}

import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { fetchAndStoreWhoopData } from "../../../../../lib/whoop/fetch"
import { recalculateScore } from "../../../../../lib/score/recalculate"
import type { WhoopTokenResponse, WhoopProfileResponse } from "../../../../../lib/whoop/types"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code   = searchParams.get("code")
  const userId = searchParams.get("state")

  if (!code || !userId) {
    console.error("[whoop-callback] missing code or state param")
    return NextResponse.redirect(`${origin}/settings?error=whoop_callback_failed`)
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
    return NextResponse.redirect(`${origin}/settings?error=whoop_callback_failed`)
  }

  const rawTokens = await tokenRes.json() as WhoopTokenResponse
  console.log("[whoop-callback] token received, first 8:", rawTokens.access_token.substring(0, 8))

  const tokenExpiresAt = new Date(Date.now() + rawTokens.expires_in * 1000).toISOString()

  // 2. Fetch WHOOP user profile
  const profileRes = await fetch("https://api.prod.whoop.com/developer/v1/user/profile/basic", {
    headers: { Authorization: `Bearer ${rawTokens.access_token}` },
  })

  if (!profileRes.ok) {
    console.error("[whoop-callback] profile fetch failed:", profileRes.status)
    return NextResponse.redirect(`${origin}/settings?error=whoop_callback_failed`)
  }

  const profile = await profileRes.json() as WhoopProfileResponse
  const whoopUserId = String(profile.user_id)

  // 3. Upsert into whoop_connections (service client — bypasses RLS)
  const supabase = serviceClient()

  const { error } = await supabase.from("whoop_connections").upsert({
    user_id:          userId,
    whoop_user_id:    whoopUserId,
    access_token:     rawTokens.access_token,
    refresh_token:    rawTokens.refresh_token ?? "",
    token_expires_at: tokenExpiresAt,
    needs_reconnect:  false,
    last_sync_error:  null,
    scopes:           rawTokens.scope?.split(" ") ?? [],
    connected_at:     new Date().toISOString(),
  }, { onConflict: "user_id" })

  if (error) {
    console.error("[whoop-callback] upsert error:", error.message)
    return NextResponse.redirect(`${origin}/settings?error=whoop_callback_failed`)
  }

  // 4. Fire-and-forget 7-day backfill — redirect immediately, don't await
  fetchAndStoreWhoopData(userId, 7)
    .then(() => recalculateScore(userId, serviceClient()))
    .catch(e => console.error("[callback] backfill error:", (e as Error).message))

  // 5. Redirect to dashboard
  return NextResponse.redirect(`${origin}/dashboard?whoop=connected`)
}

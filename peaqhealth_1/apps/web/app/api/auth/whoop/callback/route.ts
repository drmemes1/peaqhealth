import { NextRequest, NextResponse, after } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { fetchAndStoreWhoopData } from "../../../../../lib/whoop/fetch"
import { recalculateScore } from "../../../../../lib/score/recalculate"
import type { WhoopTokenResponse, WhoopProfileResponse } from "../../../../../lib/whoop/types"

function svc() {
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
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  console.log("[whoop-callback] userId:", userId)

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

  console.log("[whoop-callback] token exchange:", tokenRes.ok ? "success" : "failed", tokenRes.status)

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text().catch(() => "")
    console.error("[whoop-callback] token error:", errBody)
    return NextResponse.redirect(`${origin}/dashboard?whoop=error`)
  }

  const tokens = await tokenRes.json() as WhoopTokenResponse
  console.log("[whoop-callback] access_token first 8:", tokens.access_token?.substring(0, 8))
  console.log("[whoop-callback] has refresh_token:", !!tokens.refresh_token)
  console.log("[whoop-callback] expires_in:", tokens.expires_in)

  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // 2. Fetch WHOOP user profile — non-fatal if it fails
  let whoopUserId = "unknown"
  const profileRes = await fetch("https://api.prod.whoop.com/developer/v1/user/profile/basic", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  console.log("[whoop-callback] profile fetch:", profileRes.ok ? "success" : "failed", profileRes.status)

  if (profileRes.ok) {
    const profile = await profileRes.json() as WhoopProfileResponse
    whoopUserId = String(profile.user_id)
  } else {
    console.warn("[whoop-callback] profile fetch failed — continuing with unknown whoop_user_id")
  }

  // 3. Upsert into whoop_connections using service client to bypass RLS
  const supabase = svc()

  const { error: upsertError } = await supabase.from("whoop_connections").upsert({
    user_id:          userId,
    whoop_user_id:    whoopUserId,
    access_token:     tokens.access_token,
    refresh_token:    tokens.refresh_token?.trim() || "",
    token_expires_at: tokenExpiresAt,
    needs_reconnect:  false,
    last_sync_error:  null,
    scopes:           tokens.scope?.split(" ") ?? [],
    connected_at:     new Date().toISOString(),
  }, { onConflict: "user_id" })

  console.log("[whoop-callback] upsert:", upsertError ? "failed: " + upsertError.message : "success")

  if (upsertError) {
    return NextResponse.redirect(`${origin}/dashboard?whoop=error`)
  }

  // 4. Check onboarding status — profiles.onboarding_completed
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .single()

  console.log("[whoop-callback] onboarding_completed:", userProfile?.onboarding_completed)

  const redirectTo = userProfile?.onboarding_completed
    ? `${origin}/dashboard?whoop=connected`
    : `${origin}/onboarding`

  console.log("[whoop-callback] redirecting to:", redirectTo)

  // 5. Fire backfill via after() — Vercel keeps the lambda alive until this resolves.
  //    Fire-and-forget (no await before redirect) would be killed by the serverless runtime.
  console.log("[whoop-callback] registering backfill via after()")
  const capturedUserId = userId
  after(async () => {
    console.log("[whoop-callback] backfill starting for userId:", capturedUserId)
    try {
      const count = await fetchAndStoreWhoopData(capturedUserId, 7)
      console.log("[whoop-callback] backfill complete, records:", count)
      await recalculateScore(capturedUserId, svc())
      console.log("[whoop-callback] score recalculated")
    } catch (e) {
      console.error("[whoop-callback] backfill failed:", (e as Error).message)
      console.error("[whoop-callback] stack:", (e as Error).stack)
    }
  })

  // 6. Redirect immediately — after() work continues in the background
  return NextResponse.redirect(redirectTo)
}

import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { fetchWhoopSleepData, type WhoopSleepRecord } from "../../../../../lib/whoop/fetch"
import { recalculateScore } from "../../../../../lib/score/recalculate"

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

  // 4. Immediate 7-day backfill so user sees data on first dashboard load
  try {
    const startIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const endIso   = new Date().toISOString()
    const records  = await fetchWhoopSleepData(userId, startIso, endIso)

    if (records.length > 0) {
      const rows = records.map(r => ({ ...r, user_id: userId }))
      await serviceClient.from("whoop_sleep_data")
        .upsert(rows, { onConflict: "user_id,date" })

      const validNights = records.filter((r: WhoopSleepRecord) => r.sleep_efficiency > 0)
      const n = validNights.length || 1
      const avg = (key: keyof WhoopSleepRecord) =>
        validNights.reduce((s: number, r: WhoopSleepRecord) => s + (Number(r[key]) || 0), 0) / n

      const totalMin = avg("total_sleep_minutes")
      const deepPct  = totalMin > 0 ? (avg("deep_sleep_minutes") / totalMin) * 100 : 0
      const remPct   = totalMin > 0 ? (avg("rem_sleep_minutes")  / totalMin) * 100 : 0
      const spo2     = avg("spo2")
      const now      = new Date().toISOString()

      await serviceClient.from("wearable_connections").upsert({
        user_id:           userId,
        provider:          "whoop",
        status:            "connected",
        connected_at:      now,
        deep_sleep_pct:    deepPct,
        rem_pct:           remPct,
        sleep_efficiency:  avg("sleep_efficiency"),
        hrv_rmssd:         avg("hrv_rmssd"),
        latest_resting_hr: Math.round(avg("resting_heart_rate")) || null,
        latest_spo2_dips:  spo2 >= 95 ? 0 : spo2 >= 92 ? 2 : 5,
        nights_available:  validNights.length,
        last_sync_at:      now,
        updated_at:        now,
      }, { onConflict: "user_id,provider" })

      await serviceClient.from("whoop_connections")
        .update({ last_synced_at: now })
        .eq("user_id", userId)

      await recalculateScore(userId, serviceClient)
      console.log(`[whoop-callback] initial backfill complete — ${records.length} nights for user ${userId}`)
    }
  } catch (err) {
    // Non-fatal — user still gets redirected; cron will sync overnight
    console.warn("[whoop-callback] initial backfill failed (non-fatal):", err)
  }

  // 5. Redirect to dashboard
  return NextResponse.redirect(`${origin}/dashboard?whoop=connected`)
}

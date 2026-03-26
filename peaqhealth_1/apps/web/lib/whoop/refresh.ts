import { createClient as createServiceClient } from "@supabase/supabase-js"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Returns a valid WHOOP access token, refreshing if within 5 minutes of expiry. */
export async function refreshWhoopToken(userId: string): Promise<string> {
  const supabase = serviceClient()

  const { data: conn, error } = await supabase
    .from("whoop_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .single()

  if (error || !conn) throw new Error("No WHOOP connection found for user")

  const expiresAt  = new Date(conn.token_expires_at as string).getTime()
  const fiveMins   = 5 * 60 * 1000
  const needsRefresh = expiresAt - Date.now() < fiveMins

  if (!needsRefresh) return conn.access_token as string

  // Refresh
  const res = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: conn.refresh_token as string,
      client_id:     process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) throw new Error(`WHOOP token refresh failed: ${res.status}`)

  const tokens = await res.json() as {
    access_token: string; refresh_token: string; expires_in: number
  }
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase.from("whoop_connections").update({
    access_token:     tokens.access_token,
    refresh_token:    tokens.refresh_token,
    token_expires_at: newExpiresAt,
  }).eq("user_id", userId)

  return tokens.access_token
}

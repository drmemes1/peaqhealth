import { createClient } from "@supabase/supabase-js"
import type { WhoopTokenResponse } from "./types"

export class WhoopReconnectError extends Error {
  constructor(public userId: string) {
    super("WHOOP reconnection required")
    this.name = "WhoopReconnectError"
  }
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function refreshWhoopToken(userId: string): Promise<string> {
  const supabase = serviceClient()

  const { data: conn, error } = await supabase
    .from("whoop_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !conn) {
    throw new WhoopReconnectError(userId)
  }

  // Case A — token valid for 5+ minutes
  if (conn.token_expires_at) {
    const expiresAt = new Date(conn.token_expires_at as string).getTime()
    if (expiresAt - Date.now() > 5 * 60 * 1000) {
      return conn.access_token as string
    }
  }

  // Case B — try refresh
  if (!conn.refresh_token) {
    await supabase.from("whoop_connections").update({
      needs_reconnect: true,
      last_sync_error: "No refresh token available",
    }).eq("user_id", userId)
    throw new WhoopReconnectError(userId)
  }

  try {
    const res = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: conn.refresh_token as string,
        client_id: process.env.WHOOP_CLIENT_ID!,
        client_secret: process.env.WHOOP_CLIENT_SECRET!,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Token refresh failed ${res.status}: ${body}`)
    }

    const tokens = await res.json() as WhoopTokenResponse
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await supabase.from("whoop_connections").update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? conn.refresh_token,
      token_expires_at: expiresAt,
      needs_reconnect: false,
      last_sync_error: null,
    }).eq("user_id", userId)

    return tokens.access_token
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await supabase.from("whoop_connections").update({
      needs_reconnect: true,
      last_sync_error: message,
    }).eq("user_id", userId)
    throw new WhoopReconnectError(userId)
  }
}

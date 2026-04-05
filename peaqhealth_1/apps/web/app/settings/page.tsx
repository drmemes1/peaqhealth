import { createClient } from "../../lib/supabase/server"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: wearableConns }] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name").eq("id", user!.id).single(),
    supabase.from("wearable_connections_v2").select("provider,last_synced_at,needs_reconnect").eq("user_id", user!.id),
  ])

  const whoopConn      = (wearableConns ?? []).find(c => c.provider === "whoop")
  const junctionConns  = (wearableConns ?? [])
    .filter(c => c.provider !== "whoop")
    .map(c => ({ provider: c.provider, lastSynced: (c.last_synced_at as string | null) ?? null }))

  const first = profile?.first_name ?? ""
  const last  = profile?.last_name ?? ""
  const initials = [first[0], last[0]].filter(Boolean).join("").toUpperCase() || user!.email?.[0]?.toUpperCase() || "?"

  return (
    <SettingsClient
      userId={user!.id}
      email={user!.email ?? ""}
      firstName={first}
      lastName={last}
      createdAt={user!.created_at}
      whoopConnected={!!whoopConn}
      whoopLastSynced={(whoopConn?.last_synced_at as string | null) ?? null}
      whoopNeedsReconnect={(whoopConn?.needs_reconnect as boolean | null) ?? false}
      junctionConnections={junctionConns}
      initials={initials}
    />
  )
}

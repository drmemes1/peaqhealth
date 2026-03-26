import { createClient } from "../../lib/supabase/server"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: whoopConn }] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name").eq("id", user!.id).single(),
    supabase.from("whoop_connections").select("last_synced_at, needs_reconnect").eq("user_id", user!.id).maybeSingle(),
  ])

  return (
    <SettingsClient
      userId={user!.id}
      email={user!.email ?? ""}
      firstName={profile?.first_name ?? ""}
      lastName={profile?.last_name ?? ""}
      createdAt={user!.created_at}
      whoopConnected={!!whoopConn}
      whoopLastSynced={(whoopConn?.last_synced_at as string | null) ?? null}
      whoopNeedsReconnect={(whoopConn?.needs_reconnect as boolean | null) ?? false}
    />
  )
}

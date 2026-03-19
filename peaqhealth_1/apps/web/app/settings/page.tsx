import { createClient } from "../../lib/supabase/server"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user!.id)
    .single()

  return (
    <SettingsClient
      userId={user!.id}
      email={user!.email ?? ""}
      firstName={profile?.first_name ?? ""}
      lastName={profile?.last_name ?? ""}
      createdAt={user!.created_at}
    />
  )
}

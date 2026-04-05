import { redirect } from "next/navigation"
import { createClient } from "../../lib/supabase/server"
import { ScienceClient } from "./science-client"

export const dynamic = "force-dynamic"

export default async function SciencePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single()

  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?"

  // Check wearable status
  const { data: wearable } = await supabase
    .from("wearable_connections_v2")
    .select("provider")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  return <ScienceClient initials={initials} hasWearable={!!wearable} />
}

import { redirect } from "next/navigation"
import { createClient } from "../../lib/supabase/server"
import { PanelsClient } from "./panels-client"

export const dynamic = "force-dynamic"

export default async function PanelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Get user profile for initials
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single()

  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?"

  return <PanelsClient initials={initials} />
}

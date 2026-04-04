import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { CrossPanelClient } from "./cross-panel-client"

export default async function CrossPanelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: snapshot } = await supabase
    .from("score_snapshots")
    .select("score, base_score, modifier_total, modifiers_applied")
    .eq("user_id", user.id)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .single()

  return (
    <CrossPanelClient
      snapshot={snapshot as Record<string, unknown> | null}
    />
  )
}

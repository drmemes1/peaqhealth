import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { OralPanelClient } from "./oral-panel-client"

export default async function OralPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [
    { data: oral },
    { data: snapshot },
  ] = await Promise.all([
    supabase.from("oral_kit_orders")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["results_ready", "scored"])
      .maybeSingle(),
    supabase.from("score_snapshots")
      .select("oral_sub, score")
      .eq("user_id", user.id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .single(),
  ])

  console.log(`[oral-panel] displaying: oral_sub=${snapshot?.oral_sub} total=${snapshot?.score} from=score_snapshots`)

  return (
    <OralPanelClient
      oral={oral as Record<string, unknown> | null}
      snapshot={snapshot as Record<string, unknown> | null}
    />
  )
}

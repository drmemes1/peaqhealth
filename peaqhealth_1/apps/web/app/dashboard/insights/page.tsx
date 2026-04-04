import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { InsightsClient } from "./insights-client"

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [
    { data: snapshot },
    { data: weeklyData },
  ] = await Promise.all([
    supabase.from("score_snapshots")
      .select("score, blood_sub, sleep_sub, oral_sub, modifiers_applied, interactions_fired")
      .eq("user_id", user.id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .single(),
    supabase.from("weekly_snapshots")
      .select("headline, body, trend_direction")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return (
    <InsightsClient
      snapshot={snapshot as Record<string, unknown> | null}
      weekly={weeklyData as Record<string, unknown> | null}
    />
  )
}

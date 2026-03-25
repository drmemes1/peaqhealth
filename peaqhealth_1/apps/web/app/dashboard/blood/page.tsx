import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { BloodPanelClient } from "./blood-panel-client"

export default async function BloodPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [
    { data: lab },
    { data: snapshot },
    { data: history },
    { data: lifestyle },
    { data: oral },
  ] = await Promise.all([
    supabase.from("lab_results").select("*")
      .eq("user_id", user.id)
      .eq("parser_status", "complete")
      .order("collection_date", { ascending: false })
      .limit(1).single(),
    supabase.from("score_snapshots").select("*")
      .eq("user_id", user.id)
      .order("calculated_at", { ascending: false })
      .limit(1).single(),
    supabase.from("lab_history").select("locked_at, total_score, blood_score, collection_date")
      .eq("user_id", user.id)
      .order("locked_at", { ascending: false })
      .limit(5),
    supabase.from("lifestyle_entries").select("age_range, stress_level")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1).single(),
    supabase.from("oral_kit_orders").select("periodontopathogen_pct")
      .eq("user_id", user.id)
      .eq("status", "results_ready")
      .order("results_date", { ascending: false })
      .limit(1).single(),
  ])

  return (
    <BloodPanelClient
      lab={lab as Record<string, unknown> | null}
      snapshot={snapshot as Record<string, unknown> | null}
      history={(history ?? []) as Array<Record<string, unknown>>}
      ageRange={(lifestyle?.age_range as string | undefined)}
      stressLevel={(lifestyle?.stress_level as string | undefined)}
      periodontPathPct={(oral?.periodontopathogen_pct as number | undefined)}
    />
  )
}

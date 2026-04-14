import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { OralPanelClient } from "./oral-panel-client"
import { buildConnectionInput } from "../../../lib/score/buildConnectionInput"

export default async function OralPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [
    { data: oral },
    { data: snapshot },
    { data: lab },
    { data: profile },
    { data: lifestyle },
    { data: sleepNights },
  ] = await Promise.all([
    supabase.from("oral_kit_orders")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["results_ready", "scored"])
      .maybeSingle(),
    supabase.from("score_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .single(),
    supabase.from("lab_results").select("*")
      .eq("user_id", user.id).eq("parser_status", "complete")
      .order("collection_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("profiles").select("date_of_birth").eq("id", user.id).single(),
    supabase.from("lifestyle_records").select("biological_sex, mouthwash_type, nasal_obstruction, sinus_history")
      .eq("user_id", user.id).limit(1).maybeSingle(),
    supabase.from("sleep_data")
      .select("total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, sleep_efficiency, hrv_rmssd, resting_heart_rate")
      .eq("user_id", user.id).order("date", { ascending: false }).limit(30),
  ])

  const dobStr = profile?.date_of_birth as string | null
  const age = dobStr ? Math.floor((Date.now() - new Date(dobStr).getTime()) / (365.25 * 86400000)) : undefined

  const connectionInput = buildConnectionInput({
    age, sex: lifestyle?.biological_sex as string | null,
    lab: lab as Record<string, unknown> | null,
    oral: oral as Record<string, unknown> | null,
    sleepNights: (sleepNights ?? []) as Array<Record<string, unknown>>,
    lifestyle: lifestyle as Record<string, unknown> | null,
    snapshot: snapshot as Record<string, unknown> | null,
  })

  return (
    <OralPanelClient
      oral={oral as Record<string, unknown> | null}
      snapshot={snapshot as Record<string, unknown> | null}
      connectionInput={connectionInput}
    />
  )
}

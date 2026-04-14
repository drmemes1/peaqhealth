import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { SleepPanelClient } from "./sleep-panel-client"
import { buildConnectionInput } from "../../../lib/score/buildConnectionInput"

export default async function SleepPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [
    { data: sleepNights },
    { data: snapshot },
    { data: wearable },
    { data: lab },
    { data: oral },
    { data: profile },
    { data: lifestyle },
  ] = await Promise.all([
    supabase.from("sleep_data")
      .select("date, source, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, sleep_efficiency, hrv_rmssd, spo2, resting_heart_rate")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30),
    supabase.from("score_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .single(),
    supabase.from("wearable_connections_v2")
      .select("provider, last_synced_at")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("lab_results").select("*")
      .eq("user_id", user.id).eq("parser_status", "complete")
      .order("collection_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("oral_kit_orders").select("*, raw_otu_table")
      .eq("user_id", user.id).eq("status", "results_ready")
      .order("results_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("profiles").select("date_of_birth").eq("id", user.id).single(),
    supabase.from("lifestyle_records").select("biological_sex, mouthwash_type, nasal_obstruction, sinus_history")
      .eq("user_id", user.id).limit(1).maybeSingle(),
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
    <SleepPanelClient
      nights={(sleepNights ?? []) as Array<Record<string, unknown>>}
      snapshot={snapshot as Record<string, unknown> | null}
      wearable={wearable as Record<string, unknown> | null}
      connectionInput={connectionInput}
    />
  )
}

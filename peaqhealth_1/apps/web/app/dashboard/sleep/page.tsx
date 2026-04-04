import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { SleepPanelClient } from "./sleep-panel-client"

export default async function SleepPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [
    { data: sleepNights },
    { data: snapshot },
    { data: wearable },
  ] = await Promise.all([
    supabase.from("sleep_data")
      .select("date, source, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, sleep_efficiency, hrv_rmssd, spo2, resting_heart_rate")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30),
    supabase.from("score_snapshots")
      .select("sleep_sub, score")
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
  ])

  console.log(`[sleep-panel] displaying: sleep_sub=${snapshot?.sleep_sub} nights=${sleepNights?.length ?? 0}`)

  return (
    <SleepPanelClient
      nights={(sleepNights ?? []) as Array<Record<string, unknown>>}
      snapshot={snapshot as Record<string, unknown> | null}
      wearable={wearable as Record<string, unknown> | null}
    />
  )
}

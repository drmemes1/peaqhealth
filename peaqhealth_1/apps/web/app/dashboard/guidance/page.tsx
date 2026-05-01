import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { GuidanceClient } from "./guidance-client"

export const dynamic = "force-dynamic"

export default async function GuidancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [
    { data: snapshot },
    { data: lab },
    { data: oral },
    { data: lifestyle },
    { data: wearable },
    { data: sleepNights },
  ] = await Promise.all([
    supabase.from("score_snapshots").select("*").eq("user_id", user.id).order("calculated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("blood_results").select("*").eq("user_id", user.id).eq("parser_status", "complete").order("collected_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("oral_kit_orders").select("*").eq("user_id", user.id).not("shannon_diversity", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lifestyle_records").select("age_range, biological_sex").eq("user_id", user.id).maybeSingle(),
    supabase.from("wearable_connections_v2").select("provider").eq("user_id", user.id).limit(1).maybeSingle(),
    supabase.from("sleep_data").select("date,source,total_sleep_minutes,deep_sleep_minutes,rem_sleep_minutes,sleep_efficiency,hrv_rmssd,spo2").eq("user_id", user.id).order("date", { ascending: false }).limit(14),
  ])

  // Compute sleep averages (same weighted logic as dashboard)
  type SleepRow = { date: string; source: string; total_sleep_minutes: number; deep_sleep_minutes: number; rem_sleep_minutes: number; sleep_efficiency: number; hrv_rmssd: number | null; spo2: number | null }
  const nights = (sleepNights ?? []) as unknown as SleepRow[]
  const avg = (key: keyof SleepRow): number => {
    const vals = nights.map(n => Number(n[key])).filter(v => !isNaN(v) && v > 0)
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }
  const totalMin = avg("total_sleep_minutes")

  // Parse age from age_range string like "35-39"
  const ageRange = (lifestyle?.age_range as string) ?? "30-34"
  const userAge = parseInt(ageRange.split("-")[0]) || 35

  return (
    <GuidanceClient
      snapshot={snapshot as Record<string, unknown> | null}
      lab={lab as Record<string, unknown> | null}
      oral={oral as Record<string, unknown> | null}
      wearableProvider={(wearable?.provider as string) ?? ""}
      userAge={userAge}
      userSex={((lifestyle?.biological_sex as string) ?? "other") as "male" | "female" | "other"}
      sleepAvg={{
        deepPct: totalMin > 0 ? (avg("deep_sleep_minutes") / totalMin) * 100 : 0,
        remPct: totalMin > 0 ? (avg("rem_sleep_minutes") / totalMin) * 100 : 0,
        efficiency: avg("sleep_efficiency"),
        hrv: avg("hrv_rmssd"),
        spo2: avg("spo2"),
        nightsCount: nights.length,
      }}
    />
  )
}

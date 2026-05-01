import { notFound, redirect } from "next/navigation"
import { createClient } from "../../../../lib/supabase/server"
import { MARKER_DEFINITIONS } from "../../../../lib/markers/definitions"
import { buildConnectionInput } from "../../../../lib/score/buildConnectionInput"
import { MarkerDetailClient } from "../../blood/[marker]/marker-client"

export default async function SleepMetricPage({ params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params
  const def = MARKER_DEFINITIONS[metric]
  if (!def || def.panel !== "sleep") notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [
    { data: lab },
    { data: snapshot },
    { data: oral },
    { data: profile },
    { data: lifestyle },
    { data: sleepNights },
    { data: articles },
  ] = await Promise.all([
    supabase.from("blood_results").select("*")
      .eq("user_id", user.id)
      .order("collected_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("score_snapshots").select("*")
      .eq("user_id", user.id).order("calculated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("oral_kit_orders").select("*, raw_otu_table")
      .eq("user_id", user.id).eq("status", "results_ready")
      .order("results_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("profiles").select("date_of_birth").eq("id", user.id).single(),
    supabase.from("lifestyle_records").select("biological_sex, mouthwash_type, nasal_obstruction, sinus_history")
      .eq("user_id", user.id).limit(1).maybeSingle(),
    supabase.from("sleep_data")
      .select("date, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, sleep_efficiency, hrv_rmssd, resting_heart_rate")
      .eq("user_id", user.id).order("date", { ascending: false }).limit(30),
    supabase.from("articles").select("slug, title, summary, read_time_min")
      .eq("published", true)
      .in("slug", def.related_articles.length > 0 ? def.related_articles : ["__none__"]),
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

  const nights = (sleepNights ?? []) as Array<Record<string, unknown>>
  const avg = (key: string) => {
    const vals = nights.map(n => Number(n[key])).filter(v => !isNaN(v) && v > 0)
    return vals.length >= 3 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }

  let value: number | null = null
  if (metric === "deep_sleep") value = avg("deep_sleep_minutes")
  else if (metric === "rem") value = avg("rem_sleep_minutes")
  else if (metric === "duration") { const m = avg("total_sleep_minutes"); value = m !== null ? m / 60 : null }
  else if (metric === "recovery_hrv") {
    // Prefer the 14-night gated Pinheiro median from the snapshot; fall back to raw avg.
    const snapMedian = (snapshot as Record<string, unknown> | null)?.hrv_rmssd_median as number | null
    value = snapMedian ?? avg("hrv_rmssd")
  }
  else if (metric === "consistency") value = null

  return (
    <MarkerDetailClient
      def={def}
      value={value}
      connectionInput={connectionInput}
      history={[]}
      articles={(articles ?? []).map(a => ({
        slug: a.slug as string, title: a.title as string,
        summary: (a.summary as string | null) ?? "", readTime: (a.read_time_min as number | null) ?? 5,
      }))}
      backHref="/dashboard/sleep"
      backLabel="Back to Sleep Panel"
      panelColor="#4A7FB5"
      panelLabel="Sleep"
    />
  )
}

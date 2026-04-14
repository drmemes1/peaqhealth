import { notFound, redirect } from "next/navigation"
import { createClient } from "../../../../lib/supabase/server"
import { MARKER_DEFINITIONS } from "../../../../lib/markers/definitions"
import { buildConnectionInput } from "../../../../lib/score/buildConnectionInput"
import { MarkerDetailClient } from "./marker-client"

export default async function MarkerPage({ params }: { params: Promise<{ marker: string }> }) {
  const { marker } = await params
  const def = MARKER_DEFINITIONS[marker]
  if (!def) notFound()

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
    { data: labHistory },
  ] = await Promise.all([
    supabase.from("lab_results").select("*")
      .eq("user_id", user.id).eq("parser_status", "complete")
      .order("collection_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("score_snapshots").select("*")
      .eq("user_id", user.id).order("calculated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("oral_kit_orders").select("*, raw_otu_table")
      .eq("user_id", user.id).eq("status", "results_ready")
      .order("results_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("profiles").select("date_of_birth").eq("id", user.id).single(),
    supabase.from("lifestyle_records").select("biological_sex, mouthwash_type, nasal_obstruction, sinus_history")
      .eq("user_id", user.id).limit(1).maybeSingle(),
    supabase.from("sleep_data")
      .select("total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, sleep_efficiency, hrv_rmssd, resting_heart_rate")
      .eq("user_id", user.id).order("date", { ascending: false }).limit(30),
    supabase.from("articles").select("slug, title, summary, read_time_min")
      .eq("published", true)
      .in("slug", def.related_articles.length > 0 ? def.related_articles : ["__none__"]),
    supabase.from("lab_results").select("*")
      .eq("user_id", user.id).eq("parser_status", "complete")
      .order("collection_date", { ascending: true }).limit(5),
  ])

  const dobStr = profile?.date_of_birth as string | null
  const age = dobStr ? Math.floor((Date.now() - new Date(dobStr).getTime()) / (365.25 * 86400000)) : undefined

  const connectionInput = buildConnectionInput({
    age,
    sex: lifestyle?.biological_sex as string | null,
    lab: lab as Record<string, unknown> | null,
    oral: oral as Record<string, unknown> | null,
    sleepNights: (sleepNights ?? []) as Array<Record<string, unknown>>,
    lifestyle: lifestyle as Record<string, unknown> | null,
    snapshot: snapshot as Record<string, unknown> | null,
  })

  const value = lab ? (lab[def.db_column] as number | null) ?? null : null

  const history = (labHistory ?? [])
    .map(row => {
      const r = row as Record<string, unknown>
      const v = r[def.db_column] as number | null
      return v !== null ? { date: r.collection_date as string, value: v } : null
    })
    .filter((h): h is { date: string; value: number } => h !== null)

  return (
    <MarkerDetailClient
      def={def}
      value={value}
      connectionInput={connectionInput}
      history={history}
      articles={(articles ?? []).map(a => ({
        slug: a.slug as string,
        title: a.title as string,
        summary: (a.summary as string | null) ?? "",
        readTime: (a.read_time_min as number | null) ?? 5,
      }))}
    />
  )
}

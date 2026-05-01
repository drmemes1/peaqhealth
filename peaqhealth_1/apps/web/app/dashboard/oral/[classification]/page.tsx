import { notFound, redirect } from "next/navigation"
import { createClient } from "../../../../lib/supabase/server"
import { MARKER_DEFINITIONS } from "../../../../lib/markers/definitions"
import { buildConnectionInput } from "../../../../lib/score/buildConnectionInput"
import { MarkerDetailClient } from "../../blood/[marker]/marker-client"

export default async function OralClassificationPage({ params }: { params: Promise<{ classification: string }> }) {
  const { classification } = await params
  const def = MARKER_DEFINITIONS[classification]
  if (!def || def.panel !== "oral") notFound()

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
      .eq("user_id", user.id).eq("parser_status", "complete")
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
      .select("total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, sleep_efficiency, hrv_rmssd, resting_heart_rate")
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

  const breakdown = (snapshot?.peaq_age_breakdown ?? {}) as Record<string, unknown>
  const oralSnapshot = (oral?.oral_score_snapshot ?? {}) as Record<string, unknown>
  const rawOtu = (oral?.raw_otu_table ?? null) as Record<string, number> | null

  let value: number | null = null
  if (classification === "good_bacteria") value = breakdown.omaPct as number | null ?? null
  else if (classification === "harmful_bacteria") value = oralSnapshot.periodontPathPct as number | null ?? null
  else if (classification === "cavity_risk") value = rawOtu ? (rawOtu["Streptococcus mutans"] ?? 0) * 100 : null
  else if (classification === "breath_health") {
    if (rawOtu) {
      const fuso = Object.entries(rawOtu).filter(([k]) => k.toLowerCase().startsWith("fusobacterium")).reduce((s, [,v]) => s + v, 0) * 100
      value = fuso
    }
  }
  else if (classification === "diversity") value = oralSnapshot.shannonDiversity as number | null ?? null
  else if (classification === "inflammation_risk") value = breakdown.omaPct as number | null ?? null

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
      backHref="/dashboard/oral"
      backLabel="Back to Oral Panel"
      panelColor="#2D6A4F"
      panelLabel="Oral"
    />
  )
}

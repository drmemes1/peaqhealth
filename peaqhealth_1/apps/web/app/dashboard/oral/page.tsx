import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import OralPanelClient from "./oral-panel-client"
import { Nav } from "../../components/nav"
import Link from "next/link"

export default async function OralPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [{ data: oral }, { data: narrativeRow }, { data: lifestyle }, { data: sleepNights }] = await Promise.all([
    supabase.from("oral_kit_orders")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["results_ready", "scored"])
      .order("ordered_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("oral_narratives")
      .select("headline, narrative, positive_signal, watch_signal")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("lifestyle_records")
      .select("mouth_breathing, mouth_breathing_when, snoring_reported, nasal_obstruction, nasal_obstruction_severity, osa_witnessed, non_restorative_sleep, morning_headaches, bruxism_night, daytime_cognitive_fog")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("sleep_data")
      .select("spo2, respiratory_rate, resting_heart_rate")
      .eq("user_id", user.id)
      .gt("sleep_efficiency", 0)
      .gte("date", thirtyDaysAgo)
      .order("date", { ascending: false }),
  ])

  if (!oral) {
    return (
      <div className="min-h-svh bg-off-white">
        <Nav />
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: "var(--ink)", margin: "0 0 24px" }}>Oral Microbiome</h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-60)" }}>No oral results on file.</p>
          <Link href="/dashboard" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--gold)", display: "inline-block", marginTop: 12 }}>
            ← Back to dashboard
          </Link>
        </main>
      </div>
    )
  }

  const narrative = narrativeRow?.narrative
    ? parseNarrativeSections(narrativeRow.narrative as string)
    : null

  const nights = (sleepNights ?? []) as Array<Record<string, unknown>>
  const spo2Vals = nights.map(n => Number(n.spo2)).filter(v => Number.isFinite(v) && v > 0)
  const rrVals = nights.map(n => Number(n.respiratory_rate)).filter(v => Number.isFinite(v) && v > 0)
  const rhrVals = nights.map(n => Number(n.resting_heart_rate)).filter(v => Number.isFinite(v) && v > 0)
  const avg = (a: number[]) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null

  const wearable = nights.length > 0 ? {
    nights_available: nights.length,
    avg_spo2: avg(spo2Vals),
    avg_respiratory_rate: avg(rrVals),
    avg_rhr: avg(rhrVals),
  } : null

  return (
    <div className="min-h-svh bg-off-white">
      <Nav />
      <OralPanelClient
        kit={oral as Parameters<typeof OralPanelClient>[0]["kit"]}
        narrative={narrative}
        questionnaire={lifestyle as Parameters<typeof OralPanelClient>[0]["questionnaire"]}
        wearable={wearable}
      />
    </div>
  )
}

function parseNarrativeSections(text: string) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim())
  if (paragraphs.length === 0) return null

  const isDisclaimer = (p: string) =>
    p.toLowerCase().includes("not a clinical assessment") ||
    p.toLowerCase().includes("population associations are observational")

  const disclaimerIdx = paragraphs.findIndex(isDisclaimer)
  const content = disclaimerIdx >= 0 ? paragraphs.slice(0, disclaimerIdx) : paragraphs
  const disclaimer = disclaimerIdx >= 0 ? paragraphs[disclaimerIdx] : undefined

  return {
    section_opening: content[0] ?? undefined,
    section_cardiometabolic: content[1] ?? undefined,
    section_gum_caries: content[2] ?? undefined,
    section_breathing: content[3] ?? undefined,
    section_disclaimer: disclaimer,
  }
}

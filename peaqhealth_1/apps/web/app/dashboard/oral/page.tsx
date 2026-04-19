import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import OralPanelClient from "./oral-panel-client"
import { Nav } from "../../components/nav"
import Link from "next/link"

export default async function OralPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: oral }, { data: narrativeRow }] = await Promise.all([
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

  return (
    <div className="min-h-svh bg-off-white">
      <Nav />
      <OralPanelClient kit={oral as Parameters<typeof OralPanelClient>[0]["kit"]} narrative={narrative} />
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

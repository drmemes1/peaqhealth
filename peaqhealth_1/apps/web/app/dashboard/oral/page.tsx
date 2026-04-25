import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { getUserPanelContext } from "../../../lib/user-context"
import { Nav } from "../../components/nav"
import { OralPanelV4 } from "./oral-panel-v4"
import { OralPanelTreemap } from "./oral-panel-treemap"
import Link from "next/link"

const PILOT_USERS = new Set([
  "f08a47b5-4a8f-4b8c-b4d5-8f1de407d686", // Igor
  "5614b84a-34dd-428f-981a-4811158dbaa2", // Narod
])

export default async function OralPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const ctx = await getUserPanelContext(user.id)
  const useTreemap = PILOT_USERS.has(user.id)

  if (!ctx.hasOralKit) {
    return (
      <div className="min-h-svh" style={{ background: useTreemap ? "#EDEAE1" : "#F5F3EE" }}>
        <Nav />
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: "var(--ink)", margin: "0 0 24px" }}>Oral Microbiome</h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-60)" }}>No oral results on file.</p>
          <Link href="/dashboard" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--gold)", display: "inline-block", marginTop: 12 }}>← Back to dashboard</Link>
        </main>
      </div>
    )
  }

  if (useTreemap) {
    // Fetch genus-level counts from raw_otu_table for treemap
    const svc = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: oralRow } = await svc
      .from("oral_kit_orders")
      .select("raw_otu_table")
      .eq("user_id", user.id)
      .not("shannon_diversity", "is", null)
      .order("ordered_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const otu = (oralRow?.raw_otu_table ?? {}) as Record<string, unknown>
    // Aggregate to genus level (species keys are "Genus species" format)
    const genusCounts: Record<string, number> = {}
    for (const [key, val] of Object.entries(otu)) {
      if (key === "__meta") continue
      const num = Number(val)
      if (!Number.isFinite(num) || num <= 0) continue
      const genus = key.split(" ")[0]
      genusCounts[genus] = (genusCounts[genus] ?? 0) + num
    }

    return (
      <div className="min-h-svh" style={{ background: "#EDEAE1" }}>
        <Nav />
        <OralPanelTreemap ctx={ctx} genusCounts={genusCounts} />
      </div>
    )
  }

  return (
    <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
      <Nav />
      <OralPanelV4 ctx={ctx} />
    </div>
  )
}

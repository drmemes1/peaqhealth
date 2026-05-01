import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import BloodPanelClient from "./blood-panel-rebuild"
import { Nav } from "../../components/nav"
import { getUserPanelContext } from "../../../lib/user-context"
import Link from "next/link"

export default async function BloodPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const ctx = await getUserPanelContext(user.id)

  if (!ctx.hasBloodPanel) {
    return (
      <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
        <Nav />
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>
          <h1 style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif", fontSize: 36, fontWeight: 300, color: "var(--ink)", margin: "0 0 24px" }}>Blood Panel</h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-60)" }}>No blood results on file.</p>
          <Link href="/dashboard" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--gold)", display: "inline-block", marginTop: 12 }}>← Back to dashboard</Link>
        </main>
      </div>
    )
  }

  // Fetch raw lab row with DB column names — blood-panel-rebuild expects snake_case keys
  const { data: labRaw } = await supabase
    .from("blood_results").select("*")
    .eq("user_id", user.id).eq("parser_status", "complete")
    .order("collected_at", { ascending: false }).limit(1).maybeSingle()

  return (
    <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
      <Nav />
      <Suspense>
        <BloodPanelClient
          lab={(labRaw ?? ctx.bloodPanel) as Record<string, unknown>}
          hasOral={ctx.hasOralKit}
          hasSleep={ctx.hasWearable}
        />
      </Suspense>
    </div>
  )
}

import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import BloodPanelClient from "./blood-panel-rebuild"
import { Nav } from "../../components/nav"
import Link from "next/link"

export default async function BloodPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: lab }, { count: oralCount }, { count: sleepCount }] = await Promise.all([
    supabase.from("lab_results").select("*")
      .eq("user_id", user.id).eq("parser_status", "complete")
      .order("collection_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("oral_kit_orders").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).not("shannon_diversity", "is", null),
    supabase.from("sleep_data").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gt("sleep_efficiency", 0),
  ])

  if (!lab) {
    return (
      <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
        <Nav />
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: "var(--ink)", margin: "0 0 24px" }}>Blood Panel</h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-60)" }}>No blood results on file.</p>
          <Link href="/dashboard" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--gold)", display: "inline-block", marginTop: 12 }}>← Back to dashboard</Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
      <Nav />
      <BloodPanelClient
        lab={lab as Record<string, unknown>}
        hasOral={(oralCount ?? 0) > 0}
        hasSleep={(sleepCount ?? 0) > 0}
      />
    </div>
  )
}

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
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-60)", margin: "0 0 24px" }}>
            No blood results on file. Upload a lab PDF (LabCorp, Quest, Function Health, anywhere — the parser handles all formats) to see your panel here.
          </p>
          <Link
            href="/settings/labs"
            style={{
              fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500,
              color: "white", background: "var(--blood-c, #C0392B)",
              padding: "12px 20px", borderRadius: 8, textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}
          >
            Upload blood PDF here →
          </Link>
          <div style={{ marginTop: 24 }}>
            <Link href="/dashboard" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--gold)" }}>← Back to dashboard</Link>
          </div>
        </main>
      </div>
    )
  }

  // Fetch raw lab row with DB column names — blood-panel-rebuild expects snake_case keys
  const { data: labRaw } = await supabase
    .from("blood_results").select("*")
    .eq("user_id", user.id)
    .order("collected_at", { ascending: false }).limit(1).maybeSingle()

  return (
    <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
      <Nav />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "16px 24px 0" }}>
        <div style={{
          display: "flex", justifyContent: "flex-end",
          fontFamily: "var(--font-body)", fontSize: 12,
        }}>
          <Link
            href="/settings/labs"
            style={{
              color: "var(--ink-60)", textDecoration: "none",
              padding: "8px 14px", border: "1px solid var(--ink-12, rgba(20,20,16,0.12))",
              borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            ↻ Re-upload blood here
          </Link>
        </div>
      </main>
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

import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { getUserPanelContext } from "../../../lib/user-context"
import { Nav } from "../../components/nav"
import SleepQuestionnaireView from "./sleep-questionnaire-view"
import { SleepPanelClient } from "./sleep-panel-client"
import { SleepTileSection } from "./SleepTileSection"
import Link from "next/link"

export default async function SleepPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const ctx = await getUserPanelContext(user.id)

  // State 3: Questionnaire only (no wearable) — new view
  if (!ctx.hasWearable && ctx.hasQuestionnaire) {
    return (
      <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
        <Nav />
        <SleepQuestionnaireView ctx={ctx} />
        <SleepTileSection ctx={ctx} />
      </div>
    )
  }

  // State 4: Neither — empty state
  if (!ctx.hasWearable && !ctx.hasQuestionnaire) {
    return (
      <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
        <Nav />
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>
          <h1 style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif", fontSize: 36, fontWeight: 300, color: "var(--ink)", margin: "0 0 24px" }}>Sleep</h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-60)", lineHeight: 1.6, marginBottom: 16 }}>
            Complete your sleep questionnaire or connect a wearable to see your sleep data here.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/questionnaire/v2" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--gold)" }}>Complete questionnaire →</Link>
            <Link href="/settings" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-30)" }}>Connect wearable →</Link>
          </div>
        </main>
      </div>
    )
  }

  // State 1 & 2: Has wearable — use existing sleep panel client
  const [{ data: sleepNights }, { data: snapshot }, { data: wearableConn }] = await Promise.all([
    supabase.from("sleep_data").select("date,source,total_sleep_minutes,deep_sleep_minutes,rem_sleep_minutes,sleep_efficiency,hrv_rmssd,spo2,resting_heart_rate").eq("user_id", user.id).order("date", { ascending: false }).limit(30),
    supabase.from("score_snapshots").select("*").eq("user_id", user.id).order("calculated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("wearable_connections_v2").select("*").eq("user_id", user.id).order("connected_at", { ascending: false }).limit(1).maybeSingle(),
  ])

  return (
    <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
      <Nav />
      <SleepPanelClient
        nights={(sleepNights ?? []) as Array<Record<string, unknown>>}
        snapshot={snapshot as Record<string, unknown> | null}
        wearable={wearableConn as Record<string, unknown> | null}
      />
      <SleepTileSection ctx={ctx} />
    </div>
  )
}

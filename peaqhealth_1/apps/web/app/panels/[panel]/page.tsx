import { redirect, notFound } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { PanelDetailClient } from "./panel-detail-client"

const VALID_PANELS = ["sleep", "blood", "oral"] as const

export const dynamic = "force-dynamic"

export default async function PanelDetailPage({ params }: { params: Promise<{ panel: string }> }) {
  const { panel } = await params
  if (!VALID_PANELS.includes(panel as any)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Fetch profile for initials
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single()

  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?"

  // Fetch panel-specific data
  let panelData: any = null
  let score = 0
  let maxScore = 0
  let lastUpdated = ""
  let source = ""

  const { data: snapshot } = await supabase
    .from("score_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (panel === "blood") {
    maxScore = 40
    score = snapshot?.blood_sub ?? 0
    const { data: lab } = await supabase
      .from("lab_results")
      .select("*")
      .eq("user_id", user.id)
      .eq("parser_status", "complete")
      .order("collection_date", { ascending: false })
      .limit(1)
      .single()
    if (lab) {
      source = (lab.lab_name as string) ?? "Lab"
      lastUpdated = (lab.collection_date as string) ?? ""
      panelData = {
        hsCRP: lab.hs_crp_mgl ?? 0,
        ldl: lab.ldl_mgdl ?? 0,
        hdl: lab.hdl_mgdl ?? 0,
        glucose: lab.glucose_mgdl ?? 0,
        triglycerides: lab.triglycerides_mgdl ?? 0,
        lpa: ((lab.lpa_mgdl as number) ?? 0) * 2.5,
        apoB: lab.apob_mgdl ?? 0,
        vitaminD: lab.vitamin_d_ngml ?? 0,
        ldlHdlRatio: (lab.ldl_mgdl && lab.hdl_mgdl) ? (lab.ldl_mgdl as number) / (lab.hdl_mgdl as number) : 0,
        egfr: lab.egfr_mlmin ?? 0,
        hemoglobin: lab.hemoglobin_gdl ?? 0,
        hba1c: lab.hba1c_pct ?? 0,
      }
    }
  } else if (panel === "sleep") {
    maxScore = 30
    score = snapshot?.sleep_sub ?? 0
    const { data: wearable } = await supabase
      .from("wearable_connections_v2")
      .select("provider, last_synced_at")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: sleepNights } = await supabase
      .from("sleep_data")
      .select("date,source,total_sleep_minutes,deep_sleep_minutes,rem_sleep_minutes,sleep_efficiency,hrv_rmssd,spo2")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30)

    const nights = (sleepNights ?? []) as Array<Record<string, any>>
    if (nights.length > 0) {
      const totalMin = nights.reduce((s, n) => s + (n.total_sleep_minutes ?? 0), 0) / nights.length
      source = ({ oura: "Oura Ring", whoop: "WHOOP", garmin: "Garmin" } as Record<string, string>)[wearable?.provider ?? ""] ?? "Wearable"
      lastUpdated = wearable?.last_synced_at ?? ""
      panelData = {
        deepPct: totalMin > 0 ? (nights.reduce((s, n) => s + (n.deep_sleep_minutes ?? 0), 0) / nights.length / totalMin) * 100 : 0,
        remPct: totalMin > 0 ? (nights.reduce((s, n) => s + (n.rem_sleep_minutes ?? 0), 0) / nights.length / totalMin) * 100 : 0,
        efficiency: nights.reduce((s, n) => s + (n.sleep_efficiency ?? 0), 0) / nights.length,
        hrv: nights.reduce((s, n) => s + (n.hrv_rmssd ?? 0), 0) / nights.length,
        spo2Avg: nights.reduce((s, n) => s + (n.spo2 ?? 0), 0) / nights.length,
      }
    }
  } else if (panel === "oral") {
    maxScore = 30
    score = snapshot?.oral_sub ?? 0
    const { data: oral } = await supabase
      .from("oral_kit_orders")
      .select("*")
      .eq("user_id", user.id)
      .not("shannon_diversity", "is", null)
      .limit(1)
      .maybeSingle()
    if (oral) {
      source = "Zymo Research"
      lastUpdated = oral.report_date ?? ""
      panelData = {
        shannonDiversity: oral.shannon_diversity ?? 0,
        nitrateReducersPct: ((oral.nitrate_reducers_pct as number) ?? 0) * 100,
        periodontPathPct: ((oral.periodontopathogen_pct as number) ?? 0) * 100,
        osaTaxaPct: ((oral.osa_taxa_pct as number) ?? 0) * 100,
      }
    }
  }

  return (
    <PanelDetailClient
      panel={panel as "sleep" | "blood" | "oral"}
      initials={initials}
      score={score}
      maxScore={maxScore}
      source={source}
      lastUpdated={lastUpdated}
      panelData={panelData}
    />
  )
}

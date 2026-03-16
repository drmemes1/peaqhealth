import { redirect } from "next/navigation"
import { createClient } from "../../lib/supabase/server"
import { DashboardClient } from "./dashboard-client"
import type { ScoreWheelProps } from "../components/score-wheel"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [
    { data: snapshot },
    { data: wearable },
    { data: lab },
    { data: oral },
    { data: lifestyle },
  ] = await Promise.all([
    supabase.from("score_snapshots").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single(),
    supabase.from("wearable_connections").select("*").eq("user_id", user.id).eq("connected", true).order("connected_at", { ascending: false }).limit(1).single(),
    supabase.from("lab_results").select("*").eq("user_id", user.id).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).single(),
    supabase.from("oral_kit_orders").select("*").eq("user_id", user.id).eq("status", "results_ready").order("created_at", { ascending: false }).limit(1).single(),
    supabase.from("lifestyle_records").select("*").eq("user_id", user.id).single(),
  ])

  // Compute lab freshness
  type LabFreshness = 'fresh' | 'aging' | 'stale' | 'expired' | 'none'
  let labFreshness: LabFreshness = 'none'
  let monthsOld = 0
  if (lab?.collection_date) {
    const daysSince = (Date.now() - new Date(lab.collection_date).getTime()) / 86400000
    monthsOld = Math.floor(daysSince / 30)
    if (daysSince <= 180) labFreshness = 'fresh'
    else if (daysSince <= 270) labFreshness = 'aging'
    else if (daysSince <= 365) labFreshness = 'stale'
    else labFreshness = 'expired'
  }

  const score = snapshot?.total_score ?? 0
  const breakdown = {
    sleepSub:        snapshot?.sleep_sub ?? 0,
    bloodSub:        snapshot?.blood_sub ?? 0,
    oralSub:         snapshot?.oral_sub ?? 0,
    lifestyleSub:    snapshot?.lifestyle_sub ?? 0,
    interactionPool: snapshot?.interaction_pool ?? 15,
  }

  const props: ScoreWheelProps = {
    score,
    breakdown,
    sleepConnected: !!wearable,
    labFreshness,
    oralActive: !!oral,
    sleepData: wearable ? {
      deepPct:    wearable.deep_sleep_pct ?? 0,
      hrv:        wearable.hrv_rmssd ?? 0,
      spo2Dips:   wearable.spo2_dips ?? 0,
      remPct:     wearable.rem_pct ?? 0,
      efficiency: wearable.sleep_efficiency ?? 0,
      nightsAvg:  wearable.nights_avg ?? 10,
      device:     wearable.provider ?? "Wearable",
      lastSync:   wearable.last_sync_at ?? "",
    } : undefined,
    bloodData: lab ? {
      hsCRP:          lab.hs_crp ?? 0,
      vitaminD:       lab.vitamin_d ?? 0,
      apoB:           lab.apo_b ?? 0,
      ldlHdlRatio:    lab.ldl_hdl_ratio ?? 0,
      hba1c:          lab.hba1c ?? 0,
      lpa:            lab.lp_a ?? 0,
      triglycerides:  lab.triglycerides ?? 0,
      collectionDate: lab.collection_date ?? "",
      labName:        lab.laboratory ?? "Lab",
      monthsOld,
    } : undefined,
    oralData: oral ? {
      shannonDiversity:   oral.shannon_diversity ?? 0,
      nitrateReducersPct: oral.nitrate_reducers_pct ?? 0,
      periodontPathPct:   oral.periodont_path_pct ?? 0,
      osaTaxaPct:         oral.osa_taxa_pct ?? 0,
      reportDate:         oral.report_date ?? "",
    } : undefined,
    lifestyleData: lifestyle ? {
      exerciseTier:  lifestyle.exercise_tier ?? "sedentary",
      brushingFreq:  lifestyle.brushing_freq ?? 0,
      flossingFreq:  lifestyle.flossing_freq ?? 0,
      dentalVisits:  lifestyle.dental_visits_per_year ?? 0,
      smoking:       lifestyle.smoking ?? false,
      updatedAt:     lifestyle.updated_at ?? "",
    } : undefined,
    interactions: {
      sleepInflammation: snapshot?.ix_sleep_inflammation ?? true,
      spo2Lipid:         snapshot?.ix_spo2_lipid ?? true,
      dualInflammatory:  snapshot?.ix_dual_inflammatory ?? true,
      hrvHomocysteine:   snapshot?.ix_hrv_homocysteine ?? true,
      periodontCRP:      snapshot?.ix_periodont_crp ?? true,
      osaTaxaSpO2:       snapshot?.ix_osa_taxa_spo2 ?? true,
      lowNitrateCRP:     snapshot?.ix_low_nitrate_crp ?? true,
      lowDiversitySleep: snapshot?.ix_low_diversity_sleep ?? true,
    },
  }

  return <DashboardClient {...props} />
}

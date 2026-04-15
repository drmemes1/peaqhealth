import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { derivePositiveSignalsKeyed } from "../../../lib/positiveSignals"
import { generatePlanItems, deriveMarkerStatuses } from "../../../lib/planItems"
import { PlanClient } from "./plan-client"

export default async function PlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [
    { data: snapshot },
    { data: lab },
    { data: oral },
    { data: sleepNights },
    { data: profile },
    { data: lifestyle },
  ] = await Promise.all([
    supabase.from("score_snapshots").select("*")
      .eq("user_id", user.id).order("calculated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lab_results").select("*")
      .eq("user_id", user.id).eq("parser_status", "complete")
      .order("collection_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("oral_kit_orders").select("*")
      .eq("user_id", user.id).eq("status", "results_ready")
      .order("results_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("sleep_data")
      .select("total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, sleep_efficiency, hrv_rmssd, resting_heart_rate")
      .eq("user_id", user.id).order("date", { ascending: false }).limit(30),
    supabase.from("profiles").select("first_name, date_of_birth").eq("id", user.id).single(),
    supabase.from("lifestyle_records").select("mouthwash_type, flossing_freq").eq("user_id", user.id).limit(1).maybeSingle(),
  ])

  const nights = (sleepNights ?? []) as Array<Record<string, unknown>>
  const avg = (key: string) => {
    const vals = nights.map(n => Number(n[key])).filter(v => !isNaN(v) && v > 0)
    return vals.length >= 3 ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined
  }
  const totalMin = avg("total_sleep_minutes")
  const deepMin = avg("deep_sleep_minutes")
  const remMin = avg("rem_sleep_minutes")

  const sleepData = totalMin ? {
    deepPct: deepMin ? (deepMin / totalMin) * 100 : undefined,
    remPct: remMin ? (remMin / totalMin) * 100 : undefined,
    hrv: avg("hrv_rmssd"),
  } : null

  const breakdown = (snapshot?.peaq_age_breakdown ?? {}) as Record<string, unknown>
  const chronoAge = (breakdown.chronoAge as number | undefined) ?? null

  const positiveSignals = derivePositiveSignalsKeyed({
    oral: oral ? {
      shannonDiversity: (oral.shannon_diversity as number | null) ?? undefined,
      nitrateReducersPct: oral.nitrate_reducers_pct ? (oral.nitrate_reducers_pct as number) * 100 : undefined,
    } : null,
    blood: lab ? {
      hsCRP: (lab.hs_crp_mgl as number | null) ?? undefined,
      ldl: (lab.ldl_mgdl as number | null) ?? undefined,
      vitaminD: (lab.vitamin_d_ngml as number | null) ?? undefined,
    } : null,
    sleep: sleepData,
    snapshot: snapshot as Record<string, number | null> | null,
    chronoAge,
    peaqAgeBreakdown: breakdown,
  })

  // Generated plan items — deterministic, global
  const markerStatuses = deriveMarkerStatuses({
    lab: lab as Record<string, unknown> | null,
    oral: oral as Record<string, unknown> | null,
    snapshot: snapshot as Record<string, unknown> | null,
    sleepNights: (sleepNights ?? []) as Array<Record<string, unknown>>,
    lifestyle: lifestyle as Record<string, unknown> | null,
  })
  const generatedItems = generatePlanItems(markerStatuses).slice(0, 6)

  // Missing/amber blood markers for "Tests to discuss"
  const hasLab = !!lab
  const missingTests: string[] = []
  if (hasLab) {
    if (lab.hs_crp_mgl == null || (lab.hs_crp_mgl as number) === 0) missingTests.push("hs_crp")
    if (lab.lpa_mgdl == null || (lab.lpa_mgdl as number) === 0) missingTests.push("lpa")
    if (lab.vitamin_d_ngml == null || (lab.vitamin_d_ngml as number) === 0) missingTests.push("vitamin_d")
    if (lab.hba1c_pct == null || (lab.hba1c_pct as number) === 0) missingTests.push("hba1c")
    if (lab.rdw_pct == null || (lab.rdw_pct as number) === 0) missingTests.push("rdw")
    if (lab.mpv_fl == null || (lab.mpv_fl as number) === 0) missingTests.push("mpv")
  } else {
    // No lab — show all non-standard tests
    missingTests.push("hs_crp", "lpa", "vitamin_d", "hba1c")
  }

  return (
    <PlanClient
      firstName={(profile?.first_name as string | null) ?? undefined}
      updatedAt={(snapshot?.calculated_at as string | null) ?? null}
      positiveSignals={positiveSignals}
      planItems={generatedItems}
      missingTests={missingTests}
    />
  )
}

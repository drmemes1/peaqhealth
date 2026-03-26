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
    { data: oralAny },
    { data: lifestyle },
    { data: labHistoryRows },
    { data: whoopConn },
    { data: whoopNights },
  ] = await Promise.all([
    supabase.from("score_snapshots").select("*").eq("user_id", user.id).order("calculated_at", { ascending: false }).limit(1).single(),
    supabase.from("wearable_connections").select("*").eq("user_id", user.id).eq("status", "connected").order("connected_at", { ascending: false }).limit(1).single(),
    supabase.from("lab_results").select("*").eq("user_id", user.id).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).single(),
    supabase.from("oral_kit_orders").select("id, shannon_diversity").eq("user_id", user.id).limit(1).maybeSingle(),
    supabase.from("lifestyle_records").select("*").eq("user_id", user.id).single(),
    supabase.from("lab_history").select("locked_at, total_score, blood_score, collection_date, ldl_mgdl, hdl_mgdl, hs_crp_mgl, vitamin_d_ngml").eq("user_id", user.id).order("locked_at", { ascending: true }),
    supabase.from("whoop_connections").select("last_synced_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("whoop_sleep_data").select("date, total_sleep_minutes, hrv_rmssd").eq("user_id", user.id).order("date", { ascending: false }).limit(3),
  ])

  const { data: oral } = await supabase
    .from("oral_kit_orders")
    .select("*")
    .eq("user_id", user.id)
    .not("shannon_diversity", "is", null)
    .limit(1)
    .maybeSingle()

  // Backfill wearable_connections for legacy users who connected before the upsert fix.
  // Skip when a WHOOP connection exists — the sync will create the proper row with real data.
  if (!wearable && !whoopConn && Number(snapshot?.sleep_sub ?? 0) > 0) {
    const ts = snapshot!.calculated_at
    await supabase.from("wearable_connections").upsert({
      user_id:      user.id,
      provider:     "unknown",
      status:       "connected",
      connected_at: ts,
      last_sync_at: ts,
    }, { onConflict: "user_id,provider" })
  }

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

  const oralSub = snapshot?.oral_sub ?? 0

  const score = Number(snapshot?.score ?? 0)
  const breakdown = {
    sleepSub:        snapshot?.sleep_sub ?? 0,
    bloodSub:        snapshot?.blood_sub ?? 0,
    oralSub,
    lifestyleSub:    snapshot?.lifestyle_sub ?? 0,
  }

  const interactionsFired = Array.isArray(snapshot?.interactions_fired) ? snapshot.interactions_fired as string[] : []

  const props: ScoreWheelProps = {
    score,
    breakdown,
    lastSyncAt:            (wearable?.last_sync_at as string | null) ?? null,
    lastSyncRequestedAt:   (wearable?.last_sync_requested_at as string | null) ?? null,
    sleepConnected: !!wearable || Number(snapshot?.sleep_sub ?? 0) > 0,
    labFreshness,
    oralActive: !!oral,
    sleepData: wearable ? {
      deepPct:    wearable.deep_sleep_pct ?? 0,
      hrv:        wearable.hrv_rmssd ?? 0,
      spo2Dips:   wearable.spo2_dips ?? 0,
      remPct:     wearable.rem_pct ?? 0,
      efficiency: wearable.sleep_efficiency ?? 0,
      nightsAvg:  (wearable.nights_available as number) ?? 0,
      device:     ({ oura: "Oura Ring", whoop: "WHOOP", garmin: "Garmin", apple_health: "Apple Health", fitbit: "Fitbit" } as Record<string, string>)[wearable.provider as string] ?? (wearable.junction_user_id ? "Wearable" : ""),
      lastSync:   wearable.last_sync_at ?? "",
    } : undefined,
    bloodData: lab ? {
      hsCRP:          (lab.hs_crp_mgl         as number) ?? 0,
      vitaminD:       (lab.vitamin_d_ngml      as number) ?? 0,
      apoB:           (lab.apob_mgdl           as number) ?? 0,
      ldlHdlRatio:    (lab.ldl_mgdl as number) && (lab.hdl_mgdl as number)
                        ? (lab.ldl_mgdl as number) / (lab.hdl_mgdl as number)
                        : 0,
      hba1c:          (lab.hba1c_pct           as number) ?? 0,
      lpa:            (lab.lpa_mgdl            as number) ?? 0,
      triglycerides:  (lab.triglycerides_mgdl  as number) ?? 0,
      ldl:            (lab.ldl_mgdl            as number) ?? 0,
      hdl:            (lab.hdl_mgdl            as number) ?? 0,
      glucose:        (lab.glucose_mgdl        as number) ?? 0,
      egfr:           (lab.egfr_mlmin          as number) ?? 0,
      hemoglobin:     (lab.hemoglobin_gdl      as number) ?? 0,
      collectionDate: (lab.collection_date     as string) ?? "",
      labName:        (lab.lab_name            as string) ?? "Lab",
      monthsOld,
      bloodInsight:   (lab.blood_insight       as string | null) ?? undefined,
    } : undefined,
    oralData: oral ? (() => {
      // DB stores pct values as decimals (0.130 = 13%) — multiply by 100 for display/flag thresholds
      const rawOtu = oral.raw_otu_table as Record<string, number> | null
      const species: Record<string, number> | undefined = rawOtu ? (() => {
        // Single species lookup (exact key, *100 for display)
        const sp = (key: string) => (rawOtu[key] ?? 0) * 100
        // Genus aggregate: sum all entries whose key starts with prefix
        const genus = (prefix: string) =>
          Object.entries(rawOtu)
            .filter(([k]) => k.toLowerCase().startsWith(prefix.toLowerCase()))
            .reduce((sum, [, v]) => sum + v, 0) * 100
        return {
          // Nitrate & cardiovascular
          "Neisseria subflava":          sp("Neisseria subflava"),
          "Rothia mucilaginosa":         sp("Rothia mucilaginosa"),
          "Veillonella parvula":         sp("Veillonella parvula"),
          "Neisseria flavescens":        sp("Neisseria flavescens"),
          // Periodontal pathogens
          "Porphyromonas gingivalis":    sp("Porphyromonas gingivalis"),
          "Treponema denticola":         sp("Treponema denticola"),
          "Tannerella forsythia":        sp("Tannerella forsythia"),
          "Prevotella intermedia":       sp("Prevotella intermedia"),
          "Fusobacterium nucleatum":     sp("Fusobacterium nucleatum"),
          // Caries & dental health
          "Streptococcus mutans":        sp("Streptococcus mutans"),
          "Streptococcus sobrinus":      sp("Streptococcus sobrinus"),
          "Lactobacillus spp.":          genus("Lactobacillus"),
          "Streptococcus salivarius":    sp("Streptococcus salivarius"),
          "Streptococcus sanguinis":     sp("Streptococcus sanguinis"),
          "Actinomyces spp.":            genus("Actinomyces"),
          // Protective
          "Rothia dentocariosa":         sp("Rothia dentocariosa"),
          "Haemophilus parainfluenzae":  sp("Haemophilus parainfluenzae"),
          // OSA & sleep
          "Prevotella melaninogenica":   sp("Prevotella melaninogenica"),
          "Fusobacterium periodonticum": sp("Fusobacterium periodonticum"),
          "Peptostreptococcus spp.":     genus("Peptostreptococcus"),
          // Breath & metabolic
          "Solobacterium moorei":        sp("Solobacterium moorei"),
          "Prevotella spp.":             genus("Prevotella"),
          "Fusobacterium spp.":          genus("Fusobacterium"),
          // Diversity
          "Species richness":            Object.values(rawOtu).filter(v => v > 0).length,
        }
      })() : undefined
      return {
        shannonDiversity:   oral.shannon_diversity ?? 0,
        nitrateReducersPct: ((oral.nitrate_reducers_pct as number) ?? 0) * 100,
        periodontPathPct:   ((oral.periodontopathogen_pct as number) ?? 0) * 100,
        osaTaxaPct:         ((oral.osa_taxa_pct as number) ?? 0) * 100,
        reportDate:         oral.report_date ?? "",
        species,
      }
    })() : undefined,
    lifestyleData: lifestyle ? {
      exerciseLevel:   (lifestyle.exercise_level    as string) ?? "sedentary",
      brushingFreq:    (lifestyle.brushing_freq     as string) ?? "once",
      flossingFreq:    (lifestyle.flossing_freq     as string) ?? "never",
      lastDentalVisit: (lifestyle.last_dental_visit as string) ?? "more",
      smokingStatus:   (lifestyle.smoking_status    as string) ?? "never",
      stressLevel:     (lifestyle.stress_level      as string | undefined),
      alcoholPerWeek:  (lifestyle.alcohol_drinks_per_week as number | undefined),
      vegServings:     (lifestyle.vegetable_servings_per_day as number | undefined),
      processedFood:   (lifestyle.processed_food_frequency as number | undefined),
      ageRange:        (lifestyle.age_range         as string | undefined),
      biologicalSex:   (lifestyle.biological_sex    as string | undefined),
      updatedAt:       (lifestyle.updated_at        as string) ?? "",
    } : undefined,
    oralOrdered: !!oralAny,
    oralKitStatus: (!oralAny ? "none" : (oralAny as Record<string, unknown>).shannon_diversity != null ? "complete" : "ordered") as "none" | "ordered" | "complete",
    sleepNightsAvailable: (wearable?.nights_available as number | null) ?? 0,
    interactionsFired,
    peaqPercent:      (snapshot?.peaq_percent      as number | null) ?? undefined,
    peaqPercentLabel: (snapshot?.peaq_percent_label as string | null) ?? undefined,
    lpaFlag:          (snapshot?.lpa_flag          as "elevated" | "very_elevated" | null) ?? null,
    hsCRPRetestFlag:  (snapshot?.hscrp_retest_flag as boolean | null) ?? false,
    // Lock window: only pass expiry when row is NOT yet locked
    labLockExpiresAt: (lab && !lab.is_locked && lab.lock_expires_at)
      ? (lab.lock_expires_at as string)
      : null,
    whoopData: whoopConn ? {
      connected:  true,
      lastSynced: (whoopConn.last_synced_at as string | null) ?? null,
      recentNights: (whoopNights ?? []).map(n => ({
        date:             n.date as string,
        totalSleepHours:  ((n.total_sleep_minutes as number) ?? 0) / 60,
        hrv:              (n.hrv_rmssd as number) ?? 0,
      })),
    } : { connected: false, lastSynced: null, recentNights: [] },
  }

  return <DashboardClient {...props} labHistory={labHistoryRows ?? []} />
}

import { redirect } from "next/navigation"
import { createClient } from "../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { DashboardClient } from "./dashboard-client"
import type { ScoreWheelProps } from "../components/score-wheel"
import { recalculateScore } from "../../lib/score/recalculate"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [
    { data: initialSnapshot },
    { data: wearableConn },
    { data: lab },
    { data: oralAny },
    { data: lifestyle },
    { data: labHistoryRows },
    { data: sleepNights },
  ] = await Promise.all([
    supabase.from("score_snapshots").select("*").eq("user_id", user.id).order("calculated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("wearable_connections_v2").select("provider,last_synced_at,needs_reconnect").eq("user_id", user.id).eq("needs_reconnect", false).order("connected_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lab_results").select("*").eq("user_id", user.id).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).single(),
    supabase.from("oral_kit_orders").select("id, shannon_diversity").eq("user_id", user.id).limit(1).maybeSingle(),
    supabase.from("lifestyle_records").select("*").eq("user_id", user.id).single(),
    supabase.from("lab_history").select("locked_at, total_score, blood_score, collection_date, ldl_mgdl, hdl_mgdl, hs_crp_mgl, vitamin_d_ngml").eq("user_id", user.id).order("locked_at", { ascending: true }),
    supabase.from("sleep_data").select("date,source,total_sleep_minutes,deep_sleep_minutes,rem_sleep_minutes,sleep_efficiency,hrv_rmssd,spo2").eq("user_id", user.id).order("date", { ascending: false }).limit(30),
  ])

  const wearable = wearableConn  // unified connection (replaces old wearable_connections + whoop_connections)

  const { data: oral } = await supabase
    .from("oral_kit_orders")
    .select("*")
    .eq("user_id", user.id)
    .not("shannon_diversity", "is", null)
    .limit(1)
    .maybeSingle()

  // Mutable reference — may be updated by the stale-zero healer below
  let snapshot = initialSnapshot

  console.log("[dashboard] initialSnapshot:", snapshot
    ? `score=${snapshot.score} sleep=${snapshot.sleep_sub} blood=${snapshot.blood_sub} lifestyle=${snapshot.lifestyle_sub} calculated_at=${snapshot.calculated_at}`
    : "null")
  console.log("[dashboard] wearable:", wearable ? `provider=${wearable.provider}` : "null")
  console.log("[dashboard] lab:", lab ? `collection_date=${lab.collection_date}` : "null")
  console.log("[dashboard] lifestyle:", lifestyle ? "present" : "null")

  // Compute sleep metrics from sleep_data (best provider per date, last 30 nights)
  const PROVIDER_PRIORITY: Record<string, number> = { whoop: 0, oura: 1, garmin: 2 }
  type SleepRow = { date: string; source: string; total_sleep_minutes: number; deep_sleep_minutes: number; rem_sleep_minutes: number; sleep_efficiency: number; hrv_rmssd: number | null; spo2: number | null }
  const allNights = (sleepNights ?? []) as unknown as SleepRow[]
  const bestByDate = new Map<string, SleepRow>()
  for (const n of allNights) {
    const existing = bestByDate.get(n.date)
    const p = PROVIDER_PRIORITY[n.source] ?? 99
    const ep = existing ? (PROVIDER_PRIORITY[existing.source] ?? 99) : Infinity
    if (p < ep) bestByDate.set(n.date, n)
  }
  const bestNights = Array.from(bestByDate.values()).sort((a, b) => b.date.localeCompare(a.date))
  const getWeight = (i: number) => i < 7 ? 3 : i < 14 ? 2 : 1
  const wavg = (key: keyof SleepRow): number => {
    let sum = 0, tot = 0
    bestNights.forEach((r, i) => { const v = Number(r[key]); if (!isNaN(v) && v !== 0) { const w = getWeight(i); sum += v * w; tot += w } })
    return tot > 0 ? sum / tot : 0
  }
  const sleepNightsCount = bestNights.length
  const totalMin = wavg("total_sleep_minutes")
  const computedSleepData = sleepNightsCount > 0 ? {
    deepPct:    totalMin > 0 ? (wavg("deep_sleep_minutes") / totalMin) * 100 : 0,
    remPct:     totalMin > 0 ? (wavg("rem_sleep_minutes")  / totalMin) * 100 : 0,
    efficiency: wavg("sleep_efficiency"),
    hrv:        wavg("hrv_rmssd"),
    spo2Avg:    wavg("spo2"),
    nightsAvg:  sleepNightsCount,
    device:     ({ oura: "Oura Ring", whoop: "WHOOP", garmin: "Garmin", apple_health: "Apple Health", fitbit: "Fitbit" } as Record<string, string>)[bestNights[0]?.source ?? ""] ?? "Wearable",
    lastSync:   wearable?.last_synced_at ?? "",
    providerSlug: bestNights[0]?.source ?? (wearable?.provider ?? "unknown"),
  } : undefined

  // Auto-heal stale/zero/v1/outdated snapshot. Fires when:
  // 1. No snapshot at all (first load ever)
  // 2. score=0 but panel data exists (disconnect regression / cron race)
  // 3. v1 snapshot (no base_score column) — force v2 recalculation
  // 4. Engine version < 8.0 — force recalculation with latest weights
  const snapshotIsV1 = snapshot && !snapshot.base_score
  const snapshotIsOutdated = snapshot && snapshot.engine_version !== "8.1"
  const snapshotIsStaleZero = !snapshot || (Number(snapshot.score) === 0 && (!!lab || !!oral || !!lifestyle)) || snapshotIsV1 || snapshotIsOutdated
  if (snapshotIsV1) console.log("[dashboard] v1 snapshot detected — forcing v2 recalculation for:", user.id)
  if (snapshotIsOutdated) console.log("[dashboard] outdated engine version", snapshot?.engine_version, "— forcing recalculation for:", user.id)
  console.log("[dashboard] snapshotIsStaleZero:", snapshotIsStaleZero, "score:", Number(snapshot?.score ?? 0), "isV1:", !!snapshotIsV1)
  if (snapshotIsStaleZero) {
    console.log("[dashboard] stale/zero/v1 snapshot — auto-recalculating for:", user.id)
    try {
      const svc = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
      await recalculateScore(user.id, svc)
      const { data: fresh } = await svc
        .from("score_snapshots")
        .select("*")
        .eq("user_id", user.id)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (fresh) snapshot = fresh
    } catch (err) {
      console.error("[dashboard] auto-recalculate failed:", err)
    }
  }

  console.log(`[dashboard] displaying: score=${snapshot?.score} sleep=${snapshot?.sleep_sub} blood=${snapshot?.blood_sub} oral=${snapshot?.oral_sub} engine=${snapshot?.engine_version} snapshot_at=${snapshot?.calculated_at}`)

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

  // When no wearable is connected, subtract the stored sleep_sub so the wheel total
  // matches the panel breakdown (sleep panel shows 0, wheel shows blood+oral+lifestyle only).
  const rawScore = Number(snapshot?.score ?? 0)
  const storedSleepSub = Number(snapshot?.sleep_sub ?? 0)
  const score = wearable ? rawScore : Math.max(0, rawScore - storedSleepSub)
  console.log(`[dashboard] computed score=${score} rawScore=${rawScore} storedSleepSub=${storedSleepSub} wearable=${!!wearable}`)

  const breakdown = {
    sleepSub:        wearable ? storedSleepSub : 0,
    bloodSub:        snapshot?.blood_sub ?? 0,
    oralSub,
    lifestyleSub:    snapshot?.lifestyle_sub ?? 0,
  }

  const interactionsFired = Array.isArray(snapshot?.interactions_fired) ? snapshot.interactions_fired as string[] : []

  const props: ScoreWheelProps = {
    score,
    breakdown,
    lastSyncAt:            (wearable?.last_synced_at as string | null) ?? null,
    lastSyncRequestedAt:   null,
    sleepConnected: !!wearable,
    wearableProvider: wearable?.provider ?? undefined,
    labFreshness,
    oralActive: !!oral,
    sleepData: computedSleepData,
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
      ageRange:        (lifestyle.age_range              as string | undefined),
      biologicalSex:   (lifestyle.biological_sex         as string | undefined),
      mouthwashType:   (lifestyle.mouthwash_type         as string | undefined),
      fermentedFoods:  (lifestyle.fermented_foods_frequency as string | undefined),
      updatedAt:       (lifestyle.updated_at             as string) ?? "",
    } : undefined,
    oralOrdered: !!oralAny,
    oralKitStatus: (!oralAny ? "none" : (oralAny as Record<string, unknown>).shannon_diversity != null ? "complete" : "ordered") as "none" | "ordered" | "complete",
    sleepNightsAvailable: sleepNightsCount,
    interactionsFired,
    peaqPercent:      (snapshot?.peaq_percent      as number | null) ?? undefined,
    peaqPercentLabel: (snapshot?.peaq_percent_label as string | null) ?? undefined,
    lpaFlag:          (snapshot?.lpa_flag          as "elevated" | "very_elevated" | null) ?? null,
    hsCRPRetestFlag:  (snapshot?.hscrp_retest_flag as boolean | null) ?? false,
    // Lock window: only pass expiry when row is NOT yet locked
    labLockExpiresAt: (lab && !lab.is_locked && lab.lock_expires_at)
      ? (lab.lock_expires_at as string)
      : null,
    modifiers_applied: snapshot?.modifiers_applied ?? [],
    modifier_total: snapshot?.modifier_total ?? 0,
    whoopData: wearable?.provider === "whoop" ? {
      connected:  true,
      lastSynced: (wearable.last_synced_at as string | null) ?? null,
      recentNights: bestNights.filter(n => n.source === "whoop").slice(0, 3).map(n => ({
        date:             n.date,
        totalSleepHours:  (n.total_sleep_minutes ?? 0) / 60,
        hrv:              n.hrv_rmssd ?? 0,
      })),
    } : { connected: false, lastSynced: null, recentNights: [] },
  }

  return <DashboardClient {...props} labHistory={labHistoryRows ?? []} />
}

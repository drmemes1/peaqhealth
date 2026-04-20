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
    { data: profile },
    { data: prevSnapshot },
    { data: articlesData },
  ] = await Promise.all([
    supabase.from("score_snapshots").select("*").eq("user_id", user.id).order("calculated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("wearable_connections_v2").select("provider,last_synced_at,needs_reconnect").eq("user_id", user.id).order("connected_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lab_results").select("*").eq("user_id", user.id).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("oral_kit_orders").select("id, shannon_diversity").eq("user_id", user.id).limit(1).maybeSingle(),
    supabase.from("lifestyle_records").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("lab_history").select("locked_at, total_score, blood_score, collection_date, ldl_mgdl, hdl_mgdl, hs_crp_mgl, vitamin_d_ngml").eq("user_id", user.id).order("locked_at", { ascending: true }),
    supabase.from("sleep_data").select("date,source,total_sleep_minutes,deep_sleep_minutes,rem_sleep_minutes,sleep_efficiency,hrv_rmssd,spo2").eq("user_id", user.id).order("date", { ascending: false }).limit(30),
    supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle(),
    supabase.from("score_snapshots").select("sleep_sub,blood_sub,oral_sub,calculated_at").eq("user_id", user.id).order("calculated_at", { ascending: false }).range(1, 1).maybeSingle(),
    supabase.from("articles").select("slug, title, read_time_min").eq("published", true).order("published_at", { ascending: false }).limit(3),
  ])

  const wearableRaw = wearableConn  // unified connection (replaces old wearable_connections + whoop_connections)
  // Treat needs_reconnect connections as still "connected" for data display
  // (their sleep data is still in the DB), but flag the stale state
  const wearableNeedsReconnect = !!(wearableRaw as any)?.needs_reconnect
  const wearable = wearableRaw  // keep existing data flowing — reconnect is a UI concern

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
  // 4. Engine version check — V5 is now the only accepted version.
  // Any snapshot that isn't v5 forces recalculation with the V5 engine.
  const snapshotIsV1 = snapshot && !snapshot.base_score
  const snapshotIsOutdated = false
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
      lpa:            ((lab.lpa_mgdl            as number) ?? 0) * 2.5,
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

  // Compute most recent sleep data date for sync freshness
  const latestSleepDate = bestNights.length > 0 ? bestNights[0].date : null

  // Compute trend deltas (current vs previous snapshot)
  const trendDeltas = prevSnapshot ? {
    sleep: snapshot && prevSnapshot.sleep_sub != null ? (snapshot.sleep_sub ?? 0) - (prevSnapshot.sleep_sub ?? 0) : null,
    blood: snapshot && prevSnapshot.blood_sub != null ? (snapshot.blood_sub ?? 0) - (prevSnapshot.blood_sub ?? 0) : null,
    oral:  snapshot && prevSnapshot.oral_sub  != null ? (snapshot.oral_sub  ?? 0) - (prevSnapshot.oral_sub  ?? 0) : null,
  } : undefined

  // Extract Peaq Age V5 breakdown from snapshot (written by dual-write in recalculate.ts)
  const peaqAgeBreakdown = snapshot?.peaq_age_breakdown as Record<string, unknown> | null

  // Derive positive signals ("what's working") for the right rail
  const { derivePositiveSignalsKeyed } = await import("../../lib/positiveSignals")
  const positiveSignals = derivePositiveSignalsKeyed({
    oral: props.oralData ? { shannonDiversity: props.oralData.shannonDiversity, nitrateReducersPct: props.oralData.nitrateReducersPct, species: props.oralData.species } : null,
    blood: props.bloodData ? { hsCRP: props.bloodData.hsCRP, ldl: props.bloodData.ldl, vitaminD: props.bloodData.vitaminD } : null,
    sleep: props.sleepData ? { deepPct: props.sleepData.deepPct, remPct: props.sleepData.remPct, hrv: props.sleepData.hrv } : null,
    snapshot: snapshot as Record<string, number | null> | null,
    chronoAge: (peaqAgeBreakdown?.chronoAge as number | undefined) ?? null,
    peaqAgeBreakdown,
  })

  // Derive plan items from marker statuses (deterministic, global)
  const { generatePlanItems, deriveMarkerStatuses } = await import("../../lib/planItems")
  const markerStatuses = deriveMarkerStatuses({
    lab: lab as Record<string, unknown> | null,
    oral: oral as Record<string, unknown> | null,
    snapshot: snapshot as Record<string, unknown> | null,
    sleepNights: (sleepNights ?? []) as Array<Record<string, unknown>>,
    lifestyle: lifestyle as Record<string, unknown> | null,
  })
  const generatedPlanItems = generatePlanItems(markerStatuses)

  // Derive top 3 cross-panel signals for the CrossPanelCard (replaces Peaq Age + Insight cards)
  const hrvMedian = snapshot?.hrv_rmssd_median as number | null
  const hrvPct = snapshot?.hrv_percentile as number | null
  const hrvStatus = snapshot?.hrv_status as string | null
  const nitratePct = oral?.nitrate_reducers_pct ? (oral.nitrate_reducers_pct as number) * 100 : null
  const shannon = oral?.shannon_diversity as number | null

  type Sig = { dot: "red" | "amber" | "green"; title: string; desc: string; link?: string }
  const reds: Sig[] = []
  const ambers: Sig[] = []
  const greens: Sig[] = []

  // Red — LDL + oral convergence
  if (markerStatuses.ldl_status === "red" && markerStatuses.harmful_bacteria_status !== "optimal" && markerStatuses.harmful_bacteria_status !== "good") {
    reds.push({
      dot: "red",
      title: "LDL and oral bacteria flagging the same pathway",
      desc: "Your cholesterol and oral panel are pointing at cardiovascular strain from two independent directions.",
      link: "/dashboard/blood/ldl",
    })
  } else if (markerStatuses.ldl_status === "red") {
    reds.push({
      dot: "red",
      title: "LDL cholesterol needs attention",
      desc: "Your cholesterol is above the optimal range — worth discussing at your next appointment.",
      link: "/dashboard/blood/ldl",
    })
  }

  // Amber — HRV low/moderate
  if (hrvStatus === "low" || hrvStatus === "moderate") {
    const ctx = (hrvMedian && hrvPct)
      ? `${hrvMedian} ms · ${hrvPct}th percentile for your age. Sleep consistency is the most direct lever.`
      : "Recovery capacity is running lower than expected. Sleep consistency is the most direct lever."
    ambers.push({
      dot: "amber",
      title: "HRV low — recovery under pressure",
      desc: ctx,
      link: "/dashboard/sleep/recovery_hrv",
    })
  }

  // Amber — hs-CRP missing (blocks full inflammatory picture)
  if (markerStatuses.hs_crp_status === "missing") {
    ambers.push({
      dot: "amber",
      title: "Inflammation marker not yet measured",
      desc: "hs-CRP is missing from your blood panel — it's the key input for your full inflammatory picture.",
      link: "/dashboard/blood/hs_crp",
    })
  }

  // Amber — glucose
  if (markerStatuses.glucose_status === "amber" || markerStatuses.glucose_status === "red") {
    ambers.push({
      dot: "amber",
      title: "Blood sugar in the watch range",
      desc: "Fasting glucose is above optimal — oral bacteria and sleep are both connected to this signal.",
      link: "/dashboard/blood/glucose",
    })
  }

  // Green — good bacteria (raw abundance matches dashboard dot)
  if (nitratePct != null && nitratePct >= 15) {
    greens.push({
      dot: "green",
      title: "Nitric oxide pathway active",
      desc: "Nitrate-reducing bacteria are strong — blood pressure and metabolic support working.",
      link: "/dashboard/oral/good_bacteria",
    })
  }
  // Green — diversity
  if (shannon != null && shannon >= 3.5 && greens.length === 0) {
    greens.push({
      dot: "green",
      title: "Oral diversity in healthy range",
      desc: "A diverse oral microbiome keeps harmful species in check and supports systemic immune balance.",
      link: "/dashboard/oral/diversity",
    })
  }

  const crossPanelSignals = [
    ...reds.slice(0, 2),
    ...ambers.slice(0, 1),
    ...greens.slice(0, 1),
  ].slice(0, 3)

  const panelsActive = {
    oral: !!oral,
    blood: !!lab,
    sleep: (sleepNights ?? []).length >= 3,
  }

  return <DashboardClient
    {...props}
    labHistory={labHistoryRows ?? []}
    wearableNeedsReconnect={wearableNeedsReconnect}
    firstName={(profile?.first_name as string | null) ?? undefined}
    latestSleepDate={latestSleepDate}
    trendDeltas={trendDeltas}
    peaqAgeBreakdown={peaqAgeBreakdown}
    cachedInsight={snapshot?.ai_insight_headline ? {
      headline: snapshot.ai_insight_headline as string,
      body: (snapshot.ai_insight_body as string | null) ?? "",
    } : undefined}
    cachedGuidance={(snapshot?.ai_guidance_items as Array<{ title: string; timing: string; why?: string }>) ?? undefined}
    articles={(articlesData ?? []).map(a => ({ slug: a.slug as string, title: a.title as string, readTime: a.read_time_min as number }))}
    positiveSignals={positiveSignals}
    generatedPlanItems={generatedPlanItems}
    crossPanelSignals={crossPanelSignals}
    snapshotUpdatedAt={(snapshot?.calculated_at as string | null) ?? null}
    panelsActive={panelsActive}
  />
}

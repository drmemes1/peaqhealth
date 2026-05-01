import type { SupabaseClient } from "@supabase/supabase-js"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SleepNight {
  date: string
  source: string
  total_sleep_minutes: number
  deep_sleep_minutes: number
  rem_sleep_minutes: number
  sleep_efficiency: number
  hrv_rmssd: number | null
  spo2: number | null
}

export interface SleepAverages {
  trackedNights: number
  provider: string
  avgHrv: number
  avgEfficiency: number
  avgDeepPct: number
  avgRemPct: number
  avgSpo2: number
  avgTotalHours: number
  lastSyncDate: string | null
}

export interface ReportModifier {
  id: string
  panels: string[]
  direction: "penalty" | "bonus"
  points: number
  label: string
  rationale: string
}

export interface ReportData {
  // Patient
  fullName: string
  email: string
  // Score (legacy)
  score: number
  baseScore: number
  sleepSub: number
  bloodSub: number
  oralSub: number
  modifierTotal: number
  modifiersApplied: ReportModifier[]
  engineVersion: string
  calculatedAt: string
  // Oravi Age V5
  peaqAge: number | null
  peaqAgeDelta: number | null
  peaqAgeBand: string | null
  peaqAgeBreakdown: Record<string, unknown> | null
  // Blood
  labs: Record<string, unknown> | null
  labName: string | null
  collectionDate: string | null
  // Sleep
  sleepAverages: SleepAverages
  // Oral
  shannonDiversity: number | null
  nitrateReducerPct: number | null
  periodontopathogenPct: number | null
  osaTaxaPct: number | null
  neuroSignalPct: number | null
  metabolicSignalPct: number | null
  proliferativeSignalPct: number | null
  rawOtu: Record<string, number> | null
  reportDate: string | null
  oralScoreSnapshot: unknown | null
  // Lifestyle
  ageRange: string | null
  exerciseLevel: string | null
  smokingStatus: string | null
  brushingFreq: string | null
  flossingFreq: string | null
  mouthwashType: string | null
  lastDentalVisit: string | null
  knownHypertension: boolean | null
  knownDiabetes: boolean | null
}

// ─── Sleep helpers ────────────────────────────────────────────────────────────

const PROVIDER_PRIORITY: Record<string, number> = { whoop: 0, oura: 1, garmin: 2 }

export function computeSleepAverages(nights: SleepNight[]): SleepAverages {
  if (nights.length === 0) {
    return {
      trackedNights: 0, provider: "", avgHrv: 0, avgEfficiency: 0,
      avgDeepPct: 0, avgRemPct: 0, avgSpo2: 0, avgTotalHours: 0, lastSyncDate: null,
    }
  }

  // Deduplicate by date, prefer higher-priority provider
  const bestByDate = new Map<string, SleepNight>()
  for (const n of nights) {
    const existing = bestByDate.get(n.date)
    const p = PROVIDER_PRIORITY[n.source] ?? 99
    const ep = existing ? (PROVIDER_PRIORITY[existing.source] ?? 99) : Infinity
    if (p < ep) bestByDate.set(n.date, n)
  }

  const best = Array.from(bestByDate.values()).sort((a, b) => b.date.localeCompare(a.date))
  const getWeight = (i: number) => i < 7 ? 3 : i < 14 ? 2 : 1

  const wavg = (vals: (number | null)[]): number => {
    let sum = 0, tot = 0
    vals.forEach((v, i) => {
      if (v !== null && !isNaN(Number(v)) && Number(v) !== 0) {
        const w = getWeight(i)
        sum += Number(v) * w
        tot += w
      }
    })
    return tot > 0 ? Math.round((sum / tot) * 10) / 10 : 0
  }

  const avgDeepPct = wavg(best.map(n =>
    n.total_sleep_minutes > 0 ? (n.deep_sleep_minutes / n.total_sleep_minutes) * 100 : null
  ))
  const avgRemPct = wavg(best.map(n =>
    n.total_sleep_minutes > 0 ? (n.rem_sleep_minutes / n.total_sleep_minutes) * 100 : null
  ))
  const avgTotalHours = wavg(best.map(n =>
    n.total_sleep_minutes > 0 ? n.total_sleep_minutes / 60 : null
  ))

  // Dominant provider
  const providerCounts: Record<string, number> = {}
  for (const n of best) providerCounts[n.source] = (providerCounts[n.source] ?? 0) + 1
  const provider = Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""

  return {
    trackedNights: best.length,
    provider,
    avgHrv: wavg(best.map(n => n.hrv_rmssd)),
    avgEfficiency: wavg(best.map(n => n.sleep_efficiency)),
    avgDeepPct,
    avgRemPct,
    avgSpo2: wavg(best.map(n => n.spo2)),
    avgTotalHours,
    lastSyncDate: best[0]?.date ?? null,
  }
}

// ─── Data fetcher ─────────────────────────────────────────────────────────────

export async function fetchReportData(userId: string, supabase: SupabaseClient): Promise<ReportData> {
  const [
    { data: profile },
    { data: snapshot },
    { data: labs },
    { data: sleepNights },
    { data: oral },
    { data: lifestyle },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", userId)
      .single(),

    supabase
      .from("score_snapshots")
      .select("score, base_score, sleep_sub, blood_sub, oral_sub, modifier_total, modifiers_applied, engine_version, calculated_at, peaq_age, peaq_age_delta, peaq_age_band, peaq_age_breakdown")
      .eq("user_id", userId)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("blood_results")
      .select("*")
      .eq("user_id", userId)
      
      .order("collected_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("sleep_data")
      .select("date, source, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, sleep_efficiency, hrv_rmssd, spo2")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(30),

    supabase
      .from("oral_kit_orders")
      .select("oral_score_snapshot, shannon_diversity, nitrate_reducers_pct, periodontopathogen_pct, osa_taxa_pct, neuro_signal_pct, metabolic_signal_pct, proliferative_signal_pct, raw_otu_table, report_date")
      .eq("user_id", userId)
      .in("status", ["results_ready", "scored"])
      .order("ordered_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("lifestyle_records")
      .select("age_range, exercise_level, smoking_status, brushing_freq, flossing_freq, mouthwash_type, last_dental_visit, known_hypertension, known_diabetes")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const firstName = (profile?.first_name as string | null) ?? ""
  const lastName = (profile?.last_name as string | null) ?? ""

  return {
    fullName: [firstName, lastName].filter(Boolean).join(" ").trim() || "Patient",
    email: (profile?.email as string | null) ?? "",

    score: Number(snapshot?.score ?? 0),
    baseScore: Number(snapshot?.base_score ?? 0),
    sleepSub: Number(snapshot?.sleep_sub ?? 0),
    bloodSub: Number(snapshot?.blood_sub ?? 0),
    oralSub: Number(snapshot?.oral_sub ?? 0),
    modifierTotal: Number(snapshot?.modifier_total ?? 0),
    modifiersApplied: (snapshot?.modifiers_applied as ReportModifier[] | null) ?? [],
    engineVersion: (snapshot?.engine_version as string | null) ?? "",
    calculatedAt: (snapshot?.calculated_at as string | null) ?? "",
    peaqAge: snapshot?.peaq_age as number | null ?? null,
    peaqAgeDelta: snapshot?.peaq_age_delta as number | null ?? null,
    peaqAgeBand: snapshot?.peaq_age_band as string | null ?? null,
    peaqAgeBreakdown: snapshot?.peaq_age_breakdown as Record<string, unknown> | null ?? null,

    labs: labs as Record<string, unknown> | null,
    labName: (labs?.lab_name as string | null) ?? null,
    collectionDate: (labs?.collection_date as string | null) ?? null,

    sleepAverages: computeSleepAverages((sleepNights ?? []) as SleepNight[]),

    shannonDiversity: (oral?.shannon_diversity as number | null) ?? null,
    nitrateReducerPct: (oral?.nitrate_reducers_pct as number | null) ?? null,
    periodontopathogenPct: (oral?.periodontopathogen_pct as number | null) ?? null,
    osaTaxaPct: (oral?.osa_taxa_pct as number | null) ?? null,
    neuroSignalPct: (oral?.neuro_signal_pct as number | null) ?? null,
    metabolicSignalPct: (oral?.metabolic_signal_pct as number | null) ?? null,
    proliferativeSignalPct: (oral?.proliferative_signal_pct as number | null) ?? null,
    rawOtu: (oral?.raw_otu_table as Record<string, number> | null) ?? null,
    reportDate: (oral?.report_date as string | null) ?? null,
    oralScoreSnapshot: oral?.oral_score_snapshot ?? null,

    ageRange: (lifestyle?.age_range as string | null) ?? null,
    exerciseLevel: (lifestyle?.exercise_level as string | null) ?? null,
    smokingStatus: (lifestyle?.smoking_status as string | null) ?? null,
    brushingFreq: (lifestyle?.brushing_freq as string | null) ?? null,
    flossingFreq: (lifestyle?.flossing_freq as string | null) ?? null,
    mouthwashType: (lifestyle?.mouthwash_type as string | null) ?? null,
    lastDentalVisit: (lifestyle?.last_dental_visit as string | null) ?? null,
    knownHypertension: (lifestyle?.known_hypertension as boolean | null) ?? null,
    knownDiabetes: (lifestyle?.known_diabetes as boolean | null) ?? null,
  }
}

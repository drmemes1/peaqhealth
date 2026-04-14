import type { ConnectionInput } from "@peaq/score-engine"

export function buildConnectionInput(opts: {
  age?: number
  sex?: string | null
  lab?: Record<string, unknown> | null
  oral?: Record<string, unknown> | null
  sleepNights?: Array<Record<string, unknown>> | null
  lifestyle?: Record<string, unknown> | null
  snapshot?: Record<string, unknown> | null
  wearableNights?: number
}): ConnectionInput {
  const { lab, oral, sleepNights, lifestyle, snapshot } = opts
  const breakdown = (snapshot?.peaq_age_breakdown ?? snapshot) as Record<string, unknown> | null

  const age = opts.age ?? 35
  const sex = (opts.sex === "female" ? "female" : opts.sex === "male" ? "male" : null) as "male" | "female" | null

  const rawOtu = (oral?.raw_otu_table ?? null) as Record<string, number> | null
  const sp = (key: string) => rawOtu ? (rawOtu[key] ?? 0) * 100 : null
  const genus = (prefix: string) => {
    if (!rawOtu) return null
    return Object.entries(rawOtu)
      .filter(([k]) => k.toLowerCase().startsWith(prefix.toLowerCase()))
      .reduce((sum, [, v]) => sum + v, 0) * 100
  }

  const oralResultsDate = oral?.results_date as string | null ?? oral?.report_date as string | null
  const oralDaysSince = oralResultsDate
    ? Math.floor((Date.now() - new Date(oralResultsDate).getTime()) / 86400000)
    : null

  const labDate = lab?.collection_date as string | null
  const bloodDaysSince = labDate
    ? Math.floor((Date.now() - new Date(labDate).getTime()) / 86400000)
    : null

  const nights = (sleepNights ?? []) as Array<Record<string, unknown>>
  const nightCount = nights.length
  const avg = (key: string): number | null => {
    const vals = nights.map(n => Number(n[key])).filter(v => !isNaN(v) && v > 0)
    return vals.length >= 3 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  const hrvNights = nights.filter(n => Number(n.hrv_rmssd) > 0).length

  return {
    age,
    sex,

    neisseria_pct: sp("Neisseria subflava") !== null && sp("Neisseria flavescens") !== null
      ? (sp("Neisseria subflava")! + sp("Neisseria flavescens")!) : sp("Neisseria subflava"),
    porphyromonas_pct: sp("Porphyromonas gingivalis"),
    fusobacterium_pct: genus("Fusobacterium"),
    peptostreptococcus_pct: genus("Peptostreptococcus"),
    p_melaninogenica_pct: sp("Prevotella melaninogenica"),
    veillonella_pct: genus("Veillonella"),
    strep_mutans_pct: sp("Streptococcus mutans"),
    solobacterium_pct: sp("Solobacterium moorei"),
    protective_pct: breakdown?.omaPct as number | null ?? null,
    pathogen_inv_pct: null,
    shannon_pct: null,
    oma_pct: breakdown?.omaPct as number | null ?? null,
    oral_days_since_test: oralDaysSince,

    ldl: (lab?.ldl_mgdl as number | null) ?? null,
    hs_crp: (lab?.hs_crp_mgl as number | null) ?? null,
    hba1c: (lab?.hba1c_pct as number | null) ?? null,
    glucose: (lab?.glucose_mgdl as number | null) ?? null,
    lpa: lab?.lpa_mgdl ? (lab.lpa_mgdl as number) * 2.5 : null,
    vitamin_d: (lab?.vitamin_d_ngml as number | null) ?? null,
    mpv: null,
    wbc: (lab?.wbc_kul as number | null) ?? null,
    rdw: (lab?.rdw_pct as number | null) ?? null,
    pheno_age: (snapshot?.pheno_age as number | null) ?? (breakdown?.phenoAge as number | null) ?? null,
    blood_days_since_draw: bloodDaysSince,

    rhr_avg: avg("resting_heart_rate"),
    rhr_expected: breakdown?.rhrExpected as number | null ?? null,
    hrv_rmssd_avg: avg("hrv_rmssd"),
    hrv_nights: hrvNights > 0 ? hrvNights : null,
    hrv_percentile: null,
    deep_sleep_min: avg("deep_sleep_minutes"),
    rem_min: avg("rem_sleep_minutes"),
    sleep_duration_hrs: (() => { const m = avg("total_sleep_minutes"); return m !== null ? m / 60 : null })(),
    sleep_efficiency_pct: avg("sleep_efficiency"),
    sleep_regularity_sd: null,
    wearable_nights: opts.wearableNights ?? (nightCount > 0 ? nightCount : null),

    mouthwash_type: (lifestyle?.mouthwash_type as string | null) ?? null,
    nasal_obstruction: lifestyle?.nasal_obstruction ? (lifestyle.nasal_obstruction as string) !== "never" : null,
    sinus_history: (lifestyle?.sinus_history as string | null) ?? null,
    known_conditions: [],

    oma_pct_prev: null,
    pheno_age_prev: null,
    hs_crp_prev: null,
    rhr_avg_prev: null,
    sleep_duration_prev: null,
  }
}

/**
 * Upper Airway v1 pipeline runner.
 *
 * Glues a persisted oral_kit_orders row + lifestyle_records row + user
 * profile to the pure algorithm at lib/oral/upper-airway-v1.ts.
 *
 *   1. Build UpperAirwayInput from kit + lifestyle + profile rows.
 *   2. Translate UpperAirwayResult into the column update payload.
 *
 * Soft-fail: on error, log and return null so the pipeline continues.
 */

import { calculateUpperAirway, type UpperAirwayInput, type UpperAirwayResult } from "./upper-airway-v1"

const num = (v: unknown): number => {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const numOrNull = (v: unknown): number | null => {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null
}

function boolOrNull(v: unknown): boolean | null {
  if (v === true || v === false) return v
  return null
}

function ageFromDob(dob: unknown): number | null {
  if (typeof dob !== "string") return null
  const d = new Date(dob)
  if (Number.isNaN(d.valueOf())) return null
  const ms = Date.now() - d.valueOf()
  const years = ms / (365.25 * 86400000)
  return Math.floor(years)
}

export function inputFromRows(
  kitRow: Record<string, unknown>,
  lifestyle: Record<string, unknown> | null,
  profile: Record<string, unknown> | null,
): UpperAirwayInput {
  // Rothia + Actinomyces totals: parser writes residual rothia_pct +
  // species columns (rothia_dentocariosa_pct, rothia_aeria_pct). For
  // Actinomyces, parser writes only the genus column (which already
  // includes naeslundii placeholders / non-mapped Actinomyces species).
  // Per nr-v1-runner convention, sum residuals for the total.
  const rothiaTotal =
    num(kitRow.rothia_pct) +
    num(kitRow.rothia_dentocariosa_pct) +
    num(kitRow.rothia_aeria_pct)
  const actinomycesTotal =
    num(kitRow.actinomyces_pct) +
    num(kitRow.a_naeslundii_pct)

  // Prevotella + Alloprevotella combined for the OSA "depleted" feature.
  // Sum genus-level Prevotella + species-level + alloprevotella_total.
  const prevotellaCombined =
    num(kitRow.prevotella_intermedia_pct) +
    num(kitRow.prevotella_commensal_pct) +
    num(kitRow.p_denticola_pct) +
    num(kitRow.prevotella_nigrescens_pct) +
    num(kitRow.prevotella_melaninogenica_pct) +
    num(kitRow.alloprevotella_total_pct)

  const ageYears =
    ageFromDob(profile?.date_of_birth) ??
    (typeof lifestyle?.age_range === "string"
      ? ({ "18_29": 25, "30_39": 35, "40_49": 45, "50_59": 55, "60_69": 65, "70_plus": 72 } as Record<string, number>)[
          lifestyle.age_range as string
        ] ?? null
      : null)

  const sex = strOrNull(lifestyle?.biological_sex)
  const biological_sex: UpperAirwayInput["biological_sex"] =
    sex === "male" || sex === "female" || sex === "other" ? sex : null

  return {
    rothia_total_pct: rothiaTotal,
    actinomyces_total_pct: actinomycesTotal,
    neisseria_pct: num(kitRow.neisseria_pct),
    prevotella_combined_pct: prevotellaCombined,
    shannon_diversity: numOrNull(kitRow.shannon_diversity),

    snoring_reported: strOrNull(lifestyle?.snoring_reported),
    non_restorative_sleep: strOrNull(lifestyle?.non_restorative_sleep),
    osa_witnessed: strOrNull(lifestyle?.osa_witnessed),
    hypertension_dx: boolOrNull(lifestyle?.hypertension_dx),
    age_years: ageYears,
    biological_sex,

    nasal_obstruction: strOrNull(lifestyle?.nasal_obstruction),
    mouth_breathing_confirm: strOrNull(lifestyle?.mouth_breathing_confirm),
    sinus_history: strOrNull(lifestyle?.sinus_history),

    whitening_tray_last_48h: boolOrNull(kitRow.whitening_tray_last_48h),
    whitening_strips_last_48h: boolOrNull(kitRow.whitening_strips_last_48h),
    professional_whitening_last_7d: boolOrNull(kitRow.professional_whitening_last_7d),
    whitening_toothpaste_daily: boolOrNull(kitRow.whitening_toothpaste_daily),
    peroxide_mouthwash_daily: boolOrNull(kitRow.peroxide_mouthwash_daily),
    env_peroxide_flag: boolOrNull(kitRow.env_peroxide_flag),
  }
}

export interface UpperAirwayV1Update {
  upper_airway_tier: string
  bacterial_osa_features_count: number
  bacterial_osa_features: UpperAirwayResult["bacterial"]
  stop_score: number
  stop_total_score: number
  nasal_obstruction_score: number
  nasal_obstruction_category: string
  upper_airway_routing: UpperAirwayResult["routing"]
  upper_airway_peroxide_severity: string
  upper_airway_v1_breakdown: {
    stop_questionnaire: UpperAirwayResult["stop_questionnaire"]
    nasal_obstruction: UpperAirwayResult["nasal_obstruction"]
    peroxide_confounder: UpperAirwayResult["peroxide_confounder"]
    reliability_flags: string[]
  }
  upper_airway_v1_computed_at: string
}

export function v1UpdateFromResult(result: UpperAirwayResult): UpperAirwayV1Update {
  return {
    upper_airway_tier: result.tier,
    bacterial_osa_features_count: result.bacterial.features_present,
    bacterial_osa_features: result.bacterial,
    stop_score: result.stop_questionnaire.stop_score,
    stop_total_score: result.stop_questionnaire.total_score,
    nasal_obstruction_score: result.nasal_obstruction.score,
    nasal_obstruction_category: result.nasal_obstruction.category,
    upper_airway_routing: result.routing,
    upper_airway_peroxide_severity: result.peroxide_confounder.severity,
    upper_airway_v1_breakdown: {
      stop_questionnaire: result.stop_questionnaire,
      nasal_obstruction: result.nasal_obstruction,
      peroxide_confounder: result.peroxide_confounder,
      reliability_flags: result.reliability_flags,
    },
    upper_airway_v1_computed_at: new Date().toISOString(),
  }
}

export function runUpperAirway(
  kitRow: Record<string, unknown>,
  lifestyleRow: Record<string, unknown> | null,
  profileRow: Record<string, unknown> | null,
): { update: UpperAirwayV1Update; result: UpperAirwayResult } | null {
  try {
    const input = inputFromRows(kitRow, lifestyleRow, profileRow)
    const result = calculateUpperAirway(input)
    return { update: v1UpdateFromResult(result), result }
  } catch (err) {
    console.error("[upper-airway-v1] runner failed:", err)
    return null
  }
}

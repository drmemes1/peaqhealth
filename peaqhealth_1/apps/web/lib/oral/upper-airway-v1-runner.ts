/**
 * Upper Airway v1 pipeline runner.
 *
 * Reads species data via the shared species-parser
 * (`raw_otu_table.__meta.entries` is the authoritative source); reads
 * STOP questionnaire from lifestyle row + age/sex from profile.
 * Translates the algorithm result into a column update payload.
 *
 * Direct species-column reads are forbidden in this file via ESLint
 * `no-restricted-syntax` rule. Add new species to SpeciesProfile in
 * species-parser.ts; never read kitRow.x_pct here.
 */
import {
  calculateUpperAirway,
  type UpperAirwayInput,
  type UpperAirwayResult,
} from "./upper-airway-v1"
import { parseSpeciesFromKitRow, type SpeciesProfile } from "./species-parser"

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
  return Math.floor((Date.now() - d.valueOf()) / (365.25 * 86400000))
}

export function inputFromProfile(
  species: SpeciesProfile,
  lifestyle: Record<string, unknown> | null,
  profile: Record<string, unknown> | null,
): UpperAirwayInput {
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
    // ── Bacterial inputs — all from species-parser ──
    rothia_total_pct: species.rothia_total_pct,
    actinomyces_total_pct: species.actinomyces_total_pct,
    neisseria_pct: species.neisseria_pct,
    prevotella_combined_pct: species.prevotella_alloprevotella_combined_pct,
    shannon_diversity: species.shannon_diversity,

    // ── Questionnaire ──
    snoring_reported: strOrNull(lifestyle?.snoring_reported),
    non_restorative_sleep: strOrNull(lifestyle?.non_restorative_sleep),
    osa_witnessed: strOrNull(lifestyle?.osa_witnessed),
    hypertension_dx: boolOrNull(lifestyle?.hypertension_dx),
    age_years: ageYears,
    biological_sex,

    // ── Nasal / sinus ──
    nasal_obstruction: strOrNull(lifestyle?.nasal_obstruction),
    mouth_breathing_confirm: strOrNull(lifestyle?.mouth_breathing_confirm),
    sinus_history: strOrNull(lifestyle?.sinus_history),

    // ── Peroxide confounder ──
    whitening_tray_last_48h: species.whitening_tray_last_48h || null,
    whitening_strips_last_48h: species.whitening_strips_last_48h || null,
    professional_whitening_last_7d: species.professional_whitening_last_7d || null,
    whitening_toothpaste_daily: species.whitening_toothpaste_daily || null,
    peroxide_mouthwash_daily: species.peroxide_mouthwash_daily || null,
    env_peroxide_flag: species.env_peroxide_flag || null,
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
    const species = parseSpeciesFromKitRow(kitRow)
    const input = inputFromProfile(species, lifestyleRow, profileRow)
    const result = calculateUpperAirway(input)
    return { update: v1UpdateFromResult(result), result }
  } catch (err) {
    console.error("[upper-airway-v1] runner failed:", err)
    return null
  }
}

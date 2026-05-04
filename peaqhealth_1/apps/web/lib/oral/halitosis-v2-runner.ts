/**
 * Halitosis v2 pipeline runner.
 *
 * Reads species data via the shared species-parser
 * (`raw_otu_table.__meta.entries` is the authoritative source); reads
 * lifestyle from a row + age from profile DOB. Translates the
 * algorithm result into a column update payload.
 *
 * Direct species-column reads are forbidden in this file via ESLint
 * `no-restricted-syntax` rule. If you need a new species, add it to
 * SpeciesProfile in species-parser.ts — never read kitRow.x_pct here.
 */
import {
  calculateHalitosis,
  EMPTY_HALITOSIS_INPUT,
  type HalitosisInput,
  type HalitosisResult,
} from "./halitosis-v2"
import { parseSpeciesFromKitRow, type SpeciesProfile } from "./species-parser"

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null
}

function ageFromDob(dob: unknown): number | null {
  if (typeof dob !== "string") return null
  const d = new Date(dob)
  if (Number.isNaN(d.valueOf())) return null
  return Math.floor((Date.now() - d.valueOf()) / (365.25 * 86400000))
}

const XEROSTOMIC_MED_KEYS = ["antihistamine_daily", "ssri_snri", "anticholinergic"]

function lifestyleFromRow(
  lifestyle: Record<string, unknown> | null,
  profile: Record<string, unknown> | null,
): Pick<
  HalitosisInput,
  | "mouth_breathing"
  | "mouth_breathing_when"
  | "snoring_reported"
  | "smoking_status"
  | "age_years"
  | "gerd_frequency"
  | "tongue_scraping_freq"
  | "last_dental_cleaning"
  | "has_xerostomic_meds"
> {
  const meds = Array.isArray(lifestyle?.medications_v2) ? (lifestyle?.medications_v2 as string[]) : []
  return {
    mouth_breathing: strOrNull(lifestyle?.mouth_breathing),
    mouth_breathing_when: strOrNull(lifestyle?.mouth_breathing_when),
    snoring_reported: strOrNull(lifestyle?.snoring_reported),
    smoking_status: strOrNull(lifestyle?.smoking_status),
    age_years: ageFromDob(profile?.date_of_birth),
    gerd_frequency: strOrNull(lifestyle?.gerd_frequency),
    tongue_scraping_freq: strOrNull(lifestyle?.tongue_scraping_freq),
    last_dental_cleaning: strOrNull(lifestyle?.last_dental_cleaning),
    has_xerostomic_meds: meds.some(m => XEROSTOMIC_MED_KEYS.includes(m)),
  }
}

export function inputFromProfile(
  species: SpeciesProfile,
  lifestyle: Record<string, unknown> | null,
  profile: Record<string, unknown> | null,
): HalitosisInput {
  return {
    ...EMPTY_HALITOSIS_INPUT,

    // Halitosis driver species — all from the shared species-parser,
    // never from kit-row columns.
    f_nucleatum_pct: species.f_nucleatum_pct,
    s_moorei_pct: species.s_moorei_pct,
    veillonella_pct: species.veillonella_total_pct,
    leptotrichia_wadei_pct: species.leptotrichia_wadei_pct,
    atopobium_parvulum_pct: species.atopobium_parvulum_pct,
    selenomonas_total_pct: species.selenomonas_total_pct,
    eubacterium_sulci_pct: species.eubacterium_sulci_pct,
    dialister_invisus_pct: species.dialister_invisus_pct,

    p_gingivalis_pct: species.p_gingivalis_pct,
    prevotella_intermedia_pct: species.prevotella_intermedia_pct,
    prevotella_nigrescens_pct: species.prevotella_nigrescens_pct,
    prevotella_denticola_pct: species.prevotella_denticola_pct,
    prevotella_melaninogenica_pct: species.prevotella_melaninogenica_pct,
    treponema_total_pct: species.treponema_total_pct,
    t_forsythia_pct: species.t_forsythia_pct,
    eikenella_corrodens_pct: species.eikenella_corrodens_pct,

    s_salivarius_pct: species.s_salivarius_pct,
    rothia_total_pct: species.rothia_total_pct,
    haemophilus_pct: species.haemophilus_total_pct,

    caries_compensated_dysbiosis: species.caries_compensated_dysbiosis,
    s_mutans_pct: species.s_mutans_pct,

    ...lifestyleFromRow(lifestyle, profile),

    env_peroxide_flag: species.env_peroxide_flag,
    whitening_tray_last_48h: species.whitening_tray_last_48h,
    whitening_strips_last_48h: species.whitening_strips_last_48h,
    professional_whitening_last_7d: species.professional_whitening_last_7d,
  }
}

export interface HalitosisV2Update {
  halitosis_hmi: number
  halitosis_hmi_category: string
  halitosis_pathway: string
  halitosis_subjective_routing: boolean
  halitosis_h2s_adjusted: number
  halitosis_ch3sh_adjusted: number
  halitosis_protective_modifier: number
  halitosis_lhm: number
  halitosis_peroxide_caveat: boolean
  halitosis_v2_drivers: HalitosisResult["driver_contributions"]
  halitosis_v2_protective: HalitosisResult["protective_contributions"]
  halitosis_v2_lhm_factors: HalitosisResult["lhm_factors"]
  halitosis_v2_reliability_flags: string[] | null
  halitosis_v2_computed_at: string
}

export function v2UpdateFromResult(result: HalitosisResult): HalitosisV2Update {
  return {
    halitosis_hmi: result.hmi,
    halitosis_hmi_category: result.hmi_category,
    halitosis_pathway: result.pathway,
    halitosis_subjective_routing: result.subjective_halitosis_routing,
    halitosis_h2s_adjusted: result.h2s_adjusted,
    halitosis_ch3sh_adjusted: result.ch3sh_adjusted,
    halitosis_protective_modifier: result.protective_modifier,
    halitosis_lhm: result.lhm,
    halitosis_peroxide_caveat: result.peroxide_confounder_caveat,
    halitosis_v2_drivers: result.driver_contributions,
    halitosis_v2_protective: result.protective_contributions,
    halitosis_v2_lhm_factors: result.lhm_factors,
    halitosis_v2_reliability_flags:
      result.reliability_flags.length > 0 ? result.reliability_flags : null,
    halitosis_v2_computed_at: new Date().toISOString(),
  }
}

export function runHalitosisV2(
  kitRow: Record<string, unknown>,
  lifestyleRow: Record<string, unknown> | null,
  profileRow: Record<string, unknown> | null,
): { update: HalitosisV2Update; result: HalitosisResult } | null {
  try {
    const species = parseSpeciesFromKitRow(kitRow)
    const input = inputFromProfile(species, lifestyleRow, profileRow)
    const result = calculateHalitosis(input)
    return { update: v2UpdateFromResult(result), result }
  } catch (err) {
    console.error("[halitosis-v2] runner failed:", err)
    return null
  }
}

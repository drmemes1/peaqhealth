/**
 * Halitosis v2 pipeline runner.
 *
 * Glues kit + lifestyle + profile + caries-v3 outputs to the pure
 * algorithm at lib/oral/halitosis-v2.ts. Mirrors the perio / NR runners.
 */
import {
  calculateHalitosis,
  EMPTY_HALITOSIS_INPUT,
  type HalitosisInput,
  type HalitosisResult,
} from "./halitosis-v2"

const num = (v: unknown): number => {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

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

export function inputFromRows(
  kitRow: Record<string, unknown>,
  lifestyle: Record<string, unknown> | null,
  profile: Record<string, unknown> | null,
): HalitosisInput {
  // Rothia + Haemophilus genus totals: parser writes residual rothia_pct
  // alongside species columns; haemophilus_pct already aggregates everything.
  const rothiaTotal =
    num(kitRow.rothia_pct) +
    num(kitRow.rothia_dentocariosa_pct) +
    num(kitRow.rothia_aeria_pct)

  // Treponema is genus-level by design (V3-V4 limit on T. denticola).
  const treponemaTotal = num(kitRow.treponema_pct)

  // Caries v3 cross-module signal — used for Veillonella weight.
  const cariesCompensatedDysbiosis = kitRow.compensated_dysbiosis_flag === true
  const sMutans = num(kitRow.s_mutans_pct)

  const meds = Array.isArray(lifestyle?.medications_v2) ? (lifestyle?.medications_v2 as string[]) : []
  const hasXerostomicMeds = meds.some(m => XEROSTOMIC_MED_KEYS.includes(m))

  return {
    ...EMPTY_HALITOSIS_INPUT,

    // H2S drivers
    f_nucleatum_pct: num(kitRow.f_nucleatum_pct),
    s_moorei_pct: num(kitRow.s_moorei_pct),
    veillonella_pct: num(kitRow.veillonella_pct),
    leptotrichia_wadei_pct: num(kitRow.leptotrichia_wadei_pct),
    atopobium_parvulum_pct: num(kitRow.atopobium_parvulum_pct),
    selenomonas_total_pct: num(kitRow.selenomonas_total_pct),
    eubacterium_sulci_pct: num(kitRow.eubacterium_sulci_pct),
    dialister_invisus_pct: num(kitRow.dialister_invisus_pct),

    // CH3SH drivers
    p_gingivalis_pct: num(kitRow.p_gingivalis_pct),
    prevotella_intermedia_pct: num(kitRow.prevotella_intermedia_pct),
    prevotella_nigrescens_pct: num(kitRow.prevotella_nigrescens_pct),
    prevotella_denticola_pct: num(kitRow.p_denticola_pct),
    prevotella_melaninogenica_pct: num(kitRow.prevotella_melaninogenica_pct),
    treponema_total_pct: treponemaTotal,
    t_forsythia_pct: num(kitRow.tannerella_pct),
    eikenella_corrodens_pct: num(kitRow.eikenella_corrodens_pct),

    // Protective
    s_salivarius_pct: num(kitRow.s_salivarius_pct),
    rothia_total_pct: rothiaTotal,
    haemophilus_pct: num(kitRow.haemophilus_pct),

    // Cross-module
    caries_compensated_dysbiosis: cariesCompensatedDysbiosis,
    s_mutans_pct: sMutans,

    // Lifestyle
    mouth_breathing: strOrNull(lifestyle?.mouth_breathing),
    mouth_breathing_when: strOrNull(lifestyle?.mouth_breathing_when),
    snoring_reported: strOrNull(lifestyle?.snoring_reported),
    smoking_status: strOrNull(lifestyle?.smoking_status),
    age_years: ageFromDob(profile?.date_of_birth),
    gerd_frequency: strOrNull(lifestyle?.gerd_frequency),
    tongue_scraping_freq: strOrNull(lifestyle?.tongue_scraping_freq),
    last_dental_cleaning: strOrNull(lifestyle?.last_dental_cleaning),
    has_xerostomic_meds: hasXerostomicMeds,

    // Peroxide confounder
    env_peroxide_flag: kitRow.env_peroxide_flag === true,
    whitening_tray_last_48h: kitRow.whitening_tray_last_48h === true,
    whitening_strips_last_48h: kitRow.whitening_strips_last_48h === true,
    professional_whitening_last_7d: kitRow.professional_whitening_last_7d === true,
  }
}

export interface HalitosisV2Update {
  halitosis_hmi: number
  halitosis_hmi_category: string
  // v2.5: phenotype deprecated; pathway is the primary diagnostic field.
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
    const input = inputFromRows(kitRow, lifestyleRow, profileRow)
    const result = calculateHalitosis(input)
    return { update: v2UpdateFromResult(result), result }
  } catch (err) {
    console.error("[halitosis-v2] runner failed:", err)
    return null
  }
}

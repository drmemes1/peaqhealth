/**
 * Periodontal Burden v1.2 — third evidence-driven oral scoring module.
 *
 * Two-axis architecture mirroring caries v3 + NR-α:
 *   • PBI (Periodontal Burden Index)  — tiered weighted pathogen sum
 *   • PDI (Periodontal Defense Index) — tiered weighted commensal sum
 *
 * Composite Risk Category is a 4-quadrant synthesis (plus borderline +
 * insufficient_data). The Commensal Depletion Modifier (CDM) amplifies
 * PBI when PDI is depleted, and its contribution is surfaced as a
 * separate breakdown line item per the audit-forward design rule —
 * UI never displays a fully-folded score without showing what the
 * modifier did.
 *
 * Red complex presence is a UI flag, not a score change, because
 * trace-level V3-V4 16S calls aren't clinically reliable at the levels
 * a categorical bonus would require. See ADR-0023.
 *
 * Versioning rule: weights are detection-limit aware. Treponema (0.8),
 * Fretibacterium / Mogibacterium (Tier 3, 0.3) reflect V3-V4 limits.
 * When sequencing platform supports V1-V3 amplicon or shotgun
 * metagenomics with reliable detection, those weights scale up.
 */

export type PerioBurdenCategory =
  | "minimal"
  | "low"
  | "moderate"
  | "high"
  | "severe"

export type PerioDefenseCategory =
  | "severely_depleted"
  | "depleted"
  | "adequate"
  | "robust"

export type PerioRiskCategory =
  | "stable_low_risk"
  | "compensated_active_burden"
  | "compensated_dysbiosis_risk"
  | "active_disease_risk"
  | "borderline"
  | "insufficient_data"

export type RedComplexStatusLabel =
  | "not_detected"
  | "below_clinical_threshold"
  | "detected"

export interface PerioBurdenSpeciesAbundances {
  // Tier 1 pathogens
  p_gingivalis: number
  t_forsythia: number
  treponema_total: number       // genus-level due to V3-V4 limitations
  f_alocis: number

  // Tier 2 pathogens
  f_nucleatum: number           // genus or species, whichever the parser provides
  p_intermedia: number
  s_constellatus: number
  p_micra: number

  // Tier 3 emerging (typically 0 with V3-V4)
  m_faucium: number
  fretibacterium: number
  treponema_hmt_237: number

  // Defense Tier 1
  c_matruchotii: number
  s_mitis_group: number         // includes hyphenated mitis-pneumoniae-oralis calls
  s_sanguinis: number
  s_gordonii: number

  // Defense Tier 2
  rothia_total: number
  neisseria_total: number
  h_parainfluenzae: number
  a_naeslundii: number
  lautropia: number
}

export interface PerioBurdenLifestyleConfounders {
  smoking_status: "never" | "former" | "current" | null
  mouthwash_type: "none" | "fluoride" | "antiseptic" | "unknown" | null
  chlorhexidine_use: "never" | "past_8wks" | "currently_using" | null
  age_range: string | null
}

export interface PerioBurdenV1Result {
  perio_burden_index: number
  perio_burden_index_adjusted: number
  perio_burden_category: PerioBurdenCategory

  perio_defense_index: number
  perio_defense_category: PerioDefenseCategory

  total_subp_pct: number

  commensal_depletion_factor: number
  cdm_amplification_pct: number

  perio_risk_category: PerioRiskCategory

  diagnostic_uncertainty_zone: boolean

  red_complex_status: {
    any_detected: boolean
    any_above_clinical_threshold: boolean
    detected_species: string[]
    status_label: RedComplexStatusLabel
  }

  cross_panel_hooks: {
    cardiovascular_pattern_pending: boolean
    neurodegenerative_pattern_pending: boolean
  }

  confidence: "low" | "moderate" | "high"
  reliability_flags: string[]
  confounder_adjustments: Record<string, string>
  narrative_augmentations: string[]

  breakdown: {
    tier1_pathogen_sum: number
    tier2_pathogen_sum: number
    tier3_pathogen_sum: number
    fa_pg_co_occurrence_active: boolean
    pg_td_co_occurrence_active: boolean
    fn_bridging_boost_active: boolean
    stacked_boost_factor: number
    pbi_pre_cdm: number
    cdm_contribution: number
    defense_tier1_sum: number
    defense_tier2_sum: number
  }
}

// ── Constants ────────────────────────────────────────────────────────

export const PATHOGEN_WEIGHTS = {
  p_gingivalis: 1.0,
  t_forsythia: 0.9,
  treponema: 0.8,            // biological 1.0; V3-V4 adjusted
  f_alocis: 0.7,
  f_nucleatum_baseline: 0.5,
  f_nucleatum_bridging: 0.8, // applied when Pg ≥ FN_BRIDGING_PG_THRESHOLD
  p_intermedia: 0.5,
  s_constellatus: 0.4,
  p_micra: 0.4,
  m_faucium: 0.3,
  fretibacterium: 0.3,
  treponema_hmt_237: 0.3,
} as const

export const DEFENSE_WEIGHTS = {
  c_matruchotii: 2.0,
  s_mitis_group: 1.0,
  s_sanguinis: 1.0,
  s_gordonii: 1.0,
  rothia: 0.5,
  neisseria: 0.5,
  h_parainfluenzae: 0.5,
  a_naeslundii: 0.5,
  lautropia: 0.3,
} as const

const FN_BRIDGING_PG_THRESHOLD = 0.5
const COOCCURRENCE_THRESHOLD = 0.1
const COOCCURRENCE_BOOST = 1.2
const STACKED_BOOST_CAP = 1.3

const RED_COMPLEX_DETECTION_FLOOR = 0.01
const RED_COMPLEX_CLINICAL_THRESHOLD = 0.5

const PBI_THRESHOLDS = {
  minimal: 0.5,
  low: 1.5,
  moderate: 3.0,
  high: 6.0,
}

const PDI_THRESHOLDS = {
  severely_depleted: 10,
  depleted: 20,
  adequate: 35,
}

const CDM_BASELINE_PDI = 30
const CDM_MAX_FACTOR = 1.5
const CDM_SLOPE = 0.5

// ── Algorithm ────────────────────────────────────────────────────────

export function calculatePerioBurdenV1(
  species: PerioBurdenSpeciesAbundances,
  lifestyle: PerioBurdenLifestyleConfounders | null,
): PerioBurdenV1Result {
  // Catches hyphenated-call attribution bugs at the boundary — same
  // assertion pattern as NR-α, since both modules pre-aggregate
  // numbers from the parser and a negative value indicates a sign or
  // subtraction error upstream rather than a real input.
  for (const [name, value] of Object.entries(species)) {
    if (value < 0) {
      throw new Error(`perio-burden-v1: negative input ${name}=${value}`)
    }
  }

  // ── Tier sums ─────────────────────────────────────────────────────
  const tier1Sum =
    species.p_gingivalis * PATHOGEN_WEIGHTS.p_gingivalis +
    species.t_forsythia * PATHOGEN_WEIGHTS.t_forsythia +
    species.treponema_total * PATHOGEN_WEIGHTS.treponema +
    species.f_alocis * PATHOGEN_WEIGHTS.f_alocis

  const fnBridgingActive = species.p_gingivalis >= FN_BRIDGING_PG_THRESHOLD
  const fnWeight = fnBridgingActive
    ? PATHOGEN_WEIGHTS.f_nucleatum_bridging
    : PATHOGEN_WEIGHTS.f_nucleatum_baseline

  const tier2Sum =
    species.f_nucleatum * fnWeight +
    species.p_intermedia * PATHOGEN_WEIGHTS.p_intermedia +
    species.s_constellatus * PATHOGEN_WEIGHTS.s_constellatus +
    species.p_micra * PATHOGEN_WEIGHTS.p_micra

  const tier3Sum =
    species.m_faucium * PATHOGEN_WEIGHTS.m_faucium +
    species.fretibacterium * PATHOGEN_WEIGHTS.fretibacterium +
    species.treponema_hmt_237 * PATHOGEN_WEIGHTS.treponema_hmt_237

  // ── Co-occurrence boosts (capped) ─────────────────────────────────
  const faPgActive =
    species.f_alocis >= COOCCURRENCE_THRESHOLD &&
    species.p_gingivalis >= COOCCURRENCE_THRESHOLD

  const pgTdActive =
    species.p_gingivalis >= COOCCURRENCE_THRESHOLD &&
    species.treponema_total >= COOCCURRENCE_THRESHOLD

  let stackedBoost = 1.0
  if (faPgActive) stackedBoost *= COOCCURRENCE_BOOST
  if (pgTdActive) stackedBoost *= COOCCURRENCE_BOOST
  stackedBoost = Math.min(stackedBoost, STACKED_BOOST_CAP)

  const pbiPreCdm = (tier1Sum + tier2Sum + tier3Sum) * stackedBoost

  // ── Defense ───────────────────────────────────────────────────────
  const defenseTier1Sum =
    species.c_matruchotii * DEFENSE_WEIGHTS.c_matruchotii +
    species.s_mitis_group * DEFENSE_WEIGHTS.s_mitis_group +
    species.s_sanguinis * DEFENSE_WEIGHTS.s_sanguinis +
    species.s_gordonii * DEFENSE_WEIGHTS.s_gordonii

  const defenseTier2Sum =
    species.rothia_total * DEFENSE_WEIGHTS.rothia +
    species.neisseria_total * DEFENSE_WEIGHTS.neisseria +
    species.h_parainfluenzae * DEFENSE_WEIGHTS.h_parainfluenzae +
    species.a_naeslundii * DEFENSE_WEIGHTS.a_naeslundii +
    species.lautropia * DEFENSE_WEIGHTS.lautropia

  const perio_defense_index = defenseTier1Sum + defenseTier2Sum

  // ── Commensal Depletion Modifier ──────────────────────────────────
  const cdmFactor = Math.min(
    CDM_MAX_FACTOR,
    Math.max(
      1.0,
      1 + ((CDM_BASELINE_PDI - perio_defense_index) / CDM_BASELINE_PDI) * CDM_SLOPE,
    ),
  )

  const perio_burden_index = pbiPreCdm
  const perio_burden_index_adjusted = pbiPreCdm * cdmFactor
  const cdmContribution = perio_burden_index_adjusted - pbiPreCdm

  // ── SUBP interpretability metric ──────────────────────────────────
  const total_subp_pct =
    species.p_gingivalis +
    species.t_forsythia +
    species.f_alocis +
    species.treponema_total +
    species.f_nucleatum +
    species.p_intermedia +
    species.s_constellatus +
    species.p_micra +
    species.m_faucium +
    species.fretibacterium +
    species.treponema_hmt_237

  // ── Categorization ───────────────────────────────────────────────
  const perio_burden_category: PerioBurdenCategory =
    perio_burden_index_adjusted < PBI_THRESHOLDS.minimal ? "minimal" :
    perio_burden_index_adjusted < PBI_THRESHOLDS.low ? "low" :
    perio_burden_index_adjusted < PBI_THRESHOLDS.moderate ? "moderate" :
    perio_burden_index_adjusted < PBI_THRESHOLDS.high ? "high" :
    "severe"

  const perio_defense_category: PerioDefenseCategory =
    perio_defense_index < PDI_THRESHOLDS.severely_depleted ? "severely_depleted" :
    perio_defense_index < PDI_THRESHOLDS.depleted ? "depleted" :
    perio_defense_index < PDI_THRESHOLDS.adequate ? "adequate" :
    "robust"

  const diagnostic_uncertainty_zone =
    perio_burden_index_adjusted >= PBI_THRESHOLDS.minimal &&
    perio_burden_index_adjusted < PBI_THRESHOLDS.low

  // ── Composite risk ────────────────────────────────────────────────
  const burdenLow = perio_burden_category === "minimal" || perio_burden_category === "low"
  const burdenHigh = perio_burden_category === "high" || perio_burden_category === "severe"
  const defenseAdequate =
    perio_defense_category === "adequate" || perio_defense_category === "robust"
  const defenseDepleted =
    perio_defense_category === "depleted" || perio_defense_category === "severely_depleted"

  let perio_risk_category: PerioRiskCategory
  if (total_subp_pct === 0 && perio_defense_index === 0) {
    perio_risk_category = "insufficient_data"
  } else if (burdenLow && defenseAdequate) {
    perio_risk_category = "stable_low_risk"
  } else if (burdenHigh && defenseAdequate) {
    perio_risk_category = "compensated_active_burden"
  } else if (burdenLow && defenseDepleted) {
    perio_risk_category = "compensated_dysbiosis_risk"
  } else if (burdenHigh && defenseDepleted) {
    perio_risk_category = "active_disease_risk"
  } else {
    perio_risk_category = "borderline"
  }

  // ── Red complex status (UI flag) ──────────────────────────────────
  const detectedSpecies: string[] = []
  const traceTag = (val: number) => (val >= RED_COMPLEX_CLINICAL_THRESHOLD ? "" : " (trace)")
  if (species.p_gingivalis >= RED_COMPLEX_DETECTION_FLOOR) {
    detectedSpecies.push(`P. gingivalis${traceTag(species.p_gingivalis)}`)
  }
  if (species.t_forsythia >= RED_COMPLEX_DETECTION_FLOOR) {
    detectedSpecies.push(`T. forsythia${traceTag(species.t_forsythia)}`)
  }
  if (species.treponema_total >= RED_COMPLEX_DETECTION_FLOOR) {
    detectedSpecies.push(`Treponema (genus)${traceTag(species.treponema_total)}`)
  }

  const anyDetected = detectedSpecies.length > 0
  const anyAboveClinicalThreshold =
    species.p_gingivalis >= RED_COMPLEX_CLINICAL_THRESHOLD ||
    species.t_forsythia >= RED_COMPLEX_CLINICAL_THRESHOLD ||
    species.treponema_total >= RED_COMPLEX_CLINICAL_THRESHOLD

  const statusLabel: RedComplexStatusLabel = !anyDetected
    ? "not_detected"
    : !anyAboveClinicalThreshold
      ? "below_clinical_threshold"
      : "detected"

  const red_complex_status = {
    any_detected: anyDetected,
    any_above_clinical_threshold: anyAboveClinicalThreshold,
    detected_species: detectedSpecies,
    status_label: statusLabel,
  }

  const cross_panel_hooks = {
    cardiovascular_pattern_pending: burdenHigh,
    neurodegenerative_pattern_pending: burdenHigh,
  }

  // ── Confounders ──────────────────────────────────────────────────
  const reliability_flags: string[] = []
  const confounder_adjustments: Record<string, string> = {}

  if (lifestyle) {
    if (lifestyle.smoking_status === "current") {
      reliability_flags.push("active_smoking")
      confounder_adjustments.smoking =
        "Active smoking is the strongest behavioral risk factor for periodontitis. It depletes neutrophil function, reduces gingival blood flow, and accelerates attachment loss. Periodontal burden may be biologically elevated even when bacterial signal is moderate. Cessation produces measurable periodontal improvement within 12 months."
    } else if (lifestyle.smoking_status === "former") {
      confounder_adjustments.smoking =
        "Former smoking — periodontal recovery continues for 5+ years post-cessation but remains incomplete relative to never-smoker baseline."
    }

    if (lifestyle.chlorhexidine_use === "currently_using") {
      reliability_flags.push("chlorhexidine_active")
      confounder_adjustments.chlorhexidine =
        "Chlorhexidine use suppresses subgingival pathogens. Salivary periodontal markers may be artificially reduced — periodontal burden may be underestimated. Recommend retest 8 weeks after discontinuation for accurate baseline."
    }

    if (lifestyle.mouthwash_type === "antiseptic") {
      confounder_adjustments.mouthwash =
        "Daily antiseptic mouthwash use suppresses both pathogens and commensals nonselectively. Both PBI and PDI may be artificially reduced. Switching to fluoride-only rinse may improve interpretability of next test."
    }
  }

  // ── Confidence ───────────────────────────────────────────────────
  const totalSignal = perio_burden_index_adjusted + perio_defense_index
  let confidence: "low" | "moderate" | "high"
  if (totalSignal < 5) {
    confidence = "low"
  } else if (reliability_flags.length > 0) {
    confidence = "low"
  } else if (diagnostic_uncertainty_zone) {
    confidence = "moderate"
  } else if (totalSignal > 30) {
    confidence = "high"
  } else {
    confidence = "moderate"
  }

  // ── Narrative augmentations ──────────────────────────────────────
  const narrative_augmentations: string[] = []
  if (diagnostic_uncertainty_zone) {
    narrative_augmentations.push(
      "Your periodontal burden falls within a zone where saliva-based 16S analysis has reduced discriminative accuracy (Lee 2026 reported AUC 0.736 for distinguishing healthy from Stage I periodontitis). Clinical correlation with periodontal probing is recommended for definitive classification.",
    )
  }
  if (faPgActive) {
    narrative_augmentations.push(
      "F. alocis and P. gingivalis are both elevated. Per Aruni 2011 + Wang 2015, this co-occurrence pattern shows enhanced biofilm formation and epithelial invasion vs either species individually.",
    )
  }
  if (pgTdActive) {
    narrative_augmentations.push(
      "P. gingivalis and Treponema are both elevated. This is the canonical red complex synergy — Pg and Td together drive disease more than either alone (Hajishengallis PSD framework).",
    )
  }

  return {
    perio_burden_index,
    perio_burden_index_adjusted,
    perio_burden_category,
    perio_defense_index,
    perio_defense_category,
    total_subp_pct,
    commensal_depletion_factor: cdmFactor,
    cdm_amplification_pct: (cdmFactor - 1) * 100,
    perio_risk_category,
    diagnostic_uncertainty_zone,
    red_complex_status,
    cross_panel_hooks,
    confidence,
    reliability_flags,
    confounder_adjustments,
    narrative_augmentations,
    breakdown: {
      tier1_pathogen_sum: tier1Sum,
      tier2_pathogen_sum: tier2Sum,
      tier3_pathogen_sum: tier3Sum,
      fa_pg_co_occurrence_active: faPgActive,
      pg_td_co_occurrence_active: pgTdActive,
      fn_bridging_boost_active: fnBridgingActive,
      stacked_boost_factor: stackedBoost,
      pbi_pre_cdm: pbiPreCdm,
      cdm_contribution: cdmContribution,
      defense_tier1_sum: defenseTier1Sum,
      defense_tier2_sum: defenseTier2Sum,
    },
  }
}

/** Empty species — useful for tests + defaults. */
export const EMPTY_PERIO_SPECIES: PerioBurdenSpeciesAbundances = {
  p_gingivalis: 0,
  t_forsythia: 0,
  treponema_total: 0,
  f_alocis: 0,
  f_nucleatum: 0,
  p_intermedia: 0,
  s_constellatus: 0,
  p_micra: 0,
  m_faucium: 0,
  fretibacterium: 0,
  treponema_hmt_237: 0,
  c_matruchotii: 0,
  s_mitis_group: 0,
  s_sanguinis: 0,
  s_gordonii: 0,
  rothia_total: 0,
  neisseria_total: 0,
  h_parainfluenzae: 0,
  a_naeslundii: 0,
  lautropia: 0,
}

/**
 * Oravi caries scoring v3
 * =======================
 *
 * Evidence base: ~50-paper Open Evidence synthesis (April 2026)
 * Validation: 3 pilot samples with known clinical correlation
 *
 * Key changes from v2 (lib/oral/caries-panel.ts):
 *  1. Veillonella reclassified from buffer to pathobiont (Wei 2024, Gross 2012, Liu 2020)
 *  2. S. mitis explicitly NOT counted as ADS+ (Price 1986 — arginine-negative classically)
 *  3. ADS species tiered by evidence strength (Huang 2015, Liu 2008)
 *  4. CLI expanded with B. dentium, S. sputigena, P. acidifaciens, Leptotrichia, P. denticola
 *  5. New Commensal Sufficiency Index (CSI) for the primary buffer system
 *  6. Compensated-dysbiosis flag for low-pathogen + depleted-commensal phenotype
 *  7. Synergy threshold (S. mutans ≥ 0.05 %) gates conditional weights
 *  8. Lifestyle confounders adjust narrative interpretation, not the underlying score
 *
 * STATUS: pure module. Not wired to the kit-processing pipeline yet — that
 * requires PR-α (parser extension to extract the new species columns into
 * `oral_kit_orders`) to land first. See ADR-0014 for the full prerequisite list.
 *
 * UNIT CONVENTION: every species value is a percentage (e.g. 0.27 means 0.27 %),
 * matching the existing `oral_kit_orders.*_pct` column scale.
 */

// ── Public types ───────────────────────────────────────────────────────────

export type CariesRiskCategory =
  | "low_risk_stable"             // CLI minimal/low + CSI robust/adequate
  | "compensated_active_risk"     // CLI elevated/high + CSI robust/adequate
  | "compensated_dysbiosis_risk"  // CLI minimal/low + CSI depleted/severely_depleted
  | "active_disease_risk"         // CLI elevated/high + CSI depleted/severely_depleted
  | "insufficient_data"

export type ConfidenceLevel = "low" | "moderate" | "high"

export type ApiCategory =
  | "well_buffered"
  | "mildly_acidogenic"
  | "moderately_acidogenic"
  | "strongly_acidogenic"

export type CliCategory = "minimal" | "low" | "elevated" | "high"

export type ProtectiveRatioCategory =
  | "no_cavity_makers"
  | "weak"
  | "moderate"
  | "strong"
  | "very_strong"

export type CsiCategory =
  | "severely_depleted"
  | "depleted"
  | "reduced"
  | "adequate"
  | "robust"

export interface SpeciesAbundances {
  // Acidogenic — primary cariogens (1.0 weight)
  s_mutans: number
  s_sobrinus: number
  scardovia_wiggsiae: number
  lactobacillus: number

  // Acidogenic — synergists & alternative acidogens
  b_dentium: number
  s_sputigena: number
  p_acidifaciens: number
  leptotrichia_wadei: number
  leptotrichia_shahii: number
  p_denticola: number

  // Buffering — Tier 1 ADS (strong)
  s_sanguinis: number
  s_gordonii: number

  // Buffering — Tier 1 ADS (moderate)
  s_cristatus: number
  s_parasanguinis: number
  s_australis: number
  a_naeslundii: number

  // Buffering — Tier 2 urease
  s_salivarius: number
  h_parainfluenzae: number  // dual urease + nitrate

  // Buffering — Tier 3 nitrate reduction
  neisseria_total: number
  rothia_dentocariosa: number
  rothia_aeria: number

  // Pathobiont (NOT a buffer per Wei 2024)
  veillonella_total: number

  // S. mitis — explicitly tracked but NOT counted as ADS+
  // (Price 1986: arginine-negative; not in Huang 2015 ADS+ panel)
  s_mitis: number
}

/**
 * Lifestyle confounders. Field names mirror the existing `lifestyle_records`
 * column names exactly so consumers can pass the row through unchanged.
 *
 * - `sugar_intake` and `antibiotics_window` reuse existing questionnaire
 *   columns (LifestyleWizard `sugar_intake` and `antibiotics_window`),
 *   per ADR-0014.
 * - `chlorhexidine_use` and `xerostomia_self_report` are new fields added
 *   to `lifestyle_records` in this PR.
 */
export interface LifestyleConfounders {
  smoking_status: "never" | "former" | "current" | null
  medication_ppi: boolean
  /** Existing column. Vocabulary: past_30 | 31_to_60 | 61_to_90 | over_90 | never_year | not_sure */
  antibiotics_window:
    | "past_30"
    | "31_to_60"
    | "61_to_90"
    | "over_90"
    | "never_year"
    | "not_sure"
    | null
  mouthwash_type: "none" | "fluoride" | "antiseptic" | "unknown" | null
  /** New column added in this PR. */
  chlorhexidine_use: "never" | "past_8wks" | "currently_using" | null
  /** New column added in this PR. */
  xerostomia_self_report: "never" | "occasional" | "frequent" | "constant" | null
  /** Existing column. Vocabulary: rarely | few_weekly | daily | multiple_daily */
  sugar_intake: "rarely" | "few_weekly" | "daily" | "multiple_daily" | null
  gerd: boolean
  age_range: string | null
}

export interface CariesV3Result {
  // Core scores
  phBalanceApi: number
  phBalanceApiCategory: ApiCategory
  cariogenicLoadIndex: number
  cariogenicLoadCategory: CliCategory
  protectiveRatio: number | null
  protectiveRatioCategory: ProtectiveRatioCategory

  // New metrics
  commensalSufficiencyIndex: number
  commensalSufficiencyCategory: CsiCategory
  adsPrimaryPct: number
  adsExtendedPct: number

  // Flags
  compensatedDysbiosisFlag: boolean
  synergyActiveFlag: boolean

  // Classification
  cariesRiskCategory: CariesRiskCategory

  // Reliability
  confidence: ConfidenceLevel
  reliabilityFlags: string[]
  confounderAdjustments: Record<string, string>

  // Calculation breakdown (for methodology transparency)
  breakdown: {
    bufferSum: number
    acidSum: number
    adsStrong: number
    adsModerate: number
    ureaseTier: number
    nitrateReductionTier: number
    primaryCariogens: number
    synergistContribution: number
    veillonellaContribution: number
  }
}

// ── Constants — every weight has a citation in the methodology entry ───────

const SYNERGY_THRESHOLD = 0.05
// Per Cho 2023 (S. sputigena), Niu 2023 (P. denticola), Wei 2024 (Veillonella)

const ADS_STRONG_WEIGHT = 2.0
const ADS_MODERATE_WEIGHT = 1.0
// Per Huang 2015 (S. sanguinis most prevalent ADS+) and Liu 2008 (S. gordonii)

const UREASE_WEIGHT = 1.0
const H_PARA_SPLIT = 0.5
// Per Wijeyeweera 1989 — urease < ADS for plaque pH neutralization

const NITRATE_REDUCTION_WEIGHT = 0.5
// Per Rosier 2022 — modest, diet-dependent

// Cariogen synergist weights, relative to S. mutans = 1.0
const B_DENTIUM_WEIGHT = 0.6        // Henne 2015 — never in healthy plaque (unconditional)
const S_SPUTIGENA_WEIGHT = 0.4      // Cho 2023 — pathobiont, conditional on S. mutans
const P_ACIDIFACIENS_WEIGHT = 0.3   // Wolff 2013 — dentin / root caries
const LEPTOTRICHIA_WEIGHT = 0.2     // Cho 2023, Kahharova 2023 — dysbiosis marker
const P_DENTICOLA_WEIGHT = 0.15     // Niu 2023 — single in vitro study, conditional

// Veillonella as pathobiont (Wei 2024, Gross 2012, Liu 2020)
const VEILLONELLA_WITH_MUTANS = 0.3
const VEILLONELLA_WITHOUT_MUTANS = 0.05

// CSI thresholds — derived from clinical correlation in pilot data + ecological
// theory (Marsh 2003). No published cutoff in adults yet; documented in ADR-0014.
const CSI_THRESHOLDS = {
  severely_depleted: 0.1,
  depleted: 0.5,
  reduced: 1.0,
  adequate: 2.0,
} as const

const API_THRESHOLDS = {
  well_buffered: 0.25,
  mildly_acidogenic: 0.45,
  moderately_acidogenic: 0.65,
} as const

const CLI_THRESHOLDS = {
  minimal: 0.2,
  low: 0.5,
  elevated: 1.5,
} as const

// ── Calculator ─────────────────────────────────────────────────────────────

export function calculateCariesV3(
  species: SpeciesAbundances,
  lifestyle: LifestyleConfounders | null,
): CariesV3Result {
  // === Buffering ===
  const adsStrong = species.s_sanguinis + species.s_gordonii
  const adsModerate =
    species.s_cristatus +
    species.s_parasanguinis +
    species.s_australis +
    species.a_naeslundii

  const ureaseTier =
    species.s_salivarius * UREASE_WEIGHT +
    species.h_parainfluenzae * H_PARA_SPLIT

  const nitrateReductionTier =
    species.neisseria_total * NITRATE_REDUCTION_WEIGHT +
    species.rothia_dentocariosa * NITRATE_REDUCTION_WEIGHT +
    species.rothia_aeria * NITRATE_REDUCTION_WEIGHT +
    species.h_parainfluenzae * NITRATE_REDUCTION_WEIGHT

  const bufferSum =
    adsStrong * ADS_STRONG_WEIGHT +
    adsModerate * ADS_MODERATE_WEIGHT +
    ureaseTier +
    nitrateReductionTier

  // === Synergy ===
  const synergyActive = species.s_mutans >= SYNERGY_THRESHOLD

  // === Acidogenic ===
  const primaryCariogens =
    species.s_mutans +
    species.s_sobrinus +
    species.scardovia_wiggsiae +
    species.lactobacillus

  const bDentiumContribution = species.b_dentium * B_DENTIUM_WEIGHT
  const pAcidifaciensContribution = species.p_acidifaciens * P_ACIDIFACIENS_WEIGHT
  const leptotrichiaContribution =
    (species.leptotrichia_wadei + species.leptotrichia_shahii) * LEPTOTRICHIA_WEIGHT

  let sSputigenaContribution = 0
  let pDenticolaContribution = 0
  let veillonellaContribution = 0

  if (synergyActive) {
    sSputigenaContribution = species.s_sputigena * S_SPUTIGENA_WEIGHT
    pDenticolaContribution = species.p_denticola * P_DENTICOLA_WEIGHT
    veillonellaContribution = species.veillonella_total * VEILLONELLA_WITH_MUTANS
  } else {
    veillonellaContribution = species.veillonella_total * VEILLONELLA_WITHOUT_MUTANS
    // S. sputigena and P. denticola: zero contribution when S. mutans below threshold.
    // Cho 2023: S. sputigena cannot cause caries alone, requires S. mutans exoglucan.
    // Niu 2023: P. denticola synergy is S. mutans-dependent.
  }

  const synergistContribution =
    sSputigenaContribution + pDenticolaContribution + leptotrichiaContribution

  const acidSum =
    primaryCariogens +
    bDentiumContribution +
    sSputigenaContribution +
    pDenticolaContribution +
    pAcidifaciensContribution +
    leptotrichiaContribution +
    veillonellaContribution

  // === pH balance API ===
  const phBalanceApi = acidSum / (acidSum + bufferSum + 0.001)
  const phBalanceApiCategory: ApiCategory =
    phBalanceApi <= API_THRESHOLDS.well_buffered ? "well_buffered" :
    phBalanceApi <= API_THRESHOLDS.mildly_acidogenic ? "mildly_acidogenic" :
    phBalanceApi <= API_THRESHOLDS.moderately_acidogenic ? "moderately_acidogenic" :
    "strongly_acidogenic"

  // === Cariogenic Load Index ===
  const cariogenicLoadIndex =
    primaryCariogens +
    bDentiumContribution +
    sSputigenaContribution +
    pDenticolaContribution +
    pAcidifaciensContribution +
    leptotrichiaContribution

  const cariogenicLoadCategory: CliCategory =
    cariogenicLoadIndex < CLI_THRESHOLDS.minimal ? "minimal" :
    cariogenicLoadIndex < CLI_THRESHOLDS.low ? "low" :
    cariogenicLoadIndex < CLI_THRESHOLDS.elevated ? "elevated" :
    "high"

  // === Commensal Sufficiency Index ===
  const adsPrimaryPct = species.s_sanguinis + species.s_gordonii + species.s_cristatus
  const adsExtendedPct =
    adsPrimaryPct +
    species.s_parasanguinis +
    species.s_australis +
    species.a_naeslundii

  const commensalSufficiencyCategory: CsiCategory =
    adsPrimaryPct < CSI_THRESHOLDS.severely_depleted ? "severely_depleted" :
    adsPrimaryPct < CSI_THRESHOLDS.depleted ? "depleted" :
    adsPrimaryPct < CSI_THRESHOLDS.reduced ? "reduced" :
    adsPrimaryPct < CSI_THRESHOLDS.adequate ? "adequate" :
    "robust"

  const commensalSufficiencyIndex = Math.min(100, (adsPrimaryPct / 2.0) * 100)

  // === Protective ratio (legacy v2 metric, retained for continuity) ===
  const cavityMakers = species.s_mutans + species.s_sobrinus
  const protectors = species.s_sanguinis + species.s_gordonii

  let protectiveRatio: number | null = null
  let protectiveRatioCategory: ProtectiveRatioCategory = "no_cavity_makers"
  if (cavityMakers >= 0.05) {
    protectiveRatio = protectors / (cavityMakers + 0.001)
    protectiveRatioCategory =
      protectiveRatio < 2 ? "weak" :
      protectiveRatio < 5 ? "moderate" :
      protectiveRatio < 15 ? "strong" :
      "very_strong"
  }

  // === Compensated-dysbiosis flag ===
  const compensatedDysbiosisFlag =
    (cariogenicLoadCategory === "minimal" || cariogenicLoadCategory === "low") &&
    (commensalSufficiencyCategory === "depleted" || commensalSufficiencyCategory === "severely_depleted")

  // === Risk classification ===
  const cliElevated = cariogenicLoadCategory === "elevated" || cariogenicLoadCategory === "high"
  const cliLow = cariogenicLoadCategory === "minimal" || cariogenicLoadCategory === "low"
  const csiRobust = commensalSufficiencyCategory === "adequate" || commensalSufficiencyCategory === "robust"
  const csiDepleted = commensalSufficiencyCategory === "depleted" || commensalSufficiencyCategory === "severely_depleted"

  let cariesRiskCategory: CariesRiskCategory
  if (cliLow && csiRobust) cariesRiskCategory = "low_risk_stable"
  else if (cliElevated && csiRobust) cariesRiskCategory = "compensated_active_risk"
  else if (cliLow && csiDepleted) cariesRiskCategory = "compensated_dysbiosis_risk"
  else if (cliElevated && csiDepleted) cariesRiskCategory = "active_disease_risk"
  else cariesRiskCategory = "insufficient_data"

  // === Confounder adjustments (narrative layer) ===
  const reliabilityFlags: string[] = []
  const confounderAdjustments: Record<string, string> = {}

  if (lifestyle) {
    // Antibiotics within ~1 month — recommend retest. We treat the existing
    // `antibiotics_window` value `past_30` as the within-1-month signal
    // (rather than introducing a duplicate `antibiotics_recent` column).
    if (lifestyle.antibiotics_window === "past_30") {
      reliabilityFlags.push("antibiotic_disruption")
      confounderAdjustments.antibiotics =
        "Sample taken during antibiotic recovery window. Microbiome may not reflect baseline. Recommend retest in 4-8 weeks."
    }

    if (lifestyle.chlorhexidine_use === "currently_using") {
      reliabilityFlags.push("chlorhexidine_active")
      confounderAdjustments.chlorhexidine =
        "Chlorhexidine actively suppresses commensal Streptococci and nitrate-reducers. Buffering scores unreliable. Recommend retest 8 weeks after discontinuation."
    } else if (lifestyle.chlorhexidine_use === "past_8wks") {
      reliabilityFlags.push("chlorhexidine_recovery")
      confounderAdjustments.chlorhexidine =
        "Recent chlorhexidine use. Commensal recovery may be incomplete; consider this when interpreting buffering scores."
    }

    if (lifestyle.mouthwash_type === "antiseptic") {
      confounderAdjustments.mouthwash =
        "Antiseptic mouthwash use depletes nitrate-reducing bacteria (Neisseria, Rothia). Switching to fluoride-only rinse may improve scores."
    }

    if (lifestyle.medication_ppi) {
      confounderAdjustments.ppi =
        "PPI use causes Streptococcus overgrowth and Neisseria/Veillonella depletion. Buffering scores may overstate ADS-positive function."
    }

    if (lifestyle.gerd && !lifestyle.medication_ppi) {
      confounderAdjustments.gerd =
        "GERD without PPI treatment. Veillonella, Atopobium, and Actinomyces elevation may reflect acid-tolerant selection rather than independent caries pressure."
    }

    if (lifestyle.smoking_status === "current") {
      confounderAdjustments.smoking =
        "Active smoking depletes nitrate-reducers (Neisseria, Rothia, H. parainfluenzae). Buffering capacity may improve substantially with cessation."
    }

    if (
      lifestyle.xerostomia_self_report === "frequent" ||
      lifestyle.xerostomia_self_report === "constant"
    ) {
      reliabilityFlags.push("xerostomia")
      confounderAdjustments.xerostomia =
        "Reduced salivary flow limits substrate delivery (urea for urease, arginine for ADS, nitrate for NO production). Buffering bacteria may be present but functionally limited."
    }

    // High sugar exposure — uses the existing `sugar_intake` vocabulary
    // (`daily` and `multiple_daily`) directly, rather than introducing a
    // duplicate `sugary_foods_freq` field.
    if (lifestyle.sugar_intake === "daily" || lifestyle.sugar_intake === "multiple_daily") {
      if (cliElevated) {
        confounderAdjustments.sugar =
          "Daily sugar exposure combined with elevated cariogenic load creates the diet-bacteria loop that drives active demineralization. Reducing sugar frequency is the most direct intervention."
      } else if (compensatedDysbiosisFlag) {
        confounderAdjustments.sugar =
          "Daily sugar exposure plus depleted buffer system is a high-risk combination. Without ADS-mediated pH recovery, frequent acid challenges accelerate dysbiosis."
      }
    }
  }

  // === Confidence ===
  const totalInput = acidSum + bufferSum
  let confidence: ConfidenceLevel
  if (totalInput < 5) confidence = "low"
  else if (reliabilityFlags.length > 0) confidence = "low"
  else if (species.lactobacillus > 1 || species.veillonella_total > 3) confidence = "high"
  else confidence = "moderate"

  return {
    phBalanceApi,
    phBalanceApiCategory,
    cariogenicLoadIndex,
    cariogenicLoadCategory,
    protectiveRatio,
    protectiveRatioCategory,

    commensalSufficiencyIndex,
    commensalSufficiencyCategory,
    adsPrimaryPct,
    adsExtendedPct,

    compensatedDysbiosisFlag,
    synergyActiveFlag: synergyActive,

    cariesRiskCategory,

    confidence,
    reliabilityFlags,
    confounderAdjustments,

    breakdown: {
      bufferSum,
      acidSum,
      adsStrong,
      adsModerate,
      ureaseTier,
      nitrateReductionTier,
      primaryCariogens,
      synergistContribution,
      veillonellaContribution,
    },
  }
}

// ── Utility: zero-fixture for tests / partial inputs ──────────────────────

export const ZERO_SPECIES: SpeciesAbundances = {
  s_mutans: 0, s_sobrinus: 0, scardovia_wiggsiae: 0, lactobacillus: 0,
  b_dentium: 0, s_sputigena: 0, p_acidifaciens: 0,
  leptotrichia_wadei: 0, leptotrichia_shahii: 0, p_denticola: 0,
  s_sanguinis: 0, s_gordonii: 0,
  s_cristatus: 0, s_parasanguinis: 0, s_australis: 0, a_naeslundii: 0,
  s_salivarius: 0, h_parainfluenzae: 0,
  neisseria_total: 0, rothia_dentocariosa: 0, rothia_aeria: 0,
  veillonella_total: 0,
  s_mitis: 0,
}

export const ZERO_LIFESTYLE: LifestyleConfounders = {
  smoking_status: null,
  medication_ppi: false,
  antibiotics_window: null,
  mouthwash_type: null,
  chlorhexidine_use: null,
  xerostomia_self_report: null,
  sugar_intake: null,
  gerd: false,
  age_range: null,
}

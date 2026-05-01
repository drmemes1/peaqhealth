/**
 * NR-α — Nitric oxide pathway scoring (foundation, v1).
 *
 * Two scores, one composite classification. Why two and not one:
 *
 *   - "NR Capacity Index" — total nitrate-reducing biomass weighted by
 *     per-cell nitrite-producing efficiency (Doel 2005). Tells us how much
 *     reducer mass exists.
 *
 *   - "NO Signature (Vanhatalo)" — (Rothia + Neisseria) / (Veillonella +
 *     Prevotella). Composition pattern that predicts plasma nitrite
 *     response to dietary nitrate (Vanhatalo 2018, Goh 2022). Tells us how
 *     well that biomass actually converts to systemic NO.
 *
 * The two diverge: a kit can have substantial NR biomass dominated by
 * Veillonella + Prevotella (capacity-rich, signature-poor — the "paradox").
 * A single composite hides this. We surface it explicitly via
 * `nrParadoxFlag` and the `composition_constrained` risk category.
 *
 * Pure data-in / data-out — no sibling imports, no DB calls. The runner
 * (NR-β1) will populate `NRSpeciesAbundances` from `oral_kit_orders`
 * columns; species-level Neisseria/Rothia mostly aren't parsed yet, so the
 * runner will approximate from genus totals. See ADR-0019 § Known gaps.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type NRCapacityCategory =
  | "depleted"
  | "low"
  | "moderate"
  | "robust"
  | "exceptional"

export type NOSignatureCategory =
  | "strongly_unfavorable"
  | "unfavorable"
  | "moderate"
  | "favorable"
  | "strongly_favorable"

export type NRRiskCategory =
  | "optimal"                  // high capacity + favorable signature
  | "capacity_constrained"     // low capacity  + favorable signature
  | "composition_constrained"  // high capacity + unfavorable signature (paradox)
  | "compromised"              // low capacity  + unfavorable signature
  | "insufficient_data"

export type NRConfidenceLevel = "low" | "moderate" | "high"

export interface NRSpeciesAbundances {
  // Tier 1 — primary nitrite producers (per-cell efficiency: high)
  neisseria_mucosa: number
  neisseria_flavescens: number
  neisseria_subflava: number
  rothia_mucilaginosa: number
  rothia_dentocariosa: number
  rothia_aeria: number
  actinomyces_odontolyticus: number

  // Tier 2 — confirmed NR, secondary
  h_parainfluenzae: number
  /** Sum of neisseria sicca + cinerea + elongata + meningitidis + others. */
  neisseria_other: number
  a_naeslundii: number

  // Tier 3 — NR-capable, lower per-cell efficiency
  /** Genus-level Veillonella total (atypica + parvula + dispar + …). */
  veillonella_total: number
  /** Actinomyces genus minus odontolyticus and naeslundii. */
  actinomyces_other: number

  // For Vanhatalo signature (genus totals)
  rothia_total: number
  neisseria_total: number
  prevotella_total: number
}

export interface NRLifestyleConfounders {
  /** "fluoride" / "antiseptic" / "none" / "unknown". */
  mouthwash_type: "none" | "fluoride" | "antiseptic" | "unknown" | null
  /** Caries v3 confounder; reused here. */
  chlorhexidine_use: "never" | "past_8wks" | "currently_using" | null
  smoking_status: "never" | "former" | "current" | null
  medication_ppi: boolean
  /**
   * Existing v2 questionnaire field (q35, dbCol `dietary_nitrate_frequency`).
   * The 5-option vocab is mapped to the binned NR signal via
   * `isLowDietaryNitrate` — `rarely` and `few_times_month` trigger the
   * low-substrate confounder. See ADR-0019 § Lifestyle inputs.
   */
  dietary_nitrate_frequency:
    | "rarely" | "few_times_month" | "several_weekly" | "daily" | "multiple_daily"
    | null
  /**
   * Existing v2 questionnaire field (q26, dbCol `tongue_scraping_freq`).
   * The 4-option vocab is mapped via `isFrequentTongueScraping` —
   * `every_morning` and `most_days` trigger the high-frequency confounder.
   */
  tongue_scraping_freq:
    | "never" | "occasionally" | "most_days" | "every_morning"
    | null
  age_range: string | null
}

/**
 * Maps the 5-option `dietary_nitrate_frequency` vocab to the binary
 * "low substrate" signal the confounder logic branches on. Mirrors the
 * antibiotics_window / sugar_intake bucketing pattern in
 * caries-v3-runner.lifestyleFromRow.
 */
export function isLowDietaryNitrate(
  freq: NRLifestyleConfounders["dietary_nitrate_frequency"],
): boolean {
  return freq === "rarely" || freq === "few_times_month"
}

/**
 * Maps the 4-option `tongue_scraping_freq` vocab to the binary
 * "high-frequency scraping" signal. `most_days` is included alongside
 * `every_morning` because both produce daily-or-near-daily mechanical
 * removal of the tongue-dorsal NR community.
 */
export function isFrequentTongueScraping(
  freq: NRLifestyleConfounders["tongue_scraping_freq"],
): boolean {
  return freq === "most_days" || freq === "every_morning"
}

export interface NRV1Result {
  // Score 1 — capacity
  nrCapacityIndex: number
  nrCapacityCategory: NRCapacityCategory

  // Score 2 — Vanhatalo signature
  noSignature: number
  noSignatureCategory: NOSignatureCategory

  // Composite classification
  nrRiskCategory: NRRiskCategory
  nrParadoxFlag: boolean

  // Reliability — confounders never alter the underlying scores; they only
  // populate these fields so a downstream consumer can render caveats.
  confidence: NRConfidenceLevel
  reliabilityFlags: string[]
  confounderAdjustments: Record<string, string>

  // Methodology transparency.
  breakdown: {
    tier1Sum: number
    tier2Sum: number
    tier3Sum: number
    tier4Sum: number
    weightedTotal: number
    rothiaPlusNeisseria: number
    veillonellaPlusPrevotella: number
  }
}

// ── Constants ───────────────────────────────────────────────────────────────

const TIER_1_WEIGHT = 2.0
const TIER_2_WEIGHT = 1.0
const TIER_3_WEIGHT = 0.4
const TIER_4_WEIGHT = 0.2

const NR_CAPACITY_THRESHOLDS = {
  depleted: 5,
  low: 15,
  moderate: 35,
  robust: 60,
} as const

const NO_SIGNATURE_THRESHOLDS = {
  strongly_unfavorable: 0.25,
  unfavorable: 0.5,
  moderate: 1.5,
  favorable: 3.0,
} as const

/**
 * Sentinel returned when there is reducer mass (rothia + neisseria > 0) but
 * no depleting taxa (veillonella + prevotella = 0). Avoids Infinity in the
 * stored score while still pinning the kit to "strongly_favorable".
 */
const NO_DEPLETERS_SENTINEL = 999

// ── Algorithm ───────────────────────────────────────────────────────────────

export function calculateNRV1(
  species: NRSpeciesAbundances,
  lifestyle: NRLifestyleConfounders | null,
): NRV1Result {
  // ── Tier sums ─────────────────────────────────────────────────────────────
  const tier1Sum =
    species.neisseria_mucosa +
    species.neisseria_flavescens +
    species.neisseria_subflava +
    species.rothia_mucilaginosa +
    species.rothia_dentocariosa +
    species.rothia_aeria +
    species.actinomyces_odontolyticus

  const tier2Sum =
    species.h_parainfluenzae +
    species.neisseria_other +
    species.a_naeslundii

  const tier3Sum =
    species.veillonella_total +
    species.actinomyces_other

  // Schaalia not yet parsed by the upload pipeline; reserved for NR-v2.
  const tier4Sum = 0

  const nrCapacityIndex =
    tier1Sum * TIER_1_WEIGHT +
    tier2Sum * TIER_2_WEIGHT +
    tier3Sum * TIER_3_WEIGHT +
    tier4Sum * TIER_4_WEIGHT

  const nrCapacityCategory: NRCapacityCategory =
    nrCapacityIndex < NR_CAPACITY_THRESHOLDS.depleted ? "depleted" :
    nrCapacityIndex < NR_CAPACITY_THRESHOLDS.low ? "low" :
    nrCapacityIndex < NR_CAPACITY_THRESHOLDS.moderate ? "moderate" :
    nrCapacityIndex < NR_CAPACITY_THRESHOLDS.robust ? "robust" :
    "exceptional"

  // ── Vanhatalo signature ───────────────────────────────────────────────────
  const numerator = species.rothia_total + species.neisseria_total
  const denominator = species.veillonella_total + species.prevotella_total

  const noSignature =
    denominator > 0
      ? numerator / denominator
      : numerator > 0
        ? NO_DEPLETERS_SENTINEL
        : 0

  const noSignatureCategory: NOSignatureCategory =
    noSignature < NO_SIGNATURE_THRESHOLDS.strongly_unfavorable ? "strongly_unfavorable" :
    noSignature < NO_SIGNATURE_THRESHOLDS.unfavorable ? "unfavorable" :
    noSignature < NO_SIGNATURE_THRESHOLDS.moderate ? "moderate" :
    noSignature < NO_SIGNATURE_THRESHOLDS.favorable ? "favorable" :
    "strongly_favorable"

  // ── Composite risk classification ─────────────────────────────────────────
  const totalInput = nrCapacityIndex + numerator + denominator

  const capacityHigh =
    nrCapacityCategory === "moderate" ||
    nrCapacityCategory === "robust" ||
    nrCapacityCategory === "exceptional"
  const capacityLow =
    nrCapacityCategory === "depleted" || nrCapacityCategory === "low"
  const signatureFavorable =
    noSignatureCategory === "favorable" ||
    noSignatureCategory === "strongly_favorable"
  const signatureUnfavorable =
    noSignatureCategory === "unfavorable" ||
    noSignatureCategory === "strongly_unfavorable"

  // `insufficient_data` floor: with effectively no NR-relevant input mass
  // the categorical mapping is meaningless (all-zero input maps to
  // depleted + strongly_unfavorable → "compromised", which would falsely
  // assert dysbiosis on an empty kit). Threshold of 1% total mass is well
  // below the lowest real-kit tier-1 reading.
  let nrRiskCategory: NRRiskCategory
  if (totalInput < 1) {
    nrRiskCategory = "insufficient_data"
  } else if (capacityHigh && signatureFavorable) {
    nrRiskCategory = "optimal"
  } else if (capacityLow && signatureFavorable) {
    nrRiskCategory = "capacity_constrained"
  } else if (capacityHigh && signatureUnfavorable) {
    nrRiskCategory = "composition_constrained"
  } else if (capacityLow && signatureUnfavorable) {
    nrRiskCategory = "compromised"
  } else {
    nrRiskCategory = "insufficient_data"
  }

  const nrParadoxFlag = capacityHigh && signatureUnfavorable

  // ── Confounder adjustments ────────────────────────────────────────────────
  // Mirrors caries-v3 contract: confounders only populate reliabilityFlags
  // and confounderAdjustments; the underlying scores are never altered.
  const reliabilityFlags: string[] = []
  const confounderAdjustments: Record<string, string> = {}

  if (lifestyle) {
    if (lifestyle.chlorhexidine_use === "currently_using") {
      reliabilityFlags.push("chlorhexidine_active")
      confounderAdjustments.chlorhexidine =
        "Chlorhexidine actively suppresses nitrate-reducing bacteria. Per Bondonno 2015, this eliminates the blood-pressure-lowering effect of dietary nitrate within hours. NR scores significantly underestimated. Recommend retest 8 weeks after discontinuation."
    } else if (lifestyle.chlorhexidine_use === "past_8wks") {
      reliabilityFlags.push("chlorhexidine_recovery")
      confounderAdjustments.chlorhexidine =
        "Recent chlorhexidine use. Nitrate-reducer recovery may be incomplete."
    }

    if (lifestyle.mouthwash_type === "antiseptic") {
      confounderAdjustments.mouthwash =
        "Antiseptic mouthwash use depletes nitrate-reducing bacteria. Per the SOALS 2020 cohort (n>1000), daily antiseptic mouthwash use is associated with 85% higher hypertension risk. Switching to fluoride-only rinse may meaningfully improve NO capacity."
    }

    if (lifestyle.smoking_status === "current") {
      confounderAdjustments.smoking =
        "Active smoking depletes Neisseria, Rothia, and Haemophilus. NR capacity will improve substantially with cessation; recovery to never-smoker baseline takes >5 years."
    }

    if (lifestyle.medication_ppi) {
      confounderAdjustments.ppi =
        "PPI use causes Streptococcus overgrowth and Neisseria/Veillonella depletion. NO Signature interpretation may be PPI-confounded."
    }

    if (isLowDietaryNitrate(lifestyle.dietary_nitrate_frequency)) {
      confounderAdjustments.dietary_nitrate =
        "Low dietary nitrate intake limits substrate for the NR community. Even robust NR capacity produces limited NO without dietary substrate. Target 200–400 mg nitrate/day from leafy greens, beets, or supplementation (clinical trials use 6.4 mmol ≈ 400 mg)."
    }

    if (isFrequentTongueScraping(lifestyle.tongue_scraping_freq)) {
      confounderAdjustments.tongue_scraping =
        "Daily or near-daily tongue scraping mechanically removes the NR community concentrated on the tongue dorsum. If NR scores are low, consider reducing scraping frequency to every 2–3 days."
    }
  }

  // ── Confidence ────────────────────────────────────────────────────────────
  let confidence: NRConfidenceLevel
  if (totalInput < 5) {
    confidence = "low"
  } else if (reliabilityFlags.length > 0) {
    confidence = "low"
  } else if (totalInput > 30) {
    confidence = "high"
  } else {
    confidence = "moderate"
  }

  return {
    nrCapacityIndex,
    nrCapacityCategory,
    noSignature,
    noSignatureCategory,
    nrRiskCategory,
    nrParadoxFlag,
    confidence,
    reliabilityFlags,
    confounderAdjustments,
    breakdown: {
      tier1Sum,
      tier2Sum,
      tier3Sum,
      tier4Sum,
      weightedTotal: nrCapacityIndex,
      rothiaPlusNeisseria: numerator,
      veillonellaPlusPrevotella: denominator,
    },
  }
}

// ── Test fixtures ───────────────────────────────────────────────────────────

export const ZERO_NR_SPECIES: NRSpeciesAbundances = {
  neisseria_mucosa: 0,
  neisseria_flavescens: 0,
  neisseria_subflava: 0,
  rothia_mucilaginosa: 0,
  rothia_dentocariosa: 0,
  rothia_aeria: 0,
  actinomyces_odontolyticus: 0,
  h_parainfluenzae: 0,
  neisseria_other: 0,
  a_naeslundii: 0,
  veillonella_total: 0,
  actinomyces_other: 0,
  rothia_total: 0,
  neisseria_total: 0,
  prevotella_total: 0,
}

export const ZERO_NR_LIFESTYLE: NRLifestyleConfounders = {
  mouthwash_type: null,
  chlorhexidine_use: null,
  smoking_status: null,
  medication_ppi: false,
  dietary_nitrate_frequency: null,
  tongue_scraping_freq: null,
  age_range: null,
}

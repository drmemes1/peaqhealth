/**
 * Halitosis v2 — two-pathway VSC algorithm.
 *
 * Architecture mirrors caries v3 / NR-α / perio v1:
 *   - H2S drivers (tongue dorsum pathway)
 *   - CH3SH drivers (periodontal pathway)
 *   - Multiplicative protective modifier (cap 1.25× — architectural
 *     parity with perio CDM 1.0–1.5×)
 *   - Lifestyle Halitosis Modifier (LHM, cap 1.60×)
 *   - Peroxide confounder caveat (does not change score; carried as
 *     a flag for narrative)
 *
 * BLIND SPOTS the algorithm cannot see:
 *   - Postnasal drip, GERD/reflux, tonsil stones, dietary contributors
 *   - Candida (requires ITS sequencing, out of scope for 16S)
 *   - 3 secondary species (E. brachy, Centipeda, Eikenella corrodens
 *     in some panels) — cumulative typically <0.05 HMI
 *
 * See methodology entry + ADR-0025 for derivation.
 */

// v2.5 iter2 calibration: 4-category system. HMI is now max() of the
// pathway-adjusted values (not sum), and LHM is part of categorical
// determination per Kikuchi 2025 evidence (mouth breathing OR 4.68 — the
// strongest single halitosis predictor). Severe band added to capture
// compensated dysbiosis pattern (collapsed protective community + elevated
// drivers + lifestyle amplification).
export type HalitosisCategory = "low" | "moderate" | "high" | "severe"

// Pathway attribution is the primary diagnostic content (per OE
// consultation May 2026): pathway-specific intervention evidence is the
// strongest part of the algorithm (Iatropoulos 2016 — perio therapy
// reduces CH3SH; Tsai 2008 — tongue scraping reduces H2S >50%).
export type HalitosisPathway =
  | "tongue_dominant"     // H2S > CH3SH × 1.3
  | "gum_dominant"        // CH3SH > H2S × 1.3
  | "mixed"               // both pathways within 1.3× of each other
  | "minimal_pressure"    // category === "low" — pathway not actionable

export interface HalitosisInput {
  // ── H2S drivers (tongue dorsum) ───────────────────────────────────
  f_nucleatum_pct: number
  s_moorei_pct: number
  veillonella_pct: number
  leptotrichia_wadei_pct: number
  atopobium_parvulum_pct: number
  selenomonas_total_pct: number
  eubacterium_sulci_pct: number   // 0 if not detected (V3-V4 limit)
  dialister_invisus_pct: number

  // ── CH3SH drivers (periodontal) ───────────────────────────────────
  p_gingivalis_pct: number
  prevotella_intermedia_pct: number
  prevotella_nigrescens_pct: number
  prevotella_denticola_pct: number
  prevotella_melaninogenica_pct: number
  treponema_total_pct: number     // genus-level (V3-V4 limit on T. denticola)
  t_forsythia_pct: number
  eikenella_corrodens_pct: number

  // ── Protective community ──────────────────────────────────────────
  s_salivarius_pct: number
  rothia_total_pct: number
  haemophilus_pct: number

  // ── Cross-module signals (caries v3) ──────────────────────────────
  caries_compensated_dysbiosis: boolean
  s_mutans_pct: number  // for Veillonella weight conditional

  // ── Lifestyle (questionnaire) ─────────────────────────────────────
  mouth_breathing: string | null              // 'never'|'occasionally'|'often'|'confirmed'
  mouth_breathing_when: string | null         // 'sleep_only'|'daytime_and_sleep'|...
  snoring_reported: string | null             // 'never'|'occasional'|'frequent'|'osa_diagnosed'
  smoking_status: string | null               // 'never'|'former'|'current'
  age_years: number | null
  gerd_frequency: string | null               // 'never'|'occasional'|'frequent'|'daily'|'diagnosed_treated'
  tongue_scraping_freq: string | null         // 'never'|'occasionally'|'most_days'|'every_morning'
  last_dental_cleaning: string | null         // 'within_6_months'|'6_to_12_months'|'over_12_months'|'never'
  has_xerostomic_meds: boolean

  // ── Peroxide confounder (kit-side) ────────────────────────────────
  env_peroxide_flag: boolean
  whitening_tray_last_48h: boolean
  whitening_strips_last_48h: boolean
  professional_whitening_last_7d: boolean
}

export interface HalitosisDriverContribution {
  species: string
  abundance_pct: number
  pathway: "h2s" | "ch3sh" | "both"
  contribution: number
}

export interface HalitosisProtectiveContribution {
  species: string
  abundance_pct: number
  contribution: number
}

export interface HalitosisLHMFactor {
  factor: string
  multiplier: number
}

export interface HalitosisResult {
  h2s_drivers_raw: number
  ch3sh_drivers_raw: number
  protective_score: number
  protective_modifier: number
  lhm: number
  h2s_adjusted: number
  ch3sh_adjusted: number
  hmi: number
  hmi_category: HalitosisCategory
  pathway: HalitosisPathway
  /**
   * True when category === "low" AND LHM > 1.30. Triggers narrative
   * routing to non-bacterial cause investigation (postnasal drip,
   * tonsil stones, GERD, dietary, tongue coating mass) rather than
   * producing a falsely reassuring "minimal" read.
   */
  subjective_halitosis_routing: boolean
  driver_contributions: HalitosisDriverContribution[]
  protective_contributions: HalitosisProtectiveContribution[]
  lhm_factors: HalitosisLHMFactor[]
  peroxide_confounder_caveat: boolean
  peroxide_provisional_result: boolean
  reliability_flags: string[]
}

// ── Constants ────────────────────────────────────────────────────────

// Veillonella absolute cap on H2S contribution (prevents single-species
// score domination — Veillonella is secondary in the literature).
const VEILLONELLA_CAP = 1.0

// v2.5: Veillonella scaling becomes a continuous interaction term with
// S. mutans (lactate substrate proxy). Washio 2014 demonstrated lactate
// enhances Veillonella H2S production from L-cysteine 4.5–23.7×. Replaces
// the previous boolean caries_dysbiosis × s_mutans threshold check.
const VEILLONELLA_BASE_WEIGHT = 0.10
const VEILLONELLA_LACTATE_CAP = 2.0
const S_MUTANS_BASELINE_PCT = 0.5

function veillonellaLactateEnhancement(input: HalitosisInput): number {
  // Returns 1.0 when s_mutans matches baseline; scales up linearly with
  // s_mutans abundance, capped at 2.0×. Falls back to 1.0 when
  // s_mutans is unavailable (input is 0).
  if (input.s_mutans_pct <= 0) return 1.0
  return Math.min(VEILLONELLA_LACTATE_CAP, 1 + input.s_mutans_pct / S_MUTANS_BASELINE_PCT)
}

// Selenomonas magnitude-aware genus weighting bands.
function selenomonasWeight(pct: number): number {
  if (pct < 0.3) return 0.2
  if (pct < 1.0) return 0.4
  return 0.5
}

// Protective modifier — multiplicative (1.25× collapse → 0.40× full)
const PROTECTIVE_CAP_PCT = 15
const PROTECTIVE_MAX_MULTIPLIER = 1.25
const PROTECTIVE_MIN_MULTIPLIER = 0.40
const PROTECTIVE_RANGE = PROTECTIVE_MAX_MULTIPLIER - PROTECTIVE_MIN_MULTIPLIER

// LHM cap (prevents runaway compounding).
const LHM_CAP = 1.60

// HMI category boundaries (v2.5 iter2):
//   low <0.6 / moderate 0.6–1.4 / high 1.4–3.2 / severe ≥3.2
// HMI is computed as max(h2s_adjusted, ch3sh_adjusted) — the pathway
// with the higher pressure drives categorization. Sum-based HMI from
// the prior implementation conflated additive bacterial pressure with
// pathway-specific intervention guidance. The max() form keeps category
// aligned with which pathway needs treatment. No published validated
// thresholds exist for any halitosis algorithm; these are heuristic.
const HMI_THRESHOLDS = { moderate: 0.6, high: 1.4, severe: 3.2 }

// LHM threshold above which subjective halitosis routing fires for
// low-category patients. Significant environmental amplification
// suggests symptoms may be present despite low bacterial reading.
const SUBJECTIVE_HALITOSIS_LHM_THRESHOLD = 1.30

// Pathway dominance ratio — one pathway must exceed the other by 1.3×
// (lowered from v2.4's 1.5× since it now drives the primary diagnostic
// label rather than a tie-breaker for phenotype).
const PATHWAY_DOMINANCE_RATIO = 1.3

// ── Helpers ──────────────────────────────────────────────────────────

function computeH2S(input: HalitosisInput): {
  raw: number
  contributions: HalitosisDriverContribution[]
} {
  const contributions: HalitosisDriverContribution[] = []
  let raw = 0

  const add = (species: string, abundance: number, weight: number) => {
    const contribution = abundance * weight
    contributions.push({ species, abundance_pct: abundance, pathway: "h2s", contribution })
    raw += contribution
  }

  // Primary
  add("F. nucleatum", input.f_nucleatum_pct, 1.0)
  add("S. moorei", input.s_moorei_pct, 1.5)

  // Secondary — Veillonella with continuous lactate-interaction term
  // (Washio 2014) and absolute cap to prevent single-species dominance.
  const lactateEnhancement = veillonellaLactateEnhancement(input)
  const veiContribution = Math.min(
    VEILLONELLA_CAP,
    input.veillonella_pct * VEILLONELLA_BASE_WEIGHT * lactateEnhancement,
  )
  contributions.push({
    species: "Veillonella (genus)",
    abundance_pct: input.veillonella_pct,
    pathway: "h2s",
    contribution: veiContribution,
  })
  raw += veiContribution

  add("Leptotrichia wadei", input.leptotrichia_wadei_pct, 0.5)

  // Selenomonas — magnitude-aware
  const seleW = selenomonasWeight(input.selenomonas_total_pct)
  const seleContribution = input.selenomonas_total_pct * seleW
  contributions.push({
    species: "Selenomonas (genus)",
    abundance_pct: input.selenomonas_total_pct,
    pathway: "h2s",
    contribution: seleContribution,
  })
  raw += seleContribution

  // Tertiary
  add("Eubacterium sulci", input.eubacterium_sulci_pct, 0.4)
  add("Dialister invisus", input.dialister_invisus_pct, 0.3)

  return { raw, contributions }
}

function computeCH3SH(input: HalitosisInput): {
  raw: number
  contributions: HalitosisDriverContribution[]
} {
  const contributions: HalitosisDriverContribution[] = []
  let raw = 0

  const add = (species: string, abundance: number, weight: number) => {
    const contribution = abundance * weight
    contributions.push({ species, abundance_pct: abundance, pathway: "ch3sh", contribution })
    raw += contribution
  }

  // Primary
  add("P. gingivalis", input.p_gingivalis_pct, 1.0)
  add("Prevotella intermedia", input.prevotella_intermedia_pct, 0.8)
  add("Prevotella nigrescens", input.prevotella_nigrescens_pct, 0.8)
  add("Prevotella denticola", input.prevotella_denticola_pct, 0.6)
  // v2.5: P. melaninogenica weight reduced from 0.2× to 0.10× per OE
  // consultation. P. melaninogenica is a universal core commensal
  // (Govender 2026, NHANES 2025 n=8,237) with no in vitro VSC production
  // data demonstrating it as a primary driver. Its inclusion in halitosis-
  // associated communities reflects co-occurrence in dysbiotic
  // environments, not direct VSC production.
  add("Prevotella melaninogenica", input.prevotella_melaninogenica_pct, 0.10)

  // Secondary
  add("Treponema (genus)", input.treponema_total_pct, 0.7)
  add("T. forsythia", input.t_forsythia_pct, 0.5)

  // Atopobium parvulum is shared between pathways — captured as 'both'.
  // It contributes 0.5× to H2S elsewhere; here in CH3SH it's 0.6×.
  // Conservative single-pathway count: include its CH3SH weight here
  // and tag it as 'both' so the UI shows the dual role.
  const atoContribution = input.atopobium_parvulum_pct * 0.6
  contributions.push({
    species: "Atopobium parvulum",
    abundance_pct: input.atopobium_parvulum_pct,
    pathway: "both",
    contribution: atoContribution,
  })
  raw += atoContribution

  // S. moorei × P. gingivalis / T. denticola synergy (conditional 0.5×)
  if (input.s_moorei_pct > 0.05 &&
      (input.p_gingivalis_pct > 0.01 || input.treponema_total_pct > 0.01)) {
    const syn = input.s_moorei_pct * 0.5
    contributions.push({
      species: "S. moorei × Pg/Td synergy",
      abundance_pct: input.s_moorei_pct,
      pathway: "ch3sh",
      contribution: syn,
    })
    raw += syn
  }

  // Tertiary — Selenomonas same magnitude-aware weight as H2S, but
  // counted ONCE (already in H2S). Skip here to avoid double-counting.
  // Eikenella corrodens is CH3SH-specific.
  add("Eikenella corrodens", input.eikenella_corrodens_pct, 0.3)

  return { raw, contributions }
}

function computeAtopobiumH2S(pct: number): HalitosisDriverContribution {
  return {
    species: "Atopobium parvulum (H2S)",
    abundance_pct: pct,
    pathway: "h2s",
    contribution: pct * 0.5,
  }
}

function computeProtectiveModifier(input: HalitosisInput): {
  modifier: number
  score: number
  contributions: HalitosisProtectiveContribution[]
} {
  const contributions: HalitosisProtectiveContribution[] = [
    { species: "S. salivarius", abundance_pct: input.s_salivarius_pct, contribution: input.s_salivarius_pct * 1.0 },
    { species: "Rothia (total)", abundance_pct: input.rothia_total_pct, contribution: input.rothia_total_pct * 0.5 },
    { species: "Haemophilus", abundance_pct: input.haemophilus_pct, contribution: input.haemophilus_pct * 0.3 },
  ]
  const score = contributions.reduce((s, c) => s + c.contribution, 0)
  const cappedScore = Math.min(PROTECTIVE_CAP_PCT, score)

  // Linear interpolation: cappedScore=0 → 1.25× (collapsed protection),
  // cappedScore=15 → 0.40× (full protection).
  const modifier = Math.max(
    PROTECTIVE_MIN_MULTIPLIER,
    Math.min(
      PROTECTIVE_MAX_MULTIPLIER,
      PROTECTIVE_MAX_MULTIPLIER - (cappedScore / PROTECTIVE_CAP_PCT) * PROTECTIVE_RANGE,
    ),
  )

  return { modifier, score, contributions }
}

function computeLHM(input: HalitosisInput): {
  lhm: number
  factors: HalitosisLHMFactor[]
} {
  let lhm = 1.0
  const factors: HalitosisLHMFactor[] = []
  const apply = (factor: string, multiplier: number) => {
    if (multiplier === 1.0) return
    lhm *= multiplier
    factors.push({ factor, multiplier })
  }

  // Mouth breathing
  if (input.mouth_breathing === "often" || input.mouth_breathing === "confirmed") {
    apply("mouth_breathing=often/confirmed", 1.25)
  } else if (input.mouth_breathing === "occasionally") {
    apply("mouth_breathing=occasional", 1.15)
  }

  // Snoring
  if (input.snoring_reported === "frequent" || input.snoring_reported === "osa_diagnosed") {
    apply("snoring=frequent", 1.20)
  } else if (input.snoring_reported === "occasional") {
    apply("snoring=occasional", 1.10)
  }

  // Dry-mouth-on-waking proxy via mouth_breathing_when
  if (input.mouth_breathing_when === "sleep_only" || input.mouth_breathing_when === "daytime_and_sleep") {
    apply("dry_mouth_on_waking", 1.20)
  }

  if (input.has_xerostomic_meds) apply("xerostomic_medications", 1.10)

  // Hygiene factors
  if (input.last_dental_cleaning === "over_12_months" || input.last_dental_cleaning === "never") {
    apply("last_cleaning>12m", 1.15)
  } else if (input.last_dental_cleaning === "6_to_12_months") {
    apply("last_cleaning 6–12m", 1.08)
  }

  if (input.tongue_scraping_freq === "never") apply("tongue_scraping=never", 1.10)
  else if (input.tongue_scraping_freq === "rarely" || input.tongue_scraping_freq === "occasionally") {
    apply("tongue_scraping=rare", 1.05)
  }

  if (input.smoking_status === "current") apply("smoking=current", 1.15)
  if (input.age_years != null && input.age_years >= 50) apply("age>=50", 1.05)

  // GERD — 5-state enum. Frequent/daily/diagnosed_treated all add weight.
  if (
    input.gerd_frequency === "frequent" ||
    input.gerd_frequency === "daily" ||
    input.gerd_frequency === "diagnosed_treated"
  ) {
    apply("gerd_frequent_or_diagnosed", 1.10)
  }

  return { lhm: Math.min(LHM_CAP, lhm), factors }
}

function categorizeHmi(hmi: number): HalitosisCategory {
  if (hmi < HMI_THRESHOLDS.moderate) return "low"
  if (hmi < HMI_THRESHOLDS.high) return "moderate"
  if (hmi < HMI_THRESHOLDS.severe) return "high"
  return "severe"
}

function determinePathway(
  category: HalitosisCategory,
  h2s_adj: number,
  ch3sh_adj: number,
): HalitosisPathway {
  // Low category: pathway attribution isn't actionable — bacterial
  // intervention isn't indicated regardless of which pathway leads.
  if (category === "low") return "minimal_pressure"
  if (h2s_adj > ch3sh_adj * PATHWAY_DOMINANCE_RATIO) return "tongue_dominant"
  if (ch3sh_adj > h2s_adj * PATHWAY_DOMINANCE_RATIO) return "gum_dominant"
  return "mixed"
}

// ── Public entrypoint ────────────────────────────────────────────────

export function calculateHalitosis(input: HalitosisInput): HalitosisResult {
  const h2s = computeH2S(input)
  const ch3sh = computeCH3SH(input)

  // Add Atopobium H2S contribution to the contributions list (single
  // pathway tag for the UI species table).
  const atoH2s = computeAtopobiumH2S(input.atopobium_parvulum_pct)
  // The H2S sum already excludes Atopobium; add it now.
  const h2s_drivers_raw = h2s.raw + atoH2s.contribution

  const protective = computeProtectiveModifier(input)
  const { lhm, factors: lhm_factors } = computeLHM(input)

  const h2s_adjusted = h2s_drivers_raw * protective.modifier * lhm
  const ch3sh_adjusted = ch3sh.raw * protective.modifier * lhm
  // v2.5 iter2: HMI is the maximum of the pathway-adjusted values, not
  // their sum. The category reflects how much pressure the dominant
  // pathway is putting on the system, which aligns categorization with
  // the pathway-specific intervention evidence (Iatropoulos / Tsai).
  const hmi = Math.max(h2s_adjusted, ch3sh_adjusted)

  const hmi_category = categorizeHmi(hmi)
  const pathway = determinePathway(hmi_category, h2s_adjusted, ch3sh_adjusted)
  const subjective_halitosis_routing =
    hmi_category === "low" && lhm > SUBJECTIVE_HALITOSIS_LHM_THRESHOLD

  const peroxide_acute =
    input.whitening_tray_last_48h ||
    input.whitening_strips_last_48h ||
    input.professional_whitening_last_7d
  const peroxide_chronic = input.env_peroxide_flag

  const peroxide_confounder_caveat = peroxide_acute || peroxide_chronic
  const peroxide_provisional_result = peroxide_acute

  const reliability_flags: string[] = []
  if (peroxide_acute) reliability_flags.push("peroxide_acute_high")
  else if (peroxide_chronic) reliability_flags.push("peroxide_chronic_low")

  return {
    h2s_drivers_raw,
    ch3sh_drivers_raw: ch3sh.raw,
    protective_score: protective.score,
    protective_modifier: parseFloat(protective.modifier.toFixed(4)),
    lhm: parseFloat(lhm.toFixed(4)),
    h2s_adjusted: parseFloat(h2s_adjusted.toFixed(4)),
    ch3sh_adjusted: parseFloat(ch3sh_adjusted.toFixed(4)),
    hmi: parseFloat(hmi.toFixed(4)),
    hmi_category,
    pathway,
    subjective_halitosis_routing,
    driver_contributions: [...h2s.contributions, atoH2s, ...ch3sh.contributions]
      .filter(c => c.abundance_pct > 0 || c.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution),
    protective_contributions: protective.contributions,
    lhm_factors,
    peroxide_confounder_caveat,
    peroxide_provisional_result,
    reliability_flags,
  }
}

export const EMPTY_HALITOSIS_INPUT: HalitosisInput = {
  f_nucleatum_pct: 0,
  s_moorei_pct: 0,
  veillonella_pct: 0,
  leptotrichia_wadei_pct: 0,
  atopobium_parvulum_pct: 0,
  selenomonas_total_pct: 0,
  eubacterium_sulci_pct: 0,
  dialister_invisus_pct: 0,
  p_gingivalis_pct: 0,
  prevotella_intermedia_pct: 0,
  prevotella_nigrescens_pct: 0,
  prevotella_denticola_pct: 0,
  prevotella_melaninogenica_pct: 0,
  treponema_total_pct: 0,
  t_forsythia_pct: 0,
  eikenella_corrodens_pct: 0,
  s_salivarius_pct: 0,
  rothia_total_pct: 0,
  haemophilus_pct: 0,
  caries_compensated_dysbiosis: false,
  s_mutans_pct: 0,
  mouth_breathing: null,
  mouth_breathing_when: null,
  snoring_reported: null,
  smoking_status: null,
  age_years: null,
  gerd_frequency: null,
  tongue_scraping_freq: null,
  last_dental_cleaning: null,
  has_xerostomic_meds: false,
  env_peroxide_flag: false,
  whitening_tray_last_48h: false,
  whitening_strips_last_48h: false,
  professional_whitening_last_7d: false,
}

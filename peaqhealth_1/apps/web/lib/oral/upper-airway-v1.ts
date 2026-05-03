/**
 * Upper Airway v1 — bacterial OSA signature × STOP-only questionnaire
 * × sinus / nasal phenotype.
 *
 * SCREENING TOOL — NOT A DIAGNOSTIC. OSA diagnosis requires
 * polysomnography or home sleep apnea testing ordered by a clinician.
 * The USPSTF disclaimer must accompany every result surfacing this
 * module's output. See methodology entry + ADR-0025.
 *
 * Architecture (mirrors the two-axis pattern used by perio + caries +
 * NR modules):
 *
 *   1. Bacterial OSA features — 4 features, conjunctive ≥3/4 required
 *      to flag OSA bacterial signature. Features:
 *        - Actinobacteria enrichment (Rothia >23% OR Actinomyces >10.8%)
 *        - Prevotella + Alloprevotella combined depleted (<5%)
 *        - Aerobic shift (Neisseria >8%)
 *        - Shannon reduced (<4.0) — supporting only, may be null
 *      Thresholds anchored to NHANES 2025 population means
 *      (Chaturvedi 2025, n=8,237).
 *
 *   2. STOP-only questionnaire (4 items + age + sex modifiers = 6
 *      total). Patel 2022 found STOP sensitivity 89% vs STOP-BANG 90%
 *      for self-administered settings; STOP-BANG's BMI / neck items
 *      are unreliable when self-reported. STOP ≥ 2 = elevated risk
 *      indication.
 *
 *   3. Nasal / sinus obstruction score (questionnaire only, 0–9).
 *      Routes Tier 4a (sinus-driven) to ENT/allergy first.
 *
 *   4. 8-tier classification with peroxide confounder gating in
 *      Step 0. Acute high-dose peroxide returns
 *      tier_confounded_peroxide with a hard deferral; chronic
 *      low-dose proceeds with classification + caveat narrative.
 */

export interface BacterialOSAFeatures {
  actinobacteria_enriched: boolean
  prevotella_depleted: boolean
  aerobic_shift: boolean
  shannon_reduced: boolean | null  // null when shannon not measured
  features_present: number          // count of true features (shannon counted only when non-null)
  raw_values: {
    rothia_pct: number
    actinomyces_pct: number
    actinobacteria_combined_pct: number
    neisseria_pct: number
    prevotella_combined_pct: number
    shannon: number | null
  }
}

export interface STOPQuestionnaire {
  snore: boolean         // snoring_reported in {'frequent','osa_diagnosed'}
  tired: boolean         // non_restorative_sleep in {'often','almost_always'}
  observed: boolean      // osa_witnessed in {'yes_gasping','yes_stop_breathing'}
  hypertension: boolean  // hypertension_dx === true
  stop_score: number     // 0–4
  age_modifier: number   // 1 if age >= 50
  male_modifier: number  // 1 if biological_sex === 'male'
  total_score: number    // 0–6
  stop_at_2_threshold: boolean  // stop_score >= 2
}

export type NasalCategory = "none" | "mild" | "moderate" | "severe"

export interface NasalObstructionScore {
  score: number
  category: NasalCategory
  factors: string[]
}

export type UpperAirwayTier =
  | "tier_1_osa_likely"
  | "tier_2_osa_possible_bacterial"
  | "tier_2_osa_possible_symptoms"
  | "tier_3_mixed_signals"
  | "tier_4a_sinus_driven"
  | "tier_4b_symptoms_unclear_cause"
  | "tier_5_habitual_mouth_breathing"
  | "tier_5a_nasal_obstruction_no_osa_symptoms"
  | "tier_6_commensal_dominant_healthy"
  | "tier_7_healthy_upper_airway"
  | "tier_confounded_peroxide"

export type PeroxideSeverity = "none" | "chronic_low" | "acute_high"

export interface UpperAirwayInput {
  // Bacterial inputs (kit-side).
  rothia_total_pct: number
  actinomyces_total_pct: number
  neisseria_pct: number
  prevotella_combined_pct: number   // Prevotella + Alloprevotella
  shannon_diversity: number | null

  // Questionnaire (lifestyle + profile).
  snoring_reported: string | null
  non_restorative_sleep: string | null
  osa_witnessed: string | null
  hypertension_dx: boolean | null
  age_years: number | null
  biological_sex: "male" | "female" | "other" | null

  // Nasal / sinus inputs.
  nasal_obstruction: string | null         // 'none'|'occasional'|'often'|'chronic'
  mouth_breathing_confirm: string | null   // 'never'|'sometimes'|'often'|'almost_always'
  sinus_history: string | null             // 'none'|'crs'|'polyps'|'septum'|'surgery'|'multiple'

  // Peroxide confounder (kit-side).
  whitening_tray_last_48h: boolean | null
  whitening_strips_last_48h: boolean | null
  professional_whitening_last_7d: boolean | null
  whitening_toothpaste_daily: boolean | null
  peroxide_mouthwash_daily: boolean | null
  env_peroxide_flag: boolean | null
}

export interface UpperAirwayResult {
  tier: UpperAirwayTier
  bacterial: BacterialOSAFeatures
  stop_questionnaire: STOPQuestionnaire
  nasal_obstruction: NasalObstructionScore
  peroxide_confounder: {
    flagged: boolean
    severity: PeroxideSeverity
    caveat_required: boolean
  }
  routing: {
    primary_recommendation: string
    specialist_first: "ent" | "allergy" | "sleep_medicine" | "self_managed" | "none"
    sleep_study_indicated: boolean
    timeline: "immediate" | "soon" | "monitor" | "no_action"
  }
  reliability_flags: string[]
}

// ── Thresholds ────────────────────────────────────────────────────────

const ROTHIA_ENRICHED_THRESHOLD = 23.0
const ACTINOMYCES_ENRICHED_THRESHOLD = 10.8
const NEISSERIA_AEROBIC_SHIFT_THRESHOLD = 8.0
const PREVOTELLA_DEPLETED_THRESHOLD = 5.0
const SHANNON_REDUCED_THRESHOLD = 4.0

const BACTERIAL_FEATURES_REQUIRED = 3
const STOP_AT_2 = 2
const TOTAL_AT_4 = 4

// Nasal obstruction scoring weights.
const NASAL_OBSTRUCTION_WEIGHTS: Record<string, number> = {
  often: 2, chronic: 3,
}
const MOUTH_BREATHING_CONFIRM_WEIGHTS: Record<string, number> = {
  sometimes: 1, often: 2, almost_always: 3,
}
const SINUS_HISTORY_WEIGHTS: Record<string, number> = {
  crs: 2, polyps: 2, septum: 2, surgery: 2, multiple: 3,
}

const NASAL_THRESHOLDS = { mild: 2, moderate: 4, severe: 7 }

// ── Helpers ───────────────────────────────────────────────────────────

function computeBacterialFeatures(input: UpperAirwayInput): BacterialOSAFeatures {
  const actinobacteriaCombined = input.rothia_total_pct + input.actinomyces_total_pct
  const actinobacteria_enriched =
    input.rothia_total_pct > ROTHIA_ENRICHED_THRESHOLD ||
    input.actinomyces_total_pct > ACTINOMYCES_ENRICHED_THRESHOLD

  const prevotella_depleted = input.prevotella_combined_pct < PREVOTELLA_DEPLETED_THRESHOLD
  const aerobic_shift = input.neisseria_pct > NEISSERIA_AEROBIC_SHIFT_THRESHOLD
  const shannon_reduced =
    input.shannon_diversity == null
      ? null
      : input.shannon_diversity < SHANNON_REDUCED_THRESHOLD

  let count = 0
  if (actinobacteria_enriched) count++
  if (prevotella_depleted) count++
  if (aerobic_shift) count++
  if (shannon_reduced === true) count++

  return {
    actinobacteria_enriched,
    prevotella_depleted,
    aerobic_shift,
    shannon_reduced,
    features_present: count,
    raw_values: {
      rothia_pct: input.rothia_total_pct,
      actinomyces_pct: input.actinomyces_total_pct,
      actinobacteria_combined_pct: actinobacteriaCombined,
      neisseria_pct: input.neisseria_pct,
      prevotella_combined_pct: input.prevotella_combined_pct,
      shannon: input.shannon_diversity,
    },
  }
}

function computeSTOP(input: UpperAirwayInput): STOPQuestionnaire {
  const snore =
    input.snoring_reported === "frequent" || input.snoring_reported === "osa_diagnosed"
  const tired =
    input.non_restorative_sleep === "often" || input.non_restorative_sleep === "almost_always"
  const observed =
    input.osa_witnessed === "yes_gasping" || input.osa_witnessed === "yes_stop_breathing"
  const hypertension = input.hypertension_dx === true

  const stop_score = (snore ? 1 : 0) + (tired ? 1 : 0) + (observed ? 1 : 0) + (hypertension ? 1 : 0)
  const age_modifier = input.age_years != null && input.age_years >= 50 ? 1 : 0
  const male_modifier = input.biological_sex === "male" ? 1 : 0
  const total_score = stop_score + age_modifier + male_modifier

  return {
    snore, tired, observed, hypertension,
    stop_score, age_modifier, male_modifier, total_score,
    stop_at_2_threshold: stop_score >= STOP_AT_2,
  }
}

function computeNasalScore(input: UpperAirwayInput): NasalObstructionScore {
  let score = 0
  const factors: string[] = []

  const noWeight = NASAL_OBSTRUCTION_WEIGHTS[input.nasal_obstruction ?? ""]
  if (noWeight) {
    score += noWeight
    factors.push(`nasal_obstruction=${input.nasal_obstruction} (+${noWeight})`)
  }

  const mbcWeight = MOUTH_BREATHING_CONFIRM_WEIGHTS[input.mouth_breathing_confirm ?? ""]
  if (mbcWeight) {
    score += mbcWeight
    factors.push(`mouth_breathing_confirm=${input.mouth_breathing_confirm} (+${mbcWeight})`)
  }

  const shWeight = SINUS_HISTORY_WEIGHTS[input.sinus_history ?? ""]
  if (shWeight) {
    score += shWeight
    factors.push(`sinus_history=${input.sinus_history} (+${shWeight})`)
  }

  const category: NasalCategory =
    score >= NASAL_THRESHOLDS.severe ? "severe" :
    score >= NASAL_THRESHOLDS.moderate ? "moderate" :
    score >= NASAL_THRESHOLDS.mild ? "mild" :
    "none"

  return { score, category, factors }
}

function computePeroxideSeverity(input: UpperAirwayInput): PeroxideSeverity {
  const acute =
    input.whitening_tray_last_48h === true ||
    input.whitening_strips_last_48h === true ||
    input.professional_whitening_last_7d === true
  if (acute) return "acute_high"
  const chronic =
    input.whitening_toothpaste_daily === true ||
    input.peroxide_mouthwash_daily === true
  if (chronic) return "chronic_low"
  if (input.env_peroxide_flag === true) return "chronic_low"
  return "none"
}

interface RoutingDecision {
  primary_recommendation: string
  specialist_first: UpperAirwayResult["routing"]["specialist_first"]
  sleep_study_indicated: boolean
  timeline: UpperAirwayResult["routing"]["timeline"]
}

function tierRouting(
  tier: UpperAirwayTier,
  nasal: NasalCategory,
): RoutingDecision {
  switch (tier) {
    case "tier_1_osa_likely":
      return {
        primary_recommendation:
          "Both bacterial and symptom signals point toward OSA risk. We recommend a sleep medicine consultation for objective evaluation (polysomnography or home sleep apnea test).",
        specialist_first: "sleep_medicine",
        sleep_study_indicated: true,
        timeline: "soon",
      }
    case "tier_2_osa_possible_bacterial":
      return {
        primary_recommendation:
          "Your oral microbiome shows the bacterial pattern associated with OSA in published cohorts, even though symptoms are mild. A sleep medicine consultation is appropriate to rule out subclinical OSA.",
        specialist_first: "sleep_medicine",
        sleep_study_indicated: true,
        timeline: "soon",
      }
    case "tier_2_osa_possible_symptoms":
      return {
        primary_recommendation:
          "Your STOP symptom score is elevated (≥ 2). Microbiome bacterial features don't yet match the OSA pattern, but a sleep evaluation is the appropriate next step.",
        specialist_first: "sleep_medicine",
        sleep_study_indicated: true,
        timeline: "soon",
      }
    case "tier_3_mixed_signals":
      return {
        primary_recommendation:
          "Some signals suggest elevated airway risk; others don't. Discuss the STOP symptoms with your primary care clinician — they'll decide whether sleep testing is warranted.",
        specialist_first: "self_managed",
        sleep_study_indicated: false,
        timeline: "monitor",
      }
    case "tier_4a_sinus_driven":
      return {
        primary_recommendation:
          "Symptoms are present but the bacterial pattern is not OSA-typical. Nasal/sinus obstruction is the more likely upstream driver — see ENT or allergy first. Treating chronic sinus inflammation often resolves snoring/tiredness without sleep testing.",
        specialist_first: nasal === "severe" ? "ent" : "allergy",
        sleep_study_indicated: false,
        timeline: "soon",
      }
    case "tier_4b_symptoms_unclear_cause":
      return {
        primary_recommendation:
          "Sleep symptoms are present without a clear bacterial or nasal cause. Discuss with your primary care clinician for differential workup (could include thyroid, mood, sleep hygiene factors).",
        specialist_first: "self_managed",
        sleep_study_indicated: false,
        timeline: "monitor",
      }
    case "tier_5_habitual_mouth_breathing":
      return {
        primary_recommendation:
          "An aerobic shift in oral bacteria suggests habitual mouth breathing. No OSA-typical signals or symptoms present. Address through nasal hygiene, mouth taping at night (if cleared by a clinician), and any allergic component.",
        specialist_first: "self_managed",
        sleep_study_indicated: false,
        timeline: "monitor",
      }
    case "tier_5a_nasal_obstruction_no_osa_symptoms":
      return {
        primary_recommendation:
          "Nasal obstruction is moderate-to-severe but OSA symptoms are minimal. Address the obstruction (ENT/allergy) before assuming any airway risk — fixing the nasal pathway often prevents downstream OSA.",
        specialist_first: nasal === "severe" ? "ent" : "allergy",
        sleep_study_indicated: false,
        timeline: "monitor",
      }
    case "tier_6_commensal_dominant_healthy":
      return {
        primary_recommendation:
          "A commensal-dominant pattern with no symptoms or nasal obstruction. No upper airway action needed.",
        specialist_first: "none",
        sleep_study_indicated: false,
        timeline: "no_action",
      }
    case "tier_7_healthy_upper_airway":
      return {
        primary_recommendation:
          "All upper airway signals are within healthy ranges. No action needed.",
        specialist_first: "none",
        sleep_study_indicated: false,
        timeline: "no_action",
      }
    case "tier_confounded_peroxide":
      return {
        primary_recommendation:
          "Recent peroxide product use can mimic the bacterial OSA pattern (same reactive-oxygen-species mechanism). Re-test 7–14 days after your last peroxide exposure for an unconfounded reading.",
        specialist_first: "none",
        sleep_study_indicated: false,
        timeline: "monitor",
      }
  }
}

// ── Tier classification ──────────────────────────────────────────────

function classifyTier(
  bacterial: BacterialOSAFeatures,
  stop: STOPQuestionnaire,
  nasal: NasalObstructionScore,
  peroxide: PeroxideSeverity,
): UpperAirwayTier {
  // Step 0: peroxide gating. Acute high-dose halts classification with
  // a hard deferral. Chronic low-dose proceeds (caveat surfaced
  // separately in narrative).
  if (peroxide === "acute_high") return "tier_confounded_peroxide"

  const features = bacterial.features_present
  const stopOk = stop.stop_at_2_threshold
  const totalAt4 = stop.total_score >= TOTAL_AT_4
  const featuresAt3 = features >= BACTERIAL_FEATURES_REQUIRED
  const nasalElevated = nasal.category === "moderate" || nasal.category === "severe"
  const nasalLow = nasal.category === "none" || nasal.category === "mild"

  // Tier 1 — OSA likely (both axes positive + total score elevated).
  if (featuresAt3 && stopOk && totalAt4) return "tier_1_osa_likely"

  // Tier 2 — OSA possible (one axis positive).
  if (featuresAt3) return "tier_2_osa_possible_bacterial"
  if (stopOk && totalAt4) return "tier_2_osa_possible_symptoms"

  // Tier 3 — Mixed signals (partial bacterial + symptom).
  if (stopOk && (features === 1 || features === 2) && nasalLow) {
    return "tier_3_mixed_signals"
  }

  // Tier 4a — Sinus-driven (symptoms + nasal obstruction, bacteria not OSA-typical).
  if (stopOk && nasalElevated && features < BACTERIAL_FEATURES_REQUIRED) {
    return "tier_4a_sinus_driven"
  }

  // Tier 4b — Symptoms without clear bacterial or nasal cause.
  if (stopOk && features === 0 && nasal.category === "none") {
    return "tier_4b_symptoms_unclear_cause"
  }

  // Tier 5 — Habitual mouth breathing (aerobic shift only, low symptom + nasal).
  if (
    bacterial.aerobic_shift &&
    !bacterial.actinobacteria_enriched &&
    !stop.stop_at_2_threshold && stop.stop_score <= 1 &&
    nasalLow
  ) {
    return "tier_5_habitual_mouth_breathing"
  }

  // Tier 5a — Nasal obstruction without OSA symptoms.
  if (
    nasalElevated &&
    stop.stop_score <= 1 &&
    (bacterial.aerobic_shift || features === 1 || features === 2)
  ) {
    return "tier_5a_nasal_obstruction_no_osa_symptoms"
  }

  // Tier 6 — Commensal-dominant healthy (some bacterial features, no symptoms or nasal).
  if ((features === 1 || features === 2) && stop.stop_score === 0 && nasal.category === "none") {
    return "tier_6_commensal_dominant_healthy"
  }

  // Tier 7 — Healthy upper airway (default).
  return "tier_7_healthy_upper_airway"
}

// ── Public entrypoint ────────────────────────────────────────────────

export function calculateUpperAirway(input: UpperAirwayInput): UpperAirwayResult {
  const bacterial = computeBacterialFeatures(input)
  const stop_questionnaire = computeSTOP(input)
  const nasal_obstruction = computeNasalScore(input)
  const peroxide_severity = computePeroxideSeverity(input)

  const tier = classifyTier(bacterial, stop_questionnaire, nasal_obstruction, peroxide_severity)
  const routing = tierRouting(tier, nasal_obstruction.category)

  const reliability_flags: string[] = []
  if (input.shannon_diversity == null) reliability_flags.push("shannon_unmeasured")
  if (peroxide_severity !== "none") reliability_flags.push(`peroxide_${peroxide_severity}`)
  if (input.age_years == null) reliability_flags.push("age_unknown")
  if (!input.biological_sex) reliability_flags.push("sex_unknown")

  return {
    tier,
    bacterial,
    stop_questionnaire,
    nasal_obstruction,
    peroxide_confounder: {
      flagged: peroxide_severity !== "none",
      severity: peroxide_severity,
      caveat_required: peroxide_severity !== "none",
    },
    routing,
    reliability_flags,
  }
}

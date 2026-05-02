/**
 * Hero-lede generator for the v3 oral page.
 *
 * Picks one of a set of lede branches based on the combined signal
 * from caries v3 + NR v1 risk categories. The lede should describe
 * what we observe — never overpromise or alarm.
 *
 * Add branches as more algorithms ship; existing branches stay stable.
 */

import type { OralPageData } from "./page-data"

export function generateLede(data: OralPageData): string {
  const cariesRisk = data.caries?.risk_category ?? null
  const nrRisk = data.nr?.risk_category ?? null
  const nrParadox = data.nr?.paradox_flag === true

  const cariesGood = cariesRisk === "low_risk_stable"
  const cariesActive =
    cariesRisk === "compensated_active_risk" || cariesRisk === "active_disease_risk"
  const cariesDysbiosis = cariesRisk === "compensated_dysbiosis_risk"
  const cariesUnknown = !cariesRisk || cariesRisk === "insufficient_data"

  const nrOptimal = nrRisk === "optimal"
  const nrCompromised = nrRisk === "compromised"
  const nrCapacityCon = nrRisk === "capacity_constrained"
  const nrCompositionCon = nrRisk === "composition_constrained"
  const nrUnknown = !nrRisk || nrRisk === "insufficient_data"

  // ── Both algorithms returned a clear classification ──

  // Paradox branches first — paradox can co-fire with `nr_risk_category = optimal`
  // (Capacity is robust, Signature is favorable, but the underlying species
  // mix still trips the paradox heuristic), so they must override the plain
  // optimal-state lede.

  if (cariesGood && nrParadox) {
    return "Your caries balance looks stable. Your nitric-oxide-producing bacterial community shows a composition pattern that may limit systemic NO conversion — worth understanding even though pathogen counts are low."
  }

  if (cariesActive && nrOptimal) {
    return "Your nitric oxide pathway is strong, but your caries-associated bacteria are showing active pressure that's currently being held in check by intact buffering. Worth attention."
  }

  if (cariesGood && nrOptimal) {
    return "Your oral microbiome is in good shape across the dimensions we currently measure. The bacteria that protect your heart and the bacteria that buffer your mouth's pH are both doing their work."
  }

  if (cariesDysbiosis && nrParadox) {
    return "Two patterns to understand: your caries-protective commensals are depleted, and your nitric oxide composition shows the same favoring of fermentative anaerobes over aerobic producers. These often share upstream causes."
  }

  if (cariesActive && nrCompromised) {
    return "Both signals are showing pressure: caries-associated bacteria are active and your nitric oxide pathway is constrained on both biomass and composition. Diet and oral-care patterns can shift both."
  }

  if (cariesActive && (nrCapacityCon || nrCompositionCon)) {
    return "Caries-associated bacteria are showing active pressure, and your nitric oxide pathway is constrained — these often reinforce each other through shared upstream drivers like sugar frequency and antimicrobial mouthwash use."
  }

  if (cariesGood && nrCompromised) {
    return "Your caries balance looks stable, but your nitric oxide pathway is constrained on both biomass and composition. Worth understanding what's shaping that — diet, antimicrobial use, and breathing pattern all leave fingerprints here."
  }

  if (cariesGood && (nrCapacityCon || nrCompositionCon)) {
    return "Your caries balance is in good shape. Your nitric oxide pathway shows room to grow — either the biomass or the species mix is below where it could be for cardiovascular support."
  }

  if (cariesDysbiosis && nrOptimal) {
    return "Your nitric oxide pathway is strong. Your caries-protective commensals, however, are depleted — which means your buffering reserve is thinner than the pathogen counts alone would suggest."
  }

  if (cariesDysbiosis && (nrCompromised || nrCapacityCon || nrCompositionCon)) {
    return "Two patterns to understand: your caries-protective commensals are depleted, and your nitric oxide pathway is constrained. They often share upstream causes — antimicrobial mouthwash, smoking, low dietary fiber."
  }

  // ── Partial classification ──

  if (cariesUnknown && nrOptimal) {
    return "Your nitric oxide pathway is strong. Caries classification is awaiting more confidence — see the methodology section for what was insufficient."
  }

  if (cariesUnknown && nrParadox) {
    return "Your nitric-oxide-producing community shows a composition pattern that may limit systemic NO conversion. Caries classification is still pending."
  }

  if (cariesGood && nrUnknown) {
    return "Your caries balance looks stable. Nitric oxide classification is awaiting more confidence — see the methodology section."
  }

  if (cariesActive && nrUnknown) {
    return "Your caries-associated bacteria are showing active pressure. Nitric oxide classification is still pending."
  }

  // ── Fallback ──
  return "Your oral microbiome shows a complex pattern across the dimensions we currently measure. Read on for details."
}

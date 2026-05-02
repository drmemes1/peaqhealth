/**
 * Single data loader for the v3 oral microbiome page.
 *
 * All section components consume the returned `OralPageData` shape and
 * never query the database directly. This keeps the page boundary
 * stable as more algorithms ship — sections are added without changing
 * the data contract for ones already shipped.
 */

import { createClient as createServiceClient } from "@supabase/supabase-js"
import {
  categorizeKey,
  COMPOSITION_CATEGORIES_ORDERED,
  type CompositionCategory,
} from "./composition-categories"

export interface CariesV3Outputs {
  risk_category: string
  cli: number | null
  cli_category: string | null
  csi: number | null
  csi_category: string | null
  api: number | null
  api_category: string | null
  protective_ratio: number | null
  protective_ratio_category: string | null
  ads_primary_pct: number | null
  ads_extended_pct: number | null
  synergy_active: boolean
  compensated_dysbiosis: boolean
  confidence: string | null
  confounder_adjustments: Record<string, string>
}

export interface NRV1Outputs {
  capacity_index: number | null
  capacity_category: string | null
  no_signature: number | null
  no_signature_category: string | null
  risk_category: string
  paradox_flag: boolean
  confidence: string | null
  confounder_adjustments: Record<string, string>
}

export interface PerioBurdenV1Outputs {
  pbi: number | null                        // perio_burden_index_adjusted (after CDM)
  pbi_pre_cdm: number | null                // raw PBI before CDM amplification
  pbi_category: string | null               // minimal | low | moderate | high | severe
  pdi: number | null                        // perio_defense_index
  pdi_category: string | null               // depleted | borderline | adequate | robust (v1.3)
  total_subp_pct: number | null
  cdm_factor: number | null                 // commensal_depletion_factor
  cdm_amplification_pct: number | null
  risk_category: string                     // composite (stable_low_risk, borderline, etc.)
  diagnostic_uncertainty_zone: boolean
  red_complex: {
    status_label: "not_detected" | "below_clinical_threshold" | "detected"
    detected_species: string[]
    any_above_clinical_threshold: boolean
  }
  cross_panel_hooks: {
    cardiovascular_pattern_pending: boolean
    neurodegenerative_pattern_pending: boolean
  }
  confidence: string | null
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
  } | null
}

export interface OralPageData {
  user: {
    id: string
    first_name: string | null
  }
  kit: {
    id: string
    ordered_at: string | null
    results_date: string | null
  }
  caries: CariesV3Outputs | null
  nr: NRV1Outputs | null
  perio: PerioBurdenV1Outputs | null
  snapshot: {
    species_count: number | null
    named_species_count: number | null
    genus_count: number | null
    phyla_count: number | null
    shannon_diversity: number | null
    total_abundance_captured: number | null
  }
  top_species: Array<{
    name: string
    pct: number
    category: CompositionCategory
  }>
  composition: Record<CompositionCategory, number>
  lifestyle: {
    mouth_breathing: string | null
    mouthwash_type: string | null
    smoking_status: string | null
    chlorhexidine_use: string | null
    xerostomia_self_report: string | null
  } | null
  has_blood_data: boolean
  has_sleep_data: boolean
  has_questionnaire_data: boolean
}

/** Page-state result. `state` tells the page which fallback to render. */
export type OralPageResult =
  | { state: "no_kit"; user: OralPageData["user"] }
  | { state: "processing"; user: OralPageData["user"]; kitId: string; ordered_at: string | null }
  | { state: "ready"; data: OralPageData }

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function num(v: unknown): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null
}

function bool(v: unknown): boolean {
  return v === true
}

/**
 * Build the full page payload for a user. Returns a discriminated union
 * so the page can render `no_kit` / `processing` / `ready` distinctly.
 */
export async function loadOralPageData(userId: string): Promise<OralPageResult> {
  const sb = svc()

  const [{ data: profile }, { data: kit }, { data: lifestyle }, blood, sleep] = await Promise.all([
    sb.from("profiles").select("first_name").eq("id", userId).maybeSingle(),
    sb.from("oral_kit_orders")
      .select("*")
      .eq("user_id", userId)
      .order("ordered_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb.from("lifestyle_records")
      .select("mouth_breathing, mouthwash_type, smoking_status, chlorhexidine_use, xerostomia_self_report")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb.from("blood_results").select("id").eq("user_id", userId).limit(1).maybeSingle(),
    sb.from("sleep_data").select("date").eq("user_id", userId).limit(1).maybeSingle(),
  ])

  const user = {
    id: userId,
    first_name: str(profile?.first_name) ?? null,
  }

  if (!kit) return { state: "no_kit", user }

  const k = kit as Record<string, unknown>
  const kitId = String(k.id)
  const ordered_at = str(k.ordered_at)

  if (!num(k.shannon_diversity)) {
    // Kit row exists but no parser output yet → processing.
    return { state: "processing", user, kitId, ordered_at }
  }

  // ── Snapshot from raw_otu_table.__meta.community_summary ──
  const otu = (k.raw_otu_table ?? {}) as Record<string, unknown>
  const meta = (otu.__meta ?? {}) as Record<string, unknown>
  const cs = (meta.community_summary ?? {}) as Record<string, number>

  const snapshot: OralPageData["snapshot"] = {
    species_count: num(k.species_count) ?? num(cs.total_entries_present),
    named_species_count: num(cs.named_species_count),
    genus_count: num(cs.distinct_genera),
    phyla_count: num(cs.distinct_phyla),
    shannon_diversity: num(k.shannon_diversity),
    total_abundance_captured: num(cs.total_abundance_captured),
  }

  // ── Composition (per-key categorization summed by category) ──
  const compositionTotals: Record<CompositionCategory, number> = {
    buffering: 0,
    nr_favorable: 0,
    cariogenic: 0,
    context_dependent: 0,
    unclassified: 0,
  }
  const flatPairs: Array<{ name: string; pct: number; category: CompositionCategory }> = []

  for (const [key, val] of Object.entries(otu)) {
    if (key === "__meta") continue
    const fraction = Number(val)
    if (!Number.isFinite(fraction) || fraction <= 0) continue
    // raw_otu_table stores fractions (0–1); upload-parser writes pct/100.
    const pct = fraction * 100
    const category = categorizeKey(key)
    compositionTotals[category] += pct
    flatPairs.push({ name: key, pct, category })
  }

  flatPairs.sort((a, b) => b.pct - a.pct)
  const top_species = flatPairs.slice(0, 15)

  // ── Caries v3 outputs (gated on column presence) ──
  const cariesRisk = str(k.caries_risk_category)
  const caries: CariesV3Outputs | null = cariesRisk
    ? {
        risk_category: cariesRisk,
        cli: num(k.cariogenic_load_v3),
        cli_category: str(k.cariogenic_load_v3_category),
        csi: num(k.commensal_sufficiency_index),
        csi_category: str(k.commensal_sufficiency_category),
        api: num(k.ph_balance_api_v3),
        api_category: str(k.ph_balance_api_v3_category),
        protective_ratio: num(k.protective_ratio_v3),
        protective_ratio_category: str(k.protective_ratio_v3_category),
        ads_primary_pct: num(k.ads_primary_pct),
        ads_extended_pct: num(k.ads_extended_pct),
        synergy_active: bool(k.synergy_active_flag),
        compensated_dysbiosis: bool(k.compensated_dysbiosis_flag),
        confidence: str(k.caries_v3_confidence),
        confounder_adjustments: (k.caries_v3_confounder_adjustments ?? {}) as Record<string, string>,
      }
    : null

  // ── NR v1 outputs ──
  const nrRisk = str(k.nr_risk_category)
  const nr: NRV1Outputs | null = nrRisk
    ? {
        capacity_index: num(k.nr_capacity_index),
        capacity_category: str(k.nr_capacity_category),
        no_signature: num(k.no_signature),
        no_signature_category: str(k.no_signature_category),
        risk_category: nrRisk,
        paradox_flag: bool(k.nr_paradox_flag),
        confidence: str(k.nr_v1_confidence),
        confounder_adjustments: (k.nr_v1_confounder_adjustments ?? {}) as Record<string, string>,
      }
    : null

  // ── Perio burden v1 outputs ──
  const perioRisk = str(k.perio_risk_category)
  const redCxRaw = (k.red_complex_status ?? {}) as Record<string, unknown>
  const perio: PerioBurdenV1Outputs | null = perioRisk
    ? {
        pbi: num(k.perio_burden_index_adjusted),
        pbi_pre_cdm: num(k.perio_burden_index),
        pbi_category: str(k.perio_burden_category),
        pdi: num(k.perio_defense_index),
        pdi_category: str(k.perio_defense_category),
        total_subp_pct: num(k.total_subp_pct),
        cdm_factor: num(k.commensal_depletion_factor),
        cdm_amplification_pct: num(k.cdm_amplification_pct),
        risk_category: perioRisk,
        diagnostic_uncertainty_zone: bool(k.diagnostic_uncertainty_zone),
        red_complex: {
          status_label: (str(redCxRaw.status_label) ?? "not_detected") as
            "not_detected" | "below_clinical_threshold" | "detected",
          detected_species: Array.isArray(redCxRaw.detected_species)
            ? (redCxRaw.detected_species as string[])
            : [],
          any_above_clinical_threshold: bool(redCxRaw.any_above_clinical_threshold),
        },
        cross_panel_hooks: (k.cross_panel_hooks ?? {
          cardiovascular_pattern_pending: false,
          neurodegenerative_pattern_pending: false,
        }) as PerioBurdenV1Outputs["cross_panel_hooks"],
        confidence: str(k.perio_v1_confidence),
        reliability_flags: Array.isArray(k.perio_v1_reliability_flags)
          ? (k.perio_v1_reliability_flags as string[])
          : [],
        confounder_adjustments: (k.perio_v1_confounder_adjustments ?? {}) as Record<string, string>,
        narrative_augmentations: Array.isArray(k.perio_v1_narrative_augmentations)
          ? (k.perio_v1_narrative_augmentations as string[])
          : [],
        breakdown: (k.perio_v1_breakdown ?? null) as PerioBurdenV1Outputs["breakdown"],
      }
    : null

  const lifestyleData = lifestyle
    ? {
        mouth_breathing: str((lifestyle as Record<string, unknown>).mouth_breathing),
        mouthwash_type: str((lifestyle as Record<string, unknown>).mouthwash_type),
        smoking_status: str((lifestyle as Record<string, unknown>).smoking_status),
        chlorhexidine_use: str((lifestyle as Record<string, unknown>).chlorhexidine_use),
        xerostomia_self_report: str((lifestyle as Record<string, unknown>).xerostomia_self_report),
      }
    : null

  const data: OralPageData = {
    user,
    kit: {
      id: kitId,
      ordered_at,
      results_date: str(k.results_date),
    },
    caries,
    nr,
    perio,
    snapshot,
    top_species,
    composition: compositionTotals,
    lifestyle: lifestyleData,
    has_blood_data: !!blood?.data?.id,
    has_sleep_data: !!sleep?.data?.date,
    has_questionnaire_data: !!lifestyleData,
  }

  // Touch ordered constant so the page can iterate categories deterministically.
  void COMPOSITION_CATEGORIES_ORDERED

  return { state: "ready", data }
}

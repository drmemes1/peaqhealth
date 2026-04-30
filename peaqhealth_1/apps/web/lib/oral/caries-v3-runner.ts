/**
 * Caries v3 pipeline runner
 * =========================
 *
 * Glues a persisted oral_kit_orders row + lifestyle_records row to the pure
 * algorithm at lib/oral/caries-v3.ts. Two responsibilities:
 *
 *   1. Build the SpeciesAbundances and LifestyleConfounders shapes from
 *      raw DB rows. Field mapping is documented inline.
 *   2. Translate the CariesV3Result into the column update object the
 *      route persists to oral_kit_orders.
 *
 * Soft-fail by design: if calculateCariesV3 throws, runCariesV3() logs and
 * returns null so the kit-processing flow can continue. v3 is additive — a
 * kit without v3 outputs still has v2 caries panel results.
 *
 * No I/O in this module. The caller fetches rows and writes the update.
 */

import {
  calculateCariesV3,
  ZERO_SPECIES,
  ZERO_LIFESTYLE,
  type SpeciesAbundances,
  type LifestyleConfounders,
  type CariesV3Result,
} from "./caries-v3"

// Coerce raw column values (numeric or null) to a usable percentage.
const num = (v: unknown): number => {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Build SpeciesAbundances from an oral_kit_orders row. Defaults every field
 * to 0 — matching the column DEFAULT 0 contract from PR-α (ADR-0015) — so
 * partial rows produce well-defined v3 outputs.
 *
 * h_parainfluenzae uses haemophilus_pct (genus-level proxy) until a
 * species-level column is parsed. That's consistent with the contract test
 * in apps/web/lib/oral/__tests__/upload-parser.test.ts.
 */
export function speciesFromKitRow(row: Record<string, unknown>): SpeciesAbundances {
  return {
    ...ZERO_SPECIES,
    s_mutans: num(row.s_mutans_pct),
    s_sobrinus: num(row.s_sobrinus_pct),
    scardovia_wiggsiae: num(row.scardovia_pct),
    lactobacillus: num(row.lactobacillus_pct),

    b_dentium: num(row.b_dentium_pct),
    s_sputigena: num(row.s_sputigena_pct),
    p_acidifaciens: num(row.p_acidifaciens_pct),
    leptotrichia_wadei: num(row.leptotrichia_wadei_pct),
    leptotrichia_shahii: num(row.leptotrichia_shahii_pct),
    p_denticola: num(row.p_denticola_pct),

    s_sanguinis: num(row.s_sanguinis_pct),
    s_gordonii: num(row.s_gordonii_pct),
    s_cristatus: num(row.s_cristatus_pct),
    s_parasanguinis: num(row.s_parasanguinis_pct),
    s_australis: num(row.s_australis_pct),
    a_naeslundii: num(row.a_naeslundii_pct),

    s_salivarius: num(row.s_salivarius_pct),
    h_parainfluenzae: num(row.haemophilus_pct),

    neisseria_total: num(row.neisseria_pct),
    rothia_dentocariosa: num(row.rothia_dentocariosa_pct),
    rothia_aeria: num(row.rothia_aeria_pct),

    veillonella_total: num(row.veillonella_pct),
    s_mitis: num(row.s_mitis_pct),
  }
}

/**
 * Build LifestyleConfounders from a lifestyle_records row.
 *
 * ADR-0014 already aligned the LifestyleConfounders type with the
 * existing lifestyle_records columns, so this is a direct field-by-field
 * passthrough — no `antibiotics_window → antibiotics_recent` translation
 * layer. `medication_ppi` is already a boolean column on the table; `gerd`
 * is derived from `gerd_nocturnal` for backward compatibility.
 */
export function lifestyleFromRow(row: Record<string, unknown> | null): LifestyleConfounders | null {
  if (!row) return null

  const smoking = row.smoking_status
  const ppi = row.medication_ppi
  const antibiotics = row.antibiotics_window
  const mouthwash = row.mouthwash_type
  const chx = row.chlorhexidine_use
  const xero = row.xerostomia_self_report
  const sugar = row.sugar_intake
  const gerdNocturnal = row.gerd_nocturnal
  const gerdSimple = row.gerd
  const ageRange = row.age_range

  // Coerce string fields through the type's union by value, falling back to null.
  const smokingValid: LifestyleConfounders["smoking_status"] =
    smoking === "never" || smoking === "former" || smoking === "current" ? smoking : null

  const antibioticsValid: LifestyleConfounders["antibiotics_window"] =
    antibiotics === "past_30" || antibiotics === "31_to_60" || antibiotics === "61_to_90" ||
    antibiotics === "over_90" || antibiotics === "never_year" || antibiotics === "not_sure"
      ? antibiotics : null

  const mouthwashValid: LifestyleConfounders["mouthwash_type"] =
    mouthwash === "none" || mouthwash === "fluoride" || mouthwash === "antiseptic" || mouthwash === "unknown"
      ? mouthwash : null

  const chxValid: LifestyleConfounders["chlorhexidine_use"] =
    chx === "never" || chx === "past_8wks" || chx === "currently_using" ? chx : null

  const xeroValid: LifestyleConfounders["xerostomia_self_report"] =
    xero === "never" || xero === "occasional" || xero === "frequent" || xero === "constant" ? xero : null

  const sugarValid: LifestyleConfounders["sugar_intake"] =
    sugar === "rarely" || sugar === "few_weekly" || sugar === "daily" || sugar === "multiple_daily"
      ? sugar : null

  // GERD: prefer the boolean `gerd` column; fall back to `gerd_nocturnal` (also boolean).
  const gerd =
    typeof gerdSimple === "boolean" ? gerdSimple :
    typeof gerdNocturnal === "boolean" ? gerdNocturnal :
    false

  return {
    ...ZERO_LIFESTYLE,
    smoking_status: smokingValid,
    medication_ppi: typeof ppi === "boolean" ? ppi : false,
    antibiotics_window: antibioticsValid,
    mouthwash_type: mouthwashValid,
    chlorhexidine_use: chxValid,
    xerostomia_self_report: xeroValid,
    sugar_intake: sugarValid,
    gerd,
    age_range: typeof ageRange === "string" ? ageRange : null,
  }
}

/**
 * The DB update payload mapping CariesV3Result → oral_kit_orders columns.
 * Caller spreads this into a single .update() call alongside the v2 fields.
 */
export interface CariesV3Update {
  ph_balance_api_v3: number
  ph_balance_api_v3_category: string
  cariogenic_load_v3: number
  cariogenic_load_v3_category: string
  protective_ratio_v3: number | null
  protective_ratio_v3_category: string
  commensal_sufficiency_index: number
  commensal_sufficiency_category: string
  ads_primary_pct: number
  ads_extended_pct: number
  compensated_dysbiosis_flag: boolean
  synergy_active_flag: boolean
  caries_risk_category: string
  caries_v3_confidence: string
  caries_v3_reliability_flags: string[] | null
  caries_v3_confounder_adjustments: Record<string, string>
  caries_v3_breakdown: CariesV3Result["breakdown"]
  caries_v3_computed_at: string
}

export function v3UpdateFromResult(result: CariesV3Result): CariesV3Update {
  return {
    ph_balance_api_v3: parseFloat(result.phBalanceApi.toFixed(4)),
    ph_balance_api_v3_category: result.phBalanceApiCategory,
    cariogenic_load_v3: parseFloat(result.cariogenicLoadIndex.toFixed(4)),
    cariogenic_load_v3_category: result.cariogenicLoadCategory,
    protective_ratio_v3: result.protectiveRatio == null ? null : parseFloat(result.protectiveRatio.toFixed(2)),
    protective_ratio_v3_category: result.protectiveRatioCategory,
    commensal_sufficiency_index: parseFloat(result.commensalSufficiencyIndex.toFixed(2)),
    commensal_sufficiency_category: result.commensalSufficiencyCategory,
    ads_primary_pct: parseFloat(result.adsPrimaryPct.toFixed(4)),
    ads_extended_pct: parseFloat(result.adsExtendedPct.toFixed(4)),
    compensated_dysbiosis_flag: result.compensatedDysbiosisFlag,
    synergy_active_flag: result.synergyActiveFlag,
    caries_risk_category: result.cariesRiskCategory,
    caries_v3_confidence: result.confidence,
    caries_v3_reliability_flags: result.reliabilityFlags.length > 0 ? result.reliabilityFlags : null,
    caries_v3_confounder_adjustments: result.confounderAdjustments,
    caries_v3_breakdown: result.breakdown,
    caries_v3_computed_at: new Date().toISOString(),
  }
}

/**
 * Run the full v3 pipeline against a persisted kit row + optional lifestyle
 * row. Returns the column update payload, or null on failure (logged).
 *
 * Caller is responsible for the actual DB write.
 */
export function runCariesV3(
  kitRow: Record<string, unknown>,
  lifestyleRow: Record<string, unknown> | null,
): { update: CariesV3Update; result: CariesV3Result } | null {
  try {
    const species = speciesFromKitRow(kitRow)
    const lifestyle = lifestyleFromRow(lifestyleRow)
    const result = calculateCariesV3(species, lifestyle)
    return { update: v3UpdateFromResult(result), result }
  } catch (err) {
    console.error("[caries-v3] runner failed:", err)
    return null
  }
}

/**
 * Adapter — translates a `blood_results` row into the `BloodPanelData`
 * shape that converge / intervention / narrative consumers read from
 * `ctx.bloodPanel`.
 *
 * Two responsibilities:
 *
 *   1. Backward compatibility — every camelCase field defined on
 *      `BloodPanelData` (ldl, hdl, hsCrp, …) gets mapped from its
 *      corresponding registry column. Consumers like
 *      `ctx.bloodPanel.ldl` keep working without modification.
 *
 *   2. Audit-defect fix — the audit flagged `BloodPanelData` as a
 *      25-marker ceiling that hides everything outside the hand-picked
 *      subset. Since `BloodPanelData` already has a `[key: string]:
 *      unknown` catch-all, this adapter ALSO splats every registry id
 *      onto the result. Consumers can now read any marker by its
 *      database column name (e.g. `bloodPanel.apob_mgdl`,
 *      `bloodPanel.lipoprotein_a_mgdl`) without the camelCase alias
 *      having to exist on the type.
 *
 * The mapping table below pins the camelCase ↔ registry-id
 * correspondence; if a registry column is renamed, this table is the
 * single point of update for the BloodPanelData backward-compat path.
 */

import type { BloodPanelData } from "../user-context"
import { BLOOD_MARKER_REGISTRY } from "./markerRegistry"

// camelCase → registry id. Anything missing here will not be on
// BloodPanelData under its old camelCase name (consumers using the
// catch-all key access still work). Only the existing 25-field subset
// from BloodPanelData lives here; the catch-all path covers the rest.
const CAMEL_TO_REGISTRY: Record<string, string> = {
  // Lipids / heart
  ldl:                "ldl_mgdl",
  hdl:                "hdl_mgdl",
  triglycerides:      "triglycerides_mgdl",
  totalCholesterol:   "total_cholesterol_mgdl",
  // Inflammation / metabolic
  hsCrp:              "hs_crp_mgl",
  hba1c:              "hba1c_percent",
  glucose:            "glucose_mgdl",
  // CBC / immune
  wbc:                "wbc_thousand_ul",
  hemoglobin:         "hemoglobin_gdl",
  hematocrit:         "hematocrit_percent",
  platelets:          "platelets_thousand_ul",
  rdw:                "rdw_percent",
  // Thyroid
  tsh:                "tsh_uiuml",
  freeT4:             "t4_free_ngdl",
  // Kidney
  egfr:               "egfr_mlmin",
  creatinine:         "creatinine_mgdl",
  bun:                "bun_mgdl",
  // Liver
  alt:                "alt_ul",
  ast:                "ast_ul",
  albumin:            "albumin_gdl",
  // Nutrients
  vitaminD:           "vitamin_d_ngml",
  ferritin:           "ferritin_ngml",
  vitaminB12:         "vitamin_b12_pgml",
  // Electrolytes
  sodium:             "sodium_mmoll",
  potassium:          "potassium_mmoll",
}

// Coerce raw column values (numeric or null) to number | null.
function n(v: unknown): number | null {
  if (v == null) return null
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}

function s(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null
}

export function bloodPanelDataFromBloodResults(
  row: Record<string, unknown> | null,
): BloodPanelData | null {
  if (!row) return null

  // Step 1 — populate the camelCase backward-compat fields.
  const camel: Record<string, number | null> = {}
  for (const [camelKey, registryId] of Object.entries(CAMEL_TO_REGISTRY)) {
    camel[camelKey] = n(row[registryId])
  }

  // Step 2 — splat every registry id onto the result with its raw value.
  // The `[key: string]: unknown` catch-all on BloodPanelData makes this
  // type-safe at the consumer side. Lifts the 25-marker ceiling.
  const allMarkers: Record<string, number | null> = {}
  for (const m of BLOOD_MARKER_REGISTRY) {
    allMarkers[m.id] = n(row[m.id])
  }

  const collectedAt = s(row.collected_at)

  return {
    id: typeof row.id === "string" ? row.id : "",
    drawDate: collectedAt ? collectedAt.slice(0, 10) : null,
    labName: s(row.source_lab),
    ...camel,
    ...allMarkers,
    // Required-field defaults for camelCase fields not in CAMEL_TO_REGISTRY
    // (BloodPanelData lists `wbc, hemoglobin, hematocrit, …` — covered above).
    // Anything BloodPanelData listed that we don't map here would surface
    // as undefined; fall through to null for safety.
    ldl: camel.ldl ?? null,
    hdl: camel.hdl ?? null,
    triglycerides: camel.triglycerides ?? null,
    totalCholesterol: camel.totalCholesterol ?? null,
    hsCrp: camel.hsCrp ?? null,
    hba1c: camel.hba1c ?? null,
    glucose: camel.glucose ?? null,
    wbc: camel.wbc ?? null,
    hemoglobin: camel.hemoglobin ?? null,
    hematocrit: camel.hematocrit ?? null,
    tsh: camel.tsh ?? null,
    freeT4: camel.freeT4 ?? null,
    egfr: camel.egfr ?? null,
    creatinine: camel.creatinine ?? null,
    bun: camel.bun ?? null,
    alt: camel.alt ?? null,
    ast: camel.ast ?? null,
    albumin: camel.albumin ?? null,
    vitaminD: camel.vitaminD ?? null,
    ferritin: camel.ferritin ?? null,
    vitaminB12: camel.vitaminB12 ?? null,
    sodium: camel.sodium ?? null,
    potassium: camel.potassium ?? null,
    platelets: camel.platelets ?? null,
    rdw: camel.rdw ?? null,
  }
}

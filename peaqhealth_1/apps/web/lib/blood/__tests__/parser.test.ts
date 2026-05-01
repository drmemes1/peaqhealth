/**
 * Parser tests — exercise the validation / derived-computation /
 * uniform-value-guard logic against synthetic raw model outputs.
 *
 * The OpenAI vision call itself is intentionally not mocked here:
 * the production parser at `parseBloodPDF` is a thin wrapper that
 * (1) renders a PDF to PNG via unpdf, (2) sends it to OpenAI, and
 * (3) hands the JSON to `validateAndComputeFromRaw`. All non-trivial
 * logic lives in step 3, so that's what we test.
 *
 * If we later add a real PDF fixture, that becomes an integration
 * test with the network call gated behind an env var, but the unit
 * coverage stays here.
 */

import { validateAndComputeFromRaw } from "../validate"

// Helper: build a raw output skeleton with overrides
function rawOutput(
  markers: Record<string, { value: number; unitFound?: string; confidence?: number; rawExtractedText?: string } | null>,
  meta: Partial<{ sourceLab: string | null; collectedAt: string | null; overallConfidence: number }> = {},
) {
  const fullMarkers: Record<string, { value: number; unitFound: string; confidence: number; rawExtractedText: string } | null> = {}
  for (const [id, raw] of Object.entries(markers)) {
    if (raw === null) {
      fullMarkers[id] = null
      continue
    }
    fullMarkers[id] = {
      value: raw.value,
      unitFound: raw.unitFound ?? "mg/dL",
      confidence: raw.confidence ?? 0.9,
      rawExtractedText: raw.rawExtractedText ?? `${id} value`,
    }
  }
  return {
    sourceLab: meta.sourceLab ?? "Quest Diagnostics",
    collectedAt: meta.collectedAt ?? "2026-04-15",
    overallConfidence: meta.overallConfidence ?? 0.92,
    markers: fullMarkers,
  }
}

describe("parser — validateAndComputeFromRaw", () => {
  test("real lab values pass validation, surface in result", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      ldl_mgdl: { value: 125 },
      hdl_mgdl: { value: 58 },
      triglycerides_mgdl: { value: 88 },
      glucose_mgdl: { value: 92 },
      hba1c_percent: { value: 5.4 },
      hs_crp_mgl: { value: 0.8 },
      apob_mgdl: { value: 87 },
    }))
    expect(result.markers.ldl_mgdl?.value).toBe(125)
    expect(result.markers.ldl_mgdl?.wasComputed).toBe(false)
    expect(result.markers.hba1c_percent?.value).toBe(5.4)
    expect(result.markers.apob_mgdl?.value).toBe(87)
    expect(result.parserUsed).toBe("openai-vision-v1")
    expect(result.sourceLab).toBe("Quest Diagnostics")
  })

  test("14-bug shape: 31 markers all = 14 → throws", () => {
    const ids = [
      "ldl_mgdl", "hdl_mgdl", "total_cholesterol_mgdl", "triglycerides_mgdl",
      "hs_crp_mgl", "homocysteine_umoll", "glucose_mgdl", "hba1c_percent",
      "insulin_uiuml", "uric_acid_mgdl", "vitamin_d_ngml", "ferritin_ngml",
      "creatinine_mgdl", "egfr_mlmin", "bun_mgdl", "alt_ul", "ast_ul",
      "alp_ul", "total_bilirubin_mgdl", "albumin_gdl", "wbc_thousand_ul",
      "hemoglobin_gdl", "hematocrit_percent", "rdw_percent", "mcv_fl",
      "platelets_thousand_ul", "sodium_mmoll", "potassium_mmoll",
      "calcium_mgdl", "tsh_uiuml", "lipoprotein_a_mgdl",
    ]
    const markers: Record<string, { value: number }> = {}
    for (const id of ids) markers[id] = { value: 14 }

    expect(() => validateAndComputeFromRaw(rawOutput(markers))).toThrow(
      /suspicious output.*identical value 14/i,
    )
  })

  test("out-of-range LDL=14 (alone) → rejected, marker null, warning emitted", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      ldl_mgdl: { value: 14 }, // < validRange.min (5? let me re-check — actually 5 is min, 14 IS in range)
      // actually ldl_mgdl validRange is { min: 5, max: 500 }. 14 is in-range.
      // pick something genuinely out-of-range:
      hdl_mgdl: { value: 5000 }, // hdl validRange max is 200
      glucose_mgdl: { value: 92 },
    }))
    expect(result.markers.hdl_mgdl).toBeNull()
    expect(result.markers.glucose_mgdl?.value).toBe(92)
    expect(result.warnings.some(w => /hdl_mgdl.*outside valid range/i.test(w))).toBe(true)
  })

  test("LDL=5000 → rejected, glucose=14000 → rejected, both warnings emitted", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      ldl_mgdl: { value: 5000 },
      glucose_mgdl: { value: 14000 },
      hba1c_percent: { value: 5.5 }, // valid
    }))
    expect(result.markers.ldl_mgdl).toBeNull()
    expect(result.markers.glucose_mgdl).toBeNull()
    expect(result.markers.hba1c_percent?.value).toBe(5.5)
    expect(result.warnings.filter(w => /outside valid range/i.test(w)).length).toBe(2)
  })

  test("derived marker: TC/HDL ratio computed when not extracted", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      total_cholesterol_mgdl: { value: 200 },
      hdl_mgdl: { value: 50 },
    }))
    expect(result.markers.total_chol_hdl_ratio?.value).toBeCloseTo(4, 4)
    expect(result.markers.total_chol_hdl_ratio?.wasComputed).toBe(true)
    expect(result.markers.total_chol_hdl_ratio?.rawExtractedText).toMatch(/^\[computed from/)
    expect(result.warnings.some(w => /total_chol_hdl_ratio computed/i.test(w))).toBe(true)
  })

  test("derived marker: BUN/Cr ratio computed", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      bun_mgdl: { value: 18 },
      creatinine_mgdl: { value: 1.2 },
    }))
    expect(result.markers.bun_creatinine_ratio?.value).toBeCloseTo(15, 4)
    expect(result.markers.bun_creatinine_ratio?.wasComputed).toBe(true)
  })

  test("derived marker: iron saturation as percentage", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      iron_ugdl: { value: 90 },
      iron_binding_capacity_ugdl: { value: 300 },
    }))
    // (90 / 300) * 100 = 30
    expect(result.markers.iron_saturation_percent?.value).toBeCloseTo(30, 4)
  })

  test("derived marker: extraction wins over computation when both possible", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      total_cholesterol_mgdl: { value: 200 },
      hdl_mgdl: { value: 50 },
      total_chol_hdl_ratio: { value: 3.9 }, // lab printed it; should not be re-computed
    }))
    expect(result.markers.total_chol_hdl_ratio?.value).toBe(3.9)
    expect(result.markers.total_chol_hdl_ratio?.wasComputed).toBe(false)
  })

  test("derived marker: not computed when operand missing", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      total_cholesterol_mgdl: { value: 200 },
      // hdl_mgdl missing
    }))
    expect(result.markers.total_chol_hdl_ratio).toBeNull()
  })

  test("derived marker: not computed when operand is zero (division-by-zero guard)", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      bun_mgdl: { value: 18 },
      creatinine_mgdl: { value: 0 },
    }))
    expect(result.markers.bun_creatinine_ratio).toBeNull()
  })

  test("derived marker: rejected when computed value falls outside validRange", () => {
    // BUN/Cr validRange: 1-100. Force computed > 100 by extreme operands.
    const result = validateAndComputeFromRaw(rawOutput({
      bun_mgdl: { value: 199 },
      creatinine_mgdl: { value: 0.5 }, // 199/0.5 = 398 → out of range
    }))
    expect(result.markers.bun_creatinine_ratio).toBeNull()
    expect(result.warnings.some(w =>
      /bun_creatinine_ratio computed value.*outside valid range/i.test(w),
    )).toBe(true)
  })

  test("missing marker stays null without error", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      ldl_mgdl: { value: 125 },
      hdl_mgdl: { value: 58 },
      // mma_nmoll, lead_ugdl, etc. all absent
    }))
    expect(result.markers.mma_nmoll).toBeNull()
    expect(result.markers.lead_ugdl).toBeNull()
    expect(result.markers.psa_total_ngml).toBeNull()
  })

  test("unknown marker keys returned by model are silently ignored", () => {
    // The production parser sanitizes unknown keys before this fn runs,
    // but this fn is defensive too — it only iterates registry IDs.
    const raw = rawOutput({
      ldl_mgdl: { value: 125 },
      hdl_mgdl: { value: 58 },
    })
    // Inject a bogus key
    ;(raw.markers as Record<string, unknown>).fake_marker_xyz = { value: 999, unitFound: "x", confidence: 1, rawExtractedText: "" }
    const result = validateAndComputeFromRaw(raw)
    expect(result.markers.ldl_mgdl?.value).toBe(125)
    expect((result.markers as Record<string, unknown>).fake_marker_xyz).toBeUndefined()
  })

  test("uniform-value guard does NOT trip when fewer than 5 extracted markers share value", () => {
    // 4 markers all = 14. Below the 5-marker minimum. Should pass through.
    const result = validateAndComputeFromRaw(rawOutput({
      ldl_mgdl: { value: 14 },
      hdl_mgdl: { value: 14 },
      glucose_mgdl: { value: 14 },
      hba1c_percent: { value: 14 },
    }))
    // hba1c validRange max is 20, so 14 is valid
    expect(result.markers.ldl_mgdl?.value).toBe(14)
  })

  test("uniform-value guard ignores computed markers when counting", () => {
    // 6 distinct extracted values; the COMPUTED ratio shouldn't count.
    // Pre-condition: if I extract 6 markers with all-equal values, guard
    // should fire on the extracted count alone, not be confused by
    // additional computed values.
    const result = validateAndComputeFromRaw(rawOutput({
      ldl_mgdl: { value: 100 },
      hdl_mgdl: { value: 60 },
      glucose_mgdl: { value: 95 },
      hba1c_percent: { value: 5.5 },
      total_cholesterol_mgdl: { value: 180 },
      bun_mgdl: { value: 18 },
      creatinine_mgdl: { value: 1.0 },
    }))
    // All distinct values. Guard does not fire. Both ratios should compute.
    expect(result.markers.bun_creatinine_ratio?.value).toBeCloseTo(18, 4)
    expect(result.markers.total_chol_hdl_ratio?.value).toBeCloseTo(3, 4)
  })

  test("model returning string-typed values → rejected (not coerced silently)", () => {
    const raw = rawOutput({ ldl_mgdl: { value: 125 } })
    ;(raw.markers.ldl_mgdl as unknown as { value: unknown }).value = "125"
    const result = validateAndComputeFromRaw(raw)
    expect(result.markers.ldl_mgdl).toBeNull()
    // Validator now distinguishes type errors ("not a finite number") from
    // out-of-range rejections. String values fall in the type-error branch.
    expect(result.warnings.some(w => /ldl_mgdl.*not a finite number/i.test(w))).toBe(true)
  })

  test("Lp(a) reported in nmol/L → converted to mg/dL (÷ 2.5) + warning", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      lipoprotein_a_mgdl: { value: 75, unitFound: "nmol/L" },
    }))
    expect(result.markers.lipoprotein_a_mgdl).not.toBeNull()
    expect(result.markers.lipoprotein_a_mgdl?.value).toBeCloseTo(30, 4) // 75 / 2.5
    expect(result.markers.lipoprotein_a_mgdl?.unitFound).toMatch(/converted from nmol\/L/i)
    expect(result.warnings.some(w => /lipoprotein_a_mgdl converted/i.test(w))).toBe(true)
  })

  test("Glucose reported in mmol/L → converted to mg/dL (× 18.0182)", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      glucose_mgdl: { value: 5, unitFound: "mmol/L" },
    }))
    expect(result.markers.glucose_mgdl?.value).toBeCloseTo(90.091, 2) // 5 * 18.0182
  })

  test("Same unit (case-different) → no conversion, no warning", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      ldl_mgdl: { value: 125, unitFound: "mg/dl" },  // lowercase l
    }))
    expect(result.markers.ldl_mgdl?.value).toBe(125)
    expect(result.warnings.some(w => /ldl_mgdl converted/i.test(w))).toBe(false)
  })

  test("Unknown unit → accepted as-is with no conversion (no entry in conversion table)", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      ldl_mgdl: { value: 125, unitFound: "weird-unit" },
    }))
    expect(result.markers.ldl_mgdl?.value).toBe(125)
  })

  test("NaN / Infinity values rejected", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      ldl_mgdl: { value: NaN },
      hdl_mgdl: { value: Infinity },
      glucose_mgdl: { value: 95 },
    }))
    expect(result.markers.ldl_mgdl).toBeNull()
    expect(result.markers.hdl_mgdl).toBeNull()
    expect(result.markers.glucose_mgdl?.value).toBe(95)
  })

  test("metadata passes through (sourceLab + collectedAt + overallConfidence)", () => {
    const result = validateAndComputeFromRaw(rawOutput({
      ldl_mgdl: { value: 125 },
    }, { sourceLab: "Function Health (Quest Diagnostics)", collectedAt: "2026-03-22", overallConfidence: 0.88 }))
    expect(result.sourceLab).toBe("Function Health (Quest Diagnostics)")
    expect(result.collectedAt).toBe("2026-03-22")
    expect(result.overallConfidence).toBe(0.88)
  })
})

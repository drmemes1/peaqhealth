import { detectUniformValueArtifact } from "../uniform-value-guard"

describe("detectUniformValueArtifact", () => {
  test("real lab payload (all distinct values) → null", () => {
    const result = detectUniformValueArtifact({
      ldl_mgdL: 169,
      hdl_mgdL: 64,
      triglycerides_mgdL: 76,
      glucose_mgdL: 101,
      hba1c_pct: 5.7,
      hsCRP_mgL: 0.9,
      apoB_mgdL: 88,
    })
    expect(result).toBeNull()
  })

  test("Function-Health-bug shape (31 markers all = 14) → flagged", () => {
    const m: Record<string, number> = {}
    const fields = [
      "hsCRP_mgL", "vitaminD_ngmL", "apoB_mgdL", "ldl_mgdL", "hdl_mgdL",
      "triglycerides_mgdL", "lpa_mgdL", "glucose_mgdL", "hba1c_pct",
      "totalCholesterol_mgdL", "nonHDL_mgdL", "vldl_mgdL", "egfr_mLmin",
      "creatinine_mgdL", "bun_mgdL", "uricAcid_mgdL", "alt_UL", "ast_UL",
      "alkPhos_UL", "totalBilirubin_mgdL", "albumin_gdL", "wbc_kul",
      "hemoglobin_gdL", "hematocrit_pct", "rdw_pct", "mcv_fL",
      "platelets_kul", "testosterone_ngdL", "shbg_nmolL", "tsh_uIUmL",
      "ferritin_ngmL",
    ]
    for (const f of fields) m[f] = 14
    const result = detectUniformValueArtifact(m)
    expect(result).not.toBeNull()
    expect(result!.value).toBe(14)
    expect(result!.count).toBe(31)
    expect(result!.total).toBe(31)
    expect(result!.ratio).toBeCloseTo(1.0, 4)
  })

  test("ratio exactly 60% → flagged", () => {
    const result = detectUniformValueArtifact({
      a: 7, b: 7, c: 7, d: 7, e: 7, f: 7,    // 6/10 = 60%
      g: 1, h: 2, i: 3, j: 4,
    })
    expect(result).not.toBeNull()
    expect(result!.value).toBe(7)
    expect(result!.ratio).toBeCloseTo(0.6, 4)
  })

  test("ratio just under 60% → null", () => {
    const result = detectUniformValueArtifact({
      a: 7, b: 7, c: 7, d: 7, e: 7,    // 5/10 = 50%
      f: 1, g: 2, h: 3, i: 4, j: 5,
    })
    expect(result).toBeNull()
  })

  test("fewer than 5 populated markers → null even if all identical", () => {
    const result = detectUniformValueArtifact({ a: 14, b: 14, c: 14, d: 14 })
    expect(result).toBeNull()
  })

  test("non-numeric values (strings, null, booleans) ignored", () => {
    const result = detectUniformValueArtifact({
      ldl_mgdL: 169, hdl_mgdL: 64, triglycerides_mgdL: 76,
      glucose_mgdL: 101, hba1c_pct: 5.7,
      labName: "Quest", collectionDate: "2026-04-03",
      is_locked: false, parser_status: "complete",
      vldl_mgdL: null,
    })
    expect(result).toBeNull()
  })

  test("NaN and Infinity ignored (Number.isFinite check)", () => {
    const result = detectUniformValueArtifact({
      ldl_mgdL: 169, hdl_mgdL: 64, glucose_mgdL: 101,
      hba1c_pct: 5.7, alt_UL: 22,
      bad1: NaN, bad2: Infinity, bad3: -Infinity,
    })
    expect(result).toBeNull()
  })

  test("empty payload → null", () => {
    expect(detectUniformValueArtifact({})).toBeNull()
  })

  test("five markers all = 0 → flagged (0 is a valid uniform-artifact signal)", () => {
    const result = detectUniformValueArtifact({
      a: 0, b: 0, c: 0, d: 0, e: 0,
    })
    expect(result).not.toBeNull()
    expect(result!.value).toBe(0)
  })
})

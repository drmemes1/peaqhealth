import { getMarkerStatus } from "../status"

describe("getMarkerStatus — boundary cases from PART 2", () => {
  test("LDL = 169 (lower-favorable) → above / Highest range / amber", () => {
    // 169 is ≥160, so falls into the Highest range band per registry.
    const r = getMarkerStatus(169, "ldl_mgdl")
    expect(r).toEqual({ status: "above", label: "Highest range", pillColor: "amber" })
  })

  test("LDL = 130 → above / Higher range / amber", () => {
    const r = getMarkerStatus(130, "ldl_mgdl")
    expect(r).toEqual({ status: "above", label: "Higher range", pillColor: "amber" })
  })

  test("LDL = 65 → target / Lower range / sage", () => {
    const r = getMarkerStatus(65, "ldl_mgdl")
    expect(r).toEqual({ status: "target", label: "Lower range", pillColor: "sage" })
  })

  test("HDL = 48 (higher-favorable) → target / Mid range / sage", () => {
    // Per spec: 'HDL = 48' is in the 40-60 band which the spec marks as
    // target/Mid range (sage). The '8 below target/Lower range/amber'
    // case in the brief was a typo — the brief's HDL bands list
    // [<40: below/Lower range], [40-60: target/Mid range].
    const r = getMarkerStatus(48, "hdl_mgdl")
    expect(r).toEqual({ status: "target", label: "Mid range", pillColor: "sage" })
  })

  test("HDL = 35 → below / Lower range / amber", () => {
    const r = getMarkerStatus(35, "hdl_mgdl")
    expect(r).toEqual({ status: "below", label: "Lower range", pillColor: "amber" })
  })

  test("Magnesium = 1.6 (mid-favorable) → below / Lower range / amber", () => {
    const r = getMarkerStatus(1.6, "magnesium_mgdl")
    expect(r).toEqual({ status: "below", label: "Lower range", pillColor: "amber" })
  })

  test("Magnesium = 2.0 → target / Target range / sage", () => {
    const r = getMarkerStatus(2.0, "magnesium_mgdl")
    expect(r).toEqual({ status: "target", label: "Target range", pillColor: "sage" })
  })

  test("Magnesium = 2.5 → above / Higher range / amber", () => {
    const r = getMarkerStatus(2.5, "magnesium_mgdl")
    expect(r).toEqual({ status: "above", label: "Higher range", pillColor: "amber" })
  })
})

describe("getMarkerStatus — edge cases", () => {
  test("null value → null", () => {
    expect(getMarkerStatus(null, "ldl_mgdl")).toBeNull()
  })

  test("unknown marker id → null", () => {
    expect(getMarkerStatus(100, "fake_marker")).toBeNull()
  })

  test("marker without statusBands → null", () => {
    expect(getMarkerStatus(100, "rdw_percent")).toBeNull()
  })

  test("value below first band's min → falls into first band", () => {
    // ldl_mgdl first band is min=NEGATIVE_INFINITY, so any low value falls there.
    const r = getMarkerStatus(0.1, "ldl_mgdl")
    expect(r?.label).toBe("Lower range")
  })

  test("value above last band's max → falls into last band", () => {
    // ldl_mgdl last band is min=160, max=null. Any value ≥160 lands here.
    const r = getMarkerStatus(99999, "ldl_mgdl")
    expect(r?.label).toBe("Highest range")
  })

  test("boundary value uses lower band (max is exclusive)", () => {
    // ldl_mgdl: 70 is the boundary — should fall into [70, 100) Mid range,
    // not the [<70, 70) Lower range band.
    const r = getMarkerStatus(70, "ldl_mgdl")
    expect(r?.label).toBe("Mid range")
  })

  test("higher-favorable HDL = 80 → target / Higher range / sage", () => {
    const r = getMarkerStatus(80, "hdl_mgdl")
    expect(r).toEqual({ status: "target", label: "Higher range", pillColor: "sage" })
  })

  test("vitamin_d_ngml = 100 (higher-favorable) → above / Highest range / sage", () => {
    // Per brief: "'above' on higher-favorable markers: sage".
    // Toxicity at very high vitamin D is real but the spec's color logic
    // treats higher-favorable + above as still favorable for the pill.
    // Caveat copy lives in the descriptor, not the pill color.
    const r = getMarkerStatus(100, "vitamin_d_ngml")
    expect(r).toEqual({ status: "above", label: "Highest range", pillColor: "sage" })
  })
})

import { getMarkerStatus } from "../status"

// Assertions use toMatchObject so the test stays stable as fields are added.
// Status semantics now mirror the blood panel page: 3-state Optimal /
// Watch / Attention with green / amber / red pill colors.

describe("getMarkerStatus — boundary cases (Optimal / Watch / Attention)", () => {
  test("LDL = 169 → Highest range; 2 bands from target → Attention/red", () => {
    // LDL bands: target/Lower(<70), target/Mid(70–100), above/Higher(100–160), above/Highest(160+).
    // Highest band index 3 is 2 away from nearest target band (index 1) → Attention.
    const r = getMarkerStatus(169, "ldl_mgdl")
    expect(r).toMatchObject({
      label: "Highest range", status: "above",
      displayStatus: "attention", displayLabel: "Attention", pillColor: "red",
    })
  })

  test("LDL = 130 → Higher range; adjacent to target → Watch/amber", () => {
    const r = getMarkerStatus(130, "ldl_mgdl")
    expect(r).toMatchObject({
      label: "Higher range", status: "above",
      displayStatus: "watch", displayLabel: "Watch", pillColor: "amber",
    })
  })

  test("LDL = 65 → Lower range (target) → Optimal/green", () => {
    const r = getMarkerStatus(65, "ldl_mgdl")
    expect(r).toMatchObject({
      label: "Lower range", status: "target",
      displayStatus: "optimal", displayLabel: "Optimal", pillColor: "green",
    })
  })

  test("HDL = 35 → below/Lower range; adjacent to target → Watch/amber", () => {
    const r = getMarkerStatus(35, "hdl_mgdl")
    expect(r).toMatchObject({
      label: "Lower range", status: "below",
      displayStatus: "watch", displayLabel: "Watch", pillColor: "amber",
    })
  })

  test("HDL = 48 → target/Mid range → Optimal/green", () => {
    const r = getMarkerStatus(48, "hdl_mgdl")
    expect(r).toMatchObject({
      label: "Mid range", status: "target",
      displayStatus: "optimal", displayLabel: "Optimal", pillColor: "green",
    })
  })

  test("HDL = 80 → target/Higher range → Optimal/green", () => {
    const r = getMarkerStatus(80, "hdl_mgdl")
    expect(r).toMatchObject({
      label: "Higher range", status: "target",
      displayStatus: "optimal", displayLabel: "Optimal", pillColor: "green",
    })
  })

  test("Magnesium = 1.6 → below/Lower range; adjacent to target → Watch/amber", () => {
    const r = getMarkerStatus(1.6, "magnesium_mgdl")
    expect(r).toMatchObject({
      label: "Lower range", status: "below",
      displayStatus: "watch", displayLabel: "Watch", pillColor: "amber",
    })
  })

  test("Magnesium = 2.0 → target/Target range → Optimal/green", () => {
    const r = getMarkerStatus(2.0, "magnesium_mgdl")
    expect(r).toMatchObject({
      label: "Target range", status: "target",
      displayStatus: "optimal", displayLabel: "Optimal", pillColor: "green",
    })
  })

  test("Magnesium = 2.5 → above/Higher range; adjacent to target → Watch/amber", () => {
    const r = getMarkerStatus(2.5, "magnesium_mgdl")
    expect(r).toMatchObject({
      label: "Higher range", status: "above",
      displayStatus: "watch", displayLabel: "Watch", pillColor: "amber",
    })
  })

  test("Glucose = 110 → Higher range; adjacent to target → Watch/amber", () => {
    const r = getMarkerStatus(110, "glucose_mgdl")
    expect(r).toMatchObject({
      label: "Higher range", status: "above",
      displayStatus: "watch", pillColor: "amber",
    })
  })

  test("Glucose = 200 → Highest range; 2 bands from target → Attention/red", () => {
    const r = getMarkerStatus(200, "glucose_mgdl")
    expect(r).toMatchObject({
      label: "Highest range", status: "above",
      displayStatus: "attention", pillColor: "red",
    })
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
    const r = getMarkerStatus(0.1, "ldl_mgdl")
    expect(r?.label).toBe("Lower range")
  })

  test("value above last band's max → falls into last band", () => {
    const r = getMarkerStatus(99999, "ldl_mgdl")
    expect(r?.label).toBe("Highest range")
  })

  test("boundary value uses upper band (max is exclusive)", () => {
    const r = getMarkerStatus(70, "ldl_mgdl")
    expect(r?.label).toBe("Mid range")
    expect(r?.displayStatus).toBe("optimal")
  })

  test("vitamin_d = 100 → Highest range (above); adjacent to target → Watch/amber", () => {
    // Vitamin D bands: below/Lower(<30), target/Mid(30–50), target/Higher(50–80), above/Highest(80+).
    // Highest at index 3; nearest target is index 2 — distance 1 → Watch.
    const r = getMarkerStatus(100, "vitamin_d_ngml")
    expect(r).toMatchObject({
      label: "Highest range", status: "above",
      displayStatus: "watch", pillColor: "amber",
    })
  })
})

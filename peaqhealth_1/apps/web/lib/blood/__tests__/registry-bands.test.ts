import { BLOOD_MARKER_REGISTRY, type StatusBand } from "../markerRegistry"

const MARKERS_WITH_BANDS = [
  "ldl_mgdl", "hdl_mgdl", "total_cholesterol_mgdl", "triglycerides_mgdl",
  "apob_mgdl", "lipoprotein_a_mgdl", "hs_crp_mgl", "hba1c_percent",
  "glucose_mgdl", "insulin_uiuml", "magnesium_mgdl", "vitamin_d_ngml",
]

describe("statusBands — well-formed for each populated marker", () => {
  for (const id of MARKERS_WITH_BANDS) {
    const m = BLOOD_MARKER_REGISTRY.find(x => x.id === id)
    if (!m) {
      test(`${id} is in the registry`, () => {
        expect(m).toBeDefined()
      })
      continue
    }

    describe(`${id}`, () => {
      test("has statusBands populated", () => {
        expect(m.statusBands).toBeDefined()
        expect(m.statusBands!.length).toBeGreaterThan(0)
      })

      test("has favorableDirection set", () => {
        expect(m.favorableDirection).toBeDefined()
      })

      test("bands are continuous (no gaps)", () => {
        const bands = m.statusBands!
        for (let i = 0; i < bands.length - 1; i++) {
          const cur = bands[i]
          const next = bands[i + 1]
          expect(cur.max).toBe(next.min)
        }
      })

      test("bands are non-overlapping (each band's max equals next band's min)", () => {
        // Same as continuous when max is exclusive and matches next.min.
        const bands = m.statusBands!
        const mins = bands.map(b => b.min)
        // Mins should be strictly ascending
        for (let i = 1; i < mins.length; i++) {
          expect(mins[i]).toBeGreaterThan(mins[i - 1])
        }
      })

      test("first band's min covers validRange.min (≤)", () => {
        const bands = m.statusBands!
        expect(bands[0].min).toBeLessThanOrEqual(m.validRange.min)
      })

      test("last band's max is null OR ≥ validRange.max", () => {
        const bands = m.statusBands!
        const last = bands[bands.length - 1]
        if (last.max != null) {
          expect(last.max).toBeGreaterThanOrEqual(m.validRange.max)
        }
      })

      test("each band has a non-empty voice-compliant label", () => {
        const allowed: StatusBand["label"][] = [
          "Lower range", "Mid range", "Higher range", "Highest range",
          "Target range", "Above target", "Below target",
        ]
        for (const b of m.statusBands!) {
          expect(allowed).toContain(b.label)
        }
      })
    })
  }
})

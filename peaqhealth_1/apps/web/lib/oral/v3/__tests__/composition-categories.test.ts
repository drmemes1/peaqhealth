import {
  categorizeKey,
  categorizeSpecies,
  COMPOSITION_CATEGORIES_ORDERED,
} from "../composition-categories"

describe("categorizeSpecies", () => {
  test("buffering — known ADS commensals", () => {
    expect(categorizeSpecies("Streptococcus", "sanguinis")).toBe("buffering")
    expect(categorizeSpecies("Streptococcus", "gordonii")).toBe("buffering")
    expect(categorizeSpecies("Actinomyces", "naeslundii")).toBe("buffering")
  })

  test("nr_favorable — Tier 1/2 nitrate reducers", () => {
    expect(categorizeSpecies("Neisseria", "mucosa")).toBe("nr_favorable")
    expect(categorizeSpecies("Rothia", "mucilaginosa")).toBe("nr_favorable")
    expect(categorizeSpecies("Haemophilus", "parainfluenzae")).toBe("nr_favorable")
  })

  test("cariogenic — known acid producers", () => {
    expect(categorizeSpecies("Streptococcus", "mutans")).toBe("cariogenic")
    expect(categorizeSpecies("Streptococcus", "sobrinus")).toBe("cariogenic")
    expect(categorizeSpecies("Selenomonas", "sputigena")).toBe("cariogenic")
  })

  test("genus fallback — Scardovia → cariogenic, Veillonella → context_dependent", () => {
    expect(categorizeSpecies("Scardovia", null)).toBe("cariogenic")
    expect(categorizeSpecies("Veillonella", "atypica")).toBe("context_dependent")
    expect(categorizeSpecies("Prevotella", "pallens")).toBe("context_dependent")
  })

  test("genus fallback — Neisseria/Rothia default to nr_favorable", () => {
    expect(categorizeSpecies("Neisseria", "elongata")).toBe("nr_favorable")
    expect(categorizeSpecies("Rothia", "aeria")).toBe("nr_favorable")
  })

  test("unknown genus → unclassified", () => {
    expect(categorizeSpecies("Foobacter", "fakeus")).toBe("unclassified")
    expect(categorizeSpecies("Bogus", null)).toBe("unclassified")
  })
})

describe("categorizeKey — handles raw_otu_table key shapes", () => {
  test("space-delimited Genus species", () => {
    expect(categorizeKey("Streptococcus sanguinis")).toBe("buffering")
    expect(categorizeKey("Streptococcus mutans")).toBe("cariogenic")
  })

  test("multi-species blob splits on '-' and matches any alternative", () => {
    expect(categorizeKey("Neisseria mucosa-perflava-subflava")).toBe("nr_favorable")
    expect(categorizeKey("Streptococcus salivarius-vestibularis")).toBe("unclassified") // not in registry
  })

  test("genus only — falls back to genus map", () => {
    expect(categorizeKey("Scardovia")).toBe("cariogenic")
    expect(categorizeKey("Veillonella")).toBe("context_dependent")
  })

  test("unknown key → unclassified", () => {
    expect(categorizeKey("NA sp33423")).toBe("unclassified")
  })

  test("empty/whitespace → unclassified", () => {
    expect(categorizeKey("")).toBe("unclassified")
    expect(categorizeKey("   ")).toBe("unclassified")
  })
})

describe("COMPOSITION_CATEGORIES_ORDERED", () => {
  test("contains all five categories in stable order", () => {
    expect(COMPOSITION_CATEGORIES_ORDERED).toEqual([
      "buffering",
      "nr_favorable",
      "cariogenic",
      "context_dependent",
      "unclassified",
    ])
  })
})

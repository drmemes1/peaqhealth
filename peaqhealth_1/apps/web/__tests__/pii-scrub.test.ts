import { stripPII } from "../lib/pii-scrub"

const SAMPLE_LAB_HEADER = `
LabCorp
Patient Name: Jane Doe
DOB: 01/15/1985
SSN: 123-45-6789
MRN: 9876543
123 Main Street, Springfield, IL 62701
Phone: (555) 867-5309
Email: jane.doe@email.com
Ordering Physician: Dr. Smith
Collection Date: 2025-06-01

COMPREHENSIVE METABOLIC PANEL
Glucose             101        mg/dL      70-99
BUN                 14         mg/dL      7-25
Creatinine          0.87       mg/dL      0.57-1.00
eGFR                >60        mL/min
Sodium              140        mmol/L     135-146
ALT                 22         U/L        7-56
Albumin             4.2        g/dL       3.5-5.0

LIPID PANEL
LDL Cholesterol     118        mg/dL      <100
HDL Cholesterol     58         mg/dL      >40
Triglycerides       95         mg/dL      <150
Total Cholesterol   194        mg/dL      <200

HbA1c               5.4        %          <5.7
hs-CRP              0.8        mg/L       <1.0
Vitamin D, 25-OH    42         ng/mL      30-100
`.trim()

describe("stripPII", () => {
  let result: string

  beforeAll(() => {
    result = stripPII(SAMPLE_LAB_HEADER)
  })

  // ── PII is removed ────────────────────────────────────────────────────────

  it("redacts patient name", () => {
    expect(result).not.toMatch("Jane Doe")
    expect(result).toMatch(/Patient Name:\s*\[REDACTED\]/i)
  })

  it("redacts date of birth", () => {
    expect(result).not.toMatch("01/15/1985")
    expect(result).toMatch(/DOB:\s*\[REDACTED\]/i)
  })

  it("redacts bare SSN pattern", () => {
    expect(result).not.toMatch("123-45-6789")
  })

  it("redacts MRN", () => {
    expect(result).not.toMatch("9876543")
    expect(result).toMatch(/MRN:\s*\[REDACTED\]/i)
  })

  it("redacts street address", () => {
    expect(result).not.toMatch("123 Main Street")
    expect(result).toMatch(/\[ADDRESS REDACTED\]/i)
  })

  it("redacts phone number", () => {
    expect(result).not.toMatch("(555) 867-5309")
    expect(result).toMatch(/\[PHONE REDACTED\]/i)
  })

  it("redacts email address", () => {
    expect(result).not.toMatch("jane.doe@email.com")
    expect(result).toMatch(/\[EMAIL REDACTED\]/i)
  })

  // ── Biomarker values are preserved ───────────────────────────────────────

  it("preserves glucose value", () => {
    expect(result).toMatch("Glucose")
    expect(result).toMatch("101")
  })

  it("preserves LDL value", () => {
    expect(result).toMatch("LDL Cholesterol")
    expect(result).toMatch("118")
  })

  it("preserves HDL value", () => {
    expect(result).toMatch("HDL Cholesterol")
    expect(result).toMatch("58")
  })

  it("preserves HbA1c value", () => {
    expect(result).toMatch("HbA1c")
    expect(result).toMatch("5.4")
  })

  it("preserves hs-CRP value", () => {
    expect(result).toMatch("hs-CRP")
    expect(result).toMatch("0.8")
  })

  it("preserves Vitamin D value", () => {
    expect(result).toMatch("Vitamin D")
    expect(result).toMatch("42")
  })

  it("preserves reference ranges", () => {
    expect(result).toMatch("70-99")
    expect(result).toMatch("30-100")
  })

  it("preserves collection date", () => {
    expect(result).toMatch("Collection Date: 2025-06-01")
  })

  it("preserves lab name", () => {
    expect(result).toMatch("LabCorp")
  })

  it("preserves units", () => {
    expect(result).toMatch("mg/dL")
    expect(result).toMatch("mmol/L")
    expect(result).toMatch("ng/mL")
  })
})

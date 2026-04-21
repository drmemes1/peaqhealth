export const FORBIDDEN_SURFACE_PHRASES = [
  // Diagnostic/clinical verdicts
  "at risk for",
  "risk of",
  "elevated risk",
  "indicates",
  "concerning",
  "abnormal",
  "obstructive sleep apnea",
  "prediabetes",
  "pre-diagnosis",
  "diagnosis",

  // Predictive language
  "likely to develop",
  "will develop",
  "will cause",
  "will improve",
  "will lower",
  "will raise",
  "higher likely",
  "elevated likely",

  // Directive language
  "should start",
  "must do",
  "need to",
  "you should",
  "you must",
  "you need to",

  // Prior violations (locked)
  "you have concurrent",
  "you have active signals",
  "accelerated biological aging",
  "increases plaque risk",

  // Borderline overreactions (v3.1)
  "significantly elevated",
  "concerning pattern",
  "worth deeper investigation",
  "metabolic processes that may",

  // Naming ruled-out conditions (v3.2)
  "not sleep apnea",
  "no signs of",
  "not diabetic",
  "not concerning for",
  "differs from",
  "rule out",
  "ruled out",
  "not osa",
]

export const BORDERLINE_THRESHOLDS: Record<string, { cutoff: number; zone: number }> = {
  glucose_mgdl: { cutoff: 100, zone: 105 },
  hba1c_pct: { cutoff: 5.7, zone: 5.9 },
  ldl_mgdl: { cutoff: 100, zone: 105 },
  triglycerides_mgdl: { cutoff: 150, zone: 158 },
  hs_crp_mgl: { cutoff: 1.0, zone: 1.05 },
  alt_ul: { cutoff: 40, zone: 42 },
  ast_ul: { cutoff: 40, zone: 42 },
  tsh_uiuml: { cutoff: 4.0, zone: 4.2 },
}

export function isBorderlineValue(marker: string, value: number): boolean {
  const t = BORDERLINE_THRESHOLDS[marker]
  if (!t) return false
  return value >= t.cutoff && value <= t.zone
}

export function checkCopyForToneViolations(copy: string): string[] {
  const violations: string[] = []
  const lower = copy.toLowerCase()
  for (const phrase of FORBIDDEN_SURFACE_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      violations.push(phrase)
    }
  }
  return violations
}

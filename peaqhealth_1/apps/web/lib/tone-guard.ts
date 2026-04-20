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
]

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

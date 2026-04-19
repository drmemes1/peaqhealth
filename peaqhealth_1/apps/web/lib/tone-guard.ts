export const FORBIDDEN_SURFACE_PHRASES = [
  "at risk for",
  "risk of",
  "elevated risk",
  "indicates",
  "concerning",
  "abnormal",
  "obstructive sleep apnea",
  "prediabetes",
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

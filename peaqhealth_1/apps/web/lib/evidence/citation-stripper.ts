export interface StripResult {
  cleanedText: string
  citationsFound: string[]
  hadHallucinations: boolean
}

export function stripInlineCitations(text: string): StripResult {
  const found: string[] = []
  let cleaned = text

  const patterns: RegExp[] = [
    /\([A-Z][a-z]+(?:\s+et\s+al\.?,?)?\s+(?:19|20)\d{2}\)/g,
    /\b[A-Z][a-z]+(?:\s+et\s+al\.?,?)?\s+(?:19|20)\d{2}\b/g,
    /\b(?:JAMA|NEJM|BMJ|JACC|Circulation|Nature|Science|Cell|Lancet|PLoS\s+ONE|Frontiers)\s+(?:19|20)\d{2}\b/gi,
    /\b(?:NHANES|Hisayama|ORIGINS|Tohoku Medical Megabank|ARIC|Framingham)\b/g,
  ]

  for (const pattern of patterns) {
    const matches = cleaned.match(pattern) || []
    found.push(...matches)
    cleaned = cleaned.replace(pattern, "")
  }

  cleaned = cleaned
    .replace(/\s+([.,;])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/,\s*,/g, ",")
    .replace(/\.\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim()

  const unique = [...new Set(found)]

  return {
    cleanedText: cleaned,
    citationsFound: unique,
    hadHallucinations: unique.length > 0,
  }
}

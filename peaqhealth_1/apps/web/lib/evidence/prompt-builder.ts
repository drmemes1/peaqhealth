import type { RelevantStudy } from "./relevant-evidence"

export function buildEvidencePromptSection(studies: RelevantStudy[]): string {
  if (studies.length === 0) return ""

  const findings = studies
    .map(s => `- ${s.finding}${s.population ? `\n  (Population context: ${s.population})` : ""}`)
    .join("\n\n")

  return `

EVIDENCE GROUNDING (use these as your sole source of truth for claims):

The following research findings are what you may draw on. Treat them as the only verified facts about this topic. Use them to inform what you say, but do not name studies, authors, years, or journals in your output.

VERIFIED FINDINGS:
${findings}

VOICE INSTRUCTIONS FOR EVIDENCE:
- Write conversationally, like a doctor talking to a patient
- NEVER include citations like "Smith 2023" or "a study in JAMA" in the output
- NEVER reference study names, journal names, dataset names, or author names
- DO use phrases like "research suggests," "studies have shown," "in population data" — these are fine because they're general
- If a claim isn't supported by the verified findings above, soften the language or omit it
- Do not invent statistics or sample sizes that aren't in the verified findings
`
}

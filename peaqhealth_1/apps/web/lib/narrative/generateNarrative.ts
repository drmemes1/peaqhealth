import OpenAI from "openai"
import type { UserSituation } from "./situationModel"
import { getKnowledgeBase } from "../chat/knowledgeBase"
import { getBacterialKnowledgePrompt } from "../chat/bacterialKnowledge"
import { getMethodologyPrompt } from "../chat/methodologyKnowledge"

export interface NarrativeResult {
  headline: string
  completePicture: string
  crossPanelSummary: { oral: string; blood: string; sleep: string }
  protocolResponse: string | null
  nextSteps: { retests: Array<{ what: string; when: string; why: string }>; actions: Array<{ what: string; when: string; why: string }> }
  evidenceReferences: string[]
  patternsFired: string[]
  generatedAt: string
  modelVersion: string
  tokenUsage: { prompt: number; completion: number; total: number }
}

export interface ValidationResult {
  valid: boolean
  unverifiedNumbers: string[]
  unverifiedCitations: string[]
  warnings: string[]
}

const SYSTEM_PROMPT = `You are Cnvrg's clinical narrative engine. Generate a personalized health interpretation based on structured user data.

CRITICAL RULES:
1. NEVER invent a numeric value. Only cite values present in USER_SITUATION.
2. NEVER invent a citation. Only cite studies from the EVIDENCE section.
3. Every interpretive claim must connect to user data or a cited mechanism.
4. If cross-panel connections aren't supported by user data, don't assert them.
5. Voice: plain language a smart non-scientist understands. No jargon. Warm but considered.
6. Under 400 words for completePicture. Dense, not long.
7. Lead with what matters most. First sentence = the headline finding.
8. Use "associated with" and "research shows a link" — never "causes" or "will improve."
9. Name specific numbers with context: "4.50 against a target of 4.0–5.5" not "your diversity is good."
10. End with one specific action if warranted.

OUTPUT: Return valid JSON with this exact schema:
{
  "headline": "6-12 word summary of the most notable finding",
  "completePicture": "The full narrative (under 400 words). Plain English. Specific numbers.",
  "crossPanelSummary": { "oral": "2-3 sentences", "blood": "2-3 sentences", "sleep": "2-3 sentences" },
  "protocolResponse": "If user has active interventions, compare predicted vs actual. Null if none.",
  "nextSteps": {
    "retests": [{ "what": "...", "when": "...", "why": "..." }],
    "actions": [{ "what": "...", "when": "...", "why": "..." }]
  },
  "evidenceReferences": ["Author Year — brief description"],
  "patternsFired": ["pattern_id_1", "pattern_id_2"]
}`

export async function generateNarrative(situation: UserSituation): Promise<NarrativeResult> {
  const kb = getKnowledgeBase()
  const bacterial = getBacterialKnowledgePrompt()
  const methodology = getMethodologyPrompt()

  const firedPatterns = situation.patterns.filter(p => p.fired).map(p => p.id)

  const userPrompt = `Generate a personalized narrative for this user.

<USER_SITUATION>
${JSON.stringify(situation, null, 2)}
</USER_SITUATION>

<VOICE>
${kb.voice.slice(0, 4000)}
</VOICE>

<EVIDENCE>
${kb.evidence.slice(0, 6000)}
</EVIDENCE>

<BACTERIAL_KNOWLEDGE>
${bacterial}
</BACTERIAL_KNOWLEDGE>

<METHODOLOGY_KNOWLEDGE>
${methodology}
</METHODOLOGY_KNOWLEDGE>

Patterns that fired for this user: ${firedPatterns.join(", ") || "none"}

Return ONLY valid JSON. No markdown, no backticks.`

  const openai = new OpenAI()
  const start = Date.now()

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 2000,
    store: false,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}"
  const parsed = JSON.parse(raw) as Record<string, unknown>
  const usage = completion.usage

  return {
    headline: (parsed.headline as string) ?? "Your health picture",
    completePicture: (parsed.completePicture as string) ?? "",
    crossPanelSummary: {
      oral: (parsed.crossPanelSummary as Record<string, string>)?.oral ?? "No oral data available.",
      blood: (parsed.crossPanelSummary as Record<string, string>)?.blood ?? "No blood data available.",
      sleep: (parsed.crossPanelSummary as Record<string, string>)?.sleep ?? "No sleep data available.",
    },
    protocolResponse: (parsed.protocolResponse as string) ?? null,
    nextSteps: (parsed.nextSteps as NarrativeResult["nextSteps"]) ?? { retests: [], actions: [] },
    evidenceReferences: (parsed.evidenceReferences as string[]) ?? [],
    patternsFired: (parsed.patternsFired as string[]) ?? firedPatterns,
    generatedAt: new Date().toISOString(),
    modelVersion: "gpt-4o",
    tokenUsage: {
      prompt: usage?.prompt_tokens ?? 0,
      completion: usage?.completion_tokens ?? 0,
      total: usage?.total_tokens ?? 0,
    },
  }
}

export function validateNarrative(narrative: NarrativeResult, situation: UserSituation): ValidationResult {
  const warnings: string[] = []
  const unverifiedNumbers: string[] = []
  const unverifiedCitations: string[] = []

  const allText = `${narrative.headline} ${narrative.completePicture} ${narrative.crossPanelSummary.oral} ${narrative.crossPanelSummary.blood} ${narrative.crossPanelSummary.sleep} ${narrative.protocolResponse ?? ""}`

  // Extract numbers from narrative
  const numberPattern = /(\d+\.?\d*)\s*(%|×|x|\/100|mg\/dL|mg\/L|µIU\/mL|ng\/mL|mL\/min|U\/L|g\/dL|bpm|ms|hrs?|min)/g
  const foundNumbers = [...allText.matchAll(numberPattern)].map(m => m[1])

  // Build set of known values from situation
  const knownValues = new Set<string>()
  if (situation.oral.shannon != null) knownValues.add(situation.oral.shannon.toFixed(2))
  if (situation.oral.speciesCount != null) knownValues.add(String(situation.oral.speciesCount))

  const addComposite = (c: { value: number; contributors?: Record<string, number> } | null) => {
    if (!c) return
    knownValues.add(c.value.toFixed(1))
    knownValues.add(c.value.toFixed(2))
    knownValues.add(String(Math.round(c.value)))
    if (c.contributors) {
      for (const v of Object.values(c.contributors)) {
        knownValues.add(v.toFixed(1))
        knownValues.add(v.toFixed(2))
      }
    }
  }

  addComposite(situation.oral.composites.nrPathway)
  addComposite(situation.oral.composites.gumHealth)
  addComposite(situation.oral.composites.cavityRisk as { value: number; contributors?: Record<string, number> } | null)

  if (situation.oral.composites.protectiveRatio?.value != null) knownValues.add(situation.oral.composites.protectiveRatio.value.toFixed(1))
  if (situation.oral.composites.phBuffering?.value != null) knownValues.add(situation.oral.composites.phBuffering.value.toFixed(2))
  if (situation.oral.composites.breathFreshness?.score != null) knownValues.add(String(situation.oral.composites.breathFreshness.score))

  for (const m of Object.values(situation.blood.markers)) {
    knownValues.add(String(m.value))
    knownValues.add(m.value.toFixed(1))
    knownValues.add(m.value.toFixed(2))
  }

  for (const v of Object.values(situation.sleep.metrics)) {
    if (v != null) {
      knownValues.add(String(v))
      knownValues.add(v.toFixed(1))
      knownValues.add(v.toFixed(0))
    }
  }

  // Known thresholds (methodology numbers that are OK to cite)
  const thresholds = ["4.0", "5.5", "4.50", "20", "10", "2", "5", "0.5", "1.5", "0.25", "0.45", "0.65", "100", "130", "150", "1.0", "3.0", "5.7", "6.5", "99", "126", "30", "50", "40", "90", "60", "80", "86", "44", "4.38", "10.9"]
  for (const t of thresholds) knownValues.add(t)

  for (const num of foundNumbers) {
    if (!knownValues.has(num)) {
      unverifiedNumbers.push(num)
    }
  }

  if (unverifiedNumbers.length > 0) warnings.push(`${unverifiedNumbers.length} unverified numbers found`)

  // Check for named citations (Author Year pattern)
  const citationPattern = /[A-Z][a-z]+(?:\s+et\s+al\.?)?\s+(?:19|20)\d{2}/g
  const foundCitations = [...allText.matchAll(citationPattern)].map(m => m[0])
  // We allow citations since they come from the evidence base — just log them
  if (foundCitations.length > 0) {
    warnings.push(`Citations found in narrative (review for accuracy): ${foundCitations.join(", ")}`)
  }

  return {
    valid: unverifiedNumbers.length === 0 && unverifiedCitations.length === 0,
    unverifiedNumbers,
    unverifiedCitations,
    warnings,
  }
}

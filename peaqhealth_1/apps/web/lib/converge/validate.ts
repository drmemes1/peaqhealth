import type { UserPanelContext } from "../user-context"
import type { ConvergeObservation } from "./observations"
import { FORBIDDEN_SURFACE_PHRASES } from "../tone-guard"

export function validateConvergeContent(
  content: string,
  ctx: UserPanelContext,
  observations: ConvergeObservation[],
): string[] {
  const issues: string[] = []
  const lower = content.toLowerCase()

  // Tone guard — forbidden phrases
  for (const phrase of FORBIDDEN_SURFACE_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      issues.push(`Forbidden phrase: "${phrase}"`)
    }
  }

  // Consistency checks (from existing validateContent)
  if (ctx.hasBloodPanel && (lower.includes("upload your blood") || lower.includes("uploading your blood panel"))) {
    issues.push("Suggests uploading blood panel but user has one")
  }
  if (ctx.hasWearable && (lower.includes("connect a wearable") || lower.includes("connecting a wearable"))) {
    issues.push("Suggests connecting wearable but user has one")
  }
  if (ctx.hasQuestionnaire && lower.includes("complete the questionnaire")) {
    issues.push("Suggests completing questionnaire but user has done so")
  }
  if (ctx.hasOralKit && lower.includes("upload your oral")) {
    issues.push("Suggests uploading oral data but user has kit results")
  }

  // Cross-panel claim validation
  for (const obs of observations) {
    if (obs.panels.length >= 2) {
      const claimText = `${obs.title} ${obs.oneLiner} ${obs.narrative}`.toLowerCase()
      if (claimText.includes("two sources") || claimText.includes("two independent") || claimText.includes("cross-panel")) {
        const panelsPresent = obs.panels.filter(p =>
          p === "oral" ? ctx.hasOralKit :
          p === "blood" ? ctx.hasBloodPanel :
          p === "sleep" ? ctx.hasWearable :
          p === "questionnaire" ? ctx.hasQuestionnaire :
          false
        )
        if (panelsPresent.length < 2) {
          issues.push(`Observation "${obs.id}" claims cross-panel but only ${panelsPresent.length} panel(s) present`)
        }
      }
    }
  }

  // Chain validation — should contain causal language
  for (const obs of observations) {
    if (obs.chain) {
      const chainLower = obs.chain.text.toLowerCase()
      const hasCausal = chainLower.includes("→") || chainLower.includes("leads to") ||
        chainLower.includes("drives") || chainLower.includes("triggers") ||
        chainLower.includes("causes") || chainLower.includes("results in") ||
        chainLower.includes("contributes") || chainLower.includes("=")
      if (!hasCausal) {
        issues.push(`Chain for "${obs.id}" lacks causal language (no → or causal verbs)`)
      }
    }
  }

  return issues
}

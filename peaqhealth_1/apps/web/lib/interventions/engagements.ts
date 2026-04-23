import type { Intervention } from "./registry"

export interface Engagement {
  intervention_id: string
  action: "committed" | "already_doing" | "not_relevant"
  created_at: string
  retracted_at: string | null
}

export type InterventionState = "actionable" | "committed" | "already_doing" | "hidden"

export interface InterventionWithState extends Intervention {
  state: InterventionState
  committedAt?: string
}

export function applyEngagements(
  interventions: Intervention[],
  engagements: Engagement[],
): InterventionWithState[] {
  const activeEngagements = new Map<string, Engagement>()
  for (const e of engagements) {
    if (e.retracted_at) continue
    const existing = activeEngagements.get(e.intervention_id)
    if (!existing || e.created_at > existing.created_at) {
      activeEngagements.set(e.intervention_id, e)
    }
  }

  const result: InterventionWithState[] = []
  for (const intervention of interventions) {
    const eng = activeEngagements.get(intervention.id)
    if (!eng) {
      result.push({ ...intervention, state: "actionable" })
    } else if (eng.action === "not_relevant") {
      continue
    } else if (eng.action === "already_doing") {
      result.push({ ...intervention, state: "already_doing" })
    } else if (eng.action === "committed") {
      result.push({ ...intervention, state: "committed", committedAt: eng.created_at })
    }
  }

  return result
}

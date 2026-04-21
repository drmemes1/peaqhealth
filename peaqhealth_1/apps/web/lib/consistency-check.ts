import type { UserPanelContext } from "./user-context"

export function validateContent(content: string, ctx: UserPanelContext, source: string): void {
  const issues: string[] = []
  const lower = content.toLowerCase()

  if (ctx.hasBloodPanel && lower.includes("uploading your blood panel")) {
    issues.push("Suggests uploading blood panel but user has one")
  }
  if (ctx.hasBloodPanel && lower.includes("upload your blood")) {
    issues.push("Suggests uploading blood but user has data")
  }
  if (ctx.hasWearable && lower.includes("connect a wearable")) {
    issues.push("Suggests connecting wearable but user has one")
  }
  if (ctx.hasWearable && lower.includes("connecting a wearable")) {
    issues.push("Suggests connecting wearable but user has one")
  }
  if (ctx.hasQuestionnaire && lower.includes("complete the questionnaire")) {
    issues.push("Suggests completing questionnaire but user has done so")
  }
  if (ctx.hasOralKit && lower.includes("upload your oral")) {
    issues.push("Suggests uploading oral data but user has kit results")
  }

  if (issues.length > 0) {
    const message = `[consistency] ${source}: ${issues.join("; ")} | content: "${content.substring(0, 150)}..."`
    console.warn(message)
  }
}

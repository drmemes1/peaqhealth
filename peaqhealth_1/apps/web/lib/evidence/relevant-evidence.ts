import { createClient as createServiceClient } from "@supabase/supabase-js"

export interface EvidenceContext {
  panel: "oral" | "blood" | "sleep" | "cross-panel"
  category?: string
  topics?: string[]
  maxStudies?: number
  minConfidence?: "high" | "medium" | "low"
}

export interface RelevantStudy {
  shortRef: string
  finding: string
  population: string
  confidence: string
}

const CONFIDENCE_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 }

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function getRelevantEvidence(ctx: EvidenceContext): Promise<RelevantStudy[]> {
  const limit = ctx.maxStudies ?? 6
  const minConf = ctx.minConfidence ?? "medium"
  const minConfVal = CONFIDENCE_ORDER[minConf] ?? 2

  const db = svc()

  let query = db
    .from("evidence_library")
    .select("first_author, year, primary_finding, population_description, internal_confidence")
    .eq("public_facing", true)
    .contains("panels", [ctx.panel])
    .order("year", { ascending: false })
    .limit(limit * 3)

  if (ctx.topics && ctx.topics.length > 0) {
    query = query.overlaps("tags", ctx.topics)
  }

  const { data, error } = await query

  if (error || !data) {
    console.warn("[evidence] query failed:", error?.message)
    return []
  }

  return (data as Array<Record<string, unknown>>)
    .filter(row => {
      const conf = CONFIDENCE_ORDER[row.internal_confidence as string] ?? 0
      return conf >= minConfVal && row.primary_finding
    })
    .sort((a, b) => {
      const confDiff = (CONFIDENCE_ORDER[b.internal_confidence as string] ?? 0) - (CONFIDENCE_ORDER[a.internal_confidence as string] ?? 0)
      if (confDiff !== 0) return confDiff
      return (b.year as number) - (a.year as number)
    })
    .slice(0, limit)
    .map(row => ({
      shortRef: `${row.first_author ?? "Unknown"} ${row.year}`,
      finding: row.primary_finding as string,
      population: (row.population_description as string) ?? "",
      confidence: (row.internal_confidence as string) ?? "medium",
    }))
}

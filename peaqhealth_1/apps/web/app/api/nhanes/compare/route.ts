import { scoreOralAgainstNHANES } from "@peaq/score-engine/oral-nhanes"
import type { OralNHANESInput } from "@peaq/score-engine/oral-nhanes"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = await request.json()

  const { age, sex, shannon, observed_asvs, simpson,
    veillonella_pct, rothia_pct, neisseria_pct,
    porphyromonas_pct, treponema_pct, fusobacterium_pct,
  } = body as {
    age?: number
    sex?: "male" | "female"
    shannon?: number
    observed_asvs?: number
    simpson?: number
    veillonella_pct?: number
    rothia_pct?: number
    neisseria_pct?: number
    porphyromonas_pct?: number
    treponema_pct?: number
    fusobacterium_pct?: number
  }

  // At least one metric required
  const hasAnyMetric = [shannon, observed_asvs, simpson,
    veillonella_pct, rothia_pct, neisseria_pct,
    porphyromonas_pct, treponema_pct, fusobacterium_pct,
  ].some(v => v !== undefined && v !== null)

  if (!hasAnyMetric) {
    return Response.json({ error: "At least one metric is required" }, { status: 400 })
  }

  const input: OralNHANESInput = {}
  if (shannon !== undefined) input.shannon = shannon
  if (observed_asvs !== undefined) input.observed_asvs = observed_asvs
  if (simpson !== undefined) input.simpson = simpson
  if (veillonella_pct !== undefined) input.veillonella_pct = veillonella_pct
  if (rothia_pct !== undefined) input.rothia_pct = rothia_pct
  if (neisseria_pct !== undefined) input.neisseria_pct = neisseria_pct
  if (porphyromonas_pct !== undefined) input.porphyromonas_pct = porphyromonas_pct
  if (treponema_pct !== undefined) input.treponema_pct = treponema_pct
  if (fusobacterium_pct !== undefined) input.fusobacterium_pct = fusobacterium_pct

  const result = scoreOralAgainstNHANES(input)

  // Determine age/sex group label
  let age_sex_group = "all adults"
  if (age && sex) {
    const ageGroup = age < 30 ? "18-29" : age < 40 ? "30-39" : age < 50 ? "40-49" : age < 60 ? "50-59" : "60-69"
    age_sex_group = `${sex} aged ${ageGroup}`
  }

  return Response.json({
    age_sex_group,
    ...result,
  })
}

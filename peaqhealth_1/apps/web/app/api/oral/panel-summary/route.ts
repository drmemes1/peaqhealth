import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { NARRATIVE_SYSTEM_BASE, SUMMARY_INSTRUCTION } from "../../../../lib/panel-narrative-base"

const PROMPT_VERSION = "oral-summary-v1"

export async function GET() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: cached } = await supabase.from("panel_narratives")
    .select("content, pullquotes, citations")
    .eq("user_id", user.id).eq("panel", "oral").eq("tab", "summary").eq("prompt_version", PROMPT_VERSION)
    .maybeSingle()
  if (cached?.content) return NextResponse.json(cached)

  const { data: kit } = await supabase.from("oral_kit_orders")
    .select("shannon_diversity, neisseria_pct, haemophilus_pct, rothia_pct, actinomyces_pct, veillonella_pct, porphyromonas_pct, tannerella_pct, treponema_pct, fusobacterium_pct, aggregatibacter_pct, campylobacter_pct, prevotella_intermedia_pct, prevotella_commensal_pct, s_mutans_pct, s_sobrinus_pct, s_sanguinis_pct, s_gordonii_pct, s_salivarius_pct, scardovia_pct, lactobacillus_pct, streptococcus_total_pct, env_pattern, species_count")
    .eq("user_id", user.id).not("shannon_diversity", "is", null)
    .order("ordered_at", { ascending: false }).limit(1).maybeSingle()
  if (!kit) return NextResponse.json({ content: null, reason: "no_oral_data" })

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return NextResponse.json({ error: "No AI key" }, { status: 503 })

  try {
    const openai = new OpenAI({ apiKey: openaiKey })
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      temperature: 0.1, max_tokens: 800, store: false,
      messages: [
        { role: "system", content: NARRATIVE_SYSTEM_BASE + SUMMARY_INSTRUCTION },
        { role: "user", content: `Oral panel data:\n${JSON.stringify(kit, null, 2)}` },
      ],
    })
    const raw = completion.choices[0]?.message.content ?? "{}"
    const result = JSON.parse(raw.replace(/```json/gi, "").replace(/```/g, "").trim()) as Record<string, unknown>

    await supabase.from("panel_narratives").upsert({
      user_id: user.id, panel: "oral", tab: "summary", prompt_version: PROMPT_VERSION,
      content: result.content as string, pullquotes: result.pullquotes ?? [], citations: result.citations ?? [],
      generated_at: new Date().toISOString(),
    }, { onConflict: "user_id,panel,tab,prompt_version" })

    return NextResponse.json({ content: result.content, pullquotes: result.pullquotes ?? [], citations: result.citations ?? [] })
  } catch (err) {
    console.error("[oral-summary] failed:", err)
    return NextResponse.json({ content: null, error: String(err) }, { status: 500 })
  }
}

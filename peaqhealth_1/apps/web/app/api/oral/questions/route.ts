import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { NARRATIVE_SYSTEM_BASE, QUESTIONS_INSTRUCTION } from "../../../../lib/panel-narrative-base"

const PROMPT_VERSION = "oral-questions-v2"

export async function GET() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: cached } = await supabase.from("panel_narratives").select("content, pullquotes, citations").eq("user_id", user.id).eq("panel", "oral").eq("tab", "questions").eq("prompt_version", PROMPT_VERSION).maybeSingle()
  if (cached?.content) return NextResponse.json(cached)

  const [{ data: kit }, { data: lab }, { data: lifestyle }] = await Promise.all([
    supabase.from("oral_kit_orders").select("shannon_diversity, neisseria_pct, haemophilus_pct, rothia_pct, porphyromonas_pct, fusobacterium_pct, aggregatibacter_pct, s_mutans_pct, s_sanguinis_pct, env_pattern, primary_pattern").eq("user_id", user.id).not("shannon_diversity", "is", null).order("ordered_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lab_results").select("ldl_mgdl, hs_crp_mgl, glucose_mgdl, hba1c_pct").eq("user_id", user.id).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lifestyle_records").select("mouth_breathing, flossing_freq, mouthwash_type").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ])
  if (!kit) return NextResponse.json({ content: null, reason: "no_oral_data" })

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return NextResponse.json({ error: "No AI key" }, { status: 503 })

  const dataCtx = { oral: kit, blood: lab, questionnaire: lifestyle, blood_available: !!lab }

  try {
    const systemPrompt = NARRATIVE_SYSTEM_BASE + QUESTIONS_INSTRUCTION + `\n\nCONTEXT: Blood panel ${lab ? "IS" : "is NOT"} available.${lab ? ` LDL ${lab.ldl_mgdl ?? "not tested"}, hs-CRP ${lab.hs_crp_mgl ?? "not tested"}.` : ""}\nQuestionnaire ${lifestyle ? "IS" : "is NOT"} available.${lifestyle ? ` Mouth breathing: ${lifestyle.mouth_breathing ?? "not answered"}, Flossing: ${lifestyle.flossing_freq ?? "not answered"}.` : ""}\nAnchor questions to SPECIFIC values from the user's data. If blood is available, include at least one cross-panel question.`
    const openai = new OpenAI({ apiKey: openaiKey })
    const completion = await openai.chat.completions.create({ model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini", temperature: 0.1, max_tokens: 600, store: false, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Generate questions for this user:\n${JSON.stringify(dataCtx, null, 2)}` }] })
    const raw = completion.choices[0]?.message.content ?? "{}"
    const result = JSON.parse(raw.replace(/```json/gi, "").replace(/```/g, "").trim()) as Record<string, unknown>
    await supabase.from("panel_narratives").upsert({ user_id: user.id, panel: "oral", tab: "questions", prompt_version: PROMPT_VERSION, content: result.content as string, pullquotes: result.pullquotes ?? [], citations: result.citations ?? [], generated_at: new Date().toISOString() }, { onConflict: "user_id,panel,tab,prompt_version" })
    return NextResponse.json({ content: result.content, pullquotes: result.pullquotes ?? [], citations: result.citations ?? [] })
  } catch (err) { console.error("[oral-questions] failed:", err); return NextResponse.json({ content: null, error: String(err) }, { status: 500 }) }
}

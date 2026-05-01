import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { NARRATIVE_SYSTEM_BASE, QUESTIONS_INSTRUCTION } from "../../../../lib/panel-narrative-base"

const PROMPT_VERSION = "blood-questions-v1"

export async function GET() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: cached } = await supabase.from("panel_narratives").select("content, pullquotes, citations").eq("user_id", user.id).eq("panel", "blood").eq("tab", "questions").eq("prompt_version", PROMPT_VERSION).maybeSingle()
  if (cached?.content) return NextResponse.json(cached)

  const { data: lab } = await supabase.from("blood_results").select("ldl_mgdl, hdl_mgdl, triglycerides_mgdl, total_cholesterol_mgdl, hba1c_percent, glucose_mgdl, hs_crp_mgl, egfr_mlmin, alt_ul, ast_ul, tsh_uiuml, vitamin_d_ngml").eq("user_id", user.id).order("collected_at", { ascending: false }).limit(1).maybeSingle()
  if (!lab) return NextResponse.json({ content: null, reason: "no_blood_data" })

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return NextResponse.json({ error: "No AI key" }, { status: 503 })
  try {
    const openai = new OpenAI({ apiKey: openaiKey })
    const completion = await openai.chat.completions.create({ model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini", temperature: 0.1, max_tokens: 600, store: false, messages: [{ role: "system", content: NARRATIVE_SYSTEM_BASE + QUESTIONS_INSTRUCTION }, { role: "user", content: `Blood panel data:\n${JSON.stringify(lab, null, 2)}\n\nGenerate 3-4 questions this user could bring to their doctor, anchored to specific values.` }] })
    const raw = completion.choices[0]?.message.content ?? "{}"
    const result = JSON.parse(raw.replace(/```json/gi, "").replace(/```/g, "").trim()) as Record<string, unknown>
    await supabase.from("panel_narratives").upsert({ user_id: user.id, panel: "blood", tab: "questions", prompt_version: PROMPT_VERSION, content: result.content as string, pullquotes: result.pullquotes ?? [], citations: result.citations ?? [], generated_at: new Date().toISOString() }, { onConflict: "user_id,panel,tab,prompt_version" })
    return NextResponse.json({ content: result.content, pullquotes: result.pullquotes ?? [], citations: result.citations ?? [] })
  } catch (err) { console.error("[blood-questions] failed:", err); return NextResponse.json({ content: null, error: String(err) }, { status: 500 }) }
}

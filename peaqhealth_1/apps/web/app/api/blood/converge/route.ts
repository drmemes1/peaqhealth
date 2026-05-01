import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { NARRATIVE_SYSTEM_BASE, CONVERGE_INSTRUCTION } from "../../../../lib/panel-narrative-base"

const PROMPT_VERSION = "blood-converge-v1"

export async function GET() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: cached } = await supabase.from("panel_narratives").select("content, pullquotes, citations").eq("user_id", user.id).eq("panel", "blood").eq("tab", "converge").eq("prompt_version", PROMPT_VERSION).maybeSingle()
  if (cached?.content) return NextResponse.json(cached)

  const [{ data: lab }, { data: kit }, { count: sleepCount }] = await Promise.all([
    supabase.from("blood_results").select("ldl_mgdl, hdl_mgdl, triglycerides_mgdl, hba1c_percent, glucose_mgdl, hs_crp_mgl, tsh_uiuml").eq("user_id", user.id).order("collected_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("oral_kit_orders").select("neisseria_pct, haemophilus_pct, porphyromonas_pct, fusobacterium_pct, env_pattern").eq("user_id", user.id).not("shannon_diversity", "is", null).order("ordered_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("sleep_data").select("id", { count: "exact", head: true }).eq("user_id", user.id).gt("sleep_efficiency", 0),
  ])
  const panels: string[] = []
  if (lab) panels.push("blood")
  if (kit) panels.push("oral")
  if ((sleepCount ?? 0) > 0) panels.push("sleep")
  if (panels.length < 2) {
    const missing = ["oral", "blood", "sleep"].filter(p => !panels.includes(p))
    return NextResponse.json({ content: `Once you've uploaded results from your ${missing.join(" and ")} panel${missing.length > 1 ? "s" : ""}, this view will show how your panels connect.`, pullquotes: [], citations: [] })
  }
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return NextResponse.json({ error: "No AI key" }, { status: 503 })
  try {
    const openai = new OpenAI({ apiKey: openaiKey })
    const completion = await openai.chat.completions.create({ model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini", temperature: 0.1, max_tokens: 800, store: false, messages: [{ role: "system", content: NARRATIVE_SYSTEM_BASE + CONVERGE_INSTRUCTION }, { role: "user", content: `Cross-panel data:\n${JSON.stringify({ blood: lab, oral: kit, sleep_nights: sleepCount, panels_available: panels }, null, 2)}` }] })
    const raw = completion.choices[0]?.message.content ?? "{}"
    const result = JSON.parse(raw.replace(/```json/gi, "").replace(/```/g, "").trim()) as Record<string, unknown>
    await supabase.from("panel_narratives").upsert({ user_id: user.id, panel: "blood", tab: "converge", prompt_version: PROMPT_VERSION, content: result.content as string, pullquotes: result.pullquotes ?? [], citations: result.citations ?? [], generated_at: new Date().toISOString() }, { onConflict: "user_id,panel,tab,prompt_version" })
    return NextResponse.json({ content: result.content, pullquotes: result.pullquotes ?? [], citations: result.citations ?? [] })
  } catch (err) { console.error("[blood-converge] failed:", err); return NextResponse.json({ content: null, error: String(err) }, { status: 500 }) }
}

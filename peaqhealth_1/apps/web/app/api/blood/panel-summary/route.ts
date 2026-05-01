import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { NARRATIVE_SYSTEM_BASE, SUMMARY_INSTRUCTION } from "../../../../lib/panel-narrative-base"

const PROMPT_VERSION = "blood-summary-v2"
const LAB_COLS = "ldl_mgdl, hdl_mgdl, triglycerides_mgdl, total_cholesterol_mgdl, hba1c_pct, glucose_mgdl, hs_crp_mgl, wbc_kul, hematocrit_pct, tsh_uiuml, free_t4_ngdl, egfr_mlmin, vitamin_d_ngml, vitamin_b12_pgml, ferritin_ngml, creatinine_mgdl, albumin_gdl, alt_ul, ast_ul, hemoglobin_gdl, rdw_pct, bun_mgdl, alk_phos_ul, total_bilirubin_mgdl, sodium_mmoll, potassium_mmoll, platelets_kul"

export async function GET() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: cached } = await supabase.from("panel_narratives").select("content, pullquotes, citations").eq("user_id", user.id).eq("panel", "blood").eq("tab", "summary").eq("prompt_version", PROMPT_VERSION).maybeSingle()
  if (cached?.content) return NextResponse.json(cached)

  const [{ data: lab }, { data: oral }, { data: lifestyle }] = await Promise.all([
    supabase.from("blood_results").select(LAB_COLS).eq("user_id", user.id).eq("parser_status", "complete").order("collected_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("oral_kit_orders").select("neisseria_pct, fusobacterium_pct, porphyromonas_pct, env_pattern").eq("user_id", user.id).not("shannon_diversity", "is", null).order("ordered_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lifestyle_records").select("smoking_status, biological_sex, age_range").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ])
  if (!lab) return NextResponse.json({ content: null, reason: "no_blood_data" })

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return NextResponse.json({ error: "No AI key" }, { status: 503 })

  const dataCtx = {
    blood: lab,
    oral_available: !!oral,
    oral_summary: oral ? { neisseria: oral.neisseria_pct, fusobacterium: oral.fusobacterium_pct, porphyromonas: oral.porphyromonas_pct, pattern: oral.env_pattern } : null,
    user: lifestyle ? { sex: lifestyle.biological_sex, age_range: lifestyle.age_range, smoking: lifestyle.smoking_status } : null,
  }

  try {
    const systemPrompt = NARRATIVE_SYSTEM_BASE + SUMMARY_INSTRUCTION + `\n\nCONTEXT:\n- Oral panel available: ${!!oral}${oral ? ` (Neisseria ${oral.neisseria_pct ?? "?"}, Fusobacterium ${oral.fusobacterium_pct ?? "?"})` : ""}\n- If oral IS available, you may reference cross-panel observations. If NOT, do not suggest uploading it.`
    const openai = new OpenAI({ apiKey: openaiKey })
    const completion = await openai.chat.completions.create({ model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini", temperature: 0.1, max_tokens: 800, store: false, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Blood panel with context:\n${JSON.stringify(dataCtx, null, 2)}` }] })
    const raw = completion.choices[0]?.message.content ?? "{}"
    const result = JSON.parse(raw.replace(/```json/gi, "").replace(/```/g, "").trim()) as Record<string, unknown>
    await supabase.from("panel_narratives").upsert({ user_id: user.id, panel: "blood", tab: "summary", prompt_version: PROMPT_VERSION, content: result.content as string, pullquotes: result.pullquotes ?? [], citations: result.citations ?? [], generated_at: new Date().toISOString() }, { onConflict: "user_id,panel,tab,prompt_version" })
    return NextResponse.json({ content: result.content, pullquotes: result.pullquotes ?? [], citations: result.citations ?? [] })
  } catch (err) { console.error("[blood-summary] failed:", err); return NextResponse.json({ content: null, error: String(err) }, { status: 500 }) }
}

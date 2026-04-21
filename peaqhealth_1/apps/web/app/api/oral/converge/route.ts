import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { NARRATIVE_SYSTEM_BASE, CONVERGE_INSTRUCTION } from "../../../../lib/panel-narrative-base"

const PROMPT_VERSION = "oral-converge-v2"

export async function GET() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: cached } = await supabase.from("panel_narratives")
    .select("content, pullquotes, citations")
    .eq("user_id", user.id).eq("panel", "oral").eq("tab", "converge").eq("prompt_version", PROMPT_VERSION)
    .maybeSingle()
  if (cached?.content) return NextResponse.json(cached)

  const [{ data: kit }, { data: lab }, { count: sleepCount }, { data: lifestyle }] = await Promise.all([
    supabase.from("oral_kit_orders").select("shannon_diversity, neisseria_pct, haemophilus_pct, porphyromonas_pct, fusobacterium_pct, env_pattern, primary_pattern").eq("user_id", user.id).not("shannon_diversity", "is", null).order("ordered_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lab_results").select("ldl_mgdl, hdl_mgdl, triglycerides_mgdl, hba1c_pct, glucose_mgdl, hs_crp_mgl, tsh_uiuml").eq("user_id", user.id).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("sleep_data").select("id", { count: "exact", head: true }).eq("user_id", user.id).gt("sleep_efficiency", 0),
    supabase.from("lifestyle_records").select("mouth_breathing, snoring_reported").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ])

  const panels: string[] = []
  if (kit) panels.push("oral")
  if (lab) panels.push("blood")
  if ((sleepCount ?? 0) > 0) panels.push("sleep")
  if (lifestyle) panels.push("questionnaire")

  if (panels.filter(p => p !== "questionnaire").length < 2) {
    const missing = ["oral", "blood", "sleep"].filter(p => !panels.includes(p))
    return NextResponse.json({
      content: `Once you've uploaded results from your ${missing.join(" and ")} panel${missing.length > 1 ? "s" : ""}, this view will show how your panels connect.`,
      pullquotes: [], citations: [],
    })
  }

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return NextResponse.json({ error: "No AI key" }, { status: 503 })

  try {
    const dataCtx = { oral: kit, blood: lab, sleep_nights: sleepCount, questionnaire: lifestyle, panels_available: panels }
    const systemPrompt = NARRATIVE_SYSTEM_BASE + CONVERGE_INSTRUCTION + `\n\nAVAILABLE PANELS: ${panels.join(", ")}.\nOnly reference panels that are AVAILABLE. Never suggest uploading a panel that's already present.`
    const openai = new OpenAI({ apiKey: openaiKey })
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      temperature: 0.1, max_tokens: 800, store: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Cross-panel data:\n${JSON.stringify(dataCtx, null, 2)}` },
      ],
    })
    const raw = completion.choices[0]?.message.content ?? "{}"
    const result = JSON.parse(raw.replace(/```json/gi, "").replace(/```/g, "").trim()) as Record<string, unknown>

    await supabase.from("panel_narratives").upsert({
      user_id: user.id, panel: "oral", tab: "converge", prompt_version: PROMPT_VERSION,
      content: result.content as string, pullquotes: result.pullquotes ?? [], citations: result.citations ?? [],
      generated_at: new Date().toISOString(),
    }, { onConflict: "user_id,panel,tab,prompt_version" })

    return NextResponse.json({ content: result.content, pullquotes: result.pullquotes ?? [], citations: result.citations ?? [] })
  } catch (err) {
    console.error("[oral-converge] failed:", err)
    return NextResponse.json({ content: null, error: String(err) }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { NARRATIVE_SYSTEM_BASE } from "../../../../lib/panel-narrative-base"

const MARKER_PROMPT = `\n\nTASK: You are given a specific blood marker and the user's full panel context. Generate a personalized explanation for this ONE marker.

If the marker HAS a value: explain what their specific number means, how it relates to their other markers, and one conversation starter for their doctor.

If the marker is MISSING (value is null): explain what this marker measures, why it might be worth testing given their OTHER results, and how to ask their doctor about it.

Return JSON: { "content": "2-3 short paragraphs", "pullquotes": ["key phrase 1", "key phrase 2"] }`

export async function POST(request: NextRequest) {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json() as Record<string, unknown>
  const markerKey = body.marker_key as string
  const markerName = body.marker_name as string
  if (!markerKey || !markerName) return NextResponse.json({ error: "Missing marker_key or marker_name" }, { status: 400 })

  const supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: lab } = await supabase.from("lab_results")
    .select("*").eq("user_id", user.id).eq("parser_status", "complete")
    .order("collection_date", { ascending: false }).limit(1).maybeSingle()

  const { data: lifestyle } = await supabase.from("lifestyle_records")
    .select("age_range, biological_sex, smoking_status").eq("user_id", user.id)
    .order("updated_at", { ascending: false }).limit(1).maybeSingle()

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return NextResponse.json({ error: "No AI key" }, { status: 503 })

  const markerValue = lab ? (lab as Record<string, unknown>)[markerKey] : null
  const hasValue = markerValue != null

  const context = {
    marker: markerName,
    marker_key: markerKey,
    value: markerValue,
    has_value: hasValue,
    full_panel: lab ? Object.fromEntries(Object.entries(lab as Record<string, unknown>).filter(([, v]) => v != null && typeof v !== "object")) : {},
    user_context: lifestyle ?? {},
  }

  try {
    const openai = new OpenAI({ apiKey: openaiKey })
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      temperature: 0.15, max_tokens: 500, store: false,
      messages: [
        { role: "system", content: NARRATIVE_SYSTEM_BASE + MARKER_PROMPT },
        { role: "user", content: `Generate a personalized insight for this marker:\n${JSON.stringify(context, null, 2)}` },
      ],
    })
    const raw = completion.choices[0]?.message.content ?? "{}"
    const result = JSON.parse(raw.replace(/```json/gi, "").replace(/```/g, "").trim()) as Record<string, unknown>
    return NextResponse.json({ content: result.content, pullquotes: result.pullquotes ?? [] })
  } catch (err) {
    console.error("[marker-insight] failed:", err)
    return NextResponse.json({ content: null, error: String(err) }, { status: 500 })
  }
}

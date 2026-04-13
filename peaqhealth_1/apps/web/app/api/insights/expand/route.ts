import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { insight_title, insight_explanation, panels } = await req.json()

  // Fetch relevant data for context
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: snapshot } = await svc
    .from("score_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const openai = new OpenAI()

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.6,
    max_tokens: 500,
    stream: true,
    messages: [
      {
        role: "system",
        content: `You are Peaq's clinical intelligence layer. A user clicked "See why" on this insight. Explain in 3-4 sentences: what their specific markers show, why it matters clinically, and 2-3 concrete actions. Write for an intelligent adult. No jargon without explanation. No hedging. Reference their actual values. Don't say "consult your doctor" unless genuinely critical. Always express the score as 'Peaq Age' in years, not points or /100. A negative delta means younger (favorable). Components: PhenoAge 48%, OMA 22%, VO₂ 13%, RHR 11%, Sleep 9%, Cross-panel 3%.`,
      },
      {
        role: "user",
        content: `Insight: "${insight_title}" — ${insight_explanation}\nPanels: ${(panels ?? []).join(", ")}\nScore data: PRI ${snapshot?.score}, Sleep ${snapshot?.sleep_sub}/30, Blood ${snapshot?.blood_sub}/40, Oral ${snapshot?.oral_sub}/30, Modifier ${snapshot?.modifier_total}${snapshot?.peaq_age != null ? `\nPeaq Age: ${snapshot.peaq_age} yrs (delta ${snapshot.peaq_age_delta}, band ${snapshot.peaq_age_band}) | PhenoAge: ${snapshot.pheno_age ?? "pending"} | OMA: ${snapshot.oma_percentile}th | I1=${snapshot.cross_panel_i1} I2=${snapshot.cross_panel_i2} I3=${snapshot.cross_panel_i3}` : ""}`,
      },
    ],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ""
        if (text) controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}

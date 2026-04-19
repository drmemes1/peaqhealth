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
        content: `You are Cnvrg's clinical intelligence layer. A user clicked "See why" on this insight. Explain in 3-4 sentences: what their specific markers show, why it matters clinically, and 2-3 concrete actions. Write for an intelligent adult. No jargon without explanation. No hedging. Reference their actual values. Don't say "consult your doctor" unless genuinely critical. Always express the score as 'Peaq Age' in years, not points or /100. A negative delta means younger (favorable). Components: PhenoAge 48%, OMA 22%, RHR 11%, HRV 8% (pending), Sleep 9%, Cross-panel 3%. VO₂ max is informational only — do not reference it as a scored component.\n\nLANGUAGE RULES — ALWAYS FOLLOW:\n- Write in plain English a smart non-scientist understands immediately\n- Lead with what this means for the person, not the mechanism\n- Never use Latin species names in the response\n- Never use: dysbiosis, biomarker, optimize, endothelial, autonomic, parasympathetic, sympathetic dominance, inflammatory cascade, NF-kB, glycemic variability, cardiometabolic\n- Replace with plain English:\n    "dysbiosis" → "imbalance in your oral bacteria"\n    "circadian rhythm" → "your body's internal clock"\n    "insulin sensitivity" → "how well your body handles sugar"\n    "autonomic" → "your body's stress response system"\n- End every insight with one specific action\n- The action must be free or low-cost first, clinical referral last\n- Never say "consider" or "may want to" — be direct`,
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

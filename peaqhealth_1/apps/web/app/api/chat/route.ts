import { createClient } from "../../../lib/supabase/server"
import { getUserPanelContext } from "../../../lib/user-context"
import { computeInterventions } from "../../../lib/interventions/registry"
import { getSubInsights } from "../../../lib/oral/subInsights"
import { getBreathScore } from "../../../lib/oral/halitosisScore"
import { getBacterialKnowledgePrompt } from "../../../lib/chat/bacterialKnowledge"
import { getMethodologyPrompt } from "../../../lib/chat/methodologyKnowledge"
import { getKnowledgeBase } from "../../../lib/chat/knowledgeBase"
import { searchArticles, ARTICLE_SEARCH_TOOL } from "../../../lib/chat/articleSearch"
import { hashUserId } from "../../../lib/logging/safe-log"
import OpenAI from "openai"

function f(v: number | null | undefined, d = 1): string {
  return v == null ? "Not available yet" : v.toFixed(d)
}

function buildUserContext(ctx: Awaited<ReturnType<typeof getUserPanelContext>>): string {
  const lines: string[] = []
  const o = ctx.oralKit
  const b = ctx.bloodPanel
  const s = ctx.sleepData
  const q = ctx.questionnaire

  lines.push(`USER: Age ${ctx.age ?? "not provided"}, Sex ${ctx.sex ?? "not provided"}`)
  lines.push(`Panels available: ${ctx.availablePanels.join(", ") || "none yet"}`)

  if (o) {
    lines.push(`\nCURRENT ORAL MICROBIOME DATA:`)
    lines.push(`  Shannon diversity index: ${f(o.shannonIndex, 2)} (${(o.shannonIndex ?? 0) >= 4.0 ? "strong — resilient community" : "below 4.0 target"})`)
    if (o.namedSpecies != null) lines.push(`  Species detected: ${o.namedSpecies}`)
    lines.push(`  Nitrate-reducer composite: ${f(o.nitricOxideTotal)}% (${o.nitricOxideTotal >= 20 ? "strong" : o.nitricOxideTotal >= 10 ? "watch" : "attention"})`)
    lines.push(`    Neisseria: ${f(o.neisseriaPct)}%`)
    lines.push(`    Rothia: ${f(o.rothiaPct)}%`)
    lines.push(`    Haemophilus: ${f(o.haemophilusPct)}%${(o.haemophilusPct ?? 0) < 4 && o.nitricOxideTotal >= 25 ? " (FLAGGED — sub-insight firing)" : ""}`)
    lines.push(`    Actinomyces: ${f(o.actinomycesPct)}%`)
    lines.push(`    Veillonella: ${f(o.veillonellaPct)}%`)
    lines.push(`  Gum health composite: ${f(o.gumHealthTotal)}% (${o.gumHealthTotal < 2 ? "strong" : o.gumHealthTotal < 5 ? "watch" : "attention"})`)
    lines.push(`    Fusobacterium: ${f(o.fusobacteriumPct)}%`)
    lines.push(`    Aggregatibacter: ${f(o.aggregatibacterPct)}%`)
    lines.push(`    Campylobacter: ${f(o.campylobacterPct)}%`)
    lines.push(`    Porphyromonas: ${f(o.porphyromonasPct, 2)}%`)
    lines.push(`    Tannerella: ${f(o.tannerellaPct, 2)}%`)
    lines.push(`    Treponema: ${f(o.treponemaPct, 2)}%`)
    lines.push(`  pH buffering ratio: ${o.phBalanceApi != null ? o.phBalanceApi.toFixed(2) : "Not computed"} (${o.phBalanceCategory ?? "unknown"})`)
    lines.push(`  Cavity-making bacteria: ${f(o.cavityBacteriaTotal, 2)}%`)
    lines.push(`    S. mutans: ${f(o.sMutansPct, 2)}%`)
    lines.push(`    S. sobrinus: ${f(o.sSobrinusPct, 2)}%`)
    lines.push(`  Protective ratio: ${o.protectiveRatio != null ? o.protectiveRatio.toFixed(1) + "×" : "Not computed"}`)
    lines.push(`    S. sanguinis: ${f(o.sSanguinisPct, 2)}%`)
    lines.push(`    S. gordonii: ${f(o.sGordoniiPct, 2)}%`)

    const breath = getBreathScore({ fusobacteriumPeriodonticumPct: null, porphyromonasPct: o.porphyromonasPct, solobacteriumPct: null, prevotellaMelaninogenicaPct: null, peptostreptococcusPct: null })
    lines.push(`  Breath freshness: ${breath.score ?? "Not computed"}/100 (${breath.statusText})`)

    const subInsights = getSubInsights(o)
    if (subInsights.length > 0) {
      lines.push(`  Sub-insights firing:`)
      for (const si of subInsights) lines.push(`    - ${si.calloutTitle}: ${si.calloutBody}`)
    }
  } else {
    lines.push(`\nORAL DATA: Not available yet`)
  }

  if (b) {
    lines.push(`\nCURRENT BLOOD PANEL DATA (draw date: ${b.drawDate ?? "unknown"}):`)
    const markers = [
      ["LDL", b.ldl, "mg/dL"], ["HDL", b.hdl, "mg/dL"], ["Triglycerides", b.triglycerides, "mg/dL"],
      ["Total cholesterol", b.totalCholesterol, "mg/dL"], ["hs-CRP", b.hsCrp, "mg/L"],
      ["HbA1c", b.hba1c, "%"], ["Glucose", b.glucose, "mg/dL"], ["TSH", b.tsh, "µIU/mL"],
      ["Vitamin D", b.vitaminD, "ng/mL"], ["eGFR", b.egfr, "mL/min"], ["ALT", b.alt, "U/L"],
      ["Hemoglobin", b.hemoglobin, "g/dL"],
    ] as [string, number | null, string][]
    for (const [name, val, unit] of markers) lines.push(`  ${name}: ${val != null ? `${val} ${unit}` : "Not tested"}`)
  } else {
    lines.push(`\nBLOOD PANEL DATA: Not available yet`)
  }

  if (s) {
    lines.push(`\nCURRENT SLEEP DATA (${s.nightsCount} nights):`)
    lines.push(`  Total sleep: ${s.totalSleepMin != null ? `${(s.totalSleepMin / 60).toFixed(1)} hrs` : "N/A"}`)
    lines.push(`  Deep sleep: ${s.deepSleepMin != null ? `${s.deepSleepMin.toFixed(0)} min` : "N/A"}`)
    lines.push(`  HRV: ${s.hrvRmssd != null ? `${s.hrvRmssd.toFixed(0)} ms` : "N/A"}`)
    lines.push(`  Resting HR: ${s.restingHr != null ? `${s.restingHr.toFixed(0)} bpm` : "N/A"}`)
    lines.push(`  SpO₂: ${s.spo2Avg != null ? `${s.spo2Avg.toFixed(1)}%` : "N/A"}`)
  } else {
    lines.push(`\nSLEEP DATA: Not available yet`)
  }

  if (q) {
    lines.push(`\nQUESTIONNAIRE:`)
    if (q.mouthBreathing) lines.push(`  Mouth breathing: ${q.mouthBreathing}${q.mouthBreathingWhen ? ` (${q.mouthBreathingWhen.replace(/_/g, " ")})` : ""}`)
    if (q.snoringReported) lines.push(`  Snoring: ${q.snoringReported}`)
    if (q.sleepDuration) lines.push(`  Sleep duration: ${q.sleepDuration.replace(/_/g, "-")} hrs`)
    if (q.smokingStatus) lines.push(`  Smoking: ${q.smokingStatus}`)
    if (q.sugarIntake) lines.push(`  Sugar frequency: ${q.sugarIntake}`)
    if (q.flossingFreq) lines.push(`  Flossing: ${q.flossingFreq}`)
    if (q.stressLevel) lines.push(`  Stress: ${q.stressLevel}`)
  } else {
    lines.push(`\nQUESTIONNAIRE: Not completed`)
  }

  const interventions = ctx.hasOralKit || ctx.hasBloodPanel ? computeInterventions(ctx) : []
  if (interventions.length > 0) {
    lines.push(`\nACTIVE INTERVENTIONS:`)
    for (const int of interventions.slice(0, 8)) lines.push(`  - ${int.title}: ${int.why.slice(0, 120)}`)
  }

  return lines.join("\n")
}

function buildSystemPrompt(userData: string, kb: ReturnType<typeof getKnowledgeBase>, bacterial: string, methodology: string): string {
  return `You are Ask Cnvrg, the data interpreter for the Cnvrg health platform.

YOU ARE NOT a doctor, diagnostic tool, or prescriber. You never diagnose, recommend medication, replace clinical advice, or interpret isolated symptoms as disease.

YOU CAN answer three kinds of questions:
  MODE 1: User's own data (their numbers, what they mean)
  MODE 2: How Cnvrg calculates things (methodology)
  MODE 3: Bacterial or clinical education (what X is, what it does)
  Plus: references to articles in Cnvrg's library when helpful

HIERARCHY OF SOURCES — use in this order:
  1. USER'S CURRENT DATA — authoritative for their numbers
  2. EVIDENCE — authoritative for scientific claims
  3. VOICE RULES — authoritative for tone
  4. PHILOSOPHY — authoritative for interpretive framing
  5. BACTERIAL/METHODOLOGY REFERENCE — structured lookup
  6. ARTICLE LIBRARY — via search_articles tool for deeper reading

CRITICAL RULES:
  1. NEVER invent a numeric value. If not in USER_DATA, say "I don't see that in your current data."
  2. For user numbers, cite only USER_DATA.
  3. For scientific claims, cite only EVIDENCE or BACTERIAL_KNOWLEDGE.
  4. Follow VOICE rules — warm, considered, plain-spoken. Never clinical-dry, never wellness-chirpy.
  5. When user asks for articles, call search_articles. Reference results by title.
  6. Emergency: chest pain/breathing → "Call 911 immediately." Suicidal ideation → "Call or text 988."
  7. Borderline values (within 5% of threshold): "close to the cutoff — worth a recheck."
  8. Response length: data questions <150 words, methodology/education <250 words.
  9. Never start with "I". Never use bullet points. Prose only.
  10. End Attention markers with "Worth discussing with your clinician."

<USER_DATA>
${userData}
</USER_DATA>

<VOICE>
${kb.voice.slice(0, 6000)}
</VOICE>

<EVIDENCE>
${kb.evidence.slice(0, 8000)}
</EVIDENCE>

<PHILOSOPHY>
${kb.philosophy.slice(0, 4000)}
</PHILOSOPHY>

<BACTERIAL_KNOWLEDGE>
${bacterial}
</BACTERIAL_KNOWLEDGE>

<METHODOLOGY_KNOWLEDGE>
${methodology}
</METHODOLOGY_KNOWLEDGE>`
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { messages } = await req.json() as { messages: Array<{ role: string; content: string }> }
  if (!messages || !Array.isArray(messages)) return new Response("Bad request", { status: 400 })

  const ctx = await getUserPanelContext(user.id)
  const userData = buildUserContext(ctx)
  const kb = getKnowledgeBase()
  const bacterial = getBacterialKnowledgePrompt()
  const methodology = getMethodologyPrompt()
  const systemPrompt = buildSystemPrompt(userData, kb, bacterial, methodology)

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

  // First call — may return tool_calls
  const initialMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-10).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
  ]

  const firstResponse = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o",
    messages: initialMessages,
    max_tokens: 600,
    temperature: 0.2,
    store: false,
    tools: [ARTICLE_SEARCH_TOOL],
    tool_choice: "auto",
  })

  const firstChoice = firstResponse.choices[0]

  // Handle tool calls
  if (firstChoice?.finish_reason === "tool_calls" && firstChoice.message.tool_calls) {
    const toolResults: OpenAI.ChatCompletionMessageParam[] = [
      ...initialMessages,
      firstChoice.message,
    ]

    for (const tc of firstChoice.message.tool_calls) {
      const fn = (tc as unknown as { function: { name: string; arguments: string } }).function
      if (fn.name === "search_articles") {
        const args = JSON.parse(fn.arguments) as { query: string; limit?: number }
        const results = await searchArticles(args.query, args.limit ?? 5)
        toolResults.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(results),
        })
      }
    }

    // Second call with tool results — stream this one
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o",
      messages: toolResults,
      max_tokens: 600,
      temperature: 0.2,
      stream: true,
      store: false,
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
    return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
  }

  // No tool calls — stream the first response directly
  // Re-request with streaming since first was non-streaming
  const stream = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o",
    messages: initialMessages,
    max_tokens: 600,
    temperature: 0.2,
    stream: true,
    store: false,
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

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
}

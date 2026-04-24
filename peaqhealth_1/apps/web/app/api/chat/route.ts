import { createClient } from "../../../lib/supabase/server"
import { getUserPanelContext } from "../../../lib/user-context"
import { computeInterventions } from "../../../lib/interventions/registry"
import { getSubInsights } from "../../../lib/oral/subInsights"
import { getBreathScore, getBreathDescription } from "../../../lib/oral/halitosisScore"
import { getBacterialKnowledgePrompt } from "../../../lib/chat/bacterialKnowledge"
import { getMethodologyPrompt } from "../../../lib/chat/methodologyKnowledge"
import { hashUserId } from "../../../lib/logging/safe-log"
import OpenAI from "openai"

const SYSTEM_PROMPT = `You are Cnvrg's personal health data interpreter. You have one job: explain this specific user's Cnvrg data clearly, precisely, and honestly.

You are NOT a doctor. You are NOT a therapist. You are NOT a general health assistant. You are a data interpreter.

You speak like a knowledgeable clinician explaining lab results to an informed patient — calm, precise, specific to their numbers. Never alarming. Never vague. Never generic.

THREE MODES:

MODE 1 — USER DATA: When asked about their data, cite their actual values from the USER DATA section below. NEVER invent a numeric value. If a value is listed as "Not available yet", say so honestly. If asked about data not in the context, say "I don't see that in your current data."

MODE 2 — METHODOLOGY: When asked how Cnvrg computes a score, explain from the METHODOLOGY REFERENCE below. Be transparent about how calculations work and their limitations.

MODE 3 — BACTERIAL EDUCATION: When asked what a bacterium is or does, explain from the BACTERIAL KNOWLEDGE REFERENCE below. Always connect back to the user's actual value at the end.

Blend modes naturally. Example: "Why is my gum score attention?" → cite their actual gum value (Mode 1), explain what drives it (Mode 3), and how it's computed (Mode 2).

ANTI-HALLUCINATION RULES (absolute):
- NEVER invent a numeric value. Every number you cite must come from the USER DATA section or the reference sections.
- If the user asks about data you don't have, say "I don't see that in your current data" — do not guess.
- Do not reference studies by name, author, year, or journal. Use general phrases like "research suggests" or "population data shows."
- If you're unsure about a value, say so. Honesty > helpfulness.

ABSOLUTE LIMITS:
1. NEVER diagnose — no "you have", "you may have", "consistent with" any condition
2. NEVER recommend medication, supplements, or specific products
3. NEVER interpret symptoms — redirect to their clinician
4. NEVER give false reassurance — no "don't worry" or "probably nothing"
5. NEVER speculate beyond the data provided
6. NEVER make treatment decisions

Clinical care questions: When asked "should I get X?", explain what their data shows that's relevant, name specific markers with values, end with "Worth discussing at your next appointment." Give useful information without making the clinical decision.

EMERGENCY PROTOCOLS (use exactly as written):

ACUTE PHYSICAL EMERGENCY (chest pain, difficulty breathing, stroke symptoms):
"Please call 911 or your local emergency number immediately. This is outside what I can help with — I interpret Cnvrg data only, not acute symptoms. Please get emergency help right now."
Then stop.

MENTAL HEALTH CRISIS (suicidal ideation, self-harm, severe distress):
"I hear that you're going through something really difficult. Please reach out to the 988 Suicide and Crisis Lifeline by calling or texting 988. They're available 24/7 and can help in ways I cannot. You don't have to handle this alone."
Then stop.

BORDERLINE VALUES: If a blood value is within 5% of its cutoff, acknowledge day-to-day variability, suggest rechecking at next draw, keep it brief. Do not invoke cross-panel associations for borderline values.

RESPONSE FORMAT:
- Under 150 words for data questions, up to 250 for methodology/education
- Always specific to their actual numbers
- End Attention markers with: "Worth discussing with your clinician."
- End Watch markers with: "Worth monitoring at your next check-in."
- Never use bullet points — prose only
- Never use headers or bold
- Never start with "I"`

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

  // ── ORAL ──
  if (o) {
    lines.push(`\nCURRENT ORAL MICROBIOME DATA:`)
    lines.push(`  Shannon diversity index: ${f(o.shannonIndex, 2)} (${(o.shannonIndex ?? 0) >= 4.0 ? "strong — resilient community" : "below 4.0 target"})`)
    if (o.namedSpecies != null) lines.push(`  Species detected: ${o.namedSpecies}`)
    lines.push(`  Nitrate-reducer composite: ${f(o.nitricOxideTotal)}% (${o.nitricOxideTotal >= 20 ? "strong" : o.nitricOxideTotal >= 10 ? "watch" : "attention"})`)
    lines.push(`    Neisseria: ${f(o.neisseriaPct)}%`)
    lines.push(`    Rothia: ${f(o.rothiaPct)}%`)
    lines.push(`    Haemophilus: ${f(o.haemophilusPct)}%${(o.haemophilusPct ?? 0) < 4 && o.nitricOxideTotal >= 25 ? " (FLAGGED as low — sub-insight firing)" : ""}`)
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
    lines.push(`  Cavity-making bacteria: ${f(o.cavityBacteriaTotal, 2)}% (${o.cavityBacteriaTotal < 0.5 ? "strong" : o.cavityBacteriaTotal < 1.5 ? "watch" : "attention"})`)
    lines.push(`    S. mutans: ${f(o.sMutansPct, 2)}%`)
    lines.push(`    S. sobrinus: ${f(o.sSobrinusPct, 2)}%`)
    lines.push(`    Lactobacillus: ${f(o.lactobacillusPct, 2)}%`)
    lines.push(`  Protective ratio: ${o.protectiveRatio != null ? o.protectiveRatio.toFixed(1) + "×" : "Not computed"} (${o.protectiveRatioCategory ?? "unknown"})`)
    lines.push(`    S. sanguinis: ${f(o.sSanguinisPct, 2)}%`)
    lines.push(`    S. gordonii: ${f(o.sGordoniiPct, 2)}%`)

    const breath = getBreathScore({
      fusobacteriumPeriodonticumPct: null,
      porphyromonasPct: o.porphyromonasPct,
      solobacteriumPct: null,
      prevotellaMelaninogenicaPct: null,
      peptostreptococcusPct: null,
    })
    lines.push(`  Breath freshness: ${breath.score ?? "Not computed"}/100 (${breath.statusText})`)

    const subInsights = getSubInsights(o)
    if (subInsights.length > 0) {
      lines.push(`  Sub-insights firing:`)
      for (const si of subInsights) {
        lines.push(`    - ${si.calloutTitle}: ${si.calloutBody}`)
      }
    }
  } else {
    lines.push(`\nORAL MICROBIOME DATA: Not available yet`)
  }

  // ── BLOOD ──
  if (b) {
    lines.push(`\nCURRENT BLOOD PANEL DATA (draw date: ${b.drawDate ?? "unknown"}):`)
    lines.push(`  LDL: ${b.ldl != null ? `${b.ldl} mg/dL` : "Not tested"}`)
    lines.push(`  HDL: ${b.hdl != null ? `${b.hdl} mg/dL` : "Not tested"}`)
    lines.push(`  Triglycerides: ${b.triglycerides != null ? `${b.triglycerides} mg/dL` : "Not tested"}`)
    lines.push(`  Total cholesterol: ${b.totalCholesterol != null ? `${b.totalCholesterol} mg/dL` : "Not tested"}`)
    lines.push(`  hs-CRP: ${b.hsCrp != null ? `${b.hsCrp} mg/L` : "Not tested"}`)
    lines.push(`  HbA1c: ${b.hba1c != null ? `${b.hba1c}%` : "Not tested"}`)
    lines.push(`  Glucose: ${b.glucose != null ? `${b.glucose} mg/dL` : "Not tested"}`)
    lines.push(`  TSH: ${b.tsh != null ? `${b.tsh} µIU/mL` : "Not tested"}`)
    lines.push(`  Vitamin D: ${b.vitaminD != null ? `${b.vitaminD} ng/mL` : "Not tested"}`)
    lines.push(`  eGFR: ${b.egfr != null ? `${b.egfr} mL/min` : "Not tested"}`)
    lines.push(`  ALT: ${b.alt != null ? `${b.alt} U/L` : "Not tested"}`)
    lines.push(`  Hemoglobin: ${b.hemoglobin != null ? `${b.hemoglobin} g/dL` : "Not tested"}`)
  } else {
    lines.push(`\nBLOOD PANEL DATA: Not available yet`)
  }

  // ── SLEEP ──
  if (s) {
    lines.push(`\nCURRENT SLEEP DATA (${s.nightsCount} nights tracked):`)
    lines.push(`  Total sleep: ${s.totalSleepMin != null ? `${(s.totalSleepMin / 60).toFixed(1)} hrs` : "Not available"}`)
    lines.push(`  Deep sleep: ${s.deepSleepMin != null ? `${s.deepSleepMin.toFixed(0)} min` : "Not available"}`)
    lines.push(`  Sleep efficiency: ${s.sleepEfficiency != null ? `${s.sleepEfficiency.toFixed(0)}%` : "Not available"}`)
    lines.push(`  HRV (RMSSD): ${s.hrvRmssd != null ? `${s.hrvRmssd.toFixed(0)} ms` : "Not available"}`)
    lines.push(`  Resting HR: ${s.restingHr != null ? `${s.restingHr.toFixed(0)} bpm` : "Not available"}`)
    lines.push(`  SpO₂: ${s.spo2Avg != null ? `${s.spo2Avg.toFixed(1)}%` : "Not available"}`)
  } else {
    lines.push(`\nSLEEP DATA: Not available yet (no wearable connected)`)
  }

  // ── QUESTIONNAIRE ──
  if (q) {
    lines.push(`\nQUESTIONNAIRE ANSWERS:`)
    if (q.mouthBreathing) lines.push(`  Mouth breathing: ${q.mouthBreathing}${q.mouthBreathingWhen ? ` (${q.mouthBreathingWhen.replace(/_/g, " ")})` : ""}`)
    if (q.snoringReported) lines.push(`  Snoring: ${q.snoringReported}`)
    if (q.sleepDuration) lines.push(`  Sleep duration: ${q.sleepDuration.replace(/_/g, "-")} hours`)
    if (q.smokingStatus) lines.push(`  Smoking: ${q.smokingStatus}`)
    if (q.sugarIntake) lines.push(`  Sugar frequency: ${q.sugarIntake}`)
    if (q.flossingFreq) lines.push(`  Flossing: ${q.flossingFreq}`)
    if (q.stressLevel) lines.push(`  Stress: ${q.stressLevel}`)
    if (q.antibioticsWindow) lines.push(`  Last antibiotics: ${q.antibioticsWindow.replace(/_/g, " ")}`)
  } else {
    lines.push(`\nQUESTIONNAIRE: Not completed yet`)
  }

  // ── ACTIVE INTERVENTIONS ──
  const interventions = ctx.hasOralKit || ctx.hasBloodPanel ? computeInterventions(ctx) : []
  if (interventions.length > 0) {
    lines.push(`\nACTIVE INTERVENTIONS (recommended based on their data):`)
    for (const int of interventions.slice(0, 8)) {
      lines.push(`  - ${int.title}: ${int.why.slice(0, 150)}`)
    }
  }

  return lines.join("\n")
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { messages } = await req.json() as { messages: Array<{ role: string; content: string }> }
  if (!messages || !Array.isArray(messages)) return new Response("Bad request", { status: 400 })

  const ctx = await getUserPanelContext(user.id)
  const userContext = buildUserContext(ctx)
  const bacterialKnowledge = getBacterialKnowledgePrompt()
  const methodologyKnowledge = getMethodologyPrompt()

  const fullSystemPrompt = `${SYSTEM_PROMPT}\n\n${userContext}\n\n${bacterialKnowledge}\n\n${methodologyKnowledge}`

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

  const stream = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o",
    messages: [
      { role: "system", content: fullSystemPrompt },
      ...messages.slice(-10).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
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

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}

import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { getUserPanelContext } from "../../../../lib/user-context"
import { computeConvergeObservations } from "../../../../lib/converge/observations"
import { validateConvergeContent } from "../../../../lib/converge/validate"
import OpenAI from "openai"
import { createHash } from "crypto"

const PROMPT_VERSION = 1

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function computeDataHash(ctx: Record<string, unknown>): string {
  const keys = [
    "hasOralKit", "hasBloodPanel", "hasWearable", "hasQuestionnaire",
    "panelCount", "convergeStrength",
  ]
  const snapshot: Record<string, unknown> = {}
  for (const k of keys) snapshot[k] = ctx[k]
  if (ctx.oralKit) {
    const o = ctx.oralKit as Record<string, unknown>
    snapshot.oral = { no: o.nitricOxideTotal, gum: o.gumHealthTotal, cav: o.cavityBacteriaTotal, shannon: o.shannonIndex, env: o.envPattern }
  }
  if (ctx.bloodPanel) {
    const b = ctx.bloodPanel as Record<string, unknown>
    snapshot.blood = { ldl: b.ldl, hdl: b.hdl, hsCrp: b.hsCrp, hba1c: b.hba1c, glucose: b.glucose }
  }
  if (ctx.sleepData) {
    const s = ctx.sleepData as Record<string, unknown>
    snapshot.sleep = { nights: s.nightsCount, hrv: s.hrvRmssd, spo2: s.spo2Avg }
  }
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 16)
}

const SYSTEM_PROMPT = `You are generating the opening narrative for a cross-panel health summary on Cnvrg Health.

VOICE:
- Name the mechanism, not the condition
- Use "Looked at individually, ... Read together, ..." structure for the first paragraph
- Never mention conditions being ruled out (no "not sleep apnea", "no signs of diabetes")
- Never use diagnostic language ("at risk for", "indicates", "concerning")
- 2 paragraphs, editorial tone, written for an intelligent non-scientist
- Cite specific numbers with context (values + comparisons, e.g. "2.87% against a target of 10-13%")
- One italic accent phrase per paragraph max (wrap in *asterisks*)
- Cross-panel validation ("two independent sources converging") is the most powerful move — lead with it when applicable
- Be specific to THIS person's data — never generic

STRICT RULES:
1. Never fabricate values — only use numbers from the USER CONTEXT provided
2. Never name ruled-out conditions
3. Never use "may", "might", "could" — state what the data shows
4. Keep each paragraph to 3-4 sentences max

OUTPUT FORMAT (JSON only, no markdown):
{
  "headline": "6-10 word headline",
  "paragraphs": ["paragraph 1", "paragraph 2"]
}`

const FEW_SHOT_EXAMPLES = [
  {
    role: "user" as const,
    content: `USER CONTEXT: oral panel (Neisseria 2.87%, NO total 8.2%, gumHealthTotal 6.1%), blood panel (LDL 142, hs-CRP 2.4), no wearable. OBSERVATIONS: depleted NO + elevated LDL (attention), gum bacteria + CRP tracking (attention), diversity strong (positive).`,
  },
  {
    role: "assistant" as const,
    content: JSON.stringify({
      headline: "One mechanism connects your LDL and oral bacteria",
      paragraphs: [
        "Looked at individually, your LDL at 142 and your depleted Neisseria at 2.87% each have plausible explanations. Read together, they describe a single cardiovascular thread — your nitric oxide bacteria are running at a *3-4× deficit* against the 10-13% target, removing a natural offset that helps modulate cholesterol impact.",
        "Your gum bacteria add a second convergence: Fusobacterium and Aggregatibacter are above typical levels, and your hs-CRP at 2.4 mg/L confirms the inflammation is showing up in your bloodstream. Two independent measurements — mouth and blood — pointing at the same biological process. Addressing the oral source is the most direct path to lowering both numbers.",
      ],
    }),
  },
  {
    role: "user" as const,
    content: `USER CONTEXT: oral panel (Shannon 5.12, NO total 35.2%, envPattern mouth_breathing, aerobicShift 30.2%), questionnaire (mouth_breathing confirmed, daytime_and_sleep), no blood panel. OBSERVATIONS: mouth breathing confirmed (attention), strong diversity (positive), missing blood panel (recheck).`,
  },
  {
    role: "assistant" as const,
    content: JSON.stringify({
      headline: "Your questionnaire and bacteria tell the same story",
      paragraphs: [
        "Your questionnaire reports mouth breathing day and night. Your oral bacteria independently confirm this — an aerobic shift at 30.2% means *oxygen-loving species are more abundant than typical*, the bacterial fingerprint of a dry mouth from open-mouth breathing. Two independent sources converging on the same finding.",
        "The good news is your bacterial diversity sits at 5.12, well within the resilient range, and your nitric oxide pathway is strong at 35.2%. Adding a blood panel would close the inflammatory picture — hs-CRP would show whether your mouth breathing pattern is creating systemic effects beyond the oral environment.",
      ],
    }),
  },
]

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ctx = await getUserPanelContext(user.id)
  const observations = computeConvergeObservations(ctx)

  if (observations.length === 0) {
    return NextResponse.json({
      headline: "Waiting for your markers",
      paragraphs: ["Start with the questionnaire, then add your first panel when ready."],
      cached: false,
    })
  }

  const dataHash = computeDataHash(ctx as unknown as Record<string, unknown>)

  const db = svc()
  const { data: cached } = await db
    .from("converge_cache")
    .select("content")
    .eq("user_id", user.id)
    .eq("kind", "converge_hero")
    .eq("data_hash", dataHash)
    .eq("prompt_version", PROMPT_VERSION)
    .maybeSingle()

  if (cached?.content) {
    return NextResponse.json({ ...cached.content as Record<string, unknown>, cached: true })
  }

  const top5 = observations.slice(0, 5)
  const obsText = top5.map(o => `- [${o.severity}] ${o.title}: ${o.oneLiner}`).join("\n")
  const panelSummary: string[] = []
  if (ctx.hasOralKit) {
    const o = ctx.oralKit!
    panelSummary.push(`oral panel (Shannon ${o.shannonIndex?.toFixed(2)}, NO total ${o.nitricOxideTotal.toFixed(1)}%, gumHealth ${o.gumHealthTotal.toFixed(1)}%, cavityBacteria ${o.cavityBacteriaTotal.toFixed(2)}%, envPattern ${o.envPattern ?? "none"}${o.envAerobicScorePct != null ? `, aerobicShift ${o.envAerobicScorePct.toFixed(1)}%` : ""})`)
  }
  if (ctx.hasBloodPanel) {
    const b = ctx.bloodPanel!
    const parts: string[] = []
    if (b.ldl != null) parts.push(`LDL ${b.ldl}`)
    if (b.hdl != null) parts.push(`HDL ${b.hdl}`)
    if (b.hsCrp != null) parts.push(`hs-CRP ${b.hsCrp}`)
    if (b.hba1c != null) parts.push(`HbA1c ${b.hba1c}`)
    if (b.glucose != null) parts.push(`glucose ${b.glucose}`)
    panelSummary.push(`blood panel (${parts.join(", ")})`)
  }
  if (ctx.hasWearable && ctx.sleepData) {
    const s = ctx.sleepData
    panelSummary.push(`wearable (${s.nightsCount} nights, HRV ${s.hrvRmssd?.toFixed(0) ?? "—"}ms, SpO₂ ${s.spo2Avg?.toFixed(1) ?? "—"}%)`)
  }
  if (ctx.hasQuestionnaire && ctx.questionnaire) {
    const q = ctx.questionnaire
    const flags: string[] = []
    if (q.mouthBreathing === "confirmed" || q.mouthBreathing === "often") flags.push(`mouth_breathing ${q.mouthBreathingWhen ?? ""}`)
    if (q.snoringReported === "yes" || q.snoringReported === "frequent") flags.push("snoring")
    if (q.sinusHistory === "chronic" || q.sinusHistory === "surgical") flags.push(`sinus ${q.sinusHistory}`)
    if (flags.length > 0) panelSummary.push(`questionnaire (${flags.join(", ")})`)
  }

  const userMessage = `USER CONTEXT: ${panelSummary.join(", ")}. ${ctx.firstName ? `Name: ${ctx.firstName}.` : ""} OBSERVATIONS:\n${obsText}`

  try {
    const openai = new OpenAI()
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      max_tokens: 600,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...FEW_SHOT_EXAMPLES,
        { role: "user", content: userMessage },
      ],
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}"
    let result: { headline?: string; paragraphs?: string[] }
    try {
      result = JSON.parse(raw)
    } catch {
      result = { headline: "Your cross-panel picture", paragraphs: [raw] }
    }

    const headline = result.headline ?? "Your cross-panel picture"
    const paragraphs = result.paragraphs ?? []

    const issues = validateConvergeContent(paragraphs.join(" "), ctx, observations)
    if (issues.length > 0) {
      console.warn(`[converge/hero] validation issues:`, issues.length)
    }

    const content = { headline, paragraphs }

    await db.from("converge_cache").upsert({
      user_id: user.id,
      kind: "converge_hero",
      data_hash: dataHash,
      prompt_version: PROMPT_VERSION,
      content,
      generated_at: new Date().toISOString(),
    }, { onConflict: "user_id,kind" })

    return NextResponse.json({ ...content, cached: false })
  } catch (err) {
    console.error("[converge/hero] OpenAI error:", err)
    return NextResponse.json({
      headline: "Your cross-panel picture",
      paragraphs: ["Your panels are being analyzed. Check back shortly."],
      cached: false,
      error: true,
    }, { status: 500 })
  }
}

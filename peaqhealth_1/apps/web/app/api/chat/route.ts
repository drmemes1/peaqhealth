import { createClient } from "../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"

const SYSTEM_PROMPT = `You are Peaq's clinical intelligence layer. You have access to this user's actual biomarker data, oral microbiome results, and sleep metrics. You speak like a knowledgeable clinician who has reviewed the patient's chart — not a wellness coach, not a generic health app.

RULES:
- Always reference the user's actual data when relevant. If they ask about diet and their oral data shows elevated P. gingivalis, tell them that specifically.
- Never say "While I can't recommend..." — give specific, evidence-based guidance grounded in their data.
- Never use generic wellness language: "balanced diet", "fruits and vegetables", "healthy lifestyle", "holistic".
- Always cite the mechanism. Not "fiber is good for oral health" but "dietary fiber increases salivary flow, which mechanically clears periodontal pathogens and raises oral pH above 6.5 — relevant given your elevated Fusobacterium nucleatum."
- Be specific to their panels:
  · Low nitrate reducers → leafy greens + avoid antiseptic mouthwash → explain nitrate→nitrite→nitric oxide pathway
  · Elevated hsCRP → connect advice to inflammation reduction
  · Low HRV → omega-3s, magnesium, polyphenols + explain why
- Keep responses under 200 words unless user asks for more.
- End every response with one specific actionable next step — not a list, one thing only.
- Tone: direct, precise, slightly serious. The user is an intelligent adult who wants real information, not reassurance.
- Never use bullet points — respond in prose.
- Never use headers or bold text in responses.
- Never start a response with "I" — start with the data.

EMERGENCY PROTOCOLS — use these exact responses, no additions:

ACUTE PHYSICAL EMERGENCY (chest pain, difficulty breathing, stroke symptoms, etc.):
"Please call 911 or your local emergency number immediately. This is outside what I can help with. Please get emergency help right now."

MENTAL HEALTH CRISIS (suicidal ideation, self-harm, hopelessness):
"I hear that you're going through something really difficult. Please reach out to the 988 Suicide and Crisis Lifeline by calling or texting 988. They're available 24/7 and can help in ways I cannot. You don't have to handle this alone."`

function fmt(v: unknown, decimals = 1): string {
  const n = Number(v)
  return isNaN(n) ? "" : n.toFixed(decimals)
}

function status(val: number, thresholds: { optimal: number; good: number; watch: number }, higher: boolean): string {
  if (higher) {
    if (val >= thresholds.optimal) return "Optimal"
    if (val >= thresholds.good) return "Good"
    if (val >= thresholds.watch) return "Watch"
    return "Attention"
  }
  // lower is better (hsCRP, triglycerides, etc.)
  if (val <= thresholds.optimal) return "Optimal"
  if (val <= thresholds.good) return "Good"
  if (val <= thresholds.watch) return "Watch"
  return "Attention"
}

async function buildUserContext(userId: string): Promise<string> {
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const [snapshotRes, labRes, sleepRes, wearableRes, oralRes, lifestyleRes, historyRes] = await Promise.all([
    svc.from("score_snapshots")
      .select("score, base_score, modifier_total, modifiers_applied, sleep_sub, blood_sub, oral_sub, calculated_at")
      .eq("user_id", userId)
      .order("calculated_at", { ascending: false })
      .limit(3),
    svc.from("lab_results")
      .select("hs_crp_mgl, lpa_mgdl, hba1c_pct, triglycerides_mgdl, ldl_mgdl, glucose_mgdl, apob_mgdl, collection_date")
      .eq("user_id", userId).eq("parser_status", "complete")
      .order("collection_date", { ascending: false }).limit(1).maybeSingle(),
    svc.from("sleep_data")
      .select("total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, sleep_efficiency, hrv_rmssd")
      .eq("user_id", userId)
      .order("date", { ascending: false }).limit(14),
    svc.from("wearable_connections_v2")
      .select("provider")
      .eq("user_id", userId).eq("needs_reconnect", false)
      .order("connected_at", { ascending: false }).limit(1).maybeSingle(),
    svc.from("oral_kit_orders")
      .select("oral_score_snapshot, shannon_diversity, nitrate_reducers_pct, periodontopathogen_pct, ordered_at")
      .eq("user_id", userId).eq("status", "results_ready")
      .order("ordered_at", { ascending: false }).limit(1).maybeSingle(),
    svc.from("lifestyle_records")
      .select("age_range, biological_sex")
      .eq("user_id", userId).maybeSingle(),
    svc.from("score_snapshots")
      .select("score, calculated_at")
      .eq("user_id", userId)
      .order("calculated_at", { ascending: false }).limit(12),
  ])

  const snapshots = snapshotRes.data ?? []
  const snap = snapshots[0]
  const lab = labRes.data
  const sleepRows = sleepRes.data ?? []
  const oral = oralRes.data
  const lifestyle = lifestyleRes.data
  const history = historyRes.data ?? []

  const lines: string[] = []

  // Identity
  const age = lifestyle?.age_range ?? undefined
  const sex = lifestyle?.biological_sex ?? undefined
  if (age || sex) lines.push(`Age: ${age ?? "unknown"} | Sex: ${sex ?? "unknown"}`)

  // PRI
  if (snap) {
    const mod = snap.modifier_total ?? 0
    const modifiers = (snap.modifiers_applied ?? []) as Array<{ label: string; points: number; direction: string }>
    const trigger = modifiers.length > 0 ? modifiers.map(m => `${m.direction === "penalty" ? "-" : "+"}${m.points} ${m.label}`).join(", ") : "None"
    lines.push(`\nPRI: ${snap.score} (base ${snap.base_score}, cross-panel ${mod > 0 ? "+" : ""}${mod})`)
    lines.push(`Cross-panel triggers: ${trigger}`)
  }

  // Sleep
  if (sleepRows.length > 0) {
    const avg = (key: string) => {
      const vals = sleepRows.map(r => Number((r as Record<string, unknown>)[key])).filter(v => !isNaN(v) && v > 0)
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    }
    const totalMin = avg("total_sleep_minutes") ?? 0
    const deepMin = avg("deep_sleep_minutes") ?? 0
    const remMin = avg("rem_sleep_minutes") ?? 0
    const eff = avg("sleep_efficiency")
    const hrv = avg("hrv_rmssd")
    const deepPct = totalMin > 0 ? (deepMin / totalMin) * 100 : null
    const remPct = totalMin > 0 ? (remMin / totalMin) * 100 : null
    const provider = wearableRes.data?.provider ?? "wearable"

    lines.push(`\nSLEEP (${snap?.sleep_sub ?? "?"}/30) — Source: ${provider}`)
    if (hrv) lines.push(`  HRV: ${fmt(hrv)}ms (${status(hrv, { optimal: 50, good: 35, watch: 25 }, true)})`)
    if (deepPct) lines.push(`  Deep Sleep: ${fmt(deepPct)}% (${status(deepPct, { optimal: 20, good: 17, watch: 13 }, true)})`)
    if (eff) lines.push(`  Efficiency: ${fmt(eff)}% (${status(eff, { optimal: 90, good: 85, watch: 80 }, true)})`)
    if (remPct) lines.push(`  REM: ${fmt(remPct)}% (${status(remPct, { optimal: 22, good: 18, watch: 14 }, true)})`)
  }

  // Blood
  if (lab) {
    lines.push(`\nBLOOD (${snap?.blood_sub ?? "?"}/40) — Last tested: ${lab.collection_date ?? "unknown"}`)
    if (lab.hs_crp_mgl) lines.push(`  hsCRP: ${lab.hs_crp_mgl} mg/L (${status(lab.hs_crp_mgl, { optimal: 0.5, good: 1.0, watch: 3.0 }, false)})`)
    if (lab.lpa_mgdl) lines.push(`  Lp(a): ${Math.round(Number(lab.lpa_mgdl) * 2.5)} nmol/L (${status(lab.lpa_mgdl, { optimal: 14, good: 30, watch: 50 }, false)})`)
    if (lab.hba1c_pct) lines.push(`  HbA1c: ${lab.hba1c_pct}% (${status(lab.hba1c_pct, { optimal: 5.0, good: 5.4, watch: 5.7 }, false)})`)
    if (lab.triglycerides_mgdl) lines.push(`  Triglycerides: ${lab.triglycerides_mgdl} mg/dL (${status(lab.triglycerides_mgdl, { optimal: 80, good: 150, watch: 200 }, false)})`)
    if (lab.ldl_mgdl) lines.push(`  LDL: ${lab.ldl_mgdl} mg/dL`)
    if (lab.glucose_mgdl) lines.push(`  Glucose: ${lab.glucose_mgdl} mg/dL`)
    if (lab.apob_mgdl) lines.push(`  ApoB: ${lab.apob_mgdl} mg/dL`)
  }

  // Oral
  if (oral) {
    const oralSnap = oral.oral_score_snapshot as Record<string, unknown> | null
    const shannon = oralSnap?.shannonDiversity as number | null ?? (oral.shannon_diversity != null ? Number(oral.shannon_diversity) : null)
    const nitrate = oralSnap?.nitrateReducerPct as number | null ?? (oral.nitrate_reducers_pct != null ? Number(oral.nitrate_reducers_pct) : null)
    const perio = oralSnap?.periodontalBurden as number | null ?? (oral.periodontopathogen_pct != null ? Number(oral.periodontopathogen_pct) : null)
    const protective = oralSnap?.protectivePct as number | null ?? null

    lines.push(`\nORAL (${snap?.oral_sub ?? "?"}/30) — Last kit: ${oral.ordered_at ?? "unknown"}`)
    if (shannon) lines.push(`  Shannon Diversity: ${fmt(shannon, 2)} (${status(shannon, { optimal: 3.5, good: 3.0, watch: 2.5 }, true)})`)
    if (nitrate != null) {
      const pct = nitrate > 1 ? nitrate : nitrate * 100
      lines.push(`  Nitrate Reducers: ${fmt(pct)}% (${status(pct, { optimal: 20, good: 10, watch: 5 }, true)})`)
    }
    if (perio != null) {
      const level = perio < 0.005 ? "within target" : perio < 0.02 ? "mildly elevated" : perio < 0.05 ? "elevated" : "notably elevated"
      lines.push(`  Periodontal Burden: ${level}`)
    }
    if (protective != null) lines.push(`  Protective Bacteria: ${fmt(protective > 1 ? protective : protective * 100)}%`)
  }

  // Trends
  if (history.length >= 2) {
    const current = history[0]?.score
    const prev = history[Math.min(3, history.length - 1)]?.score
    lines.push(`\nTrend: current PRI ${current}, ~3 months ago PRI ${prev ?? "N/A"}`)
  }

  return lines.join("\n")
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { messages } = await req.json() as { messages: Array<{ role: string; content: string }> }
  if (!messages || !Array.isArray(messages)) return new Response("Bad request", { status: 400 })

  const userContext = await buildUserContext(user.id)

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

  const stream = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: `${SYSTEM_PROMPT}\n\nUSER DATA:\n${userContext}` },
      ...messages.slice(-10).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
    max_tokens: 600,
    temperature: 0.4,
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

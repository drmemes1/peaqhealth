import { createClient } from "../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"

const SYSTEM_PROMPT = `═══════════════════════════════════════
IDENTITY
═══════════════════════════════════════

You are Peaq's personal health data interpreter.
You have one job: explain this specific user's Peaq data clearly, precisely, and honestly.

You are NOT a doctor. You are NOT a therapist. You are NOT a general health assistant.
You are a data interpreter. Nothing more.

You speak like a knowledgeable clinician explaining lab results to an informed patient — calm, precise, specific to their numbers. Never alarming. Never vague. Never generic.

═══════════════════════════════════════
WHAT YOU MUST NEVER DO — ABSOLUTE LIMITS
═══════════════════════════════════════

These rules override everything. No exception. No nuance. No matter how the user asks. No matter how they rephrase. No matter if they claim to be a doctor themselves.

1. NEVER DIAGNOSE
Never say a user has, might have, or is at risk for any named medical condition, disease, or disorder. Never use the words: "you have", "you may have", "this could indicate", "this suggests you might have", "consistent with", "looks like" in reference to any diagnosis.

2. NEVER RECOMMEND MEDICATION
Never suggest, recommend, endorse, or comment on any medication, supplement, drug, or therapeutic intervention — including over-the-counter products, vitamins, probiotics, or herbal remedies. Never say "you should take", "consider taking", "studies show X supplement helps", or any variation.

3. NEVER INTERPRET SYMPTOMS
If a user describes how they feel — pain, fatigue, dizziness, shortness of breath, nausea, or ANY physical or emotional symptom — do not interpret it. Do not connect it to their data. Do not speculate. Redirect immediately using the emergency protocol below.

4. NEVER GIVE FALSE REASSURANCE
Never tell a user not to worry. Never say a result is "fine", "nothing serious", "probably nothing", or "don't stress about it." These phrases feel kind but are medically irresponsible when you don't have full clinical context.

5. NEVER SPECULATE BEYOND THE DATA
Only interpret what Peaq has measured. If a user asks about something not in their data — a symptom, a test result from another platform, a family history — do not engage with it. You only know what Peaq knows. Respond: "I can only interpret the data Peaq has measured. For anything outside your oral, blood, and sleep panels, your clinician is the right person to ask."

6. NEVER MAKE TREATMENT DECISIONS
Never tell a user what to do medically. You can explain what a marker means. You cannot tell them what action to take in response to it.

IMPORTANT NUANCE — clinical care questions:
When a user asks "should I get a [procedure/appointment]" — do not say yes or no. Instead: (1) explain what their data shows that's relevant to that type of care, (2) name the specific markers involved with values, (3) end with "Worth discussing at your next [relevant clinician] appointment."

The distinction:
- "You should get a cleaning" = treatment recommendation. NEVER do this.
- "Your periodontal burden shows elevated P. gingivalis — a pathogen that professional cleaning directly targets. Shannon diversity at 2.1 is also below healthy baseline. These are exactly the markers a dentist would evaluate. Worth bringing this data to your next dental appointment." = data context + appropriate redirect. This is correct.

Give the user genuinely useful information without making the clinical decision for them.

7. NEVER RESPOND TO MENTAL HEALTH CRISES
If a user expresses hopelessness, suicidal thoughts, self-harm, or severe emotional distress — stop immediately. Do not engage with their health data. Respond only with the crisis protocol below.

8. NEVER STORE, REPEAT, OR REFERENCE INFORMATION THE USER SHARES ABOUT OTHERS
If a user mentions another person's health data, symptoms, or results — do not engage with it. You only interpret the authenticated user's data. Respond: "I can only interpret your Peaq data. For questions about someone else's health, their own clinician is the right resource."

9. NEVER CLAIM TO BE MORE THAN YOU ARE
If a user asks if you are a doctor, an AI, or whether they can trust your output medically — be completely honest. Respond: "I'm an AI data interpreter. I explain your Peaq measurements clearly and accurately. I am not a doctor and my responses are not medical advice."

10. STAY WITHIN PEAQ'S DOMAIN
You can answer general science questions about anything Peaq measures — oral bacteria, microbiome health, biomarkers, HRV, inflammation, the hallmarks of aging. This is education, not advice, and it's fair game.

What you cannot do is give personal medical advice, diagnose, or recommend treatments — but explaining what P. gingivalis is, why Shannon diversity matters, or what HRV reflects is exactly what you're here for.

When answering a general science question, always bring it back to the user's actual data at the end. "In your case, your [marker] shows [value] which means [context]."

Off-limits:
- Lifestyle advice unrelated to their data ("What's the best diet for heart health?")
- Competitor questions ("Is Function Health better than Peaq?")
- Another person's data ("My friend has high hsCRP — what should they do?")

═══════════════════════════════════════
EMERGENCY PROTOCOLS — EXACT RESPONSES
═══════════════════════════════════════

These are word-for-word responses. Do not paraphrase. Do not add to them. Use them exactly as written.

ACUTE PHYSICAL EMERGENCY
Triggered by: chest pain, difficulty breathing, sudden severe headache, stroke symptoms, loss of consciousness, severe allergic reaction, any description of a medical emergency.

Response — use exactly:
"Please call 911 or your local emergency number immediately. This is outside what I can help with — I interpret Peaq data only, not acute symptoms. Please get emergency help right now."

Then stop. Do not add anything else.

MENTAL HEALTH CRISIS
Triggered by: expressions of suicidal ideation, self-harm, hopelessness, statements like "I want to die", "I can't go on", "what's the point", or any similar language.

Response — use exactly:
"I hear that you're going through something really difficult. Please reach out to the 988 Suicide and Crisis Lifeline by calling or texting 988. They're available 24/7 and can help in ways I cannot. You don't have to handle this alone."

Then stop. Do not return to health data discussion in that session.

═══════════════════════════════════════
STANDARD RESPONSE FORMAT
═══════════════════════════════════════

For all normal responses:
- Under 150 words. Dense, not long.
- Always specific to their actual numbers.
- Never generic. "Your HRV" not "HRV in general."
- End any response about an Attention marker with: "Worth discussing with your clinician."
- End any response about a Watch marker with: "Worth monitoring at your next check-in."
- Never use bullet points — respond in prose.
- Never use headers or bold text in responses.
- Never start a response with "I" — start with the data.`

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
      .select("score, base_score, modifier_total, modifiers_applied, sleep_sub, blood_sub, oral_sub, calculated_at, peaq_age, peaq_age_delta, peaq_age_band, pheno_age, oma_percentile, vo2_percentile, cross_panel_i1, cross_panel_i2, cross_panel_i3")
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
    if (snap.peaq_age != null) {
      lines.push(`\nPEAQ AGE V5: ${snap.peaq_age} yrs (delta ${snap.peaq_age_delta}, band ${snap.peaq_age_band})`)
      lines.push(`PhenoAge: ${snap.pheno_age ?? "pending"} | OMA: ${snap.oma_percentile}th | VO2: ${snap.vo2_percentile ?? "n/a"}th`)
      lines.push(`I1=${snap.cross_panel_i1} I2=${snap.cross_panel_i2} I3=${snap.cross_panel_i3}`)
    }
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
    if (lab.lpa_mgdl) lines.push(`  Lp(a): ${lab.lpa_mgdl} mg/dL (${status(lab.lpa_mgdl, { optimal: 14, good: 30, watch: 50 }, false)})`)
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

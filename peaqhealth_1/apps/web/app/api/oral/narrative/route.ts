import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { ageRangeToMidpoint, getHRVTarget } from "../../../../lib/score/recalculate"

export const dynamic = "force-dynamic"

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const avg = (arr: number[]): number | null =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null

// Normalise oral values that may be stored as fraction (0-1) or percentage (>1)
const toOralPct = (v: unknown): number | null => {
  if (v == null) return null
  const n = Number(v)
  if (isNaN(n)) return null
  return Math.min(n > 1 ? n : n * 100, 100)
}

// periodontalBurden and osaBurden are stored as raw fractional abundances (0–1 scale, same as OTU entries)
// Thresholds: 0.005 = 0.5% reads, 0.02 = 2% reads, 0.05 = 5% reads — consistent with labs/insight route
function burdenLevel(val: number | null): string {
  if (val === null) return "not detected"
  if (val < 0.005) return "within target"
  if (val < 0.02)  return "mildly elevated"
  if (val < 0.05)  return "elevated"
  return "notably elevated"
}

export async function GET() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Misconfigured" }, { status: 503 })

  const supabase = svc()
  const userId = user.id

  // ── Fetch oral kit data ────────────────────────────────────────────────────
  const { data: oralKit } = await supabase
    .from("oral_kit_orders")
    .select("oral_score_snapshot, shannon_diversity, collection_date, ordered_at, mouthwash_detected")
    .eq("user_id", userId)
    .eq("status", "results_ready")
    .order("ordered_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!oralKit) {
    return NextResponse.json({ narrative: null, reason: "no_oral_data" })
  }

  // Resolve cache key date — fall back to ordered_at date if collection_date is absent
  const kitDate = (oralKit.collection_date ?? oralKit.ordered_at?.split("T")[0]) as string | undefined
  if (!kitDate) {
    console.error("[oral-narrative] no kit date available — cannot cache")
    return NextResponse.json({ narrative: null, reason: "no_kit_date" })
  }
  const today = new Date().toISOString().split("T")[0]

  // ── Cache check — skip if < 7 days old ────────────────────────────────────
  const { data: cached } = await supabase
    .from("oral_narratives")
    .select("*")
    .eq("user_id", userId)
    .eq("collection_date", kitDate)
    .maybeSingle()

  const cacheAgeDays = cached
    ? (Date.now() - new Date(cached.generated_at as string).getTime()) / 86400000
    : Infinity

  if (cached && cacheAgeDays < 7) {
    console.log(`[oral-narrative] cache hit for user=${userId.slice(0, 8)} age=${cacheAgeDays.toFixed(1)}d`)
    return NextResponse.json({ narrative: cached, cached: true })
  }

  // ── Parse oral snapshot ────────────────────────────────────────────────────
  const snap = oralKit.oral_score_snapshot as Record<string, unknown> | null
  const shannon = (oralKit.shannon_diversity as number | null) ?? (snap?.shannonDiversity != null ? Number(snap.shannonDiversity) : null)
  const nitrateRaw = snap?.nitrateReducerPct != null ? toOralPct(snap.nitrateReducerPct) : null
  const periodontalRaw = snap?.periodontalBurden != null ? Number(snap.periodontalBurden) : null
  const osaBurdenRaw = snap?.osaBurden != null ? Number(snap.osaBurden) : null
  const pGingivalisRaw = snap?.pGingivalisPct != null ? toOralPct(snap.pGingivalisPct) : null
  const mouthwashDetected = Boolean(oralKit.mouthwash_detected)

  // ── Fetch cross-panel context in parallel ─────────────────────────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]

  const [sleepRes, snapshotRes, lifestyleRes] = await Promise.all([
    supabase
      .from("sleep_data")
      .select("hrv_rmssd, sleep_efficiency")
      .eq("user_id", userId)
      .gte("date", sevenDaysAgo)
      .order("date", { ascending: false }),

    supabase
      .from("score_snapshots")
      .select("blood_sub, modifiers_applied")
      .eq("user_id", userId)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("lifestyle_records")
      .select("age_range, biological_sex")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const sleepNights = sleepRes.data ?? []
  const hrvValues = sleepNights.map(n => n.hrv_rmssd).filter((v): v is number => v != null && v > 0)
  const avgHrv = avg(hrvValues)
  const modifiers = (snapshotRes.data?.modifiers_applied ?? []) as Array<{ label: string; points: number; direction: string }>

  const ageRange = lifestyleRes.data?.age_range as string | null
  const biologicalSex = lifestyleRes.data?.biological_sex as string | null
  const age = ageRangeToMidpoint(ageRange)
  const hrvTarget = getHRVTarget(age)

  // ── Build prompts ──────────────────────────────────────────────────────────
  const systemPrompt = `You are the oral microbiome intelligence engine for Peaq Health, a longevity platform built by a cardiologist and periodontist.

Generate a short, personal oral health narrative for this user based on their latest microbiome kit. Connect oral signals to their sleep or blood panels where the data supports it.

VOICE:
- Warm, direct, like a knowledgeable friend reviewing your results
- Specific — use actual numbers where available
- Never alarming — observational and curious
- 2-3 sentences max for the narrative
- Use "consider" for actions, never "you should"
- Use "research has shown" or "this has been linked to" for mechanism language — never "causes"
- Never mention disease, diagnosis, or clinical urgency

RULES:
- Never cite raw burden percentages — use qualitative descriptors only (within target, mildly elevated, elevated, notably elevated)
- Cross-panel connection to HRV or blood only when the data supports it; never forced
- If nitrate reducers are below 20% AND HRV is below the age-adjusted target → mention the nitric oxide pathway connection
- If Shannon diversity is above 3.0 → celebrate it specifically with the number
- If periodontal burden is elevated → note it without alarm, frame as "worth keeping an eye on"
- If mouthwash is detected: mention it once, gently — "antiseptic mouthwash can suppress nitrate-reducing bacteria"
- Return ONLY valid JSON. No markdown. No backticks.`

  const nitrateStr = nitrateRaw != null ? `${nitrateRaw.toFixed(1)}% (target ≥20%)` : "not available"
  const periodontalStr = burdenLevel(periodontalRaw)
  const osaStr = burdenLevel(osaBurdenRaw)
  const shannonStr = shannon != null ? `${shannon.toFixed(2)} (target ≥3.0${shannon >= 3 ? " — above target" : ""})` : "not available"
  const hrvStr = avgHrv != null
    ? `${avgHrv.toFixed(1)} ms (age-adjusted target: ${hrvTarget.optimal}ms optimal, ${hrvTarget.good}ms good${avgHrv >= hrvTarget.optimal ? " — above optimal" : avgHrv >= hrvTarget.good ? " — good range" : " — below good range"})`
    : "no recent sleep data"
  const ageStr = ageRange ? `${ageRange}${biologicalSex ? `, ${biologicalSex}` : ""}` : "not provided"

  const userPrompt = `Generate a personalized oral microbiome narrative for this user.

KIT DATE: ${kitDate}

ORAL DATA:
- Shannon diversity: ${shannonStr}
- Nitrate-reducing bacteria: ${nitrateStr}
- Periodontal burden (P. gingivalis + T. denticola + T. forsythia composite): ${periodontalStr}
- OSA-associated taxa (Prevotella + Fusobacterium composite): ${osaStr}
${pGingivalisRaw != null ? `- P. gingivalis: ${pGingivalisRaw.toFixed(2)}% (target <0.1%)` : ""}
${mouthwashDetected ? "- Antiseptic mouthwash detected" : ""}

CROSS-PANEL CONTEXT:
- Recent HRV (7-day avg): ${hrvStr}
- Active cross-panel modifiers: ${modifiers.length > 0 ? modifiers.map(m => m.label).join(", ") : "none"}
- User age / sex: ${ageStr}

Return this exact JSON:
{
  "headline": "6-10 words, specific to this user's oral data, warm",
  "narrative": "2-3 sentences. Use actual numbers. Connect to another panel if data supports it. Warm and observational.",
  "positive_signal": "One specific strength — actual number if relevant. null if nothing notable.",
  "watch_signal": "One thing worth monitoring — framed with curiosity. null if nothing notable."
}`

  // ── Call OpenAI ────────────────────────────────────────────────────────────
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return NextResponse.json({ error: "No AI key" }, { status: 503 })

  const openai = new OpenAI({ apiKey: openaiKey })
  const model  = process.env.OPENAI_MODEL ?? "gpt-4.1-mini"

  let result: Record<string, unknown>
  try {
    const completion = await openai.chat.completions.create({
      model,
      max_tokens: 400,
      temperature: 0.65,
      store: false, // HIPAA ZDR
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
    })
    const raw = completion.choices[0]?.message.content ?? "{}"
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim()
    result = JSON.parse(cleaned) as Record<string, unknown>
    console.log(`[oral-narrative] generated for user=${userId.slice(0, 8)} headline="${result.headline}"`)
  } catch (err) {
    console.error("[oral-narrative] generation failed:", err)
    return NextResponse.json({ narrative: null, error: String(err) }, { status: 500 })
  }

  // ── Upsert to cache ────────────────────────────────────────────────────────
  const { data: saved, error: upsertErr } = await supabase
    .from("oral_narratives")
    .upsert({
      user_id:         userId,
      collection_date: kitDate,
      generated_at:    new Date().toISOString(),
      headline:        result.headline        ?? null,
      narrative:       result.narrative       ?? null,
      positive_signal: result.positive_signal ?? null,
      watch_signal:    result.watch_signal    ?? null,
      oral_context:    { shannon, nitrateRaw, periodontalRaw, osaBurdenRaw, mouthwashDetected },
      blood_context:   { modifiers },
      sleep_context:   { avgHrv, ageRange, biologicalSex },
      raw_response:    result,
    }, { onConflict: "user_id,collection_date" })
    .select()
    .single()

  if (upsertErr) {
    console.error("[oral-narrative] upsert failed:", upsertErr.message)
    return NextResponse.json({
      narrative: { ...result, collection_date: kitDate, generated_at: today },
      cached: false,
    })
  }

  return NextResponse.json({ narrative: saved, cached: false })
}

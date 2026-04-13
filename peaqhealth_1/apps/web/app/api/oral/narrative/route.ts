import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { ageRangeToMidpoint, getHRVTarget } from "../../../../lib/score/recalculate"

export const dynamic = "force-dynamic"

// Bump on material prompt changes (new rules, tone shifts, new modifier branches).
// Cosmetic changes (spelling, punctuation) do not require a bump.
// See memory/project_oral_narrative_prompt_versioning.md.
const PROMPT_VERSION = "v3"

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
  // Filter by prompt_version so a version bump auto-bypasses stale rows.
  const { data: cached } = await supabase
    .from("oral_narratives")
    .select("*")
    .eq("user_id", userId)
    .eq("collection_date", kitDate)
    .eq("prompt_version", PROMPT_VERSION)
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
      .select("age_range, biological_sex, smoking_status, nasal_obstruction, sinus_history, snoring_reported, mouth_breathing")
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
  const smokingStatus = lifestyleRes.data?.smoking_status as string | null
  const nasalObstruction = lifestyleRes.data?.nasal_obstruction as string | null
  const sinusHistory = lifestyleRes.data?.sinus_history as string | null
  const snoringReported = lifestyleRes.data?.snoring_reported as string | null
  const mouthBreathing = lifestyleRes.data?.mouth_breathing as string | null
  const age = ageRangeToMidpoint(ageRange)
  const hrvTarget = getHRVTarget(age, biologicalSex)
  const anyAirwayProvided = Boolean(nasalObstruction || sinusHistory || snoringReported || mouthBreathing)

  // ── Build prompts ──────────────────────────────────────────────────────────
  const systemPrompt = `You are Peaq's health intelligence layer. You write warm, plain-English oral health insights for real people — not patients, not lab reports. Your job is to connect what we found in their mouth to something they can actually feel or track, and give them one or two things worth trying.

RESPONSE SHAPE — return valid JSON matching this schema exactly:
{
  "headline": string,        // 6-10 words, present tense, no jargon
  "narrative": string,       // 3-5 sentences, plain English, see rules below
  "positive_signal": string, // 1-2 sentences, genuine strength, ends on warmth
  "watch_signal": string     // 1-2 sentences, soft concern + one concrete action
}

─────────────────────────────────────────
TONE — non-negotiable
─────────────────────────────────────────
- Write like a knowledgeable friend, not a clinician filing a report
- Warm and curious, never alarming
- "worth keeping an eye on" not "elevated and concerning"
- "something to try" not "you should"
- "linked to" not "causes" or "indicates"
- One idea per sentence. Short sentences.

NEVER USE these words or phrases:
dysbiosis, taxa, genus, species, ASV, OTU, 16S, RMSSD, VSC, narG,
percentile (use "for someone your age" instead),
clinically significant, statistically, your data suggests, it appears,
you have [condition], diagnosed, at risk for

BACTERIA NAMES: use at most once per insight, immediately followed by plain-English explanation in parentheses. Example: "Neisseria (bacteria that help make nitric oxide)"

─────────────────────────────────────────
NARRATIVE RULES
─────────────────────────────────────────
1. Lead with what it means for the person — not what the bacteria is doing
2. Connect oral finding → something they can see or feel (HRV, energy, breath, sleep)
3. Cross-panel connections (HRV, blood) ONLY when the context data supports it
4. Never diagnose. Use: "linked to" / "associated with" / "worth looking into"
5. Never mention raw percentages or abundance numbers
6. Use burden language: within target / mildly elevated / elevated / notably elevated

─────────────────────────────────────────
HRV FRAMING — use age/sex context when provided
─────────────────────────────────────────
Do not say "your HRV is low" — always contextualise:
"your HRV is a little lower than we'd expect for someone your age"
"this is on the lower end for a woman in her 30s"

If user is female: add one soft mention that HRV naturally dips in the second half of the monthly cycle — this is normal and shouldn't be alarming.

─────────────────────────────────────────
QUESTIONNAIRE MODIFIERS — check before writing
─────────────────────────────────────────
IF antiseptic mouthwash flagged (alcohol, chlorhexidine, or essential oils):
  → Lead the narrative with this — it is the most likely root cause of low nitrate-reducing bacteria
  → "The active ingredients in your mouthwash kill the bacteria your body uses to produce nitric oxide, which helps regulate blood pressure and HRV. Switching to a fluoride-only rinse or stopping mouthwash entirely is free and one of the fastest changes you can make."

IF current smoker:
  → Acknowledge in watch_signal: "Smoking reduces nitric oxide-producing bacteria more than almost anything else — even small reductions in smoking make a meaningful difference here"

AIRWAY MODIFIERS — only fire when the user provided airway data.
If all four airway fields are "not provided", skip every airway rule below and do not assume defaults.

IF nasal_obstruction is "often" or "chronic", OR sinus_history is anything other than "none", OR mouth_breathing is "often" or "confirmed":
  → Reframe the oral findings as mouth-breathing-driven, not sleep-apnoea-driven
  → Reframe any elevated respiratory signals as nasal obstruction rather than OSA
  → Soften with: "Since nasal breathing can be tricky for you, some of these signals are likely your mouth doing the breathing work overnight — not a deeper issue. Improving nasal airflow often improves these numbers on its own."
  → Suggest in watch_signal one concrete, gentle action: nasal strips at night, a saline rinse, or a check-in with an ENT if it's been a while

IF sinus_history is "nasal_polyps":
  → Additionally note, softly: nasal polyps are linked to eosinophilic airway inflammation, and a periodic ENT review is worth considering if not done recently

IF snoring_reported is "osa_diagnosed":
  → Suppress all sleep-apnoea framing — the user already knows about it
  → Reframe as: "Given your sleep history, your oral bacteria pattern fits what we'd expect. Here's how to improve it from the oral side."
  → Do not suggest sleep studies, CPAP, or ENT referral in this case

─────────────────────────────────────────
POSITIVE SIGNAL — genuine, specific, not generic
─────────────────────────────────────────
Find the actual strongest finding in the data and name it.
Examples of good positive signals:
- "Your nitric oxide bacteria are working well — this is linked to healthier blood pressure and better overnight recovery"
- "Your cavity-protection bacteria are strong — this is a real advantage"
- "Your oral diversity is genuinely impressive — a rich ecosystem is protective"

Never use generic praise like "you're doing great" or "your overall score is good"

─────────────────────────────────────────
WATCH SIGNAL — soft, one concrete action
─────────────────────────────────────────
One thing worth keeping an eye on. End with one specific, easy action.
Examples:
- "Your breath bacteria are a little elevated — tongue scraping each morning is the simplest way to start shifting this"
- "Some bacteria linked to gum sensitivity are present — daily flossing or a water flosser targets exactly this"
- "Your nitric oxide bacteria are on the lower side — leafy greens or beetroot a few times a week directly feeds these"

OUTPUT — valid JSON only, no markdown, no preamble, no backticks.
Always express the score as 'Peaq Age' in years, not points or /100. A negative delta means younger (favorable). Components: PhenoAge 48%, OMA 22%, RHR 11%, HRV 8% (pending), Sleep 9%, Cross-panel 3%. VO₂ max is informational only — do not reference it as a scored component.`

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
Mouthwash status: ${mouthwashDetected ? 'antiseptic detected in sample' : 'not detected'}. If antiseptic, reference Kapil 2020 when discussing oral-cardiovascular connection.

CROSS-PANEL CONTEXT:
- Recent HRV (7-day avg): ${hrvStr}
- Active cross-panel modifiers: ${modifiers.length > 0 ? modifiers.map(m => m.label).join(", ") : "none"}
- User age / sex: ${ageStr}
- Smoking status: ${smokingStatus ?? "not provided"}

AIRWAY / SINUS CONTEXT:
${anyAirwayProvided ? `- Nasal obstruction: ${nasalObstruction ?? "not provided"}
- Sinus history: ${sinusHistory ?? "not provided"}
- Snoring / OSA: ${snoringReported ?? "not provided"}
- Mouth breathing: ${mouthBreathing ?? "not provided"}` : "- All airway fields: not provided (skip airway modifiers entirely)"}

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
      max_tokens: 600,
      temperature: 0.3,
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
      prompt_version:  PROMPT_VERSION,
      generated_at:    new Date().toISOString(),
      headline:        typeof result.headline === "string" ? result.headline : null,
      narrative:       typeof result.narrative === "string" ? result.narrative : null,
      positive_signal: typeof result.positive_signal === "string" ? result.positive_signal : null,
      watch_signal:    typeof result.watch_signal === "string" ? result.watch_signal : null,
      oral_context:    { shannon, nitrateRaw, periodontalRaw, osaBurdenRaw, mouthwashDetected },
      blood_context:   { modifiers },
      sleep_context:   { avgHrv, ageRange, biologicalSex, smokingStatus, nasalObstruction, sinusHistory, snoringReported, mouthBreathing },
      raw_response:    result,
    }, { onConflict: "user_id,collection_date,prompt_version" })
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

import OpenAI from "openai"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createHash } from "crypto"
import { MARKERS, type MarkerDefinition, computeVerdict, computeScalePosition, getValueFromCtx } from "../markers/registry"
import type { UserPanelContext } from "../user-context"

const CURRENT_PROMPT_VERSION = "v1"

export interface MarkerInsight {
  markerId: string
  verdict: string
  verdictLabel: string
  plainMeaning: string
  narrative: string | null
  scaleUserPosition: number | null
  crossPanelObservations: { relatedMarker: string; observation: string }[]
  generatedAt: string
}

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export function computeDataHash(marker: MarkerDefinition, ctx: UserPanelContext): string {
  const snapshot: Record<string, unknown> = {
    value: getValueFromCtx(ctx as unknown as Record<string, unknown>, marker.ctxPath),
    sex: ctx.sex,
    age: ctx.age,
  }
  for (const connId of marker.crossPanelConnections) {
    const conn = MARKERS[connId]
    if (conn) snapshot[connId] = getValueFromCtx(ctx as unknown as Record<string, unknown>, conn.ctxPath)
  }
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 16)
}

function buildSystemPrompt(marker: MarkerDefinition, ctx: UserPanelContext): string {
  const connectedValues: string[] = []
  for (const connId of marker.crossPanelConnections) {
    const conn = MARKERS[connId]
    if (!conn) continue
    const val = getValueFromCtx(ctx as unknown as Record<string, unknown>, conn.ctxPath)
    if (val != null) connectedValues.push(`${conn.label}: ${val} ${conn.unit ?? ""}`)
  }

  return `You are generating a structured insight for a single health marker on Cnvrg Health.

MARKER:
- ID: ${marker.id}
- Label: ${marker.label}
- Question: ${marker.question}
- Scale: ${marker.scale.min} → ${marker.scale.target} → ${marker.scale.max}
- Panel: ${marker.panel}

USER: ${ctx.sex ?? "not specified"}, age ${ctx.age ?? "unknown"}
${connectedValues.length > 0 ? `\nCROSS-PANEL VALUES:\n${connectedValues.join("\n")}` : ""}

VOICE:
- Write like a doctor explaining to a patient across the chair
- Plain English, no jargon (banned: cariogenic, commensal, pathogenic, dysbiosis, periodontal, gingivitis)
- Every number must include context (value vs target)
- Never name conditions being ruled out
- Borderline values (within 5% of cutoff): use RECHECK framing, acknowledge variability
- Never use: "at risk for", "indicates", "concerning", "you should", "you must"

OUTPUT (JSON only, no markdown):
{
  "verdict_label": "string (4-6 words, e.g. 'A touch above target')",
  "plain_meaning": "string (1-2 sentences, specific to user's value)",
  "narrative": "string (3-5 sentences, fuller explanation with cross-panel connections if available)",
  "cross_panel_observations": [{ "related_marker": "string", "observation": "string" }]
}`
}

export async function generateMarkerInsight(
  markerId: string,
  ctx: UserPanelContext,
): Promise<MarkerInsight> {
  const marker = MARKERS[markerId]
  if (!marker) throw new Error(`Unknown marker: ${markerId}`)

  const userValue = getValueFromCtx(ctx as unknown as Record<string, unknown>, marker.ctxPath)

  if (userValue == null) {
    return {
      markerId,
      verdict: "pending",
      verdictLabel: "Not yet measured",
      plainMeaning: `${marker.label} hasn't been measured yet. It will populate when your ${marker.panel} data arrives.`,
      narrative: null,
      scaleUserPosition: null,
      crossPanelObservations: [],
      generatedAt: new Date().toISOString(),
    }
  }

  const verdict = computeVerdict(userValue, marker)
  const scalePos = computeScalePosition(userValue, marker)
  const start = Date.now()

  try {
    const openai = new OpenAI()
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(marker, ctx) },
        { role: "user", content: `The user's ${marker.label} is ${userValue} ${marker.unit ?? ""}. Generate the insight.` },
      ],
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}"
    const parsed = JSON.parse(raw) as {
      verdict_label?: string
      plain_meaning?: string
      narrative?: string
      cross_panel_observations?: { related_marker: string; observation: string }[]
    }

    const insight: MarkerInsight = {
      markerId,
      verdict,
      verdictLabel: parsed.verdict_label ?? verdictFallback(verdict),
      plainMeaning: parsed.plain_meaning ?? `Your ${marker.label} is ${userValue} ${marker.unit ?? ""}.`,
      narrative: parsed.narrative ?? null,
      scaleUserPosition: scalePos,
      crossPanelObservations: (parsed.cross_panel_observations ?? []).map(o => ({ relatedMarker: o.related_marker, observation: o.observation })),
      generatedAt: new Date().toISOString(),
    }

    validateInsight(insight, marker)
    const ms = Date.now() - start
    console.log(`[marker-insight] generated ${markerId} in ${ms}ms verdict=${verdict}`)
    return insight
  } catch (err) {
    console.error(`[marker-insight] generation failed for ${markerId}:`, err)
    return {
      markerId,
      verdict,
      verdictLabel: verdictFallback(verdict),
      plainMeaning: `Your ${marker.label} is ${userValue} ${marker.unit ?? ""}. ${verdict === "good" ? "This is within the target range." : "This is outside the optimal range."}`,
      narrative: null,
      scaleUserPosition: scalePos,
      crossPanelObservations: [],
      generatedAt: new Date().toISOString(),
    }
  }
}

function verdictFallback(verdict: string): string {
  return verdict === "good" ? "In target range"
    : verdict === "watch" ? "Worth watching"
    : verdict === "concern" ? "Needs attention"
    : verdict === "recheck" ? "Recheck recommended"
    : "Pending"
}

const BANNED_TERMS = ["cariogenic", "commensal", "dysbiosis", "pathogenic", "periodontal", "gingivitis", "periodontitis"]

function validateInsight(insight: MarkerInsight, marker: MarkerDefinition): void {
  const text = `${insight.plainMeaning} ${insight.narrative ?? ""}`
  const lower = text.toLowerCase()
  for (const term of BANNED_TERMS) {
    if (lower.includes(term)) {
      console.warn(`[marker-insight] banned term '${term}' in ${marker.id}, stripping`)
      insight.narrative = null
    }
  }
  if (insight.narrative && insight.narrative.length > 800) {
    insight.narrative = insight.narrative.slice(0, 797) + "..."
  }
}

// ── Caching ────────────────────────────────────────────────────────────────

export async function getMarkerInsight(
  userId: string,
  markerId: string,
  ctx: UserPanelContext,
): Promise<MarkerInsight> {
  const marker = MARKERS[markerId]
  if (!marker) throw new Error(`Unknown marker: ${markerId}`)

  const dataHash = computeDataHash(marker, ctx)
  const db = svc()

  const { data: cached } = await db
    .from("marker_insights")
    .select("*")
    .eq("user_id", userId)
    .eq("marker_id", markerId)
    .eq("data_hash", dataHash)
    .eq("prompt_version", CURRENT_PROMPT_VERSION)
    .maybeSingle()

  if (cached) {
    return {
      markerId: cached.marker_id as string,
      verdict: cached.verdict as string,
      verdictLabel: cached.verdict_label as string,
      plainMeaning: cached.plain_meaning as string,
      narrative: cached.narrative as string | null,
      scaleUserPosition: cached.scale_user_position as number | null,
      crossPanelObservations: (cached.cross_panel_observations ?? []) as { relatedMarker: string; observation: string }[],
      generatedAt: cached.generated_at as string,
    }
  }

  const fresh = await generateMarkerInsight(markerId, ctx)

  await db.from("marker_insights").upsert({
    user_id: userId,
    marker_id: markerId,
    panel: marker.panel,
    data_hash: dataHash,
    prompt_version: CURRENT_PROMPT_VERSION,
    verdict: fresh.verdict,
    verdict_label: fresh.verdictLabel,
    plain_meaning: fresh.plainMeaning,
    narrative: fresh.narrative,
    scale_user_position: fresh.scaleUserPosition,
    cross_panel_observations: fresh.crossPanelObservations,
    generated_at: fresh.generatedAt,
    generation_ms: Date.now() - new Date(fresh.generatedAt).getTime(),
    model: "gpt-4o",
  }, { onConflict: "user_id,marker_id,data_hash,prompt_version" }).then(({ error }) => {
    if (error) console.error(`[marker-insight] cache write failed for ${markerId}:`, error.message)
  })

  return fresh
}

// ── Pre-generation ─────────────────────────────────────────────────────────

export async function pregenerateMarkerInsights(userId: string, ctx: UserPanelContext): Promise<{
  markersProcessed: number
  durationMs: number
  errors: string[]
}> {
  const start = Date.now()
  const errors: string[] = []
  const relevantIds = Object.values(MARKERS)
    .filter(marker => getValueFromCtx(ctx as unknown as Record<string, unknown>, marker.ctxPath) != null)
    .sort((a, b) => a.priority - b.priority)
    .map(marker => marker.id)

  let processed = 0

  const batches: string[][] = []
  for (let i = 0; i < relevantIds.length; i += 5) {
    batches.push(relevantIds.slice(i, i + 5))
  }

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(id => getMarkerInsight(userId, id, ctx))
    )
    for (const [i, result] of results.entries()) {
      if (result.status === "fulfilled") {
        processed++
      } else {
        errors.push(`${batch[i]}: ${result.reason}`)
      }
    }
  }

  return {
    markersProcessed: processed,
    durationMs: Date.now() - start,
    errors,
  }
}

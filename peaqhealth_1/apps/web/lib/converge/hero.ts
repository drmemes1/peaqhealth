import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createHash } from "crypto"
import type { UserPanelContext } from "../user-context"
import type { ConvergeObservation } from "./observations"

const PROMPT_VERSION = 1

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function computeDataHash(ctx: Record<string, unknown>): string {
  const keys = ["hasOralKit", "hasBloodPanel", "hasWearable", "hasQuestionnaire", "panelCount", "convergeStrength"]
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

export interface HeroNarrative {
  headline: string
  paragraphs: string[]
}

export async function getConvergeHero(
  userId: string,
  ctx: UserPanelContext,
  observations: ConvergeObservation[],
): Promise<HeroNarrative | null> {
  if (observations.length === 0 || ctx.panelCount < 2) return null

  const dataHash = computeDataHash(ctx as unknown as Record<string, unknown>)
  const db = svc()

  const { data: cached } = await db
    .from("converge_cache")
    .select("content")
    .eq("user_id", userId)
    .eq("kind", "converge_hero")
    .eq("data_hash", dataHash)
    .eq("prompt_version", PROMPT_VERSION)
    .maybeSingle()

  if (cached?.content) {
    const c = cached.content as Record<string, unknown>
    return { headline: c.headline as string, paragraphs: (c.paragraphs as string[]) ?? [] }
  }

  // No cache hit — trigger generation via the API route asynchronously
  // but return null for now so the page renders instantly
  // The POST /api/converge/hero will be called client-side as a background refresh
  return null
}

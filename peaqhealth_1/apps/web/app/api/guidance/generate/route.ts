import { NextResponse } from "next/server"
import { generateGuidance, type GuidanceResponse } from "../../../../lib/guidanceService"
import type { GuidanceInput } from "../../../../lib/guidancePrompts"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  let input: GuidanceInput
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  // Build hash from metric values — only regenerate when data changes
  const incomingHash = hashInput(input)

  // Check cache
  const { data: cached } = await svc
    .from("guidance_cache")
    .select("guidance, data_hash")
    .eq("user_id", user.id)
    .maybeSingle()

  if (cached && cached.data_hash === incomingHash) {
    return NextResponse.json(cached.guidance as GuidanceResponse)
  }

  // Generate fresh guidance
  try {
    const guidance = await generateGuidance(input)

    // Upsert cache
    await svc.from("guidance_cache").upsert({
      user_id: user.id,
      guidance,
      generated_at: guidance.generatedAt,
      data_hash: incomingHash,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })

    return NextResponse.json(guidance)
  } catch (err) {
    console.error("[guidance/generate] error:", err)
    return NextResponse.json({ error: "Generation failed" }, { status: 500 })
  }
}

function hashInput(input: GuidanceInput): string {
  const key = [
    ...input.sleepMetrics.map(m => `${m.clinicalName}:${m.value}:${m.status}`),
    ...input.bloodMetrics.map(m => `${m.clinicalName}:${m.value}:${m.status}`),
    ...input.oralMetrics.map(m => `${m.clinicalName}:${m.value}:${m.status}`),
  ].join("|")
  return Buffer.from(key).toString("base64")
}

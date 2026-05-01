import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { parseOralMicrobiome } from "@peaq/score-engine/oral-parser"
import type { ZymoReport } from "@peaq/score-engine/oral-parser"
import { recalculateScore } from "../../../../lib/score/recalculate"

/**
 * POST /api/admin/oral-regen
 * Body: { userId: string, secret: string }
 *
 * Regenerates oral_score_snapshot from existing raw_otu_table data.
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as { userId?: string; secret?: string }

  if (!body.secret || body.secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!body.userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 })
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch existing oral kit with raw OTU data
  const { data: kit, error: fetchErr } = await svc
    .from("oral_kit_orders")
    .select("id, raw_otu_table, shannon_diversity, collection_date, ordered_at")
    .eq("user_id", body.userId)
    .not("raw_otu_table", "is", null)
    .order("ordered_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchErr || !kit) {
    return NextResponse.json({ error: "No oral kit found", detail: fetchErr?.message }, { status: 404 })
  }

  const taxonomy = kit.raw_otu_table as Record<string, number>
  console.log("[oral-regen] taxonomy keys:", Object.keys(taxonomy).length)
  console.log("[oral-regen] sample values:", {
    pGingivalis: taxonomy["Porphyromonas gingivalis"],
    tDenticola: taxonomy["Treponema denticola"],
    fNucleatum: taxonomy["Fusobacterium nucleatum"],
    prevMelan: taxonomy["Prevotella melaninogenica"],
  })

  // Build ZymoReport from existing data
  const zymoReport: ZymoReport = {
    sample_id: `regen-${kit.id}`,
    collection_date: (kit.collection_date as string | null) ?? (kit.ordered_at as string | null) ?? new Date().toISOString(),
    sequencing_date: new Date().toISOString(),
    total_reads: Object.values(taxonomy).reduce((s, v) => s + v, 0),
    taxonomy,
    diversity_metrics: kit.shannon_diversity ? { shannon_index: kit.shannon_diversity } : undefined,
  }

  // Reparse
  const oralScore = parseOralMicrobiome(zymoReport)

  // Override mouthwash detection with lifestyle_records (not biochemical inference)
  const { data: lifestyleRec } = await svc
    .from("lifestyle_records")
    .select("mouthwash_type")
    .eq("user_id", body.userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const mouthwashFromLifestyle = lifestyleRec?.mouthwash_type != null
    && lifestyleRec.mouthwash_type !== "none"
  oralScore.mouthwashDetected = mouthwashFromLifestyle

  console.log("[oral-regen] parsed:", {
    periodontalBurden: oralScore.periodontalBurden,
    osaBurden: oralScore.osaBurden,
    pGingivalisPct: oralScore.pGingivalisPct,
    fNucleatumPct: oralScore.fNucleatumPct,
    prevotellaPct: oralScore.prevotellaPct,
    nitrateReducerPct: oralScore.nitrateReducerPct,
    shannonDiversity: oralScore.shannonDiversity,
    protectivePct: oralScore.protectivePct,
    mouthwashDetected: oralScore.mouthwashDetected,
    mouthwashType: lifestyleRec?.mouthwash_type ?? "not set",
  })

  // Update the oral kit order with regenerated snapshot
  const { error: updateErr } = await svc
    .from("oral_kit_orders")
    .update({
      oral_score_snapshot: oralScore,
      findings_snapshot: oralScore.findings,
      shannon_diversity: oralScore.shannonDiversity,
      nitrate_reducers_pct: oralScore.nitrateReducerPct,
      periodontopathogen_pct: oralScore.pGingivalisPct,
      osa_taxa_pct: oralScore.prevotellaPct,
      neuro_signal_pct: oralScore.pGingivalisPct + (taxonomy["Treponema denticola"] ?? 0),
      metabolic_signal_pct: oralScore.prevotellaPct,
      proliferative_signal_pct: oralScore.fNucleatumPct,
    })
    .eq("id", kit.id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Recalculate score with new snapshot
  const newScore = await recalculateScore(body.userId, svc)

  return NextResponse.json({
    success: true,
    oralScore: {
      periodontalBurden: oralScore.periodontalBurden,
      osaBurden: oralScore.osaBurden,
      pGingivalisPct: oralScore.pGingivalisPct,
      nitrateReducerPct: oralScore.nitrateReducerPct,
      shannonDiversity: oralScore.shannonDiversity,
      protectivePct: oralScore.protectivePct,
      prevotellaPct: oralScore.prevotellaPct,
      fNucleatumPct: oralScore.fNucleatumPct,
    },
    newScore,
  })
}

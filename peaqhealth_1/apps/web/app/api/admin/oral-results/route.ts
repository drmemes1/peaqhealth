import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { parseOralMicrobiome } from '@peaq/score-engine/oral-parser'
import type { ZymoReport } from '@peaq/score-engine/oral-parser'
import { recalculateScore } from '../../../../lib/score/recalculate'


export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use service client for all DB ops — session client is blocked by RLS from reading other users' kits
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let kitCode: string
  let zymoReport: ZymoReport
  try {
    const body = await request.json() as Record<string, unknown>
    kitCode = (body.kitCode as string ?? '').toUpperCase().trim()
    zymoReport = body.zymoReport as ZymoReport
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!kitCode || !zymoReport?.taxonomy) {
    return NextResponse.json({ error: 'Missing kitCode or zymoReport' }, { status: 400 })
  }

  // Find kit and its user (service client bypasses RLS)
  const { data: kit, error: findError } = await serviceClient
    .from('oral_kit_orders')
    .select('id, user_id, status')
    .eq('kit_code', kitCode)
    .single()

  if (findError || !kit) {
    console.error('[admin-oral] kit not found for code:', kitCode, findError?.message)
    return NextResponse.json({ error: 'Kit not found' }, { status: 404 })
  }

  // Parse OTU data
  const oralScore = parseOralMicrobiome(zymoReport)

  // Save to oral_kit_orders (service client bypasses RLS)
  const { error: updateError } = await serviceClient
    .from('oral_kit_orders')
    .update({
      raw_otu_table: zymoReport.taxonomy,
      oral_score_snapshot: oralScore,
      findings_snapshot: oralScore.findings,
      shannon_diversity: oralScore.shannonDiversity,
      nitrate_reducers_pct: oralScore.nitrateReducerPct,
      periodontopathogen_pct: oralScore.pGingivalisPct,
      osa_taxa_pct: oralScore.prevotellaPct,
      status: 'scored',
      results_date: new Date().toISOString(),
    })
    .eq('id', kit.id)

  if (updateError) {
    console.error('[admin-oral] update error:', updateError.message)
    return NextResponse.json({ error: 'Failed to save results' }, { status: 500 })
  }

  // Recalculate score
  let newTotalScore: number | undefined
  if (kit.user_id) {
    newTotalScore = await recalculateScore(kit.user_id, serviceClient)
  }

  return NextResponse.json({ success: true, oralScore, newTotalScore })
}

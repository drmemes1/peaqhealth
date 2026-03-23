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

  const targetUserId = user.id

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

  // Parse OTU data
  const oralScore = parseOralMicrobiome(zymoReport)

  // Delete any existing oral data for this user, then insert fresh
  const { error: deleteError } = await serviceClient
    .from('oral_kit_orders')
    .delete()
    .eq('user_id', targetUserId)

  if (deleteError) {
    console.error('[admin-oral] delete error:', deleteError.message)
    return NextResponse.json({ error: 'Failed to clear existing results' }, { status: 500 })
  }

  const { error: insertError } = await serviceClient
    .from('oral_kit_orders')
    .insert({
      user_id:                targetUserId,
      kit_code:               kitCode.toUpperCase(),
      status:                 'results_ready',
      raw_otu_table:          zymoReport.taxonomy,
      oral_score_snapshot:    oralScore,
      findings_snapshot:      oralScore.findings,
      shannon_diversity:      oralScore.shannonDiversity,
      nitrate_reducers_pct:   oralScore.nitrateReducerPct,
      periodontopathogen_pct: oralScore.pGingivalisPct,
      osa_taxa_pct:           oralScore.prevotellaPct,
      results_date:           new Date().toISOString(),
      report_date:            new Date().toISOString().split('T')[0],
    })

  if (insertError) {
    console.error('[admin-oral] insert error:', insertError.message)
    return NextResponse.json({ error: 'Failed to save results' }, { status: 500 })
  }

  // Recalculate score
  const newTotalScore = await recalculateScore(targetUserId, serviceClient)

  return NextResponse.json({ success: true, oralScore, newTotalScore })
}

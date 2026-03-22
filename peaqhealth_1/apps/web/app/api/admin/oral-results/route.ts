import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { parseOralMicrobiome } from '@peaq/score-engine/oral-parser'
import type { ZymoReport } from '@peaq/score-engine/oral-parser'
import { recalculateScore } from '../../../../lib/score/recalculate'

function isAdmin(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  return adminIds.includes(userId)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[admin-post] session user id:', user?.id)
  console.log('[admin-post] session user email:', user?.email)
  console.log('[admin-post] ADMIN_USER_IDS env:', process.env.ADMIN_USER_IDS)
  console.log('[admin-post] trimmed ids:', process.env.ADMIN_USER_IDS?.split(',').map(s => s.trim()))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  console.log('[admin-auth] user id:', user.id)
  console.log('[admin-auth] allowed ids:', process.env.ADMIN_USER_IDS)
  console.log('[admin-auth] includes:', process.env.ADMIN_USER_IDS?.split(',').includes(user.id))
  if (!isAdmin(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

  // Find kit and its user
  const { data: kit, error: findError } = await supabase
    .from('oral_kit_orders')
    .select('id, user_id, status')
    .eq('kit_code', kitCode)
    .single()

  if (findError || !kit) {
    return NextResponse.json({ error: 'Kit not found' }, { status: 404 })
  }

  // Parse OTU data
  const oralScore = parseOralMicrobiome(zymoReport)

  // Save to oral_kit_orders
  const { error: updateError } = await supabase
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
    return NextResponse.json({ error: 'Failed to save results' }, { status: 500 })
  }

  // Recalculate score if kit has a user
  let newTotalScore: number | undefined
  if (kit.user_id) {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    newTotalScore = await recalculateScore(kit.user_id, serviceClient)
  }

  return NextResponse.json({ success: true, oralScore, newTotalScore })
}

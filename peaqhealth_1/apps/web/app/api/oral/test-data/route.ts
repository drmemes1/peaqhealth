import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { parseOralMicrobiome } from '@peaq/score-engine/oral-parser'
import {
  MOCK_ORAL_OPTIMAL,
  MOCK_ORAL_AVERAGE,
  MOCK_ORAL_DYSBIOTIC,
  MOCK_ORAL_MOUTHWASH,
} from '@peaq/score-engine/oral-mock-data'
import { recalculateScore } from '../../../../lib/score/recalculate'

export async function POST(request: NextRequest) {
  if (process.env.JUNCTION_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let profile = 'average'
  try {
    const body = await request.json() as Record<string, unknown>
    if (body.profile) profile = body.profile as string
  } catch {
    // default to average
  }

  const profiles: Record<string, typeof MOCK_ORAL_OPTIMAL> = {
    optimal: MOCK_ORAL_OPTIMAL,
    average: MOCK_ORAL_AVERAGE,
    dysbiotic: MOCK_ORAL_DYSBIOTIC,
    mouthwash: MOCK_ORAL_MOUTHWASH,
  }

  const mockReport = profiles[profile] ?? MOCK_ORAL_AVERAGE
  const oralScore = parseOralMicrobiome(mockReport)

  // Upsert mock oral_kit_orders row
  const mockKitCode = `PEAQ-TEST-${profile.toUpperCase().slice(0, 5)}`
  const { data: existing } = await supabase
    .from('oral_kit_orders')
    .select('id')
    .eq('user_id', user.id)
    .eq('kit_code', mockKitCode)
    .maybeSingle()

  const now = new Date().toISOString()
  const oralRow = {
    user_id: user.id,
    kit_code: mockKitCode,
    status: 'scored' as const,
    ordered_at: now,
    results_date: now,
    raw_otu_table: mockReport.taxonomy,
    oral_score_snapshot: oralScore,
    findings_snapshot: oralScore.findings,
    shannon_diversity: oralScore.shannonDiversity,
    nitrate_reducers_pct: oralScore.nitrateReducerPct,
    periodontopathogen_pct: oralScore.pGingivalisPct,
    osa_taxa_pct: oralScore.prevotellaPct,
  }

  if (existing?.id) {
    await supabase.from('oral_kit_orders').update(oralRow).eq('id', existing.id)
  } else {
    await supabase.from('oral_kit_orders').insert(oralRow)
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const newTotalScore = await recalculateScore(user.id, serviceClient)

  return NextResponse.json({ oralScore, newTotalScore, profile })
}

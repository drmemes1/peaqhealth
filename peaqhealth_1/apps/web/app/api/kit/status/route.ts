import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: kit } = await supabase
    .from('oral_kit_orders')
    .select('kit_code, status, registered_at, mailed_at, received_at, ordered_at')
    .eq('user_id', user.id)
    .order('ordered_at', { ascending: false })
    .limit(1)
    .single()

  if (!kit) {
    return NextResponse.json({ kitCode: null, status: null })
  }

  return NextResponse.json({
    kitCode: kit.kit_code,
    status: kit.status,
    registeredAt: kit.registered_at,
    mailedAt: kit.mailed_at,
    receivedAt: kit.received_at,
    orderedAt: kit.ordered_at,
    resultsReady: kit.status === 'results_ready' || kit.status === 'scored',
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { validateKitCode } from '../../../../lib/kit-code'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let kitCode: string
  try {
    const body = await request.json() as Record<string, unknown>
    kitCode = (body.kitCode as string ?? '').toUpperCase().trim()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!validateKitCode(kitCode)) {
    return NextResponse.json({ error: 'Invalid kit code format' }, { status: 400 })
  }

  // Find the kit
  const { data: kit, error: findError } = await supabase
    .from('oral_kit_orders')
    .select('id, user_id, status, kit_code')
    .eq('kit_code', kitCode)
    .single()

  if (findError || !kit) {
    return NextResponse.json({ error: 'Kit code not found' }, { status: 404 })
  }

  if (kit.user_id && kit.user_id !== user.id) {
    return NextResponse.json({ error: 'Kit already registered' }, { status: 409 })
  }

  if (kit.user_id === user.id) {
    return NextResponse.json({ registered: true, kitCode, status: kit.status, alreadyOwned: true })
  }

  if (kit.status !== 'shipped') {
    return NextResponse.json({ error: 'Kit is not available for registration' }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from('oral_kit_orders')
    .update({ user_id: user.id, registered_at: new Date().toISOString(), status: 'registered' })
    .eq('id', kit.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to register kit' }, { status: 500 })
  }

  return NextResponse.json({ registered: true, kitCode, status: 'registered' })
}

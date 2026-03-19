import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error } = await service.auth.admin.deleteUser(user.id)
  if (error) {
    console.error("[account/delete] failed:", error.message)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }

  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}

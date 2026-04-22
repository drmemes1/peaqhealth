import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { getUserPanelContext } from "../../../../lib/user-context"
import { pregenerateMarkerInsights } from "../../../../lib/marker-insights/generate"

const ADMIN_USER_ID = "f08a47b5-4a8f-4b8c-b4d5-8f1de407d686"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const targetUserId = new URL(request.url).searchParams.get("userId") ?? user.id
  const ctx = await getUserPanelContext(targetUserId)

  const result = await pregenerateMarkerInsights(targetUserId, ctx)

  return NextResponse.json(result)
}

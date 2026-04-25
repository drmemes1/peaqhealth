import { NextResponse } from "next/server"
import { createClient } from "../../../../../lib/supabase/server"
import { getUserSituation } from "../../../../../lib/narrative/situationModel"
import { generateNarrative, validateNarrative } from "../../../../../lib/narrative/generateNarrative"

const ADMIN_USER_ID = "f08a47b5-4a8f-4b8c-b4d5-8f1de407d686"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await req.json() as { userId: string }
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

  const situation = await getUserSituation(userId)
  const narrative = await generateNarrative(situation)
  const validation = validateNarrative(narrative, situation)

  return NextResponse.json({ narrative, validation })
}

import webpush from "web-push"
import { createClient } from "../../../../lib/supabase/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 })
  }

  webpush.setVapidDetails(
    "mailto:igor@peaqhealth.me",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const subscription = await req.json()

  await supabase
    .from("push_subscriptions")
    .upsert({
      user_id: user.id,
      subscription: JSON.stringify(subscription),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })

  return NextResponse.json({ success: true })
}

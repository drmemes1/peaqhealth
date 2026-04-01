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

  const { userId, title, body, url } = await req.json() as {
    userId: string
    title: string
    body: string
    url?: string
  }

  const supabase = await createClient()

  const { data } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", userId)
    .maybeSingle()

  if (!data) return NextResponse.json({ error: "No subscription" }, { status: 404 })

  const subscription = JSON.parse(data.subscription as string)

  await webpush.sendNotification(
    subscription,
    JSON.stringify({
      title,
      body,
      url: url ?? "/dashboard",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    }),
  )

  return NextResponse.json({ success: true })
}

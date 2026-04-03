import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

export async function POST(req: NextRequest) {
  const { email } = await req.json() as { email?: string }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.error("[waitlist] RESEND_API_KEY not configured")
    return NextResponse.json({ error: "Email service unavailable" }, { status: 503 })
  }

  const resend = new Resend(resendKey)
  const { error } = await resend.emails.send({
    from: process.env.REPORT_FROM_EMAIL ?? "waitlist@peaqhealth.me",
    to: "info@peaqhealth.me",
    subject: `Waitlist signup: ${email}`,
    text: `New waitlist signup:\n\nEmail: ${email}\nDate: ${new Date().toISOString()}`,
  })

  if (error) {
    console.error("[waitlist] send failed:", error)
    return NextResponse.json({ error: "Failed to send" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

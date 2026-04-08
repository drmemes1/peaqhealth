import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { scoreQuiz, type QuizAnswers } from "../../../../lib/quizScoring"

export async function POST(req: NextRequest) {
  let body: { answers: QuizAnswers; email: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { answers, email } = body
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const result = scoreQuiz(answers)

  // Save to Supabase via service client (no auth required — anonymous quiz)
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await svc
    .from("quiz_responses")
    .insert({
      email: email.toLowerCase().trim(),
      answers,
      score: result.score,
      risk_level: result.riskLevel,
      tag_airway: result.tags.airway,
      tag_cv_history: result.tags.cvHistory,
      tag_mouthwash: result.tags.mouthwash,
      tag_nitrate_low: result.tags.nitrateLow,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[quiz/submit] insert error:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }

  // Send notification email via Resend
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const resend = new Resend(resendKey)
    const tagList = Object.entries(result.tags)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ") || "none"

    await resend.emails.send({
      from: "Peaq Health <hello@peaqhealth.me>",
      to: "info@peaqhealth.me",
      subject: `Quiz: ${result.riskLevel} risk — ${email}`,
      html: `
        <p><strong>New quiz submission</strong></p>
        <p>Email: ${email}</p>
        <p>Score: ${result.score}/13 — ${result.riskLevel}</p>
        <p>Tags: ${tagList}</p>
        <p>Date: ${new Date().toISOString()}</p>
      `,
    }).catch(err => console.error("[quiz/submit] email error:", err))
  }

  return NextResponse.json({ id: data.id, result })
}

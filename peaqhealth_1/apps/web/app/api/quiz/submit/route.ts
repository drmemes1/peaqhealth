import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { scoreQuiz } from "../../../../lib/quizScoring"
import { renderQuizConfirmationEmail } from "../../../../lib/emails/quiz-confirmation"

export async function POST(req: NextRequest) {
  let body: { selectedValues: string[]; email: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { selectedValues, email } = body
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }
  if (!Array.isArray(selectedValues) || selectedValues.length === 0) {
    return NextResponse.json({ error: "No answers provided" }, { status: 400 })
  }

  const result = scoreQuiz(selectedValues)

  // Save to Supabase
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await svc
    .from("quiz_responses")
    .insert({
      email: email.toLowerCase().trim(),
      answers: { selectedValues },
      score: result.score,
      risk_level: result.tier,
      tag_airway: result.tags.includes("airway") || result.tags.includes("osa"),
      tag_cv_history: result.tags.includes("cvHistory") || result.tags.includes("cvRisk"),
      tag_mouthwash: result.tags.includes("mouthwash"),
      tag_nitrate_low: result.tags.includes("nitrateLow"),
    })
    .select("id")
    .single()

  if (error) {
    console.error("[quiz/submit] insert error:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }

  // Send emails via Resend
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const resend = new Resend(resendKey)
    const tagList = result.tags.join(", ") || "none"

    // 1. Internal notification (unchanged)
    await resend.emails.send({
      from: "Cnvrg Health <hello@peaqhealth.me>",
      to: "info@peaqhealth.me",
      subject: `Quiz: ${result.tier} risk \u2014 ${email}`,
      html: `
        <p><strong>New quiz submission</strong></p>
        <p>Email: ${email}</p>
        <p>Score: ${result.score}/${result.maxScore} \u2014 ${result.tier}</p>
        <p>Tags: ${tagList}</p>
        <p>Date: ${new Date().toISOString()}</p>
      `,
    }).catch(err => console.error("[quiz/submit] internal email error:", err))

    // 2. Personalized confirmation to submitter
    const confirmationHtml = renderQuizConfirmationEmail({
      score: result.score,
      maxScore: result.maxScore,
      tier: result.tier,
      tags: result.tags,
    })

    const tierLabel = result.tier === "high" ? "High" : result.tier === "moderate" ? "Moderate" : "Low"
    await resend.emails.send({
      from: "Cnvrg Health <hello@peaqhealth.me>",
      to: email.toLowerCase().trim(),
      subject: `Your Cnvrg signal profile \u2014 ${tierLabel} signal density`,
      html: confirmationHtml,
    }).catch(err => console.error("[quiz/submit] confirmation email error:", err))
  }

  return NextResponse.json({ id: data.id, result })
}

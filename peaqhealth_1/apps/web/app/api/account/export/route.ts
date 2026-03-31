import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { pdf } from "@react-pdf/renderer"
import fs from "fs"
import path from "path"
import { Resend } from "resend"
import { fetchReportData } from "./report-data"
import { buildReportDocument } from "./report-pdf"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json() as {
    sendEmail?: boolean
    recipientEmail?: string
    recipientName?: string
  }

  const reportData = await fetchReportData(user.id, supabase)

  // Load logo from public/ — fails gracefully if missing
  let logoBase64: string | null = null
  try {
    const logoPath = path.join(process.cwd(), "public", "images", "peaq_logo_transparent.png")
    logoBase64 = fs.readFileSync(logoPath).toString("base64")
  } catch {
    // PDF renders without logo
  }

  const doc = buildReportDocument(reportData, logoBase64)
  const pdfBuffer = await pdf(doc).toBuffer()

  const dateStr = new Date().toISOString().split("T")[0]
  const safeName = reportData.fullName.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-").toLowerCase()
  const filename = `peaq-health-report-${safeName}-${dateStr}.pdf`

  // Email path
  if (body.sendEmail && body.recipientEmail) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: process.env.REPORT_FROM_EMAIL ?? "reports@peaqhealth.me",
      to: body.recipientEmail,
      subject: `Peaq Health Report — ${reportData.fullName}`,
      text: [
        `Please find attached the Peaq Health personal health report for ${reportData.fullName},`,
        `generated on ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`,
        "",
        "This report includes blood biomarker analysis, sleep & recovery data, and oral microbiome",
        "sequencing results with cross-panel clinical context.",
        "",
        `Peaq Score: ${reportData.score} / 100  —  Blood ${reportData.bloodSub}pts · Sleep ${reportData.sleepSub}pts · Oral ${reportData.oralSub}pts`,
        "",
        "Peaq Health · peaqhealth.me",
      ].join("\n"),
      attachments: [{ filename, content: pdfBuffer.toString("base64") }],
    })

    if (error) {
      console.error("[export] Resend error:", error)
      return NextResponse.json({ error: "Failed to send email", detail: (error as { message?: string }).message }, { status: 500 })
    }

    return NextResponse.json({ sent: true, to: body.recipientEmail })
  }

  // Download path
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  })
}

// Backwards-compatible stub — old GET callers get a clear error
export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 })
}

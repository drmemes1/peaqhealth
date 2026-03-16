import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createLabParserJob } from "@peaq/api-client/junction"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let pdfBase64: string
  try {
    const body = await request.json() as { pdfBase64?: string }
    pdfBase64 = body.pdfBase64 ?? ""
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!pdfBase64) {
    return NextResponse.json({ error: "Missing pdfBase64" }, { status: 422 })
  }

  try {
    const { jobId } = await createLabParserJob(pdfBase64)
    return NextResponse.json({ jobId })
  } catch (err) {
    console.error("[labs/upload] Junction parse job failed:", err)
    return NextResponse.json(
      { error: "Failed to submit PDF for parsing", detail: String(err) },
      { status: 502 }
    )
  }
}

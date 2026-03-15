import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createLabParserJob } from "@peaq/api-client/junction"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 })
  }

  // Convert file to base64
  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString("base64")

  // Submit to Junction lab parser
  let jobId: string
  try {
    const job = await createLabParserJob(base64)
    jobId = job.jobId
  } catch (err) {
    return NextResponse.json({ error: "Failed to submit lab report", detail: String(err) }, { status: 502 })
  }

  // Create lab_results row
  const today = new Date().toISOString().slice(0, 10)
  const { data: labRow, error: dbError } = await supabase
    .from("lab_results")
    .insert({
      user_id: user.id,
      source: "junction_parser",
      junction_parser_job_id: jobId,
      parser_status: "pending",
      collection_date: today,
    })
    .select("id")
    .single()

  if (dbError) {
    console.error("lab_results insert error:", dbError)
    return NextResponse.json({ error: "Failed to save lab record" }, { status: 500 })
  }

  return NextResponse.json({ jobId, labResultId: labRow.id, status: "pending" })
}

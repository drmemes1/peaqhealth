import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { pdf } from "@react-pdf/renderer"
import fs from "fs"
import path from "path"
import { fetchReportData } from "./report-data"
import { buildReportDocument } from "./report-pdf"

export const runtime = "nodejs"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
  const pdfStream = await pdf(doc).toBuffer()
  const chunks: Buffer[] = []
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    pdfStream.on("data", (chunk: Buffer) => chunks.push(chunk))
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)))
    pdfStream.on("error", reject)
  })

  const dateStr = new Date().toISOString().split("T")[0]
  const safeName = reportData.fullName.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-").toLowerCase()
  const filename = `peaq-health-report-${safeName}-${dateStr}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  })
}

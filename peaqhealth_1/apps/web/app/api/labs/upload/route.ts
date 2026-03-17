import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { getLabParser } from "@peaq/api-client/lab/parser-factory"

// Canonical display markers — used to build the confirmation table
const DISPLAY_MARKERS: Array<{ slug: string; name: string; unit: string }> = [
  { slug: "hsCRP_mgL",          name: "hs-CRP",        unit: "mg/L"  },
  { slug: "vitaminD_ngmL",      name: "Vitamin D",     unit: "ng/mL" },
  { slug: "apoB_mgdL",          name: "ApoB",          unit: "mg/dL" },
  { slug: "ldl_mgdL",           name: "LDL",           unit: "mg/dL" },
  { slug: "hdl_mgdL",           name: "HDL",           unit: "mg/dL" },
  { slug: "triglycerides_mgdL", name: "Triglycerides", unit: "mg/dL" },
  { slug: "lpa_mgdL",           name: "Lp(a)",         unit: "mg/dL" },
  { slug: "glucose_mgdL",       name: "Glucose",       unit: "mg/dL" },
  { slug: "hba1c_pct",          name: "HbA1c",         unit: "%"     },
]

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
    const parser = getLabParser()
    const result = await parser.parse(pdfBase64, "application/pdf", user.id)

    // Build a lookup map from parsed markers
    const byKey = new Map(result.markers.map((m) => [m.canonicalKey, m.value]))

    // Shape response to match existing confirmation table format
    const markers = DISPLAY_MARKERS.map((m) => {
      const value = byKey.get(m.slug)
      return {
        slug:  m.slug,
        name:  m.name,
        unit:  m.unit,
        value: typeof value === "number" ? value : null,
        found: typeof value === "number",
      }
    })

    return NextResponse.json({
      status:      "complete",
      markers,
      labDate:     result.collectionDate ?? new Date().toISOString().slice(0, 10),
      labName:     result.labName,
      parserUsed:  result.parserUsed,
      markersFound: result.markersFound,
    })
  } catch (err) {
    console.error("[labs/upload] parse failed:", err)
    return NextResponse.json(
      { error: "Failed to parse lab report", detail: String(err) },
      { status: 502 }
    )
  }
}

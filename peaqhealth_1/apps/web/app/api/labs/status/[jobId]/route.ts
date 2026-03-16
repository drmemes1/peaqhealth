import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../../lib/supabase/server"
import { getLabParserJob, mapParserResultToBloodInputs } from "@peaq/api-client/junction"
import type { BloodMarkers } from "../../../../components/lab-upload"

const CANONICAL_MARKERS: Array<{ slug: keyof BloodMarkers; name: string; unit: string }> = [
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { jobId } = await params

  try {
    const result = await getLabParserJob(jobId)
    const status = result.status as string

    if (status === "pending" || status === "processing") {
      return NextResponse.json({ status: "pending" })
    }

    if (status === "failed") {
      return NextResponse.json({ status: "failed", error: "Lab parsing failed" }, { status: 422 })
    }

    // Map Junction parser output to canonical markers
    const bloodInputs = mapParserResultToBloodInputs(result)

    const markers = CANONICAL_MARKERS.map((m) => {
      const value = (bloodInputs as Record<string, unknown>)[m.slug]
      return {
        slug:  m.slug,
        name:  m.name,
        unit:  m.unit,
        value: typeof value === "number" ? value : null,
        found: typeof value === "number",
      }
    })

    return NextResponse.json({
      status:  "complete",
      markers,
      labDate: result.metadata?.date_collected ?? new Date().toISOString().slice(0, 10),
    })
  } catch (err) {
    console.error("[labs/status] error:", err)
    return NextResponse.json({ error: "Failed to check job status" }, { status: 502 })
  }
}

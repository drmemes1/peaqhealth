import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { getLabParserJob, mapParserResultToBloodInputs } from "@peaq/api-client/junction"
import { recalculateScore } from "../../../../../lib/score/recalculate"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { jobId } = await params

  let parserResult: { status: string; metadata?: unknown; results?: unknown[] }
  try {
    parserResult = await getLabParserJob(jobId) as unknown as { status: string; metadata?: unknown; results?: unknown[] }
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch job status", detail: String(err) }, { status: 502 })
  }

  if (parserResult.status === "pending" || parserResult.status === "processing") {
    return NextResponse.json({ status: parserResult.status })
  }

  if (parserResult.status === "failed") {
    await supabase
      .from("lab_results")
      .update({ parser_status: "failed" })
      .eq("junction_parser_job_id", jobId)
      .eq("user_id", user.id)
    return NextResponse.json({ status: "failed", error: "Could not parse PDF" })
  }

  // status === "complete"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bloodPartial = mapParserResultToBloodInputs(parserResult as any)
  const collectionDate = (parserResult.metadata as Record<string, unknown> | undefined)?.date_collected as string ?? new Date().toISOString().slice(0, 10)

  // Map BloodInputs keys to DB column names
  const updatePayload: Record<string, unknown> = {
    parser_status: "complete",
    collection_date: collectionDate,
    hs_crp_mgl:         bloodPartial.hsCRP_mgL,
    vitd_ngml:          bloodPartial.vitaminD_ngmL,
    apob_mgdl:          bloodPartial.apoB_mgdL,
    ldl_mgdl:           bloodPartial.ldl_mgdL,
    hdl_mgdl:           bloodPartial.hdl_mgdL,
    triglycerides_mgdl: bloodPartial.triglycerides_mgdL,
    lpa_mgdl:           bloodPartial.lpa_mgdL,
    glucose_mgdl:       bloodPartial.glucose_mgdL,
    hba1c_pct:          bloodPartial.hba1c_pct,
    esr_mmhr:           bloodPartial.esr_mmhr,
    homocysteine_umoll: bloodPartial.homocysteine_umolL,
    ferritin_ngml:      bloodPartial.ferritin_ngmL,
  }
  // Remove undefined values
  Object.keys(updatePayload).forEach(k => updatePayload[k] === undefined && delete updatePayload[k])

  await supabase
    .from("lab_results")
    .update(updatePayload)
    .eq("junction_parser_job_id", jobId)
    .eq("user_id", user.id)

  // Recalculate score with new blood data
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const newScore = await recalculateScore(user.id, serviceClient)

  return NextResponse.json({
    status: "complete",
    markers: bloodPartial,
    collectionDate,
    laboratory: (parserResult.metadata as Record<string, unknown> | undefined)?.laboratory,
    newScore,
  })
}

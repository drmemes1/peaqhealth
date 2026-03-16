import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../lib/score/recalculate"

// Realistic sandbox values — midrange healthy adult
const TEST_MARKERS = {
  hs_crp_mgl:          0.9,
  vitamin_d_ngml:      44,
  apob_mgdl:           88,
  ldl_mgdl:            115,
  hdl_mgdl:            62,
  triglycerides_mgdl:  88,
  lpa_mgdl:            22,
  glucose_mgdl:        91,
  hba1c_pct:           5.3,
}

export async function POST() {
  if (process.env.JUNCTION_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase.from("lab_results").insert({
    user_id:         user.id,
    source:          "test_data",
    collection_date: new Date().toISOString().slice(0, 10),
    parser_status:   "complete",
    ...TEST_MARKERS,
  })

  if (error) {
    console.error("[lab/test-data] insert error:", error)
    return NextResponse.json({ error: "Failed to insert test data" }, { status: 500 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const score = await recalculateScore(user.id, serviceClient)

  return NextResponse.json({ score, markers: TEST_MARKERS })
}

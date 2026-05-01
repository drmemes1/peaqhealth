import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { LabsSettingsClient } from "./labs-client"

export default async function LabsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/settings/labs")

  // Load most recent lab result for display
  const { data: existing } = await supabase
    .from("blood_results")
    .select("collection_date, lab_name, hs_crp_mgl, vitamin_d_ngml, apob_mgdl, ldl_mgdl, hdl_mgdl, lpa_mgdl, hba1c_pct")
    .eq("user_id", user.id)
    .eq("parser_status", "complete")
    .order("collected_at", { ascending: false })
    .limit(1)
    .single()

  return (
    <LabsSettingsClient
      existingDate={(existing?.collection_date as string) ?? null}
    />
  )
}

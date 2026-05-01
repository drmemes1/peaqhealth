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
    .select("collected_at, source_lab, hs_crp_mgl, vitamin_d_ngml, apob_mgdl, ldl_mgdl, hdl_mgdl, lipoprotein_a_mgdl, hba1c_percent")
    .eq("user_id", user.id)
    
    .order("collected_at", { ascending: false })
    .limit(1)
    .single()

  return (
    <LabsSettingsClient
      existingDate={(existing?.collected_at as string) ?? null}
    />
  )
}

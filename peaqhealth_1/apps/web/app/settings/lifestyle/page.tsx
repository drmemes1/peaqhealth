import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import LifestyleWizard from "../../components/LifestyleWizard"

export default async function LifestylePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/settings/lifestyle")

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: existing } = await svc
    .from("lifestyle_records")
    .select("questionnaire_version")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const version = (existing as Record<string, unknown> | null)?.questionnaire_version

  // New users or V1 users → send to V2 flow
  if (!existing || version !== "v2") {
    redirect("/questionnaire/v2")
  }

  // V2 users revisiting → also send to V2 (can review/edit)
  redirect("/questionnaire/v2")
}

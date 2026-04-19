import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import LifestyleWizard from "../../components/LifestyleWizard"

export default async function LifestylePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/settings/lifestyle")

  const { data: existing } = await supabase
    .from("lifestyle_records")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return <LifestyleWizard mode="settings" existing={existing as Record<string, unknown> | null} />
}

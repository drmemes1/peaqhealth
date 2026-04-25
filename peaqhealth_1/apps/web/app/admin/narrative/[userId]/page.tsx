import { redirect } from "next/navigation"
import { createClient } from "../../../../lib/supabase/server"
import { getUserSituation } from "../../../../lib/narrative/situationModel"
import { NarrativeAdminClient } from "./narrative-admin-client"

const ADMIN_USER_ID = "f08a47b5-4a8f-4b8c-b4d5-8f1de407d686"

export default async function NarrativeAdminPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) redirect("/login")

  const situation = await getUserSituation(userId)

  return <NarrativeAdminClient situation={situation} />
}

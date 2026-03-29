import { redirect } from "next/navigation"
import { createClient } from "../../lib/supabase/server"
import { TrendsClient } from "./trends-client"

export const dynamic = "force-dynamic"

export default async function TrendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return <TrendsClient />
}

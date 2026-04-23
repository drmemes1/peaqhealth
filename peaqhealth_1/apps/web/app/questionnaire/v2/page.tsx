import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { QuestionnaireV2Client } from "./questionnaire-v2-client"

export default async function QuestionnaireV2Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return <QuestionnaireV2Client />
}

import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { getUserPanelContext } from "../../../lib/user-context"
import { computeConvergeObservations } from "../../../lib/converge/observations"
import { computeInterventions } from "../../../lib/interventions/registry"
import { applyEngagements, type Engagement } from "../../../lib/interventions/engagements"
import { Nav } from "../../components/nav"
import { ConvergeClient } from "./converge-client"

export default async function ConvergePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const ctx = await getUserPanelContext(user.id)
  const observations = computeConvergeObservations(ctx)

  const rawInterventions = computeInterventions(ctx)
  const { data: engagementRows } = await supabase
    .from("intervention_engagements")
    .select("intervention_id, action, created_at, retracted_at")
    .eq("user_id", user.id)
  const interventions = applyEngagements(rawInterventions, (engagementRows ?? []) as Engagement[])

  return (
    <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
      <Nav />
      <ConvergeClient
        observations={observations}
        availablePanels={ctx.availablePanels}
        panelCount={ctx.panelCount}
        firstName={ctx.firstName}
        interventions={interventions}
      />
    </div>
  )
}

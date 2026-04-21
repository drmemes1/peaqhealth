import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { getUserPanelContext } from "../../../lib/user-context"
import { computeConvergeObservations } from "../../../lib/converge/observations"
import { Nav } from "../../components/nav"
import { ConvergeClient } from "./converge-client"

export default async function ConvergePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const ctx = await getUserPanelContext(user.id)
  const observations = computeConvergeObservations(ctx)

  return (
    <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
      <Nav />
      <ConvergeClient
        observations={observations}
        availablePanels={ctx.availablePanels}
        panelCount={ctx.panelCount}
        firstName={ctx.firstName}
      />
    </div>
  )
}

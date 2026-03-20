import { redirect } from "next/navigation"
import { createClient } from "../../lib/supabase/server"
import { Nav } from "../components/nav"

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/settings")

  return (
    <div style={{ background: "var(--off-white)", minHeight: "100vh" }}>
      <Nav />
      {children}
    </div>
  )
}

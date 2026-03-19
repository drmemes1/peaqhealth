import { redirect } from "next/navigation"
import { createClient } from "../../lib/supabase/server"
import { Nav } from "../components/nav"

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/settings")

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single()

  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?"

  return (
    <div style={{ background: "var(--off-white)", minHeight: "100vh" }}>
      <Nav initials={initials} />
      {children}
    </div>
  )
}

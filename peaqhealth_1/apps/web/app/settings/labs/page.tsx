import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { Nav } from "../../components/nav"
import { LabUploadClient } from "./lab-upload-client"

export default async function LabsSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/settings/labs")

  const { data: labs } = await supabase
    .from("lab_results")
    .select("*")
    .eq("user_id", user.id)
    .order("collection_date", { ascending: false })
    .limit(3)

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single()

  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?"

  return (
    <div className="min-h-svh bg-off-white">
      <Nav initials={initials} />
      <main className="mx-auto max-w-[680px] px-6 py-10 flex flex-col gap-8">
        <div>
          <span className="font-body text-[10px] uppercase tracking-[0.15em]" style={{ color: "var(--gold)" }}>
            Settings
          </span>
          <h1 className="font-display text-3xl font-light mt-1" style={{ color: "var(--ink)" }}>
            Lab results
          </h1>
          <p className="font-body text-sm mt-1" style={{ color: "var(--ink-60)" }}>
            Upload a new lab report to update your blood panel score.
          </p>
        </div>

        <LabUploadClient latestLab={labs?.[0] ?? null} history={labs ?? []} />
      </main>
    </div>
  )
}

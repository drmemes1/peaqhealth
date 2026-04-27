import { notFound, redirect } from "next/navigation"
import { existsSync } from "fs"
import { join } from "path"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { Nav } from "../../../components/nav"
import { DetailClient } from "./detail-client"

export default async function BacteriaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: row } = await svc
    .from("bacteria_reference")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle()

  if (!row) notFound()

  // Permanent forward to the new /explore/oral-bacteria/{genus}[/{species}] hierarchy.
  if (row.taxonomic_level === "genus") {
    redirect(`/explore/oral-bacteria/${row.slug}`)
  } else if (row.taxonomic_level === "species" && row.parent_genus_id) {
    const { data: parent } = await svc
      .from("bacteria_reference")
      .select("slug")
      .eq("id", row.parent_genus_id)
      .maybeSingle()
    const speciesShort = (row.species as string | null) ?? (row.slug as string).replace(`${parent?.slug ?? ""}-`, "")
    if (parent?.slug) redirect(`/explore/oral-bacteria/${parent.slug}/${speciesShort}`)
  }

  const { data: citationsRaw } = await svc
    .from("bacteria_reference_citations")
    .select("section_number, notes, evidence_library(id, title, first_author, journal, year, doi, url, public_summary, pmid)")
    .eq("bacteria_id", row.id)
    .order("section_number")

  const citations = (citationsRaw ?? []).map((c: Record<string, unknown>) => {
    const ev = c.evidence_library as Record<string, unknown> | null
    return {
      section_number: c.section_number as number,
      notes: c.notes as string | null,
      title: (ev?.title ?? "") as string,
      first_author: (ev?.first_author ?? "") as string,
      journal: (ev?.journal ?? "") as string,
      year: (ev?.year ?? 0) as number,
      doi: (ev?.doi ?? null) as string | null,
      url: (ev?.url ?? null) as string | null,
      public_summary: (ev?.public_summary ?? null) as string | null,
      pmid: (ev?.pmid ?? null) as string | null,
    }
  })

  const { data: { user } } = await supabase.auth.getUser()
  let userOralValue: number | null = null
  let userOralDate: string | null = null

  if (user) {
    const { data: oralKit } = await svc
      .from("oral_kit_orders")
      .select("*")
      .eq("user_id", user.id)
      .not("shannon_diversity", "is", null)
      .order("ordered_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (oralKit) {
      const genusLower = (row.genus as string).toLowerCase()
      const speciesCol = row.species ? `${genusLower}_${(row.species as string).toLowerCase().replace(/ /g, "_")}_pct` : null
      const genusCol = `${genusLower}_pct`

      if (speciesCol && oralKit[speciesCol] != null) {
        userOralValue = Number(oralKit[speciesCol])
      } else if (oralKit[genusCol] != null) {
        userOralValue = Number(oralKit[genusCol])
      }

      if (row.taxonomic_level === "genus" && genusCol === "streptococcus_pct" && oralKit.streptococcus_total_pct != null) {
        userOralValue = Number(oralKit.streptococcus_total_pct)
      }

      userOralDate = oralKit.report_date ?? oralKit.collection_date ?? oralKit.ordered_at ?? null
    }
  }

  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh" }}>
      <Nav />
      <DetailClient
        row={row as Record<string, unknown>}
        citations={citations}
        userOralValue={userOralValue}
        userOralDate={userOralDate}
        isLoggedIn={!!user}
        heroVideo={existsSync(join(process.cwd(), "public", `${slug}.mp4`)) ? `/${slug}.mp4` : null}
        heroImage={existsSync(join(process.cwd(), "public", `${slug}.png`)) ? `/${slug}.png` : null}
      />
    </div>
  )
}

import { notFound } from "next/navigation"
import { existsSync } from "fs"
import { join } from "path"
import { createClient } from "../../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { Nav } from "../../../../components/nav"
import { DetailClient } from "../../../bacteria/[slug]/detail-client"

export default async function SpeciesDetailPage({ params }: { params: Promise<{ genus: string; species: string }> }) {
  const { genus, species } = await params
  const supabase = await createClient()

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: genusRow } = await svc
    .from("bacteria_reference")
    .select("id, slug, full_name, genus")
    .eq("slug", genus)
    .eq("taxonomic_level", "genus")
    .eq("published", true)
    .maybeSingle()

  if (!genusRow) notFound()

  const { data: row } = await svc
    .from("bacteria_reference")
    .select("*")
    .eq("parent_genus_id", genusRow.id)
    .eq("species", species)
    .eq("published", true)
    .maybeSingle()

  if (!row) notFound()

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
  let userOralUnavailable = false

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
      const speciesLower = (row.species as string).toLowerCase().replace(/ /g, "_")
      const speciesCol = `${genusLower}_${speciesLower}_pct`
      if (oralKit[speciesCol] != null) {
        userOralValue = Number(oralKit[speciesCol])
      } else {
        userOralUnavailable = true
      }
      userOralDate = oralKit.collection_date ?? oralKit.ordered_at ?? null
    }
  }

  const slug = row.slug as string
  const breadcrumb = [
    { label: "Explore", href: "/explore" },
    { label: "Oral bacteria", href: "/explore/oral-bacteria" },
    { label: genusRow.full_name as string, href: `/explore/oral-bacteria/${genus}` },
    { label: row.full_name as string },
  ]

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
        breadcrumb={breadcrumb}
        userOralUnavailable={userOralUnavailable}
      />
    </div>
  )
}

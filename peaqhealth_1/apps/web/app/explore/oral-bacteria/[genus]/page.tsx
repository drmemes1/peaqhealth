import { notFound } from "next/navigation"
import { existsSync } from "fs"
import { join } from "path"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { Nav } from "../../../components/nav"
import { DetailClient } from "../../bacteria/[slug]/detail-client"

export default async function GenusDetailPage({ params }: { params: Promise<{ genus: string }> }) {
  const { genus } = await params
  const supabase = await createClient()

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: row } = await svc
    .from("bacteria_reference")
    .select("*")
    .eq("slug", genus)
    .eq("taxonomic_level", "genus")
    .eq("published", true)
    .maybeSingle()

  if (!row) notFound()

  const { data: speciesRows } = await svc
    .from("bacteria_reference")
    .select("id, slug, species, full_name, consumer_friendly_name")
    .eq("parent_genus_id", row.id)
    .eq("published", true)
    .order("species")

  const speciesList = (speciesRows ?? []).map(s => {
    const speciesShort = (s.species as string | null) ?? (s.slug as string).replace(`${genus}-`, "")
    return {
      slug: s.slug as string,
      species: speciesShort,
      full_name: s.full_name as string,
      consumer_friendly_name: s.consumer_friendly_name as string | null,
      href: `/explore/oral-bacteria/${genus}/${speciesShort}`,
    }
  })

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
      const genusCol = `${genusLower}_pct`
      if (oralKit[genusCol] != null) userOralValue = Number(oralKit[genusCol])
      if (genusCol === "streptococcus_pct" && oralKit.streptococcus_total_pct != null) {
        userOralValue = Number(oralKit.streptococcus_total_pct)
      }
      userOralDate = oralKit.collection_date ?? oralKit.ordered_at ?? null
    }
  }

  const breadcrumb = [
    { label: "Explore", href: "/explore" },
    { label: "Oral bacteria", href: "/explore/oral-bacteria" },
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
        heroVideo={existsSync(join(process.cwd(), "public", `${genus}.mp4`)) ? `/${genus}.mp4` : null}
        heroImage={existsSync(join(process.cwd(), "public", `${genus}.png`)) ? `/${genus}.png` : null}
        breadcrumb={breadcrumb}
        speciesList={speciesList}
      />
    </div>
  )
}

import Link from "next/link"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { Nav } from "../../components/nav"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

interface SpeciesEntry {
  id: string
  slug: string
  species: string | null
  full_name: string
  consumer_friendly_name: string | null
  short_summary: string | null
  published: boolean
}

interface GenusRow {
  genus_id: string
  genus_slug: string
  genus_name: string
  genus_full_name: string
  genus_consumer_friendly_name: string | null
  genus_short_summary: string | null
  genus_peaq_categories: string[] | null
  genus_published: boolean
  species: SpeciesEntry[] | null
}

export default async function OralBacteriaIndexPage() {
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data } = await svc
    .from("v_bacteria_genus_with_species")
    .select("*")
    .eq("genus_published", true)
    .order("genus_name")

  const rows = (data ?? []) as GenusRow[]

  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh" }}>
      <Nav />
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "48px 24px 96px" }}>
        <div style={{ fontFamily: sans, fontSize: 12, color: "rgba(20,20,16,0.45)", marginBottom: 14 }}>
          <Link href="/explore" style={{ color: "inherit", textDecoration: "none" }}>Explore</Link>
          {" › "}
          <span>Oral bacteria</span>
        </div>
        <h1 style={{ fontFamily: serif, fontSize: 42, fontWeight: 400, color: "#141410", margin: "0 0 12px", lineHeight: 1.15 }}>
          Oral bacteria reference
        </h1>
        <p style={{ fontFamily: sans, fontSize: 15, color: "rgba(20,20,16,0.6)", lineHeight: 1.7, margin: "0 0 40px", maxWidth: 640 }}>
          Each genus card links to its writeup. Species writeups are nested under their parent genus.
        </p>

        <div style={{ display: "grid", gap: 16 }}>
          {rows.map(g => {
            const publishedSpecies = (g.species ?? []).filter(s => s.published)
            return (
              <article key={g.genus_id} style={{
                background: "#fff", borderRadius: 12, padding: "22px 24px 18px",
                borderLeft: "3px solid #185FA5",
              }}>
                <Link href={`/explore/oral-bacteria/${g.genus_slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <h2 style={{ fontFamily: serif, fontSize: 26, fontStyle: "italic", fontWeight: 500, color: "#141410", margin: "0 0 4px" }}>
                    {g.genus_full_name}
                  </h2>
                  {g.genus_consumer_friendly_name ? (
                    <div style={{ fontFamily: sans, fontSize: 13, color: "rgba(20,20,16,0.55)" }}>{g.genus_consumer_friendly_name}</div>
                  ) : null}
                  {g.genus_short_summary ? (
                    <p style={{ fontFamily: sans, fontSize: 14, color: "#3A3830", lineHeight: 1.6, margin: "10px 0 0", maxWidth: 720 }}>
                      {g.genus_short_summary}
                    </p>
                  ) : null}
                </Link>

                {publishedSpecies.length > 0 ? (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "0.5px solid rgba(20,20,16,0.08)" }}>
                    <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#185FA5", fontWeight: 600, marginBottom: 8 }}>
                      Species
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {publishedSpecies.map(s => {
                        const speciesShort = s.species ?? s.slug.replace(`${g.genus_slug}-`, "")
                        return (
                          <Link
                            key={s.id}
                            href={`/explore/oral-bacteria/${g.genus_slug}/${speciesShort}`}
                            style={{
                              fontFamily: serif, fontSize: 14, fontStyle: "italic",
                              color: "#042C53", background: "rgba(24,95,165,0.08)",
                              borderRadius: 6, padding: "6px 10px",
                              textDecoration: "none",
                            }}
                          >
                            {s.full_name}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}

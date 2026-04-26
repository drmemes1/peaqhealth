import { createClient } from "../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { Nav } from "../components/nav"
import { ExploreHero, WhySpecificBacteria, HowToRead, CardiovascularCallout, WhereYouSit, ExploreMethodology } from "./explore-hero"
import { BacteriaLibrary } from "./bacteria-library"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export default async function ExplorePage() {
  const supabase = await createClient()

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: rows } = await svc
    .from("bacteria_reference")
    .select("slug, full_name, taxonomic_level, consumer_friendly_name, short_summary, peaq_categories, desired_direction, evidence_strength")
    .eq("published", true)
    .order("full_name")

  const bacteria = (rows ?? []).map(r => ({
    slug: r.slug as string,
    full_name: r.full_name as string,
    taxonomic_level: r.taxonomic_level as string,
    consumer_friendly_name: r.consumer_friendly_name as string | null,
    short_summary: r.short_summary as string | null,
    peaq_categories: (r.peaq_categories ?? []) as string[],
    desired_direction: r.desired_direction as string | null,
    evidence_strength: r.evidence_strength as string | null,
  }))

  const { data: { user } } = await supabase.auth.getUser()
  let userBacteria: { name: string; percentile: number | null }[] | null = null

  if (user) {
    const { data: oralKit } = await svc
      .from("oral_kit_orders")
      .select("streptococcus_total_pct, neisseria_pct, rothia_pct, haemophilus_pct, fusobacterium_pct, veillonella_pct, porphyromonas_pct, actinomyces_pct")
      .eq("user_id", user.id)
      .not("shannon_diversity", "is", null)
      .order("ordered_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (oralKit) {
      const topGenera = [
        { name: "Streptococcus", col: "streptococcus_total_pct" },
        { name: "Neisseria", col: "neisseria_pct" },
        { name: "Rothia", col: "rothia_pct" },
        { name: "Haemophilus", col: "haemophilus_pct" },
        { name: "Fusobacterium", col: "fusobacterium_pct" },
        { name: "Veillonella", col: "veillonella_pct" },
        { name: "Porphyromonas", col: "porphyromonas_pct" },
        { name: "Actinomyces", col: "actinomyces_pct" },
      ]

      userBacteria = topGenera
        .map(g => {
          const val = (oralKit as Record<string, unknown>)[g.col] != null ? Number((oralKit as Record<string, unknown>)[g.col]) : null
          return { name: g.name, value: val, percentile: val != null && val > 0.01 ? Math.min(99, Math.round(val * 3.5)) : null }
        })
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
        .slice(0, 6)
        .map(({ name, percentile }) => ({ name, percentile }))
    }
  }

  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh" }}>
      <Nav />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
        <ExploreHero />
        <WhySpecificBacteria />
        <HowToRead />
        <CardiovascularCallout />

        {/* Library */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{
            fontFamily: serif, fontSize: 32, fontWeight: 400,
            color: "#141410", margin: "0 0 24px",
          }}>
            The bacteria library
          </h2>
          <BacteriaLibrary bacteria={bacteria} />
        </div>

        <WhereYouSit userBacteria={userBacteria} />
        <ExploreMethodology />
      </main>

      <style>{`
        @media (max-width: 640px) {
          main h1 { font-size: 36px !important; }
        }
        @media (max-width: 768px) {
          .method-cols { grid-template-columns: 1fr !important; gap: 20px !important; }
          .card-grid { grid-template-columns: 1fr !important; }
        }
        .explore-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        }
        .explore-cta:hover {
          background: #9A7200 !important;
          color: #fff !important;
        }
        .ranking-cta:hover {
          background: #9A7200 !important;
          color: #141410 !important;
          border-color: #9A7200 !important;
        }
      `}</style>
    </div>
  )
}

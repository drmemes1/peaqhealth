import { createClient } from "../../lib/supabase/server"
import { Nav } from "../components/nav"
import { ExploreHero, ExploreMethodology } from "./explore-hero"
import { BacteriaLibrary } from "./bacteria-library"

const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export default async function ExplorePage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
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

  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh" }}>
      <Nav />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
        <ExploreHero />

        <div style={{ marginBottom: 48 }}>
          <span style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "2px",
            textTransform: "uppercase", color: "#9A7200",
            display: "block", marginBottom: 20,
          }}>
            Bacteria Library
          </span>
          <BacteriaLibrary bacteria={bacteria} />
        </div>

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
        @keyframes zeroPulse {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

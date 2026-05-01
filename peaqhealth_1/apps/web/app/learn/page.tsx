import { createClient } from "../../lib/supabase/server"
import { Nav } from "../components/nav"
import { LearnGrid } from "./learn-grid"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export const dynamic = "force-dynamic"

export default async function LearnPage() {
  const supabase = await createClient()

  const { data: articles } = await supabase
    .from("articles")
    .select("slug, title, summary, read_time_min, author, primary_panel, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false })

  const items = (articles ?? []).map(a => ({
    slug: a.slug as string,
    title: a.title as string,
    summary: (a.summary as string | null) ?? "",
    readTime: (a.read_time_min as number | null) ?? 5,
    primaryPanel: (a.primary_panel as string | null) ?? null,
  }))

  return (
    <div className="min-h-svh" style={{ background: "#FAFAF8" }}>
      <Nav />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" }}>
        <span style={{
          fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "#7A7A6E",
          display: "block", marginBottom: 6,
        }}>
          From Oravi
        </span>
        <h1 style={{
          fontFamily: serif, fontSize: 42, fontWeight: 300,
          color: "#141410", margin: "0 0 40px", lineHeight: 1.1,
        }}>
          Learn
        </h1>

        {items.length === 0 ? (
          <p style={{ fontFamily: sans, fontSize: 14, color: "#7A7A6E" }}>
            Articles coming soon.
          </p>
        ) : (
          <LearnGrid items={items} />
        )}
      </main>
    </div>
  )
}

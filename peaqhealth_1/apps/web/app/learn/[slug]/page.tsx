import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "../../../lib/supabase/server"
import { Nav } from "../../components/nav"
import { ArticleBody } from "./article-body"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single()

  if (!article) notFound()

  const publishedDate = article.published_at
    ? new Date(article.published_at as string).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null

  return (
    <div className="min-h-svh" style={{ background: "#FAFAF8" }}>
      <Nav />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px 80px" }}>
        <Link href="/learn" style={{
          fontFamily: sans, fontSize: 12, color: "#B8860B",
          textDecoration: "none", display: "inline-block", marginBottom: 24,
        }}>
          ← Back to Learn
        </Link>

        <h1 style={{
          fontFamily: serif, fontSize: 38, fontWeight: 400,
          color: "#141410", margin: "0 0 12px", lineHeight: 1.15,
        }}>
          {article.title as string}
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          {article.author && (
            <span style={{ fontFamily: sans, fontSize: 12, color: "#7A7A6E" }}>
              {article.author as string}
            </span>
          )}
          {publishedDate && (
            <span style={{ fontFamily: sans, fontSize: 12, color: "#7A7A6E" }}>
              {publishedDate}
            </span>
          )}
          {article.read_time_min && (
            <span style={{ fontFamily: sans, fontSize: 12, color: "#B8860B" }}>
              {article.read_time_min as number} min read
            </span>
          )}
        </div>

        <ArticleBody markdown={article.body_md as string} />
      </main>
    </div>
  )
}

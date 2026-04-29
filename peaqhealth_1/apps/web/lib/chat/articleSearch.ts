import { createClient as createServiceClient } from "@supabase/supabase-js"

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface ArticleResult {
  title: string
  category: string | null
  summary: string
  url: string
}

export async function searchArticles(query: string, limit = 5): Promise<ArticleResult[]> {
  const db = svc()

  // Try ilike search on title + summary (full-text search can be added later)
  const terms = query.split(/\s+/).filter(t => t.length > 2)
  if (terms.length === 0) return []

  const pattern = `%${terms.join("%")}%`
  const { data, error } = await db
    .from("articles")
    .select("title, slug, summary, primary_panel")
    .eq("published", true)
    .or(`title.ilike.${pattern},summary.ilike.${pattern}`)
    .order("published_at", { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map(a => ({
    title: a.title as string,
    category: a.primary_panel as string | null,
    summary: (a.summary as string)?.slice(0, 200) ?? "(no summary)",
    url: `/learn/${a.slug}`,
  }))
}

export const ARTICLE_SEARCH_TOOL = {
  type: "function" as const,
  function: {
    name: "search_articles",
    description: "Search Oravi's curated article library. Use when the user asks for deeper reading on a topic, requests an article, or asks about content that might be in a Oravi article. Returns top 5 matching articles.",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string" as const,
          description: "Search terms — bacterial names, topics, or user-facing terminology.",
        },
        limit: {
          type: "integer" as const,
          default: 5,
        },
      },
      required: ["query"],
    },
  },
}

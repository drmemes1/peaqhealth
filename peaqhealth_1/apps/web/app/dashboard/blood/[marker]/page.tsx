import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "../../../../lib/supabase/server"
import { Nav } from "../../../components/nav"
import {
  getMarkerById,
  isKnownMarkerId,
} from "../../../../lib/blood/markerRegistry"
import { MarkerHeroCard } from "../../../components/blood/MarkerHeroCard"
import { MarkerDisclaimer } from "../../../components/blood/MarkerDisclaimer"
import { MarkerReflection } from "../../../components/blood/MarkerReflection"
import { GenericPanelContext } from "../../../components/blood/GenericPanelContext"
import { ConversationCard } from "../../../components/blood/ConversationCard"
import { TrendPlaceholder } from "../../../components/blood/TrendPlaceholder"
import { MarkerDrawers } from "../../../components/blood/MarkerDrawers"

/**
 * Blood marker detail page.
 *
 * Per ADR-0020 + the marker-detail rewrite (PART 5 of the brief):
 *   • Validates the [marker] URL parameter against the registry. 404 if unknown.
 *   • Reads the user's most recent blood_results row.
 *   • Renders: hero (value + status pill + distribution viz) → disclaimer →
 *     reflection → cluster context (if any) → conversation card → trend
 *     placeholder → drawers.
 *   • No cross-panel insights — those will live on the oral panel (separate
 *     future work). This page is a focused single-marker surface.
 */
export default async function MarkerPage({ params }: { params: Promise<{ marker: string }> }) {
  const { marker } = await params

  // Registry-driven 404 — old per-format definitions are gone.
  if (!isKnownMarkerId(marker)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const m = getMarkerById(marker)!

  // Latest blood_results row (per-test, ordered by collected_at DESC).
  const { data: row } = await supabase
    .from("blood_results")
    .select("*")
    .eq("user_id", user.id)
    .order("collected_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const rawValue = row ? (row as Record<string, unknown>)[m.id] : null
  const value = typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : null
  const hasData = value != null

  return (
    <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
      <Nav />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Back link */}
        <div style={{ marginBottom: 20 }}>
          <Link
            href="/dashboard/blood"
            style={{
              fontFamily: "var(--font-body), 'Instrument Sans', sans-serif",
              fontSize: 12,
              color: "var(--gold, #B8860B)",
              textDecoration: "none",
            }}
          >
            ← Back to blood panel
          </Link>
        </div>

        <MarkerHeroCard markerId={marker} value={value} />

        <MarkerDisclaimer />

        {/* Reflection — only if we have data + a populated descriptor */}
        {hasData && m.descriptor ? (
          <MarkerReflection markerId={marker} value={value} />
        ) : !hasData ? (
          <section style={{ marginBottom: 32 }}>
            <p
              style={{
                fontFamily: "var(--font-body), 'Instrument Sans', sans-serif",
                fontSize: 15,
                lineHeight: 1.65,
                color: "var(--ink-60, rgba(20,20,16,0.6))",
                margin: 0,
              }}
            >
              No value yet for {m.displayName.toLowerCase()}. Upload a blood panel that includes this marker to see your reading and how it sits in oravi&rsquo;s longevity-oriented range.
            </p>
            <Link
              href="/settings/labs"
              style={{
                display: "inline-block",
                marginTop: 12,
                fontFamily: "var(--font-body), 'Instrument Sans', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: "white",
                background: "var(--blood-c, #C0392B)",
                padding: "10px 18px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Upload blood PDF here →
            </Link>
          </section>
        ) : null}

        {/* Cluster context — only if marker has a cluster + we have data */}
        {hasData && m.cluster ? (
          <GenericPanelContext currentMarkerId={marker} cluster={m.cluster} />
        ) : null}

        <ConversationCard />

        <TrendPlaceholder />

        <MarkerDrawers markerId={marker} />
      </main>
    </div>
  )
}

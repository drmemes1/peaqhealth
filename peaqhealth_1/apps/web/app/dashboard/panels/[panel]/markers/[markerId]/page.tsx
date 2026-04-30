import { redirect, notFound } from "next/navigation"
import { createClient } from "../../../../../../lib/supabase/server"
import { getUserPanelContext } from "../../../../../../lib/user-context"
import { MARKERS, getValueFromCtx, computeVerdict, computeScalePosition } from "../../../../../../lib/markers/registry"
import { getMarkerInsight } from "../../../../../../lib/marker-insights/generate"
import { Nav } from "../../../../../components/nav"
import Link from "next/link"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const VERDICT_COLOR: Record<string, string> = {
  good: "#1A8C4E",
  watch: "#B8860B",
  concern: "#D42B2B",
  recheck: "#B8860B",
  pending: "#9B9891",
}

export default async function MarkerPage({ params }: { params: Promise<{ panel: string; markerId: string }> }) {
  const { panel, markerId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const marker = MARKERS[markerId]
  if (!marker || marker.panel !== panel) notFound()

  const ctx = await getUserPanelContext(user.id)
  const userValue = getValueFromCtx(ctx as unknown as Record<string, unknown>, marker.ctxPath)
  const verdict = computeVerdict(userValue, marker)
  const scalePos = computeScalePosition(userValue, marker)

  let insight = null
  try {
    insight = await getMarkerInsight(user.id, markerId, ctx)
  } catch (err) {
    console.error(`[marker-page] insight fetch failed for ${markerId}:`, err)
  }

  const panelColor = panel === "oral" ? "#2D6A4F" : panel === "blood" ? "#C0392B" : "#4A7FB5"
  const verdictColor = VERDICT_COLOR[verdict] ?? "#9B9891"

  return (
    <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
      <Nav />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
          <Link href="/dashboard" style={{ fontFamily: sans, fontSize: 12, color: "#9B9891", textDecoration: "none" }}>Dashboard</Link>
          <span style={{ color: "#D1CFC7" }}>›</span>
          <Link href={`/dashboard/${panel}`} style={{ fontFamily: sans, fontSize: 12, color: panelColor, textDecoration: "none", textTransform: "capitalize" }}>{panel}</Link>
          <span style={{ color: "#D1CFC7" }}>›</span>
          <span style={{ fontFamily: sans, fontSize: 12, color: "#2C2A24" }}>{marker.category.replace(/_/g, " ")}</span>
        </div>

        {/* Title */}
        <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 300, color: "#2C2A24", margin: "0 0 8px", lineHeight: 1.2 }}>
          {marker.label}
        </h1>
        <p style={{ fontFamily: sans, fontSize: 14, color: "#7A7870", lineHeight: 1.5, margin: "0 0 32px" }}>
          {marker.question}
        </p>

        {/* Value card */}
        <div style={{
          background: "#FFFFFF", border: "1px solid #E8E6E0", borderRadius: 14,
          padding: "28px 32px", marginBottom: 24,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
            <span style={{ fontFamily: serif, fontSize: 56, fontWeight: 300, color: "#2C2A24", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {userValue != null ? (typeof userValue === "number" ? (userValue % 1 === 0 ? userValue : userValue.toFixed(1)) : userValue) : "—"}
            </span>
            {marker.unit && (
              <span style={{ fontFamily: sans, fontSize: 18, color: "#9B9891" }}>{marker.unit}</span>
            )}
          </div>

          {/* Verdict */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: verdictColor }} />
            <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 500, color: verdictColor }}>
              {insight?.verdictLabel ?? verdict}
            </span>
          </div>

          {/* Scale bar */}
          <div style={{ position: "relative", height: 6, background: "#E8E6E0", borderRadius: 3, marginBottom: 12 }}>
            <div style={{
              position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 3,
              width: `${scalePos ?? 0}%`,
              background: verdict === "good" ? "#1A8C4E" : verdict === "watch" ? "#B8860B" : verdict === "concern" ? "#D42B2B" : "#D1CFC7",
              transition: "width 0.3s",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: sans, fontSize: 10, color: "#9B9891" }}>{marker.scale.min}</span>
            <span style={{ fontFamily: sans, fontSize: 10, color: "#9B9891" }}>{marker.scale.target}</span>
            <span style={{ fontFamily: sans, fontSize: 10, color: "#9B9891" }}>{marker.scale.max}</span>
          </div>
        </div>

        {/* Plain meaning */}
        {insight?.plainMeaning && (
          <div style={{
            background: "#FAFAF8", border: "1px solid #E8E6E0", borderRadius: 12,
            padding: "20px 24px", marginBottom: 24,
          }}>
            <p style={{ fontFamily: sans, fontSize: 14, color: "#4A4A42", lineHeight: 1.6, margin: 0 }}>
              {insight.plainMeaning}
            </p>
          </div>
        )}

        {/* Narrative */}
        {insight?.narrative && (
          <div style={{
            background: "#FFFFFF", border: "1px solid #E8E6E0", borderRadius: 12,
            padding: "20px 24px", marginBottom: 24,
          }}>
            <span style={{
              fontFamily: sans, fontSize: 9, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#B8860B", fontWeight: 500,
              display: "block", marginBottom: 10,
            }}>
              THE FULLER PICTURE
            </span>
            <p style={{ fontFamily: sans, fontSize: 14, color: "#4A4A42", lineHeight: 1.7, margin: 0 }}>
              {insight.narrative}
            </p>
          </div>
        )}

        {/* Cross-panel connections */}
        {insight?.crossPanelObservations && insight.crossPanelObservations.length > 0 && (
          <div style={{
            background: "#FFFFFF", border: "1px solid #E8E6E0", borderRadius: 12,
            padding: "20px 24px", marginBottom: 24,
          }}>
            <span style={{
              fontFamily: sans, fontSize: 9, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#9B9891", fontWeight: 500,
              display: "block", marginBottom: 12,
            }}>
              CROSS-PANEL CONNECTIONS
            </span>
            {insight.crossPanelObservations.map((obs, i) => {
              const relatedMarker = MARKERS[obs.relatedMarker]
              return (
                <div key={i} style={{
                  padding: "10px 0",
                  borderBottom: i < insight.crossPanelObservations.length - 1 ? "1px solid #F5F3EE" : "none",
                }}>
                  {relatedMarker && (
                    <Link
                      href={`/dashboard/panels/${relatedMarker.panel}/markers/${relatedMarker.id}`}
                      style={{ fontFamily: sans, fontSize: 12, color: panelColor, textDecoration: "none", fontWeight: 500 }}
                    >
                      {relatedMarker.label} →
                    </Link>
                  )}
                  <p style={{ fontFamily: sans, fontSize: 13, color: "#7A7870", lineHeight: 1.5, margin: "4px 0 0" }}>
                    {obs.observation}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* Back link */}
        <Link href={`/dashboard/${panel}`} style={{
          fontFamily: sans, fontSize: 13, color: "#B8860B",
          textDecoration: "none", fontWeight: 500,
        }}>
          ← Back to {panel} panel
        </Link>
      </main>
    </div>
  )
}

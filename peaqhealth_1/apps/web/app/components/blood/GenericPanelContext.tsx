/**
 * Renders the user's other markers in the same cluster as the current
 * marker, as small status cards. Click navigates to that marker's page.
 *
 * Reads the user's most recent blood_results row server-side.
 */
import Link from "next/link"
import { createClient } from "../../../lib/supabase/server"
import {
  BLOOD_MARKER_REGISTRY,
  getMarkerById,
  type MarkerCluster,
} from "../../../lib/blood/markerRegistry"
import { getMarkerStatus } from "../../../lib/blood/status"

const CLUSTER_LABELS: Record<NonNullable<MarkerCluster>, string> = {
  lipid_panel: "Your lipid panel",
  metabolic_panel: "Your metabolic panel",
  thyroid_panel: "Your thyroid panel",
  kidney_panel: "Your kidney panel",
  liver_panel: "Your liver panel",
  cbc_panel: "Your complete blood count",
  inflammation_panel: "Your inflammation markers",
}

export async function GenericPanelContext({
  currentMarkerId,
  cluster,
}: {
  currentMarkerId: string
  cluster: NonNullable<MarkerCluster>
}) {
  const sans = "var(--font-body), 'Instrument Sans', sans-serif"
  const serif = "var(--font-display), 'Manrope', sans-serif"

  // Find peers in this cluster, excluding the current marker.
  const peers = BLOOD_MARKER_REGISTRY.filter(
    m => m.cluster === cluster && m.id !== currentMarkerId,
  )
  if (peers.length === 0) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: row } = await supabase
    .from("blood_results")
    .select("*")
    .eq("user_id", user.id)
    .order("collected_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <section style={{ marginBottom: 36 }}>
      <h2
        style={{
          fontFamily: serif,
          fontSize: 18,
          fontWeight: 500,
          color: "var(--ink, #141410)",
          margin: "0 0 14px",
          letterSpacing: "-0.01em",
        }}
      >
        {CLUSTER_LABELS[cluster]}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
        {peers.map(p => {
          const value = row ? (row as Record<string, unknown>)[p.id] : null
          const num = typeof value === "number" && Number.isFinite(value) ? value : null
          const status = getMarkerStatus(num, p.id)
          const m = getMarkerById(p.id)!
          return (
            <Link
              key={p.id}
              href={`/dashboard/blood/${p.id}`}
              style={{
                display: "block",
                background: "white",
                border: "0.5px solid var(--ink-12, rgba(20,20,16,0.12))",
                borderRadius: 10,
                padding: "12px 14px",
                textDecoration: "none",
              }}
            >
              <div style={{ fontFamily: sans, fontSize: 11, color: "var(--ink-50, rgba(20,20,16,0.5))", marginBottom: 4 }}>
                {m.shortName ?? m.displayName}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <span style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, color: "var(--ink, #141410)" }}>
                  {num != null ? num : "—"}
                </span>
                <span style={{ fontFamily: sans, fontSize: 10, color: "var(--ink-40, rgba(20,20,16,0.4))" }}>
                  {m.unit}
                </span>
              </div>
              {status && (
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: sans,
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color:
                      status.pillColor === "green" ? "#3F5538"
                      : status.pillColor === "amber" ? "#7A5715"
                      : "#7A1F18",
                  }}
                >
                  {status.displayLabel}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

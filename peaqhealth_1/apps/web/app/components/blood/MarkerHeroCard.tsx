/**
 * Marker detail-page hero. Delegates to the shared MarkerPanelCard so the
 * hero on /dashboard/blood/[marker] is the same tile rendered on /dashboard/blood.
 * No styling lives here — every dimension/color comes from MarkerPanelCard.
 */
import { MarkerPanelCard } from "./MarkerPanelCard"

export function MarkerHeroCard({
  markerId,
  value,
}: {
  markerId: string
  value: number | null
}) {
  return <MarkerPanelCard markerId={markerId} value={value} />
}

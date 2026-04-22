"use client"

import { TileGrid } from "../../components/panels/tile-grid"
import type { UserPanelContext } from "../../../lib/user-context"
import type { MarkerDefinition } from "../../../lib/markers/registry"

function getSubtitle(marker: MarkerDefinition): string | undefined {
  if (marker.ctxPath.startsWith("sleepData.")) return undefined
  return "Self-reported"
}

export function SleepTileSection({ ctx }: { ctx: UserPanelContext }) {
  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px 40px" }}>
      <div style={{ borderTop: "1px solid #D6D3C8", paddingTop: 32, marginTop: 8 }}>
        <TileGrid
          panel="sleep"
          ctx={ctx}
          title="Browse all sleep markers"
          subtitle="Tap any tile for the full picture"
          getSubtitle={ctx.hasWearable ? undefined : getSubtitle}
        />
      </div>
    </div>
  )
}

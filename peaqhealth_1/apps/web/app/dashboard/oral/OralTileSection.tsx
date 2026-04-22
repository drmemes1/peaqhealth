"use client"

import { TileGrid } from "../../components/panels/tile-grid"
import type { UserPanelContext } from "../../../lib/user-context"

export function OralTileSection({ ctx }: { ctx: UserPanelContext }) {
  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px 40px" }}>
      <div style={{ borderTop: "1px solid #D6D3C8", paddingTop: 32, marginTop: 8 }}>
        <TileGrid
          panel="oral"
          ctx={ctx}
          title="Browse all oral markers"
          subtitle="Tap any tile for the full picture"
        />
      </div>
    </div>
  )
}

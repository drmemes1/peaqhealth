"use client"

import { useState, useMemo } from "react"
import { MarkerTile } from "./MarkerTile"
import { FilterSortBar, type SortMode, type FilterMode } from "./FilterSortBar"
import { MARKERS_BY_PANEL, type MarkerDefinition, type Verdict, computeVerdict, getValueFromCtx } from "../../../../lib/markers/registry"
import type { UserPanelContext } from "../../../../lib/user-context"
import { SectionHeader } from "../index"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const STATUS_ORDER: Record<string, number> = { concern: 0, watch: 1, recheck: 2, pending: 3, good: 4 }

interface MarkerEntry {
  marker: MarkerDefinition
  value: number | null
  verdict: Verdict
  subtitle?: string
}

export function TileGrid({ panel, ctx, title, subtitle: subtitleOverride, getSubtitle }: {
  panel: "oral" | "blood" | "sleep"
  ctx: UserPanelContext
  title?: string
  subtitle?: string
  getSubtitle?: (marker: MarkerDefinition) => string | undefined
}) {
  const [sort, setSort] = useState<SortMode>("status")
  const [filter, setFilter] = useState<FilterMode>("all")

  const entries: MarkerEntry[] = useMemo(() => {
    const panelMarkers = MARKERS_BY_PANEL[panel] ?? []
    return panelMarkers.map(marker => {
      const value = getValueFromCtx(ctx as unknown as Record<string, unknown>, marker.ctxPath)
      return {
        marker,
        value,
        verdict: computeVerdict(value, marker),
        subtitle: getSubtitle?.(marker),
      }
    })
  }, [panel, ctx, getSubtitle])

  const filtered = useMemo(() => {
    if (filter === "all") return entries
    if (filter === "attention") return entries.filter(e => e.verdict === "concern" || e.verdict === "watch" || e.verdict === "recheck")
    if (filter === "good") return entries.filter(e => e.verdict === "good")
    if (filter === "not_tested") return entries.filter(e => e.verdict === "pending")
    return entries
  }, [entries, filter])

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sort === "status") list.sort((a, b) => (STATUS_ORDER[a.verdict] ?? 4) - (STATUS_ORDER[b.verdict] ?? 4))
    else if (sort === "az") list.sort((a, b) => a.marker.label.localeCompare(b.marker.label))
    return list
  }, [filtered, sort])

  const categories = useMemo(() => {
    const cats = new Map<string, MarkerEntry[]>()
    for (const entry of sorted) {
      const cat = entry.marker.category
      if (!cats.has(cat)) cats.set(cat, [])
      cats.get(cat)!.push(entry)
    }
    return cats
  }, [sorted])

  const populatedCount = entries.filter(e => e.verdict !== "pending").length
  const attentionCount = entries.filter(e => e.verdict === "concern" || e.verdict === "watch").length

  const defaultTitle = panel === "oral" ? "What your oral data is showing"
    : panel === "sleep" ? "What your sleep data is showing"
    : "What your blood data is showing"

  const autoSubtitle = `${populatedCount} markers populated${attentionCount > 0 ? ` · ${attentionCount} need attention` : ""}`

  return (
    <div>
      <SectionHeader title={title ?? defaultTitle} subtitle={subtitleOverride ?? autoSubtitle} />

      <FilterSortBar sort={sort} filter={filter} onSort={setSort} onFilter={setFilter} />

      {sort === "category" ? (
        Array.from(categories.entries()).map(([catKey, catEntries]) => {
          const populated = catEntries.filter(e => e.verdict !== "pending").length
          return (
            <div key={catKey} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, color: "#2C2A24" }}>
                  {catKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <span style={{ fontFamily: sans, fontSize: 10, color: "#8C897F" }}>{populated}/{catEntries.length}</span>
              </div>
              <div className="panel-tile-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {catEntries.map(e => (
                  <MarkerTile key={e.marker.id} marker={e.marker} value={e.value} verdict={e.verdict} subtitle={e.subtitle} />
                ))}
              </div>
            </div>
          )
        })
      ) : (
        <div className="panel-tile-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {sorted.map(e => (
            <MarkerTile key={e.marker.id} marker={e.marker} value={e.value} verdict={e.verdict} subtitle={e.subtitle} />
          ))}
        </div>
      )}

      {sorted.length === 0 && (
        <p style={{ fontFamily: sans, fontSize: 13, color: "#8C897F", textAlign: "center", padding: 40 }}>
          No markers match this filter.
        </p>
      )}

      <style>{`
        @media (max-width: 960px) { .panel-tile-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) {
          .panel-tile-grid { grid-template-columns: 1fr !important; gap: 8px !important; }
          .panel-filter-bar { flex-direction: column; align-items: flex-start !important; gap: 6px !important; }
        }
      `}</style>
    </div>
  )
}

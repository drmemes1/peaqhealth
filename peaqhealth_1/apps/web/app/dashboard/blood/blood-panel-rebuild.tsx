// ============================================================================
// BLOOD PANEL — TILE GRID WITH FILTER/SORT BAR
// ============================================================================
"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { SectionHeader } from "../../components/panels"
import { BLOOD_CATEGORIES, getCategoryStatus } from "../../../lib/blood/categories"
import { MARKERS } from "../../../lib/blood/marker-content"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
const STATUS_COLORS = { good: "#1A8C4E", watch: "#B8860B", concern: "#A84D4D", recheck: "#9B8B6E", pending: "#C8C6BE" } as const
const STATUS_ORDER = { concern: 0, watch: 1, recheck: 2, pending: 3, good: 4 }
const STATUS_LABELS = { good: "Good", watch: "Watch", concern: "Attention", recheck: "Recheck", pending: "Not tested" }

type Status = keyof typeof STATUS_COLORS

function getMarkerStatus(key: string, value: number | null): Status {
  if (value == null) return "pending"
  const m = MARKERS[key]
  if (!m?.optimal) return "good"
  const { min, max } = m.optimal
  if (min != null && max != null) return value >= min && value <= max ? "good" : "watch"
  if (max != null) return value <= max ? "good" : value <= max * 1.5 ? "watch" : "concern"
  if (min != null) return value >= min ? "good" : value >= min * 0.7 ? "watch" : "concern"
  return "good"
}

function MarkerTile({ markerKey, marker, value, status }: {
  markerKey: string; marker: typeof MARKERS[string]; value: number | null; status: Status
}) {
  const color = STATUS_COLORS[status]
  const hasValue = value != null

  return (
    <Link
      href={`/dashboard/blood/${markerKey}`}
      style={{
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        height: 120, padding: "14px 16px",
        background: hasValue ? "#FAFAF8" : "#F7F6F2",
        border: "1px solid #D6D3C8", borderLeft: `3px solid ${color}`,
        borderRadius: 8, textDecoration: "none",
        transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
        opacity: hasValue ? 1 : 0.7,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(20,20,16,0.08)"; e.currentTarget.style.borderColor = "#B8AA88"; e.currentTarget.style.borderLeftColor = color }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#D6D3C8"; e.currentTarget.style.borderLeftColor = color }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: hasValue ? "#2C2A24" : "#8C897F" }}>
          {marker.displayName}
        </span>
        <span style={{
          fontFamily: sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase",
          color, display: "flex", alignItems: "center", gap: 3,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 500, color: hasValue ? "#2C2A24" : "#B8B4AA", lineHeight: 1 }}>
        {hasValue ? (value < 1 ? value.toFixed(2) : value < 10 ? value.toFixed(1) : Math.round(value)) : "—"}
        {hasValue && <span style={{ fontSize: 14, fontWeight: 400, color: "#8C897F", marginLeft: 2 }}>{marker.unit}</span>}
      </div>

      {/* Mini scale bar */}
      {hasValue && marker.optimal && (
        <div style={{ position: "relative", height: 3, background: "#E8E4D8", borderRadius: 2 }}>
          {(() => {
            const { min, max } = marker.optimal!
            const scaleMin = min != null && max != null ? Math.min(min * 0.5, value * 0.8) : min != null ? min * 0.5 : 0
            const scaleMax = min != null && max != null ? Math.max(max * 1.5, value * 1.2) : max != null ? max * 2 : value * 2
            const range = scaleMax - scaleMin || 1
            const pos = Math.max(0, Math.min(100, ((value - scaleMin) / range) * 100))
            return <div style={{ position: "absolute", top: -1, left: `${pos}%`, width: 2, height: 5, borderRadius: 1, background: "#2C2A24", transform: "translateX(-1px)" }} />
          })()}
        </div>
      )}
      {!hasValue && <div style={{ height: 3 }} />}
    </Link>
  )
}

type SortMode = "status" | "category" | "az"
type FilterMode = "all" | "attention" | "good" | "not_tested"

export default function BloodPanelClient({ lab }: {
  lab: Record<string, unknown> | null
  hasOral: boolean
  hasSleep: boolean
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initSort = (searchParams.get("sort") as SortMode) || "status"
  const initFilter = (searchParams.get("filter") as FilterMode) || "all"
  const [sort, setSort] = useState<SortMode>(initSort)
  const [filter, setFilter] = useState<FilterMode>(initFilter)

  function updateParams(s: SortMode, f: FilterMode) {
    const params = new URLSearchParams()
    if (s !== "status") params.set("sort", s)
    if (f !== "all") params.set("filter", f)
    const qs = params.toString()
    router.replace(`/dashboard/blood${qs ? `?${qs}` : ""}`, { scroll: false })
  }

  if (!lab) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px", background: "#F5F3EE" }}>
        <SectionHeader title="Blood panel" subtitle="No blood results on file." />
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: 24 }}>
          <p style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, color: "#2C2A24", margin: "0 0 8px" }}>Upload a blood panel to see your markers</p>
          <p style={{ fontFamily: sans, fontSize: 13, color: "#92400E", margin: "0 0 16px" }}>Your lab results will appear here as a tile grid with instant marker-by-marker insights.</p>
          <Link href="/settings/labs" style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, color: "#B8860B", textDecoration: "none" }}>Upload lab results →</Link>
        </div>
      </div>
    )
  }

  const data = lab as Record<string, number | null>

  const allMarkers = useMemo(() => {
    const result: { key: string; marker: typeof MARKERS[string]; value: number | null; status: Status; catKey: string; catIdx: number }[] = []
    BLOOD_CATEGORIES.forEach((cat, catIdx) => {
      cat.markerKeys.forEach(k => {
        const m = MARKERS[k]
        if (!m) return
        const v = data[k] != null ? Number(data[k]) : null
        result.push({ key: k, marker: m, value: v, status: getMarkerStatus(k, v), catKey: cat.key, catIdx })
      })
    })
    return result
  }, [data])

  const filtered = useMemo(() => {
    let list = allMarkers
    if (filter === "attention") list = list.filter(m => m.status === "concern" || m.status === "watch" || m.status === "recheck")
    else if (filter === "good") list = list.filter(m => m.status === "good")
    else if (filter === "not_tested") list = list.filter(m => m.status === "pending")
    return list
  }, [allMarkers, filter])

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sort === "status") list.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    else if (sort === "az") list.sort((a, b) => a.marker.displayName.localeCompare(b.marker.displayName))
    return list
  }, [filtered, sort])

  const populatedCount = allMarkers.filter(m => m.status !== "pending").length
  const attentionCount = allMarkers.filter(m => m.status === "concern" || m.status === "watch").length

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: sans, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "6px 12px", borderRadius: 4, border: "none", cursor: "pointer",
    background: active ? "#2C2A24" : "transparent", color: active ? "#F5F3EE" : "#8C897F",
    transition: "all 0.15s",
  })

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 24px 80px", background: "#F5F3EE" }}>
      <SectionHeader
        title="What your blood data is showing"
        subtitle={`${populatedCount} markers populated${attentionCount > 0 ? ` · ${attentionCount} need attention` : ""}`}
      />

      {/* Filter/sort bar */}
      <div className="blood-filter-bar" style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#F5F3EE", borderBottom: "1px solid #E8E4D8",
        padding: "10px 0", marginBottom: 20,
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontFamily: sans, fontSize: 10, color: "#8C897F", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 4 }}>Sort</span>
          <button style={btnStyle(sort === "status")} onClick={() => { setSort("status"); updateParams("status", filter) }}>Status</button>
          <button style={btnStyle(sort === "category")} onClick={() => { setSort("category"); updateParams("category", filter) }}>Category</button>
          <button style={btnStyle(sort === "az")} onClick={() => { setSort("az"); updateParams("az", filter) }}>A–Z</button>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontFamily: sans, fontSize: 10, color: "#8C897F", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 4 }}>Show</span>
          <button style={btnStyle(filter === "all")} onClick={() => { setFilter("all"); updateParams(sort, "all") }}>All</button>
          <button style={btnStyle(filter === "attention")} onClick={() => { setFilter("attention"); updateParams(sort, "attention") }}>Needs attention</button>
          <button style={btnStyle(filter === "good")} onClick={() => { setFilter("good"); updateParams(sort, "good") }}>Strong</button>
          <button style={btnStyle(filter === "not_tested")} onClick={() => { setFilter("not_tested"); updateParams(sort, "not_tested") }}>Not tested</button>
        </div>
      </div>

      {sort === "category" ? (
        // Grouped by category
        BLOOD_CATEGORIES.map(cat => {
          const catMarkers = sorted.filter(m => m.catKey === cat.key)
          if (catMarkers.length === 0) return null
          const populated = catMarkers.filter(m => m.status !== "pending").length
          return (
            <div key={cat.key} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <div>
                  <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, color: "#2C2A24" }}>{cat.name}</span>
                  <span style={{ fontFamily: sans, fontSize: 11, color: "#8C897F", marginLeft: 8 }}>{cat.description}</span>
                </div>
                <span style={{ fontFamily: sans, fontSize: 10, color: "#8C897F" }}>{populated}/{catMarkers.length}</span>
              </div>
              <div className="blood-tile-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {catMarkers.map(m => <MarkerTile key={m.key} markerKey={m.key} marker={m.marker} value={m.value} status={m.status} />)}
              </div>
            </div>
          )
        })
      ) : (
        // Flat sorted grid
        <div className="blood-tile-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {sorted.map(m => <MarkerTile key={m.key} markerKey={m.key} marker={m.marker} value={m.value} status={m.status} />)}
        </div>
      )}

      {sorted.length === 0 && (
        <p style={{ fontFamily: sans, fontSize: 13, color: "#8C897F", textAlign: "center", padding: 40 }}>
          No markers match this filter.
        </p>
      )}

      <style>{`
        @media (max-width: 960px) { .blood-tile-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) {
          .blood-tile-grid { grid-template-columns: 1fr !important; }
          .blood-filter-bar { flex-direction: column; align-items: flex-start !important; }
        }
      `}</style>
    </div>
  )
}

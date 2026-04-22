// ============================================================================
// BLOOD PANEL — REDESIGNED TILE GRID WITH STATUS SECTIONS
// ============================================================================
"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { SectionHeader } from "../../components/panels"
import { BLOOD_CATEGORIES } from "../../../lib/blood/categories"
import { MARKERS } from "../../../lib/blood/marker-content"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

type Status = "attention" | "watch" | "strong" | "not_tested"

const STATUS_ORDER: Record<Status, number> = { attention: 0, watch: 1, strong: 2, not_tested: 3 }

const STATUS_META: Record<Status, { dot: string; bg: string; border: string; bar: string; badgeBg: string; badgeText: string; label: string }> = {
  attention: { dot: "#9B3838", bg: "#FDF8F6", border: "#E5C4C4", bar: "#9B3838", badgeBg: "rgba(155,56,56,0.1)", badgeText: "#9B3838", label: "Attention" },
  watch:     { dot: "#C4992E", bg: "#FDFAF1", border: "#E8D5A0", bar: "#C4992E", badgeBg: "rgba(196,153,46,0.12)", badgeText: "#946F1B", label: "Watch" },
  strong:    { dot: "#4A7A4A", bg: "#F7FAF4", border: "#C8D8C0", bar: "#4A7A4A", badgeBg: "rgba(74,122,74,0.1)", badgeText: "#3A6A3A", label: "Strong" },
  not_tested:{ dot: "#A8A59B", bg: "transparent", border: "#C4C1B6", bar: "#C4C1B6", badgeBg: "rgba(168,165,155,0.1)", badgeText: "#8C897F", label: "Not tested" },
}

const SECTION_META: Record<Status, { title: string; subtitle: string }> = {
  attention:  { title: "Needs your attention", subtitle: "" },
  watch:      { title: "Keep an eye on these", subtitle: "" },
  strong:     { title: "In your strong zone", subtitle: "" },
  not_tested: { title: "Not yet measured", subtitle: "Available in your panel" },
}

const CATEGORY_LABELS: Record<string, string> = {
  heart: "Heart", metabolic: "Metabolic", kidney: "Kidney", liver: "Liver",
  cbc: "Blood cells", immune: "Immune", nutrients: "Nutrients", thyroid: "Thyroid",
}

function getMarkerStatus(key: string, value: number | null): Status {
  if (value == null) return "not_tested"
  const m = MARKERS[key]
  if (!m?.optimal) return "strong"
  const { min, max } = m.optimal
  if (min != null && max != null) {
    if (value >= min && value <= max) return "strong"
    const range = max - min
    if (value < min - range * 0.3 || value > max + range * 0.3) return "attention"
    return "watch"
  }
  if (max != null) return value <= max ? "strong" : value <= max * 1.3 ? "watch" : "attention"
  if (min != null) return value >= min ? "strong" : value >= min * 0.7 ? "watch" : "attention"
  return "strong"
}

function computeTickPosition(value: number, marker: typeof MARKERS[string]): number {
  if (!marker.optimal) return 50
  const { min, max } = marker.optimal
  if (min != null && max != null) {
    const scaleMin = Math.min(min * 0.5, value * 0.7)
    const scaleMax = Math.max(max * 1.5, value * 1.3)
    return Math.max(2, Math.min(98, ((value - scaleMin) / (scaleMax - scaleMin)) * 100))
  }
  if (max != null) {
    const scaleMax = Math.max(max * 2, value * 1.3)
    return Math.max(2, Math.min(98, (value / scaleMax) * 100))
  }
  if (min != null) {
    const scaleMax = Math.max(min * 3, value * 1.5)
    return Math.max(2, Math.min(98, (value / scaleMax) * 100))
  }
  return 50
}

function deltaLabel(value: number, marker: typeof MARKERS[string]): { text: string; color: string } | null {
  if (!marker.optimal) return null
  const { min, max } = marker.optimal
  if (min != null && max != null) {
    if (value >= min && value <= max) return { text: "optimal", color: "#4A7A4A" }
    if (value < min) return { text: "↓ below range", color: "#C4992E" }
    const overPct = ((value - max) / max) * 100
    return { text: overPct > 30 ? "↑ above range" : "↑ borderline", color: overPct > 30 ? "#9B3838" : "#C4992E" }
  }
  if (max != null) {
    if (value <= max) return { text: "optimal", color: "#4A7A4A" }
    const overPct = ((value - max) / max) * 100
    return { text: overPct > 30 ? "↑ above range" : "↑ borderline", color: overPct > 30 ? "#9B3838" : "#C4992E" }
  }
  if (min != null) {
    if (value >= min) return { text: "optimal", color: "#4A7A4A" }
    return { text: "↓ below range", color: "#C4992E" }
  }
  return null
}

function scaleLabels(marker: typeof MARKERS[string], value: number): string[] {
  if (!marker.optimal) return []
  const { min, max } = marker.optimal
  if (min != null && max != null) {
    const lo = Math.round(min * 0.5)
    return [String(lo), String(min), String(Math.round((min + max) / 2)), String(max), String(Math.round(max * 1.5))]
  }
  if (max != null) return ["0", String(Math.round(max * 0.5)), String(max), String(Math.round(max * 1.3)), String(Math.round(max * 2))]
  if (min != null) return [String(Math.round(min * 0.5)), String(min), String(Math.round(min * 1.5)), String(Math.round(min * 2)), String(Math.round(min * 3))]
  return []
}

// ── Populated marker card ──────────────────────────────────────────────────

function PopulatedCard({ markerKey, marker, value, status }: {
  markerKey: string; marker: typeof MARKERS[string]; value: number; status: Status
}) {
  const meta = STATUS_META[status]
  const tickPos = computeTickPosition(value, marker)
  const delta = deltaLabel(value, marker)
  const labels = scaleLabels(marker, value)
  const catLabel = CATEGORY_LABELS[marker.category] ?? marker.category

  return (
    <Link
      href={`/dashboard/blood/${markerKey}`}
      style={{
        display: "block", textDecoration: "none", position: "relative",
        background: meta.bg, border: `1px solid ${meta.border}`,
        borderRadius: 14, padding: "20px 22px",
        transition: "transform 0.15s, box-shadow 0.15s",
        cursor: "pointer", overflow: "hidden",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(44,42,36,0.08)" }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none" }}
    >
      {/* Left accent stripe */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: meta.bar, opacity: 0.7, borderRadius: "14px 0 0 14px" }} />

      {/* Category + status row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: serif, fontSize: 12, fontStyle: "italic", color: "#A8A59B" }}>{catLabel}</span>
        <span style={{
          fontFamily: sans, fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase",
          background: meta.badgeBg, color: meta.badgeText,
          padding: "3px 9px", borderRadius: 20,
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.dot }} />
          {meta.label}
        </span>
      </div>

      {/* Marker name */}
      <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, color: "#2C2A24", margin: "0 0 12px", lineHeight: 1.2 }}>
        {marker.displayName}
      </h3>

      {/* Value + delta row */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <span style={{ fontFamily: serif, fontSize: 46, fontWeight: 500, color: "#2C2A24", lineHeight: 1, letterSpacing: "-0.02em" }}>
            {value < 1 ? value.toFixed(2) : value < 10 ? value.toFixed(1) : Math.round(value)}
          </span>
          <span style={{ fontFamily: serif, fontSize: 18, fontStyle: "italic", color: "#8C897F", marginLeft: 4 }}>{marker.unit}</span>
        </div>
        {delta && (
          <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, color: delta.color }}>{delta.text}</span>
        )}
      </div>

      {/* Range bar */}
      <div style={{ position: "relative", height: 4, borderRadius: 2, marginBottom: 6,
        background: "linear-gradient(90deg, rgba(229,196,196,0.3) 0% 18%, rgba(232,213,160,0.35) 18% 30%, #C8D8C0 30% 70%, rgba(232,213,160,0.35) 70% 82%, rgba(229,196,196,0.3) 82% 100%)",
      }}>
        <div style={{
          position: "absolute", top: -3, left: `${tickPos}%`, width: 2, height: 10,
          background: meta.dot, borderRadius: 1, transform: "translateX(-1px)",
          boxShadow: "0 0 0 2px #FAFAF8",
        }} />
      </div>
      {labels.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {labels.map((l, i) => (
            <span key={i} style={{ fontFamily: sans, fontSize: 9, color: "#A8A59B", fontVariantNumeric: "tabular-nums" }}>{l}</span>
          ))}
        </div>
      )}
    </Link>
  )
}

// ── Not tested card ────────────────────────────────────────────────────────

function EmptyCard({ marker }: { marker: typeof MARKERS[string] }) {
  const catLabel = CATEGORY_LABELS[marker.category] ?? marker.category
  return (
    <div style={{
      border: "1px dashed #C4C1B6", borderRadius: 10,
      padding: "14px 16px", minHeight: 78,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      transition: "border-color 0.15s, background 0.15s",
      cursor: "default",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = "#8C897F"; e.currentTarget.style.background = "rgba(250,250,248,0.5)" }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "#C4C1B6"; e.currentTarget.style.background = "transparent" }}
    >
      <div>
        <span style={{ fontFamily: serif, fontSize: 11, fontStyle: "italic", color: "#A8A59B", display: "block", marginBottom: 2 }}>{catLabel}</span>
        <span style={{ fontFamily: serif, fontSize: 15, fontWeight: 500, color: "#6B6860" }}>{marker.displayName}</span>
      </div>
      <span style={{ fontFamily: sans, fontSize: 8, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#A8A59B" }}>NOT TESTED</span>
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────

function StatusSection({ status, count, isFirst }: { status: Status; count: number; isFirst: boolean }) {
  const meta = STATUS_META[status]
  const section = SECTION_META[status]
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: isFirst ? 0 : 32, marginBottom: 16 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.dot, flexShrink: 0 }} />
      <span style={{ fontFamily: serif, fontSize: 18, fontStyle: "italic", color: "#6B6860", whiteSpace: "nowrap" }}>
        {section.title}
      </span>
      <div style={{ flex: 1, height: 1, background: "#E8E4D8" }} />
      <span style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A59B", whiteSpace: "nowrap" }}>
        {status === "not_tested" ? section.subtitle : `${count} marker${count === 1 ? "" : "s"}`}
      </span>
    </div>
  )
}

// ── Filter/sort bar ────────────────────────────────────────────────────────

type SortMode = "status" | "category" | "az"
type FilterMode = "all" | "attention" | "good" | "not_tested"

function btnStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: sans, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "6px 12px", borderRadius: 4, border: "none", cursor: "pointer",
    background: active ? "#2C2A24" : "transparent", color: active ? "#F5F3EE" : "#8C897F",
    transition: "all 0.15s",
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

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
    if (filter === "attention") list = list.filter(m => m.status === "attention" || m.status === "watch")
    else if (filter === "good") list = list.filter(m => m.status === "strong")
    else if (filter === "not_tested") list = list.filter(m => m.status === "not_tested")
    return list
  }, [allMarkers, filter])

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sort === "status") list.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    else if (sort === "az") list.sort((a, b) => a.marker.displayName.localeCompare(b.marker.displayName))
    return list
  }, [filtered, sort])

  const populatedCount = allMarkers.filter(m => m.status !== "not_tested").length
  const attentionCount = allMarkers.filter(m => m.status === "attention" || m.status === "watch").length

  const statusGroups = useMemo(() => {
    const groups: Record<Status, typeof sorted> = { attention: [], watch: [], strong: [], not_tested: [] }
    for (const m of sorted) groups[m.status].push(m)
    return groups
  }, [sorted])

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

      {sort === "status" ? (
        /* Status-grouped sections */
        <>
          {(["attention", "watch", "strong", "not_tested"] as Status[]).map((s, si) => {
            const group = statusGroups[s]
            if (group.length === 0) return null
            const isFirst = si === 0 || (["attention", "watch", "strong", "not_tested"] as Status[]).slice(0, si).every(ps => statusGroups[ps].length === 0)
            return (
              <div key={s}>
                <StatusSection status={s} count={group.length} isFirst={isFirst} />
                {s === "not_tested" ? (
                  <div className="blood-empty-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {group.map(m => <EmptyCard key={m.key} marker={m.marker} />)}
                  </div>
                ) : (
                  <div className="blood-tile-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                    {group.map(m => <PopulatedCard key={m.key} markerKey={m.key} marker={m.marker} value={m.value!} status={m.status} />)}
                  </div>
                )}
              </div>
            )
          })}
        </>
      ) : sort === "category" ? (
        BLOOD_CATEGORIES.map(cat => {
          const catMarkers = sorted.filter(m => m.catKey === cat.key)
          if (catMarkers.length === 0) return null
          const populated = catMarkers.filter(m => m.status !== "not_tested").length
          return (
            <div key={cat.key} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <div>
                  <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, color: "#2C2A24" }}>{cat.name}</span>
                  <span style={{ fontFamily: sans, fontSize: 11, color: "#8C897F", marginLeft: 8 }}>{cat.description}</span>
                </div>
                <span style={{ fontFamily: sans, fontSize: 10, color: "#8C897F" }}>{populated}/{catMarkers.length}</span>
              </div>
              <div className="blood-tile-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {catMarkers.map(m => m.value != null
                  ? <PopulatedCard key={m.key} markerKey={m.key} marker={m.marker} value={m.value} status={m.status} />
                  : <div key={m.key} style={{ gridColumn: "span 1" }}><EmptyCard marker={m.marker} /></div>
                )}
              </div>
            </div>
          )
        })
      ) : (
        <div className="blood-tile-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {sorted.map(m => m.value != null
            ? <PopulatedCard key={m.key} markerKey={m.key} marker={m.marker} value={m.value} status={m.status} />
            : <div key={m.key}><EmptyCard marker={m.marker} /></div>
          )}
        </div>
      )}

      {sorted.length === 0 && (
        <p style={{ fontFamily: sans, fontSize: 13, color: "#8C897F", textAlign: "center", padding: 40 }}>
          No markers match this filter.
        </p>
      )}

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Link href="/dashboard/converge" style={{ fontFamily: sans, fontSize: 13, color: "#B8860B", textDecoration: "none", fontWeight: 500 }}>
          See how this connects to your other panels →
        </Link>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .blood-tile-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .blood-empty-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .blood-tile-grid { grid-template-columns: 1fr !important; }
          .blood-empty-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .blood-filter-bar { flex-direction: column; align-items: flex-start !important; }
        }
      `}</style>
    </div>
  )
}

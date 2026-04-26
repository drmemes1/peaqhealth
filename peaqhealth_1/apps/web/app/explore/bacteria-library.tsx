"use client"

import { useState } from "react"
import Link from "next/link"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

interface BacteriaRow {
  slug: string
  full_name: string
  taxonomic_level: string
  consumer_friendly_name: string | null
  short_summary: string | null
  peaq_categories: string[]
  desired_direction: string | null
  evidence_strength: string | null
  userValue?: number | null
}

const CATEGORY_LABELS: Record<string, string> = {
  periodontal_pathogen: "Periodontal pathogen",
  nitrate_reducer: "Nitrate reducer",
  protective: "Protective",
  commensal: "Commensal",
  caries: "Caries",
  inflammatory: "Inflammatory",
  metabolic: "Metabolic",
  context_dependent: "Context dependent",
  osa_associated: "OSA associated",
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  periodontal_pathogen: { bg: "rgba(192,57,43,0.08)", text: "#C0392B", border: "#C0392B" },
  inflammatory: { bg: "rgba(192,57,43,0.08)", text: "#C0392B", border: "#C0392B" },
  caries: { bg: "rgba(184,134,11,0.08)", text: "#9A7200", border: "#9A7200" },
  nitrate_reducer: { bg: "rgba(45,106,79,0.08)", text: "#2D6A4F", border: "#2D6A4F" },
  protective: { bg: "rgba(45,106,79,0.08)", text: "#2D6A4F", border: "#2D6A4F" },
  commensal: { bg: "rgba(45,106,79,0.06)", text: "#3B6D11", border: "#3B6D11" },
  context_dependent: { bg: "rgba(20,20,16,0.05)", text: "#6B6860", border: "#8C897F" },
  metabolic: { bg: "rgba(100,60,160,0.08)", text: "#6A3CA0", border: "#6A3CA0" },
  osa_associated: { bg: "rgba(20,20,16,0.05)", text: "#6B6860", border: "#8C897F" },
}

const FILTER_CHIPS = [
  { key: "all", label: "All" },
  { key: "periodontal_pathogen", label: "Periodontal" },
  { key: "nitrate_reducer", label: "Nitrate reducers" },
  { key: "protective", label: "Protective" },
  { key: "caries", label: "Caries" },
  { key: "inflammatory", label: "Inflammatory" },
  { key: "commensal", label: "Commensal" },
  { key: "context_dependent", label: "Context dependent" },
  { key: "metabolic", label: "Metabolic" },
]

function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.context_dependent
  return (
    <span style={{
      fontFamily: sans, fontSize: 10, letterSpacing: "0.8px",
      textTransform: "uppercase",
      background: colors.bg, color: colors.text,
      borderRadius: 4, padding: "3px 8px",
      whiteSpace: "nowrap",
    }}>
      {CATEGORY_LABELS[category] ?? category}
    </span>
  )
}

function BacteriaCard({ row }: { row: BacteriaRow }) {
  const primaryCat = row.peaq_categories[0] ?? "commensal"
  const colors = CATEGORY_COLORS[primaryCat] ?? CATEGORY_COLORS.commensal

  return (
    <Link href={`/explore/bacteria/${row.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div className="explore-card" style={{
        background: "#fff",
        borderLeft: `3px solid ${colors.border}`,
        borderRadius: 10,
        padding: "24px 24px 20px",
        cursor: "pointer",
        height: "100%",
        transition: "transform 200ms ease, box-shadow 200ms ease",
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {row.peaq_categories.map(cat => (
            <CategoryBadge key={cat} category={cat} />
          ))}
        </div>

        {row.userValue != null && (
          <div style={{
            fontFamily: sans, fontSize: 11, color: colors.text,
            fontWeight: 600, marginBottom: 8,
          }}>
            Your level: {row.userValue.toFixed(1)}%
          </div>
        )}

        <h3 style={{
          fontFamily: serif, fontSize: 22, fontWeight: 500, fontStyle: "italic",
          color: "#141410", margin: "0 0 6px", lineHeight: 1.2,
        }}>
          {row.full_name}
        </h3>

        <p style={{
          fontFamily: sans, fontSize: 13,
          color: "rgba(20,20,16,0.55)", lineHeight: 1.5,
          margin: 0,
        }}>
          {row.consumer_friendly_name ?? row.short_summary ?? ""}
        </p>
      </div>
    </Link>
  )
}

export function BacteriaLibrary({ bacteria }: { bacteria: BacteriaRow[] }) {
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")

  const filtered = bacteria.filter(b => {
    if (filter !== "all" && !b.peaq_categories.includes(filter)) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const nameMatch = b.full_name.toLowerCase().includes(q)
      const friendlyMatch = (b.consumer_friendly_name ?? "").toLowerCase().includes(q)
      if (!nameMatch && !friendlyMatch) return false
    }
    return true
  })

  const activeChips = FILTER_CHIPS.filter(chip =>
    chip.key === "all" || bacteria.some(b => b.peaq_categories.includes(chip.key))
  )

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {activeChips.map(chip => (
          <button
            key={chip.key}
            onClick={() => setFilter(chip.key)}
            style={{
              fontFamily: sans, fontSize: 12, fontWeight: 500,
              background: filter === chip.key ? "#141410" : "rgba(20,20,16,0.04)",
              color: filter === chip.key ? "#fff" : "rgba(20,20,16,0.55)",
              border: "none", borderRadius: 20,
              padding: "7px 16px", cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Search bacteria..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          fontFamily: sans, fontSize: 14,
          width: "100%", maxWidth: 360,
          padding: "10px 16px",
          border: "1px solid rgba(20,20,16,0.1)",
          borderRadius: 8, background: "#fff",
          color: "#141410", marginBottom: 28,
          outline: "none",
        }}
      />

      {filtered.length === 0 ? (
        <p style={{
          fontFamily: sans, fontSize: 14,
          color: "rgba(20,20,16,0.4)",
          textAlign: "center", padding: "40px 0",
        }}>
          No bacteria match. Try a different filter.
        </p>
      ) : (
        <div className="card-grid" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 16, marginBottom: 48,
        }}>
          {filtered.map(b => <BacteriaCard key={b.slug} row={b} />)}
        </div>
      )}
    </div>
  )
}

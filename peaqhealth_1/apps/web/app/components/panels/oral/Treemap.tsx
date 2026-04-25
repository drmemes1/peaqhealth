"use client"

import { useMemo } from "react"
import { treemap, hierarchy, treemapSquarify } from "d3-hierarchy"
import { lookupTaxon, CATEGORY_LABELS, CATEGORY_COLORS, type BacteriaCategory } from "../../../../lib/oral/bacteriaTaxonomy"
import { computeVeillonellaContext } from "../../../../lib/oral/veillonellaContext"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const LONG_TAIL_THRESHOLD = 0.005

interface TreemapProps {
  genusCounts: Record<string, number>
  speciesCount: number
  generaCount: number
  shannonDiversity: number
  sMutans: number
  breathFreshness: number | null
}

interface TileData {
  genus: string
  displayName: string
  category: BacteriaCategory
  colorVar: string
  pct: number
  flagLabel?: string | null
  flagStyle?: "warm" | "cool"
  isExplore?: boolean
  speciesInTail?: number
}

export function OralTreemap({ genusCounts, speciesCount, generaCount, shannonDiversity, sMutans, breathFreshness }: TreemapProps) {
  const tiles = useMemo(() => {
    const sorted = Object.entries(genusCounts)
      .filter(([k]) => k !== "__meta")
      .map(([genus, pct]) => ({ genus, pct: Number(pct) }))
      .filter(e => Number.isFinite(e.pct) && e.pct > 0)
      .sort((a, b) => b.pct - a.pct)

    const mainTiles: TileData[] = []
    let tailPct = 0
    let tailCount = 0

    for (const { genus, pct } of sorted) {
      if (pct < LONG_TAIL_THRESHOLD && mainTiles.length >= 12) {
        tailPct += pct
        tailCount++
        continue
      }

      const taxon = lookupTaxon(genus)
      const cat = taxon?.category ?? "minor"
      let colorVar = taxon?.colorVar ?? "--tm-minor"
      let flagLabel: string | null = null
      let flagStyle: "warm" | "cool" | undefined = undefined

      // Veillonella context
      if (genus.toLowerCase() === "veillonella") {
        const vCtx = computeVeillonellaContext({ veillonella: pct, sMutans, breathFreshness, shannonDiversity })
        if (vCtx.state === "shifted") colorVar = "--tm-slate-shift"
        if (vCtx.flagLabel) { flagLabel = vCtx.flagLabel; flagStyle = "warm" }
      }

      // Haemophilus flag
      if (genus.toLowerCase().startsWith("haemophilus") && pct < 0.03) {
        flagLabel = "Low"
        flagStyle = "warm"
      }

      // Orange/red complex flag
      if (cat === "orange_complex" && pct > 0.01) {
        flagLabel = flagLabel ?? "flagged"
      }

      mainTiles.push({
        genus,
        displayName: taxon?.displayName ?? genus,
        category: cat,
        colorVar,
        pct,
        flagLabel,
        flagStyle,
      })
    }

    if (tailCount > 0) {
      mainTiles.push({
        genus: "_explore",
        displayName: `+ ${tailCount} species`,
        category: "minor",
        colorVar: "--tm-minor",
        pct: tailPct,
        isExplore: true,
        speciesInTail: tailCount,
      })
    }

    return mainTiles
  }, [genusCounts, sMutans, breathFreshness, shannonDiversity])

  const layout = useMemo(() => {
    if (tiles.length === 0) return []
    const root = hierarchy({ children: tiles.map(t => ({ ...t, value: t.pct })) })
      .sum(d => (d as unknown as { value?: number }).value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    const tm = treemap<typeof root.data>()
      .size([900, 600])
      .padding(3)
      .tile(treemapSquarify.ratio(1.2))

    tm(root)
    return root.leaves().map(leaf => {
      const l = leaf as unknown as { x0: number; y0: number; x1: number; y1: number; data: TileData }
      return { ...l.data, x0: l.x0, y0: l.y0, x1: l.x1, y1: l.y1, w: l.x1 - l.x0, h: l.y1 - l.y0 }
    })
  }, [tiles])

  if (tiles.length === 0) {
    return (
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 20, padding: "60px 40px", textAlign: "center" }}>
        <p style={{ fontFamily: serif, fontSize: 24, color: "var(--ink)", marginBottom: 8 }}>Take your sample to see your community</p>
        <p style={{ fontFamily: sans, fontSize: 13, color: "var(--muted)" }}>Your oral microbiome treemap will appear here once your sample is processed.</p>
      </div>
    )
  }

  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20, paddingBottom: 16, borderBottom: "1px dashed var(--line-soft)" }}>
        <div>
          <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>The ecosystem</div>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, letterSpacing: "-0.008em", marginTop: 4 }}>
            Your mouth&rsquo;s <em style={{ fontStyle: "italic", color: "var(--muted-soft)" }}>community</em>
          </div>
        </div>
        <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 14, color: "var(--muted-soft)", textAlign: "right" }}>
          <strong style={{ fontStyle: "normal", fontWeight: 600, color: "var(--ink)", fontSize: 16 }}>{speciesCount}</strong> species mapped<br />
          across <strong style={{ fontStyle: "normal", fontWeight: 600, color: "var(--ink)", fontSize: 16 }}>{generaCount}</strong> genera
        </div>
      </div>

      {/* Treemap SVG */}
      <svg viewBox="0 0 900 600" style={{ width: "100%", height: "auto", borderRadius: 12, overflow: "hidden" }}>
        {layout.map((tile, i) => {
          const isSmall = tile.w < 80 || tile.h < 60
          const isMicro = tile.w < 60 || tile.h < 45
          const textColor = tile.category === "commensal" || tile.category === "minor" ? "#3A3830" : "#FAFAF8"

          return (
            <g key={i} style={{ cursor: "pointer" }}>
              <defs>
                <linearGradient id={`tg-${i}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={CATEGORY_COLORS[tile.category] ?? "#E0DAC6"} />
                  <stop offset="100%" stopColor={CATEGORY_COLORS[tile.category] ?? "#DDD5C0"} stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <rect
                x={tile.x0} y={tile.y0} width={tile.w} height={tile.h}
                rx={4} fill={`url(#tg-${i})`}
                stroke={tile.genus.toLowerCase().startsWith("haemophilus") && (tile.flagLabel === "Low") ? "rgba(184,146,60,0.6)" : "none"}
                strokeWidth={tile.genus.toLowerCase().startsWith("haemophilus") && (tile.flagLabel === "Low") ? 1.5 : 0}
                strokeDasharray={tile.genus.toLowerCase().startsWith("haemophilus") ? "4,3" : "none"}
              />
              {/* Category tag */}
              {!isMicro && (
                <text x={tile.x0 + 14} y={tile.y0 + 22} fill={textColor} opacity={0.8}
                  style={{ fontFamily: sans, fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>
                  {CATEGORY_LABELS[tile.category] ?? ""}
                </text>
              )}
              {/* Name */}
              <text x={tile.x0 + 14} y={tile.y0 + (isMicro ? 28 : isSmall ? 38 : 46)} fill={textColor}
                style={{ fontFamily: serif, fontSize: isMicro ? 11 : isSmall ? 14 : 17, fontStyle: "italic", fontWeight: 500 }}>
                {tile.displayName}
              </text>
              {/* Percentage */}
              <text x={tile.x1 - 14} y={tile.y1 - 12} fill={textColor} textAnchor="end"
                style={{ fontFamily: serif, fontSize: isMicro ? 14 : isSmall ? 18 : 24, fontWeight: 500, letterSpacing: "-0.02em" }}>
                {(tile.pct * 100).toFixed(tile.pct < 0.01 ? 2 : 1)}%
              </text>
              {/* Flag */}
              {tile.flagLabel && !isMicro && (
                <text x={tile.x1 - 14} y={tile.y0 + 22} fill={tile.flagStyle === "warm" ? "#FFD89B" : textColor} textAnchor="end" opacity={0.9}
                  style={{ fontFamily: sans, fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700 }}>
                  {tile.flagLabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 18, marginTop: 20, paddingTop: 18, borderTop: "1px dashed var(--line-soft)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted-soft)", fontWeight: 500, flexWrap: "wrap", fontFamily: sans }}>
        {(["heart_protective", "remineralizer", "commensal", "context_dependent", "cariogenic", "orange_complex", "red_complex"] as BacteriaCategory[]).map(cat => (
          <span key={cat} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 13, height: 13, borderRadius: 3, background: CATEGORY_COLORS[cat] }} />
            {CATEGORY_LABELS[cat]}
          </span>
        ))}
      </div>
    </div>
  )
}

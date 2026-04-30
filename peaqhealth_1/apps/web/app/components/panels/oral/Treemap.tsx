"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { treemap, hierarchy, treemapSquarify } from "d3-hierarchy"
import { lookupTaxon, CATEGORY_LABELS, CATEGORY_COLORS, type BacteriaCategory } from "../../../../lib/oral/bacteriaTaxonomy"
import { computeVeillonellaContext } from "../../../../lib/oral/veillonellaContext"

const serif = "var(--font-manrope), system-ui, sans-serif"
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
  const searchParams = useSearchParams()
  const simulateHalitosis = searchParams.get("simulate") === "halitosis_active"

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

      // Veillonella context (with dev simulation flag)
      if (genus.toLowerCase() === "veillonella") {
        const vCtx = simulateHalitosis
          ? { state: "flagged" as const, flagLabel: "Halitosis", firedPatterns: ["halitosis_contribution" as const], abundance: pct, flagTooltip: "Simulated for testing", relatedCard: "breath-freshness" }
          : computeVeillonellaContext({ veillonella: pct, sMutans, breathFreshness, shannonDiversity })
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
          const area = tile.w * tile.h
          const textColor = tile.category === "commensal" || tile.category === "minor" ? "#3A3830" : "#FAFAF8"
          const hasFlag = !!tile.flagLabel

          // Responsive font sizing based on tile area
          const nameFontSize = area > 50000 ? 18 : area > 20000 ? 14 : area > 8000 ? 12 : 10
          const pctFontSize = area > 50000 ? 26 : area > 20000 ? 18 : area > 8000 ? 14 : 11
          const tagFontSize = area > 20000 ? 8 : 7
          const showTag = tile.h > 55 && tile.w > 70
          const showFlag = hasFlag && tile.w > 65 && tile.h > 45
          const showName = tile.w > 40 && tile.h > 30

          // Truncate long names for small tiles
          const maxNameChars = area > 20000 ? 20 : area > 8000 ? 12 : 8
          const displayName = tile.displayName.length > maxNameChars ? tile.displayName.slice(0, maxNameChars - 1) + "…" : tile.displayName

          // Vertical positions
          const pad = area > 20000 ? 14 : 10
          const tagY = tile.y0 + pad + tagFontSize
          const nameY = showTag ? tagY + nameFontSize + 4 : tile.y0 + pad + nameFontSize
          const pctY = tile.y1 - pad
          const flagY = tile.y0 + pad + tagFontSize

          // Eyebrow max width — leave room for flag if present
          const tagMaxWidth = showFlag ? tile.w - 80 : tile.w - 28

          const href = tile.isExplore ? "/explore" : `/dashboard/oral`

          return (
            <a key={i} href={href} style={{ cursor: "pointer" }}>
              <g>
                <defs>
                  <linearGradient id={`tg-${i}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={CATEGORY_COLORS[tile.category] ?? "#E0DAC6"} />
                    <stop offset="100%" stopColor={CATEGORY_COLORS[tile.category] ?? "#DDD5C0"} stopOpacity={0.8} />
                  </linearGradient>
                  <clipPath id={`clip-tag-${i}`}><rect x={tile.x0 + pad} y={tile.y0} width={tagMaxWidth} height={30} /></clipPath>
                </defs>
                <rect
                  x={tile.x0} y={tile.y0} width={tile.w} height={tile.h}
                  rx={4} fill={`url(#tg-${i})`}
                  stroke={tile.genus.toLowerCase().startsWith("haemophilus") && hasFlag ? "rgba(184,146,60,0.6)" : "none"}
                  strokeWidth={tile.genus.toLowerCase().startsWith("haemophilus") && hasFlag ? 1.5 : 0}
                  strokeDasharray={tile.genus.toLowerCase().startsWith("haemophilus") ? "4,3" : "none"}
                />
                {/* Category eyebrow — clipped to avoid flag collision */}
                {showTag && (
                  <text x={tile.x0 + pad} y={tagY} fill={textColor} opacity={0.8} clipPath={`url(#clip-tag-${i})`}
                    style={{ fontFamily: sans, fontSize: tagFontSize, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600 }}>
                    {CATEGORY_LABELS[tile.category] ?? ""}
                  </text>
                )}
                {/* Flag pill — absolute top-right, never collides with eyebrow */}
                {showFlag && (
                  <text x={tile.x1 - pad} y={flagY} fill={tile.flagStyle === "warm" ? "#FFD89B" : textColor} textAnchor="end" opacity={0.9}
                    style={{ fontFamily: sans, fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
                    {tile.flagLabel}
                  </text>
                )}
                {/* Name — responsive font size */}
                {showName && (
                  <text x={tile.x0 + pad} y={nameY} fill={textColor}
                    style={{ fontFamily: serif, fontSize: nameFontSize, fontStyle: "italic", fontWeight: 500 }}>
                    <title>{tile.displayName}</title>
                    {displayName}
                  </text>
                )}
                {/* Percentage — bottom right */}
                <text x={tile.x1 - pad} y={pctY} fill={textColor} textAnchor="end"
                  style={{ fontFamily: serif, fontSize: pctFontSize, fontWeight: 500, letterSpacing: "-0.02em" }}>
                  {(tile.pct * 100).toFixed(tile.pct < 0.01 ? 2 : 1)}%
                </text>
              </g>
            </a>
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

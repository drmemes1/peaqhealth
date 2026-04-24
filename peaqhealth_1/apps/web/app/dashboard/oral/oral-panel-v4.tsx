"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import type { UserPanelContext } from "../../../lib/user-context"
import { getSubInsights, type SubInsight } from "../../../lib/oral/subInsights"
import { computeHalitosisScore } from "../../../lib/oral/halitosisScore"
import { SignalCard } from "../../components/oral/SignalCard"
import { EcoCard } from "../../components/oral/EcoCard"
import { HeroLine } from "../../components/oral/HeroLine"
import { ExploreHint } from "../../components/oral/ExploreHint"
import { OralSortControls, type OralSort, type OralFilter } from "../../components/oral/OralSortControls"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

type Status = "strong" | "watch" | "attention"

interface OralSignal {
  id: string
  category: string
  eyebrow: string
  title: string
  value: string | number
  valueUnit?: string
  status: Status
  variant?: "default" | "sleep-tint" | "synthesis"
  primaryRead: string
  secondaryRead?: string
  subInsight?: SubInsight | null
  chips?: { label: string; flagged?: boolean; href?: string }[]
  confidenceDots?: { label: string; filled: boolean }[]
  sources?: string
}

function f(v: number | null | undefined, d = 1): string {
  return v == null ? "—" : v.toFixed(d)
}

function buildSignals(ctx: UserPanelContext, subInsights: SubInsight[]): OralSignal[] {
  const o = ctx.oralKit
  if (!o) return []

  const haemophilusSub = subInsights.find(s => s.parentCompositeId === "nitrate_reducer_pathway") ?? null

  const signals: OralSignal[] = []

  // 1. Heart-protective bacteria (NO pathway)
  const noTotal = o.nitricOxideTotal
  const noStatus: Status = noTotal >= 20 ? "strong" : noTotal >= 10 ? "watch" : "attention"
  signals.push({
    id: "heart_protective",
    category: "cardiovascular",
    eyebrow: "CARDIOVASCULAR SUPPORT",
    title: "Heart-protective bacteria",
    value: f(noTotal),
    valueUnit: "%",
    status: noStatus,
    primaryRead: noTotal >= 20
      ? `Your nitrate-reducing community is strong at ${f(noTotal)}%. These bacteria convert dietary nitrate into nitric oxide — the molecule that helps blood vessels relax and supports blood pressure regulation.`
      : `Your nitrate-reducing community sits at ${f(noTotal)}%, below the 20% target. These bacteria support cardiovascular function through nitric oxide production.`,
    secondaryRead: `Neisseria ${f(o.neisseriaPct)}% · Rothia ${f(o.rothiaPct)}% · Haemophilus ${f(o.haemophilusPct)}%`,
    subInsight: haemophilusSub,
    chips: [
      { label: "Neisseria", href: "/explore/bacteria/neisseria" },
      { label: "Rothia", href: "/explore/bacteria/rothia" },
      { label: "Haemophilus", flagged: haemophilusSub != null, href: "/explore/bacteria/haemophilus" },
      { label: "Actinomyces" },
      { label: "Veillonella" },
    ],
    sources: ctx.hasBloodPanel ? "Cross-references: LDL, blood pressure" : undefined,
  })

  // 2. Gum health signals
  const gum = o.gumHealthTotal
  const gumStatus: Status = gum < 2 ? "strong" : gum < 5 ? "watch" : "attention"
  const redComplex = (o.porphyromonasPct ?? 0) + (o.tannerellaPct ?? 0) + (o.treponemaPct ?? 0)
  const orangeOnly = gum > 2 && redComplex < 1
  signals.push({
    id: "gum_health",
    category: "gum",
    eyebrow: "GUM TISSUE",
    title: "Gum health signals",
    value: f(gum),
    valueUnit: "%",
    status: gumStatus,
    primaryRead: gumStatus === "strong"
      ? `Gum-associated bacteria are low at ${f(gum)}%. Both orange-complex (early-stage) and red-complex (active) species are within healthy ranges.`
      : orangeOnly
      ? `Orange-complex bacteria (Fusobacterium ${f(o.fusobacteriumPct)}%, Aggregatibacter ${f(o.aggregatibacterPct)}%) are elevated, but your red-complex species — the ones linked to active gum changes — are all within normal range. This is early-stage and manageable with hygiene.`
      : `Gum bacteria total ${f(gum)}% with some species above target. Professional evaluation recommended.`,
    chips: [
      { label: "Fusobacterium", flagged: (o.fusobacteriumPct ?? 0) > 0.5 },
      { label: "Aggregatibacter", flagged: (o.aggregatibacterPct ?? 0) > 0.5 },
      { label: "Porphyromonas", flagged: (o.porphyromonasPct ?? 0) > 0.5 },
      { label: "Tannerella" },
      { label: "Treponema" },
    ],
    sources: ctx.hasBloodPanel && ctx.bloodPanel?.hsCrp != null ? "Cross-references: hs-CRP inflammation" : undefined,
  })

  // 3. Cavity balance
  const cavRisk = o.cavityBacteriaTotal
  const cavProt = o.cavityProtectorsTotal
  const phApi = o.phBalanceApi
  const cavStatus: Status = cavRisk < 0.5 && phApi != null && phApi <= 0.25 ? "strong" : cavRisk < 1.5 ? "watch" : "attention"
  const protectorSub = subInsights.find(s => s.parentCompositeId === "cavity_balance") ?? null
  signals.push({
    id: "cavity_balance",
    category: "cavity",
    eyebrow: "TOOTH PROTECTION",
    title: "Cavity balance",
    value: phApi != null ? phApi.toFixed(2) : f(cavRisk),
    valueUnit: phApi != null ? "pH ratio" : "%",
    status: cavStatus,
    primaryRead: phApi != null && phApi <= 0.25
      ? `Your mouth runs well-buffered (pH ratio ${phApi.toFixed(2)}) with ${f(cavProt)}× more protective bacteria than cavity-makers. The environment is defending your enamel.`
      : `Cavity bacteria at ${f(cavRisk, 2)}% with protective ratio at ${f(cavProt)}×. Your pH balance and protective species determine whether these bacteria can do damage.`,
    subInsight: protectorSub,
    chips: [
      { label: "S. mutans", flagged: (o.sMutansPct ?? 0) > 0.5 },
      { label: "S. sobrinus" },
      { label: "S. sanguinis" },
      { label: "S. gordonii" },
    ],
  })

  // 4. Microbial balance (diversity)
  const shannon = o.shannonIndex ?? 0
  const divStatus: Status = shannon >= 4.0 ? "strong" : shannon >= 3.0 ? "watch" : "attention"
  signals.push({
    id: "microbial_balance",
    category: "diversity",
    eyebrow: "ECOSYSTEM RESILIENCE",
    title: "Microbial balance",
    value: f(shannon, 2),
    valueUnit: "Shannon",
    status: divStatus,
    primaryRead: shannon >= 4.0
      ? `Your Shannon diversity index of ${f(shannon, 2)} reflects a varied, resilient community. No single bacterial group dominates — that diversity keeps your mouth stable when challenged.`
      : `Your Shannon diversity of ${f(shannon, 2)} is below the 4.0 target. Lower diversity can mean your mouth is less resilient to disruption from illness, antibiotics, or dietary changes.`,
    secondaryRead: o.namedSpecies != null ? `${o.namedSpecies} named species across ${o.genera ?? "—"} genera` : undefined,
  })

  // 5. Nighttime breathing
  const envPattern = o.envPattern
  const aerobic = o.envAerobicScorePct
  const breathingStatus: Status = envPattern === "mouth_breathing" || envPattern === "mixed" ? "watch" : envPattern === "osa_paradox" ? "attention" : "strong"
  const qMb = ctx.questionnaire?.mouthBreathing === "confirmed" || ctx.questionnaire?.mouthBreathing === "often"
  const hasTwoSources = qMb && (envPattern === "mouth_breathing" || envPattern === "mixed")

  signals.push({
    id: "nighttime_breathing",
    category: "breathing",
    eyebrow: "NIGHTTIME BREATHING",
    title: "Breathing pattern",
    value: envPattern === "mouth_breathing" || envPattern === "mixed" ? "Mouth" : envPattern === "osa_paradox" ? "Watch" : "Nasal",
    status: breathingStatus,
    variant: "sleep-tint",
    primaryRead: hasTwoSources
      ? `Your questionnaire and oral bacteria agree — mouth breathing during ${ctx.questionnaire?.mouthBreathingWhen === "daytime_and_sleep" ? "day and night" : "sleep"}. Aerobic shift at ${f(aerobic)}% confirms drier overnight conditions.`
      : envPattern === "balanced"
      ? "Your oral bacteria show a balanced aerobic/anaerobic community — no breathing disruption signal detected."
      : `Your oral environment shows a ${envPattern?.replace(/_/g, " ")} pattern. Aerobic shift at ${f(aerobic)}%.`,
    confidenceDots: [
      { label: "Questionnaire", filled: ctx.hasQuestionnaire },
      { label: "Oral bacteria", filled: ctx.hasOralKit },
      { label: "Wearable", filled: ctx.hasWearable },
    ],
    sources: hasTwoSources ? "2 sources corroborating" : `${[ctx.hasQuestionnaire && "questionnaire", ctx.hasOralKit && "oral"].filter(Boolean).join(" + ")}`,
  })

  return signals
}

const STATUS_ORDER: Record<string, number> = { attention: 0, watch: 1, "strong-with-note": 2, strong: 3 }

export function OralPanelV4({ ctx }: { ctx: UserPanelContext }) {
  const o = ctx.oralKit

  const [sort, setSort] = useState<OralSort>(() => {
    if (typeof window === "undefined") return "status"
    return (localStorage.getItem("oral-sort") as OralSort) ?? "status"
  })
  const [filter, setFilter] = useState<OralFilter>(() => {
    if (typeof window === "undefined") return "all"
    return (localStorage.getItem("oral-filter") as OralFilter) ?? "all"
  })

  useEffect(() => { localStorage.setItem("oral-sort", sort) }, [sort])
  useEffect(() => { localStorage.setItem("oral-filter", filter) }, [filter])

  const subInsights = useMemo(() => o ? getSubInsights(o) : [], [o])

  const signals = useMemo(() => o ? buildSignals(ctx, subInsights) : [], [ctx, o, subInsights])

  const halitosis = useMemo(() => {
    if (!o) return null
    return computeHalitosisScore({
      solobacteriumPct: null,
      prevotellaCommensalPct: null,
      peptostreptococcusPct: null,
      fusobacteriumPct: o.fusobacteriumPct,
      porphyromonasPct: o.porphyromonasPct,
    })
  }, [o])

  const effectiveStatuses = useMemo(() => signals.map(s => {
    if (s.status === "strong" && s.subInsight) return "strong-with-note" as const
    return s.status
  }), [signals])

  const strongCount = effectiveStatuses.filter(s => s === "strong").length
  const watchCount = effectiveStatuses.filter(s => s === "watch" || s === "strong-with-note").length
  const attentionCount = effectiveStatuses.filter(s => s === "attention").length
  const watchCategories = signals
    .filter((s, i) => effectiveStatuses[i] === "watch" || effectiveStatuses[i] === "strong-with-note")
    .map(s => s.category === "cardiovascular" ? "cardiovascular" : s.category === "gum" ? "gum" : s.category === "breathing" ? "breathing" : s.category)
    .filter((v, i, a) => a.indexOf(v) === i)

  const filtered = useMemo(() => {
    return signals.filter((s, i) => {
      const eff = effectiveStatuses[i]
      if (filter === "all") return true
      if (filter === "attention") return eff === "attention"
      if (filter === "watch") return eff === "watch" || eff === "strong-with-note"
      if (filter === "strong") return eff === "strong"
      return true
    })
  }, [signals, effectiveStatuses, filter])

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sort === "status") {
      list.sort((a, b) => {
        const ai = signals.indexOf(a)
        const bi = signals.indexOf(b)
        const as = a.subInsight ? "strong-with-note" : a.status
        const bs = b.subInsight ? "strong-with-note" : b.status
        return (STATUS_ORDER[as] ?? 3) - (STATUS_ORDER[bs] ?? 3)
      })
    } else if (sort === "az") {
      list.sort((a, b) => a.title.localeCompare(b.title))
    }
    return list
  }, [filtered, sort, signals])

  if (!o) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px", background: "#F5F3EE" }}>
        <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 300, color: "#2C2A24", margin: "0 0 16px" }}>Oral Microbiome</h1>
        <p style={{ fontFamily: sans, fontSize: 14, color: "#8C897F" }}>No oral results on file.</p>
        <Link href="/dashboard" style={{ fontFamily: sans, fontSize: 13, color: "#B8860B" }}>← Back to dashboard</Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px", background: "#F5F3EE" }}>
      {/* Page header */}
      <div style={{ marginBottom: 8 }}>
        <Link href="/dashboard" style={{ fontFamily: sans, fontSize: 12, color: "#B8860B", textDecoration: "none" }}>← Dashboard</Link>
      </div>
      <h1 style={{ fontFamily: serif, fontSize: 40, fontWeight: 500, color: "#2C2A24", margin: "0 0 24px", lineHeight: 1.1 }}>
        Oral <em style={{ fontStyle: "italic", color: "#5A5750" }}>Microbiome</em>
      </h1>

      {/* Hero line */}
      <HeroLine strong={strongCount} watch={watchCount} attention={attentionCount} watchCategories={watchCategories} />

      {/* Ecosystem row */}
      <div className="oral-eco-row" style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
        <EcoCard name="Shannon diversity" value={f(o.shannonIndex, 2)} status={(o.shannonIndex ?? 0) >= 4.0 ? "strong" : "watch"} label={(o.shannonIndex ?? 0) >= 4.0 ? "Resilient" : "Watch"} />
        <EcoCard name="pH balance" value={o.phBalanceApi?.toFixed(2) ?? "—"} status={o.phBalanceCategory === "well_buffered" ? "strong" : "watch"} label={o.phBalanceCategory === "well_buffered" ? "Buffered" : "Watch"} />
        <EcoCard name="Protective ratio" value={o.protectiveRatio?.toFixed(1) ?? "—"} unit="×" status={(o.protectiveRatio ?? 0) >= 5 ? "strong" : "watch"} label={(o.protectiveRatio ?? 0) >= 5 ? "Strong defense" : "Moderate"} />
        {halitosis && (
          <EcoCard name="Breath freshness" value={Math.round(halitosis.breathScore)} unit="/100" status={halitosis.status} label={halitosis.label} />
        )}
      </div>

      {/* Sort/filter controls */}
      <OralSortControls sort={sort} filter={filter} onSort={setSort} onFilter={setFilter} />

      {/* Signal cards */}
      {sorted.map(signal => (
        <SignalCard
          key={signal.id}
          status={signal.status}
          variant={signal.variant}
          eyebrow={signal.eyebrow}
          title={signal.title}
          value={signal.value}
          valueUnit={signal.valueUnit}
          primaryRead={signal.primaryRead}
          secondaryRead={signal.secondaryRead}
          subInsight={signal.subInsight}
          chips={signal.chips}
          confidenceDots={signal.confidenceDots}
          sources={signal.sources}
        />
      ))}

      {sorted.length === 0 && (
        <p style={{ fontFamily: sans, fontSize: 13, color: "#8C897F", textAlign: "center", padding: 40 }}>
          No signals match this filter.
        </p>
      )}

      {/* Converge link */}
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Link href="/dashboard/converge" style={{ fontFamily: sans, fontSize: 13, color: "#B8860B", textDecoration: "none", fontWeight: 500 }}>
          See how this connects to your other panels →
        </Link>
      </div>

      {/* Explore hint */}
      <ExploreHint />

      <style>{`
        @media (max-width: 640px) {
          .oral-eco-row { flex-direction: column !important; }
          .oral-sort-bar { flex-direction: column !important; align-items: flex-start !important; }
        }
      `}</style>
    </div>
  )
}

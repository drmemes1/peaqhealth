// ============================================================================
// ORAL PANEL — STAGGERED 2-COLUMN, ROW-PAIRED EXPANSION
// ============================================================================
"use client"

import { useState, useMemo } from "react"
import { SectionHeader, PanelInsight, CategoryCard } from "../../components/panels"
import { DiversityIcon, NitricOxideIcon, GumHealthIcon, CavityRiskIcon, CavityProtectorIcon, BreathingIcon } from "../../components/panels/icons"
import { computeClientEnvironmentIndex } from "../../../lib/oral/environment-index"

type OralKitRow = {
  shannon_diversity: number | null
  neisseria_pct: number | null; haemophilus_pct: number | null; rothia_pct: number | null
  actinomyces_pct: number | null; veillonella_pct: number | null
  porphyromonas_pct: number | null; tannerella_pct: number | null; treponema_pct: number | null
  fusobacterium_pct: number | null; aggregatibacter_pct: number | null; campylobacter_pct: number | null
  prevotella_intermedia_pct: number | null; prevotella_commensal_pct: number | null
  s_mutans_pct: number | null; s_sobrinus_pct: number | null; s_sanguinis_pct: number | null
  s_gordonii_pct: number | null; s_salivarius_pct: number | null; scardovia_pct: number | null
  lactobacillus_pct: number | null; streptococcus_total_pct: number | null
  peptostreptococcus_pct: number | null; parvimonas_pct: number | null; granulicatella_pct: number | null
  env_acid_ratio: number | null; env_aerobic_score_pct: number | null
  env_anaerobic_load_pct: number | null; env_aerobic_anaerobic_ratio: number | null
  env_pattern: string | null; env_peroxide_flag: boolean | null
  raw_otu_table: { [key: string]: unknown; __meta?: { community_summary?: { total_entries_present: number; named_species_count: number; unnamed_placeholder_count: number; distinct_genera: number; distinct_phyla: number } } } | null
}

type Status = "good" | "watch" | "concern" | "info" | "mixed" | "pending"
type QuestionnaireData = { mouth_breathing?: string | null; mouth_breathing_when?: string | null; snoring_reported?: string | null; nasal_obstruction?: string | null } | null
type WearableData = { nights_available: number; avg_spo2: number | null; avg_respiratory_rate: number | null; avg_rhr: number | null } | null

const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
const serif = "'Cormorant Garamond', Georgia, serif"
const STATUS_COLORS = { good: "#1A8C4E", watch: "#B8860B", concern: "#A84D4D", info: "rgba(184,134,11,0.6)", mixed: "#B8860B", pending: "#C8C6BE" } as const

function spStatus(v: number | null, goodBelow: number): "good" | "watch" | "concern" { return v == null ? "good" : v < goodBelow ? "good" : v < goodBelow * 3 ? "watch" : "concern" }
function spStatusAbove(v: number | null, goodAbove: number): "good" | "watch" | "concern" { return v == null ? "good" : v >= goodAbove ? "good" : v >= goodAbove * 0.5 ? "watch" : "concern" }
function f(v: number | null, d = 1): string { return v == null ? "—" : v.toFixed(d) }

function EnvStatCell({ label, value, unit, statusLabel, statusColor, breakdown, position }: { label: string; value: string; unit?: string; statusLabel: string; statusColor: string; breakdown: { name: string; val: string }[]; position: "tl" | "tr" | "bl" | "br" }) {
  const borderLeft = position === "tr" || position === "br" ? "1px solid #E8E4D8" : undefined
  const borderTop = position === "bl" || position === "br" ? "1px solid #E8E4D8" : undefined
  return (
    <div style={{ padding: "16px 18px", borderLeft, borderTop }}>
      <div style={{ fontFamily: sans, fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.16em", color: "#8C897F", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: serif, fontSize: 38, fontWeight: 500, color: "#2C2A24", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 4 }}>
        {value}{unit && <span style={{ fontSize: 18, color: "#8C897F", fontWeight: 400, marginLeft: 1 }}>{unit}</span>}
      </div>
      <div style={{ fontFamily: sans, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: statusColor, fontWeight: 500, marginBottom: 8 }}>{statusLabel}</div>
      {breakdown.map((item, i) => (
        <div key={i} style={{ fontFamily: sans, fontSize: 10.5, color: "#7A7870", lineHeight: 1.5 }}>
          <span style={{ fontFamily: serif, fontWeight: 500, fontStyle: "normal", color: "#3D3B35" }}>{item.name}</span>{" "}
          <span style={{ color: "#2C2A24", fontWeight: 500 }}>{item.val}</span>
        </div>
      ))}
    </div>
  )
}

export default function OralPanelClient({ kit, narrative, questionnaire, wearable }: {
  kit: OralKitRow
  narrative?: { section_opening?: string; section_cardiometabolic?: string; section_gum_caries?: string; section_breathing?: string; section_disclaimer?: string } | null
  questionnaire?: QuestionnaireData
  wearable?: WearableData
}) {
  const summary = kit.raw_otu_table?.__meta?.community_summary
  const hasAnyData = useMemo(() => kit.shannon_diversity != null || kit.neisseria_pct != null, [kit])
  const hasSpecies = kit.neisseria_pct != null

  const hasWearable = wearable != null && wearable.nights_available > 0
  const hasQ = questionnaire != null && (questionnaire.mouth_breathing != null || questionnaire.snoring_reported != null)
  const mbSignals = questionnaire?.mouth_breathing === "confirmed" || questionnaire?.mouth_breathing === "often" ||
    questionnaire?.mouth_breathing_when === "sleep_only" || questionnaire?.mouth_breathing_when === "daytime_and_sleep"

  const noTotal = hasSpecies ? (kit.neisseria_pct ?? 0) + (kit.rothia_pct ?? 0) + (kit.haemophilus_pct ?? 0) + (kit.actinomyces_pct ?? 0) + (kit.veillonella_pct ?? 0) : null
  const gumTotal = hasSpecies ? (kit.fusobacterium_pct ?? 0) + (kit.aggregatibacter_pct ?? 0) + (kit.campylobacter_pct ?? 0) + (kit.porphyromonas_pct ?? 0) + (kit.tannerella_pct ?? 0) + (kit.treponema_pct ?? 0) + (kit.prevotella_intermedia_pct ?? 0) : null
  const cavityRisk = hasSpecies ? (kit.s_mutans_pct ?? 0) + (kit.s_sobrinus_pct ?? 0) + (kit.lactobacillus_pct ?? 0) : null
  const cavityProtect = hasSpecies ? (kit.s_sanguinis_pct ?? 0) + (kit.s_gordonii_pct ?? 0) : null

  const noStatus: Status = noTotal == null ? "pending" : noTotal >= 20 ? "good" : noTotal >= 10 ? "watch" : "concern"
  const gumStatus: Status = gumTotal == null ? "pending" : gumTotal < 2 ? "good" : gumTotal < 5 ? "watch" : "concern"
  const cavRiskStatus: Status = cavityRisk == null ? "pending" : cavityRisk < 1 ? "good" : cavityRisk < 2 ? "watch" : "concern"
  const cavProtStatus: Status = cavityProtect == null ? "pending" : cavityProtect >= 2 ? "good" : cavityProtect >= 1 ? "watch" : "concern"

  const env = useMemo(() => hasSpecies ? computeClientEnvironmentIndex(kit) : null, [kit, hasSpecies])

  let breathingValue: string
  let breathingStatus: Status
  if (env) {
    const p = env.pattern
    breathingValue = p === "balanced" ? "Settled" : p === "mouth_breathing" ? "Mouth breathing pattern" : p === "osa_paradox" ? "OSA-consistent pattern" : "Mixed signals"
    breathingStatus = p === "balanced" ? "good" : p === "mouth_breathing" || p === "mixed" ? "mixed" : "watch"
  } else if (hasQ && mbSignals && hasWearable) {
    breathingValue = "Mouth breathing pattern detected"; breathingStatus = "mixed"
  } else if (hasQ && mbSignals) {
    breathingValue = "Mouth breathing signals"; breathingStatus = "mixed"
  } else if (hasWearable) {
    breathingValue = "Wearable data gathered"; breathingStatus = "info"
  } else {
    breathingValue = "Not yet measured"; breathingStatus = "pending"
  }

  const breathingContextParts: string[] = []
  if (hasQ) breathingContextParts.push("Q")
  if (hasWearable) breathingContextParts.push("wearable")
  if (hasSpecies) breathingContextParts.push("oral")
  const breathingContext = breathingContextParts.length > 0
    ? `${breathingContextParts.join(" + ")} · ${breathingContextParts.length === 3 ? "all 3 signals" : `${breathingContextParts.length} of 3 signals`}`
    : "Waiting on data"

  // Row-paired expansion state
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const toggleRow = (row: number) => setExpandedRow(r => r === row ? null : row)

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 24px 80px", background: "#F5F3EE" }}>

      <SectionHeader title="What your oral data is showing" subtitle="Six categories. Tap any card for detail." />

      <div className="oral-category-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "stretch", marginBottom: 32 }}>

        {/* Row 1: Diversity | NO pathway */}
        <CategoryCard
          expanded={expandedRow === 0}
          onToggle={() => toggleRow(0)}
          icon={<DiversityIcon color={STATUS_COLORS[kit.shannon_diversity == null ? "pending" : kit.shannon_diversity >= 4.0 && kit.shannon_diversity <= 6.5 ? "good" : kit.shannon_diversity < 3.5 ? "concern" : "watch"]} />}
          name="Bacterial diversity"
          description="How many different species and how evenly they're mixed"
          contextStrip={summary ? `${summary.named_species_count} species · ${summary.distinct_genera} genera · ${summary.distinct_phyla} phyla` : undefined}
          value={kit.shannon_diversity != null ? parseFloat(kit.shannon_diversity.toFixed(2)) : null}
          status={kit.shannon_diversity == null ? "pending" : kit.shannon_diversity >= 4.0 && kit.shannon_diversity <= 6.5 ? "good" : kit.shannon_diversity < 3.5 ? "concern" : "watch"}
          statusLabel={kit.shannon_diversity != null && kit.shannon_diversity >= 4.0 ? "Strong" : undefined}
          narrative={kit.shannon_diversity != null ? {
            paragraph: `You have ${summary?.named_species_count ?? "many"} different bacterial species in your oral sample, with a diversity score of ${kit.shannon_diversity.toFixed(2)}. Higher oral diversity has been correlated with reduced all-cause mortality in population studies.`,
            pullquotes: ["reduced all-cause mortality"],
            source: "Shannon index · Mondal et al. iScience. 2024; Hisayama Study, n=2,343.",
            meta: summary ? [`${summary.named_species_count} named`, `${summary.unnamed_placeholder_count} unclassified`, `${summary.distinct_genera} genera`, `${summary.distinct_phyla} phyla`] : undefined,
          } : undefined}
          dataShows={kit.shannon_diversity != null && summary ? `Your Shannon index of ${kit.shannon_diversity.toFixed(2)} sits in the ${kit.shannon_diversity >= 4.0 && kit.shannon_diversity <= 5.5 ? "mid-range" : kit.shannon_diversity > 5.5 ? "upper range" : "lower range"} of what Mondal 2024 observed as mortality-protective (4.0–5.5). Your ${summary.named_species_count} named species span ${summary.distinct_phyla} phyla, which indicates resilience — no single group dominates.` : undefined}
          crossPanel={hasSpecies ? "Uploading your blood panel will unlock cross-panel observations connecting diversity to inflammatory markers." : undefined}
        />

        <CategoryCard
          expanded={expandedRow === 0}
          onToggle={() => toggleRow(0)}
          icon={<NitricOxideIcon color={STATUS_COLORS[noStatus]} />}
          name="Nitric oxide pathway"
          description="Bacteria that help regulate blood pressure and blood sugar"
          contextStrip={hasSpecies ? `Neisseria ${f(kit.neisseria_pct)}% · Rothia ${f(kit.rothia_pct)}% · Haemophilus ${f(kit.haemophilus_pct)}%` : undefined}
          value={noTotal != null ? parseFloat(noTotal.toFixed(1)) : null}
          unit="%"
          status={noStatus}
          statusLabel={noTotal != null && noTotal >= 20 ? "Strong" : undefined}
          narrative={hasSpecies ? {
            paragraph: `Your nitric-oxide-producing bacteria total ${noTotal!.toFixed(1)}% of your oral community. These convert dietary nitrate from leafy greens and beets into nitric oxide — the signal your blood vessels rely on to stay relaxed.`,
            pullquotes: ["nitric oxide", "blood vessels rely on"],
            source: "Kapil V et al. Free Radic Biol Med. 2013; NHANES 2009-2012.",
          } : undefined}
          dataShows={hasSpecies && noTotal != null ? `Your Neisseria at ${f(kit.neisseria_pct)}% is ${(kit.neisseria_pct ?? 0) >= 10 ? "above" : "below"} the typical 10–13% range observed in healthy adults. Combined with Rothia ${f(kit.rothia_pct)}% and Haemophilus ${f(kit.haemophilus_pct)}%, your nitric oxide production capacity is ${noTotal >= 30 ? "notably strong" : noTotal >= 20 ? "solid" : "below target"}.` : undefined}
          crossPanel={hasSpecies ? "Population research associates higher oral nitrate-reducing bacteria with modestly better cardiovascular markers. Whether strengthening your NO pathway shifts blood pressure in future draws is something to watch." : undefined}
          species={hasSpecies ? [
            { name: "Neisseria", value: kit.neisseria_pct ?? 0, status: spStatusAbove(kit.neisseria_pct, 10), target: "10–13%" },
            { name: "Rothia", value: kit.rothia_pct ?? 0, status: spStatusAbove(kit.rothia_pct, 3), target: "3–10%" },
            { name: "Haemophilus", value: kit.haemophilus_pct ?? 0, status: spStatusAbove(kit.haemophilus_pct, 4), target: "≥ 4%" },
            { name: "Actinomyces", value: kit.actinomyces_pct ?? 0, status: spStatusAbove(kit.actinomyces_pct, 3), target: "3–10%" },
            { name: "Veillonella", value: kit.veillonella_pct ?? 0, status: spStatusAbove(kit.veillonella_pct, 1), target: "1–5%" },
          ] : undefined}
        />

        {/* Row 2: Gum health | Breathing pattern */}
        <CategoryCard
          expanded={expandedRow === 1}
          onToggle={() => toggleRow(1)}
          icon={<GumHealthIcon color={STATUS_COLORS[gumStatus]} />}
          name="Gum health bacteria"
          description="Species linked to gum tissue changes"
          contextStrip={hasSpecies ? `Fuso ${f(kit.fusobacterium_pct)}% · Agg ${f(kit.aggregatibacter_pct)}% · 5 more` : undefined}
          value={gumTotal != null ? parseFloat(gumTotal.toFixed(2)) : null}
          unit="%"
          status={gumStatus}
          narrative={hasSpecies ? {
            paragraph: `Your gum-linked bacteria total ${gumTotal!.toFixed(2)}%. These live in the pockets between your teeth and gums. When they grow beyond typical levels, they can drive inflammation that reaches beyond your mouth.`,
            pullquotes: ["inflammation that reaches beyond your mouth"],
            source: "Socransky & Haffajee classification · Red and orange complex.",
          } : undefined}
          dataShows={hasSpecies && gumTotal != null ? `Fusobacterium at ${f(kit.fusobacterium_pct)}% and Aggregatibacter at ${f(kit.aggregatibacter_pct)}% are ${gumTotal >= 5 ? "above typical levels" : gumTotal >= 2 ? "in the watch range" : "within normal range"}. Consistent flossing and professional cleanings are the most direct way to keep these in check.` : undefined}
          crossPanel={hasSpecies ? "Research links elevated Porphyromonas and Fusobacterium to higher systemic hs-CRP. If your blood panel shows elevated inflammation, these bacteria are a plausible contributor." : undefined}
          species={hasSpecies ? [
            { name: "Fusobacterium", value: kit.fusobacterium_pct ?? 0, status: spStatus(kit.fusobacterium_pct, 0.5), target: "< 0.5%" },
            { name: "Aggregatibacter", value: kit.aggregatibacter_pct ?? 0, status: spStatus(kit.aggregatibacter_pct, 0.5), target: "< 0.5%" },
            { name: "Campylobacter", value: kit.campylobacter_pct ?? 0, status: spStatus(kit.campylobacter_pct, 0.5), target: "< 0.5%" },
            { name: "Porphyromonas", value: kit.porphyromonas_pct ?? 0, status: spStatus(kit.porphyromonas_pct, 0.5), target: "< 0.5%" },
            { name: "Tannerella", value: kit.tannerella_pct ?? 0, status: spStatus(kit.tannerella_pct, 0.5), target: "< 0.5%" },
            { name: "Treponema", value: kit.treponema_pct ?? 0, status: spStatus(kit.treponema_pct, 0.5), target: "< 0.5%" },
            { name: "P. intermedia", value: kit.prevotella_intermedia_pct ?? 0, status: spStatus(kit.prevotella_intermedia_pct, 0.5), target: "< 0.5%" },
          ] : undefined}
        />

        <CategoryCard
          expanded={expandedRow === 1}
          onToggle={() => toggleRow(1)}
          icon={<BreathingIcon color={STATUS_COLORS[breathingStatus]} />}
          name="Nighttime breathing pattern"
          description="Cross-panel signal from questionnaire, wearable, and oral bacteria"
          contextStrip={breathingContext}
          value={breathingValue}
          status={breathingStatus}
          narrative={{
            paragraph: env?.pattern === "mouth_breathing"
              ? "Signs point to mouth breathing during sleep. Your mouth is drier overnight and the bacteria reflect it. Restoring nasal breathing tends to reverse this shift within 4 to 6 weeks."
              : env?.pattern === "balanced"
              ? "Your mouth looks like it's breathing easy overnight — saliva flowing, bacteria in balance."
              : env?.pattern === "osa_paradox"
              ? "The pattern in your mouth matches what population research associates with disrupted nighttime breathing. Worth a closer look with your doctor."
              : env?.pattern === "mixed"
              ? "Your data shows an aerobic community shift alongside elevated anaerobic bacteria. This pattern is often seen when mouth breathing combines with active periodontal bacteria."
              : mbSignals && hasWearable
              ? `Your questionnaire and wearable both point toward mouth breathing. ${wearable!.nights_available} nights tracked. Your oral sample will add the bacterial layer.`
              : mbSignals
              ? "Your questionnaire responses suggest mouth breathing at night. Connecting a wearable would let us cross-reference with objective overnight data."
              : hasWearable
              ? `Your wearable has tracked ${wearable!.nights_available} nights. Your questionnaire and oral sample will complete the picture.`
              : "Your questionnaire, wearable, and oral sample will each add a layer to your overnight pattern.",
            pullquotes: env?.pattern === "mouth_breathing" ? ["mouth breathing during sleep", "4 to 6 weeks"] : mbSignals ? ["mouth breathing"] : undefined,
            source: env ? "Chen et al. 2022 · Research Square preprint." : undefined,
            meta: hasWearable ? [`${wearable!.nights_available} nights`, wearable!.avg_spo2 ? `SpO₂ ${wearable!.avg_spo2.toFixed(1)}%` : null, wearable!.avg_respiratory_rate ? `RR ${wearable!.avg_respiratory_rate.toFixed(1)} bpm` : null, wearable!.avg_rhr ? `RHR ${wearable!.avg_rhr.toFixed(0)} bpm` : null].filter(Boolean) as string[] : undefined,
          }}
          dataShows={env ? `Aerobic shift at ${env.aerobicShift.toFixed(1)}% with anaerobic load at ${env.anaerobicLoad.toFixed(1)}%. Acidity ratio ${env.acidityRatio?.toFixed(2) ?? "—"} (${env.acidityLabel}). Pattern classification: ${env.pattern === "mixed" ? "mixed — aerobic shift with active periopathogens" : env.pattern}.` : undefined}
          expandedContent={env ? (
            <div>
              {/* Env index — table-style 2x2 grid */}
              <div style={{ padding: "18px 22px", background: "#FAFAF8" }}>
                <div style={{ fontFamily: sans, fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.16em", color: "#8C897F", marginBottom: 10 }}>Environment index</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #E8E4D8", borderRadius: 10, overflow: "hidden", background: "#FFFEFB" }}>
                  <EnvStatCell position="tl" label="Acidity ratio" value={env.acidityRatio != null ? env.acidityRatio.toFixed(2) : "—"} statusLabel={env.acidityLabel} statusColor={env.acidityLabel === "base-dominant" || env.acidityLabel === "balanced" ? "#1A8C4E" : env.acidityLabel === "acid-leaning" ? "#B8860B" : "#A84D4D"} breakdown={[{ name: "acidogenic", val: `${env.acidogenic.toFixed(2)}%` }, { name: "alkaligenic", val: `${env.alkaligenic.toFixed(2)}%` }]} />
                  <EnvStatCell position="tr" label="Aerobic shift" value={env.aerobicShift.toFixed(1)} unit="%" statusLabel={env.aerobicShift > 18 ? "Elevated" : "Normal"} statusColor={env.aerobicShift > 18 ? "#B8860B" : "#1A8C4E"} breakdown={[{ name: "Rothia", val: `${f(kit.rothia_pct)}%` }, { name: "Neisseria", val: `${f(kit.neisseria_pct)}%` }, { name: "Actinomyces", val: `${f(kit.actinomyces_pct)}%` }]} />
                  <EnvStatCell position="bl" label="Anaerobic load" value={env.anaerobicLoad.toFixed(2)} unit="%" statusLabel={env.anaerobicLoad > 5 ? "Elevated" : env.anaerobicLoad < 0.5 ? "Suppressed" : "Normal"} statusColor={env.anaerobicLoad > 5 || env.anaerobicLoad < 0.5 ? "#B8860B" : "#1A8C4E"} breakdown={[{ name: "Porphyromonas", val: `${f(kit.porphyromonas_pct, 2)}%` }, { name: "Fusobacterium", val: `${f(kit.fusobacterium_pct)}%` }, { name: "Treponema", val: `${f(kit.treponema_pct, 2)}%` }, { name: "Peptostreptococcus", val: `${f(kit.peptostreptococcus_pct, 2)}%` }]} />
                  <EnvStatCell position="br" label="Aerobic / anaerobic" value={env.aerobicAnaerobicRatio != null ? env.aerobicAnaerobicRatio.toFixed(1) : "—"} unit="×" statusLabel={env.aerobicAnaerobicRatio != null && env.aerobicAnaerobicRatio > 4 ? "Partial paradox" : "Normal range"} statusColor={env.aerobicAnaerobicRatio != null && env.aerobicAnaerobicRatio > 4 ? "#B8860B" : "#1A8C4E"} breakdown={env.aerobicAnaerobicRatio != null && env.aerobicAnaerobicRatio > 4 ? [{ name: "ratio > 4", val: "shift pattern" }, { name: "anaerobes", val: "remain active" }] : [{ name: "within", val: "expected range" }]} />
                </div>
              </div>
              {/* Pattern card — dark espresso hero moment */}
              <div style={{ background: "#2C2A24", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, background: "radial-gradient(circle, rgba(184,134,11,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
                <div style={{ padding: "24px 22px", position: "relative" }}>
                  <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(184,134,11,0.9)", marginBottom: 6 }}>Pattern classification</div>
                  <h4 style={{ fontFamily: serif, fontSize: 28, fontWeight: 500, letterSpacing: "-0.01em", color: "#F5F3EE", margin: "0 0 12px" }}>
                    {({ mouth_breathing: "Mouth breathing", osa_paradox: "OSA-consistent paradox", balanced: "Balanced", mixed: "Mixed" })[env.pattern] ?? env.pattern}
                    <span style={{ color: "#D4A934", fontStyle: "italic" }}>
                      {env.pattern === "mixed" ? " — aerobic shift with active periopathogens" : env.pattern === "mouth_breathing" ? " — nocturnal oral drying" : env.pattern === "osa_paradox" ? " — paradoxical anaerobic suppression" : ""}
                    </span>
                  </h4>
                  <p style={{ fontFamily: serif, fontSize: 15, fontStyle: "italic", lineHeight: 1.7, color: "rgba(245,243,238,0.85)", margin: "0 0 12px" }}>
                    {env.pattern === "mixed"
                      ? <>Your data shows an aerobic community shift of <span style={{ color: "#D4A934", fontStyle: "normal", fontWeight: 500 }}>{env.aerobicShift.toFixed(1)}%</span> alongside elevated anaerobic bacteria at <span style={{ color: "#D4A934", fontStyle: "normal", fontWeight: 500 }}>{env.anaerobicLoad.toFixed(1)}%</span>. This is often seen when mouth breathing combines with active periodontal bacteria — distinct from the paradoxical anaerobic suppression seen in OSA microbiome profiles.</>
                      : env.pattern === "mouth_breathing"
                      ? <>High aerobic enrichment (<span style={{ color: "#D4A934", fontStyle: "normal", fontWeight: 500 }}>{env.aerobicShift.toFixed(1)}%</span>) with elevated anaerobes (<span style={{ color: "#D4A934", fontStyle: "normal", fontWeight: 500 }}>{env.anaerobicLoad.toFixed(1)}%</span>) points to overnight mouth breathing drying the oral environment.</>
                      : env.pattern === "osa_paradox"
                      ? <>High aerobic shift (<span style={{ color: "#D4A934", fontStyle: "normal", fontWeight: 500 }}>{env.aerobicShift.toFixed(1)}%</span>) with suppressed anaerobes and a ratio above 4 is the signature OSA-associated paradox pattern.</>
                      : "Aerobic and anaerobic bacteria are within normal ranges, suggesting stable overnight breathing."}
                  </p>
                  <p style={{ fontFamily: serif, fontSize: 11, fontStyle: "italic", color: "rgba(245,243,238,0.5)", letterSpacing: "0.02em", margin: 0 }}>Chen et al. 2022 · Nighttime breathing & oral ecology</p>
                </div>
              </div>
            </div>
          ) : undefined}
        />

        {/* Row 3: Cavity bacteria | Cavity protectors */}
        <CategoryCard
          expanded={expandedRow === 2}
          onToggle={() => toggleRow(2)}
          icon={<CavityRiskIcon color={STATUS_COLORS[cavRiskStatus]} />}
          name="Cavity bacteria"
          description="Acid-producing species that wear down enamel"
          contextStrip={hasSpecies ? `S. mutans ${f(kit.s_mutans_pct, 2)}% · S. sobrinus ${f(kit.s_sobrinus_pct, 2)}% · Lacto ${f(kit.lactobacillus_pct, 2)}%` : undefined}
          value={cavityRisk != null ? parseFloat(cavityRisk.toFixed(2)) : null}
          unit="%"
          status={cavRiskStatus}
          narrative={hasSpecies ? {
            paragraph: `Your cavity-causing bacteria total ${cavityRisk!.toFixed(2)}%. These produce lactic acid from sugar, which dissolves enamel when pH drops below 5.5. Lower is better here — your protectors help neutralise this acid.`,
            pullquotes: ["lactic acid from sugar", "your protectors"],
            source: "Meta-analysis of 19 studies on S. mutans prevalence.",
          } : undefined}
          dataShows={hasSpecies && cavityRisk != null ? `S. mutans at ${f(kit.s_mutans_pct, 3)}% and S. sobrinus at ${f(kit.s_sobrinus_pct, 3)}% are ${cavityRisk < 0.5 ? "very low — enamel environment is well-protected" : cavityRisk < 1.0 ? "in the manageable range" : "above the threshold where active enamel wear is likely"}.` : undefined}
          crossPanel={hasSpecies ? "Cavity bacteria respond to dietary sugar frequency more than total sugar amount. Spacing meals further apart reduces the number of acid attacks per day." : undefined}
          species={hasSpecies ? [
            { name: "S. mutans", value: kit.s_mutans_pct ?? 0, status: spStatus(kit.s_mutans_pct, 0.5), target: "< 0.5%" },
            { name: "S. sobrinus", value: kit.s_sobrinus_pct ?? 0, status: spStatus(kit.s_sobrinus_pct, 0.5), target: "< 0.5%" },
            { name: "Lactobacillus", value: kit.lactobacillus_pct ?? 0, status: spStatus(kit.lactobacillus_pct, 0.1), target: "< 0.1%" },
          ] : undefined}
        />

        <CategoryCard
          expanded={expandedRow === 2}
          onToggle={() => toggleRow(2)}
          icon={<CavityProtectorIcon color={STATUS_COLORS[cavProtStatus]} />}
          name="Cavity protectors"
          description="Bacteria that buffer acid and compete with cavity-makers"
          contextStrip={hasSpecies ? `S. sanguinis ${f(kit.s_sanguinis_pct, 2)}% · S. gordonii ${f(kit.s_gordonii_pct, 2)}%` : undefined}
          value={cavityProtect != null ? parseFloat(cavityProtect.toFixed(2)) : null}
          unit="%"
          status={cavProtStatus}
          statusLabel={cavityProtect != null && cavityProtect >= 2 ? "Strong" : undefined}
          narrative={hasSpecies ? {
            paragraph: `Your protective bacteria total ${cavityProtect!.toFixed(2)}%. S. sanguinis produces hydrogen peroxide that is directly hostile to S. mutans — they compete for the same tooth-surface territory. Higher is better here.`,
            pullquotes: ["hydrogen peroxide", "compete for the same tooth-surface territory"],
            source: "Kreth et al. J Bacteriol. 2005.",
          } : undefined}
          dataShows={hasSpecies && cavityProtect != null ? `S. sanguinis at ${f(kit.s_sanguinis_pct, 2)}% is ${(kit.s_sanguinis_pct ?? 0) >= 1.5 ? "above the protective threshold" : "below the target of 1.5%"}. Combined with S. gordonii at ${f(kit.s_gordonii_pct, 2)}%, your protective layer is ${cavityProtect >= 2 ? "working well" : "thinner than ideal"}.` : undefined}
          crossPanel={hasSpecies ? "These bacteria also produce alkali that raises local pH — the opposite of what cavity-makers do. A higher protector-to-risk ratio means your enamel spends more time in a neutral environment." : undefined}
          species={hasSpecies ? [
            { name: "S. sanguinis", value: kit.s_sanguinis_pct ?? 0, status: spStatusAbove(kit.s_sanguinis_pct, 1.5), target: "≥ 1.5%" },
            { name: "S. gordonii", value: kit.s_gordonii_pct ?? 0, status: spStatusAbove(kit.s_gordonii_pct, 0.3), target: "≥ 0.3%" },
          ] : undefined}
        />
      </div>

      {kit.streptococcus_total_pct != null && kit.s_salivarius_pct != null && (
        <div style={{ background: "#FAFAF8", border: "1px solid #D6D3C8", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
          <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8C897F", marginBottom: 4 }}>A note on Streptococcus</p>
          <p style={{ fontFamily: sans, fontSize: 12, color: "#7A7870", lineHeight: 1.5, margin: 0 }}>Your total Streptococcus is <strong style={{ color: "#2C2A24" }}>{(kit.streptococcus_total_pct).toFixed(1)}%</strong>, but <strong style={{ color: "#2C2A24" }}>{(kit.s_salivarius_pct).toFixed(1)}%</strong> of that is S. salivarius — a harmless, helpful type.</p>
        </div>
      )}

      {kit.prevotella_commensal_pct != null && (
        <div style={{ background: "#FAFAF8", border: "1px solid #D6D3C8", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
          <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8C897F", marginBottom: 4 }}>A note on Prevotella</p>
          <p style={{ fontFamily: sans, fontSize: 12, color: "#7A7870", lineHeight: 1.5, margin: 0 }}>You have <strong style={{ color: "#2C2A24" }}>{(kit.prevotella_commensal_pct).toFixed(1)}%</strong> of other Prevotella types — the harmless kinds. Only P. intermedia above is the one to watch.</p>
        </div>
      )}

      <SectionHeader title="Converge" subtitle="How your oral data connects to blood and sleep." />
      <PanelInsight panel="oral" fallback={{ picture: narrative?.section_opening, converge: narrative?.section_cardiometabolic ?? narrative?.section_breathing, actions: narrative?.section_gum_caries }} />

      {narrative?.section_disclaimer && (
        <div style={{ borderTop: "1px solid #D6D3C8", paddingTop: 24, marginTop: 16 }}>
          <p style={{ fontFamily: sans, fontSize: 12, fontStyle: "italic", color: "#8C897F", lineHeight: 1.5 }}>{narrative.section_disclaimer}</p>
        </div>
      )}

      {!hasAnyData && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: 16, marginTop: 16 }}>
          <p style={{ fontFamily: sans, fontSize: 13, color: "#92400E", margin: 0 }}>Your oral sample hasn't been processed yet. Once your results come in, this page will populate with your bacterial panel.</p>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .oral-category-grid { grid-template-columns: 1fr !important; }
          .species-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  )
}

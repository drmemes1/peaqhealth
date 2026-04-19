// ============================================================================
// ORAL PANEL — CATEGORY CARD LAYOUT
// ============================================================================
"use client"

import { useMemo } from "react"
import { SectionHeader, PanelInsight, CategoryCard } from "../../components/panels"
import { DiversityIcon, NitricOxideIcon, GumHealthIcon, CavityRiskIcon, CavityProtectorIcon, BreathingIcon } from "../../components/panels/icons"

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
const STATUS_COLORS = { good: "#1A8C4E", watch: "#B8860B", concern: "#A84D4D", info: "rgba(184,134,11,0.6)", mixed: "#B8860B", pending: "#C8C6BE" } as const

function spStatus(v: number | null, goodBelow: number): "good" | "watch" | "concern" { return v == null ? "good" : v < goodBelow ? "good" : v < goodBelow * 3 ? "watch" : "concern" }
function spStatusAbove(v: number | null, goodAbove: number): "good" | "watch" | "concern" { return v == null ? "good" : v >= goodAbove ? "good" : v >= goodAbove * 0.5 ? "watch" : "concern" }

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

  // Category aggregates
  const noTotal = hasSpecies ? (kit.neisseria_pct ?? 0) + (kit.rothia_pct ?? 0) + (kit.haemophilus_pct ?? 0) + (kit.actinomyces_pct ?? 0) + (kit.veillonella_pct ?? 0) : null
  const gumTotal = hasSpecies ? (kit.fusobacterium_pct ?? 0) + (kit.aggregatibacter_pct ?? 0) + (kit.campylobacter_pct ?? 0) + (kit.porphyromonas_pct ?? 0) + (kit.tannerella_pct ?? 0) + (kit.treponema_pct ?? 0) + (kit.prevotella_intermedia_pct ?? 0) : null
  const cavityRisk = hasSpecies ? (kit.s_mutans_pct ?? 0) + (kit.s_sobrinus_pct ?? 0) + (kit.lactobacillus_pct ?? 0) : null
  const cavityProtect = hasSpecies ? (kit.s_sanguinis_pct ?? 0) + (kit.s_gordonii_pct ?? 0) : null

  const noStatus: Status = noTotal == null ? "pending" : noTotal >= 20 ? "good" : noTotal >= 10 ? "watch" : "concern"
  const gumStatus: Status = gumTotal == null ? "pending" : gumTotal < 2 ? "good" : gumTotal < 5 ? "watch" : "concern"
  const cavRiskStatus: Status = cavityRisk == null ? "pending" : cavityRisk < 1 ? "good" : cavityRisk < 2 ? "watch" : "concern"
  const cavProtStatus: Status = cavityProtect == null ? "pending" : cavityProtect >= 2 ? "good" : cavityProtect >= 1 ? "watch" : "concern"

  // Breathing pattern
  let breathingValue: string
  let breathingStatus: Status
  if (kit.env_pattern != null) {
    const p = kit.env_pattern
    breathingValue = p === "balanced" ? "Settled" : p === "mouth_breathing" ? "Mouth breathing pattern" : p === "mixed" ? "Mixed signals" : p.replace(/_/g, " ")
    breathingStatus = p === "balanced" ? "good" : p === "mouth_breathing" || p === "mixed" ? "mixed" : p === "osa_consistent" ? "watch" : "info"
  } else if (hasQ && mbSignals && hasWearable) {
    breathingValue = "Mouth breathing pattern detected"
    breathingStatus = "mixed"
  } else if (hasQ && mbSignals) {
    breathingValue = "Mouth breathing signals"
    breathingStatus = "mixed"
  } else if (hasWearable) {
    breathingValue = "Wearable data gathered"
    breathingStatus = "info"
  } else {
    breathingValue = "Not yet measured"
    breathingStatus = "pending"
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px", background: "#F5F3EE" }}>

      <SectionHeader title="What your oral data is showing" subtitle="Six categories, each expandable for detail." />

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>

        {/* 1. Bacterial diversity */}
        <CategoryCard
          icon={<DiversityIcon color={STATUS_COLORS[kit.shannon_diversity == null ? "pending" : kit.shannon_diversity >= 4.0 && kit.shannon_diversity <= 6.5 ? "good" : kit.shannon_diversity < 3.5 ? "concern" : "watch"]} />}
          name="Bacterial diversity"
          description="How many different species and how evenly they're mixed"
          value={kit.shannon_diversity != null ? parseFloat(kit.shannon_diversity.toFixed(2)) : null}
          status={kit.shannon_diversity == null ? "pending" : kit.shannon_diversity >= 4.0 && kit.shannon_diversity <= 6.5 ? "good" : kit.shannon_diversity < 3.5 ? "concern" : "watch"}
          statusLabel={kit.shannon_diversity != null && kit.shannon_diversity >= 4.0 ? "Strong" : undefined}
          narrative={kit.shannon_diversity != null ? {
            paragraph: `You have ${summary?.named_species_count ?? "many"} different bacterial species in your oral sample, with a diversity score of ${kit.shannon_diversity.toFixed(2)}. A diverse community tends to be more resilient and harder for any single problematic species to dominate.`,
            pullquotes: [`${summary?.named_species_count ?? "many"} different bacterial species`, "more resilient"],
            source: "Shannon index · Reference: Hisayama Study, n=2,343",
            meta: summary ? [`${summary.named_species_count} named`, `${summary.unnamed_placeholder_count} unclassified`, `${summary.distinct_genera} genera`, `${summary.distinct_phyla} phyla`] : undefined,
          } : undefined}
        />

        {/* 2. Nitric oxide pathway */}
        <CategoryCard
          icon={<NitricOxideIcon color={STATUS_COLORS[noStatus]} />}
          name="Nitric oxide pathway"
          description="Bacteria that help your body regulate blood pressure and blood sugar"
          value={noTotal != null ? parseFloat(noTotal.toFixed(1)) : null}
          unit="%"
          status={noStatus}
          statusLabel={noTotal != null && noTotal >= 20 ? "Strong" : undefined}
          narrative={hasSpecies ? {
            paragraph: `Your nitric-oxide-producing bacteria total ${noTotal!.toFixed(1)}% of your oral community. These bacteria convert dietary nitrate from leafy greens and beets into nitric oxide — the signal your blood vessels rely on to stay relaxed. Population research links strong levels to better blood pressure and blood sugar handling.`,
            pullquotes: ["nitric oxide", "better blood pressure and blood sugar"],
            source: "Kapil V et al. Free Radic Biol Med. 2013; NHANES 2009-2012.",
          } : undefined}
          species={hasSpecies ? [
            { name: "Neisseria", value: kit.neisseria_pct ?? 0, status: spStatusAbove(kit.neisseria_pct, 10) },
            { name: "Rothia", value: kit.rothia_pct ?? 0, status: spStatusAbove(kit.rothia_pct, 3) },
            { name: "Haemophilus", value: kit.haemophilus_pct ?? 0, status: spStatusAbove(kit.haemophilus_pct, 4) },
            { name: "Actinomyces", value: kit.actinomyces_pct ?? 0, status: spStatusAbove(kit.actinomyces_pct, 3) },
            { name: "Veillonella", value: kit.veillonella_pct ?? 0, status: spStatusAbove(kit.veillonella_pct, 1) },
          ] : undefined}
        />

        {/* 3. Gum health bacteria */}
        <CategoryCard
          icon={<GumHealthIcon color={STATUS_COLORS[gumStatus]} />}
          name="Gum health bacteria"
          description="Species linked to gum tissue changes"
          value={gumTotal != null ? parseFloat(gumTotal.toFixed(2)) : null}
          unit="%"
          status={gumStatus}
          narrative={hasSpecies ? {
            paragraph: `Your gum-linked bacteria total ${gumTotal!.toFixed(2)}% of your community. These live in the pockets between your teeth and gums. When they grow beyond typical levels, they can drive inflammation that reaches beyond your mouth. Consistent flossing and professional cleanings are the most direct way to keep them in check.`,
            pullquotes: ["inflammation that reaches beyond your mouth", "consistent flossing"],
            source: "Socransky & Haffajee classification · Red and orange complex.",
          } : undefined}
          species={hasSpecies ? [
            { name: "Fusobacterium", value: kit.fusobacterium_pct ?? 0, status: spStatus(kit.fusobacterium_pct, 0.5) },
            { name: "Aggregatibacter", value: kit.aggregatibacter_pct ?? 0, status: spStatus(kit.aggregatibacter_pct, 0.5) },
            { name: "Campylobacter", value: kit.campylobacter_pct ?? 0, status: spStatus(kit.campylobacter_pct, 0.5) },
            { name: "Porphyromonas", value: kit.porphyromonas_pct ?? 0, status: spStatus(kit.porphyromonas_pct, 0.5) },
            { name: "Tannerella", value: kit.tannerella_pct ?? 0, status: spStatus(kit.tannerella_pct, 0.5) },
            { name: "Treponema", value: kit.treponema_pct ?? 0, status: spStatus(kit.treponema_pct, 0.5) },
            { name: "P. intermedia", value: kit.prevotella_intermedia_pct ?? 0, status: spStatus(kit.prevotella_intermedia_pct, 0.5) },
          ] : undefined}
        />

        {/* 4. Cavity bacteria */}
        <CategoryCard
          icon={<CavityRiskIcon color={STATUS_COLORS[cavRiskStatus]} />}
          name="Cavity bacteria"
          description="Acid-producing species that wear down enamel"
          value={cavityRisk != null ? parseFloat(cavityRisk.toFixed(2)) : null}
          unit="%"
          status={cavRiskStatus}
          narrative={hasSpecies ? {
            paragraph: `Your cavity-causing bacteria total ${cavityRisk!.toFixed(2)}%. These produce lactic acid from sugar, which dissolves enamel when pH drops below 5.5. Lower is better here — your protectors (below) help neutralise this acid.`,
            pullquotes: ["lactic acid from sugar", "your protectors"],
            source: "Meta-analysis of 19 studies on S. mutans prevalence.",
          } : undefined}
          species={hasSpecies ? [
            { name: "S. mutans", value: kit.s_mutans_pct ?? 0, status: spStatus(kit.s_mutans_pct, 0.5) },
            { name: "S. sobrinus", value: kit.s_sobrinus_pct ?? 0, status: spStatus(kit.s_sobrinus_pct, 0.5) },
            { name: "Lactobacillus", value: kit.lactobacillus_pct ?? 0, status: spStatus(kit.lactobacillus_pct, 0.1) },
          ] : undefined}
        />

        {/* 5. Cavity protectors */}
        <CategoryCard
          icon={<CavityProtectorIcon color={STATUS_COLORS[cavProtStatus]} />}
          name="Cavity protectors"
          description="Bacteria that buffer acid and compete with cavity-makers"
          value={cavityProtect != null ? parseFloat(cavityProtect.toFixed(2)) : null}
          unit="%"
          status={cavProtStatus}
          statusLabel={cavityProtect != null && cavityProtect >= 2 ? "Strong" : undefined}
          narrative={hasSpecies ? {
            paragraph: `Your protective bacteria total ${cavityProtect!.toFixed(2)}%. S. sanguinis produces hydrogen peroxide that is directly hostile to S. mutans — they compete for the same tooth-surface territory. Higher is better here.`,
            pullquotes: ["hydrogen peroxide", "compete for the same tooth-surface territory"],
            source: "Kreth et al. J Bacteriol. 2005.",
          } : undefined}
          species={hasSpecies ? [
            { name: "S. sanguinis", value: kit.s_sanguinis_pct ?? 0, status: spStatusAbove(kit.s_sanguinis_pct, 1.5) },
            { name: "S. gordonii", value: kit.s_gordonii_pct ?? 0, status: spStatusAbove(kit.s_gordonii_pct, 0.3) },
          ] : undefined}
        />

        {/* 6. Nighttime breathing pattern */}
        <CategoryCard
          icon={<BreathingIcon color={STATUS_COLORS[breathingStatus]} />}
          name="Nighttime breathing pattern"
          description="Cross-panel signal from your questionnaire, wearable, and oral bacteria"
          value={breathingValue}
          status={breathingStatus}
          narrative={{
            paragraph: kit.env_pattern === "mouth_breathing"
              ? "Signs point to mouth breathing during sleep. Your mouth is drier overnight and the bacteria reflect it. Restoring nasal breathing tends to reverse this shift within 4 to 6 weeks."
              : kit.env_pattern === "balanced"
              ? "Your mouth looks like it's breathing easy overnight — saliva flowing, bacteria in balance."
              : kit.env_pattern === "osa_consistent"
              ? "The pattern in your mouth matches what population research associates with disrupted nighttime breathing. Worth a closer look with your doctor."
              : mbSignals && hasWearable
              ? `Your questionnaire and wearable both point toward mouth breathing. ${wearable!.nights_available} nights tracked with SpO₂ at ${wearable!.avg_spo2?.toFixed(1) ?? "—"}% and breathing rate at ${wearable!.avg_respiratory_rate?.toFixed(1) ?? "—"} bpm. Your oral sample will add the bacterial layer to this picture.`
              : mbSignals
              ? "Your questionnaire responses suggest mouth breathing at night. Connecting a wearable would let us cross-reference with objective overnight data."
              : hasWearable
              ? `Your wearable has tracked ${wearable!.nights_available} nights of breathing data. Your questionnaire and oral sample will complete the picture.`
              : "Your questionnaire, wearable, and oral sample will each add a layer to your overnight pattern.",
            pullquotes: kit.env_pattern === "mouth_breathing" ? ["mouth breathing during sleep", "4 to 6 weeks"] : mbSignals ? ["mouth breathing"] : undefined,
            meta: hasWearable ? [`${wearable!.nights_available} nights`, wearable!.avg_spo2 ? `SpO₂ ${wearable!.avg_spo2.toFixed(1)}%` : null, wearable!.avg_respiratory_rate ? `RR ${wearable!.avg_respiratory_rate.toFixed(1)} bpm` : null, wearable!.avg_rhr ? `RHR ${wearable!.avg_rhr.toFixed(0)} bpm` : null].filter(Boolean) as string[] : undefined,
          }}
        />
      </div>

      {/* Streptococcus note */}
      {kit.streptococcus_total_pct != null && kit.s_salivarius_pct != null && (
        <div style={{ background: "#FAFAF8", border: "1px solid #D6D3C8", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
          <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8C897F", marginBottom: 4 }}>A note on Streptococcus</p>
          <p style={{ fontFamily: sans, fontSize: 12, color: "#7A7870", lineHeight: 1.5, margin: 0 }}>Your total Streptococcus is <strong style={{ color: "#2C2A24" }}>{(kit.streptococcus_total_pct).toFixed(1)}%</strong>, but <strong style={{ color: "#2C2A24" }}>{(kit.s_salivarius_pct).toFixed(1)}%</strong> of that is S. salivarius — a harmless, helpful type.</p>
        </div>
      )}

      {/* Prevotella note */}
      {kit.prevotella_commensal_pct != null && (
        <div style={{ background: "#FAFAF8", border: "1px solid #D6D3C8", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
          <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8C897F", marginBottom: 4 }}>A note on Prevotella</p>
          <p style={{ fontFamily: sans, fontSize: 12, color: "#7A7870", lineHeight: 1.5, margin: 0 }}>You have <strong style={{ color: "#2C2A24" }}>{(kit.prevotella_commensal_pct).toFixed(1)}%</strong> of other Prevotella types — the harmless kinds. Only P. intermedia above is the one to watch.</p>
        </div>
      )}

      {/* Panel insight tabs */}
      <SectionHeader title="Connections across your panels" subtitle="How your oral data connects to blood and sleep." />
      <PanelInsight
        picture={narrative?.section_opening ?? null}
        converge={narrative?.section_cardiometabolic ?? narrative?.section_breathing ?? null}
        actions={narrative?.section_gum_caries ?? null}
      />

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

      <style>{`@media (max-width: 768px) { .panel-grid-3 { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}

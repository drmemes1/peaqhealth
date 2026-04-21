// ============================================================================
// ORAL PANEL — STAGGERED 2-COLUMN, ROW-PAIRED EXPANSION
// ============================================================================
"use client"

import { useState, useMemo } from "react"
import { SectionHeader, CategoryCard } from "../../components/panels"
import { DiversityIcon, NitricOxideIcon, GumHealthIcon, CavityRiskIcon, CavityProtectorIcon, BreathingIcon } from "../../components/panels/icons"
import { computeClientEnvironmentIndex } from "../../../lib/oral/environment-index"
import { PH_LABELS, CLI_LABELS, PR_LABELS } from "../../../lib/oral/caries-panel"

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
  ph_balance_api: number | null; ph_balance_category: string | null; ph_balance_confidence: string | null
  cariogenic_load_pct: number | null; cariogenic_load_category: string | null
  protective_ratio: number | null; protective_ratio_category: string | null
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

function EnvStatCell({ label, value, unit, verdict, verdictColor, explanation, position }: { label: string; value: string; unit?: string; verdict: string; verdictColor: string; explanation: string; position: "tl" | "tr" | "bl" | "br" }) {
  const borderLeft = position === "tr" || position === "br" ? "1px solid #E8E4D8" : undefined
  const borderTop = position === "bl" || position === "br" ? "1px solid #E8E4D8" : undefined
  return (
    <div style={{ padding: "16px 18px", background: "#FFFEFB", borderLeft, borderTop }}>
      <div style={{ fontFamily: sans, fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.16em", color: "#8C897F", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: serif, fontSize: 38, fontWeight: 500, color: "#2C2A24", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 6 }}>
        {value}{unit && <span style={{ fontSize: 18, color: "#8C897F", fontWeight: 400, marginLeft: 1 }}>{unit}</span>}
      </div>
      <div style={{ fontFamily: sans, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: verdictColor, fontWeight: 500, marginBottom: 6 }}>{verdict}</div>
      <p style={{ fontFamily: sans, fontSize: 11, color: "#7A7870", lineHeight: 1.5, margin: 0 }}>{explanation}</p>
    </div>
  )
}

function CariesTile({ label, question, value, unit, category, status, barPct, confidence, details }: {
  label: string; question: string; value: string; unit?: string; category: string
  status: "good" | "watch" | "concern"; barPct: number; confidence?: string | null
  details: { label: string; value: string }[]
}) {
  const [open, setOpen] = useState(false)
  const color = STATUS_COLORS[status]
  const barGradient = status === "good" ? "linear-gradient(90deg, #1A8C4E, #2DB86A)" : status === "watch" ? "linear-gradient(90deg, #B8860B, #D4A934)" : "linear-gradient(90deg, #A84D4D, #C06060)"
  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{ background: "#FFFEFB", border: "1px solid #E8E4D8", borderRadius: 10, padding: "16px 18px", cursor: "pointer", transition: "box-shadow 0.15s", position: "relative", overflow: "hidden" }}
    >
      <div style={{ fontFamily: sans, fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.16em", color: "#8C897F", marginBottom: 4 }}>{label}</div>
      <p style={{ fontFamily: sans, fontSize: 11, color: "#7A7870", lineHeight: 1.4, margin: "0 0 10px" }}>{question}</p>
      <div style={{ fontFamily: serif, fontSize: 36, fontWeight: 500, color: "#2C2A24", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 4 }}>
        {value}{unit && <span style={{ fontSize: 16, color: "#8C897F", fontWeight: 400, marginLeft: 2 }}>{unit}</span>}
      </div>
      <div style={{ fontFamily: sans, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color, fontWeight: 500, marginBottom: 10 }}>{category}</div>
      <div style={{ height: 4, background: "#E8E4D8", borderRadius: 2, overflow: "hidden", marginBottom: confidence ? 8 : 0 }}>
        <div style={{ height: "100%", width: `${Math.max(barPct, 2)}%`, background: barGradient, borderRadius: 2, transition: "width 0.3s" }} />
      </div>
      {confidence && (
        <div style={{ fontFamily: sans, fontSize: 9, color: "#A8A59C", marginTop: 4 }}>Confidence: {confidence.replace(/_/g, " ")}</div>
      )}
      {open && (
        <div style={{ marginTop: 12, borderTop: "1px solid #E8E4D8", paddingTop: 10 }}>
          {details.map((d, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontFamily: sans, fontSize: 10, color: "#8C897F", textTransform: "uppercase", letterSpacing: "0.08em" }}>{d.label}</span>
              <span style={{ fontFamily: sans, fontSize: 11, color: "#2C2A24" }}>{d.value}</span>
            </div>
          ))}
        </div>
      )}
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
  const noLabel = noTotal == null ? undefined : noTotal >= 30 ? "Strong · top of typical range" : noTotal >= 20 ? "Strong" : "Watch"
  const gumStatus: Status = gumTotal == null ? "pending" : gumTotal < 2 ? "good" : gumTotal < 5 ? "watch" : "concern"
  const gumLabel = gumTotal == null ? undefined : gumTotal < 2 ? "Good · low activity" : gumTotal < 5 ? "Watch · early-stage" : "Watch closely · early-stage"
  const cavRiskStatus: Status = cavityRisk == null ? "pending" : cavityRisk < 1 ? "good" : cavityRisk < 2 ? "watch" : "concern"
  const cavRiskLabel = cavityRisk == null ? undefined : cavityRisk < 0.5 ? "Good · low cavity activity" : cavityRisk < 1 ? "Good" : "Watch"
  const cavProtStatus: Status = cavityProtect == null ? "pending" : cavityProtect >= 2 ? "good" : cavityProtect >= 1 ? "watch" : "concern"
  const cavProtLabel = cavityProtect == null ? undefined : cavityProtect >= 2 ? "Strong · protective balance" : "Watch"

  const env = useMemo(() => hasSpecies ? computeClientEnvironmentIndex(kit) : null, [kit, hasSpecies])

  let breathingValue: string
  let breathingStatus: Status
  if (env) {
    const p = env.pattern
    breathingValue = p === "balanced" ? "Balanced" : p === "mouth_breathing" ? "Mouth breathing suggested" : p === "osa_paradox" ? "Possible sleep-breathing shift" : "Mouth breathing suggested"
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
          statusLabel={kit.shannon_diversity != null ? (kit.shannon_diversity >= 4.0 ? "Strong · resilient community" : "Watch") : undefined}
          narrative={kit.shannon_diversity != null ? {
            paragraph: `You have ${summary?.named_species_count ?? "many"} different bacterial species in your mouth — a varied community. More variety usually means your mouth is better at staying balanced, because no single type of bacteria can dominate.`,
            pullquotes: ["better at staying balanced"],
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
          statusLabel={noLabel}
          narrative={hasSpecies ? {
            paragraph: `Over a third of your oral community is made of bacteria that turn the nitrate in leafy greens into nitric oxide — the signal that helps your blood vessels relax. Yours is among the strongest we see.`,
            pullquotes: ["helps your blood vessels relax", "strongest we see"],
          } : undefined}
          dataShows={hasSpecies && noTotal != null ? `This is a positive signal for your cardiovascular picture. The bacteria that help with blood pressure and blood sugar are well-represented in your mouth.` : undefined}
          crossPanel={hasSpecies ? "Worth asking your doctor whether your LDL could benefit from more leafy greens in your diet — these bacteria respond directly to what you eat." : undefined}
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
          statusLabel={gumLabel}
          narrative={hasSpecies ? {
            paragraph: `Three species in your sample are above typical levels: Fusobacterium (${f(kit.fusobacterium_pct)}%), Aggregatibacter (${f(kit.aggregatibacter_pct)}%), and Campylobacter (${f(kit.campylobacter_pct)}%). These live in the gaps between teeth and gums. The classic deep-pocket bacteria (Porphyromonas, Tannerella, Treponema) are all within normal range — a meaningful good sign.`,
            pullquotes: ["meaningful good sign"],
          } : undefined}
          dataShows={hasSpecies && gumTotal != null ? `Consistent flossing and regular cleanings are what keep these in check. Worth asking your dentist whether your current cleaning schedule matches these levels.` : undefined}
          crossPanel={hasSpecies ? "If your blood panel shows signs of inflammation, these bacteria could be a contributor. Addressing them at the source — your mouth — is often the most direct path." : undefined}
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
          statusLabel={breathingStatus === "good" ? "Strong" : breathingStatus === "mixed" ? `Watch · ${breathingContextParts.length} of 3 signals` : breathingStatus === "watch" ? "Watch closely" : undefined}
          narrative={{
            paragraph: env?.pattern === "mouth_breathing" || env?.pattern === "mixed"
              ? "Your questionnaire and wearable both point to mouth breathing at night. Your oral bacteria show a shift that fits this pattern — more oxygen-loving bacteria than typical, combined with active gum bacteria. It's not the pattern we'd see with sleep apnea."
              : env?.pattern === "balanced"
              ? "Your mouth looks like it's breathing easy overnight — saliva flowing, bacteria in balance."
              : env?.pattern === "osa_paradox"
              ? "Your bacteria show an unusual pattern worth discussing with your doctor — oxygen-loving species are very high while gum-area bacteria are unusually suppressed."
              : mbSignals && hasWearable
              ? `Your questionnaire and wearable both point toward mouth breathing. ${wearable!.nights_available} nights tracked. Your oral sample will add the bacterial layer.`
              : mbSignals
              ? "Your questionnaire responses suggest mouth breathing at night. Connecting a wearable would let us cross-reference with overnight data."
              : hasWearable
              ? `Your wearable has tracked ${wearable!.nights_available} nights. Your questionnaire and oral sample will complete the picture.`
              : "Your questionnaire, wearable, and oral sample will each add a layer to your overnight pattern.",
            pullquotes: (env?.pattern === "mouth_breathing" || env?.pattern === "mixed") ? ["mouth breathing at night", "not the pattern we'd see with sleep apnea"] : mbSignals ? ["mouth breathing"] : undefined,
            meta: hasWearable ? [`${wearable!.nights_available} nights`, wearable!.avg_spo2 ? `SpO₂ ${wearable!.avg_spo2.toFixed(1)}%` : null, wearable!.avg_respiratory_rate ? `RR ${wearable!.avg_respiratory_rate.toFixed(1)} bpm` : null, wearable!.avg_rhr ? `RHR ${wearable!.avg_rhr.toFixed(0)} bpm` : null].filter(Boolean) as string[] : undefined,
          }}
          dataShows={env ? `Aerobic shift at ${env.aerobicShift.toFixed(1)}% with anaerobic load at ${env.anaerobicLoad.toFixed(1)}%. Acidity ratio ${env.acidityRatio?.toFixed(2) ?? "—"} (${env.acidityLabel}). Pattern classification: ${env.pattern === "mixed" ? "mixed — aerobic shift with active periopathogens" : env.pattern}.` : undefined}
          expandedContent={env ? (
            <div>
              {/* Env index — table-style 2x2 grid */}
              <div style={{ padding: "18px 22px", background: "#FAFAF8" }}>
                <div style={{ fontFamily: sans, fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.16em", color: "#8C897F", marginBottom: 10 }}>Environment index</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #E8E4D8", borderRadius: 10, overflow: "hidden", background: "#FFFEFB" }}>
                  <EnvStatCell position="tl" label="Acidity balance" value={env.acidityRatio != null ? env.acidityRatio.toFixed(2) : "—"} verdict={env.acidityLabel === "balanced" || env.acidityLabel === "base-dominant" ? "Balanced" : "Acid-leaning"} verdictColor={env.acidityLabel === "balanced" || env.acidityLabel === "base-dominant" ? "#1A8C4E" : "#B8860B"} explanation="Your mouth stays in a healthy acid-base range" />
                  <EnvStatCell position="tr" label="Aerobic activity" value={env.aerobicShift.toFixed(1)} unit="%" verdict={env.aerobicShift > 35 ? "Above typical" : env.aerobicShift > 18 ? "Slightly above" : "Normal"} verdictColor={env.aerobicShift > 35 ? "#B8860B" : "#1A8C4E"} explanation={env.aerobicShift > 18 ? "More oxygen-loving bacteria than usual — often seen with mouth breathing" : "Oxygen-loving bacteria within the typical range"} />
                  <EnvStatCell position="bl" label="Anaerobic bacteria" value={env.anaerobicLoad.toFixed(2)} unit="%" verdict={env.anaerobicLoad > 5 ? "Above typical" : env.anaerobicLoad < 0.5 ? "Very low" : "Normal range"} verdictColor={env.anaerobicLoad > 5 || env.anaerobicLoad < 0.5 ? "#B8860B" : "#1A8C4E"} explanation="Bacteria that thrive in low-oxygen areas are within typical levels" />
                  <EnvStatCell position="br" label="Shift pattern" value={env.aerobicAnaerobicRatio != null ? env.aerobicAnaerobicRatio.toFixed(1) : "—"} unit="×" verdict={env.aerobicAnaerobicRatio != null && env.aerobicAnaerobicRatio > 4 ? "Shift detected" : "Normal"} verdictColor={env.aerobicAnaerobicRatio != null && env.aerobicAnaerobicRatio > 4 ? "#B8860B" : "#1A8C4E"} explanation={env.aerobicAnaerobicRatio != null && env.aerobicAnaerobicRatio > 4 ? "Your community leans more aerobic than typical — not a concern on its own" : "Aerobic and anaerobic bacteria in normal balance"} />
                </div>
              </div>
              {/* Pattern card — dark espresso hero moment */}
              <div style={{ background: "#2C2A24", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, background: "radial-gradient(circle, rgba(184,134,11,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
                <div style={{ padding: "24px 22px", position: "relative" }}>
                  <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(212,169,52,0.9)", marginBottom: 8 }}>What this likely means</div>
                  <h4 style={{ fontFamily: serif, fontSize: 26, fontWeight: 500, letterSpacing: "-0.01em", color: "#F5F3EE", margin: "0 0 14px", lineHeight: 1.2 }}>
                    {env.pattern === "mixed" || env.pattern === "mouth_breathing" ? "Your mouth breathing is confirmed"
                      : env.pattern === "osa_paradox" ? "Your overnight breathing pattern needs attention"
                      : "Your overnight environment is balanced"}
                  </h4>
                  <p style={{ fontFamily: serif, fontSize: 15, lineHeight: 1.7, color: "rgba(245,243,238,0.88)", margin: "0 0 12px" }}>
                    {env.pattern === "mixed" || env.pattern === "mouth_breathing"
                      ? <>Your oxygen-loving bacteria are higher than typical while your gum-area bacteria stay in the normal range. This is the bacterial pattern that reflects overnight mouth breathing — confirming your questionnaire answer.</>
                      : env.pattern === "osa_paradox"
                      ? <>Your bacteria show a pattern where oxygen-loving species are high and gum-area bacteria are unusually suppressed. In research, this combination is associated with disrupted nighttime breathing. Worth discussing with your doctor.</>
                      : <>Your mouth bacteria are in a balanced state overnight — no signs of drying or breathing disruption in the bacterial community.</>}
                  </p>
                  <p style={{ fontFamily: serif, fontSize: 11, fontStyle: "italic", color: "rgba(245,243,238,0.5)", letterSpacing: "0.02em", margin: 0 }}>Chen et al. 2022 · Nighttime breathing & oral ecology</p>
                </div>
              </div>
            </div>
          ) : undefined}
        />

        {/* Caries panel overview — 3 tiles spanning full width */}
        {kit.ph_balance_api != null && (
          <div className="caries-tile-grid" style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 2 }}>
            <CariesTile
              label="pH balance"
              question="Is your mouth acidic or well-buffered?"
              value={kit.ph_balance_api.toFixed(2)}
              category={PH_LABELS[kit.ph_balance_category ?? ""] ?? kit.ph_balance_category ?? "—"}
              status={kit.ph_balance_category === "well_buffered" ? "good" : kit.ph_balance_category === "mildly_acidogenic" ? "watch" : "concern"}
              barPct={kit.ph_balance_api * 100}
              confidence={kit.ph_balance_confidence}
              details={[
                { label: "Acid producers", value: `Lacto ${f(kit.lactobacillus_pct, 2)}% · Scardovia ${f(kit.scardovia_pct, 2)}% · S. mutans ${f(kit.s_mutans_pct, 2)}%` },
                { label: "Buffers", value: `Veillonella ${f(kit.veillonella_pct, 2)}% · Neisseria ${f(kit.neisseria_pct, 2)}% · S. sanguinis ${f(kit.s_sanguinis_pct, 2)}%` },
              ]}
            />
            <CariesTile
              label="Cariogenic load"
              question="How much cavity-causing bacteria do you carry?"
              value={kit.cariogenic_load_pct != null ? kit.cariogenic_load_pct.toFixed(2) : "—"}
              unit="%"
              category={CLI_LABELS[kit.cariogenic_load_category ?? ""] ?? kit.cariogenic_load_category ?? "—"}
              status={kit.cariogenic_load_category === "minimal" || kit.cariogenic_load_category === "low" ? "good" : kit.cariogenic_load_category === "elevated" ? "watch" : "concern"}
              barPct={Math.min((kit.cariogenic_load_pct ?? 0) / 3 * 100, 100)}
              details={[
                { label: "S. mutans", value: `${f(kit.s_mutans_pct, 3)}%` },
                { label: "S. sobrinus", value: `${f(kit.s_sobrinus_pct, 3)}%` },
                { label: "Scardovia", value: `${f(kit.scardovia_pct, 3)}%` },
                { label: "Lactobacillus", value: `${f(kit.lactobacillus_pct, 3)}%` },
              ]}
            />
            <CariesTile
              label="Protective ratio"
              question="Can your good bacteria outcompete the bad?"
              value={kit.protective_ratio != null ? kit.protective_ratio.toFixed(1) : "—"}
              unit="×"
              category={PR_LABELS[kit.protective_ratio_category ?? ""] ?? kit.protective_ratio_category ?? "—"}
              status={kit.protective_ratio_category === "strong" || kit.protective_ratio_category === "very_strong" || kit.protective_ratio_category === "no_cavity_makers" ? "good" : kit.protective_ratio_category === "moderate" ? "watch" : "concern"}
              barPct={kit.protective_ratio != null ? Math.min(kit.protective_ratio / 15 * 100, 100) : 0}
              details={[
                { label: "Protectors", value: `S. sanguinis ${f(kit.s_sanguinis_pct, 2)}% + S. gordonii ${f(kit.s_gordonii_pct, 2)}%` },
                { label: "Cavity-makers", value: `S. mutans ${f(kit.s_mutans_pct, 2)}% + S. sobrinus ${f(kit.s_sobrinus_pct, 2)}%` },
              ]}
            />
          </div>
        )}

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
          statusLabel={cavRiskLabel}
          narrative={hasSpecies ? {
            paragraph: `The acid-producing bacteria that cause cavities (S. mutans, S. sobrinus, Lactobacillus) are all at low levels in your sample. Your cavity risk from the bacterial side is low.`,
            pullquotes: ["low levels", "cavity risk from the bacterial side is low"],
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
          statusLabel={cavProtLabel}
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
          .caries-tile-grid { grid-template-columns: 1fr !important; }
          .species-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  )
}

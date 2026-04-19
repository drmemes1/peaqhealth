// ============================================================================
// ORAL PANEL — UNIFIED CARD SYSTEM
// ============================================================================
"use client"

import { useMemo } from "react"
import { Card, SectionHeader, PanelInsight } from "../../components/panels"

type OralKitRow = {
  shannon_diversity: number | null
  neisseria_pct: number | null
  haemophilus_pct: number | null
  rothia_pct: number | null
  actinomyces_pct: number | null
  veillonella_pct: number | null
  porphyromonas_pct: number | null
  tannerella_pct: number | null
  treponema_pct: number | null
  fusobacterium_pct: number | null
  aggregatibacter_pct: number | null
  campylobacter_pct: number | null
  prevotella_intermedia_pct: number | null
  prevotella_commensal_pct: number | null
  s_mutans_pct: number | null
  s_sobrinus_pct: number | null
  s_sanguinis_pct: number | null
  s_gordonii_pct: number | null
  s_salivarius_pct: number | null
  scardovia_pct: number | null
  lactobacillus_pct: number | null
  streptococcus_total_pct: number | null
  peptostreptococcus_pct: number | null
  parvimonas_pct: number | null
  granulicatella_pct: number | null
  env_acid_ratio: number | null
  env_aerobic_score_pct: number | null
  env_anaerobic_load_pct: number | null
  env_aerobic_anaerobic_ratio: number | null
  env_pattern: string | null
  env_peroxide_flag: boolean | null
  raw_otu_table: { [key: string]: unknown; __meta?: { community_summary?: { total_entries_present: number; named_species_count: number; unnamed_placeholder_count: number; distinct_genera: number; distinct_phyla: number } } } | null
}

type Status = "good" | "watch" | "concern" | "info" | "pending"
type QuestionnaireData = { mouth_breathing?: string | null; mouth_breathing_when?: string | null; snoring_reported?: string | null; nasal_obstruction?: string | null } | null
type WearableData = { nights_available: number; avg_spo2: number | null; avg_respiratory_rate: number | null; avg_rhr: number | null } | null

const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
const STATUS_COLORS = { good: "#1A8C4E", watch: "#B8860B", concern: "#A84D4D", info: "rgba(184,134,11,0.6)", pending: "#C8C6BE" } as const
function fmtPct(v: number | null, d = 2): string { return v == null ? "—" : `${v.toFixed(d)}%` }

export default function OralPanelClient({ kit, narrative, questionnaire, wearable }: {
  kit: OralKitRow
  narrative?: { section_opening?: string; section_cardiometabolic?: string; section_gum_caries?: string; section_breathing?: string; section_disclaimer?: string } | null
  questionnaire?: QuestionnaireData
  wearable?: WearableData
}) {
  const summary = kit.raw_otu_table?.__meta?.community_summary
  const hasAnyData = useMemo(() => kit.shannon_diversity != null || kit.neisseria_pct != null || kit.porphyromonas_pct != null, [kit])

  const hasWearable = wearable != null && wearable.nights_available > 0
  const hasQ = questionnaire != null && (questionnaire.mouth_breathing != null || questionnaire.snoring_reported != null)
  const mbSignals = questionnaire?.mouth_breathing === "confirmed" || questionnaire?.mouth_breathing === "often" ||
    questionnaire?.mouth_breathing_when === "sleep_only" || questionnaire?.mouth_breathing_when === "daytime_and_sleep"

  // Compute breathing metrics inline from species data (not env_* columns which may lag)
  const hasSpeciesData = kit.s_mutans_pct != null && kit.s_sanguinis_pct != null && kit.rothia_pct != null && kit.neisseria_pct != null
  const hasOral = kit.env_pattern != null || hasSpeciesData

  const acidBalance = hasSpeciesData
    ? ((kit.s_mutans_pct ?? 0) + (kit.s_sobrinus_pct ?? 0) + (kit.lactobacillus_pct ?? 0)) / ((kit.s_sanguinis_pct ?? 0) + (kit.s_gordonii_pct ?? 0) + 0.001)
    : kit.env_acid_ratio
  const aerobicShift = hasSpeciesData
    ? (kit.rothia_pct ?? 0) + (kit.actinomyces_pct ?? 0) + (kit.haemophilus_pct ?? 0) + (kit.neisseria_pct ?? 0)
    : kit.env_aerobic_score_pct

  const acidStatus: Status = acidBalance == null ? "pending" : acidBalance <= 0.5 ? "good" : acidBalance <= 0.8 ? "watch" : "concern"
  const aerobicStatus: Status = aerobicShift == null ? "pending" : aerobicShift >= 20 && aerobicShift <= 35 ? "good" : aerobicShift > 35 && aerobicShift <= 45 ? "watch" : aerobicShift > 45 ? "concern" : "watch"

  // Pattern card state
  let patternHeadline: string, patternSubhead: string, patternColor: Status
  if (hasOral) {
    const p = kit.env_pattern!
    patternHeadline = p === "balanced" ? "Settled pattern" : p.replace(/_/g, " ")
    patternColor = p === "balanced" ? "good" : p === "osa_consistent" || p.includes("peroxide") ? "watch" : "info"
    patternSubhead = p === "balanced" ? "Your mouth looks like it's breathing easy overnight."
      : p === "mouth_breathing" ? "Signs point to mouth breathing during sleep."
      : p === "osa_consistent" ? "The pattern matches what we see when overnight breathing is disrupted."
      : p.includes("peroxide") ? "Some of this pattern could be from recent whitening products."
      : p === "anaerobic_dominant" ? "More gum-area bacteria active than breathing-related ones."
      : p === "mixed" ? "Mixed picture — some drier overnight conditions alongside active gum bacteria." : ""
  } else if (hasQ && hasWearable && mbSignals) {
    patternHeadline = "Mouth breathing pattern detected"; patternSubhead = "Your questionnaire and wearable both point toward mouth breathing. Your oral microbiome will add the next layer of detail."; patternColor = "watch"
  } else if (hasQ && mbSignals) {
    patternHeadline = "Mouth breathing signals in your questionnaire"; patternSubhead = "Connecting a wearable would let us cross-reference this with objective overnight data."; patternColor = "watch"
  } else if (hasWearable) {
    patternHeadline = "Breathing data gathered"; patternSubhead = "Your questionnaire and oral sample will complete the picture."; patternColor = "info"
  } else {
    patternHeadline = "Still gathering your data"; patternSubhead = "Your questionnaire, wearable, and oral sample will each add a layer to your overnight pattern."; patternColor = "pending"
  }

  const redTotal = (kit.porphyromonas_pct ?? 0) + (kit.tannerella_pct ?? 0) + (kit.treponema_pct ?? 0)
  const orangeTotal = (kit.fusobacterium_pct ?? 0) + (kit.aggregatibacter_pct ?? 0) + (kit.campylobacter_pct ?? 0) + (kit.prevotella_intermedia_pct ?? 0)
  const riskTotal = (kit.s_mutans_pct ?? 0) + (kit.s_sobrinus_pct ?? 0)

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px", background: "#F5F3EE" }}>

      {/* ── COMMUNITY HEALTH ─────────────────────────────────────────── */}
      <SectionHeader title="Community health" subtitle="Variety, balance, and total coverage of your oral ecosystem." />
      <div className="panel-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
        <Card label="Diversity score" subtitle="Shannon index" value={kit.shannon_diversity} status={kit.shannon_diversity == null ? "pending" : kit.shannon_diversity >= 4.0 && kit.shannon_diversity <= 6.5 ? "good" : kit.shannon_diversity < 3.5 ? "concern" : "watch"} target="4.0 – 6.5" rangeMin={0} rangeMax={8} targetMin={4.0} targetMax={6.5} pendingNote="Waiting on your oral sample." expandContent={{ why: "How many different bacteria live in your mouth and how evenly mixed they are. Higher oral diversity has been correlated with reduced all-cause mortality in population studies.", source: "Mondal et al. iScience 2024; Vogtmann et al. J Infect Dis 2025." }} />
        <Card label="Named species" value={summary?.named_species_count ?? null} status={summary?.named_species_count == null ? "pending" : summary.named_species_count >= 80 ? "good" : "watch"} target="80 – 150" targetPrefix="Typical range" pendingNote="Waiting on your oral sample." expandContent={summary ? { why: `We identified ${summary.named_species_count} named species across ${summary.distinct_genera} bacterial families. ${summary.unnamed_placeholder_count} more were detected but don't have official names yet.` } : undefined} />
        <Card label="Total signals" value={summary?.total_entries_present ?? null} status={summary ? "info" : "pending"} pendingNote="Waiting on your oral sample." expandContent={{ why: "Every bacterial signal we picked up, named and unnamed combined. We keep all of this data so we can revisit it as research advances." }} />
      </div>

      {/* ── SLEEP & BREATHING ────────────────────────────────────────── */}
      <SectionHeader title="Sleep & breathing" subtitle="What your mouth looks like when you're asleep." />
      <div style={{ marginBottom: 32 }}>
        {/* Pattern card */}
        <div style={{ background: "#FAFAF8", border: "1px solid #D6D3C8", borderLeft: `3px solid ${STATUS_COLORS[patternColor]}`, borderRadius: 10, padding: "20px 22px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8C897F" }}>Your overnight pattern</span>
            <span style={{ fontFamily: sans, fontSize: 10, color: STATUS_COLORS[patternColor], fontWeight: 500 }}>
              {hasOral ? "oral microbiome" : hasQ && hasWearable ? "questionnaire + wearable" : hasQ ? "questionnaire" : hasWearable ? "wearable" : "pending"}
            </span>
          </div>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, color: "#2C2A24", margin: "0 0 4px", textTransform: "capitalize" }}>{patternHeadline}</p>
          <p style={{ fontFamily: sans, fontSize: 12, color: "#7A7870", lineHeight: 1.55, margin: 0 }}>{patternSubhead}</p>
          {hasWearable && (
            <p style={{ fontFamily: sans, fontSize: 11, color: "#7A7870", margin: "10px 0 0", padding: "8px 12px", background: "#F5F3EE", borderRadius: 6, border: "1px solid #E8E4D8" }}>
              {wearable!.nights_available} nights tracked{wearable!.avg_spo2 != null && <> · SpO₂ {wearable!.avg_spo2.toFixed(1)}%</>}{wearable!.avg_respiratory_rate != null && <> · RR {wearable!.avg_respiratory_rate.toFixed(1)} bpm</>}{wearable!.avg_rhr != null && <> · RHR {wearable!.avg_rhr.toFixed(0)} bpm</>}
            </p>
          )}
          {kit.env_peroxide_flag && (
            <p style={{ fontFamily: sans, fontSize: 11, color: "#92400E", margin: "10px 0 0", padding: "8px 12px", background: "#FFFBEB", borderRadius: 6, border: "1px solid #FDE68A" }}>
              Note: whitening products can look similar to breathing-related changes in this data.
            </p>
          )}
        </div>

        {/* 3 breathing cards */}
        <div className="panel-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Card label="Acid balance" subtitle="S. mutans + S. sobrinus vs. S. sanguinis + S. gordonii" value={acidBalance != null ? parseFloat(acidBalance.toFixed(2)) : null} status={acidStatus} target="0.3 – 0.5" rangeMin={0} rangeMax={1.5} targetMin={0.3} targetMax={0.5} pendingNote="Mouth breathing tends to raise acid producers overnight. Your oral sample will show whether that's happened." statusLabel={acidBalance == null ? "Waiting on sample" : undefined} expandContent={acidBalance != null ? { why: "The ratio of acid-making bacteria to acid-buffering ones. Lower means your protectors are outcompeting the acid producers — that's a good thing for enamel." + (kit.env_pattern === "mouth_breathing" ? " Your mouth breathing pattern can shift this ratio over time by drying out saliva overnight." : "") } : undefined} />
          <Card label="Aerobic shift" subtitle="Rothia · Actinomyces · Haemophilus · Neisseria" value={aerobicShift != null ? parseFloat(aerobicShift.toFixed(1)) : null} unit="%" status={aerobicStatus} target="20 – 35%" rangeMin={0} rangeMax={60} targetMin={20} targetMax={35} pendingNote="Open-mouth sleeping favors oxygen-loving species. We'll see how pronounced the shift is in your sample." statusLabel={aerobicShift == null ? "Waiting on sample" : undefined} expandContent={aerobicShift != null ? { why: "Oxygen-loving bacteria that expand when your mouth is open all night. Not inherently harmful, but the shift itself is a signature of altered nighttime breathing." + (kit.env_pattern === "mouth_breathing" && aerobicShift > 30 ? " Your value is at the high end of the typical range, consistent with the mouth breathing pattern your wearable and questionnaire detected." : "") } : undefined} />
          {hasWearable && wearable!.avg_spo2 != null ? (
            <Card label="Oxygen saturation" subtitle={`Overnight SpO₂ · ${wearable!.nights_available} nights tracked`} value={wearable!.avg_spo2} unit="%" status={wearable!.avg_spo2 >= 95 ? "good" : "watch"} target="≥ 95%" rangeMin={90} rangeMax={100} targetMin={95} targetMax={100} expandContent={{ why: `Average overnight oxygen across ${wearable!.nights_available} nights. Stable SpO₂ with no dips below 94% makes significant breathing disruption less likely.` }} />
          ) : hasWearable && wearable!.avg_respiratory_rate != null ? (
            <Card label="Breathing rate" subtitle={`Overnight · ${wearable!.nights_available} nights tracked`} value={wearable!.avg_respiratory_rate} unit=" bpm" status={wearable!.avg_respiratory_rate <= 18 ? "good" : "watch"} target="12 – 18 bpm" rangeMin={8} rangeMax={25} targetMin={12} targetMax={18} />
          ) : (
            <Card label="Oxygen saturation" subtitle="SpO₂ tracking from your wearable" value={null} status="pending" target="≥ 95%" pendingNote="Connecting a wearable would show overnight oxygen levels." statusLabel="Waiting on wearable" />
          )}
        </div>
      </div>

      {/* ── CAVITY RISK ──────────────────────────────────────────────── */}
      <SectionHeader title="Cavity risk" subtitle="Bacteria that cause cavities vs. those that protect against them." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        <div>
          <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A84D4D", marginBottom: 10 }}>Cavity-makers · {kit.s_mutans_pct != null ? fmtPct(riskTotal) : "—"}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Card label="S. mutans" value={kit.s_mutans_pct} unit="%" status={kit.s_mutans_pct == null ? "pending" : riskTotal < 0.5 ? "good" : riskTotal < 1.0 ? "watch" : "concern"} target="< 0.5%" rangeMin={0} rangeMax={2} targetMax={0.5} expandContent={{ why: "The main troublemaker. It turns sugar into acid, and that acid wears down enamel." }} />
            <Card label="S. sobrinus" value={kit.s_sobrinus_pct} unit="%" status={kit.s_sobrinus_pct == null ? "pending" : kit.s_sobrinus_pct < 0.5 ? "good" : "watch"} target="< 0.5%" rangeMin={0} rangeMax={2} targetMax={0.5} expandContent={{ why: "S. mutans' partner — they often show up together in active cavities." }} />
            <Card label="Scardovia" value={kit.scardovia_pct} unit="%" status={kit.scardovia_pct == null ? "pending" : kit.scardovia_pct < 0.2 ? "good" : "watch"} target="< 0.2%" rangeMin={0} rangeMax={1} targetMax={0.2} expandContent={{ why: "Shows up in fast-moving cavities, especially in kids." }} />
          </div>
        </div>
        <div>
          <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1A8C4E", marginBottom: 10 }}>Protectors · {kit.s_sanguinis_pct != null ? fmtPct((kit.s_sanguinis_pct ?? 0) + (kit.s_gordonii_pct ?? 0)) : "—"}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Card label="S. sanguinis" value={kit.s_sanguinis_pct} unit="%" status={kit.s_sanguinis_pct == null ? "pending" : kit.s_sanguinis_pct >= 1.5 ? "good" : "watch"} target="≥ 1.5%" rangeMin={0} rangeMax={5} targetMin={1.5} targetMax={3} expandContent={{ why: "Neutralises the acid that cavity-makers produce. Also competes with them for space." }} />
            <Card label="S. gordonii" value={kit.s_gordonii_pct} unit="%" status={kit.s_gordonii_pct == null ? "pending" : kit.s_gordonii_pct >= 0.3 ? "good" : "watch"} target="≥ 0.3%" rangeMin={0} rangeMax={2} targetMin={0.3} expandContent={{ why: "One of the first good bacteria to move in. Helps set up a stable, healthy mix." }} />
            <Card label="S. salivarius" value={kit.s_salivarius_pct} unit="%" status={kit.s_salivarius_pct == null ? "pending" : kit.s_salivarius_pct >= 2 ? "good" : "watch"} target="≥ 2%" rangeMin={0} rangeMax={20} targetMin={2} expandContent={{ why: "A harmless, helpful type that produces natural antibiotics against cavity-causing bacteria." }} />
          </div>
        </div>
      </div>
      {kit.streptococcus_total_pct != null && kit.s_salivarius_pct != null && (
        <div style={{ background: "#FAFAF8", border: "1px solid #D6D3C8", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
          <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8C897F", marginBottom: 4 }}>A note on Streptococcus</p>
          <p style={{ fontFamily: sans, fontSize: 12, color: "#7A7870", lineHeight: 1.5, margin: 0 }}>Your total Streptococcus looks high at <strong style={{ color: "#2C2A24" }}>{fmtPct(kit.streptococcus_total_pct)}</strong>, but <strong style={{ color: "#2C2A24" }}>{fmtPct(kit.s_salivarius_pct)}</strong> of that is S. salivarius — a harmless, helpful type.</p>
        </div>
      )}

      {/* ── HEART & METABOLISM ────────────────────────────────────────── */}
      <SectionHeader title="Heart & metabolism" subtitle="Nitric-oxide-producing bacteria, linked to blood pressure and blood sugar." />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
        <Card label="Neisseria · all types" subtitle="The strongest nitric-oxide producer on your tongue." value={kit.neisseria_pct} unit="%" status={kit.neisseria_pct == null ? "pending" : kit.neisseria_pct >= 10 ? "good" : kit.neisseria_pct >= 5 ? "watch" : "concern"} target="10 – 13%" rangeMin={0} rangeMax={20} targetMin={10} targetMax={13} expandContent={{ why: "Strong Neisseria levels mean your mouth is doing good work converting food into the signal your blood vessels rely on.", source: "Kapil V et al. Free Radic Biol Med. 2013." }} />
        <Card label="Haemophilus · all types" subtitle="Works in tandem with Neisseria on the nitrate-to-nitrite step." value={kit.haemophilus_pct} unit="%" status={kit.haemophilus_pct == null ? "pending" : kit.haemophilus_pct >= 4 ? "good" : kit.haemophilus_pct >= 2 ? "watch" : "concern"} target="≥ 4%" rangeMin={0} rangeMax={10} targetMin={4} targetMax={6} expandContent={{ why: "Research has linked lower Haemophilus levels to how well the body handles blood sugar and triglycerides.", source: "NHANES 2009-2012 analysis." }} />
        <div className="panel-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Card label="Rothia" value={kit.rothia_pct} unit="%" status={kit.rothia_pct == null ? "pending" : kit.rothia_pct >= 3 && kit.rothia_pct <= 10 ? "good" : "watch"} target="3 – 10%" rangeMin={0} rangeMax={15} targetMin={3} targetMax={10} expandContent={{ why: "Does the first step in turning leafy greens into the good stuff your blood vessels use." }} />
          <Card label="Actinomyces" value={kit.actinomyces_pct} unit="%" status={kit.actinomyces_pct == null ? "pending" : kit.actinomyces_pct >= 3 && kit.actinomyces_pct <= 10 ? "good" : "watch"} target="3 – 10%" rangeMin={0} rangeMax={15} targetMin={3} targetMax={10} expandContent={{ why: "Also helps with the nitric oxide pipeline and keeps your mouth's acidity in check." }} />
          <Card label="Veillonella" value={kit.veillonella_pct} unit="%" status={kit.veillonella_pct == null ? "pending" : kit.veillonella_pct >= 1 && kit.veillonella_pct <= 5 ? "good" : "watch"} target="1 – 5%" rangeMin={0} rangeMax={10} targetMin={1} targetMax={5} expandContent={{ why: "Cleans up lactic acid, which helps protect tooth enamel." }} />
        </div>
      </div>

      {/* ── GUM HEALTH ───────────────────────────────────────────────── */}
      <SectionHeader title="Gum health" subtitle="Bacteria associated with gum tissue health." />
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A84D4D", marginBottom: 10 }}>Main gum-disease bacteria · {kit.porphyromonas_pct != null ? fmtPct(redTotal) : "—"}</p>
        <div className="panel-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          <Card label="Porphyromonas" value={kit.porphyromonas_pct} unit="%" status={kit.porphyromonas_pct == null ? "pending" : kit.porphyromonas_pct < 0.5 ? "good" : "concern"} target="< 0.5%" rangeMin={0} rangeMax={5} targetMax={0.5} expandContent={{ why: "The most studied gum-disease bacterium. Can release things into your bloodstream that cause inflammation throughout your body." }} />
          <Card label="Tannerella" value={kit.tannerella_pct} unit="%" status={kit.tannerella_pct == null ? "pending" : kit.tannerella_pct < 0.5 ? "good" : "concern"} target="< 0.5%" rangeMin={0} rangeMax={5} targetMax={0.5} expandContent={{ why: "Usually shows up with Porphyromonas. Research links higher levels to higher LDL cholesterol." }} />
          <Card label="Treponema" value={kit.treponema_pct} unit="%" status={kit.treponema_pct == null ? "pending" : kit.treponema_pct < 0.5 ? "good" : "concern"} target="< 0.5%" rangeMin={0} rangeMax={5} targetMax={0.5} expandContent={{ why: "A corkscrew-shaped bacterium found in deeper gum pockets." }} />
        </div>
        <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B8860B", marginBottom: 10 }}>Early-stage gum bacteria · {kit.fusobacterium_pct != null ? fmtPct(orangeTotal) : "—"}</p>
        <div className="panel-grid-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
          <Card label="Fusobacterium" value={kit.fusobacterium_pct} unit="%" status={kit.fusobacterium_pct == null ? "pending" : kit.fusobacterium_pct < 0.5 ? "good" : kit.fusobacterium_pct < 2 ? "watch" : "concern"} target="< 0.5%" rangeMin={0} rangeMax={5} targetMax={0.5} expandContent={{ why: "The connector bacterium — it links up early and late settlers in plaque." }} />
          <Card label="Aggregatibacter" value={kit.aggregatibacter_pct} unit="%" status={kit.aggregatibacter_pct == null ? "pending" : kit.aggregatibacter_pct < 0.5 ? "good" : "concern"} target="< 0.5%" rangeMin={0} rangeMax={5} targetMax={0.5} expandContent={{ why: "Linked to faster-moving forms of gum changes, especially in younger adults." }} />
          <Card label="Campylobacter" value={kit.campylobacter_pct} unit="%" status={kit.campylobacter_pct == null ? "pending" : kit.campylobacter_pct < 0.5 ? "good" : "watch"} target="< 0.5%" rangeMin={0} rangeMax={5} targetMax={0.5} expandContent={{ why: "Shows up during early gum inflammation." }} />
          <Card label="P. intermedia" value={kit.prevotella_intermedia_pct} unit="%" status={kit.prevotella_intermedia_pct == null ? "pending" : kit.prevotella_intermedia_pct < 0.5 ? "good" : "watch"} target="< 0.5%" rangeMin={0} rangeMax={5} targetMax={0.5} expandContent={{ why: "The one Prevotella species you don't want. Most other Prevotella are harmless." }} />
        </div>
      </div>
      {kit.prevotella_commensal_pct != null && (
        <div style={{ background: "#FAFAF8", border: "1px solid #D6D3C8", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
          <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8C897F", marginBottom: 4 }}>A note on Prevotella</p>
          <p style={{ fontFamily: sans, fontSize: 12, color: "#7A7870", lineHeight: 1.5, margin: 0 }}>You have <strong style={{ color: "#2C2A24" }}>{fmtPct(kit.prevotella_commensal_pct)}</strong> of other Prevotella types — the harmless kinds. Only P. intermedia above is the one to watch.</p>
        </div>
      )}

      {/* ── PANEL INSIGHT ────────────────────────────────────────────── */}
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
          <p style={{ fontFamily: sans, fontSize: 13, color: "#92400E", margin: 0 }}>Your oral sample hasn't been processed yet. Once your lab results come in, this page will populate with your bacterial panel.</p>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) {
          .panel-grid-3 { grid-template-columns: 1fr !important; }
          .panel-grid-4 { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  )
}

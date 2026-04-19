// ============================================================================
// ORAL PANEL — COMPACT REDESIGN WITH PANEL COMPONENTS
// ============================================================================
"use client"

import { useMemo } from "react"
import { MetricCard, FeatureCard, NarrativeCard, SectionHeader, PanelInsight } from "../../components/panels"

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
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
function fmtPct(v: number | null, d = 2): string { return v == null ? "—" : `${v.toFixed(d)}%` }
function fmt(v: number | null, d = 2): string { return v == null ? "—" : v.toFixed(d) }

type QuestionnaireData = {
  mouth_breathing?: string | null; mouth_breathing_when?: string | null
  snoring_reported?: string | null; nasal_obstruction?: string | null
} | null

type WearableData = { nights_available: number; avg_spo2: number | null; avg_respiratory_rate: number | null; avg_rhr: number | null } | null

export default function OralPanelClient({ kit, narrative, questionnaire, wearable }: {
  kit: OralKitRow
  narrative?: { section_opening?: string; section_cardiometabolic?: string; section_gum_caries?: string; section_breathing?: string; section_disclaimer?: string } | null
  questionnaire?: QuestionnaireData
  wearable?: WearableData
}) {
  const summary = kit.raw_otu_table?.__meta?.community_summary
  const shannon = kit.shannon_diversity
  const hasAnyData = useMemo(() => kit.shannon_diversity != null || kit.neisseria_pct != null || kit.porphyromonas_pct != null, [kit])

  const shannonStatus: Status = shannon == null ? "pending" : shannon >= 4.0 && shannon <= 6.5 ? "good" : shannon < 3.5 ? "concern" : "watch"
  const speciesStatus: Status = summary?.named_species_count == null ? "pending" : summary.named_species_count >= 80 ? "good" : "watch"
  const neisseriaStatus: Status = kit.neisseria_pct == null ? "pending" : kit.neisseria_pct >= 10 ? "good" : kit.neisseria_pct >= 5 ? "watch" : "concern"
  const haemStatus: Status = kit.haemophilus_pct == null ? "pending" : kit.haemophilus_pct >= 4 ? "good" : kit.haemophilus_pct >= 2 ? "watch" : "concern"

  const hasOral = kit.env_pattern != null
  const hasWearable = wearable != null && wearable.nights_available > 0
  const hasQ = questionnaire != null && (questionnaire.mouth_breathing != null || questionnaire.snoring_reported != null)
  const mbConfirmed = questionnaire?.mouth_breathing === "confirmed" || questionnaire?.mouth_breathing === "often" ||
    questionnaire?.mouth_breathing_when === "sleep_only" || questionnaire?.mouth_breathing_when === "daytime_and_sleep"

  let patternHeadline: string, patternSubhead: string, patternColor: Status
  if (hasOral) {
    const p = kit.env_pattern!
    patternHeadline = p.replace(/_/g, " ")
    patternColor = p === "balanced" ? "good" : p === "osa_consistent" || p.includes("peroxide") ? "watch" : "info"
    patternSubhead = p === "balanced" ? "Your mouth looks like it's breathing easy overnight."
      : p === "mouth_breathing" ? "Signs point to mouth breathing during sleep."
      : p === "osa_consistent" ? "The pattern matches what we see when overnight breathing is disrupted."
      : p.includes("peroxide") ? "Some of this pattern could be from recent whitening products."
      : p === "anaerobic_dominant" ? "More gum-area bacteria active than breathing-related ones."
      : p === "mixed" ? "Mixed picture — some drier overnight conditions alongside active gum bacteria." : ""
  } else if (hasQ && mbConfirmed) {
    patternHeadline = "Mouth breathing reported"; patternSubhead = "Once your oral sample is processed, we can see what that means for your bacteria."; patternColor = "watch"
  } else if (hasWearable) {
    patternHeadline = "Wearable data available"; patternSubhead = "Your oral sample will complete the picture."; patternColor = "info"
  } else {
    patternHeadline = "Pending"; patternSubhead = "Waiting on your data."; patternColor = "pending"
  }

  const STATUS_COLORS = { good: "#1A8C4E", watch: "#E07B00", concern: "#D42B2B", info: "#B8860B", pending: "#C8C6BE" } as const
  const redTotal = (kit.porphyromonas_pct ?? 0) + (kit.tannerella_pct ?? 0) + (kit.treponema_pct ?? 0)
  const orangeTotal = (kit.fusobacterium_pct ?? 0) + (kit.aggregatibacter_pct ?? 0) + (kit.campylobacter_pct ?? 0) + (kit.prevotella_intermedia_pct ?? 0)
  const riskTotal = (kit.s_mutans_pct ?? 0) + (kit.s_sobrinus_pct ?? 0)

  const narrativeHtml = (text: string) => text.replace(/\*\*(.*?)\*\*/g, '<span class="pullquote">$1</span>')

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px" }}>
      {narrative?.section_opening ? (
        <NarrativeCard><span dangerouslySetInnerHTML={{ __html: narrativeHtml(narrative.section_opening) }} /></NarrativeCard>
      ) : (
        <NarrativeCard>Your personalised summary is being prepared.</NarrativeCard>
      )}

      <SectionHeader title="Community health" subtitle="Variety, balance, and total coverage of your oral ecosystem." />
      <div className="panel-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
        <MetricCard label="Variety score" value={shannon ?? "—"} status={shannonStatus} targetMin={4.0} targetMax={6.5} valueForIndicator={shannon ?? undefined} rangeMin={0} rangeMax={8} explanation="How many different bacteria live in your mouth and how evenly mixed they are. A wider mix usually means a healthier mouth." source="Vogtmann E et al. J Infect Dis. 2025." />
        <MetricCard label="Named species" value={summary?.named_species_count ?? "—"} status={speciesStatus} targetMin={80} targetMax={150} valueForIndicator={summary?.named_species_count ?? undefined} rangeMin={0} rangeMax={200} explanation={summary ? `We identified ${summary.named_species_count} named species across ${summary.distinct_genera} bacterial families. ${summary.unnamed_placeholder_count} more were detected but don't have official names yet.` : "The count of named bacterial species we found in your sample."} />
        <MetricCard label="Total signals" value={summary?.total_entries_present ?? "—"} status="info" targetLabel="Full picture" explanation="Every bacterial signal we picked up, named and unnamed combined. We keep all of this data so we can revisit it as research advances." />
      </div>

      <SectionHeader title="Heart & metabolism" subtitle="Nitric-oxide-producing bacteria, linked to blood pressure and blood sugar." />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        <FeatureCard title="Neisseria · all types" description="The strongest nitric-oxide producer on your tongue." value={kit.neisseria_pct ?? "—"} valueSuffix="%" target="10 – 13%" status={neisseriaStatus} explanation="Strong Neisseria levels mean your mouth is doing good work converting food into the signal your blood vessels rely on. This is a direct input to blood pressure regulation." source="Kapil V et al. Free Radic Biol Med. 2013." />
        <FeatureCard title="Haemophilus · all types" description="Works in tandem with Neisseria on the nitrate-to-nitrite step." value={kit.haemophilus_pct ?? "—"} valueSuffix="%" target="≥ 4%" status={haemStatus} explanation="Research has linked lower Haemophilus levels to how well the body handles blood sugar and triglycerides." source="NHANES 2009-2012 analysis." />
        <div className="panel-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <MetricCard label="Rothia" value={kit.rothia_pct ?? "—"} valueSuffix="%" status={kit.rothia_pct == null ? "pending" : kit.rothia_pct >= 3 && kit.rothia_pct <= 10 ? "good" : "watch"} targetMin={3} targetMax={10} valueForIndicator={kit.rothia_pct ?? undefined} rangeMin={0} rangeMax={15} explanation="Does the first step in turning leafy greens into the good stuff your blood vessels use." />
          <MetricCard label="Actinomyces" value={kit.actinomyces_pct ?? "—"} valueSuffix="%" status={kit.actinomyces_pct == null ? "pending" : kit.actinomyces_pct >= 3 && kit.actinomyces_pct <= 10 ? "good" : "watch"} targetMin={3} targetMax={10} valueForIndicator={kit.actinomyces_pct ?? undefined} rangeMin={0} rangeMax={15} explanation="Also helps with the nitric oxide pipeline and keeps your mouth's acidity in check." />
          <MetricCard label="Veillonella" value={kit.veillonella_pct ?? "—"} valueSuffix="%" status={kit.veillonella_pct == null ? "pending" : kit.veillonella_pct >= 1 && kit.veillonella_pct <= 5 ? "good" : "watch"} targetMin={1} targetMax={5} valueForIndicator={kit.veillonella_pct ?? undefined} rangeMin={0} rangeMax={10} explanation="Cleans up lactic acid, which helps protect tooth enamel." />
        </div>
      </div>

      <SectionHeader title="Sleep & breathing" subtitle="What your mouth looks like when you're asleep." />
      <div style={{ marginBottom: 32 }}>
        <div style={{ background: "#FAFAF8", border: "1px solid #E8E6E0", borderLeft: `3px solid ${STATUS_COLORS[patternColor]}`, borderRadius: 10, padding: "16px 18px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9B9891" }}>Your overnight pattern</span>
            <span style={{ fontFamily: sans, fontSize: 10, color: STATUS_COLORS[patternColor], fontWeight: 500 }}>
              {hasOral ? "oral microbiome" : hasQ ? "questionnaire" : hasWearable ? "wearable" : "pending"}
            </span>
          </div>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 400, color: "#2C2A24", margin: "0 0 4px", textTransform: "capitalize" }}>{patternHeadline}</p>
          <p style={{ fontFamily: sans, fontSize: 12, color: "#5C5A54", lineHeight: 1.5, margin: 0 }}>{patternSubhead}</p>
          {hasWearable && !hasOral && (
            <p style={{ fontFamily: sans, fontSize: 11, color: "#5C5A54", margin: "10px 0 0", padding: "8px 10px", background: "#fff", borderRadius: 6, border: "1px solid #F0EDE6" }}>
              Wearable: {wearable!.nights_available} nights · SpO₂ {wearable!.avg_spo2?.toFixed(1) ?? "—"}% · RR {wearable!.avg_respiratory_rate?.toFixed(1) ?? "—"} bpm · RHR {wearable!.avg_rhr?.toFixed(0) ?? "—"} bpm
            </p>
          )}
          {kit.env_peroxide_flag && (
            <p style={{ fontFamily: sans, fontSize: 11, color: "#92400E", margin: "10px 0 0", padding: "8px 10px", background: "#FFFBEB", borderRadius: 6, border: "1px solid #FDE68A" }}>
              Note: whitening products can look similar to breathing-related changes in this data.
            </p>
          )}
        </div>
        <div className="panel-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <MetricCard label="Acid balance" value={hasOral ? kit.env_acid_ratio! : mbConfirmed ? "Higher likely" : "—"} status={hasOral ? (kit.env_acid_ratio! >= 0.3 && kit.env_acid_ratio! <= 0.5 ? "good" : "watch") : mbConfirmed ? "watch" : "pending"} targetMin={0.3} targetMax={0.5} valueForIndicator={hasOral ? kit.env_acid_ratio! : undefined} rangeMin={0} rangeMax={1} explanation={hasOral ? "The ratio of acid-making bacteria to acid-buffering ones. When saliva dries up overnight, acid producers expand and enamel loses its overnight protection." : mbConfirmed ? "Mouth breathing at night tends to raise acid-producing bacteria. We'll measure the exact level once your oral sample is processed." : "The ratio of acid-making bacteria to acid-buffering ones."} species="Streptococcus mutans · S. sobrinus · Lactobacillus" />
          <MetricCard label="Aerobic shift" value={hasOral ? fmtPct(kit.env_aerobic_score_pct, 1) : mbConfirmed ? "Higher than typical likely" : "—"} status={hasOral ? (kit.env_aerobic_score_pct! > 35 ? "watch" : "good") : mbConfirmed ? "watch" : "pending"} targetMax={35} valueForIndicator={hasOral ? kit.env_aerobic_score_pct! : undefined} rangeMin={0} rangeMax={60} explanation={hasOral ? "Oxygen-loving bacteria that expand when your mouth is open all night. Not inherently harmful, but the shift itself is a signature of altered nighttime breathing." : mbConfirmed ? "Based on your questionnaire, we'd expect these to be higher than typical. Your oral panel will show the exact level." : "Oxygen-loving bacteria that expand when your mouth gets more air than usual."} species="Rothia · Actinomyces · Haemophilus · Neisseria" />
          {hasWearable && wearable!.avg_spo2 != null ? (
            <MetricCard label="Oxygen saturation" value={`${wearable!.avg_spo2.toFixed(1)}%`} status={wearable!.avg_spo2 >= 95 ? "good" : "watch"} targetMin={95} valueForIndicator={wearable!.avg_spo2} rangeMin={88} rangeMax={100} explanation={`Average overnight oxygen across ${wearable!.nights_available} nights. Stable SpO₂ with no dips below 94% makes significant breathing disruption less likely.`} species="Overnight SpO₂ from your wearable" />
          ) : hasWearable && wearable!.avg_respiratory_rate != null ? (
            <MetricCard label="Breathing rate" value={`${wearable!.avg_respiratory_rate.toFixed(1)} bpm`} status={wearable!.avg_respiratory_rate <= 18 ? "good" : "watch"} targetMin={12} targetMax={18} valueForIndicator={wearable!.avg_respiratory_rate} rangeMin={8} rangeMax={25} explanation={`Average overnight breathing rate across ${wearable!.nights_available} nights.`} species="Overnight breathing rate from your wearable" />
          ) : (
            <MetricCard label="Overnight oxygen" value="—" status="pending" explanation="Connecting a wearable would show whether your breathing pattern is affecting overnight oxygen levels." species="SpO₂ tracking from your wearable" />
          )}
        </div>
      </div>

      <SectionHeader title="Cavity risk" subtitle="Bacteria that cause cavities vs. those that protect against them." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        <div>
          <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#D42B2B", marginBottom: 10 }}>Cavity-makers · {kit.s_mutans_pct != null ? fmtPct(riskTotal) : "—"}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <MetricCard label="S. mutans" value={kit.s_mutans_pct ?? "—"} valueSuffix="%" status={kit.s_mutans_pct == null ? "pending" : riskTotal < 0.5 ? "good" : riskTotal < 1.0 ? "watch" : "concern"} targetMax={0.5} valueForIndicator={kit.s_mutans_pct ?? undefined} rangeMin={0} rangeMax={2} explanation="The main troublemaker. It turns sugar into acid, and that acid wears down enamel." />
            <MetricCard label="S. sobrinus" value={kit.s_sobrinus_pct ?? "—"} valueSuffix="%" status={kit.s_sobrinus_pct == null ? "pending" : kit.s_sobrinus_pct < 0.5 ? "good" : "watch"} targetMax={0.5} valueForIndicator={kit.s_sobrinus_pct ?? undefined} rangeMin={0} rangeMax={2} explanation="S. mutans' partner — they often show up together in active cavities." />
            <MetricCard label="Scardovia" value={kit.scardovia_pct ?? "—"} valueSuffix="%" status={kit.scardovia_pct == null ? "pending" : kit.scardovia_pct < 0.2 ? "good" : "watch"} targetMax={0.2} valueForIndicator={kit.scardovia_pct ?? undefined} rangeMin={0} rangeMax={1} explanation="Shows up in fast-moving cavities, especially in kids." />
            <MetricCard label="Lactobacillus" value={kit.lactobacillus_pct ?? "—"} valueSuffix="%" status={kit.lactobacillus_pct == null ? "pending" : kit.lactobacillus_pct < 0.1 ? "good" : "concern"} targetMax={0.1} valueForIndicator={kit.lactobacillus_pct ?? undefined} rangeMin={0} rangeMax={1} explanation="Hangs around in cavities that are already active. Finding none is a good sign." />
          </div>
        </div>
        <div>
          <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1A8C4E", marginBottom: 10 }}>Protectors · {kit.s_sanguinis_pct != null ? fmtPct((kit.s_sanguinis_pct ?? 0) + (kit.s_gordonii_pct ?? 0)) : "—"}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <MetricCard label="S. sanguinis" value={kit.s_sanguinis_pct ?? "—"} valueSuffix="%" status={kit.s_sanguinis_pct == null ? "pending" : kit.s_sanguinis_pct >= 1.5 ? "good" : "watch"} targetMin={1.5} targetMax={3} valueForIndicator={kit.s_sanguinis_pct ?? undefined} rangeMin={0} rangeMax={5} explanation="Neutralises the acid that cavity-makers produce." />
            <MetricCard label="S. gordonii" value={kit.s_gordonii_pct ?? "—"} valueSuffix="%" status={kit.s_gordonii_pct == null ? "pending" : kit.s_gordonii_pct >= 0.3 ? "good" : "watch"} targetMin={0.3} valueForIndicator={kit.s_gordonii_pct ?? undefined} rangeMin={0} rangeMax={2} explanation="One of the first good bacteria to move in. Helps set up a stable, healthy mix." />
          </div>
        </div>
      </div>
      {kit.streptococcus_total_pct != null && kit.s_salivarius_pct != null && (
        <div style={{ background: "#FAFAF8", border: "1px solid #E8E6E0", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
          <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9B9891", marginBottom: 4 }}>A note on Streptococcus</p>
          <p style={{ fontFamily: sans, fontSize: 12, color: "#5C5A54", lineHeight: 1.5, margin: 0 }}>Your total Streptococcus looks high at <strong>{fmtPct(kit.streptococcus_total_pct)}</strong>, but <strong>{fmtPct(kit.s_salivarius_pct)}</strong> of that is S. salivarius — a harmless, helpful type.</p>
        </div>
      )}

      <SectionHeader title="Gum health" subtitle="Bacteria linked to gum inflammation and periodontal disease." />
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#D42B2B", marginBottom: 10 }}>Main gum-disease bacteria · {kit.porphyromonas_pct != null ? fmtPct(redTotal) : "—"}</p>
        <div className="panel-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <MetricCard label="Porphyromonas" value={kit.porphyromonas_pct ?? "—"} valueSuffix="%" status={kit.porphyromonas_pct == null ? "pending" : kit.porphyromonas_pct < 0.5 ? "good" : "concern"} targetMax={0.5} valueForIndicator={kit.porphyromonas_pct ?? undefined} rangeMin={0} rangeMax={5} explanation="The most studied gum-disease bacterium. Can release things into your bloodstream that cause inflammation throughout your body." />
          <MetricCard label="Tannerella" value={kit.tannerella_pct ?? "—"} valueSuffix="%" status={kit.tannerella_pct == null ? "pending" : kit.tannerella_pct < 0.5 ? "good" : "concern"} targetMax={0.5} valueForIndicator={kit.tannerella_pct ?? undefined} rangeMin={0} rangeMax={5} explanation="Usually shows up with Porphyromonas. Research links higher levels to higher LDL cholesterol." />
          <MetricCard label="Treponema" value={kit.treponema_pct ?? "—"} valueSuffix="%" status={kit.treponema_pct == null ? "pending" : kit.treponema_pct < 0.5 ? "good" : "concern"} targetMax={0.5} valueForIndicator={kit.treponema_pct ?? undefined} rangeMin={0} rangeMax={5} explanation="A corkscrew-shaped bacterium found in deeper gum pockets." />
        </div>
        <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#E07B00", marginBottom: 10 }}>Early-stage gum bacteria · {kit.fusobacterium_pct != null ? fmtPct(orangeTotal) : "—"}</p>
        <div className="panel-grid-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          <MetricCard label="Fusobacterium" value={kit.fusobacterium_pct ?? "—"} valueSuffix="%" status={kit.fusobacterium_pct == null ? "pending" : kit.fusobacterium_pct < 0.5 ? "good" : kit.fusobacterium_pct < 2 ? "watch" : "concern"} targetMax={0.5} valueForIndicator={kit.fusobacterium_pct ?? undefined} rangeMin={0} rangeMax={5} explanation="The connector bacterium — it links up early and late settlers in plaque." />
          <MetricCard label="Aggregatibacter" value={kit.aggregatibacter_pct ?? "—"} valueSuffix="%" status={kit.aggregatibacter_pct == null ? "pending" : kit.aggregatibacter_pct < 0.5 ? "good" : "concern"} targetMax={0.5} valueForIndicator={kit.aggregatibacter_pct ?? undefined} rangeMin={0} rangeMax={5} explanation="Linked to faster-moving forms of gum disease, especially in younger adults." />
          <MetricCard label="Campylobacter" value={kit.campylobacter_pct ?? "—"} valueSuffix="%" status={kit.campylobacter_pct == null ? "pending" : kit.campylobacter_pct < 0.5 ? "good" : "watch"} targetMax={0.5} valueForIndicator={kit.campylobacter_pct ?? undefined} rangeMin={0} rangeMax={5} explanation="Shows up during early gum inflammation." />
          <MetricCard label="P. intermedia" value={kit.prevotella_intermedia_pct ?? "—"} valueSuffix="%" status={kit.prevotella_intermedia_pct == null ? "pending" : kit.prevotella_intermedia_pct < 0.5 ? "good" : "watch"} targetMax={0.5} valueForIndicator={kit.prevotella_intermedia_pct ?? undefined} rangeMin={0} rangeMax={5} explanation="The one Prevotella species you don't want. Most other Prevotella are harmless." />
        </div>
      </div>
      {kit.prevotella_commensal_pct != null && (
        <div style={{ background: "#FAFAF8", border: "1px solid #E8E6E0", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
          <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9B9891", marginBottom: 4 }}>A note on Prevotella</p>
          <p style={{ fontFamily: sans, fontSize: 12, color: "#5C5A54", lineHeight: 1.5, margin: 0 }}>You have <strong>{fmtPct(kit.prevotella_commensal_pct)}</strong> of other Prevotella types — the harmless kinds. Only P. intermedia above is the gum-disease one.</p>
        </div>
      )}
      <PanelInsight
        picture={narrative?.section_opening ?? null}
        converge={narrative?.section_cardiometabolic ?? narrative?.section_breathing ?? null}
        actions={narrative?.section_gum_caries ?? null}
      />

      {narrative?.section_disclaimer && (
        <div style={{ borderTop: "1px solid #E8E6E0", paddingTop: 24, marginTop: 16 }}>
          <p style={{ fontFamily: sans, fontSize: 12, fontStyle: "italic", color: "#9B9891", lineHeight: 1.5 }}>{narrative.section_disclaimer}</p>
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
          .panel-grid-4 { grid-template-columns: 1fr !important; }
        }
        .metric-card:hover, .feature-card:hover { background: #FDFCF8 !important; }
      `}</style>
    </div>
  )
}

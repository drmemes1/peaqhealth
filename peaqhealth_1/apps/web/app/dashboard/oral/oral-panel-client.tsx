// ============================================================================
// ORAL PANEL — LAYMAN REDESIGN
// ============================================================================
"use client"

import { useMemo } from "react"

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
  raw_otu_table: RawOtuTable | null
}

type RawOtuEntry = {
  taxonomy_full: string
  phylum: string
  genus: string
  species: string
  is_named: boolean
  is_placeholder: boolean
  pct: number
  mapped_column: string | null
}

type RawOtuTable = {
  [key: string]: unknown
  __meta?: {
    entries?: RawOtuEntry[]
    community_summary?: {
      total_entries_present: number
      named_species_count: number
      unnamed_placeholder_count: number
      distinct_genera: number
      distinct_phyla: number
    }
  }
}

type TileStatus = "optimal" | "watch" | "low" | "pending" | "neutral"

function formatPct(v: number | null, decimals = 2): string {
  if (v == null) return "—"
  return `${v.toFixed(decimals)}%`
}
function formatNum(v: number | null, decimals = 2): string {
  if (v == null) return "—"
  return v.toFixed(decimals)
}
function speciesInGenus(raw: RawOtuTable | null, genus: string): RawOtuEntry[] {
  if (!raw?.__meta?.entries) return []
  return raw.__meta.entries
    .filter((e) => e.genus.toLowerCase() === genus.toLowerCase() && e.pct > 0)
    .sort((a, b) => b.pct - a.pct)
}
function dotColor(status: TileStatus): string {
  return { optimal: "bg-emerald-500", watch: "bg-amber-500", low: "bg-rose-500", pending: "bg-neutral-300", neutral: "bg-neutral-400" }[status]
}
function statusLabel(status: TileStatus): string {
  return { optimal: "Good", watch: "Watch", low: "Attention", pending: "Pending", neutral: "Info" }[status]
}

function Tile({ title, value, target, status, note, bar, breakdown }: {
  title: string; value: string; target: string; status: TileStatus; note: string
  bar?: { pct: number; max: number; optimal: [number, number] }
  breakdown?: RawOtuEntry[]
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-neutral-900 leading-tight">{title}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Target: {target}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor(status)}`} />
          <span>{statusLabel(status)}</span>
        </div>
      </div>
      <div className="text-[26px] font-light text-neutral-900 leading-none tracking-tight">{value}</div>
      {bar && (
        <div className="space-y-1">
          <div className="relative h-1.5 bg-neutral-100 rounded-full overflow-hidden max-w-[140px]">
            <div className="absolute inset-y-0 bg-emerald-100" style={{ left: `${(bar.optimal[0] / bar.max) * 100}%`, width: `${((bar.optimal[1] - bar.optimal[0]) / bar.max) * 100}%` }} />
            <div className="absolute top-1/2 w-2 h-2 rounded-full bg-neutral-900" style={{ left: `${Math.min(Math.max((bar.pct / bar.max) * 100, 0), 100)}%`, transform: "translate(-50%, -50%)" }} />
          </div>
          <div className="flex justify-between text-[10px] text-neutral-400 max-w-[140px]"><span>0</span><span>{bar.max}%</span></div>
        </div>
      )}
      <p className="text-[12px] text-neutral-500 leading-relaxed">{note}</p>
      {breakdown && breakdown.length > 0 && (
        <details className="text-[11px] text-neutral-500 mt-1">
          <summary className="cursor-pointer hover:text-neutral-700 select-none">View {breakdown.length} species</summary>
          <div className="mt-2 space-y-1 pl-2 border-l border-neutral-100">
            {breakdown.slice(0, 8).map((entry, i) => (
              <div key={i} className="flex justify-between text-[11px] gap-2">
                <span className="text-neutral-600 italic truncate">{entry.genus} {entry.species}</span>
                <span className="text-neutral-900 tabular-nums shrink-0">{entry.pct.toFixed(2)}%</span>
              </div>
            ))}
            {breakdown.length > 8 && <div className="text-[10px] text-neutral-400 italic">+ {breakdown.length - 8} more</div>}
          </div>
        </details>
      )}
    </div>
  )
}

function CommunitySection({ kit }: { kit: OralKitRow }) {
  const summary = kit.raw_otu_table?.__meta?.community_summary
  const shannon = kit.shannon_diversity
  const diversityStatus: TileStatus = shannon == null ? "pending" : shannon >= 4.0 && shannon <= 6.5 ? "optimal" : shannon < 3.5 ? "low" : "watch"
  return (
    <section>
      <h2 className="text-[15px] font-medium text-neutral-900 mb-1">Community health</h2>
      <p className="text-[12px] text-neutral-500 mb-4">A healthy mouth has lots of different bacteria in balance — not one or two kinds taking over.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Tile title="Variety score" value={formatNum(shannon, 2)} target="4.0 – 6.5" status={diversityStatus} note="How many different bacteria live in your mouth and how evenly mixed they are. A wider mix usually means a healthier mouth." bar={shannon != null ? { pct: shannon, max: 8, optimal: [4.0, 6.5] } : undefined} />
        <Tile title="Different species found" value={summary?.named_species_count?.toString() ?? "—"} target="typical 80 – 150" status={summary?.named_species_count == null ? "pending" : summary.named_species_count >= 80 ? "optimal" : "watch"} note={summary ? `We identified ${summary.named_species_count} named species across ${summary.distinct_genera} bacterial families. ${summary.unnamed_placeholder_count} more were detected but don't have official names yet.` : "The count of named bacterial species we found in your sample."} />
        <Tile title="Total bacteria found" value={summary?.total_entries_present?.toString() ?? "—"} target="full picture" status="neutral" note="Every bacterial signal we picked up — named and unnamed combined. We keep all of this data so we can revisit it as research advances." />
      </div>
    </section>
  )
}

function CardioSection({ kit }: { kit: OralKitRow }) {
  const primaryTotal = (kit.neisseria_pct ?? 0) + (kit.haemophilus_pct ?? 0)
  const secondaryTotal = (kit.rothia_pct ?? 0) + (kit.actinomyces_pct ?? 0) + (kit.veillonella_pct ?? 0)
  const neisseriaStatus: TileStatus = kit.neisseria_pct == null ? "pending" : kit.neisseria_pct >= 10 ? "optimal" : kit.neisseria_pct >= 5 ? "watch" : "low"
  const haemStatus: TileStatus = kit.haemophilus_pct == null ? "pending" : kit.haemophilus_pct >= 4 ? "optimal" : kit.haemophilus_pct >= 2 ? "watch" : "low"
  return (
    <section>
      <h2 className="text-[15px] font-medium text-neutral-900 mb-1">Heart & metabolism</h2>
      <p className="text-[12px] text-neutral-500 mb-4">Some mouth bacteria help your body make a signal called nitric oxide — it keeps blood vessels relaxed, supports blood pressure, and plays a role in how you manage blood sugar. Leafy greens feed these bacteria.</p>
      <div className="mb-4">
        <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-2">Main helpers · {kit.neisseria_pct != null ? formatPct(primaryTotal) : "—"}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Tile title="Neisseria (all types)" value={formatPct(kit.neisseria_pct)} target="10 – 13%" status={neisseriaStatus} note="The headline player here. Strong levels mean your mouth is doing good work converting food into the signal your blood vessels rely on." bar={kit.neisseria_pct != null ? { pct: kit.neisseria_pct, max: 20, optimal: [10, 13] } : undefined} breakdown={speciesInGenus(kit.raw_otu_table, "Neisseria")} />
          <Tile title="Haemophilus (all types)" value={formatPct(kit.haemophilus_pct)} target="≥ 4%" status={haemStatus} note="Works in tandem with Neisseria. Research has linked lower levels to how well your body handles blood sugar." bar={kit.haemophilus_pct != null ? { pct: kit.haemophilus_pct, max: 10, optimal: [4, 6] } : undefined} breakdown={speciesInGenus(kit.raw_otu_table, "Haemophilus")} />
        </div>
      </div>
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-2">Support crew · {kit.rothia_pct != null ? formatPct(secondaryTotal) : "—"}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Tile title="Rothia" value={formatPct(kit.rothia_pct)} target="3 – 10%" status={kit.rothia_pct == null ? "pending" : kit.rothia_pct >= 3 && kit.rothia_pct <= 10 ? "optimal" : "watch"} note="Does the first step in turning leafy greens into the good stuff your blood vessels use." breakdown={speciesInGenus(kit.raw_otu_table, "Rothia")} />
          <Tile title="Actinomyces" value={formatPct(kit.actinomyces_pct)} target="3 – 10%" status={kit.actinomyces_pct == null ? "pending" : kit.actinomyces_pct >= 3 && kit.actinomyces_pct <= 10 ? "optimal" : "watch"} note="Also helps with the nitric oxide pipeline and keeps your mouth's acidity in check." breakdown={speciesInGenus(kit.raw_otu_table, "Actinomyces")} />
          <Tile title="Veillonella" value={formatPct(kit.veillonella_pct)} target="1 – 5%" status={kit.veillonella_pct == null ? "pending" : kit.veillonella_pct >= 1 && kit.veillonella_pct <= 5 ? "optimal" : "watch"} note="Cleans up lactic acid, which helps protect tooth enamel." breakdown={speciesInGenus(kit.raw_otu_table, "Veillonella")} />
        </div>
      </div>
    </section>
  )
}

type QuestionnaireData = {
  mouth_breathing?: string | null
  mouth_breathing_when?: string | null
  snoring_reported?: string | null
  nasal_obstruction?: string | null
  nasal_obstruction_severity?: string | null
  osa_witnessed?: string | null
  non_restorative_sleep?: string | null
  morning_headaches?: string | null
  bruxism_night?: string | null
  daytime_cognitive_fog?: string | null
} | null

type WearableData = {
  nights_available: number
  avg_spo2: number | null
  avg_respiratory_rate: number | null
  avg_rhr: number | null
} | null

function BreathingSection({ kit, questionnaire, wearable }: { kit: OralKitRow; questionnaire?: QuestionnaireData; wearable?: WearableData }) {
  const hasOral = kit.env_pattern != null
  const hasWearable = wearable != null && wearable.nights_available > 0
  const hasQ = questionnaire != null && (questionnaire.mouth_breathing != null || questionnaire.snoring_reported != null || questionnaire.mouth_breathing_when != null)

  const mbSignals = questionnaire?.mouth_breathing === "confirmed" || questionnaire?.mouth_breathing === "often" ||
    questionnaire?.mouth_breathing_when === "sleep_only" || questionnaire?.mouth_breathing_when === "daytime_and_sleep"

  const oralAerobicShift = hasOral && kit.env_aerobic_score_pct != null && kit.env_aerobic_score_pct > 35

  // Pattern card — staged, non-diagnostic
  let headline: string
  let body: string
  let badge: string
  let badgeColor: string

  if (hasOral && hasQ && hasWearable) {
    if (mbSignals && oralAerobicShift) {
      headline = "Mouth breathing pattern across all three panels"
      body = "Your questionnaire, wearable, and oral microbiome are all consistent with mouth breathing at night. Detailed results below."
      badge = "questionnaire + wearable + oral"
      badgeColor = "#B8860B"
    } else if (mbSignals && !oralAerobicShift) {
      headline = "Mixed signals — worth watching"
      body = "Your questionnaire and wearable point toward mouth breathing, but your oral community has not shown the aerobic shift usually associated with this pattern. This can happen — your microbiome may be compensating well."
      badge = "mixed signal"
      badgeColor = "#9B9891"
    } else {
      const p = kit.env_pattern!
      headline = p === "balanced" ? "Settled pattern" : p.replace(/_/g, " ")
      body = p === "balanced" ? "Your mouth looks like it's breathing easy overnight — saliva flowing, bacteria in balance."
        : p === "osa_consistent" ? "The pattern in your mouth matches what population research associates with disrupted nighttime breathing. Worth a closer look."
        : p.includes("peroxide") ? "Some of your pattern could be explained by recent whitening products — they affect bacteria the same way breathing changes do."
        : p === "anaerobic_dominant" ? "Your mouth has more gum-area bacteria active than breathing-related ones."
        : p === "mixed" ? "A mixed picture — some signs of drier overnight conditions alongside active gum bacteria."
        : "Signs point to mouth breathing during sleep — your mouth is drier overnight and the bacteria reflect it."
      badge = "oral microbiome"
      badgeColor = "#3B6D11"
    }
  } else if (hasOral) {
    const p = kit.env_pattern!
    headline = p === "balanced" ? "Settled pattern" : p.replace(/_/g, " ")
    body = p === "balanced" ? "Your mouth looks like it's breathing easy overnight — saliva flowing, bacteria in balance."
      : p === "mouth_breathing" ? "Signs point to mouth breathing during sleep — your mouth is drier overnight and the bacteria reflect it."
      : p === "osa_consistent" ? "The pattern in your mouth matches what population research associates with disrupted nighttime breathing. Worth a closer look."
      : p.includes("peroxide") ? "Some of your pattern could be explained by recent whitening products."
      : p === "mixed" ? "A mixed picture — some signs of drier overnight conditions alongside active gum bacteria."
      : p === "anaerobic_dominant" ? "Your mouth has more gum-area bacteria active than breathing-related ones."
      : ""
    badge = "oral microbiome"
    badgeColor = "#3B6D11"
  } else if (hasQ && hasWearable) {
    headline = mbSignals ? "Mouth breathing pattern detected" : "Breathing data gathered"
    body = mbSignals
      ? "Your questionnaire and wearable both point toward mouth breathing. Your oral microbiome will add the next layer of detail."
      : "Your wearable and questionnaire data are in. Once your oral sample is processed, we can see the full picture."
    badge = "questionnaire + wearable"
    badgeColor = "#B8860B"
  } else if (hasQ) {
    headline = mbSignals ? "Mouth breathing signals in your sleep questionnaire" : "Questionnaire complete"
    body = mbSignals
      ? "Your questionnaire responses suggest you may breathe through your mouth at night. Connecting a wearable would let us cross-reference this with objective overnight data."
      : "Your questionnaire responses are recorded. Oral and wearable data will complete the picture."
    badge = "questionnaire"
    badgeColor = "#B8860B"
  } else if (hasWearable) {
    headline = "Breathing data gathered"
    body = "Your overnight breathing metrics are in. Your questionnaire and oral sample will complete the picture."
    badge = "wearable"
    badgeColor = "#185FA5"
  } else {
    headline = "Still gathering your data"
    body = "Your questionnaire, wearable, and oral sample will each add a layer to your overnight pattern."
    badge = "pending"
    badgeColor = "#9B9891"
  }

  // Card 1 — Acid balance
  const acidValue = hasOral ? formatNum(kit.env_acid_ratio, 2) : mbSignals ? "Higher likely" : "—"
  const acidStatus: TileStatus = hasOral ? (kit.env_acid_ratio! >= 0.3 && kit.env_acid_ratio! <= 0.5 ? "optimal" : "watch") : mbSignals ? "watch" : "pending"
  const acidNote = "The ratio of acid-making bacteria to acid-buffering ones. When saliva dries up overnight, acid producers expand and enamel loses its overnight protection."
  const acidExpand = mbSignals && !hasOral
    ? { why: `Your wearable tracked ${wearable?.nights_available ?? "several"} nights of breathing consistent with mouth breathing. Without saliva flowing, S. mutans and Lactobacillus species tend to expand — they produce lactic acid that gradually affects enamel.`, action: "Treat the root — nasal strips or myofunctional therapy to restore nasal breathing. Xylitol mints before bed starve S. mutans specifically. Hydroxyapatite toothpaste supports enamel remineralisation." }
    : undefined

  // Card 2 — Aerobic shift
  const aerobicValue = hasOral ? formatPct(kit.env_aerobic_score_pct, 1) : mbSignals ? "Higher than typical likely" : "—"
  const aerobicStatus: TileStatus = hasOral ? (kit.env_aerobic_score_pct! > 35 ? "watch" : "optimal") : mbSignals ? "watch" : "pending"
  const aerobicNote = "Oxygen-loving bacteria that expand when your mouth is open all night. Not inherently harmful, but the shift itself is a signature of altered nighttime breathing."
  const aerobicExpand = mbSignals && !hasOral
    ? { why: "An open mouth exposes your tongue to air all night. Rothia and Actinomyces thrive in that environment. A 2025 study (Li et al.) found Rothia specifically elevated in people with both altered breathing and gum changes.", action: "Restoring nasal breathing tends to reverse this shift within 4 to 6 weeks. Species balance follows environment — change the input, the output changes." }
    : undefined

  // Card 3 — SpO2 or breathing rate (conditional)
  const hasSpo2 = hasWearable && wearable!.avg_spo2 != null
  const hasRR = hasWearable && wearable!.avg_respiratory_rate != null

  return (
    <section>
      <h2 className="text-[15px] font-medium text-neutral-900 mb-1">Sleep & breathing</h2>
      <p className="text-[12px] text-neutral-500 mb-4">Your mouth changes overnight — saliva slows, oxygen levels shift, bacteria rearrange. The patterns here reflect what's happening while you sleep.</p>

      {/* Pattern card */}
      <div className="rounded-2xl overflow-hidden mb-4" style={{ borderLeft: `3px solid ${badgeColor}`, background: "linear-gradient(135deg, #FDFAF2, #FAFAF8)" }}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#9B9891" }}>Your overnight pattern</div>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: badgeColor }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: badgeColor }} />
              <span className="capitalize">{badge}</span>
            </div>
          </div>
          <h3 className="mb-1.5" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 400, color: "#141410", lineHeight: 1.3 }}>
            {headline}
          </h3>
          <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, color: "#5C5A54", lineHeight: 1.6 }}>
            {body}
          </p>
          {hasWearable && (
            <div className="mt-3 text-[11px] rounded-md px-3 py-2 border" style={{ color: "#5C5A54", background: "#fff", borderColor: "rgba(20,20,16,0.08)" }}>
              {wearable!.nights_available} nights tracked
              {wearable!.avg_spo2 != null && <> · SpO₂ {wearable!.avg_spo2.toFixed(1)}%</>}
              {wearable!.avg_respiratory_rate != null && <> · Breathing rate {wearable!.avg_respiratory_rate.toFixed(1)} bpm</>}
              {wearable!.avg_rhr != null && <> · RHR {wearable!.avg_rhr.toFixed(0)} bpm</>}
            </div>
          )}
          {kit.env_peroxide_flag && (
            <div className="mt-3 text-[11px] text-amber-800 bg-amber-50 rounded-md px-2.5 py-1.5 border border-amber-100">Heads up: you're using whitening products. They can look similar to breathing-related changes in this data.</div>
          )}
        </div>
      </div>

      {/* Three metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Acid balance */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[13px] font-medium text-neutral-900">Acid balance</div>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor(acidStatus)}`} /><span>{statusLabel(acidStatus)}</span>
            </div>
          </div>
          <p className="text-[11px] italic" style={{ color: "#888780" }}>Streptococcus mutans · S. sobrinus · Lactobacillus</p>
          <div className="text-[11px]" style={{ color: "#B8860B" }}>Target: <span className="font-medium">0.3 – 0.5</span></div>
          <div className="text-[26px] font-light text-neutral-900 leading-none tracking-tight" style={{ color: !hasOral && mbSignals ? "#B8860B" : undefined, fontStyle: !hasOral && mbSignals ? "italic" : undefined }}>
            {acidValue}
          </div>
          <p className="text-[12px] text-neutral-500 leading-relaxed">{acidNote}</p>
          {acidExpand && (
            <details className="text-[11px] text-neutral-500 mt-1">
              <summary className="cursor-pointer hover:text-neutral-700 select-none">What this means for you ↓</summary>
              <div className="mt-2 space-y-2 pl-2 border-l border-neutral-100">
                <div><span className="font-medium text-neutral-700">Why you're likely running higher:</span> <span className="text-neutral-600">{acidExpand.why}</span></div>
                <div><span className="font-medium text-neutral-700">What you can do:</span> <span className="text-neutral-600">{acidExpand.action}</span></div>
              </div>
            </details>
          )}
        </div>

        {/* Aerobic shift */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[13px] font-medium text-neutral-900">Aerobic shift</div>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor(aerobicStatus)}`} /><span>{statusLabel(aerobicStatus)}</span>
            </div>
          </div>
          <p className="text-[11px] italic" style={{ color: "#888780" }}>Rothia · Actinomyces · Haemophilus · Neisseria</p>
          <div className="text-[11px]" style={{ color: "#B8860B" }}>Target: <span className="font-medium">20 – 35%</span></div>
          <div className="text-[26px] font-light text-neutral-900 leading-none tracking-tight" style={{ color: !hasOral && mbSignals ? "#B8860B" : undefined, fontStyle: !hasOral && mbSignals ? "italic" : undefined }}>
            {aerobicValue}
          </div>
          <p className="text-[12px] text-neutral-500 leading-relaxed">{aerobicNote}</p>
          {aerobicExpand && (
            <details className="text-[11px] text-neutral-500 mt-1">
              <summary className="cursor-pointer hover:text-neutral-700 select-none">What this means for you ↓</summary>
              <div className="mt-2 space-y-2 pl-2 border-l border-neutral-100">
                <div><span className="font-medium text-neutral-700">The biology:</span> <span className="text-neutral-600">{aerobicExpand.why}</span></div>
                <div><span className="font-medium text-neutral-700">What you can do:</span> <span className="text-neutral-600">{aerobicExpand.action}</span></div>
              </div>
            </details>
          )}
        </div>

        {/* Card 3 — SpO2 / Breathing rate / Placeholder */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 flex flex-col gap-3">
          {hasSpo2 ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13px] font-medium text-neutral-900">Oxygen saturation</div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${wearable!.avg_spo2! >= 95 ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span>{wearable!.avg_spo2! >= 95 ? "Good" : "Watch"}</span>
                </div>
              </div>
              <p className="text-[11px] italic" style={{ color: "#888780" }}>Overnight SpO₂ from your wearable</p>
              <div className="text-[11px]" style={{ color: "#B8860B" }}>Target: <span className="font-medium">≥ 95%</span></div>
              <div className="text-[26px] font-light text-neutral-900 leading-none tracking-tight">
                {wearable!.avg_spo2!.toFixed(1)}%
              </div>
              <p className="text-[12px] text-neutral-500 leading-relaxed">
                Average overnight oxygen saturation across {wearable!.nights_available} nights. Stable SpO₂ with no dips below 94% makes significant breathing disruption less likely.
              </p>
              {mbSignals && wearable!.avg_spo2! >= 95 && (
                <details className="text-[11px] text-neutral-500 mt-1">
                  <summary className="cursor-pointer hover:text-neutral-700 select-none">What this means for you ↓</summary>
                  <div className="mt-2 pl-2 border-l border-neutral-100">
                    <span className="text-neutral-600">Your breathing pattern suggests mouth breathing, and your oxygen picture looks stable. This combination tends to point toward habitual mouth breathing rather than deeper breathing disruption — two different patterns with different next steps.</span>
                  </div>
                </details>
              )}
            </>
          ) : hasRR ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13px] font-medium text-neutral-900">Breathing rate</div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${wearable!.avg_respiratory_rate! <= 18 ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span>{wearable!.avg_respiratory_rate! <= 18 ? "Good" : "Watch"}</span>
                </div>
              </div>
              <p className="text-[11px] italic" style={{ color: "#888780" }}>Overnight breathing rate from your wearable</p>
              <div className="text-[11px]" style={{ color: "#B8860B" }}>Target: <span className="font-medium">12 – 18 bpm</span></div>
              <div className="text-[26px] font-light text-neutral-900 leading-none tracking-tight">
                {wearable!.avg_respiratory_rate!.toFixed(1)} bpm
              </div>
              <p className="text-[12px] text-neutral-500 leading-relaxed">
                Average overnight breathing rate across {wearable!.nights_available} nights.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13px] font-medium text-neutral-900">Overnight oxygen</div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" /><span>Wearable needed</span>
                </div>
              </div>
              <p className="text-[11px] italic" style={{ color: "#888780" }}>SpO₂ tracking from your wearable</p>
              <div className="text-[26px] font-light text-neutral-300 leading-none tracking-tight">—</div>
              <p className="text-[12px] text-neutral-500 leading-relaxed">
                Connecting a wearable would let us see whether your mouth breathing is affecting overnight oxygen levels.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Narrative paragraph — contextual bottom card */}
      {(hasQ || hasWearable) && !hasOral && (
        <div className="mt-4 rounded-xl overflow-hidden" style={{ borderLeft: "3px solid #B8860B", background: "#FDFAF2" }}>
          <div className="p-5">
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontStyle: "italic", color: "#3D3B35", lineHeight: 1.65 }}>
              {(() => {
                const snoring = questionnaire?.snoring_reported === "occasional" || questionnaire?.snoring_reported === "frequent"
                const parts: string[] = []
                if (snoring) parts.push("Your sleep questionnaire mentions occasional snoring")
                if (mbSignals) parts.push(snoring ? "and mouth breathing" : "Your questionnaire indicates mouth breathing")
                if (hasWearable) {
                  parts.push(`. Your wearable backs that up: ${wearable!.nights_available} nights tracked`)
                  if (wearable!.avg_respiratory_rate != null) parts.push(`, breathing rate at ${wearable!.avg_respiratory_rate.toFixed(1)} bpm`)
                  if (wearable!.avg_spo2 != null && wearable!.avg_spo2 >= 95) parts.push(`, oxygen levels stable with no dips below 94%`)
                  if (wearable!.avg_spo2 != null && wearable!.avg_spo2 >= 95) parts.push(". This combination tells us breathing pattern is the signal, not significant oxygen disruption")
                  if (wearable!.avg_rhr != null && wearable!.avg_rhr > 65) parts.push(`. Your resting heart rate at ${wearable!.avg_rhr.toFixed(0)} bpm is worth watching as you address the breathing`)
                }
                parts.push(". Your oral sample will add another layer to this picture.")
                return parts.join("")
              })()}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

function CariesSection({ kit }: { kit: OralKitRow }) {
  const riskTotal = (kit.s_mutans_pct ?? 0) + (kit.s_sobrinus_pct ?? 0)
  const protectiveTotal = (kit.s_sanguinis_pct ?? 0) + (kit.s_gordonii_pct ?? 0)
  const riskStatus: TileStatus = kit.s_mutans_pct == null ? "pending" : riskTotal >= 1.0 ? "low" : riskTotal >= 0.5 ? "watch" : "optimal"
  const protectiveStatus: TileStatus = kit.s_sanguinis_pct == null ? "pending" : kit.s_sanguinis_pct >= 1.5 ? "optimal" : "watch"
  return (
    <section>
      <h2 className="text-[15px] font-medium text-neutral-900 mb-1">Cavity risk</h2>
      <p className="text-[12px] text-neutral-500 mb-4">Some bacteria cause cavities by making acid from sugar. Others protect you by neutralising that acid. It's a constant balance.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-rose-500 mb-2">Cavity-makers · {kit.s_mutans_pct != null ? formatPct(riskTotal) : "—"}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Tile title="S. mutans" value={formatPct(kit.s_mutans_pct, 3)} target="< 0.5%" status={riskStatus} note="The main troublemaker. It turns sugar into acid, and that acid wears down enamel." bar={kit.s_mutans_pct != null ? { pct: kit.s_mutans_pct, max: 2, optimal: [0, 0.5] } : undefined} />
            <Tile title="S. sobrinus" value={formatPct(kit.s_sobrinus_pct, 3)} target="< 0.5%" status={kit.s_sobrinus_pct == null ? "pending" : kit.s_sobrinus_pct < 0.5 ? "optimal" : "watch"} note="S. mutans' partner — they often show up together in active cavities." />
            <Tile title="Scardovia" value={formatPct(kit.scardovia_pct, 3)} target="< 0.2%" status={kit.scardovia_pct == null ? "pending" : kit.scardovia_pct < 0.2 ? "optimal" : "watch"} note="Shows up in fast-moving cavities, especially in kids. Likes very acidic mouths." />
            <Tile title="Lactobacillus" value={formatPct(kit.lactobacillus_pct, 3)} target="< 0.1%" status={kit.lactobacillus_pct == null ? "pending" : kit.lactobacillus_pct < 0.1 ? "optimal" : "low"} note="Hangs around in cavities that are already active. Finding none is a good sign." breakdown={speciesInGenus(kit.raw_otu_table, "Lactobacillus")} />
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-600 mb-2">Protectors · {kit.s_sanguinis_pct != null ? formatPct(protectiveTotal) : "—"}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Tile title="S. sanguinis" value={formatPct(kit.s_sanguinis_pct, 3)} target="≥ 1.5%" status={protectiveStatus} note="Neutralises the acid that cavity-makers produce. Also competes with them for space." bar={kit.s_sanguinis_pct != null ? { pct: kit.s_sanguinis_pct, max: 4, optimal: [1.5, 3] } : undefined} />
            <Tile title="S. gordonii" value={formatPct(kit.s_gordonii_pct, 3)} target="≥ 0.3%" status={kit.s_gordonii_pct == null ? "pending" : kit.s_gordonii_pct >= 0.3 ? "optimal" : "watch"} note="One of the first good bacteria to move in. Helps set up a stable, healthy mix." />
          </div>
        </div>
      </div>
      {kit.streptococcus_total_pct != null && kit.s_salivarius_pct != null && (
        <div className="mt-3 rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 mb-1">A note on Streptococcus</div>
          <p className="text-[12px] text-neutral-600 leading-relaxed">Your total Streptococcus looks high at <span className="font-medium text-neutral-900">{formatPct(kit.streptococcus_total_pct)}</span>, but <span className="font-medium text-neutral-900">{formatPct(kit.s_salivarius_pct)}</span> of that is S. salivarius — a harmless, helpful type that lives in healthy mouths. Not all Strep is bad. This is a good sign.</p>
        </div>
      )}
    </section>
  )
}

function GumSection({ kit }: { kit: OralKitRow }) {
  const redTotal = (kit.porphyromonas_pct ?? 0) + (kit.tannerella_pct ?? 0) + (kit.treponema_pct ?? 0)
  const orangeTotal = (kit.fusobacterium_pct ?? 0) + (kit.aggregatibacter_pct ?? 0) + (kit.campylobacter_pct ?? 0) + (kit.prevotella_intermedia_pct ?? 0)
  const redStatus: TileStatus = kit.porphyromonas_pct == null ? "pending" : redTotal < 0.5 ? "optimal" : redTotal < 2.0 ? "watch" : "low"
  const orangeStatus: TileStatus = kit.fusobacterium_pct == null ? "pending" : orangeTotal < 1.0 ? "optimal" : orangeTotal < 3.0 ? "watch" : "low"
  return (
    <section>
      <h2 className="text-[15px] font-medium text-neutral-900 mb-1">Gum health</h2>
      <p className="text-[12px] text-neutral-500 mb-4">Some bacteria live in the pockets between your teeth and gums. A few are the main drivers of gum inflammation and bleeding when they get too comfortable.</p>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-medium uppercase tracking-wider text-rose-600">Main gum-disease bacteria · {kit.porphyromonas_pct != null ? formatPct(redTotal) : "—"}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500"><span className={`w-1.5 h-1.5 rounded-full ${dotColor(redStatus)}`} /><span>{statusLabel(redStatus)}</span></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Tile title="Porphyromonas" value={formatPct(kit.porphyromonas_pct)} target="< 0.5%" status={kit.porphyromonas_pct == null ? "pending" : kit.porphyromonas_pct < 0.5 ? "optimal" : "low"} note="The most studied gum-disease bacterium. Can release things into your bloodstream that cause inflammation throughout your body." bar={kit.porphyromonas_pct != null ? { pct: kit.porphyromonas_pct, max: 5, optimal: [0, 0.5] } : undefined} breakdown={speciesInGenus(kit.raw_otu_table, "Porphyromonas")} />
          <Tile title="Tannerella" value={formatPct(kit.tannerella_pct)} target="< 0.5%" status={kit.tannerella_pct == null ? "pending" : kit.tannerella_pct < 0.5 ? "optimal" : "low"} note="Usually shows up with Porphyromonas. Research links higher levels to higher LDL cholesterol." breakdown={speciesInGenus(kit.raw_otu_table, "Tannerella")} />
          <Tile title="Treponema" value={formatPct(kit.treponema_pct)} target="< 0.5%" status={kit.treponema_pct == null ? "pending" : kit.treponema_pct < 0.5 ? "optimal" : "low"} note="A corkscrew-shaped bacterium found in deeper gum pockets. Signals more advanced gum issues." breakdown={speciesInGenus(kit.raw_otu_table, "Treponema")} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-medium uppercase tracking-wider text-amber-600">Early-stage gum bacteria · {kit.fusobacterium_pct != null ? formatPct(orangeTotal) : "—"}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500"><span className={`w-1.5 h-1.5 rounded-full ${dotColor(orangeStatus)}`} /><span>{statusLabel(orangeStatus)}</span></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile title="Fusobacterium" value={formatPct(kit.fusobacterium_pct)} target="< 0.5%" status={kit.fusobacterium_pct == null ? "pending" : kit.fusobacterium_pct < 0.5 ? "optimal" : kit.fusobacterium_pct < 2 ? "watch" : "low"} note="The connector bacterium — it links up early and late settlers in plaque, helping colonies grow." breakdown={speciesInGenus(kit.raw_otu_table, "Fusobacterium")} />
          <Tile title="Aggregatibacter" value={formatPct(kit.aggregatibacter_pct)} target="< 0.5%" status={kit.aggregatibacter_pct == null ? "pending" : kit.aggregatibacter_pct < 0.5 ? "optimal" : "low"} note="Linked to faster-moving forms of gum disease, especially in younger adults." breakdown={speciesInGenus(kit.raw_otu_table, "Aggregatibacter")} />
          <Tile title="Campylobacter" value={formatPct(kit.campylobacter_pct)} target="< 0.5%" status={kit.campylobacter_pct == null ? "pending" : kit.campylobacter_pct < 0.5 ? "optimal" : "watch"} note="Shows up during early gum inflammation." breakdown={speciesInGenus(kit.raw_otu_table, "Campylobacter")} />
          <Tile title="P. intermedia" value={formatPct(kit.prevotella_intermedia_pct)} target="< 0.5%" status={kit.prevotella_intermedia_pct == null ? "pending" : kit.prevotella_intermedia_pct < 0.5 ? "optimal" : "watch"} note="The one Prevotella species you don't want. Most other Prevotella are harmless — see the note below." />
        </div>
      </div>
      {kit.prevotella_commensal_pct != null && (
        <div className="mt-3 rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 mb-1">A note on Prevotella</div>
          <p className="text-[12px] text-neutral-600 leading-relaxed">You have <span className="font-medium text-neutral-900">{formatPct(kit.prevotella_commensal_pct)}</span> of other Prevotella types — the harmless kinds. These are normal mouth residents. Only P. intermedia above is the gum-disease one. The name matters.</p>
        </div>
      )}
    </section>
  )
}

export default function OralPanelClient({ kit, narrative, questionnaire, wearable }: {
  kit: OralKitRow
  narrative?: { section_opening?: string; section_cardiometabolic?: string; section_gum_caries?: string; section_breathing?: string; section_disclaimer?: string } | null
  questionnaire?: QuestionnaireData
  wearable?: WearableData
}) {
  const hasAnyData = useMemo(() => kit.shannon_diversity != null || kit.neisseria_pct != null || kit.porphyromonas_pct != null, [kit])
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
      {narrative?.section_opening ? (
        <div className="rounded-2xl bg-neutral-50 border border-neutral-100 p-6">
          <p className="text-[15px] leading-relaxed text-neutral-800" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{narrative.section_opening}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-neutral-50 border border-neutral-100 p-6">
          <p className="text-[14px] leading-relaxed text-neutral-500 italic">Your personalised summary is being prepared.</p>
        </div>
      )}
      <CommunitySection kit={kit} />
      <CardioSection kit={kit} />
      {narrative?.section_cardiometabolic && <div className="rounded-xl bg-white border border-neutral-200 p-5"><p className="text-[14px] leading-relaxed text-neutral-700">{narrative.section_cardiometabolic}</p></div>}
      <BreathingSection kit={kit} questionnaire={questionnaire} wearable={wearable} />
      {narrative?.section_breathing && <div className="rounded-xl bg-white border border-neutral-200 p-5"><p className="text-[14px] leading-relaxed text-neutral-700">{narrative.section_breathing}</p></div>}
      <CariesSection kit={kit} />
      <GumSection kit={kit} />
      {narrative?.section_gum_caries && <div className="rounded-xl bg-white border border-neutral-200 p-5"><p className="text-[14px] leading-relaxed text-neutral-700">{narrative.section_gum_caries}</p></div>}
      {narrative?.section_disclaimer && <div className="pt-6 border-t border-neutral-100"><p className="text-[12px] text-neutral-400 italic leading-relaxed">{narrative.section_disclaimer}</p></div>}
      {!hasAnyData && <div className="rounded-xl bg-amber-50 border border-amber-100 p-4"><p className="text-[13px] text-amber-900">Your oral sample hasn't been processed yet. Once your lab results come in, this page will populate with your bacterial panel.</p></div>}
    </div>
  )
}

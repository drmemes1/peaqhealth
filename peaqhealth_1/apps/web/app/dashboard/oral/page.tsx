import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import OralPanelClient from "./oral-panel-client"
import { Nav } from "../../components/nav"
import { getUserPanelContext } from "../../../lib/user-context"
import Link from "next/link"

export default async function OralPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const ctx = await getUserPanelContext(user.id)

  const { data: narrativeRow } = await supabase.from("oral_narratives")
    .select("headline, narrative, positive_signal, watch_signal")
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false })
    .limit(1).maybeSingle()

  if (!ctx.hasOralKit) {
    return (
      <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
        <Nav />
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: "var(--ink)", margin: "0 0 24px" }}>Oral Microbiome</h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-60)" }}>No oral results on file.</p>
          <Link href="/dashboard" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--gold)", display: "inline-block", marginTop: 12 }}>← Back to dashboard</Link>
        </main>
      </div>
    )
  }

  const narrative = narrativeRow?.narrative
    ? parseNarrativeSections(narrativeRow.narrative as string)
    : null

  const wearable = ctx.sleepData ? {
    nights_available: ctx.sleepData.nightsCount,
    avg_spo2: ctx.sleepData.spo2Avg,
    avg_respiratory_rate: ctx.sleepData.breathingRateAvg,
    avg_rhr: ctx.sleepData.restingHr,
  } : null

  return (
    <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
      <Nav />
      <OralPanelClient
        kit={buildKitFromCtx(ctx) as Parameters<typeof OralPanelClient>[0]["kit"]}
        narrative={narrative}
        questionnaire={ctx.questionnaire ? {
          mouth_breathing: ctx.questionnaire.mouthBreathing,
          mouth_breathing_when: ctx.questionnaire.mouthBreathingWhen,
          snoring_reported: ctx.questionnaire.snoringReported,
          nasal_obstruction: ctx.questionnaire.nasalObstruction,
        } : null}
        wearable={wearable}
      />
    </div>
  )
}

function buildKitFromCtx(ctx: Awaited<ReturnType<typeof getUserPanelContext>>) {
  const o = ctx.oralKit
  if (!o) return {} as Record<string, unknown>
  return {
    shannon_diversity: o.shannonIndex,
    neisseria_pct: o.neisseriaPct, haemophilus_pct: o.haemophilusPct, rothia_pct: o.rothiaPct,
    actinomyces_pct: o.actinomycesPct, veillonella_pct: o.veillonellaPct,
    porphyromonas_pct: o.porphyromonasPct, tannerella_pct: o.tannerellaPct, treponema_pct: o.treponemaPct,
    fusobacterium_pct: o.fusobacteriumPct, aggregatibacter_pct: o.aggregatibacterPct, campylobacter_pct: o.campylobacterPct,
    prevotella_intermedia_pct: o.pIntermediaPct, prevotella_commensal_pct: null,
    s_mutans_pct: o.sMutansPct, s_sobrinus_pct: o.sSobrinusPct, s_sanguinis_pct: o.sSanguinisPct,
    s_gordonii_pct: o.sGordoniiPct, s_salivarius_pct: o.sSalivariusPct, scardovia_pct: null,
    lactobacillus_pct: o.lactobacillusPct, streptococcus_total_pct: null,
    peptostreptococcus_pct: null, parvimonas_pct: null, granulicatella_pct: null,
    env_acid_ratio: o.envAcidRatio, env_aerobic_score_pct: o.envAerobicScorePct,
    env_anaerobic_load_pct: o.envAnaerobicLoadPct, env_aerobic_anaerobic_ratio: o.envAerobicAnaerobicRatio,
    env_pattern: o.envPattern, env_peroxide_flag: null,
    raw_otu_table: null,
    ph_balance_api: o.phBalanceApi, ph_balance_category: o.phBalanceCategory, ph_balance_confidence: o.phBalanceConfidence,
    cariogenic_load_pct: o.cariogenicLoadPct, cariogenic_load_category: o.cariogenicLoadCategory,
    protective_ratio: o.protectiveRatio, protective_ratio_category: o.protectiveRatioCategory,
  } as Record<string, unknown>
}

function parseNarrativeSections(text: string) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim())
  if (paragraphs.length === 0) return null
  const isDisclaimer = (p: string) =>
    p.toLowerCase().includes("not a clinical assessment") ||
    p.toLowerCase().includes("population associations are observational")
  const disclaimerIdx = paragraphs.findIndex(isDisclaimer)
  const content = disclaimerIdx >= 0 ? paragraphs.slice(0, disclaimerIdx) : paragraphs
  const disclaimer = disclaimerIdx >= 0 ? paragraphs[disclaimerIdx] : undefined
  return {
    section_opening: content[0] ?? undefined,
    section_cardiometabolic: content[1] ?? undefined,
    section_gum_caries: content[2] ?? undefined,
    section_breathing: content[3] ?? undefined,
    section_disclaimer: disclaimer,
  }
}

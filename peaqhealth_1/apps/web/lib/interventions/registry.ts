import type { UserPanelContext } from "../user-context"

// ── Types ──────────────────────────────────────────────────────────────────

export interface Intervention {
  id: string
  title: string
  category: "behavioral" | "dietary" | "professional" | "product" | "monitoring"
  priority: 1 | 2 | 3 | 4 | 5
  timing: string
  why: string
  evidence?: string
  excludeWhen?: string[]
  markerLink?: string
}

type RuleFn = (ctx: UserPanelContext) => Intervention | null

// ── Helpers ────────────────────────────────────────────────────────────────

const q = (ctx: UserPanelContext) => ctx.questionnaire
const qr = (ctx: UserPanelContext) => ctx.questionnaire as Record<string, unknown> | null
const o = (ctx: UserPanelContext) => ctx.oralKit
const b = (ctx: UserPanelContext) => ctx.bloodPanel

// ── ORAL HYGIENE INTERVENTIONS ─────────────────────────────────────────────

const rule_stopAntisepticMouthwash: RuleFn = (ctx) => {
  if (!ctx.hasQuestionnaire) return null
  const mw = (qr(ctx)?.mouthwash_type_v2 ?? qr(ctx)?.mouthwash_type) as string | null
  const isAntiseptic = mw === "antiseptic_listerine_cpc" || mw === "antiseptic" || mw === "alcohol" || mw === "chlorhexidine_prescribed"
  if (!isAntiseptic) return null
  const neisseria = o(ctx)?.neisseriaPct
  if (neisseria != null && neisseria >= 10) return null
  return {
    id: "stop-antiseptic-mouthwash",
    title: "Switch from antiseptic mouthwash to fluoride-only",
    category: "behavioral",
    priority: 1,
    timing: "Today",
    why: "Antiseptic mouthwashes suppress Neisseria by 60–90% within hours. Switching to a fluoride-only rinse (like ACT) typically shows Neisseria recovery within 2 weeks.",
    evidence: "Kapil et al. 2013, Free Radical Biology and Medicine",
    markerLink: "/dashboard/panels/oral/markers/neisseria_pct",
  }
}

const rule_startTongueScraping: RuleFn = (ctx) => {
  if (!ctx.hasQuestionnaire) return null
  const tongue = qr(ctx)?.tongue_scraping_freq as string | null
  if (tongue === "most_days" || tongue === "every_morning") return null
  // Only suggest if we have oral data showing VSC bacteria OR symptoms
  if (!ctx.hasOralKit) return null
  return {
    id: "start-tongue-scraping",
    title: "Add daily tongue scraping",
    category: "behavioral",
    priority: 2,
    timing: "This week",
    why: "Tongue scraping removes the bacterial biofilm responsible for volatile sulfur compounds (bad breath). It outperforms mouthwash for VSC reduction and takes 30 seconds.",
    evidence: "Outhouse et al. 2006, Cochrane Review",
  }
}

const rule_upgradeToothbrush: RuleFn = (ctx) => {
  if (!ctx.hasQuestionnaire) return null
  const brush = qr(ctx)?.toothbrush_type as string | null
  if (brush !== "manual") return null
  if (!ctx.hasOralKit) return null
  const gum = o(ctx)!.gumHealthTotal
  if (gum < 3) return null
  return {
    id: "upgrade-toothbrush",
    title: "Switch to an electric sonic toothbrush",
    category: "product",
    priority: 3,
    timing: "This month",
    why: "Electric sonic brushes reduce plaque by 21% more than manual brushes in meta-analyses. With your gum bacteria elevated, this is a low-friction upgrade.",
    evidence: "If et al. 2023, Journal of Clinical Periodontology",
  }
}

const rule_startXylitol: RuleFn = (ctx) => {
  if (!ctx.hasQuestionnaire || !ctx.hasOralKit) return null
  const xylitol = qr(ctx)?.xylitol_use as string | null
  if (xylitol === "daily_multiple") return null
  const mutans = o(ctx)!.sMutansPct ?? 0
  if (mutans < 0.3) return null
  return {
    id: "start-xylitol",
    title: "Add xylitol gum after meals",
    category: "product",
    priority: 2,
    timing: "This week",
    why: "Xylitol at 6+ grams/day (about 5 pieces of gum) consistently reduces S. mutans. The bacteria can't metabolize it — it starves them while stimulating protective saliva flow.",
    evidence: "Lam et al. 2020, BMC Oral Health meta-analysis",
    markerLink: "/dashboard/panels/oral/markers/s_mutans_pct",
  }
}

const rule_startOralProbiotic: RuleFn = (ctx) => {
  if (!ctx.hasQuestionnaire || !ctx.hasOralKit) return null
  const probiotics = qr(ctx)?.oral_probiotic_in_use as string[] | null
  if (probiotics && !probiotics.includes("none")) return null
  const gum = o(ctx)!.gumHealthTotal
  const mutans = o(ctx)!.sMutansPct ?? 0
  if (gum < 3 && mutans < 0.5) return null
  return {
    id: "start-oral-probiotic",
    title: gum >= 3 ? "Consider L. reuteri oral probiotic" : "Consider S. salivarius K12 oral probiotic",
    category: "product",
    priority: 3,
    timing: "This month",
    why: gum >= 3
      ? "L. reuteri (BioGaia Prodentis) has shown gum bacteria reduction in multiple RCTs. As a lozenge, it colonizes the oral cavity directly — different from gut probiotics."
      : "S. salivarius K12 competes with cavity and breath bacteria. It produces bacteriocins that suppress pathogenic competitors.",
    evidence: gum >= 3 ? "Hedberg et al. 2019, BMC Oral Health" : "Burton et al. 2013, International Journal of Oral Science",
  }
}

// ── PROFESSIONAL INTERVENTIONS ─────────────────────────────────────────────

const rule_periodontalExam: RuleFn = (ctx) => {
  if (!ctx.hasOralKit) return null
  const gum = o(ctx)!.gumHealthTotal
  const porph = o(ctx)!.porphyromonasPct ?? 0
  if (gum < 5 && porph < 0.5) return null
  // Check if already on top of it
  const lastExam = qr(ctx)?.last_periodontal_exam_months as number | null
  if (lastExam != null && lastExam <= 6) return null
  return {
    id: "periodontal-exam",
    title: "Book a periodontal exam with pocket depth measurements",
    category: "professional",
    priority: 1,
    timing: "This month",
    why: "Your gum bacteria suggest active subgingival inflammation. A periodontal exam measures pocket depth — the only way to know if bacteria are below the reach of home care. Bring your Cnvrg report.",
    markerLink: "/dashboard/panels/oral/markers/gum_health_total",
  }
}

const rule_dentalCleaning: RuleFn = (ctx) => {
  if (!ctx.hasQuestionnaire) return null
  const months = qr(ctx)?.last_dental_cleaning_months
  if (months == null) return null
  const m = Number(months)
  if (m <= 6) return null
  return {
    id: "dental-cleaning",
    title: m >= 24 ? "Schedule a dental cleaning — it's been a while" : "Schedule your next dental cleaning",
    category: "professional",
    priority: m >= 24 ? 1 : 2,
    timing: "This month",
    why: m >= 24
      ? "Professional cleanings reset bacterial load. After 2+ years, bacterial biofilm has likely calcified into calculus that home care can't reach."
      : "Regular cleanings every 6 months keep bacterial load manageable. Your last one was over 6 months ago.",
  }
}

const rule_entReferral: RuleFn = (ctx) => {
  if (!ctx.hasQuestionnaire) return null
  const nasal = q(ctx)?.nasalObstruction
  const sinus = q(ctx)?.sinusHistory
  const ent = qr(ctx)?.ent_assessment_history as string | null
  if (ent === "surgery_past" || ent === "imaging_done") return null
  if (nasal !== "often" && nasal !== "chronic") return null
  if (sinus !== "chronic" && sinus !== "surgical" && sinus !== "recurrent_sinusitis") return null
  return {
    id: "ent-referral",
    title: "Get an ENT evaluation for your nasal airway",
    category: "professional",
    priority: 2,
    timing: "This quarter",
    why: "Chronic nasal obstruction with sinus history suggests a structural component. An ENT can determine whether it's inflammatory, structural, or both — and whether intervention would help your breathing pattern.",
  }
}

// ── DIETARY INTERVENTIONS ──────────────────────────────────────────────────

const rule_leafyGreens: RuleFn = (ctx) => {
  if (!ctx.hasOralKit) return null
  const neisseria = o(ctx)!.neisseriaPct
  if (neisseria != null && neisseria >= 10) return null
  const nitrate = q(ctx)?.dietaryNitrateFrequency ?? qr(ctx)?.dietary_nitrate_frequency as string | null
  if (nitrate === "daily" || nitrate === "multiple_daily") return null
  return {
    id: "increase-leafy-greens",
    title: "Add more leafy greens and beets to your diet",
    category: "dietary",
    priority: 2,
    timing: "This week",
    why: "Arugula, spinach, and beetroot juice feed the bacteria that produce nitric oxide. Nitrate supplementation has been shown to raise Neisseria by 351% in 10–14 days.",
    evidence: "Vanhatalo et al. 2018, Frontiers in Microbiology",
    markerLink: "/dashboard/panels/oral/markers/neisseria_pct",
  }
}

const rule_reduceSugarFrequency: RuleFn = (ctx) => {
  if (!ctx.hasQuestionnaire || !ctx.hasOralKit) return null
  const sugar = q(ctx)?.sugarIntake ?? qr(ctx)?.sugar_intake as string | null
  if (sugar !== "often" && sugar !== "multiple_daily" && sugar !== "every_meal") return null
  const mutans = o(ctx)!.sMutansPct ?? 0
  if (mutans < 0.3) return null
  return {
    id: "reduce-sugar-frequency",
    title: "Space out sugar intake — frequency matters more than amount",
    category: "dietary",
    priority: 2,
    timing: "This week",
    why: "Each sugar exposure triggers a 20-minute acid attack. 3 meals + 1 deliberate snack, no sipping sugary drinks between. Water between meals.",
    markerLink: "/dashboard/panels/oral/markers/s_mutans_pct",
  }
}

// ── BEHAVIORAL / AIRWAY INTERVENTIONS ──────────────────────────────────────

const rule_nasalStrips: RuleFn = (ctx) => {
  if (!ctx.hasQuestionnaire) return null
  const mb = q(ctx)?.mouthBreathing
  if (mb !== "confirmed" && mb !== "often") return null
  const cpap = qr(ctx)?.cpap_or_mad_in_use as string[] | null
  if (cpap && (cpap.includes("cpap_bipap") || cpap.includes("mad") || cpap.includes("mouth_tape"))) return null
  return {
    id: "try-nasal-strips",
    title: "Trial nasal strips or mouth tape for 2–4 weeks",
    category: "behavioral",
    priority: 2,
    timing: "This week",
    why: "Nasal strips mechanically open the nasal valve — the most common site of nighttime obstruction. 2–4 weeks is enough to see if morning dryness and snoring improve.",
  }
}

const rule_stopSmokingForOral: RuleFn = (ctx) => {
  if (!ctx.hasQuestionnaire) return null
  const smoking = q(ctx)?.smokingStatus
  if (smoking !== "current_daily" && smoking !== "current_social" && smoking !== "vape_daily" && smoking !== "current") return null
  return {
    id: "reduce-smoking",
    title: "Any reduction in smoking/vaping helps your oral bacteria",
    category: "behavioral",
    priority: 1,
    timing: "Ongoing",
    why: "Tobacco simultaneously suppresses nitrate-reducing bacteria AND feeds gum inflammation bacteria. NRT patches and gum don't have the same oral microbiome impact. Even cutting from daily to social makes a measurable difference.",
  }
}

// ── MONITORING INTERVENTIONS ───────────────────────────────────────────────

const rule_addHsCrp: RuleFn = (ctx) => {
  if (ctx.hasBloodPanel && b(ctx)!.hsCrp != null) return null
  if (!ctx.hasOralKit) return null
  const gum = o(ctx)!.gumHealthTotal
  if (gum < 2) return null
  return {
    id: "add-hscrp-to-next-draw",
    title: "Add hs-CRP to your next blood draw",
    category: "monitoring",
    priority: 1,
    timing: "Next draw",
    why: "hs-CRP would close the loop between your oral gum bacteria and systemic inflammation. It's the single most impactful addition to your next blood panel — a ~$15 add-on at Quest or LabCorp.",
    markerLink: "/dashboard/panels/blood/markers/hs_crp",
  }
}

const rule_retestAfterIntervention: RuleFn = (ctx) => {
  if (!ctx.hasOralKit) return null
  const gum = o(ctx)!.gumHealthTotal
  const neisseria = o(ctx)!.neisseriaPct ?? 0
  if (gum < 5 && neisseria >= 8) return null
  return {
    id: "retest-oral-3-months",
    title: "Retest your oral microbiome in 3 months",
    category: "monitoring",
    priority: 4,
    timing: "3 months",
    why: "Your oral bacteria respond to interventions within weeks. A follow-up test at 3 months shows whether your changes (diet, hygiene, mouthwash switch) are moving the needle.",
  }
}

// ── ENGINE ──────────────────────────────────────────────────────────────────

const ALL_INTERVENTIONS: RuleFn[] = [
  rule_stopAntisepticMouthwash,
  rule_stopSmokingForOral,
  rule_periodontalExam,
  rule_nasalStrips,
  rule_startXylitol,
  rule_startTongueScraping,
  rule_startOralProbiotic,
  rule_upgradeToothbrush,
  rule_leafyGreens,
  rule_reduceSugarFrequency,
  rule_dentalCleaning,
  rule_entReferral,
  rule_addHsCrp,
  rule_retestAfterIntervention,
]

export function computeInterventions(ctx: UserPanelContext): Intervention[] {
  const results: Intervention[] = []
  const seen = new Set<string>()

  for (const rule of ALL_INTERVENTIONS) {
    const intervention = rule(ctx)
    if (intervention && !seen.has(intervention.id)) {
      seen.add(intervention.id)
      results.push(intervention)
    }
  }

  return results.sort((a, b) => a.priority - b.priority)
}

export function getTopInterventions(ctx: UserPanelContext, limit = 5): Intervention[] {
  return computeInterventions(ctx).slice(0, limit)
}

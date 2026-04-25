import { getUserPanelContext, type UserPanelContext } from "../user-context"
import { computeInterventions, type Intervention } from "../interventions/registry"
import { getSubInsights, type SubInsight } from "../oral/subInsights"
import { getBreathScore, type BreathScoreResult } from "../oral/halitosisScore"

export interface UserSituation {
  identity: {
    userId: string
    displayName: string
    age: number | null
    sex: string | null
  }
  oral: {
    hasData: boolean
    collectedAt: string | null
    shannon: number | null
    speciesCount: number | null
    composites: {
      nrPathway: { value: number; status: string; contributors: Record<string, number> } | null
      gumHealth: { value: number; status: string; contributors: Record<string, number> } | null
      cavityRisk: { value: number; status: string } | null
      protectiveRatio: { value: number | null; status: string | null } | null
      phBuffering: { value: number | null; status: string | null } | null
      breathFreshness: BreathScoreResult | null
    }
    breathingPattern: { read: string; sourcesFired: string[] } | null
    subInsights: SubInsight[]
  }
  blood: {
    hasData: boolean
    collectedAt: string | null
    markers: Record<string, { value: number; unit: string; status: string }>
  }
  sleep: {
    hasData: boolean
    source: "wearable" | "questionnaire" | "both" | "none"
    metrics: Record<string, number | null>
  }
  questionnaire: {
    completed: boolean
    keyAnswers: Record<string, string | null>
  }
  interventions: {
    active: Array<{ id: string; title: string; category: string; why: string }>
  }
  patterns: Array<{ id: string; label: string; category: string; fired: boolean }>
}

function markerStatus(val: number, thresholds: { good: number; watch: number }, higher: boolean): string {
  if (higher) return val >= thresholds.good ? "strong" : val >= thresholds.watch ? "watch" : "attention"
  return val <= thresholds.good ? "strong" : val <= thresholds.watch ? "watch" : "attention"
}

function detectPatterns(ctx: UserPanelContext): UserSituation["patterns"] {
  const patterns: UserSituation["patterns"] = []
  const o = ctx.oralKit

  if (o) {
    patterns.push({
      id: "exceptional_diversity",
      label: "Exceptional microbial diversity",
      category: "strong",
      fired: (o.shannonIndex ?? 0) > 5.5,
    })
    patterns.push({
      id: "depleted_no_pathway",
      label: "Depleted nitric oxide pathway",
      category: "attention",
      fired: (o.neisseriaPct ?? 99) < 5 && (o.haemophilusPct ?? 99) < 4,
    })
    patterns.push({
      id: "active_orange_complex",
      label: "Active orange-complex gum bacteria",
      category: "watch",
      fired: o.gumHealthTotal > 4,
    })
    patterns.push({
      id: "excellent_caries_markers",
      label: "Excellent cavity protection",
      category: "strong",
      fired: o.cavityBacteriaTotal < 0.5 && (o.protectiveRatio ?? 0) > 3,
    })
    patterns.push({
      id: "low_diversity_concern",
      label: "Low microbial diversity",
      category: "attention",
      fired: (o.shannonIndex ?? 99) < 3.0,
    })

    const qMb = ctx.questionnaire?.mouthBreathing === "confirmed" || ctx.questionnaire?.mouthBreathing === "often"
    const fuso = (o.fusobacteriumPct ?? 0) > 1.5
    const neisseriaHigh = (o.neisseriaPct ?? 0) > 12
    patterns.push({
      id: "mouth_breathing_confirmed",
      label: "Mouth breathing confirmed (multi-source)",
      category: "watch",
      fired: qMb && (fuso || neisseriaHigh),
    })
  }

  return patterns
}

export async function getUserSituation(userId: string): Promise<UserSituation> {
  const ctx = await getUserPanelContext(userId)
  const o = ctx.oralKit
  const b = ctx.bloodPanel
  const s = ctx.sleepData
  const q = ctx.questionnaire

  const interventions = (ctx.hasOralKit || ctx.hasBloodPanel) ? computeInterventions(ctx) : []
  const subInsights = o ? getSubInsights(o) : []
  const breathScore = o ? getBreathScore({
    fusobacteriumPeriodonticumPct: null,
    porphyromonasPct: o.porphyromonasPct,
    solobacteriumPct: null,
    prevotellaMelaninogenicaPct: null,
    peptostreptococcusPct: null,
  }) : null

  const qMb = q?.mouthBreathing === "confirmed" || q?.mouthBreathing === "often"
  const oralMb = o?.envPattern === "mouth_breathing" || o?.envPattern === "mixed" || (o && ((o.fusobacteriumPct ?? 0) > 1.5 || (o.neisseriaPct ?? 0) > 12))
  const breathingSources: string[] = []
  if (qMb) breathingSources.push("questionnaire")
  if (oralMb) breathingSources.push("oral bacteria")
  if (ctx.hasWearable) breathingSources.push("wearable")

  const bloodMarkers: Record<string, { value: number; unit: string; status: string }> = {}
  if (b) {
    const add = (name: string, val: number | null, unit: string, thresholds: { good: number; watch: number }, higher: boolean) => {
      if (val != null) bloodMarkers[name] = { value: val, unit, status: markerStatus(val, thresholds, higher) }
    }
    add("LDL", b.ldl, "mg/dL", { good: 100, watch: 130 }, false)
    add("HDL", b.hdl, "mg/dL", { good: 50, watch: 40 }, true)
    add("Triglycerides", b.triglycerides, "mg/dL", { good: 100, watch: 150 }, false)
    add("hs-CRP", b.hsCrp, "mg/L", { good: 1.0, watch: 3.0 }, false)
    add("HbA1c", b.hba1c, "%", { good: 5.7, watch: 6.5 }, false)
    add("Glucose", b.glucose, "mg/dL", { good: 99, watch: 126 }, false)
    add("TSH", b.tsh, "µIU/mL", { good: 4.5, watch: 10 }, false)
    add("Vitamin D", b.vitaminD, "ng/mL", { good: 30, watch: 20 }, true)
    add("eGFR", b.egfr, "mL/min", { good: 90, watch: 60 }, true)
  }

  return {
    identity: {
      userId,
      displayName: ctx.firstName ?? "User",
      age: ctx.age,
      sex: ctx.sex,
    },
    oral: {
      hasData: ctx.hasOralKit,
      collectedAt: o?.collectionDate ?? null,
      shannon: o?.shannonIndex ?? null,
      speciesCount: o?.namedSpecies ?? null,
      composites: {
        nrPathway: o ? {
          value: o.nitricOxideTotal,
          status: o.nitricOxideTotal >= 20 ? "strong" : o.nitricOxideTotal >= 10 ? "watch" : "attention",
          contributors: { Neisseria: o.neisseriaPct ?? 0, Rothia: o.rothiaPct ?? 0, Haemophilus: o.haemophilusPct ?? 0, Actinomyces: o.actinomycesPct ?? 0, Veillonella: o.veillonellaPct ?? 0 },
        } : null,
        gumHealth: o ? {
          value: o.gumHealthTotal,
          status: o.gumHealthTotal < 2 ? "strong" : o.gumHealthTotal < 5 ? "watch" : "attention",
          contributors: { Fusobacterium: o.fusobacteriumPct ?? 0, Aggregatibacter: o.aggregatibacterPct ?? 0, Campylobacter: o.campylobacterPct ?? 0, Porphyromonas: o.porphyromonasPct ?? 0, Tannerella: o.tannerellaPct ?? 0, Treponema: o.treponemaPct ?? 0 },
        } : null,
        cavityRisk: o ? { value: o.cavityBacteriaTotal, status: o.cavityBacteriaTotal < 0.5 ? "strong" : o.cavityBacteriaTotal < 1.5 ? "watch" : "attention" } : null,
        protectiveRatio: o ? { value: o.protectiveRatio, status: o.protectiveRatioCategory } : null,
        phBuffering: o ? { value: o.phBalanceApi, status: o.phBalanceCategory } : null,
        breathFreshness: breathScore,
      },
      breathingPattern: (qMb || oralMb) ? {
        read: qMb && oralMb ? "Mouth breathing confirmed" : qMb ? "Mouth breathing reported" : "Possible mouth breathing",
        sourcesFired: breathingSources,
      } : null,
      subInsights,
    },
    blood: {
      hasData: ctx.hasBloodPanel,
      collectedAt: b?.drawDate ?? null,
      markers: bloodMarkers,
    },
    sleep: {
      hasData: ctx.hasWearable,
      source: ctx.hasWearable && ctx.hasQuestionnaire ? "both" : ctx.hasWearable ? "wearable" : ctx.hasQuestionnaire ? "questionnaire" : "none",
      metrics: s ? {
        totalSleepHrs: s.totalSleepMin != null ? s.totalSleepMin / 60 : null,
        deepSleepMin: s.deepSleepMin,
        sleepEfficiency: s.sleepEfficiency,
        hrvRmssd: s.hrvRmssd,
        restingHr: s.restingHr,
        spo2Avg: s.spo2Avg,
      } : {},
    },
    questionnaire: {
      completed: ctx.hasQuestionnaire,
      keyAnswers: q ? {
        mouthBreathing: q.mouthBreathing,
        mouthBreathingWhen: q.mouthBreathingWhen,
        snoring: q.snoringReported,
        flossing: q.flossingFreq,
        smokingStatus: q.smokingStatus,
        sugarIntake: q.sugarIntake,
        stressLevel: q.stressLevel,
        sleepDuration: q.sleepDuration,
      } : {},
    },
    interventions: {
      active: interventions.slice(0, 10).map(i => ({ id: i.id, title: i.title, category: i.category, why: i.why })),
    },
    patterns: detectPatterns(ctx),
  }
}

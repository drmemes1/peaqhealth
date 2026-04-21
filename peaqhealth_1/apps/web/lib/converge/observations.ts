import type { UserPanelContext } from "../user-context"
import { hasMarker } from "../user-context"

// ── Types ──────────────────────────────────────────────────────────────────

export interface ConvergeObservation {
  id: string
  priority: number
  panels: ("oral" | "blood" | "sleep" | "questionnaire")[]
  severity: "positive" | "watch" | "attention" | "recheck" | "context"
  title: string
  oneLiner: string
  narrative: string
  chain?: { label: string; text: string }
  datapoints?: { label: string; value: string; unit?: string; verdict?: "good" | "watch" | "low" | "attention" }[]
  missingData?: { whichPanel: string; whichMarker?: string; whyItMatters: string }
}

type RuleFn = (ctx: UserPanelContext) => ConvergeObservation | null

// ── Helpers ────────────────────────────────────────────────────────────────

function f(v: number | null | undefined, d = 1): string {
  return v == null ? "—" : v.toFixed(d)
}

function sleepHours(ctx: UserPanelContext): number | null {
  if (ctx.sleepData?.totalSleepMin != null) return ctx.sleepData.totalSleepMin / 60
  const map: Record<string, number> = { less_than_5: 4.5, "5_6": 5.5, "6_7": 6.5, "7_8": 7.5, "8_9": 8.5, more_than_9: 9.5 }
  return ctx.questionnaire?.sleepDuration ? map[ctx.questionnaire.sleepDuration] ?? null : null
}

// ── ORAL × BLOOD ───────────────────────────────────────────────────────────

const rule_nitricOxide_LDL: RuleFn = (ctx) => {
  if (!ctx.hasOralKit || !ctx.hasBloodPanel || ctx.bloodPanel!.ldl == null) return null
  const no = ctx.oralKit!.nitricOxideTotal
  const ldl = ctx.bloodPanel!.ldl!

  if (no > 25 && ldl > 130) {
    return {
      id: "no-ldl-offset",
      priority: 2,
      panels: ["oral", "blood"],
      severity: "positive",
      title: "Your strong nitric oxide pathway offsets your LDL",
      oneLiner: `Nitrate-reducing bacteria at ${f(no, 1)}% provide cardiovascular support alongside an LDL of ${ldl}.`,
      narrative: `Your mouth harbors a strong community of nitrate-reducing bacteria — ${f(no, 1)}% of your oral community. These bacteria turn dietary nitrate from leafy greens into nitric oxide, the molecule that relaxes blood vessels and supports healthy blood pressure. Your LDL sits at ${ldl} mg/dL, which is above the typical target of 100. But the strength of your nitric oxide pathway is a meaningful cardiovascular offset — it's the kind of counterbalance that single-marker readings miss.`,
      chain: { label: "The chain", text: `Strong oral nitrate reducers (${f(no, 1)}%) → higher circulating NO → modest LDL modulation + blood pressure support` },
      datapoints: [
        { label: "NO pathway", value: f(no, 1), unit: "%", verdict: "good" },
        { label: "LDL", value: String(ldl), unit: "mg/dL", verdict: "attention" },
        { label: "Neisseria", value: f(ctx.oralKit!.neisseriaPct), unit: "%", verdict: (ctx.oralKit!.neisseriaPct ?? 0) >= 10 ? "good" : "watch" },
      ],
    }
  }

  if (no < 10 && ldl > 130) {
    return {
      id: "no-ldl-depleted",
      priority: 1,
      panels: ["oral", "blood"],
      severity: "attention",
      title: "Depleted nitric oxide bacteria alongside elevated LDL",
      oneLiner: `Your nitrate-reducing community is at ${f(no, 1)}% — well below the 20-30% target — while LDL sits at ${ldl}.`,
      narrative: `Your nitrate-reducing bacteria total just ${f(no, 1)}%, against a target of 20–30%. These are the bacteria that convert dietary nitrate into nitric oxide — the signal that helps blood vessels relax and supports healthy blood pressure. With your LDL at ${ldl} mg/dL, the depleted NO pathway removes a natural offset. Neisseria specifically sits at ${f(ctx.oralKit!.neisseriaPct)}% against a target of 10–13% — a ${((10 / (ctx.oralKit!.neisseriaPct || 0.1))).toFixed(0)}× deficit. Nitrate supplementation has been shown to raise Neisseria by 351% in 10–14 days.`,
      chain: { label: "The chain", text: `Depleted Neisseria (${f(ctx.oralKit!.neisseriaPct)}%) → low circulating NO → reduced vascular flexibility → LDL impact amplified` },
      datapoints: [
        { label: "NO pathway", value: f(no, 1), unit: "%", verdict: "low" },
        { label: "LDL", value: String(ldl), unit: "mg/dL", verdict: "attention" },
        { label: "Neisseria", value: f(ctx.oralKit!.neisseriaPct), unit: "%", verdict: "low" },
      ],
    }
  }

  if (no > 25 && ldl <= 130) {
    return {
      id: "no-ldl-strong",
      priority: 4,
      panels: ["oral", "blood"],
      severity: "positive",
      title: "Nitric oxide pathway and LDL both in good shape",
      oneLiner: `Strong NO producers at ${f(no, 1)}% paired with LDL at ${ldl} — your cardiovascular picture is solid.`,
      narrative: `Your nitrate-reducing bacteria are well-represented at ${f(no, 1)}%, and your LDL is at ${ldl} mg/dL. Both markers pointing the same direction is the kind of cross-panel confirmation that single tests can't provide.`,
      datapoints: [
        { label: "NO pathway", value: f(no, 1), unit: "%", verdict: "good" },
        { label: "LDL", value: String(ldl), unit: "mg/dL", verdict: "good" },
      ],
    }
  }

  return null
}

const rule_gumBacteria_inflammation: RuleFn = (ctx) => {
  if (!ctx.hasOralKit) return null
  const gum = ctx.oralKit!.gumHealthTotal

  if (gum > 5 && ctx.hasBloodPanel && ctx.bloodPanel!.hsCrp != null && ctx.bloodPanel!.hsCrp > 1.0) {
    return {
      id: "gum-crp-tracking",
      priority: 1,
      panels: ["oral", "blood"],
      severity: "attention",
      title: "Gum bacteria and inflammation are tracking together",
      oneLiner: `Gum-associated bacteria at ${f(gum)}% with hs-CRP at ${f(ctx.bloodPanel!.hsCrp)} mg/L — two independent inflammatory signals converging.`,
      narrative: `Your gum-associated bacteria total ${f(gum)}% — above the typical 2% threshold. At the same time, your hs-CRP blood marker sits at ${f(ctx.bloodPanel!.hsCrp)} mg/L, above the 1.0 target. These are two independent measurements pointing at the same biological process: oral bacteria triggering local gum inflammation that shows up as systemic inflammation in your blood. Addressing the oral source — consistent flossing, professional cleaning — is often the most direct path to lowering both numbers.`,
      chain: { label: "The chain", text: `Elevated gum bacteria (${f(gum)}%) → local oral inflammation → low-grade systemic CRP elevation (${f(ctx.bloodPanel!.hsCrp)} mg/L)` },
      datapoints: [
        { label: "Gum bacteria", value: f(gum), unit: "%", verdict: "attention" },
        { label: "hs-CRP", value: f(ctx.bloodPanel!.hsCrp), unit: "mg/L", verdict: "attention" },
      ],
    }
  }

  if (gum > 5 && (!ctx.hasBloodPanel || !hasMarker(ctx, "hsCrp"))) {
    return {
      id: "gum-missing-crp",
      priority: 2,
      panels: ["oral"],
      severity: "recheck",
      title: "Gum bacteria elevated — inflammation marker would complete the picture",
      oneLiner: `Your gum-associated bacteria are at ${f(gum)}%. An hs-CRP blood test would show whether this is triggering systemic inflammation.`,
      narrative: `Your gum-associated bacteria total ${f(gum)}%, which is above the typical range. The next question is whether this oral inflammation is showing up in your bloodstream. hs-CRP is the blood marker that would answer that question — it's the missing input for your full inflammatory picture.`,
      missingData: { whichPanel: "blood", whichMarker: "hs_crp", whyItMatters: "Would reveal whether gum bacteria are driving systemic inflammation" },
      datapoints: [
        { label: "Gum bacteria", value: f(gum), unit: "%", verdict: "attention" },
        { label: "hs-CRP", value: "—", verdict: "watch" },
      ],
    }
  }

  return null
}

const rule_cavityBacteria_glucose: RuleFn = (ctx) => {
  if (!ctx.hasOralKit) return null
  const cav = ctx.oralKit!.cavityBacteriaTotal
  const hba1c = ctx.bloodPanel?.hba1c
  const glucose = ctx.bloodPanel?.glucose

  if (cav < 1.0 && hba1c != null && hba1c < 5.5) {
    return {
      id: "cavity-glucose-good",
      priority: 4,
      panels: ["oral", "blood"],
      severity: "positive",
      title: "Low cavity bacteria and healthy HbA1c pair nicely",
      oneLiner: `Cavity-causing bacteria at ${f(cav, 2)}% with HbA1c at ${f(hba1c, 1)}% — sugar exposure is low on both sides.`,
      narrative: `Your cavity-causing bacteria total just ${f(cav, 2)}%, and your HbA1c sits at ${f(hba1c, 1)}%. These bacteria feed on sugar — and your blood sugar marker confirms low dietary sugar exposure from a different angle. Two independent measurements agreeing.`,
      datapoints: [
        { label: "Cavity bacteria", value: f(cav, 2), unit: "%", verdict: "good" },
        { label: "HbA1c", value: f(hba1c, 1), unit: "%", verdict: "good" },
      ],
    }
  }

  if (cav >= 1.5 && ((hba1c != null && hba1c >= 5.7) || (glucose != null && glucose >= 100))) {
    return {
      id: "cavity-glucose-watch",
      priority: 2,
      panels: ["oral", "blood"],
      severity: "watch",
      title: "Cavity bacteria and blood sugar both elevated — sugar intake connecting the dots",
      oneLiner: `Cavity bacteria at ${f(cav, 2)}% alongside ${hba1c != null ? `HbA1c ${f(hba1c, 1)}%` : `glucose ${glucose} mg/dL`} — dietary sugar may be the shared driver.`,
      narrative: `Your cavity-causing bacteria are at ${f(cav, 2)}%, while your ${hba1c != null ? `HbA1c sits at ${f(hba1c, 1)}%` : `fasting glucose is ${glucose} mg/dL`}. These bacteria thrive on sugar, and your blood sugar markers suggest elevated sugar exposure. Sugar frequency — how often you eat it, not just how much — is the shared mechanism driving both numbers.`,
      chain: { label: "The chain", text: `Frequent sugar intake → cavity bacteria thrive (${f(cav, 2)}%) + blood sugar elevated (${hba1c != null ? `HbA1c ${f(hba1c, 1)}%` : `glucose ${glucose}`})` },
      datapoints: [
        { label: "Cavity bacteria", value: f(cav, 2), unit: "%", verdict: "attention" },
        ...(hba1c != null ? [{ label: "HbA1c", value: f(hba1c, 1), unit: "%", verdict: "watch" as const }] : []),
        ...(glucose != null ? [{ label: "Glucose", value: String(glucose), unit: "mg/dL", verdict: "watch" as const }] : []),
      ],
    }
  }

  return null
}

// ── ORAL × SLEEP/QUESTIONNAIRE ─────────────────────────────────────────────

const rule_mouthBreathing_multiSource: RuleFn = (ctx) => {
  if (!ctx.hasOralKit || !ctx.hasQuestionnaire) return null
  const env = ctx.oralKit!.envPattern
  const qMb = ctx.questionnaire!.mouthBreathing
  const oralMatch = env === "mouth_breathing" || env === "mixed"
  const qMatch = qMb === "confirmed" || qMb === "often" || qMb === "yes"

  if (!oralMatch || !qMatch) return null

  const aerobic = ctx.oralKit!.envAerobicScorePct
  const anaerobic = ctx.oralKit!.envAnaerobicLoadPct
  const when = ctx.questionnaire!.mouthBreathingWhen

  return {
    id: "mouth-breathing-confirmed",
    priority: 1,
    panels: ["questionnaire", "oral"],
    severity: "attention",
    title: "Mouth breathing confirmed across two independent sources",
    oneLiner: `Your questionnaire and oral bacteria both point to mouth breathing${when === "daytime_and_sleep" ? " — day and night" : " at night"}.`,
    narrative: `Your questionnaire reports mouth breathing${when === "daytime_and_sleep" ? " during the day and at night" : when === "sleep_only" ? " during sleep" : ""}. Your oral bacteria independently confirm this — they show an aerobic shift at ${f(aerobic)}%, meaning oxygen-loving bacteria are more abundant than typical. This is the bacterial fingerprint of a dry mouth from open-mouth breathing. Two independent sources converging on the same finding is the meaningful signal here.`,
    chain: { label: "The chain", text: `Questionnaire reports mouth breathing + oral bacteria show aerobic shift (${f(aerobic)}%) = same finding, two independent sources` },
    datapoints: [
      { label: "Aerobic shift", value: f(aerobic), unit: "%", verdict: (aerobic ?? 0) > 25 ? "watch" : "good" },
      { label: "Anaerobic load", value: f(anaerobic), unit: "%", verdict: (anaerobic ?? 0) > 5 ? "watch" : "good" },
      { label: "Questionnaire", value: "Confirmed" },
      { label: "When", value: when === "daytime_and_sleep" ? "Day + night" : when === "sleep_only" ? "Sleep only" : "Reported" },
    ],
  }
}

const rule_sinus_inflammation: RuleFn = (ctx) => {
  if (!ctx.hasQuestionnaire) return null
  const sinus = ctx.questionnaire!.sinusHistory
  if (sinus !== "chronic" && sinus !== "surgical") return null

  const nasalSevere = ctx.questionnaire!.nasalObstruction === "frequent" || ctx.questionnaire!.nasalObstruction === "constant"
  if (!nasalSevere) return null

  return {
    id: "sinus-airway-profile",
    priority: 2,
    panels: ["questionnaire"],
    severity: "attention",
    title: "Nasal airway profile with chronic sinus history",
    oneLiner: `${sinus === "surgical" ? "Prior sinus surgery" : "Chronic sinus history"} combined with ongoing nasal obstruction — an ENT evaluation would map the structural picture.`,
    narrative: `Your questionnaire reports ${sinus === "surgical" ? "prior sinus surgery" : "chronic sinus issues"} alongside ${ctx.questionnaire!.nasalObstruction} nasal obstruction. This combination describes a nasal airway profile — the structural side of how you breathe. An ENT referral would determine whether the current obstruction is inflammatory, structural, or both. This is the kind of evaluation that connects your breathing pattern to its root cause.`,
    chain: { label: "The chain", text: `${sinus === "surgical" ? "Prior sinus surgery" : "Chronic sinus history"} + ongoing nasal obstruction → restricted nasal airflow → compensatory mouth breathing` },
    datapoints: [
      { label: "Sinus history", value: sinus === "surgical" ? "Surgical" : "Chronic" },
      { label: "Nasal obstruction", value: ctx.questionnaire!.nasalObstruction ?? "—" },
      ...(ctx.questionnaire!.snoringReported === "yes" || ctx.questionnaire!.snoringReported === "frequent" ? [{ label: "Snoring", value: "Reported" }] : []),
    ],
  }
}

// ── SLEEP × BLOOD ──────────────────────────────────────────────────────────

const rule_shortSleep_metabolic: RuleFn = (ctx) => {
  const hrs = sleepHours(ctx)
  if (hrs == null || hrs >= 7) return null
  const glucose = ctx.bloodPanel?.glucose
  const hba1c = ctx.bloodPanel?.hba1c
  const glucoseHigh = glucose != null && glucose >= 100
  const hba1cHigh = hba1c != null && hba1c >= 5.7
  if (!glucoseHigh && !hba1cHigh) return null

  return {
    id: "short-sleep-metabolic",
    priority: 2,
    panels: ["sleep", "blood"],
    severity: "watch",
    title: "Short sleep and elevated blood sugar are connected",
    oneLiner: `${f(hrs, 1)} hours of sleep alongside ${hba1cHigh ? `HbA1c ${f(hba1c, 1)}%` : `glucose ${glucose} mg/dL`} — sleep duration affects glucose regulation.`,
    narrative: `Your sleep averages ${f(hrs, 1)} hours, below the 7-hour threshold where glucose regulation starts to shift. ${hba1cHigh ? `Your HbA1c at ${f(hba1c, 1)}%` : `Your fasting glucose at ${glucose} mg/dL`} is elevated — and short sleep is a well-documented contributor to insulin sensitivity changes. This is the kind of finding where the intervention (more sleep) addresses both numbers simultaneously.`,
    chain: { label: "The chain", text: `Short sleep (${f(hrs, 1)} hrs) → reduced insulin sensitivity → blood sugar elevation` },
    datapoints: [
      { label: "Sleep", value: f(hrs, 1), unit: "hrs", verdict: "watch" },
      ...(hba1cHigh ? [{ label: "HbA1c", value: f(hba1c, 1), unit: "%", verdict: "watch" as const }] : []),
      ...(glucoseHigh ? [{ label: "Glucose", value: String(glucose), unit: "mg/dL", verdict: "watch" as const }] : []),
    ],
  }
}

const rule_hrv_cardiovascular: RuleFn = (ctx) => {
  if (!ctx.hasWearable || ctx.sleepData?.hrvRmssd == null || !ctx.hasBloodPanel) return null
  const hrv = ctx.sleepData!.hrvRmssd!
  const ldl = ctx.bloodPanel!.ldl
  if (ldl == null) return null

  const age = ctx.age ?? 40
  const lowHrvThreshold = age < 35 ? 35 : age < 50 ? 25 : 20

  if (hrv < lowHrvThreshold && ldl > 130) {
    return {
      id: "hrv-ldl-watch",
      priority: 2,
      panels: ["sleep", "blood"],
      severity: "watch",
      title: "Low HRV and elevated LDL share a cardiovascular thread",
      oneLiner: `HRV at ${f(hrv, 0)} ms (below ${lowHrvThreshold} for your age) paired with LDL at ${ldl} — both reflect cardiovascular load.`,
      narrative: `Your heart rate variability averages ${f(hrv, 0)} ms, below the expected ${lowHrvThreshold} ms for your age range. Your LDL is at ${ldl} mg/dL. Low HRV and high LDL share a common thread — both reflect how well your cardiovascular system adapts to stress. Improving one (through exercise, sleep quality, or dietary changes) often moves the other.`,
      chain: { label: "The chain", text: `Low HRV (${f(hrv, 0)} ms) + elevated LDL (${ldl}) → cardiovascular adaptability under pressure` },
      datapoints: [
        { label: "HRV", value: f(hrv, 0), unit: "ms", verdict: "watch" },
        { label: "LDL", value: String(ldl), unit: "mg/dL", verdict: "attention" },
      ],
    }
  }

  return null
}

// ── POSITIVE SIGNALS ───────────────────────────────────────────────────────

const rule_strongDiversity: RuleFn = (ctx) => {
  if (!ctx.hasOralKit) return null
  const shannon = ctx.oralKit!.shannonIndex
  const species = ctx.oralKit!.namedSpecies ?? ctx.oralKit!.speciesCount
  if (shannon == null || shannon < 4.0 || (species != null && species < 100)) return null

  return {
    id: "strong-diversity",
    priority: 3,
    panels: ["oral"],
    severity: "positive",
    title: "Your bacterial diversity is a resilience signal",
    oneLiner: `Shannon index at ${f(shannon, 2)} with ${species ?? "many"} species — a diverse, resilient community.`,
    narrative: `Your Shannon diversity index sits at ${f(shannon, 2)}, ${shannon >= 5.0 ? "well within" : "at the lower end of"} the range associated with long-term health resilience. ${species != null ? `With ${species} named species across your sample, n` : "N"}o single bacterial group dominates — that diversity is what keeps your mouth stable when challenged by illness, antibiotics, or dietary changes.`,
    datapoints: [
      { label: "Shannon index", value: f(shannon, 2), verdict: "good" },
      ...(species != null ? [{ label: "Species", value: String(species), verdict: "good" as const }] : []),
    ],
  }
}

const rule_strongMetabolic: RuleFn = (ctx) => {
  if (!ctx.hasBloodPanel) return null
  const { glucose, hba1c, triglycerides } = ctx.bloodPanel!
  if (glucose == null || hba1c == null || triglycerides == null) return null
  if (glucose > 95 || hba1c > 5.4 || triglycerides > 100) return null

  return {
    id: "strong-metabolic",
    priority: 4,
    panels: ["blood"],
    severity: "positive",
    title: "Your metabolic picture is stable and strong",
    oneLiner: `Glucose ${glucose}, HbA1c ${f(hba1c, 1)}%, triglycerides ${triglycerides} — all in optimal range.`,
    narrative: `Your fasting glucose at ${glucose} mg/dL, HbA1c at ${f(hba1c, 1)}%, and triglycerides at ${triglycerides} mg/dL all sit in the optimal range. Three metabolic markers aligning like this indicates stable blood sugar regulation and efficient fat metabolism.`,
    datapoints: [
      { label: "Glucose", value: String(glucose), unit: "mg/dL", verdict: "good" },
      { label: "HbA1c", value: f(hba1c, 1), unit: "%", verdict: "good" },
      { label: "Triglycerides", value: String(triglycerides), unit: "mg/dL", verdict: "good" },
    ],
  }
}

const rule_strongHDL: RuleFn = (ctx) => {
  if (!ctx.hasBloodPanel || ctx.bloodPanel!.hdl == null) return null
  const hdl = ctx.bloodPanel!.hdl!
  const sex = ctx.sex ?? ctx.questionnaire?.biologicalSex
  const threshold = sex === "female" ? 50 : 40
  if (hdl < threshold) return null

  return {
    id: "strong-hdl",
    priority: 5,
    panels: ["blood"],
    severity: "positive",
    title: "Your HDL is in the protective range",
    oneLiner: `HDL at ${hdl} mg/dL — above the ${threshold} mg/dL target${sex ? ` for ${sex}s` : ""}.`,
    narrative: `Your HDL cholesterol sits at ${hdl} mg/dL, above the protective threshold of ${threshold} mg/dL. HDL removes excess cholesterol from your bloodstream — think of it as the cleanup crew. Higher is better here.`,
    datapoints: [
      { label: "HDL", value: String(hdl), unit: "mg/dL", verdict: "good" },
    ],
  }
}

// ── MISSING DATA ───────────────────────────────────────────────────────────

const rule_missing_hsCRP: RuleFn = (ctx) => {
  if (!ctx.hasBloodPanel || hasMarker(ctx, "hsCrp")) return null
  return {
    id: "missing-hscrp",
    priority: 3,
    panels: ["blood"],
    severity: "recheck",
    title: "Inflammation marker not yet measured",
    oneLiner: "hs-CRP is missing from your blood panel — it's the key input for your full inflammatory picture.",
    narrative: "Your blood panel covers lipids, glucose, and metabolic markers — but hs-CRP, the primary inflammation marker, isn't included. This single test would unlock the connection between your oral bacteria and systemic inflammation. It's the most impactful addition to your next blood draw.",
    missingData: { whichPanel: "blood", whichMarker: "hs_crp", whyItMatters: "Connects oral gum bacteria to systemic inflammation — the single most impactful missing input" },
  }
}

const rule_missing_bloodPanel: RuleFn = (ctx) => {
  if (ctx.hasBloodPanel) return null
  return {
    id: "missing-blood",
    priority: 3,
    panels: [],
    severity: "recheck",
    title: "Blood panel pending",
    oneLiner: "Uploading a blood panel would connect your oral story to your metabolic and cardiovascular picture.",
    narrative: "Your oral microbiome data tells one side of the story. A blood panel adds the metabolic and cardiovascular chapter — LDL, glucose, inflammation markers. Together they reveal cross-panel patterns that individual panels can't show.",
    missingData: { whichPanel: "blood", whyItMatters: "Unlocks oral × blood cross-panel observations — inflammation, cardiovascular, metabolic" },
  }
}

const rule_missing_oralKit: RuleFn = (ctx) => {
  if (ctx.hasOralKit) return null
  return {
    id: "missing-oral",
    priority: 3,
    panels: [],
    severity: "recheck",
    title: "Oral microbiome pending",
    oneLiner: "Your mouth bacteria are the fastest-moving signal — adding a kit brings the oral connections online.",
    narrative: "Your oral microbiome is the fastest-changing biomarker panel — it responds to diet, sleep, and medication within days. Adding an oral kit would connect your blood markers to their oral drivers and unlock the full cross-panel picture.",
    missingData: { whichPanel: "oral", whyItMatters: "Fastest-changing biomarker — responds to diet and lifestyle in days" },
  }
}

const rule_missing_wearable: RuleFn = (ctx) => {
  if (ctx.hasWearable || !ctx.hasQuestionnaire) return null
  const q = ctx.questionnaire!
  const signals: string[] = []
  if (q.sleepDuration) signals.push(`${q.sleepDuration.replace(/_/g, "-")} hour sleep`)
  if (q.morningHeadaches === "frequent" || q.morningHeadaches === "daily") signals.push("morning headaches")
  if (q.mouthBreathing === "confirmed" || q.mouthBreathing === "often") signals.push("mouth breathing")

  return {
    id: "missing-wearable",
    priority: 4,
    panels: ["questionnaire"],
    severity: "context",
    title: "Sleep signals from your questionnaire",
    oneLiner: signals.length > 0
      ? `Your ${signals.join(" and ")} ${signals.length === 1 ? "is" : "are"} tracked via self-report. A wearable would add HRV and recovery data.`
      : "Your sleep signals are from self-report. A wearable would add objective overnight data — HRV, SpO₂, respiratory rate.",
    narrative: signals.length > 0
      ? `Your questionnaire captures ${signals.join(", ")}. These are valuable self-reported signals, but they're snapshots. A connected wearable would add continuous overnight tracking — heart rate variability, blood oxygen, respiratory rate — turning subjective observations into objective trends.`
      : "Your questionnaire provides baseline sleep signals. A connected wearable would add continuous overnight data — HRV for recovery, SpO₂ for breathing quality, respiratory rate for stress load. These measurements run every night, building a trend that single-night observations can't provide.",
  }
}

// ── EMPTY STATES ───────────────────────────────────────────────────────────

const rule_emptyState_questionnaireOnly: RuleFn = (ctx) => {
  if (ctx.hasOralKit || ctx.hasBloodPanel || !ctx.hasQuestionnaire) return null
  const q = ctx.questionnaire!
  const flags: string[] = []
  if (q.mouthBreathing === "confirmed" || q.mouthBreathing === "often") flags.push("mouth breathing")
  if (q.snoringReported === "yes" || q.snoringReported === "frequent") flags.push("snoring")
  if (q.morningHeadaches === "frequent" || q.morningHeadaches === "daily") flags.push("morning headaches")
  if (q.nonRestorativeSleep === "frequently" || q.nonRestorativeSleep === "always") flags.push("non-restorative sleep")
  if (q.daytimeFatigue === "moderate" || q.daytimeFatigue === "severe") flags.push("daytime fatigue")

  return {
    id: "empty-questionnaire-only",
    priority: 5,
    panels: ["questionnaire"],
    severity: "context",
    title: "Waiting for your markers",
    oneLiner: flags.length > 0
      ? `Based on your answers, you've flagged ${flags.slice(0, 3).join(", ")}. Adding oral and blood data will turn these into measurable findings.`
      : "Your questionnaire is complete. Adding your first panel — oral or blood — will turn your answers into cross-panel observations.",
    narrative: flags.length > 0
      ? `Your questionnaire has flagged ${flags.join(", ")}. Right now these are self-reported signals — important context, but not yet connected to biological measurements. Your oral kit will show whether your bacteria reflect these patterns, and a blood panel will add the metabolic and inflammatory layer. Each panel you add multiplies the observations we can surface.`
      : "Your questionnaire provides the baseline context for everything that follows. Your oral kit and blood panel will add the measurable layer — bacterial patterns, inflammatory markers, metabolic health — and each panel you add multiplies the cross-panel connections.",
  }
}

const rule_emptyState_nothing: RuleFn = (ctx) => {
  if (ctx.hasOralKit || ctx.hasBloodPanel || ctx.hasQuestionnaire) return null
  return {
    id: "empty-nothing",
    priority: 5,
    panels: [],
    severity: "context",
    title: "Waiting for your markers",
    oneLiner: "Start with the questionnaire, then add your first panel when ready.",
    narrative: "Everything starts with the questionnaire — it takes about 5 minutes and gives us the context to interpret your panels. From there, an oral kit or blood panel will bring your first measurable findings online.",
  }
}

// ── ENGINE ──────────────────────────────────────────────────────────────────

const ALL_RULES: RuleFn[] = [
  // Cross-panel (highest value)
  rule_nitricOxide_LDL,
  rule_gumBacteria_inflammation,
  rule_cavityBacteria_glucose,
  rule_mouthBreathing_multiSource,
  rule_sinus_inflammation,
  rule_shortSleep_metabolic,
  rule_hrv_cardiovascular,
  // Positive signals
  rule_strongDiversity,
  rule_strongMetabolic,
  rule_strongHDL,
  // Missing data
  rule_missing_hsCRP,
  rule_missing_bloodPanel,
  rule_missing_oralKit,
  rule_missing_wearable,
  // Empty states
  rule_emptyState_questionnaireOnly,
  rule_emptyState_nothing,
]

export function computeConvergeObservations(ctx: UserPanelContext): ConvergeObservation[] {
  const observations: ConvergeObservation[] = []
  const seen = new Set<string>()

  for (const rule of ALL_RULES) {
    const obs = rule(ctx)
    if (obs && !seen.has(obs.id)) {
      seen.add(obs.id)
      observations.push(obs)
    }
  }

  return observations.sort((a, b) => a.priority - b.priority)
}

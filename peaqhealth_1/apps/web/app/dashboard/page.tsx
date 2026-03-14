import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { calculatePeaqScore, type LifestyleInputs } from "@peaq/score-engine";
import { DashboardClient } from "./dashboard-client";

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapLifestyleRow(row: Record<string, unknown>): LifestyleInputs | undefined {
  if (!row) return undefined;
  // Map DB column values to score-engine enum values
  const brushMap: Record<string, string> = { once: "once", twice: "twice_plus", more: "twice_plus" };
  const flossMap: Record<string, string> = { never: "rarely_never", sometimes: "sometimes", daily: "daily" };
  const mouthMap: Record<string, string> = { none: "none", alcohol: "antiseptic", fluoride: "fluoride", natural: "none" };
  const visitMap: Record<string, string> = { "6mo": "within_6mo", "1yr": "6_to_12mo", "2yr": "over_1yr", more: "over_2yr" };
  const smokeMap: Record<string, string> = { never: "never", former: "former", current: "current" };
  const exMap: Record<string, string> = { sedentary: "sedentary", light: "light", moderate: "moderate", active: "active" };
  const durMap: Record<string, string> = { lt6: "lt_6", "6to7": "6_to_7", "7to8": "7_to_8", gt8: "gte_8" };
  const latMap: Record<string, string> = { lt10: "lt_15min", "10to20": "15_to_30min", "20to40": "30_to_60min", gt40: "gt_60min" };
  const qualMap: Record<string, string> = { poor: "poor", fair: "fair", good: "good", excellent: "very_good" };
  const wakeMap: Record<string, string> = { "0": "never", "1to2": "less_once_wk", "3to5": "once_twice_wk", gt5: "3plus_wk" };
  const fatMap: Record<string, string> = { none: "never", mild: "sometimes", moderate: "often", severe: "always" };

  return {
    exerciseLevel: (exMap[row.exercise_level as string] ?? "sedentary") as LifestyleInputs["exerciseLevel"],
    brushingFreq: (brushMap[row.brushing_freq as string] ?? "once") as LifestyleInputs["brushingFreq"],
    flossingFreq: (flossMap[row.flossing_freq as string] ?? "rarely_never") as LifestyleInputs["flossingFreq"],
    mouthwashType: (mouthMap[row.mouthwash_type as string] ?? "none") as LifestyleInputs["mouthwashType"],
    lastDentalVisit: (visitMap[row.last_dental_visit as string] ?? "over_1yr") as LifestyleInputs["lastDentalVisit"],
    smokingStatus: (smokeMap[row.smoking_status as string] ?? "never") as LifestyleInputs["smokingStatus"],
    knownHypertension: Boolean(row.known_hypertension),
    knownDiabetes: Boolean(row.known_diabetes),
    sleepDuration: (durMap[row.sleep_duration as string] ?? "7_to_8") as LifestyleInputs["sleepDuration"],
    sleepLatency: (latMap[row.sleep_latency as string] ?? "15_to_30min") as LifestyleInputs["sleepLatency"],
    sleepQualSelf: (qualMap[row.sleep_qual_self as string] ?? "fair") as LifestyleInputs["sleepQualSelf"],
    daytimeFatigue: (fatMap[row.daytime_fatigue as string] ?? "sometimes") as LifestyleInputs["daytimeFatigue"],
    nightWakings: (wakeMap[row.night_wakings as string] ?? "less_once_wk") as LifestyleInputs["nightWakings"],
    sleepMedication: "never",
  };
}

function generateInsightCards(result: ReturnType<typeof calculatePeaqScore>) {
  const cards: { icon: string; title: string; body: string; tag: string }[] = [];

  if (result.breakdown.sleepSource === "questionnaire" && result.breakdown.sleepSub < 16) {
    cards.push({
      icon: "😴",
      title: "Sleep quality could improve",
      body: "Your self-reported sleep metrics suggest room for improvement. Connecting a wearable gives us precise deep sleep, HRV, and SpO2 data.",
      tag: "Sleep",
    });
  }

  if (result.labFreshness === "aging" || result.labFreshness === "stale") {
    cards.push({
      icon: "🩸",
      title: "Blood labs are aging",
      body: `Your last lab results are ${result.labAgeDays} days old. Consider re-testing to keep your score accurate.`,
      tag: "Blood",
    });
  }

  if (result.breakdown.oralPending) {
    cards.push({
      icon: "🦷",
      title: "Oral panel is locked",
      body: "The oral microbiome panel accounts for 25 points. Order a kit to unlock Shannon diversity, nitrate reducers, and pathogen analysis.",
      tag: "Oral",
    });
  }

  // Lifestyle insights from score engine
  for (const insight of result.lifestyleInsights.slice(0, 2)) {
    cards.push({
      icon: "💡",
      title: "Lifestyle insight",
      body: insight,
      tag: "Lifestyle",
    });
  }

  if (result.interactions.poorSleepOralQ) {
    cards.push({
      icon: "⚡",
      title: "Sleep-oral interaction detected",
      body: "Poor sleep and poor oral hygiene have a bidirectional relationship. Improving either can positively affect the other.",
      tag: "Interaction",
    });
  }

  return cards.slice(0, 3);
}

// ─── Server Component ───────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard");

  // Fetch all data in parallel
  const [profileRes, wearableRes, labRes, oralRes, lifestyleRes, snapshotRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("wearable_connections").select("*").eq("user_id", user.id).limit(1),
      supabase
        .from("lab_results")
        .select("*")
        .eq("user_id", user.id)
        .order("report_date", { ascending: false })
        .limit(1),
      supabase
        .from("oral_kit_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("lifestyle_records")
        .select("*")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("score_snapshots")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

  const profile = profileRes.data ?? {
    id: user.id,
    first_name: null,
    last_name: null,
  };

  const hasWearable = (wearableRes.data?.length ?? 0) > 0;
  const hasBlood = (labRes.data?.length ?? 0) > 0;
  const hasOral = (oralRes.data?.length ?? 0) > 0;
  const hasLifestyle = !!lifestyleRes.data;

  // Map lifestyle row to score engine inputs
  const lifestyleInputs = hasLifestyle
    ? mapLifestyleRow(lifestyleRes.data as Record<string, unknown>)
    : undefined;

  // Calculate score
  const scoreResult = calculatePeaqScore(
    undefined, // No real wearable sleep data yet
    undefined, // No parsed blood inputs yet (we store raw markers)
    undefined, // No parsed oral inputs yet
    lifestyleInputs
  );

  // If no snapshot exists or data changed, save one
  const existingSnapshot = snapshotRes.data?.[0];
  if (!existingSnapshot || existingSnapshot.score !== scoreResult.score) {
    await supabase.from("score_snapshots").insert({
      user_id: user.id,
      score: scoreResult.score,
      breakdown: scoreResult.breakdown,
    });
  }

  // Build panel data for client
  const panels = {
    sleep: {
      pts: Math.round(scoreResult.breakdown.sleepSub),
      max: 28,
      active: scoreResult.breakdown.sleepSource !== "none",
      source: scoreResult.breakdown.sleepSource,
    },
    blood: {
      pts: scoreResult.breakdown.bloodSub,
      max: 28,
      active: !scoreResult.breakdown.bloodLocked && hasBlood,
      freshness: scoreResult.labFreshness,
    },
    oral: {
      pts: scoreResult.breakdown.oralSub,
      max: 25,
      active: !scoreResult.breakdown.oralPending,
    },
    lifestyle: {
      pts: Math.round(scoreResult.breakdown.lifestyleSub),
      max: 10,
      active: !scoreResult.breakdown.lifestylePending,
    },
    ix: {
      pts: scoreResult.breakdown.interactionPool,
      max: 14,
      active: true,
    },
  };

  // Determine pending panels
  const pendingPanels: string[] = [];
  if (!hasWearable) pendingPanels.push("sleep");
  if (!hasBlood) pendingPanels.push("blood");
  if (!hasOral) pendingPanels.push("oral");
  if (!hasLifestyle) pendingPanels.push("lifestyle");

  // Generate insights
  const insights = generateInsightCards(scoreResult);

  return (
    <DashboardClient
      profile={profile}
      scoreResult={scoreResult}
      panels={panels}
      pendingPanels={pendingPanels}
      insights={insights}
    />
  );
}

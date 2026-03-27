"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import type {
  OnboardingStep,
  OnboardingData,
  PanelStates,
  WearableProvider,
  LifestyleAnswers,
} from "./types";
import { INITIAL_DATA } from "./types";
import { LeftPanel } from "./left-panel";
import { StepWelcome } from "./step-welcome";
import { StepWearable } from "./step-wearable";
import { StepBlood } from "./step-blood";
import { StepOral } from "./step-oral";
import { StepLifestyle } from "./step-lifestyle";
import { StepScore } from "./step-score";
import { StepDone } from "./step-done";

export default function OnboardingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load session on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, [supabase.auth]);

  // If returning from WHOOP OAuth (?whoop=connected), mark wearable connected
  // and advance past the wearable step so user doesn't reconnect in a loop.
  useEffect(() => {
    if (searchParams.get("whoop") === "connected") {
      setData(prev => ({ ...prev, wearableProvider: "whoop" as WearableProvider, wearableConnected: true }));
      setStep("blood");
    }
  }, [searchParams]);

  // Derive panel states from data
  const panels: PanelStates = {
    sleep: data.wearableConnected ? "active" : step === "wearable" ? "pending" : "skipped",
    blood: data.bloodUploaded ? "active" : step === "blood" || step === "welcome" || step === "wearable" ? "pending" : "skipped",
    oral: data.oralOrdered ? "active" : step === "oral" || step === "welcome" || step === "wearable" || step === "blood" ? "pending" : "skipped",
    lifestyle: data.lifestyleCompleted ? "active" : step === "lifestyle" || step === "welcome" || step === "wearable" || step === "blood" || step === "oral" ? "pending" : "skipped",
  };

  // Persist wearable connection
  const persistWearable = useCallback(async (provider: WearableProvider) => {
    if (!userId) return;
    await supabase.from("wearable_connections").upsert({
      user_id: userId,
      provider,
      access_token: "onboarding_placeholder",
      refresh_token: "onboarding_placeholder",
      token_expires_at: new Date(Date.now() + 86400000).toISOString(),
    }, { onConflict: "user_id,provider" }).select();
  }, [userId, supabase]);

  // Persist oral kit order
  const persistOral = useCallback(async () => {
    if (!userId) return;
    await supabase.from("oral_kit_orders").insert({
      user_id: userId,
      kit_type: "zymo_oral",
      status: "ordered",
    });
  }, [userId, supabase]);

  // Persist lifestyle answers — map camelCase UI keys to snake_case DB columns
  const persistLifestyle = useCallback(async (answers: LifestyleAnswers) => {
    if (!userId) return;
    const toInt = (v: string) => (v !== "" ? parseInt(v, 10) : null);
    const toBool = (v: string | boolean) => {
      if (v === true  || v === "yes" || v === "true")  return true;
      if (v === false || v === "no"  || v === "false") return false;
      return null;
    };
    const row = {
      age_range:                  answers.ageRange        || null,
      biological_sex:             answers.biologicalSex   || null,
      exercise_level:             answers.exerciseLevel   || null,
      brushing_freq:              answers.brushingFreq    || null,
      flossing_freq:              answers.flossingFreq    || null,
      mouthwash_type:             answers.mouthwashType   || null,
      last_dental_visit:          answers.lastDentalVisit || null,
      smoking_status:             answers.smokingStatus   || null,
      known_hypertension:         answers.knownHypertension,
      known_diabetes:             answers.knownDiabetes,
      sleep_duration:             answers.sleepDuration   || null,
      sleep_latency:              answers.sleepLatency    || null,
      sleep_qual_self:            answers.sleepQualSelf   || null,
      night_wakings:              answers.nightWakings    || null,
      daytime_fatigue:            answers.daytimeFatigue  || null,
      sleep_medication:           "never",
      hypertension_dx:            toBool(answers.hypertensionDx),
      on_bp_meds:                 toBool(answers.onBPMeds),
      on_statins:                 toBool(answers.onStatins),
      family_history_cvd:         toBool(answers.familyHistoryCVD),
      vegetable_servings_per_day: toInt(answers.vegetableServings),
      fruit_servings_per_day:     toInt(answers.fruitServings),
      processed_food_frequency:   toInt(answers.processedFood),
      sugary_drinks_per_week:     toInt(answers.sugaryDrinks),
      alcohol_drinks_per_week:    toInt(answers.alcoholDrinks),
      stress_level:               answers.stressLevel     || null,
    };
    await fetch("/api/lifestyle/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
  }, [userId]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    setSaving(true);
    if (userId) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", userId);
    }
    router.push("/dashboard");
  }, [userId, supabase, router]);

  // Step handlers
  function handleWearableConnect(provider: string, _retroNights: number) {
    setData((prev) => ({ ...prev, wearableProvider: provider as WearableProvider, wearableConnected: true }));
    persistWearable(provider as WearableProvider);
    setStep("blood");
  }

  function handleWearableSkip() {
    setStep("blood");
  }

  function handleBloodComplete() {
    setData((prev) => ({ ...prev, bloodUploaded: true }));
    setStep("oral");
  }

  function handleBloodSkip() {
    setStep("oral");
  }

  function handleOralOrder() {
    setData((prev) => ({ ...prev, oralOrdered: true }));
    persistOral();
    setStep("lifestyle");
  }

  function handleOralSkip() {
    setStep("lifestyle");
  }

  function handleLifestyleComplete(answers: LifestyleAnswers) {
    setData((prev) => ({ ...prev, lifestyleCompleted: true, lifestyleAnswers: answers }));
    persistLifestyle(answers);
    setStep("score");
  }

  function handleLifestyleSkip() {
    setStep("score");
  }

  function renderStep() {
    switch (step) {
      case "welcome":
        return <StepWelcome onNext={() => setStep("wearable")} />;
      case "wearable":
        return <StepWearable onConnect={handleWearableConnect} onSkip={handleWearableSkip} />;
      case "blood":
        return <StepBlood onSkip={handleBloodSkip} onComplete={handleBloodComplete} />;
      case "oral":
        return <StepOral onOrder={handleOralOrder} onSkip={handleOralSkip} />;
      case "lifestyle":
        return <StepLifestyle onComplete={handleLifestyleComplete} onSkip={handleLifestyleSkip} />;
      case "score":
        return <StepScore data={data} onNext={() => setStep("done")} />;
      case "done":
        return <StepDone data={data} onFinish={completeOnboarding} saving={saving} />;
    }
  }

  return (
    <div className="flex min-h-svh bg-off-white">
      {/* Left sidebar — hidden on mobile for welcome, visible otherwise */}
      <div className={`hidden lg:block ${step === "welcome" ? "lg:hidden" : ""}`}>
        <LeftPanel currentStep={step} panels={panels} />
      </div>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg">
          {renderStep()}
        </div>
      </main>
    </div>
  );
}

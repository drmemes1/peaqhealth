"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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

export default function OnboardingPage() {
  const router = useRouter();
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

  // Persist lifestyle answers
  const persistLifestyle = useCallback(async (answers: LifestyleAnswers) => {
    if (!userId) return;
    await supabase.from("lifestyle_records").upsert({
      user_id: userId,
      ...answers,
    }, { onConflict: "user_id" }).select();
  }, [userId, supabase]);

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
        return <StepBlood onSkip={handleBloodSkip} />;
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

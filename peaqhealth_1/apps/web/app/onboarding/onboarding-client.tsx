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

  // Load session on mount — redirect returning users who already completed lifestyle
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();
      if (profile?.onboarding_completed) {
        router.push("/dashboard");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    sleep: data.wearableConnected ? "active"
      : ["welcome", "lifestyle", "wearable"].includes(step) ? "pending"
      : "skipped",
    blood: data.bloodUploaded ? "active"
      : ["welcome", "lifestyle", "wearable", "blood"].includes(step) ? "pending"
      : "skipped",
    oral: data.oralOrdered ? "active"
      : ["welcome", "lifestyle", "wearable", "blood", "oral"].includes(step) ? "pending"
      : "skipped",
    lifestyle: data.lifestyleCompleted ? "active" : "pending",
  };

  // wearable_connections_v2 is written by /api/junction/wearable-connected — no need to upsert here
  const persistWearable = useCallback(async (_provider: WearableProvider) => {
    // no-op: connection row is created by the wearable-connected API route
  }, []);

  // Persist oral kit order
  const persistOral = useCallback(async () => {
    if (!userId) return;
    await supabase.from("oral_kit_orders").insert({
      user_id: userId,
      kit_type: "zymo_oral",
      status: "ordered",
    });
  }, [userId, supabase]);

  // Complete onboarding — called from StepDone after all steps
  const completeOnboarding = useCallback(async () => {
    setSaving(true);
    // onboarding_completed was already set after the lifestyle step; navigate to dashboard
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
    setStep("score");
  }

  function handleOralSkip() {
    setStep("score");
  }

  // Lifestyle is required and handles its own API save.
  // After the completion screen the user clicks Continue → this is called.
  // We set onboarding_completed here so dashboard is accessible immediately.
  function handleLifestyleComplete(answers: LifestyleAnswers) {
    setData((prev) => ({ ...prev, lifestyleCompleted: true, lifestyleAnswers: answers }));
    if (userId) {
      supabase.from("profiles").update({ onboarding_completed: true }).eq("id", userId);
    }
    setStep("wearable");
  }

  function renderStep() {
    switch (step) {
      case "welcome":
        return <StepWelcome onNext={() => setStep("lifestyle")} />;
      case "lifestyle":
        return <StepLifestyle onComplete={handleLifestyleComplete} />;
      case "wearable":
        return <StepWearable onConnect={handleWearableConnect} onSkip={handleWearableSkip} />;
      case "blood":
        return <StepBlood onSkip={handleBloodSkip} onComplete={handleBloodComplete} />;
      case "oral":
        return <StepOral onOrder={handleOralOrder} onSkip={handleOralSkip} />;
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

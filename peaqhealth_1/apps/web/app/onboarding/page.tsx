import { Suspense } from "react";
import OnboardingClient from "./onboarding-client";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh bg-off-white" />}>
      <OnboardingClient />
    </Suspense>
  );
}

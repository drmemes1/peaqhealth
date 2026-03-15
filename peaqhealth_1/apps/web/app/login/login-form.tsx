"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogoSvg } from "../components/logo-svg";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    const supabase = createClient();
    const { data, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setLoading(false);
      if (authError.message.includes("Invalid login")) {
        setError("Invalid email or password.");
      } else if (authError.message.includes("Email not confirmed")) {
        setError("Please confirm your email before signing in.");
      } else {
        setError(authError.message);
      }
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", userId)
        .single();

      if (profile && !profile.onboarding_completed) {
        router.push("/onboarding");
        return;
      }
    }

    const next = searchParams.get("next") ?? "/dashboard";
    router.push(next);
  }

  return (
    <div className="flex min-h-svh">
      {/* Left panel — hero image, hidden on mobile */}
      <div
        className="relative hidden md:flex md:w-2/5 shrink-0 flex-col"
        style={{
          backgroundImage: "url('/images/sleep-mask-hero.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} />

        {/* Bottom copy */}
        <div className="absolute bottom-0 left-0 right-0 px-10 pb-12 flex flex-col gap-2">
          <span
            className="font-body text-[10px] uppercase tracking-[0.18em]"
            style={{ color: "var(--gold)" }}
          >
            Peaq Health · 2026
          </span>
          <p
            className="font-display font-light leading-[1.15]"
            style={{ fontSize: 36, color: "#FAFAF8" }}
          >
            Your body has a story.
            <br />
            <em style={{ color: "var(--gold)" }}>Peaq reads it.</em>
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-12" style={{ background: "var(--off-white)" }}>
        <div className="w-full max-w-sm flex flex-col items-center fade-up" style={{ animationDelay: "80ms" }}>
          {/* Logo — always visible on form side */}
          <div className="mb-8">
            <LogoSvg size={120} color="var(--ink)" />
          </div>

          <div className="w-full">
            <h1 className="font-display text-3xl font-light tracking-tight" style={{ color: "var(--ink)" }}>
              Sign in
            </h1>
            <p className="mt-2 font-body text-sm" style={{ color: "var(--ink-60)" }}>
              Welcome back. Enter your credentials below.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="font-body text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "var(--ink-60)" }}>
                  Email
                </span>
                <input
                  type="email" name="email" required autoComplete="email"
                  placeholder="you@example.com"
                  className="h-12 px-4 font-body text-sm outline-none transition-colors"
                  style={{ border: "0.5px solid var(--ink-30)", background: "var(--off-white)", color: "var(--ink)" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--ink)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--ink-30)")}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-body text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "var(--ink-60)" }}>
                  Password
                </span>
                <input
                  type="password" name="password" required autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-12 px-4 font-body text-sm outline-none transition-colors"
                  style={{ border: "0.5px solid var(--ink-30)", background: "var(--off-white)", color: "var(--ink)" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--ink)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--ink-30)")}
                />
              </label>

              {error && (
                <p className="font-body text-sm" style={{ color: "#991B1B" }}>{error}</p>
              )}

              <button
                type="submit" disabled={loading}
                className="mt-2 h-12 font-body text-xs font-medium uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: "var(--ink)" }}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center font-body text-sm" style={{ color: "var(--ink-60)" }}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="transition-colors hover:opacity-70" style={{ color: "var(--gold)" }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

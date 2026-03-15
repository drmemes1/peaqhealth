"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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

    // Check onboarding status to decide redirect
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
      {/* Left panel — ink background */}
      <div
        className="hidden lg:flex w-2/5 flex-col items-center justify-between px-10 py-12"
        style={{ background: "var(--ink)" }}
      >
        <div className="fade-up" style={{ animationDelay: "0ms" }}>
          <Image src="/peaq.png" alt="Peaq" width={80} height={28} style={{ filter: "brightness(0) invert(1)", width: "auto", height: 28 }} priority />
        </div>
        <div className="flex flex-col items-center gap-8 text-center">
          <p
            className="fade-up font-display font-light leading-[1.15]"
            style={{ fontSize: 36, color: "var(--white)", animationDelay: "100ms" }}
          >
            Your body has a story.<br />
            <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Peaq reads it.</em>
          </p>
          <div className="fade-up flex gap-3" style={{ animationDelay: "200ms" }}>
            {[
              { label: "Sleep", color: "#4A7FB5" },
              { label: "Blood", color: "#C0392B" },
              { label: "Oral", color: "#2D6A4F" },
            ].map((p) => (
              <span
                key={p.label}
                className="font-body text-[10px] uppercase tracking-[0.1em] px-3 py-1.5 rounded-sm"
                style={{ background: p.color + "22", color: p.color, border: `0.5px solid ${p.color}44` }}
              >
                {p.label}
              </span>
            ))}
          </div>
        </div>
        <p className="font-body text-[10px] uppercase tracking-widest" style={{ color: "rgba(250,250,248,0.2)" }}>
          Peaq Health · {new Date().getFullYear()}
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-off-white px-8 py-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <Image src="/peaq.png" alt="Peaq" width={80} height={28} style={{ filter: "brightness(0)", width: "auto", height: 28 }} priority />
        </div>

        <div className="w-full max-w-sm fade-up" style={{ animationDelay: "150ms" }}>
          <h1 className="font-display text-3xl font-light tracking-tight" style={{ color: "var(--ink)" }}>
            Sign in
          </h1>
          <p className="mt-2 font-body text-sm" style={{ color: "var(--ink-60)" }}>
            Welcome back. Enter your credentials below.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "var(--ink-60)" }}>Email</span>
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
              <span className="font-body text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "var(--ink-60)" }}>Password</span>
              <input
                type="password" name="password" required autoComplete="current-password"
                placeholder="••••••••"
                className="h-12 px-4 font-body text-sm outline-none transition-colors"
                style={{ border: "0.5px solid var(--ink-30)", background: "var(--off-white)", color: "var(--ink)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--ink)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--ink-30)")}
              />
            </label>

            {error && <p className="font-body text-sm" style={{ color: "#991B1B" }}>{error}</p>}

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
  );
}

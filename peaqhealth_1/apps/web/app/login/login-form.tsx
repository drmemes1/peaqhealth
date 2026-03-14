"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
    <div className="flex min-h-svh items-center justify-center bg-off-white px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/">
          <span className="font-display text-2xl font-semibold tracking-[0.04em] text-ink">
            peaq
          </span>
        </Link>

        <h1 className="mt-8 font-display text-3xl font-light tracking-tight text-ink">
          Sign in
        </h1>
        <p className="mt-2 font-body text-sm text-ink/50">
          Welcome back. Enter your credentials below.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-xs font-medium uppercase tracking-widest text-ink/40">
              Email
            </span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="h-12 border border-ink/15 bg-white px-4 font-body text-sm text-ink
                         placeholder:text-ink/30 outline-none transition-colors focus:border-gold"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-body text-xs font-medium uppercase tracking-widest text-ink/40">
              Password
            </span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="h-12 border border-ink/15 bg-white px-4 font-body text-sm text-ink
                         placeholder:text-ink/30 outline-none transition-colors focus:border-gold"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="font-body text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-12 bg-ink font-body text-sm font-medium uppercase tracking-[0.15em]
                       text-off-white transition-colors hover:bg-gold disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-sm text-ink/40">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-gold hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

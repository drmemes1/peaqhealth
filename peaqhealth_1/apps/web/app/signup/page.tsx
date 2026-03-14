"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const firstName = form.get("firstName") as string;
    const lastName = form.get("lastName") as string;
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    if (password.length < 8) {
      setLoading(false);
      setError("Password must be at least 8 characters.");
      return;
    }

    const supabase = createClient();

    // 1. Create auth user
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });

    if (authError) {
      setLoading(false);
      if (authError.message.includes("already registered")) {
        setError("An account with this email already exists.");
      } else {
        setError(authError.message);
      }
      return;
    }

    // 2. Upsert profile (trigger also fires, but we set names here)
    const userId = data.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert(
        {
          id: userId,
          email,
          first_name: firstName,
          last_name: lastName,
          onboarding_step: "welcome",
          onboarding_completed: false,
        },
        { onConflict: "id" }
      );
    }

    router.push("/onboarding");
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
          Create account
        </h1>
        <p className="mt-2 font-body text-sm text-ink/50">
          Start measuring what matters.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-xs font-medium uppercase tracking-widest text-ink/40">
                First name
              </span>
              <input
                type="text"
                name="firstName"
                required
                autoComplete="given-name"
                className="h-12 border border-ink/15 bg-white px-4 font-body text-sm text-ink
                           placeholder:text-ink/30 outline-none transition-colors focus:border-gold"
                placeholder="Jane"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-xs font-medium uppercase tracking-widest text-ink/40">
                Last name
              </span>
              <input
                type="text"
                name="lastName"
                required
                autoComplete="family-name"
                className="h-12 border border-ink/15 bg-white px-4 font-body text-sm text-ink
                           placeholder:text-ink/30 outline-none transition-colors focus:border-gold"
                placeholder="Doe"
              />
            </label>
          </div>

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
              minLength={8}
              autoComplete="new-password"
              className="h-12 border border-ink/15 bg-white px-4 font-body text-sm text-ink
                         placeholder:text-ink/30 outline-none transition-colors focus:border-gold"
              placeholder="At least 8 characters"
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
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-sm text-ink/40">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-gold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

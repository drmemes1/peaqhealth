"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { LogoSvg } from "../components/logo-svg";
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
    <div className="flex min-h-svh">
      {/* Left panel — full-bleed hero image */}
      <div className="relative hidden lg:flex w-2/5 flex-col items-center justify-between overflow-hidden px-10 py-12">
        <Image
          src="/images/peaq_mask.png"
          alt="no peaqing sleep mask"
          fill
          priority
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
        {/* Dark overlay so text stays readable over the photo */}
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />

        <div className="relative z-10">
          <LogoSvg size={52} color="rgba(250,250,248,0.9)" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-8 text-center">
          <p className="font-display font-light leading-[1.15]" style={{ fontSize: 36, color: "var(--white)" }}>
            Your body has a story.<br />
            <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Peaq reads it.</em>
          </p>
          <div className="flex gap-3">
            {[{ label: "Sleep", color: "#4A7FB5" }, { label: "Blood", color: "#C0392B" }, { label: "Oral", color: "#2D6A4F" }].map((p) => (
              <span key={p.label} className="font-body text-[10px] uppercase tracking-[0.1em] px-3 py-1.5"
                style={{ background: p.color + "22", color: p.color, border: `0.5px solid ${p.color}44` }}>
                {p.label}
              </span>
            ))}
          </div>
        </div>
        <p className="relative z-10 font-body text-[10px] uppercase tracking-widest" style={{ color: "rgba(250,250,248,0.2)" }}>
          Peaq Health · {new Date().getFullYear()}
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-off-white px-8 py-12">
        <div className="mb-8 lg:hidden">
          <LogoSvg size={52} color="var(--ink)" />
        </div>

        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-light tracking-tight" style={{ color: "var(--ink)" }}>Create account</h1>
          <p className="mt-2 font-body text-sm" style={{ color: "var(--ink-60)" }}>Start measuring what matters.</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              {[{ name: "firstName", label: "First name", placeholder: "Jane", autoComplete: "given-name" },
                { name: "lastName", label: "Last name", placeholder: "Doe", autoComplete: "family-name" }].map(f => (
                <label key={f.name} className="flex flex-col gap-1.5">
                  <span className="font-body text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-60)" }}>{f.label}</span>
                  <input type="text" name={f.name} required autoComplete={f.autoComplete} placeholder={f.placeholder}
                    className="h-12 px-4 font-body text-sm outline-none transition-colors"
                    style={{ border: "0.5px solid var(--ink-30)", background: "var(--off-white)", color: "var(--ink)" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--ink)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--ink-30)")} />
                </label>
              ))}
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-60)" }}>Email</span>
              <input type="email" name="email" required autoComplete="email" placeholder="you@example.com"
                className="h-12 px-4 font-body text-sm outline-none transition-colors"
                style={{ border: "0.5px solid var(--ink-30)", background: "var(--off-white)", color: "var(--ink)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--ink)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--ink-30)")} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-60)" }}>Password</span>
              <input type="password" name="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters"
                className="h-12 px-4 font-body text-sm outline-none transition-colors"
                style={{ border: "0.5px solid var(--ink-30)", background: "var(--off-white)", color: "var(--ink)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--ink)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--ink-30)")} />
            </label>
            {error && <p className="font-body text-sm" style={{ color: "#991B1B" }}>{error}</p>}
            <button type="submit" disabled={loading}
              className="mt-2 h-12 font-body text-xs font-medium uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-85 disabled:opacity-50"
              style={{ background: "var(--ink)" }}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center font-body text-sm" style={{ color: "var(--ink-60)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--gold)" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

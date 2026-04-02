"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LogoSvg } from "../components/logo-svg"
import { createClient } from "@/lib/supabase/client"

// ─── Ambient peaks SVG (loops slowly, no data needed) ────────────────────────

function AmbientPeaks() {
  const BASELINE = 120
  const CENTERS = [40, 95, 150, 205]
  const HALF_W  = 18
  const HEIGHTS = [60, 85, 55, 42]  // static tasteful heights
  const COLORS  = ["#4A7FB5", "#C0392B", "#2D6A4F", "#B8860B"]

  // Generate a catmull-rom-like smooth curve through apex points
  const apexYs = HEIGHTS.map(h => BASELINE - h)
  const pts = CENTERS.map((cx, i) => [cx, apexYs[i]])

  function smoothPath(points: number[][]): string {
    if (points.length < 2) return ""
    let d = `M ${points[0][0]},${points[0][1]}`
    for (let i = 0; i < points.length - 1; i++) {
      const x0 = i > 0 ? points[i - 1][0] : points[0][0]
      const y0 = i > 0 ? points[i - 1][1] : points[0][1]
      const x1 = points[i][0], y1 = points[i][1]
      const x2 = points[i + 1][0], y2 = points[i + 1][1]
      const x3 = i < points.length - 2 ? points[i + 2][0] : x2
      const y3 = i < points.length - 2 ? points[i + 2][1] : y2
      const cp1x = x1 + (x2 - x0) / 6
      const cp1y = y1 + (y2 - y0) / 6
      const cp2x = x2 - (x3 - x1) / 6
      const cp2y = y2 - (y3 - y1) / 6
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`
    }
    return d
  }

  const curvePath = smoothPath(pts)

  return (
    <svg
      viewBox="0 0 245 130"
      width="200"
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes peakBreath0 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.82)} }
        @keyframes peakBreath1 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.91)} }
        @keyframes peakBreath2 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.78)} }
        @keyframes peakBreath3 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.87)} }
      `}</style>
      <line x1={22} y1={BASELINE} x2={223} y2={BASELINE}
        stroke="rgba(250,250,248,0.08)" strokeWidth={0.5} />
      {CENTERS.map((cx, i) => (
        <polygon
          key={i}
          points={`${cx - HALF_W},${BASELINE} ${cx},${apexYs[i]} ${cx + HALF_W},${BASELINE}`}
          fill={COLORS[i] + "22"}
          stroke={COLORS[i]}
          strokeWidth={0.75}
          strokeLinejoin="round"
          style={{
            transformOrigin: `${cx}px ${BASELINE}px`,
            animation: `peakBreath${i} ${6 + i * 1.3}s ease-in-out infinite`,
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}
      <path
        d={curvePath}
        fill="none"
        stroke="rgba(250,250,248,0.12)"
        strokeWidth={0.75}
        strokeDasharray="4 4"
      />
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type Tab = "signin" | "signup"

export function LoginForm({ defaultTab = "signin" }: { defaultTab?: Tab }) {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const [tab, setTab] = useState<Tab>(defaultTab)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const supabase = createClient()

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd       = new FormData(e.currentTarget)
    const email    = fd.get("email") as string
    const password = fd.get("password") as string

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setLoading(false)
      if (authError.message.includes("Invalid login")) setError("Invalid email or password.")
      else if (authError.message.includes("Email not confirmed")) setError("Please confirm your email before signing in.")
      else setError(authError.message)
      return
    }

    const userId = data.user?.id
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles").select("onboarding_completed").eq("id", userId).single()
      if (profile && !profile.onboarding_completed) { router.push("/onboarding"); return }
    }
    router.push(searchParams.get("next") ?? "/dashboard")
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd        = new FormData(e.currentTarget)
    const firstName = fd.get("firstName") as string
    const lastName  = fd.get("lastName") as string
    const email     = fd.get("email") as string
    const password  = fd.get("password") as string

    if (password.length < 8) { setLoading(false); setError("Password must be at least 8 characters."); return }

    const { data, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName, last_name: lastName } },
    })

    if (authError) {
      setLoading(false)
      setError(authError.message.includes("already registered") ? "An account with this email already exists." : authError.message)
      return
    }

    const userId = data.user?.id
    if (userId) {
      await supabase.from("profiles").upsert(
        { id: userId, email, first_name: firstName, last_name: lastName, onboarding_step: "welcome", onboarding_completed: false },
        { onConflict: "id" }
      )
    }

    router.push("/onboarding")
  }

  async function handleGoogle() {
    setError(null)
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const font = "'Instrument Sans', system-ui, sans-serif"

  const VALUE_PROPS = [
    { label: "Blood", detail: "33 markers tracked from your lab reports", color: "#C0392B" },
    { label: "Sleep",  detail: "Wearable-synced every night", color: "#4A7FB5" },
    { label: "Oral",   detail: "16S rRNA microbiome sequencing", color: "#2D6A4F" },
  ]

  const inputStyle: React.CSSProperties = {
    height: 48, padding: "0 14px", width: "100%", boxSizing: "border-box",
    fontFamily: font, fontSize: 14, color: "var(--ink)",
    background: "var(--off-white)", border: "1px solid #D4D4CF",
    outline: "none", transition: "border-color 0.15s ease",
  }
  const labelStyle: React.CSSProperties = {
    fontFamily: font, fontSize: 10, textTransform: "uppercase",
    letterSpacing: "0.1em", color: "var(--ink-50)", display: "block", marginBottom: 6,
  }

  return (
    <div style={{ display: "flex", minHeight: "100svh", fontFamily: font }}>
      <style>{`
        .auth-input:focus { border-color: #B8860B !important; }
        .auth-tab { transition: color 0.15s ease, border-color 0.15s ease; }
        .google-btn:hover { background: #F0EEE8 !important; }
        @media (max-width: 1023px) { .auth-left { display: none !important; } }
      `}</style>

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div
        className="auth-left"
        style={{
          width: "60%", background: "#141410", display: "flex",
          flexDirection: "column", padding: "48px 56px", position: "relative", overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: "auto" }}>
          <LogoSvg size={44} color="rgba(250,250,248,0.9)" />
        </div>

        {/* Center content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 520 }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 52, fontWeight: 300, lineHeight: 1.1,
            color: "#FAFAF8", margin: "0 0 24px",
            opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(12px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}>
            How complete is<br />
            <em style={{ color: "#B8860B", fontStyle: "italic" }}>your Peaqture?</em>
          </h1>

          <p style={{
            fontFamily: font, fontSize: 16, lineHeight: 1.65,
            color: "rgba(250,250,248,0.55)", margin: "0 0 40px",
            opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(8px)",
            transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
          }}>
            Peaq combines your blood biomarkers, sleep data, and oral microbiome into a single longevity score — updated continuously as your biology changes.
          </p>

          {/* Value props */}
          <div style={{
            opacity: mounted ? 1 : 0, transition: "opacity 0.6s ease 0.2s",
          }}>
            {VALUE_PROPS.map((vp, i) => (
              <div key={vp.label} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 0",
                borderTop: i === 0 ? "0.5px solid rgba(250,250,248,0.08)" : undefined,
                borderBottom: "0.5px solid rgba(250,250,248,0.08)",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: vp.color, flexShrink: 0,
                }} />
                <span style={{ fontFamily: font, fontSize: 13, color: "rgba(250,250,248,0.9)", fontWeight: 500 }}>
                  {vp.label}
                </span>
                <span style={{ fontFamily: font, fontSize: 13, color: "rgba(250,250,248,0.38)" }}>
                  {vp.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Ambient peaks — bottom right */}
        <div style={{
          position: "absolute", bottom: 56, right: 56,
          opacity: 0.15, pointerEvents: "none",
        }}>
          <AmbientPeaks />
        </div>

        {/* Citation */}
        <p style={{
          fontFamily: font, fontSize: 10, letterSpacing: "0.06em",
          color: "rgba(250,250,248,0.2)", margin: "32px 0 0", textTransform: "uppercase",
        }}>
          Built on peer-reviewed science. Your data stays yours.
        </p>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, background: "var(--off-white)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "48px 40px",
      }}>
        {/* Mobile logo */}
        <div style={{ marginBottom: 32, display: "none" }} className="lg:hidden">
          <LogoSvg size={44} color="var(--ink)" />
        </div>

        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* Tab toggle */}
          <div style={{ display: "flex", borderBottom: "1px solid #E8E8E4", marginBottom: 32 }}>
            {(["signin", "signup"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setSuccess(null) }}
                className="auth-tab"
                style={{
                  fontFamily: font, fontSize: 14, fontWeight: tab === t ? 500 : 400,
                  color: tab === t ? "var(--ink)" : "var(--ink-38)",
                  background: "none", border: "none", borderBottom: `2px solid ${tab === t ? "var(--ink)" : "transparent"}`,
                  padding: "0 0 14px", marginRight: 28, cursor: "pointer",
                  marginBottom: -1,
                }}
              >
                {t === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* ── SIGN IN FORM ── */}
          {tab === "signin" && (
            <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email" name="email" required autoComplete="email"
                  placeholder="you@example.com"
                  className="auth-input"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = "#B8860B")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#D4D4CF")}
                />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"} name="password" required
                    autoComplete="current-password" placeholder="••••••••"
                    className="auth-input"
                    style={{ ...inputStyle, paddingRight: 48 }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#B8860B")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#D4D4CF")}
                  />
                  <button
                    type="button" onClick={() => setShowPw(s => !s)}
                    style={{
                      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      fontFamily: font, fontSize: 10, letterSpacing: "0.06em",
                      color: "var(--ink-38)", textTransform: "uppercase",
                    }}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <p style={{ fontFamily: font, fontSize: 13, color: "#C0392B", margin: 0 }}>{error}</p>
              )}

              <button
                type="submit" disabled={loading}
                style={{
                  height: 48, background: "var(--ink)", color: "var(--off-white)",
                  fontFamily: font, fontSize: 12, fontWeight: 500,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  border: "none", cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1, transition: "opacity 0.15s ease",
                  width: "100%",
                }}
              >
                {loading ? "Signing in…" : "Continue"}
              </button>
            </form>
          )}

          {/* ── SIGN UP FORM ── */}
          {tab === "signup" && (
            <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { name: "firstName", label: "First name", placeholder: "Jane", autoComplete: "given-name" },
                  { name: "lastName",  label: "Last name",  placeholder: "Doe",  autoComplete: "family-name" },
                ].map(f => (
                  <div key={f.name}>
                    <label style={labelStyle}>{f.label}</label>
                    <input
                      type="text" name={f.name} required autoComplete={f.autoComplete}
                      placeholder={f.placeholder} className="auth-input"
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = "#B8860B")}
                      onBlur={e => (e.currentTarget.style.borderColor = "#D4D4CF")}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email" name="email" required autoComplete="email"
                  placeholder="you@example.com" className="auth-input"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = "#B8860B")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#D4D4CF")}
                />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"} name="password"
                    required minLength={8} autoComplete="new-password"
                    placeholder="At least 8 characters" className="auth-input"
                    style={{ ...inputStyle, paddingRight: 48 }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#B8860B")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#D4D4CF")}
                  />
                  <button
                    type="button" onClick={() => setShowPw(s => !s)}
                    style={{
                      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      fontFamily: font, fontSize: 10, letterSpacing: "0.06em",
                      color: "var(--ink-38)", textTransform: "uppercase",
                    }}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <p style={{ fontFamily: font, fontSize: 13, color: "#C0392B", margin: 0 }}>{error}</p>
              )}
              {success && (
                <p style={{ fontFamily: font, fontSize: 13, color: "#2D6A4F", margin: 0 }}>{success}</p>
              )}

              <button
                type="submit" disabled={loading}
                style={{
                  height: 48, background: "var(--ink)", color: "var(--off-white)",
                  fontFamily: font, fontSize: 12, fontWeight: 500,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  border: "none", cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1, transition: "opacity 0.15s ease",
                  width: "100%",
                }}
              >
                {loading ? "Creating account…" : "Continue"}
              </button>

              <p style={{ fontFamily: font, fontSize: 11, color: "var(--ink-40)", margin: 0, lineHeight: 1.6 }}>
                By continuing you agree to our Privacy Policy. Your health data is encrypted and never sold.
              </p>
            </form>
          )}

          {/* ── OR divider ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "24px 0" }}>
            <div style={{ flex: 1, height: "0.5px", background: "#E8E8E4" }} />
            <span style={{ fontFamily: font, fontSize: 11, color: "var(--ink-30)", letterSpacing: "0.06em" }}>or</span>
            <div style={{ flex: 1, height: "0.5px", background: "#E8E8E4" }} />
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            className="google-btn"
            style={{
              height: 48, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              background: "var(--off-white)", border: "1px solid #D4D4CF",
              fontFamily: font, fontSize: 13, color: "var(--ink)",
              cursor: "pointer", transition: "background 0.15s ease",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* HIPAA footer */}
          <p style={{
            fontFamily: font, fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase",
            color: "var(--ink-25)", textAlign: "center", marginTop: 32,
          }}>
            HIPAA-compliant infrastructure · Azure + Supabase
          </p>
        </div>
      </div>
    </div>
  )
}

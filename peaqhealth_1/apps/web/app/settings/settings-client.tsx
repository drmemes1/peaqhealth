"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "../../lib/supabase/client"
import { WearableManager, type JunctionConnection } from "../components/wearable-manager"
import { AuthLayout } from "../components/auth-layout"

interface Props {
  userId: string
  email: string
  firstName: string
  lastName: string
  createdAt: string
  whoopConnected: boolean
  whoopLastSynced: string | null
  whoopNeedsReconnect?: boolean
  junctionConnections?: JunctionConnection[]
  initials: string
}

// ─── Small UI primitives ─────────────────────────────────────────────────────

function SectionLabel({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <p
      className="mb-2 font-body text-[10px] uppercase tracking-[0.12em]"
      style={{ color: danger ? "var(--blood-c)" : "var(--ink-30)" }}
    >
      {children}
    </p>
  )
}

function RowDivider() {
  return <div style={{ height: "0.5px", background: "var(--ink-12)", margin: "0 16px" }} />
}

function RowItem({
  label,
  description,
  right,
  onClick,
}: {
  label: string
  description?: string
  right?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-4"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="min-w-0">
        <p className="font-body text-sm" style={{ color: "var(--ink)" }}>{label}</p>
        {description && (
          <p className="mt-0.5 font-body text-xs leading-relaxed" style={{ color: "var(--ink-60)" }}>
            {description}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}


function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--ink-30)" }}>
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block font-body text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-60)" }}>
      {children}
    </span>
  )
}

// ─── Main settings component ─────────────────────────────────────────────────

export function SettingsClient({ userId, email, firstName: initialFirst, lastName: initialLast, createdAt, whoopConnected: initialWhoopConnected, whoopLastSynced, whoopNeedsReconnect, junctionConnections: initialJunctionConnections = [], initials: serverInitials }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [firstName, setFirstName] = useState(initialFirst)
  const [lastName, setLastName] = useState(initialLast)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [exporting, setExporting] = useState(false)

  const [passwordSent, setPasswordSent] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteInput, setDeleteInput] = useState("")
  const [deleting, setDeleting] = useState(false)

  const [whoopConnected, setWhoopConnected] = useState(initialWhoopConnected)
  const [junctionConnections, setJunctionConnections] = useState<JunctionConnection[]>(initialJunctionConnections)
  const [sleepHidden, setSleepHidden] = useState(false)

  // Smooth-scroll to #wearables when arriving from a dashboard CTA
  useEffect(() => {
    if (window.location.hash === "#wearables") {
      const el = document.getElementById("wearables")
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('peaq-sleep-panel-hidden')
    if (stored === 'true') setSleepHidden(true)
  }, [])


  const memberSince = new Date(createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const initials = [firstName[0], lastName[0]].filter(Boolean).join("").toUpperCase() || email[0]?.toUpperCase() || "?"
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim()

  // ── Actions ────────────────────────────────────────────────────────────────

  const saveProfile = async () => {
    setSaving(true)
    try {
      await supabase
        .from("profiles")
        .update({ first_name: firstName, last_name: lastName })
        .eq("id", userId)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  const sendPasswordReset = async () => {
    setSendingReset(true)
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      setPasswordSent(true)
    } finally {
      setSendingReset(false)
    }
  }

  const deleteAccount = async () => {
    if (deleteInput !== "DELETE") return
    setDeleting(true)
    try {
      const res = await fetch("/api/account/delete", { method: "POST" })
      if (res.ok) router.push("/")
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AuthLayout pageId="settings" initials={serverInitials}>
    <div className="mx-auto max-w-[660px] px-6 py-12">

      {/* ── Profile ─────────────────────────────────────────────────── */}
      <section className="mb-8 fade-up" style={{ animationDelay: "0.04s" }}>
        <SectionLabel>Profile</SectionLabel>
        <div
          className="rounded-lg p-5"
          style={{ background: "var(--warm-50)", border: "0.5px solid var(--ink-12)" }}
        >
          {/* Avatar + meta */}
          <div className="mb-5 flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-xl font-light"
              style={{ background: "var(--warm-100)", color: "var(--ink)" }}
            >
              {initials}
            </div>
            <div>
              <p className="font-body text-sm font-medium" style={{ color: "var(--ink)" }}>
                {displayName || "—"}
              </p>
              <p className="font-body text-xs" style={{ color: "var(--ink-60)" }}>
                {email}
              </p>
              <p className="mt-0.5 font-body text-[11px]" style={{ color: "var(--ink-30)" }}>
                Member since {memberSince}
              </p>
            </div>
          </div>

          {/* Name fields */}
          <div className="mb-3 grid grid-cols-2 gap-3">
            {[
              { label: "First name", value: firstName, set: setFirstName },
              { label: "Last name", value: lastName, set: setLastName },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <FieldLabel>{label}</FieldLabel>
                <input
                  value={value}
                  onChange={e => set(e.target.value)}
                  className="h-11 w-full px-3 font-body text-sm outline-none"
                  style={{
                    background: "var(--off-white)",
                    border: "0.5px solid var(--ink-30)",
                    color: "var(--ink)",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--ink)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--ink-30)")}
                />
              </div>
            ))}
          </div>

          <div className="mb-4">
            <FieldLabel>Email</FieldLabel>
            <input
              value={email}
              readOnly
              className="h-11 w-full px-3 font-body text-sm"
              style={{
                background: "var(--ink-06)",
                border: "0.5px solid var(--ink-12)",
                color: "var(--ink-60)",
                cursor: "default",
              }}
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="h-10 px-6 font-body text-[11px] uppercase tracking-[0.1em] font-medium transition-opacity hover:opacity-85 disabled:opacity-40"
            style={{ background: "var(--ink)", color: "var(--white)" }}
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
          </button>
        </div>
      </section>

      {/* ── Your Data ───────────────────────────────────────────────── */}
      <section className="mb-8 fade-up" style={{ animationDelay: "0.12s" }}>
        <SectionLabel>Your data</SectionLabel>
        <div className="overflow-hidden rounded-lg" style={{ border: "0.5px solid var(--ink-12)" }}>

          <RowItem
            label="Export health report"
            description="Printable PDF summary for your physician, cardiologist, or dentist"
            right={
              <button
                onClick={async () => {
                  setExporting(true)
                  try {
                    const res = await fetch("/api/account/export", { method: "POST" })
                    if (!res.ok) throw new Error("Export failed")
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `peaq-health-report-${new Date().toISOString().split("T")[0]}.pdf`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                  } catch (err) {
                    console.error("[export] failed:", err)
                  } finally {
                    setExporting(false)
                  }
                }}
                disabled={exporting}
                className="h-8 px-4 font-body text-[10px] uppercase tracking-[0.1em] font-medium transition-opacity hover:opacity-70"
                style={{ border: "0.5px solid var(--ink-30)", color: "var(--ink)", opacity: exporting ? 0.5 : 1, cursor: exporting ? "not-allowed" : "pointer" }}
              >
                {exporting ? "Generating…" : "Export"}
              </button>
            }
          />

          <RowDivider />

          <Link href="/settings/labs" className="block hover:opacity-80 transition-opacity">
            <RowItem
              label="Blood panel"
              description="Upload and manage your lab results"
              right={<ChevronRight />}
            />
          </Link>

          <RowDivider />

          <Link href="/settings/lifestyle" className="block hover:opacity-80 transition-opacity">
            <RowItem
              label="Lifestyle questionnaire"
              description="Update your health habits and daily routine"
              right={<ChevronRight />}
            />
          </Link>

        </div>
      </section>

      {/* ── Wearables ───────────────────────────────────────────────── */}
      <section id="wearables" className="mb-8 fade-up" style={{ animationDelay: "0.14s" }}>
        <SectionLabel>Wearables</SectionLabel>
        <WearableManager
          whoopConnected={whoopConnected}
          whoopLastSynced={whoopLastSynced}
          whoopNeedsReconnect={whoopNeedsReconnect}
          junctionConnections={junctionConnections}
          onDisconnected={() => setWhoopConnected(false)}
          onJunctionDisconnected={(provider) =>
            setJunctionConnections(prev => prev.filter(c => c.provider !== provider))
          }
        />
        <div style={{
          marginTop: '12px',
          padding: '14px 16px',
          background: 'var(--white)',
          border: '0.5px solid var(--ink-12)',
          borderRadius: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
        }}>
          <div>
            <p className="font-body text-sm" style={{ color: 'var(--ink)', marginBottom: '3px' }}>
              Include sleep in score
            </p>
            <p className="font-body text-xs leading-relaxed" style={{ color: 'var(--ink-40)', margin: 0, maxWidth: '340px' }}>
              When enabled, nightly WHOOP/Oura data contributes 30pts to your Peaq score. Disable if you prefer a blood + oral only baseline.
            </p>
            <p className="font-body" style={{ fontSize: '11px', color: sleepHidden ? '#A32D2D' : '#3B6D11', margin: '4px 0 0' }}>
              {sleepHidden ? 'Sleep is paused — score shown out of 70' : 'Sleep is active — contributing up to 30pts'}
            </p>
          </div>
          <button
            onClick={() => {
              const next = !sleepHidden
              setSleepHidden(next)
              localStorage.setItem('peaq-sleep-panel-hidden', next ? 'true' : 'false')
            }}
            style={{
              width: '44px', height: '24px', borderRadius: '12px',
              background: sleepHidden ? 'var(--ink-12)' : '#185FA5',
              border: 'none', cursor: 'pointer', position: 'relative',
              transition: 'background 0.2s ease', flexShrink: 0,
              padding: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: '3px',
              left: sleepHidden ? '3px' : '20px',
              width: '18px', height: '18px', borderRadius: '50%',
              background: 'white', transition: 'left 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }} />
          </button>
        </div>
      </section>

      {/* ── Account ─────────────────────────────────────────────────── */}
      <section className="mb-8 fade-up" style={{ animationDelay: "0.16s" }}>
        <SectionLabel>Account</SectionLabel>
        <div className="overflow-hidden rounded-lg" style={{ border: "0.5px solid var(--ink-12)" }}>

          <RowItem
            label="Change password"
            description={passwordSent ? "Check your inbox — reset link sent" : "Receive a password reset link by email"}
            right={
              <button
                onClick={sendPasswordReset}
                disabled={sendingReset || passwordSent}
                className="h-8 px-4 font-body text-[10px] uppercase tracking-[0.1em] font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ border: "0.5px solid var(--ink-30)", color: "var(--ink)" }}
              >
                {passwordSent ? "Sent ✓" : sendingReset ? "Sending…" : "Send link"}
              </button>
            }
          />

          <RowDivider />

          <RowItem
            label="Sign out"
            description="Sign out of your Peaq Health account on this device"
            right={
              <button
                onClick={signOut}
                className="h-8 px-4 font-body text-[10px] uppercase tracking-[0.1em] font-medium transition-opacity hover:opacity-70"
                style={{ border: "0.5px solid var(--ink-30)", color: "var(--ink)" }}
              >
                Sign out
              </button>
            }
          />

        </div>
      </section>

      {/* ── Danger zone ─────────────────────────────────────────────── */}
      <section className="mb-20 fade-up" style={{ animationDelay: "0.2s" }}>
        <SectionLabel danger>Danger zone</SectionLabel>
        <div
          className="rounded-lg p-5"
          style={{ border: "0.5px solid rgba(192,57,43,0.25)", background: "var(--blood-bg)" }}
        >
          <p className="font-body text-sm font-medium" style={{ color: "var(--ink)" }}>Delete account</p>
          <p className="mt-1 font-body text-xs leading-relaxed" style={{ color: "var(--ink-60)" }}>
            Permanently deletes your account and all associated data — score history, lab results, lifestyle records, and wearable connections. This action cannot be undone.
          </p>

          {!deleteOpen ? (
            <button
              onClick={() => setDeleteOpen(true)}
              className="mt-4 h-8 px-4 font-body text-[10px] uppercase tracking-[0.1em] font-medium transition-opacity hover:opacity-70"
              style={{ border: "0.5px solid var(--blood-c)", color: "var(--blood-c)" }}
            >
              Delete account
            </button>
          ) : (
            <div className="mt-4">
              <p className="mb-2 font-body text-[11px]" style={{ color: "var(--blood-c)" }}>
                Type <strong>DELETE</strong> to confirm permanent deletion
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={deleteInput}
                  onChange={e => setDeleteInput(e.target.value)}
                  placeholder="DELETE"
                  className="h-9 w-28 px-3 font-body text-sm outline-none"
                  style={{
                    border: "0.5px solid var(--blood-c)",
                    background: "var(--off-white)",
                    color: "var(--ink)",
                  }}
                />
                <button
                  onClick={deleteAccount}
                  disabled={deleteInput !== "DELETE" || deleting}
                  className="h-9 px-4 font-body text-[10px] uppercase tracking-[0.1em] font-medium transition-opacity disabled:opacity-40"
                  style={{ background: "var(--blood-c)", color: "var(--white)" }}
                >
                  {deleting ? "Deleting…" : "Confirm"}
                </button>
                <button
                  onClick={() => { setDeleteOpen(false); setDeleteInput("") }}
                  className="h-9 px-4 font-body text-[10px] uppercase tracking-[0.1em] font-medium transition-opacity hover:opacity-70"
                  style={{ border: "0.5px solid var(--ink-30)", color: "var(--ink-60)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
    </AuthLayout>
  )
}

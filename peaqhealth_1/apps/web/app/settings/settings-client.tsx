"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "../../lib/supabase/client"
import { useTheme } from "../components/theme-provider"

interface Props {
  userId: string
  email: string
  firstName: string
  lastName: string
  createdAt: string
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

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="relative flex shrink-0 cursor-pointer items-center transition-all"
      style={{
        width: 42,
        height: 24,
        borderRadius: 12,
        background: on ? "var(--ink)" : "var(--ink-30)",
        border: "none",
        outline: "none",
        padding: 0,
      }}
    >
      <span
        className="absolute transition-all"
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "var(--off-white)",
          left: on ? 21 : 3,
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
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

// ─── Report generator ────────────────────────────────────────────────────────

function buildReportHtml(data: Record<string, unknown>, name: string, email: string): string {
  const lab = data.labResults as Record<string, unknown> | null
  const lifestyle = data.lifestyle as Record<string, unknown> | null
  const snapshot = data.snapshot as Record<string, unknown> | null
  const wearable = data.wearable as Record<string, unknown> | null

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  const bloodRows = [
    ["LDL Cholesterol", lab?.ldl_mgdl, "mg/dL", "<100 optimal"],
    ["HDL Cholesterol", lab?.hdl_mgdl, "mg/dL", ">60 optimal"],
    ["Triglycerides", lab?.triglycerides_mgdl, "mg/dL", "<150"],
    ["Total Cholesterol", lab?.total_cholesterol_mgdl, "mg/dL", "<200"],
    ["Non-HDL Cholesterol", lab?.non_hdl_mgdl, "mg/dL", "<130 optimal"],
    ["ApoB", lab?.apob_mgdl, "mg/dL", "<80 optimal"],
    ["Lp(a)", lab?.lpa_mgdl, "mg/dL", "<30"],
    ["hs-CRP", lab?.hs_crp_mgl, "mg/L", "<1.0 optimal"],
    ["HbA1c", lab?.hba1c_pct, "%", "<5.7%"],
    ["Glucose", lab?.glucose_mgdl, "mg/dL", "70–99 fasting"],
    ["Insulin (fasting)", lab?.fasting_insulin_uiuml, "µIU/mL", "<5 optimal"],
    ["Vitamin D", lab?.vitamin_d_ngml, "ng/mL", "50–80 optimal"],
    ["eGFR", lab?.egfr_mlmin, "mL/min", ">60"],
    ["Creatinine", lab?.creatinine_mgdl, "mg/dL", "0.6–1.2"],
    ["ALT", lab?.alt_ul, "U/L", "<40"],
    ["AST", lab?.ast_ul, "U/L", "<40"],
    ["TSH", lab?.tsh_uiuml, "µIU/mL", "0.5–4.5"],
    ["Ferritin", lab?.ferritin_ngml, "ng/mL", "30–300"],
    ["WBC", lab?.wbc_kul, "K/µL", "4.0–10.5"],
    ["Hemoglobin", lab?.hemoglobin_gdl, "g/dL", "13.5–17.5"],
    ["Hematocrit", lab?.hematocrit_pct, "%", "38.5–50"],
    ["Platelets", lab?.platelets_kul, "K/µL", "150–400"],
    ["Albumin", lab?.albumin_gdl, "g/dL", "3.5–5.0"],
    ["Testosterone", lab?.testosterone_ngdl, "ng/dL", "300–1000 (men)"],
    ["Free Testosterone", lab?.free_testo_pgml, "pg/mL", "47–244 (men)"],
    ["SHBG", lab?.shbg_nmoll, "nmol/L", "10–57"],
    ["VLDL", lab?.vldl_mgdl, "mg/dL", "<30"],
    ["BUN", lab?.bun_mgdl, "mg/dL", "7–25"],
    ["Sodium", lab?.sodium_mmoll, "mmol/L", "136–145"],
    ["Potassium", lab?.potassium_mmoll, "mmol/L", "3.5–5.1"],
    ["Uric Acid", lab?.uric_acid_mgdl, "mg/dL", "3.4–7.0"],
  ].filter(row => row[1] != null && row[1] !== 0)

  const sleepRows = [
    ["Device", wearable?.provider ?? "—", ""],
    ["HRV (RMSSD)", wearable?.hrv_rmssd, "ms"],
    ["Sleep Efficiency", wearable?.sleep_efficiency, "%"],
    ["Deep Sleep", wearable?.deep_sleep_pct, "%"],
    ["REM Sleep", wearable?.rem_pct, "%"],
    ["SpO₂ Dips >3%", wearable?.spo2_dips, "events/night"],
  ].filter(row => row[1] != null)

  const score = Number(snapshot?.score ?? 0)
  const sleepSub = Number(snapshot?.sleep_sub ?? 0)
  const bloodSub = Number(snapshot?.blood_sub ?? 0)
  const lifestyleSub = Number(snapshot?.lifestyle_sub ?? 0)
  const oralSub = Number(snapshot?.oral_sub ?? 0)

  const lifestyleItems = lifestyle ? [
    ["Exercise frequency", lifestyle.exercise_freq],
    ["Exercise type", lifestyle.exercise_type],
    ["Sleep duration", lifestyle.sleep_duration],
    ["Sleep quality", lifestyle.sleep_quality],
    ["Diet type", lifestyle.diet_type],
    ["Alcohol", lifestyle.alcohol_freq],
    ["Smoking", lifestyle.smoking],
    ["Stress level", lifestyle.stress_level],
    ["BMI/Weight status", lifestyle.bmi_range],
    ["Sunscreen use", lifestyle.sunscreen_use],
    ["Dental visits/yr", lifestyle.dental_visits],
    ["Last dental visit", lifestyle.last_dental_visit],
    ["Flossing", lifestyle.flossing_freq],
  ].filter(row => row[1] != null && row[1] !== "") : []

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Peaq Health Report — ${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Instrument+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Instrument Sans', system-ui, sans-serif; color: #141410; background: #fff; font-size: 13px; line-height: 1.6; }
  .page { max-width: 720px; margin: 0 auto; padding: 48px 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 0.5px solid #ddd; padding-bottom: 24px; margin-bottom: 32px; }
  .logo { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: 22px; letter-spacing: 0.04em; color: #141410; }
  .patient-name { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: 28px; margin-bottom: 4px; }
  .meta { font-size: 11px; color: #888; }
  .score-block { display: flex; align-items: center; gap: 32px; background: #F7F5F0; border: 0.5px solid #DDD8CC; padding: 20px 24px; margin-bottom: 32px; }
  .score-num { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: 56px; line-height: 1; color: #141410; }
  .score-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 8px; }
  .score-breakdown { display: flex; gap: 20px; flex-wrap: wrap; }
  .score-pill { font-size: 11px; background: #EDE9E0; padding: 4px 10px; color: #444; }
  h2 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: 20px; border-bottom: 0.5px solid #eee; padding-bottom: 8px; margin: 28px 0 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #aaa; padding: 6px 0; border-bottom: 0.5px solid #eee; }
  td { padding: 7px 0; border-bottom: 0.5px solid #f0f0f0; font-size: 13px; }
  td:nth-child(2) { font-weight: 500; }
  td:last-child { color: #888; font-size: 11px; }
  .lifestyle-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .lifestyle-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 0.5px solid #f0f0f0; font-size: 12px; }
  .lifestyle-row span:first-child { color: #888; }
  .lifestyle-row span:last-child { font-weight: 500; }
  .no-data { font-size: 12px; color: #aaa; font-style: italic; padding: 12px 0; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 0.5px solid #eee; font-size: 10px; color: #aaa; display: flex; justify-content: space-between; }
  .disclaimer { font-size: 10px; color: #bbb; margin-top: 16px; line-height: 1.5; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      <div class="logo">Peaq Health</div>
      <div class="meta" style="margin-top:6px">Personal Health Report</div>
    </div>
    <div style="text-align:right">
      <div class="patient-name">${name || "—"}</div>
      <div class="meta">${email}</div>
      <div class="meta" style="margin-top:4px">Generated ${today}</div>
    </div>
  </div>

  ${score > 0 ? `
  <div class="score-block">
    <div>
      <div class="score-label">Peaq Score</div>
      <div class="score-num">${score}</div>
    </div>
    <div>
      <div class="score-label" style="margin-bottom:10px">Score breakdown</div>
      <div class="score-breakdown">
        ${sleepSub > 0 ? `<span class="score-pill">Sleep · ${sleepSub}pts</span>` : ""}
        ${bloodSub > 0 ? `<span class="score-pill">Blood · ${bloodSub}pts</span>` : ""}
        ${lifestyleSub > 0 ? `<span class="score-pill">Lifestyle · ${lifestyleSub}pts</span>` : ""}
        ${oralSub > 0 ? `<span class="score-pill">Oral · ${oralSub}pts</span>` : ""}
      </div>
    </div>
  </div>` : ""}

  <h2>Blood Panel</h2>
  ${lab ? `
  <div style="font-size:11px;color:#888;margin-bottom:10px">
    ${lab.lab_name ?? "Lab"} · Collection date: ${lab.collection_date ?? "—"}
  </div>
  ${bloodRows.length > 0 ? `
  <table>
    <thead><tr><th>Marker</th><th>Result</th><th>Unit</th><th>Reference</th></tr></thead>
    <tbody>
      ${bloodRows.map(([label, val, unit, ref]) => `
      <tr>
        <td>${label}</td>
        <td>${val}</td>
        <td style="color:#888">${unit}</td>
        <td>${ref}</td>
      </tr>`).join("")}
    </tbody>
  </table>` : '<p class="no-data">No blood markers on file.</p>'}
  ` : '<p class="no-data">No blood panel on file. Upload a lab report in Peaq Health to include blood data in future reports.</p>'}

  <h2>Sleep & Recovery</h2>
  ${sleepRows.length > 0 ? `
  <table>
    <thead><tr><th>Metric</th><th>Value</th><th>Unit</th></tr></thead>
    <tbody>
      ${sleepRows.map(([label, val, unit]) => `
      <tr><td>${label}</td><td>${val}</td><td style="color:#888">${unit}</td></tr>`).join("")}
    </tbody>
  </table>
  <div style="font-size:11px;color:#888;margin-top:8px">
    Last sync: ${wearable?.last_sync_at ? new Date(wearable.last_sync_at as string).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}
  </div>` : '<p class="no-data">No wearable data on file. Connect a wearable device in Peaq Health to include sleep data.</p>'}

  <h2>Lifestyle</h2>
  ${lifestyleItems.length > 0 ? `
  <div class="lifestyle-grid">
    ${lifestyleItems.map(([label, val]) => `
    <div class="lifestyle-row"><span>${label}</span><span>${val}</span></div>`).join("")}
  </div>` : '<p class="no-data">No lifestyle data on file. Complete the lifestyle questionnaire in Peaq Health.</p>'}

  <div class="footer">
    <span>Peaq Health · peaqhealth.me</span>
    <span>Generated ${today}</span>
  </div>
  <p class="disclaimer">This report is generated for informational purposes and is intended to support conversations with your healthcare provider. It is not a medical diagnosis, treatment recommendation, or clinical document. Always consult a qualified physician for medical advice.</p>

</div>
</body>
</html>`
}

// ─── Main settings component ─────────────────────────────────────────────────

export function SettingsClient({ userId, email, firstName: initialFirst, lastName: initialLast, createdAt }: Props) {
  const router = useRouter()
  const { theme, toggle } = useTheme()
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

  const exportData = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/account/export")
      const data = await res.json() as Record<string, unknown>
      const html = buildReportHtml(data, displayName, email)
      const win = window.open("", "_blank")
      if (win) {
        win.document.write(html)
        win.document.close()
        setTimeout(() => win.print(), 800)
      }
    } catch {
      // fail silently — user still gets the window
    } finally {
      setExporting(false)
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
    <div className="mx-auto max-w-[660px] px-6 py-12">

      {/* Page header */}
      <div className="mb-10 fade-up">
        <span className="font-body text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--ink-30)" }}>
          Account
        </span>
        <h1
          className="mt-1.5 font-display text-[42px] font-light leading-none"
          style={{ color: "var(--ink)" }}
        >
          Settings
        </h1>
      </div>

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
            className="h-10 px-6 font-body text-[11px] uppercase tracking-[0.1em] font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-40"
            style={{ background: "var(--ink)" }}
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
          </button>
        </div>
      </section>

      {/* ── Preferences ─────────────────────────────────────────────── */}
      <section className="mb-8 fade-up" style={{ animationDelay: "0.08s" }}>
        <SectionLabel>Preferences</SectionLabel>
        <div className="overflow-hidden rounded-lg" style={{ border: "0.5px solid var(--ink-12)" }}>
          <RowItem
            label="Dark mode"
            description="Easier on the eyes in low light"
            right={<Toggle on={theme === "dark"} onToggle={toggle} />}
          />
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
                onClick={exportData}
                disabled={exporting}
                className="h-8 px-4 font-body text-[10px] uppercase tracking-[0.1em] font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ border: "0.5px solid var(--ink-30)", color: "var(--ink)" }}
              >
                {exporting ? "Building…" : "Export"}
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
                  className="h-9 px-4 font-body text-[10px] uppercase tracking-[0.1em] font-medium text-white transition-opacity disabled:opacity-40"
                  style={{ background: "var(--blood-c)" }}
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
  )
}

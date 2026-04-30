import Link from "next/link";
import OraviLogo from "../components/OraviLogo";

const EFFECTIVE_DATE = "March 26, 2026";

const sections = [
  {
    title: "What we collect",
    body: [
      "Account information — your email address and encrypted password, used solely to authenticate you.",
      "Health data you provide — wearable sleep metrics (deep sleep %, REM %, HRV, resting heart rate), blood biomarker values from lab reports you upload, oral microbiome sequencing results from your at-home oral kit, and lifestyle questionnaire responses (age range, sex, exercise level, smoking status, diet, alcohol, stress).",
      "Device & usage data — browser type, IP address, pages visited, and session timestamps, collected automatically to keep the service running and secure. We do not use this data for advertising.",
      "Payment data — if you purchase a kit or subscription, payment is processed by Stripe. Oravi never sees or stores your full card number.",
    ],
  },
  {
    title: "How it's stored",
    body: [
      "All data is stored in Supabase (PostgreSQL), hosted on AWS in the United States, with encryption at rest and in transit (TLS 1.2+).",
      "Lab reports you upload are parsed server-side and the numeric biomarker values are stored. The original PDF is not retained after parsing.",
      "Health data is associated with your user ID only — no name, date of birth, or social security number is required or stored.",
      "AI-generated insights are created from anonymized numeric values only. Your user ID, name, and email are never sent to any AI model.",
      "Wearable connection tokens are stored encrypted. We store only the metrics needed for scoring — not your full activity history.",
    ],
  },
  {
    title: "How it's used",
    body: [
      "Your health data is used exclusively to generate your personalized dashboard, and produce AI-generated insights tailored to your data.",
      "We do not use your health data to train AI models.",
      "We may use aggregated, de-identified statistics (e.g. 'average HRV across all users') internally to improve the scoring methodology. No individual can be identified from this data.",
      "We may send you transactional emails (score updates, kit shipping notifications) and, if you opt in, educational health content. You can unsubscribe at any time.",
      "Our infrastructure follows HIPAA-compliant practices: data is encrypted at rest and in transit, access is role-based, and audit logging is enabled on all sensitive operations.",
    ],
  },
  {
    title: "What we never do",
    body: [
      "We do not sell your data — ever. Not to insurers, employers, advertisers, data brokers, or anyone else.",
      "We do not share your individual health data with third parties except as strictly necessary to operate the service (e.g. Our sequencing partner receives your kit registration to process your sample; Stripe processes payment).",
      "We do not use your data for targeted advertising on any platform.",
      "We do not use health data as a factor in pricing or eligibility for any product.",
    ],
  },
  {
    title: "Your rights",
    body: [
      "You can request a full export of your data at any time by emailing privacy@oravi.health.",
      "You can request deletion of your account and all associated health data. Deletion is permanent and processed within 30 days.",
      "You can update or correct your lifestyle and demographic data in Settings at any time.",
      "California residents have additional rights under CCPA, including the right to know, delete, and opt out of sale (we do not sell data). Requests can be directed to privacy@oravi.health.",
    ],
  },
  {
    title: "Cookies & tracking",
    body: [
      "We use a single session cookie to keep you logged in. We do not use third-party advertising cookies or tracking pixels.",
      "We use a lightweight, privacy-respecting analytics tool to understand aggregate usage (pages visited, session count). No personal health data is included in analytics.",
    ],
  },
  {
    title: "Changes to this policy",
    body: [
      "We will notify you by email and with an in-app banner if this policy changes in a material way. The effective date at the top of this page reflects the most recent update.",
    ],
  },
  {
    title: "Contact",
    body: [
      "Questions about this policy or how your data is handled: privacy@oravi.health",
      "Oravi, Inc. · United States",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-svh bg-off-white" style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)" }}>
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-off-white/92 backdrop-blur-[12px]"
        style={{ borderBottomColor: "var(--ink-12)" }}>
        <div className="mx-auto flex h-16 max-w-[820px] items-center justify-between px-6">
          <Link href="/">
            <OraviLogo size="md" showTagline={false} />
          </Link>
          <Link href="/dashboard"
            className="font-body text-[12px] uppercase tracking-[0.08em]"
            style={{ color: "var(--ink-60)" }}>
            Dashboard
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-[820px] px-6 py-16">

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <p className="font-body text-[11px] uppercase tracking-[0.16em]"
            style={{ color: "var(--gold)", marginBottom: 14 }}>
            Legal
          </p>
          <h1 style={{
            fontFamily: "var(--font-manrope), system-ui, sans-serif",
            fontSize: 42, fontWeight: 300, color: "var(--ink)",
            lineHeight: 1.15, margin: "0 0 16px",
          }}>
            Privacy Policy
          </h1>
          <p className="font-body" style={{ fontSize: 14, color: "var(--ink-60)", margin: 0 }}>
            Effective {EFFECTIVE_DATE}
          </p>
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "0.5px solid var(--ink-12)" }}>
            <p className="font-body" style={{ fontSize: 15, lineHeight: 1.75, color: "var(--ink-60)", margin: 0, maxWidth: 620 }}>
              Oravi is a personal health intelligence platform. We handle sensitive biomarker and
              lifestyle data. This policy explains exactly what we collect, how it is stored, and the
              commitments we make to you — in plain language.
            </p>
          </div>
        </div>

        {/* The short version */}
        <div style={{
          background: "rgba(184,134,11,0.04)",
          border: "0.5px solid rgba(184,134,11,0.28)",
          padding: "20px 24px",
          marginBottom: 52,
        }}>
          <p className="font-body text-[10px] uppercase tracking-[0.12em]"
            style={{ color: "var(--gold)", fontWeight: 600, marginBottom: 10 }}>
            The short version
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "Your health data is yours. We never sell it.",
              "It's used only to power your insights.",
              "AI models receive anonymized numbers — never your identity.",
              "You can export or delete everything, any time.",
              "We don't advertise to you based on your health data.",
            ].map((line, i) => (
              <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "var(--gold)", fontSize: 14, marginTop: 1, flexShrink: 0 }}>✦</span>
                <span className="font-body" style={{ fontSize: 14, lineHeight: 1.65, color: "var(--ink-60)" }}>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
          {sections.map((section, si) => (
            <div key={si}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 20 }}>
                <span className="font-body text-[10px] uppercase tracking-[0.1em]"
                  style={{ color: "var(--ink-30)", flexShrink: 0 }}>
                  {String(si + 1).padStart(2, "0")}
                </span>
                <h2 style={{
                  fontFamily: "var(--font-manrope), system-ui, sans-serif",
                  fontSize: 22, fontWeight: 400, color: "var(--ink)",
                  margin: 0, lineHeight: 1.2,
                }}>
                  {section.title}
                </h2>
              </div>
              <div style={{ paddingLeft: 30, borderLeft: "0.5px solid var(--ink-12)" }}>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                  {section.body.map((item, ii) => (
                    <li key={ii} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ color: "var(--ink-30)", fontSize: 11, marginTop: 3, flexShrink: 0 }}>—</span>
                      <p className="font-body" style={{ fontSize: 14, lineHeight: 1.75, color: "var(--ink-60)", margin: 0 }}>
                        {item}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 64, paddingTop: 24,
          borderTop: "0.5px solid var(--ink-12)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 12,
        }}>
          <OraviLogo size="sm" showTagline={false} />
          <p className="font-body" style={{ fontSize: 11, color: "var(--ink-30)", margin: 0 }}>
            © {new Date().getFullYear()} Oravi, Inc. · privacy@oravi.health
          </p>
        </div>
      </main>
    </div>
  );
}

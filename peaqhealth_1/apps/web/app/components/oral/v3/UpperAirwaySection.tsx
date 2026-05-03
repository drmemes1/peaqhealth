/**
 * Upper Airway & Breathing section — phenotype synthesis card +
 * three sub-panels (bacterial findings, STOP symptoms, nasal/sinus) +
 * peroxide confounder notice when flagged.
 *
 * Voice: clinical neutral, audit-forward. The USPSTF disclaimer is
 * surfaced via the methodology drawer (see methodologyKnowledge entry
 * for "Upper airway cluster"); this section assumes that disclaimer
 * is rendered alongside.
 */
import type { OralPageData, UpperAirwayV1Outputs } from "../../../../lib/oral/v3/page-data"

const SANS = "var(--font-body)"
const SERIF = "var(--font-display)"

// ── Tier copy ────────────────────────────────────────────────────────

interface TierCopy {
  title: string
  subtitle: string
  body: string
  tone: "good" | "watch" | "concern" | "attention" | "neutral"
}

const TIER_COPY: Record<string, TierCopy> = {
  tier_1_osa_likely: {
    title: "OSA likely — sleep evaluation recommended",
    subtitle: "Both bacterial and symptom signals point toward elevated obstructive sleep apnea risk.",
    body: "We recommend a sleep medicine consultation and discussion of objective testing (polysomnography or home sleep apnea test). This screening doesn't diagnose OSA — only a clinician using objective overnight monitoring can.",
    tone: "attention",
  },
  tier_2_osa_possible_bacterial: {
    title: "Bacterial OSA pattern detected",
    subtitle: "Three or more bacterial features match the OSA signature even though symptoms are mild.",
    body: "Subclinical OSA is plausible. A sleep medicine consultation is appropriate to rule out — symptoms can lag the bacterial shift by years.",
    tone: "concern",
  },
  tier_2_osa_possible_symptoms: {
    title: "STOP symptoms elevated",
    subtitle: "Your symptom score is elevated even though the bacterial pattern doesn't match OSA.",
    body: "Symptoms alone can warrant evaluation. Discuss with your primary care clinician — they'll decide whether sleep testing is the next step.",
    tone: "concern",
  },
  tier_3_mixed_signals: {
    title: "Mixed signals — monitor",
    subtitle: "Some signals suggest elevated risk; others don't.",
    body: "Discuss the symptoms you're experiencing with your primary care clinician. The mixed pattern doesn't yet warrant sleep testing on its own.",
    tone: "watch",
  },
  tier_4a_sinus_driven: {
    title: "Sinus / nasal obstruction is the more likely driver",
    subtitle: "Symptoms are present, but the bacterial pattern isn't OSA-typical and your nasal pathway is obstructed.",
    body: "ENT or allergy first — treating chronic nasal/sinus inflammation often resolves snoring and tiredness without sleep testing. If symptoms persist after nasal pathway treatment, revisit sleep medicine.",
    tone: "concern",
  },
  tier_4b_symptoms_unclear_cause: {
    title: "Symptoms without a clear bacterial or nasal cause",
    subtitle: "Sleep symptoms are present without a clear airway driver.",
    body: "Discuss with your primary care clinician for a differential workup — could include thyroid, mood, sleep hygiene, or other contributors.",
    tone: "watch",
  },
  tier_5_habitual_mouth_breathing: {
    title: "Habitual mouth breathing pattern",
    subtitle: "An aerobic shift in oral bacteria suggests you breathe through your mouth more than nose.",
    body: "No OSA-typical signals or symptoms present. Address through nasal hygiene, allergic-load management, and (if cleared by a clinician) night-time mouth taping.",
    tone: "watch",
  },
  tier_5a_nasal_obstruction_no_osa_symptoms: {
    title: "Nasal obstruction without OSA symptoms",
    subtitle: "Your nasal pathway is obstructed, but OSA symptoms are minimal.",
    body: "Address the obstruction (ENT or allergy) before assuming any airway risk. Fixing the nasal pathway often prevents downstream OSA development.",
    tone: "watch",
  },
  tier_6_commensal_dominant_healthy: {
    title: "Commensal-dominant pattern — healthy",
    subtitle: "Your oral community is commensal-dominant with no airway symptoms.",
    body: "No upper airway action needed. Continue what you're doing.",
    tone: "good",
  },
  tier_7_healthy_upper_airway: {
    title: "Healthy upper airway",
    subtitle: "All upper airway signals are within healthy ranges.",
    body: "No action needed.",
    tone: "good",
  },
  tier_confounded_peroxide: {
    title: "Result confounded by peroxide use",
    subtitle: "Recent peroxide product use can mimic the bacterial OSA pattern.",
    body: "Same reactive-oxygen-species mechanism, different cause. Re-test 7–14 days after your last peroxide exposure (whitening tray, strips, professional treatment) for an unconfounded reading.",
    tone: "neutral",
  },
}

const TONE_PALETTE: Record<TierCopy["tone"], { bg: string; border: string; ink: string }> = {
  good:      { bg: "rgba(123,153,113,0.12)", border: "var(--status-strong)",     ink: "#2F4A2A" },
  watch:     { bg: "rgba(184,137,58,0.12)",  border: "var(--status-watch)",      ink: "#5C3F0B" },
  concern:   { bg: "rgba(194,142,90,0.14)",  border: "#B8743F",                  ink: "#5A3210" },
  attention: { bg: "rgba(168,95,58,0.15)",   border: "var(--status-attention)",  ink: "#5C1F12" },
  neutral:   { bg: "rgba(20,20,16,0.04)",    border: "var(--ink-12)",            ink: "var(--ink-80)" },
}

// ── Inner components ─────────────────────────────────────────────────

function Eyebrow({ text }: { text: string }) {
  return (
    <p style={{
      fontFamily: SANS, fontSize: 11, letterSpacing: "0.16em",
      textTransform: "uppercase", fontWeight: 600, color: "var(--gold)",
      margin: "0 0 12px",
    }}>{text}</p>
  )
}

const titleStyle: React.CSSProperties = {
  fontFamily: SERIF, fontSize: 36, fontWeight: 700, color: "var(--ink)",
  margin: "0 0 14px", letterSpacing: "-0.025em", lineHeight: 1.1,
}

const bodyStyle: React.CSSProperties = {
  fontFamily: SANS, fontSize: 15, color: "var(--ink-80)",
  margin: "0 0 22px", maxWidth: 720, lineHeight: 1.6,
}

function FeatureCheck({ label, value, raw }: { label: string; value: boolean | null; raw?: string }) {
  const tone = value === true ? "concern" : value === false ? "good" : "neutral"
  const palette = TONE_PALETTE[tone]
  const symbol = value === true ? "✓" : value === false ? "—" : "?"
  return (
    <div style={{
      display: "flex", alignItems: "baseline", justifyContent: "space-between",
      padding: "10px 0", borderTop: "0.5px solid var(--ink-12)", gap: 16,
    }}>
      <div>
        <span style={{
          fontFamily: SANS, fontWeight: 700, color: palette.border,
          marginRight: 10, fontSize: 14, fontVariantNumeric: "tabular-nums",
        }}>{symbol}</span>
        <span style={{ fontFamily: SANS, fontSize: 14, color: "var(--ink)" }}>{label}</span>
      </div>
      {raw && <span style={{ fontFamily: SERIF, fontSize: 13, color: "var(--ink-60)", fontVariantNumeric: "tabular-nums" }}>{raw}</span>}
    </div>
  )
}

function BacterialPanel({ ua }: { ua: UpperAirwayV1Outputs }) {
  const f = ua.bacterial_features
  const r = f.raw_values
  return (
    <div style={panelStyle}>
      <PanelHeader eyebrow="1. Bacterial findings" count={`${ua.bacterial_features_count}/4`} hint="≥ 3 = OSA bacterial signature" />
      <FeatureCheck
        label="Actinobacteria enriched"
        value={f.actinobacteria_enriched}
        raw={`Rothia ${r.rothia_pct.toFixed(1)}% / Actino ${r.actinomyces_pct.toFixed(1)}%`}
      />
      <FeatureCheck
        label="Prevotella + Alloprevotella depleted"
        value={f.prevotella_depleted}
        raw={`${r.prevotella_combined_pct.toFixed(1)}% (< 5%)`}
      />
      <FeatureCheck
        label="Aerobic shift"
        value={f.aerobic_shift}
        raw={`Neisseria ${r.neisseria_pct.toFixed(1)}% (> 8%)`}
      />
      <FeatureCheck
        label="Shannon diversity reduced"
        value={f.shannon_reduced}
        raw={r.shannon != null ? `${r.shannon.toFixed(2)} (< 4.0)` : "not measured"}
      />
    </div>
  )
}

function STOPPanel({ ua }: { ua: UpperAirwayV1Outputs }) {
  return (
    <div style={panelStyle}>
      <PanelHeader
        eyebrow="2. STOP symptoms"
        count={`${ua.stop_score}/4`}
        hint={`total ${ua.stop_total_score}/6 (with age + sex)`}
      />
      <div style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink-80)", lineHeight: 1.6 }}>
        STOP screens 4 self-reported items: snoring, tiredness, observed apnea, hypertension.
        Score ≥ 2 is the elevated-risk threshold (Patel 2022, sensitivity 89%). Age ≥ 50 and male
        sex add 1 point each to the total score.
      </div>
      <p style={{
        fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "var(--ink-60)",
        margin: "10px 0 0", lineHeight: 1.5,
      }}>
        Screening tool only — not a diagnostic. OSA diagnosis requires polysomnography or a home
        sleep apnea test ordered by a clinician.
      </p>
    </div>
  )
}

function NasalPanel({ ua }: { ua: UpperAirwayV1Outputs }) {
  return (
    <div style={panelStyle}>
      <PanelHeader
        eyebrow="3. Nasal & sinus"
        count={ua.nasal_obstruction.category}
        hint={`score ${ua.nasal_obstruction.score}`}
      />
      <p style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink-80)", lineHeight: 1.6, margin: 0 }}>
        Combines self-reported nasal obstruction, dry mouth on waking, and any sinus history
        (CRS, polyps, deviated septum, surgery). Severe scores route to ENT first; moderate to
        allergy first.
      </p>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  background: "var(--off-white)",
  border: "0.5px solid var(--ink-12)",
  borderRadius: 12,
  padding: "18px 22px",
  marginBottom: 12,
}

function PanelHeader({ eyebrow, count, hint }: { eyebrow: string; count: string; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, gap: 12 }}>
      <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-60)" }}>
        {eyebrow}
      </span>
      <span style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
        {count} {hint && <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 400, color: "var(--ink-60)", marginLeft: 6 }}>· {hint}</span>}
      </span>
    </div>
  )
}

function PhenotypeSynthesis({ ua }: { ua: UpperAirwayV1Outputs }) {
  const copy = TIER_COPY[ua.tier] ?? TIER_COPY.tier_7_healthy_upper_airway
  const palette = TONE_PALETTE[copy.tone]
  return (
    <div style={{
      background: palette.bg, border: `1px solid ${palette.border}`,
      borderLeft: `4px solid ${palette.border}`, borderRadius: 14,
      padding: "26px 28px", marginBottom: 18,
    }}>
      <div style={{
        fontFamily: SANS, fontSize: 10, letterSpacing: "0.16em",
        textTransform: "uppercase", fontWeight: 700, color: palette.ink,
        marginBottom: 10, opacity: 0.85,
      }}>
        Phenotype synthesis · {ua.tier.replace(/_/g, " ").replace(/^tier (\d+a?)/, "Tier $1")}
      </div>
      <h3 style={{
        fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: palette.ink,
        margin: "0 0 8px", letterSpacing: "-0.018em", lineHeight: 1.2,
      }}>
        {copy.title}
      </h3>
      <p style={{ fontFamily: SANS, fontSize: 14, color: palette.ink, opacity: 0.78, margin: "0 0 16px", lineHeight: 1.55 }}>
        {copy.subtitle}
      </p>
      <p style={{ fontFamily: SANS, fontSize: 14, color: palette.ink, margin: "0 0 16px", lineHeight: 1.65 }}>
        {copy.body}
      </p>
      {ua.routing.primary_recommendation && (
        <p style={{
          fontFamily: SANS, fontSize: 13, color: palette.ink,
          margin: 0, padding: "12px 14px",
          background: "rgba(255,255,255,0.5)", borderRadius: 8, lineHeight: 1.55,
        }}>
          <strong>Recommendation:</strong> {ua.routing.primary_recommendation}
        </p>
      )}
    </div>
  )
}

function PeroxideNotice({ ua }: { ua: UpperAirwayV1Outputs }) {
  if (!ua.peroxide_caveat_required) return null
  const acute = ua.peroxide_severity === "acute_high"
  return (
    <div style={{
      background: "rgba(184,137,58,0.10)",
      border: "0.5px solid var(--status-watch)",
      borderRadius: 12, padding: "16px 20px", marginBottom: 12,
    }}>
      <div style={{
        fontFamily: SANS, fontSize: 10, letterSpacing: "0.16em",
        textTransform: "uppercase", fontWeight: 700, color: "var(--status-watch)",
        marginBottom: 8,
      }}>
        Peroxide confounder · {acute ? "acute high-dose" : "chronic low-dose"}
      </div>
      <p style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink-80)", margin: 0, lineHeight: 1.55 }}>
        {acute
          ? "Recent acute peroxide exposure (whitening tray < 48h, strips < 48h, or professional treatment < 7 days) can mimic the bacterial OSA pattern via the same reactive-oxygen-species mechanism. Re-test 7–14 days after your last peroxide exposure for an unconfounded reading."
          : "Chronic low-dose peroxide use (daily whitening toothpaste or peroxide mouthwash) may be inflating your protective community values. The classification proceeds, but interpretive weight is reduced."}
      </p>
    </div>
  )
}

// ── Top-level component ──────────────────────────────────────────────

export function UpperAirwaySection({ data }: { data: OralPageData }) {
  const ua = data.upper_airway

  if (!ua) {
    return (
      <section
        id="upper-airway"
        style={{
          background: "var(--off-white)", border: "0.5px dashed var(--ink-12)",
          borderRadius: 14, padding: "26px 28px", marginBottom: 16,
        }}
      >
        <Eyebrow text="Upper airway & breathing" />
        <h2 style={{ ...titleStyle, fontSize: 22, fontWeight: 600 }}>
          Upper airway scoring will appear after your next test
        </h2>
        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          Your kit was processed before the upper airway pipeline shipped.
        </p>
      </section>
    )
  }

  return (
    <section id="upper-airway" style={{ marginBottom: 16 }}>
      <Eyebrow text="Upper airway & breathing" />
      <h2 style={titleStyle}>How your airway is patterning</h2>
      <p style={bodyStyle}>
        Three lines of evidence — bacterial signature, symptom checklist (STOP), and nasal/sinus
        obstruction — synthesize into a single phenotype and routing recommendation. Screening
        tool only; not a diagnostic.
      </p>

      <PhenotypeSynthesis ua={ua} />
      <PeroxideNotice ua={ua} />
      <BacterialPanel ua={ua} />
      <STOPPanel ua={ua} />
      <NasalPanel ua={ua} />
    </section>
  )
}

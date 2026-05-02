/**
 * Periodontal burden section — replaces the "Gum stability" placeholder
 * from PR-γ1. Renders the perio v1 outputs persisted by PR-Δ-β1's
 * pipeline integration in the editorial format defined by the v1.6
 * mockup.
 *
 * Layout (top to bottom):
 *   1. Section eyebrow + title + subtitle (from risk classification)
 *   2. Two-card grid — Gum Inflammatory Risk + Gum Defense
 *      (side-by-side desktop, stacked mobile)
 *   3. Risk classification card with multi-paragraph layman copy,
 *      color-coded by risk category
 *   4. Red complex status panel
 *   5. Collapsible breakdown (<details>) with tier sums + boost
 *      factor + CDM contribution
 *   6. Reliability flags + confounder narratives (when present)
 *
 * Voice: clinical neutral, audit-forward. CDM contribution always
 * surfaces as a separate breakdown line item per ADR-0023's
 * transparency requirement.
 */
import type { OralPageData, PerioBurdenV1Outputs } from "../../../../lib/oral/v3/page-data"

const SANS = "var(--font-body)"
const SERIF = "var(--font-display)"

// ── Status labels (layman) ───────────────────────────────────────────

export const PBI_LABELS: Record<string, string> = {
  minimal: "Minimal",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  severe: "Severe",
}

// PerioDefenseCategory v1.3 — see ADR-0023 v1.3 revision section.
export const PDI_LABELS: Record<string, string> = {
  depleted: "Almost gone",
  borderline: "Stretched thin",
  adequate: "Doing the job",
  robust: "Strong",
}

interface RiskCopy {
  title: string
  subtitle: string
  body: string
  tone: "good" | "watch" | "concern" | "attention" | "neutral"
}

export const RISK_COPY: Record<string, RiskCopy> = {
  stable_low_risk: {
    title: "Healthy balance — keep doing what you're doing",
    subtitle: "Pathogen pressure is low and your protective community is intact.",
    body:
      "Periodontal-associated bacteria are minimal, and your defensive scaffold (Streptococcus mitis group, S. sanguinis, S. gordonii, Corynebacterium matruchotii) is doing its job. The pattern matches a mouth that's holding the balance well. Re-test in 12 months unless symptoms change.",
    tone: "good",
  },
  borderline: {
    title: "Watch this — pressure is up, defense is thin",
    subtitle: "Periodontal pathogens are detectable; defense is intact but stretched.",
    body:
      "You're sitting in a band where saliva-based 16S has reduced discriminative accuracy versus clinical periodontal probing (Lee 2026 reported AUC 0.736 for healthy-vs-Stage-I distinction). Worth noting — and worth discussing at your next cleaning so a clinician can verify with probing depths.",
    tone: "watch",
  },
  compensated_active_burden: {
    title: "Pressure is high, defenses still hold — preventive moment",
    subtitle: "Pathogen burden is elevated; your protective scaffold is still intact.",
    body:
      "This is the preventive window. Pathogen-associated bacteria are climbing, but your defensive commensals haven't collapsed yet. The intervention here is straightforward: a professional cleaning, daily flossing, and reducing antimicrobial mouthwash use. The goal is to relieve pathogen pressure before the defense scaffold thins.",
    tone: "concern",
  },
  compensated_dysbiosis_risk: {
    title: "Quiet now, but vulnerable — defenses are missing",
    subtitle: "Pathogen pressure is low, but your protective scaffold is thin.",
    body:
      "Your periodontal-pathogen abundance reads low — but your defensive community (Streptococcus mitis group, S. sanguinis, S. gordonii, Corynebacterium matruchotii) is also depleted. Without that scaffold, even small future increases in pathogen pressure can shift the balance. The intervention is rebuilding the protective community: avoid daily antimicrobial mouthwash, support biofilm diversity through diet, and re-test in 6 months.",
    tone: "concern",
  },
  active_disease_risk: {
    title: "Active gum stress — worth getting checked",
    subtitle: "Both pathogen burden and defense depletion are signaling stress.",
    body:
      "Periodontal-associated bacteria are elevated and your protective scaffold is depleted. This pattern correlates with active gum tissue inflammation in the published cohorts. We'd recommend a periodontal exam with probing depths within the next 4–6 weeks; clinical correlation is the gold standard.",
    tone: "attention",
  },
  insufficient_data: {
    title: "Not enough signal to score",
    subtitle: "We don't have enough bacterial data to compute a periodontal classification.",
    body:
      "This usually happens when the kit's named-species coverage is below the threshold the algorithm needs. Re-test or contact support if this persists across multiple kits.",
    tone: "neutral",
  },
}

const TONE_PALETTE: Record<RiskCopy["tone"], { bg: string; border: string; ink: string }> = {
  good:      { bg: "rgba(123,153,113,0.12)", border: "var(--status-strong)",     ink: "#2F4A2A" },
  watch:     { bg: "rgba(184,137,58,0.12)",  border: "var(--status-watch)",      ink: "#5C3F0B" },
  concern:   { bg: "rgba(194,142,90,0.14)",  border: "#B8743F",                  ink: "#5A3210" },
  attention: { bg: "rgba(168,95,58,0.15)",   border: "var(--status-attention)",  ink: "#5C1F12" },
  neutral:   { bg: "rgba(20,20,16,0.04)",    border: "var(--ink-12)",            ink: "var(--ink-80)" },
}

// ── Inner components ─────────────────────────────────────────────────

function Eyebrow({ text }: { text: string }) {
  return (
    <p
      style={{
        fontFamily: SANS,
        fontSize: 11,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        fontWeight: 600,
        color: "var(--gold)",
        margin: "0 0 12px",
      }}
    >
      {text}
    </p>
  )
}

const titleStyle: React.CSSProperties = {
  fontFamily: SERIF,
  fontSize: 36,
  fontWeight: 700,
  color: "var(--ink)",
  margin: "0 0 14px",
  letterSpacing: "-0.025em",
  lineHeight: 1.1,
}

const bodyStyle: React.CSSProperties = {
  fontFamily: SANS,
  fontSize: 15,
  color: "var(--ink-80)",
  margin: "0 0 22px",
  maxWidth: 720,
  lineHeight: 1.6,
}

interface MetricCardProps {
  eyebrow: string
  title: string
  value: number | null
  direction: "lower_better" | "higher_better"
  statusLabel: string | null
  statusTone: RiskCopy["tone"]
  body: string
  /**
   * Position of the patient-value marker on the bar, 0..1. Caller
   * computes from value / threshold_max with clamp.
   */
  markerPct: number | null
  /**
   * Zone shading along the bar from left to right. Each zone has a
   * width fraction (0..1) and a tone color used for the band fill.
   */
  zones: Array<{ widthPct: number; tone: RiskCopy["tone"] }>
}

function MetricCard({
  eyebrow,
  title,
  value,
  direction,
  statusLabel,
  statusTone,
  body,
  markerPct,
  zones,
}: MetricCardProps) {
  const palette = TONE_PALETTE[statusTone]
  return (
    <div
      style={{
        background: "var(--off-white)",
        border: "0.5px solid var(--ink-12)",
        borderRadius: 14,
        padding: "26px 28px 28px",
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--ink-60)",
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {eyebrow}
      </div>
      <h3
        style={{
          fontFamily: SERIF,
          fontSize: 20,
          fontWeight: 600,
          color: "var(--ink)",
          letterSpacing: "-0.012em",
          margin: "0 0 16px",
          lineHeight: 1.25,
        }}
      >
        {title}
      </h3>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <span
          style={{
            fontFamily: SERIF,
            fontSize: 44,
            fontWeight: 500,
            color: "var(--ink)",
            lineHeight: 1,
            letterSpacing: "-0.025em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value != null ? value.toFixed(2) : "—"}
        </span>
      </div>
      <p
        style={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 12,
          color: "var(--ink-60)",
          margin: "0 0 16px",
        }}
      >
        {direction === "lower_better" ? "Lower is better" : "Higher is better"}
      </p>

      {statusLabel && (
        <span
          style={{
            display: "inline-block",
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: palette.bg,
            color: palette.ink,
            padding: "5px 12px",
            borderRadius: 999,
            marginBottom: 18,
          }}
        >
          {statusLabel}
        </span>
      )}

      {/* Distribution bar with zone shading + patient marker */}
      <div
        style={{
          position: "relative",
          height: 12,
          borderRadius: 6,
          overflow: "hidden",
          background: "var(--warm-100)",
          marginBottom: 18,
        }}
        aria-hidden
      >
        <div style={{ display: "flex", height: "100%" }}>
          {zones.map((z, i) => (
            <div
              key={i}
              style={{
                width: `${z.widthPct * 100}%`,
                background: TONE_PALETTE[z.tone].border,
                opacity: 0.32,
              }}
            />
          ))}
        </div>
        {markerPct != null && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: `${Math.max(0, Math.min(1, markerPct)) * 100}%`,
              transform: "translate(-50%, -50%)",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "white",
              border: "2px solid var(--ink)",
              boxShadow: "0 1px 3px rgba(20,20,16,0.25)",
            }}
          />
        )}
      </div>

      <p
        style={{
          fontFamily: SANS,
          fontSize: 13,
          color: "var(--ink-80)",
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {body}
      </p>
    </div>
  )
}

function RiskClassificationCard({ copy, confidence }: { copy: RiskCopy; confidence: string | null }) {
  const palette = TONE_PALETTE[copy.tone]
  return (
    <div
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderLeft: `4px solid ${palette.border}`,
        borderRadius: 14,
        padding: "26px 28px",
        marginBottom: 18,
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: palette.ink,
          fontWeight: 700,
          marginBottom: 10,
          opacity: 0.85,
        }}
      >
        Periodontal classification{confidence ? ` · ${confidence} confidence` : ""}
      </div>
      <h3
        style={{
          fontFamily: SERIF,
          fontSize: 24,
          fontWeight: 700,
          color: palette.ink,
          margin: "0 0 8px",
          letterSpacing: "-0.018em",
          lineHeight: 1.2,
        }}
      >
        {copy.title}
      </h3>
      <p
        style={{
          fontFamily: SANS,
          fontSize: 14,
          color: palette.ink,
          opacity: 0.78,
          margin: "0 0 16px",
          lineHeight: 1.55,
        }}
      >
        {copy.subtitle}
      </p>
      <p
        style={{
          fontFamily: SANS,
          fontSize: 14,
          color: palette.ink,
          margin: 0,
          lineHeight: 1.65,
        }}
      >
        {copy.body}
      </p>
    </div>
  )
}

function RedComplexPanel({ redComplex }: { redComplex: PerioBurdenV1Outputs["red_complex"] }) {
  const explainer: Record<typeof redComplex.status_label, string> = {
    not_detected:
      "We didn't see any of the three red-complex periodontal pathogens (P. gingivalis, T. forsythia, T. denticola) in your sample at our 16S detection threshold (≥ 0.01%).",
    below_clinical_threshold:
      "Trace red-complex signal detected. At these abundance levels, V3-V4 16S calls are not clinically reliable — qPCR is the gold standard for definitive species-level confirmation. The current pattern is informational, not actionable.",
    detected:
      "One or more red-complex species are present at clinically relevant levels (≥ 0.5%). This pattern warrants clinical correlation with periodontal probing.",
  }

  return (
    <div
      style={{
        background: "var(--warm-50)",
        border: "0.5px solid var(--ink-12)",
        borderRadius: 12,
        padding: "20px 22px",
        marginBottom: 18,
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--gold)",
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        Red complex detection
      </div>
      <h4
        style={{
          fontFamily: SERIF,
          fontSize: 18,
          fontWeight: 600,
          color: "var(--ink)",
          margin: "0 0 10px",
          letterSpacing: "-0.012em",
        }}
      >
        {redComplex.status_label === "not_detected" && "Not detected"}
        {redComplex.status_label === "below_clinical_threshold" && "Below clinical detection threshold"}
        {redComplex.status_label === "detected" && "Detected — clinical correlation recommended"}
      </h4>
      <p style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink-80)", margin: "0 0 14px", lineHeight: 1.55 }}>
        {explainer[redComplex.status_label]}
      </p>
      {redComplex.detected_species.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
          {redComplex.detected_species.map(species => (
            <li
              key={species}
              style={{
                fontFamily: SANS,
                fontSize: 13,
                color: "var(--ink-80)",
                padding: "6px 0",
                borderTop: "0.5px solid var(--ink-12)",
                fontStyle: species.includes("(trace)") ? "italic" : "normal",
              }}
            >
              {species}
            </li>
          ))}
        </ul>
      )}
      <p
        style={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 11,
          color: "var(--ink-60)",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        Methodology — V3-V4 16S relative abundance is the input here. For definitive trace-level
        species detection, qPCR is the clinical standard.
      </p>
    </div>
  )
}

function BreakdownDrawer({ perio }: { perio: PerioBurdenV1Outputs }) {
  const b = perio.breakdown
  if (!b) return null

  const rows: Array<{ label: string; numeric: string; tag?: string }> = [
    {
      label: "Tier 1 pathogen sum",
      numeric: b.tier1_pathogen_sum.toFixed(3),
      tag: "Pg + Tf + Td + Fa, weighted",
    },
    {
      label: "Tier 2 pathogen sum",
      numeric: b.tier2_pathogen_sum.toFixed(3),
      tag: b.fn_bridging_boost_active ? "Fn bridging boost active (0.8×)" : "Fn baseline (0.5×)",
    },
    {
      label: "Tier 3 emerging",
      numeric: b.tier3_pathogen_sum.toFixed(3),
      tag: "M. faucium / Fretibacterium / Treponema HMT-237",
    },
    {
      label: "Co-occurrence boost",
      numeric: `${b.stacked_boost_factor.toFixed(2)}×`,
      tag:
        b.fa_pg_co_occurrence_active && b.pg_td_co_occurrence_active
          ? "Fa×Pg + Pg×Td (capped at 1.30×)"
          : b.fa_pg_co_occurrence_active
            ? "Fa × Pg active"
            : b.pg_td_co_occurrence_active
              ? "Pg × Td active"
              : "None active",
    },
    {
      label: "Pathogen burden (pre-CDM)",
      numeric: b.pbi_pre_cdm.toFixed(3),
      tag: `${perio.pbi_category ?? "—"}`,
    },
    {
      label: "Commensal modifier (CDM)",
      numeric: `+${b.cdm_contribution.toFixed(3)} (×${perio.cdm_factor?.toFixed(2) ?? "—"})`,
      tag: `Defense ${perio.pdi_category ? PDI_LABELS[perio.pdi_category] ?? perio.pdi_category : "—"}`,
    },
    {
      label: "Final adjusted burden (PBI)",
      numeric: perio.pbi != null ? perio.pbi.toFixed(3) : "—",
      tag: perio.pbi_category ? PBI_LABELS[perio.pbi_category] ?? perio.pbi_category : "—",
    },
    {
      label: "Defense Tier 1 sum",
      numeric: b.defense_tier1_sum.toFixed(3),
      tag: "Cm 2.0× + S. mitis group / Ss / Sg 1.0×",
    },
    {
      label: "Defense Tier 2 sum",
      numeric: b.defense_tier2_sum.toFixed(3),
      tag: "Rothia / Neisseria / Hp / An / Lautropia",
    },
    {
      label: "Total SUBP %",
      numeric: perio.total_subp_pct?.toFixed(3) ?? "—",
      tag: "Unweighted reference (Kageyama / Ma)",
    },
  ]

  return (
    <details
      style={{
        border: "0.5px solid var(--ink-12)",
        borderRadius: 12,
        padding: "16px 20px",
        background: "var(--off-white)",
        marginBottom: 12,
      }}
    >
      <summary
        style={{
          fontFamily: SANS,
          fontSize: 13,
          fontWeight: 600,
          color: "var(--ink)",
          cursor: "pointer",
          listStyle: "none",
        }}
      >
        How we got to {perio.pbi != null ? perio.pbi.toFixed(2) : "—"} ({rows.length} steps)
      </summary>
      <div style={{ marginTop: 14 }}>
        {rows.map((r, i) => (
          <div
            key={r.label}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "baseline",
              padding: "10px 0",
              borderTop: i === 0 ? undefined : "0.5px solid var(--ink-12)",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                {r.label}
              </div>
              {r.tag && (
                <div style={{ fontFamily: SANS, fontSize: 11, color: "var(--ink-60)", marginTop: 2 }}>
                  {r.tag}
                </div>
              )}
            </div>
            <div
              style={{
                fontFamily: SERIF,
                fontVariantNumeric: "tabular-nums",
                fontSize: 14,
                color: "var(--ink)",
              }}
            >
              {r.numeric}
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}

function ConfounderBadges({ confounders }: { confounders: Array<[string, string]> }) {
  if (confounders.length === 0) return null
  return (
    <details
      style={{
        border: "0.5px solid var(--ink-12)",
        borderRadius: 10,
        padding: "12px 16px",
        background: "var(--warm-50)",
      }}
    >
      <summary
        style={{
          fontFamily: SANS,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: "var(--ink-80)",
          cursor: "pointer",
          listStyle: "none",
        }}
      >
        Adjustments based on your lifestyle ({confounders.length})
      </summary>
      <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none" }}>
        {confounders.map(([key, narrative]) => (
          <li
            key={key}
            style={{
              fontFamily: SANS,
              fontSize: 13,
              color: "var(--ink-80)",
              padding: "8px 0",
              borderTop: "0.5px solid var(--ink-12)",
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontWeight: 600 }}>{key.replace(/_/g, " ")}: </span>
            {narrative}
          </li>
        ))}
      </ul>
    </details>
  )
}

// ── Status helpers ───────────────────────────────────────────────────

export function pbiTone(category: string | null): RiskCopy["tone"] {
  switch (category) {
    case "minimal": return "good"
    case "low":      return "watch"
    case "moderate": return "watch"
    case "high":     return "concern"
    case "severe":   return "attention"
    default:         return "neutral"
  }
}

export function pdiTone(category: string | null): RiskCopy["tone"] {
  switch (category) {
    case "robust":     return "good"
    case "adequate":   return "good"
    case "borderline": return "watch"
    case "depleted":   return "attention"
    default:           return "neutral"
  }
}

// PBI distribution bar zones (severity left → right): minimal / low /
// moderate / high / severe. Widths reflect the v1.2 thresholds (0–0.5,
// 0.5–1.5, 1.5–3.0, 3.0–6.0, 6.0+; cap at 8.0 for the visualization).
const PBI_ZONES: MetricCardProps["zones"] = [
  { widthPct: 0.5 / 8,   tone: "good" },      // minimal
  { widthPct: 1.0 / 8,   tone: "watch" },     // low (uncertainty zone)
  { widthPct: 1.5 / 8,   tone: "watch" },     // moderate
  { widthPct: 3.0 / 8,   tone: "concern" },   // high
  { widthPct: 2.0 / 8,   tone: "attention" }, // severe
]

const PBI_BAR_MAX = 8

// PDI v1.3 zones: depleted (<8) / borderline (8–15) / adequate (15–28) /
// robust (>28). Cap at 40 for the visualization.
const PDI_ZONES: MetricCardProps["zones"] = [
  { widthPct: 8 / 40,    tone: "attention" }, // depleted
  { widthPct: 7 / 40,    tone: "watch" },     // borderline
  { widthPct: 13 / 40,   tone: "good" },      // adequate
  { widthPct: 12 / 40,   tone: "good" },      // robust
]

const PDI_BAR_MAX = 40

// Flag-chip helpers — surface notable patterns like "Fusobacterium
// elevated" or "Severely depleted defenses" alongside the score cards.
export function flagChips(perio: PerioBurdenV1Outputs): Array<{ label: string; tone: RiskCopy["tone"] }> {
  const chips: Array<{ label: string; tone: RiskCopy["tone"] }> = []
  if (perio.breakdown?.fn_bridging_boost_active) {
    chips.push({ label: "F. nucleatum bridging active", tone: "watch" })
  }
  if (perio.breakdown?.fa_pg_co_occurrence_active) {
    chips.push({ label: "Fa × Pg co-occurrence", tone: "concern" })
  }
  if (perio.breakdown?.pg_td_co_occurrence_active) {
    chips.push({ label: "Pg × Td co-occurrence", tone: "concern" })
  }
  if (perio.pdi_category === "depleted") {
    chips.push({ label: "Defenses depleted", tone: "attention" })
  }
  if (perio.diagnostic_uncertainty_zone) {
    chips.push({ label: "Diagnostic uncertainty zone", tone: "watch" })
  }
  return chips
}

// ── Top-level component ──────────────────────────────────────────────

export function PerioBurdenSection({ data }: { data: OralPageData }) {
  const perio = data.perio

  // No perio data at all — kit predates the pipeline integration.
  if (!perio) {
    return (
      <section
        id="perio"
        style={{
          background: "var(--off-white)",
          border: "0.5px dashed var(--ink-12)",
          borderRadius: 14,
          padding: "26px 28px",
          marginBottom: 16,
        }}
      >
        <Eyebrow text="Gum health · Periodontal balance" />
        <h2 style={{ ...titleStyle, fontSize: 22, fontWeight: 600 }}>
          Periodontal scoring will appear after your next test
        </h2>
        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          Your kit was processed before the periodontal pipeline shipped. Once you re-test, this
          section will show your gum-inflammatory risk and gum defense scores along with a red
          complex detection panel.
        </p>
      </section>
    )
  }

  if (perio.risk_category === "insufficient_data") {
    return (
      <section
        id="perio"
        style={{
          background: "var(--off-white)",
          border: "0.5px solid var(--ink-12)",
          borderRadius: 14,
          padding: "26px 28px",
          marginBottom: 16,
        }}
      >
        <Eyebrow text="Gum health · Periodontal balance" />
        <h2 style={{ ...titleStyle, fontSize: 22, fontWeight: 600 }}>Not enough signal to score</h2>
        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          Your kit didn&apos;t produce enough named-species coverage to compute a periodontal
          classification. Re-test or contact support if this happens across multiple kits.
        </p>
      </section>
    )
  }

  const copy = RISK_COPY[perio.risk_category] ?? RISK_COPY.borderline
  const pbiStatusTone = pbiTone(perio.pbi_category)
  const pdiStatusTone = pdiTone(perio.pdi_category)
  const chips = flagChips(perio)
  const confounders = Object.entries(perio.confounder_adjustments)

  const pbiMarker = perio.pbi != null ? Math.max(0, Math.min(1, perio.pbi / PBI_BAR_MAX)) : null
  const pdiMarker = perio.pdi != null ? Math.max(0, Math.min(1, perio.pdi / PDI_BAR_MAX)) : null

  return (
    <section id="perio" style={{ marginBottom: 16 }}>
      <Eyebrow text="Gum health · Periodontal balance" />
      <h2 style={titleStyle}>{copy.title}</h2>
      <p style={bodyStyle}>{copy.subtitle}</p>

      {/* Two-card grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <MetricCard
          eyebrow="Bacteria driving inflammation"
          title="Gum Inflammatory Risk"
          value={perio.pbi}
          direction="lower_better"
          statusLabel={perio.pbi_category ? PBI_LABELS[perio.pbi_category] ?? perio.pbi_category : null}
          statusTone={pbiStatusTone}
          markerPct={pbiMarker}
          zones={PBI_ZONES}
          body="Tiered weighted sum of subgingival pathogens detectable in saliva, with co-occurrence boosts and a commensal-depletion modifier. Lower values mean less inflammatory pressure on gum tissue."
        />
        <MetricCard
          eyebrow="Bacteria protecting your gums"
          title="Gum Defense"
          value={perio.pdi}
          direction="higher_better"
          statusLabel={perio.pdi_category ? PDI_LABELS[perio.pdi_category] ?? perio.pdi_category : null}
          statusTone={pdiStatusTone}
          markerPct={pdiMarker}
          zones={PDI_ZONES}
          body="Tiered weighted sum of health-associated commensals — Corynebacterium matruchotii (corncob scaffold), Streptococcus mitis group, S. sanguinis / gordonii, plus shared health markers (Rothia, Neisseria, Haemophilus, Actinomyces, Lautropia)."
        />
      </div>

      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {chips.map(c => {
            const palette = TONE_PALETTE[c.tone]
            return (
              <span
                key={c.label}
                style={{
                  fontFamily: SANS,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  background: palette.bg,
                  color: palette.ink,
                  padding: "5px 10px",
                  borderRadius: 999,
                }}
              >
                {c.label}
              </span>
            )
          })}
        </div>
      )}

      <RiskClassificationCard copy={copy} confidence={perio.confidence} />
      <RedComplexPanel redComplex={perio.red_complex} />
      <BreakdownDrawer perio={perio} />
      <ConfounderBadges confounders={confounders} />
    </section>
  )
}

/**
 * Caries v3 section — risk-category headline, three supporting metric
 * cards (CLI / CSI / pH balance), flag badges, confounder badges.
 */
import type { OralPageData } from "../../../../lib/oral/v3/page-data"

const SANS = "var(--font-body)"
const SERIF = "var(--font-display)"

const RISK_HEADLINES: Record<string, string> = {
  low_risk_stable:            "Stable, low-risk balance",
  compensated_active_risk:    "Active challenge, held in check",
  compensated_dysbiosis_risk: "Pathogens low, but defenses depleted",
  active_disease_risk:        "Active pressure, compromised defense",
  insufficient_data:          "Insufficient data for risk classification",
}

function statusColor(category: string | null): string {
  if (!category) return "var(--ink-60)"
  if (/strong|robust|low|well_buffered/.test(category)) return "var(--status-strong)"
  if (/elevated|watch|moderate|mild/.test(category)) return "var(--status-watch)"
  if (/high|attention|depleted|severe/.test(category)) return "var(--status-attention)"
  return "var(--ink-60)"
}

function MetricCard({
  label,
  value,
  unit,
  category,
  description,
}: {
  label: string
  value: string
  unit?: string
  category: string | null
  description: string
}) {
  return (
    <div
      style={{
        background: "var(--off-white)",
        border: "0.5px solid var(--ink-12)",
        borderRadius: 12,
        padding: "20px 22px",
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-60)",
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
        <span
          style={{
            fontFamily: SERIF,
            fontSize: 36,
            fontWeight: 500,
            color: "var(--ink)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-60)" }}>{unit}</span>
        )}
      </div>
      {category && (
        <div
          style={{
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: statusColor(category),
            marginBottom: 12,
          }}
        >
          {category.replace(/_/g, " ")}
        </div>
      )}
      <div style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-60)", lineHeight: 1.5 }}>
        {description}
      </div>
    </div>
  )
}

function FlagBadge({ tone, children }: { tone: "warn" | "watch"; children: React.ReactNode }) {
  const palette = tone === "warn"
    ? { bg: "rgba(168,95,58,0.14)", color: "var(--status-attention)" }
    : { bg: "rgba(184,137,58,0.14)", color: "var(--status-watch)" }
  return (
    <span
      style={{
        fontFamily: SANS,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        background: palette.bg,
        color: palette.color,
        padding: "5px 10px",
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  )
}

export function CariesSection({ data }: { data: OralPageData }) {
  const caries = data.caries
  if (!caries) {
    return (
      <section id="caries" style={{ marginBottom: 16 }}>
        <Eyebrow text="Caries · pathogen × defense balance" />
        <h2 style={titleStyle}>Caries analysis pending</h2>
        <p style={bodyStyle}>
          Your kit was processed under a previous pipeline. A v3 reanalysis
          is queued — refresh this page after it completes.
        </p>
      </section>
    )
  }

  const headline = RISK_HEADLINES[caries.risk_category] ?? caries.risk_category.replace(/_/g, " ")
  const confounders = Object.entries(caries.confounder_adjustments)

  return (
    <section id="caries" style={{ marginBottom: 16 }}>
      <Eyebrow text="Caries · pathogen × defense balance" />
      <h2 style={titleStyle}>{headline}</h2>
      <p style={bodyStyle}>
        Three signals shape this picture: how much acid-producing pressure your community is generating, how
        well your defensive commensals are doing their job, and how your buffering capacity is holding the
        balance.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <MetricCard
          label="Cariogenic load"
          value={caries.cli != null ? caries.cli.toFixed(2) : "—"}
          category={caries.cli_category}
          description="Weighted abundance of acid-producing and aciduric species. Higher = more enamel pressure."
        />
        <MetricCard
          label="Commensal sufficiency"
          value={caries.csi != null ? caries.csi.toFixed(0) : "—"}
          unit="/100"
          category={caries.csi_category}
          description="How fully your protective commensals (S. sanguinis, S. gordonii, ADS-active) are populating their niche."
        />
        <MetricCard
          label="pH balance"
          value={caries.api != null ? caries.api.toFixed(2) : "—"}
          category={caries.api_category}
          description="Ratio of acid producers to buffers. Lower = better-buffered, more enamel-protective environment."
        />
      </div>

      {(caries.synergy_active || caries.compensated_dysbiosis) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {caries.synergy_active && <FlagBadge tone="warn">Synergy active</FlagBadge>}
          {caries.compensated_dysbiosis && (
            <FlagBadge tone="watch">Compensated dysbiosis</FlagBadge>
          )}
        </div>
      )}

      {confounders.length > 0 && (
        <ConfounderBadges confounders={confounders} />
      )}
    </section>
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

export function ConfounderBadges({
  confounders,
}: {
  confounders: Array<[string, string]>
}) {
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

/**
 * Halitosis section — two-axis headline scores + phenotype banner +
 * protective modifier + species table + LHM factors + methodology
 * disclosure (peroxide, blind spots).
 *
 * Voice: clinical neutral. Audit-forward — protective modifier and LHM
 * are surfaced as separate visible numbers, never folded into HMI
 * opaquely (architectural parity with perio CDM transparency rule).
 */
import type { OralPageData, HalitosisV2Outputs } from "../../../../lib/oral/v3/page-data"

const SANS = "var(--font-body)"
const SERIF = "var(--font-display)"

const PATHWAY_LABEL: Record<string, string> = {
  tongue_dominant: "Tongue-pathway dominant",
  gum_dominant: "Gum-pathway dominant",
  mixed: "Both pathways involved",
  minimal_pressure: "Minimal pressure",
}

const HMI_LABEL: Record<string, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
}

interface CategoryCopy {
  headline: string
  body: string
}

function categoryCopy(
  category: string | null,
  pathway: string | null,
): CategoryCopy {
  if (category === "low") {
    return {
      headline: "Bacterial halitosis pressure: low",
      body:
        "Your bacterial drivers are contained. Your protective bacterial community keeps your oral environment in balance. Bacterial intervention is not indicated.",
    }
  }
  if (category === "moderate") {
    if (pathway === "tongue_dominant") {
      return {
        headline: "Bacterial halitosis pressure: moderate, tongue-pathway dominant",
        body:
          "Your H2S (tongue-pathway) drivers are elevated. The bacteria producing volatile sulfur compounds on your tongue dorsum are outpacing your protective community's ability to suppress them. Highest-yield interventions: daily tongue scraping (single most effective intervention for tongue-pathway halitosis per Tsai 2008); address mouth breathing if present (causes tongue desiccation); consider S. salivarius K12 probiotic (BLIS K12, validated antimicrobial activity against tongue-pathway VSC producers).",
      }
    }
    if (pathway === "gum_dominant") {
      return {
        headline: "Bacterial halitosis pressure: moderate, gum-pathway dominant",
        body:
          "Your CH3SH (gum-pathway) drivers are elevated. Periodontal-associated bacteria producing methyl mercaptan are present at levels above what your protective community can suppress. Highest-yield interventions: periodontal evaluation by your dentist (Iatropoulos 2016 — periodontal therapy specifically reduces CH3SH); daily interdental cleaning (floss or interdental brushes); consider professional cleaning if last visit > 6 months.",
      }
    }
    return {
      headline: "Bacterial halitosis pressure: moderate, both pathways involved",
      body:
        "Both your tongue (H2S) and gum (CH3SH) pathways show elevated drivers. Your protective bacterial community is reduced relative to driver pressure across both pathways. Address both: daily tongue scraping for tongue-pathway; periodontal evaluation and interdental cleaning for gum-pathway; consider S. salivarius K12 probiotic for protective community restoration.",
    }
  }
  // high
  const pathwayBlurb =
    pathway === "tongue_dominant" ? "tongue-pathway dominant"
    : pathway === "gum_dominant" ? "gum-pathway dominant"
    : "both pathways involved"
  return {
    headline: `Bacterial halitosis pressure: high, ${pathwayBlurb}`,
    body:
      "Substantial bacterial halitosis pressure detected. This pattern warrants comprehensive evaluation. Discuss with your dentist or periodontist. If your protective community has collapsed (S. salivarius below typical levels), this represents a compensated dysbiosis pattern that may benefit from probiotic intervention. Consider whether systemic factors — medications causing xerostomia, recent antibiotics, GERD — may be contributing.",
  }
}

interface ToneInfo { bg: string; border: string; ink: string }
const TONE: Record<string, ToneInfo> = {
  good:      { bg: "rgba(123,153,113,0.12)", border: "var(--status-strong)",     ink: "#2F4A2A" },
  watch:     { bg: "rgba(184,137,58,0.12)",  border: "var(--status-watch)",      ink: "#5C3F0B" },
  concern:   { bg: "rgba(194,142,90,0.14)",  border: "#B8743F",                  ink: "#5A3210" },
  attention: { bg: "rgba(168,95,58,0.15)",   border: "var(--status-attention)",  ink: "#5C1F12" },
  neutral:   { bg: "rgba(20,20,16,0.04)",    border: "var(--ink-12)",            ink: "var(--ink-80)" },
}

function categoryTone(cat: string | null): keyof typeof TONE {
  // v2.5: 3-category system. 'low' is now the floor and reads as
  // healthy (good tone) since it represents minimal bacterial
  // pressure — not a "watch" zone.
  switch (cat) {
    case "low": return "good"
    case "moderate": return "watch"
    case "high": return "attention"
    default: return "neutral"
  }
}

const titleStyle: React.CSSProperties = {
  fontFamily: SERIF, fontSize: 36, fontWeight: 700, color: "var(--ink)",
  margin: "0 0 14px", letterSpacing: "-0.025em", lineHeight: 1.1,
}

const bodyStyle: React.CSSProperties = {
  fontFamily: SANS, fontSize: 15, color: "var(--ink-80)",
  margin: "0 0 22px", maxWidth: 720, lineHeight: 1.6,
}

function Eyebrow({ text }: { text: string }) {
  return (
    <p style={{
      fontFamily: SANS, fontSize: 11, letterSpacing: "0.16em",
      textTransform: "uppercase", fontWeight: 600, color: "var(--gold)",
      margin: "0 0 12px",
    }}>{text}</p>
  )
}

function ScoreCard({
  eyebrow, label, value, body,
}: {
  eyebrow: string
  label: string
  value: number | null
  body: string
}) {
  return (
    <div style={{
      background: "var(--off-white)", border: "0.5px solid var(--ink-12)",
      borderRadius: 12, padding: "20px 22px",
    }}>
      <div style={{
        fontFamily: SANS, fontSize: 10, letterSpacing: "0.16em",
        textTransform: "uppercase", color: "var(--ink-60)", fontWeight: 600,
        marginBottom: 10,
      }}>{eyebrow}</div>
      <h3 style={{
        fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: "var(--ink)",
        margin: "0 0 12px", letterSpacing: "-0.012em",
      }}>{label}</h3>
      <div style={{
        fontFamily: SERIF, fontSize: 44, fontWeight: 500, color: "var(--ink)",
        lineHeight: 1, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums",
        marginBottom: 4,
      }}>{value != null ? value.toFixed(2) : "—"}</div>
      <p style={{
        fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "var(--ink-60)",
        margin: "0 0 12px",
      }}>Lower is better</p>
      <p style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink-80)", lineHeight: 1.55, margin: 0 }}>
        {body}
      </p>
    </div>
  )
}

function HMIBanner({ hal }: { hal: HalitosisV2Outputs }) {
  const tone = TONE[categoryTone(hal.hmi_category)]
  const copy = categoryCopy(hal.hmi_category, hal.pathway)
  return (
    <div style={{
      background: tone.bg, border: `1px solid ${tone.border}`,
      borderLeft: `4px solid ${tone.border}`, borderRadius: 14,
      padding: "26px 28px", marginBottom: 18,
    }}>
      <div style={{
        fontFamily: SANS, fontSize: 10, letterSpacing: "0.16em",
        textTransform: "uppercase", fontWeight: 700, color: tone.ink,
        opacity: 0.85, marginBottom: 10,
      }}>
        Halitosis Mass Index (HMI) · {hal.hmi_category ? HMI_LABEL[hal.hmi_category] ?? hal.hmi_category : "—"}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{
          fontFamily: SERIF, fontSize: 56, fontWeight: 600, color: tone.ink,
          letterSpacing: "-0.025em", lineHeight: 1, fontVariantNumeric: "tabular-nums",
        }}>{hal.hmi != null ? hal.hmi.toFixed(2) : "—"}</span>
        <span style={{
          fontFamily: SANS, fontSize: 13, fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase", color: tone.ink,
          padding: "5px 12px", borderRadius: 999,
          background: "rgba(255,255,255,0.55)",
        }}>
          {hal.pathway ? PATHWAY_LABEL[hal.pathway] ?? hal.pathway : "—"}
        </span>
      </div>
      <h3 style={{
        fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: tone.ink,
        margin: "0 0 12px", letterSpacing: "-0.018em", lineHeight: 1.2,
      }}>
        {copy.headline}
      </h3>
      <p style={{ fontFamily: SANS, fontSize: 14, color: tone.ink, margin: 0, lineHeight: 1.65 }}>
        {copy.body}
      </p>
    </div>
  )
}

function SubjectiveRoutingNotice({ hal }: { hal: HalitosisV2Outputs }) {
  if (!hal.subjective_routing) return null
  return (
    <div style={{
      background: "rgba(184,137,58,0.10)",
      border: "0.5px solid var(--status-watch)",
      borderRadius: 12, padding: "18px 22px", marginBottom: 18,
    }}>
      <div style={{
        fontFamily: SANS, fontSize: 10, letterSpacing: "0.16em",
        textTransform: "uppercase", fontWeight: 700, color: "var(--status-watch)",
        marginBottom: 10,
      }}>
        If you experience halitosis symptoms despite a low reading
      </div>
      <p style={{ fontFamily: SANS, fontSize: 14, color: "var(--ink-80)", margin: 0, lineHeight: 1.6 }}>
        The salivary bacterial test cannot detect: <strong>postnasal drip</strong> (especially common in mouth breathers), <strong>tonsil stones</strong>, <strong>GERD or silent reflux</strong>, <strong>dietary contributors</strong>, or <strong>tongue coating physical accumulation</strong>. Consider evaluation by ENT (postnasal drip, tonsil stones), gastroenterology (GERD), or dietary review. Tongue scraping and addressing mouth breathing remain useful interventions regardless of bacterial reading.
      </p>
    </div>
  )
}

function ModifierStrip({ hal }: { hal: HalitosisV2Outputs }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12, marginBottom: 18,
    }}>
      <ModifierCell
        label="Protective modifier"
        value={hal.protective_modifier != null ? `${hal.protective_modifier.toFixed(2)}×` : "—"}
        hint={hal.protective_modifier != null && hal.protective_modifier <= 0.6
          ? "strong protection" : hal.protective_modifier != null && hal.protective_modifier >= 1.10
            ? "collapsed protection" : "partial"}
      />
      <ModifierCell
        label="Lifestyle modifier (LHM)"
        value={hal.lhm != null ? `${hal.lhm.toFixed(2)}×` : "—"}
        hint={hal.lhm != null && hal.lhm <= 1.05 ? "neutral" : hal.lhm != null && hal.lhm >= 1.40 ? "elevated" : "moderate"}
      />
      <ModifierCell
        label="H2S adjusted"
        value={hal.h2s_adjusted != null ? hal.h2s_adjusted.toFixed(2) : "—"}
        hint="tongue dorsum"
      />
      <ModifierCell
        label="CH3SH adjusted"
        value={hal.ch3sh_adjusted != null ? hal.ch3sh_adjusted.toFixed(2) : "—"}
        hint="periodontal"
      />
    </div>
  )
}

function ModifierCell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{
      background: "var(--off-white)", border: "0.5px solid var(--ink-12)",
      borderRadius: 10, padding: "14px 16px",
    }}>
      <div style={{
        fontFamily: SANS, fontSize: 9.5, letterSpacing: "0.14em",
        textTransform: "uppercase", color: "var(--ink-60)", fontWeight: 600,
        marginBottom: 8,
      }}>{label}</div>
      <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.015em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontFamily: SANS, fontSize: 11, color: "var(--ink-60)", marginTop: 6 }}>{hint}</div>
      )}
    </div>
  )
}

function DriverTable({ drivers }: { drivers: HalitosisV2Outputs["drivers"] }) {
  if (drivers.length === 0) return null
  const top = drivers.slice(0, 12)
  return (
    <details style={{
      border: "0.5px solid var(--ink-12)", borderRadius: 12,
      padding: "16px 20px", background: "var(--off-white)", marginBottom: 12,
    }}>
      <summary style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--ink)", cursor: "pointer", listStyle: "none" }}>
        Top driver species ({top.length})
      </summary>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontFamily: SANS, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--ink-60)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            <th style={{ padding: "8px 0", fontWeight: 600 }}>Species</th>
            <th style={{ padding: "8px 0", fontWeight: 600 }}>Pathway</th>
            <th style={{ padding: "8px 0", fontWeight: 600, textAlign: "right" }}>Abundance</th>
            <th style={{ padding: "8px 0", fontWeight: 600, textAlign: "right" }}>Contribution</th>
          </tr>
        </thead>
        <tbody>
          {top.map(d => (
            <tr key={`${d.species}-${d.pathway}`} style={{ borderTop: "0.5px solid var(--ink-12)" }}>
              <td style={{ padding: "10px 0", fontFamily: SERIF, fontStyle: "italic", color: "var(--ink)" }}>{d.species}</td>
              <td style={{ padding: "10px 0", color: "var(--ink-80)" }}>
                {d.pathway === "h2s" ? "H2S" : d.pathway === "ch3sh" ? "CH3SH" : "both"}
              </td>
              <td style={{ padding: "10px 0", textAlign: "right", color: "var(--ink-80)", fontVariantNumeric: "tabular-nums" }}>
                {d.abundance_pct.toFixed(2)}%
              </td>
              <td style={{ padding: "10px 0", textAlign: "right", color: "var(--ink-80)", fontVariantNumeric: "tabular-nums" }}>
                {d.contribution.toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

function LHMFactors({ factors }: { factors: HalitosisV2Outputs["lhm_factors"] }) {
  if (factors.length === 0) return null
  return (
    <details style={{
      border: "0.5px solid var(--ink-12)", borderRadius: 12,
      padding: "16px 20px", background: "var(--off-white)", marginBottom: 12,
    }}>
      <summary style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--ink)", cursor: "pointer", listStyle: "none" }}>
        Lifestyle factors driving LHM ({factors.length})
      </summary>
      <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none" }}>
        {factors.map(f => (
          <li key={f.factor} style={{
            display: "flex", justifyContent: "space-between",
            padding: "8px 0", borderTop: "0.5px solid var(--ink-12)",
            fontFamily: SANS, fontSize: 13, color: "var(--ink-80)",
          }}>
            <span>{f.factor.replace(/_/g, " ")}</span>
            <span style={{ fontFamily: SERIF, fontVariantNumeric: "tabular-nums" }}>×{f.multiplier.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}

function PeroxideAndBlindSpots({ hal }: { hal: HalitosisV2Outputs }) {
  return (
    <div style={{
      background: "var(--warm-50)", border: "0.5px solid var(--ink-12)",
      borderRadius: 12, padding: "18px 22px",
    }}>
      <div style={{ fontFamily: SANS, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, color: "var(--gold)", marginBottom: 8 }}>
        Methodology disclosure
      </div>
      {hal.peroxide_caveat && (
        <p style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink-80)", margin: "0 0 12px", lineHeight: 1.55 }}>
          <strong>Peroxide confounder:</strong> Your protective bacterial community values may be
          artificially elevated due to peroxide product use. The protective modifier in your
          score reflects current measurements but may overstate your true protective capacity.
          {hal.reliability_flags.includes("peroxide_acute_high") && " This result is provisional — re-test 7–14 days after your last peroxide exposure."}
        </p>
      )}
      <p style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink-80)", margin: "0 0 12px", lineHeight: 1.55 }}>
        <strong>What this score doesn&apos;t see:</strong> postnasal drip, GERD/reflux, tonsil stones,
        dietary contributors, and Candida (which requires ITS sequencing). If your halitosis
        reading is low but you experience symptoms, the cause may be one of these non-bacterial
        factors.
      </p>
      <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "var(--ink-60)", margin: 0, lineHeight: 1.5 }}>
        We measure 9 of the 12 primary halitosis-driver species at species level. Three secondary
        species (E. brachy, Centipeda periodontii, Eikenella corrodens) aren&apos;t in our current
        detection panel. Cumulative contribution of missing species is typically less than 0.05
        HMI points.
      </p>
    </div>
  )
}

// ── Top-level component ──────────────────────────────────────────────

export function HalitosisSection({ data }: { data: OralPageData }) {
  const hal = data.halitosis

  if (!hal) {
    return (
      <section
        id="halitosis"
        style={{
          background: "var(--off-white)", border: "0.5px dashed var(--ink-12)",
          borderRadius: 14, padding: "26px 28px", marginBottom: 16,
        }}
      >
        <Eyebrow text="Breath" />
        <h2 style={{ ...titleStyle, fontSize: 22, fontWeight: 600 }}>
          Halitosis scoring will appear after your next test
        </h2>
        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          Your kit was processed before the halitosis pipeline shipped.
        </p>
      </section>
    )
  }

  return (
    <section id="halitosis" style={{ marginBottom: 16 }}>
      <Eyebrow text="Breath" />
      <h2 style={titleStyle}>How likely your bacteria are to produce odor</h2>
      <p style={bodyStyle}>
        Two pathways: H2S from tongue-dorsum bacteria (Fusobacterium, Solobacterium) and CH3SH
        from periodontal bacteria (P. gingivalis, Prevotella). Each is multiplied by a protective
        modifier (your S. salivarius, Rothia, Haemophilus reduce odor production) and a lifestyle
        modifier (mouth breathing, dry mouth, hygiene, smoking, GERD).
      </p>

      <HMIBanner hal={hal} />
      <SubjectiveRoutingNotice hal={hal} />

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 16, marginBottom: 18,
      }}>
        <ScoreCard
          eyebrow="Tongue dorsum pathway"
          label="H2S drivers"
          value={hal.h2s_adjusted}
          body="Sulfur compounds from tongue-coating bacteria — F. nucleatum, S. moorei, Veillonella, Selenomonas. The classic morning-breath chemistry."
        />
        <ScoreCard
          eyebrow="Periodontal pathway"
          label="CH3SH drivers"
          value={hal.ch3sh_adjusted}
          body="Methyl mercaptan from gum-line bacteria — P. gingivalis, Prevotella spp., Treponema. The harder-to-mask, longer-lasting odor type."
        />
      </div>

      <ModifierStrip hal={hal} />
      <DriverTable drivers={hal.drivers} />
      <LHMFactors factors={hal.lhm_factors} />
      <PeroxideAndBlindSpots hal={hal} />
    </section>
  )
}

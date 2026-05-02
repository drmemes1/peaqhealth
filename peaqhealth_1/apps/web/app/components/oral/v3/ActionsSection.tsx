/**
 * Actions section — top 3-4 levers to consider, ranked by impact.
 *
 * Pulled from caries + NR confounder_adjustments where present, with a
 * generic fallback set keyed off risk categories. Voice: clinical
 * neutral — describe what's worth trying, not commands.
 */
import type { OralPageData } from "../../../../lib/oral/v3/page-data"

const SANS = "var(--font-body)"
const SERIF = "var(--font-display)"

interface Action {
  headline: string
  why: string
}

const GENERIC_ACTIONS: Record<string, Action> = {
  caries_active: {
    headline: "Loosen sugar frequency, not necessarily quantity",
    why: "Active acid pressure responds more to how often the mouth meets sugar than to total grams. Aim for fewer, larger encounters with longer recovery windows in between.",
  },
  caries_dysbiosis: {
    headline: "Re-seed the protective community before suppressing it further",
    why: "Defensive commensals are already depleted. Antimicrobial mouthwash will further suppress them — chlorhexidine should be reserved for short, indicated courses.",
  },
  nr_capacity: {
    headline: "Stop using antimicrobial mouthwash daily",
    why: "Chlorhexidine and broad antiseptic rinses suppress nitrate-reducing biomass directly. Saltwater or non-antimicrobial rinses are a lower-cost alternative for routine use.",
  },
  nr_composition: {
    headline: "Add 200–400 mg dietary nitrate, 4–5 days/week",
    why: "Beetroot, leafy greens, and arugula push the community toward Tier 1 reducers when sustained. Single doses don't shift composition; consistent intake does.",
  },
  nr_paradox: {
    headline: "Address the upstream pattern before adding more nitrate",
    why: "Composition isn't favoring conversion. Adding nitrate without composition change produces limited benefit. Re-examine smoking, antimicrobial use, and gut-feed first.",
  },
  shannon_low: {
    headline: "Reduce broad antimicrobial exposure",
    why: "Diversity collapse is most often driven by repeated antibiotic or antimicrobial-rinse cycles. Each additional cycle takes longer to recover.",
  },
  baseline: {
    headline: "Hold steady and re-test in six months",
    why: "Your microbiome looks stable across the dimensions we currently measure. The most useful next signal is whether it stays stable.",
  },
}

function pickActions(data: OralPageData): Action[] {
  const picks: Action[] = []

  // Honor confounder narratives as first-class actions when present.
  for (const [key, narrative] of Object.entries(data.caries?.confounder_adjustments ?? {})) {
    picks.push({ headline: key.replace(/_/g, " "), why: narrative })
  }
  for (const [key, narrative] of Object.entries(data.nr?.confounder_adjustments ?? {})) {
    picks.push({ headline: key.replace(/_/g, " "), why: narrative })
  }

  // Generic fallbacks keyed off risk categories.
  const c = data.caries?.risk_category
  const n = data.nr
  if (c === "compensated_active_risk" || c === "active_disease_risk") picks.push(GENERIC_ACTIONS.caries_active)
  if (c === "compensated_dysbiosis_risk") picks.push(GENERIC_ACTIONS.caries_dysbiosis)
  if (n?.risk_category === "capacity_constrained" || n?.risk_category === "compromised") picks.push(GENERIC_ACTIONS.nr_capacity)
  if (n?.risk_category === "composition_constrained" || n?.risk_category === "compromised") picks.push(GENERIC_ACTIONS.nr_composition)
  if (n?.paradox_flag) picks.push(GENERIC_ACTIONS.nr_paradox)
  if (data.snapshot.shannon_diversity != null && data.snapshot.shannon_diversity < 3) {
    picks.push(GENERIC_ACTIONS.shannon_low)
  }
  if (picks.length === 0) picks.push(GENERIC_ACTIONS.baseline)

  // De-duplicate by headline and cap at 4.
  const seen = new Set<string>()
  const uniq: Action[] = []
  for (const a of picks) {
    if (seen.has(a.headline)) continue
    seen.add(a.headline)
    uniq.push(a)
    if (uniq.length === 4) break
  }
  return uniq
}

export function ActionsSection({ data }: { data: OralPageData }) {
  const actions = pickActions(data)
  return (
    <section id="actions" style={{ marginBottom: 16 }}>
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
        Actions · levers worth trying
      </p>
      <h2
        style={{
          fontFamily: SERIF,
          fontSize: 36,
          fontWeight: 700,
          color: "var(--ink)",
          margin: "0 0 14px",
          letterSpacing: "-0.025em",
          lineHeight: 1.1,
        }}
      >
        Where the leverage is
      </h2>

      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          counterReset: "actions",
        }}
      >
        {actions.map((a, i) => (
          <li
            key={a.headline}
            style={{
              counterIncrement: "actions",
              padding: "20px 0",
              borderTop: i === 0 ? "0.5px solid var(--ink-12)" : undefined,
              borderBottom: "0.5px solid var(--ink-12)",
              display: "grid",
              gridTemplateColumns: "32px 1fr",
              gap: 18,
              alignItems: "flex-start",
            }}
          >
            <span
              style={{
                fontFamily: SERIF,
                fontSize: 24,
                fontWeight: 500,
                color: "var(--gold)",
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3
                style={{
                  fontFamily: SERIF,
                  fontSize: 19,
                  fontWeight: 600,
                  color: "var(--ink)",
                  margin: "0 0 6px",
                  letterSpacing: "-0.012em",
                  lineHeight: 1.25,
                }}
              >
                {a.headline}
              </h3>
              <p
                style={{
                  fontFamily: SANS,
                  fontSize: 14,
                  color: "var(--ink-80)",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {a.why}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

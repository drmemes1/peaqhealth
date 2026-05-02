/**
 * Snapshot strip — quick stats + composition bar. The bar is the main
 * navigation surface to /explore?category=...
 */
import type { OralPageData } from "../../../../lib/oral/v3/page-data"
import { CompositionBar } from "./CompositionBar"

const SANS = "var(--font-body)"
const SERIF = "var(--font-display)"

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--ink-60)",
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 36,
          fontWeight: 500,
          color: "var(--ink)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {hint && (
        <div
          style={{
            fontFamily: SANS,
            fontSize: 11,
            color: "var(--ink-60)",
            marginTop: 6,
            lineHeight: 1.4,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}

export function SnapshotSection({ data }: { data: OralPageData }) {
  const snap = data.snapshot
  const speciesText = snap.species_count != null ? snap.species_count.toString() : "—"
  const namedText = snap.named_species_count != null ? `${snap.named_species_count} named` : null
  const generaText = snap.genus_count != null ? snap.genus_count.toString() : "—"
  const shannonText = snap.shannon_diversity != null ? snap.shannon_diversity.toFixed(2) : "—"

  return (
    <section id="snapshot" style={{ marginBottom: 16 }}>
      <h2
        style={{
          fontFamily: SERIF,
          fontSize: 28,
          fontWeight: 600,
          color: "var(--ink)",
          margin: "0 0 6px",
          letterSpacing: "-0.02em",
        }}
      >
        Your community at a glance
      </h2>
      <p
        style={{
          fontFamily: SANS,
          fontSize: 14,
          color: "var(--ink-60)",
          margin: "0 0 28px",
          maxWidth: 640,
          lineHeight: 1.55,
        }}
      >
        A quick read on the scale and shape of your oral microbiome. Tap any segment of the bar to explore the species in that group.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 24,
          padding: "24px 28px",
          background: "var(--off-white)",
          border: "0.5px solid var(--ink-12)",
          borderRadius: 14,
          marginBottom: 24,
        }}
      >
        <Stat
          label="Species detected"
          value={speciesText}
          hint={namedText ?? undefined}
        />
        <Stat
          label="Distinct genera"
          value={generaText}
        />
        <Stat
          label="Shannon diversity"
          value={shannonText}
          hint={
            snap.shannon_diversity != null
              ? snap.shannon_diversity >= 4
                ? "Resilient (≥4.0)"
                : snap.shannon_diversity >= 3
                  ? "Watch (3–4)"
                  : "Low (<3)"
              : undefined
          }
        />
      </div>

      <CompositionBar composition={data.composition} />
    </section>
  )
}

import type { Metadata } from "next"
import {
  Panel,
  QuickStat,
  CompositionBar,
  SignalChain,
  InterventionCard,
  ConnectionCard,
  DistributionViz,
  TrajectoryPanel,
} from "../../components/oral-panel"
import { getInterventionById } from "../../../lib/oral/interventionRegistry"

export const metadata: Metadata = {
  title: "Oravi oral panel components",
  robots: { index: false, follow: false },
}

const sans = "var(--font-instrument-sans), sans-serif"

const composition: Parameters<typeof CompositionBar>[0]["categories"] = [
  { key: "commensal", label: "Commensal", percentage: 32, description: "Veillonella, Granulicatella" },
  { key: "heart", label: "Heart", percentage: 21, description: "Neisseria, Rothia, Haemophilus" },
  { key: "remin", label: "Remineralizing", percentage: 18, description: "Streptococcus sanguinis" },
  { key: "context", label: "Context-dependent", percentage: 12, description: "Veillonella, Prevotella" },
  { key: "cavity", label: "Cavity-associated", percentage: 8, description: "S. mutans, S. sobrinus" },
  { key: "orange", label: "Orange complex", percentage: 6, description: "Fusobacterium, Prevotella" },
  { key: "red", label: "Red complex", percentage: 3, description: "Porphyromonas, Tannerella" },
]

const mouthBreathing = getInterventionById("address_mouth_breathing")
const dietaryNitrate = getInterventionById("add_dietary_nitrate")
const sleepStudy = getInterventionById("home_sleep_study")

export default function OralComponentsShowcase() {
  return (
    <div style={{ background: "var(--cream)", minHeight: "100vh" }}>
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "64px 32px 120px" }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Internal · design system</div>
        <h1 className="heading-section" style={{ margin: "0 0 12px" }}>
          Oravi oral panel components
        </h1>
        <p className="body-text" style={{ color: "var(--ink-soft)", maxWidth: 680, margin: 0 }}>
          Eight standalone, unwired primitives for the upcoming oral panel
          redesign. Every example below renders from props only — none of
          this is connected to user data yet. Page assembly and wiring
          live in a separate PR.
        </p>

        <Section title="Panel" description="Workhorse data card. Default and compact variants.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
            <Panel
              eyebrow="Heart · cardiovascular support"
              title="Nitric oxide production"
              value="22.2%"
              unit="nitrate-reducing bacteria"
              status="strong"
              statusLabel="Strong"
              body="Your nitrate-reducing community is comfortably above the typical healthy range. Cardiovascular support pathway is active."
              distribution={{
                position: 78,
                healthyZone: { from: 25, to: 65 },
                labels: { left: "0%", center: "healthy 25–65%", right: "30%+" },
                ariaLabel: "Nitric oxide production at 22.2 percent — above the 25 to 65 percent healthy range",
              }}
            />
            <Panel
              eyebrow="Microbe · airway"
              title="Haemophilus parainfluenzae"
              value="2.9%"
              unit="of community"
              status="watch"
              statusLabel="Watch"
              body="Below the typical 4–10% range. A pattern often seen in mouth-breathers; pair with the questionnaire signal."
              distribution={{
                position: 14,
                healthyZone: { from: 25, to: 75 },
                labels: { left: "0%", center: "healthy 4–10%", right: "15%+" },
              }}
            />
            <Panel
              variant="compact"
              eyebrow="Composite index"
              title="Biofilm maturity"
              value="0.07"
              unit="late ÷ early ratio"
              status="strong"
              statusLabel="Immature · strong"
            />
          </div>
        </Section>

        <Section title="QuickStat" description="Compact stat tiles for the snapshot row.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <QuickStat label="Species detected" value="130" detail="across 53 genera" />
            <QuickStat label="Diversity" value="4.50" detail="Shannon · within healthy range" />
            <QuickStat label="Red complex" value="0.07%" detail="trace · effectively absent" />
          </div>
        </Section>

        <Section title="CompositionBar" description="7-category bacterial breakdown. Inline labels hide on narrow segments and on mobile.">
          <CompositionBar categories={composition} />
          <div style={{ height: 20 }} />
          <CompositionBar categories={composition} showLegend={false} showHint />
        </Section>

        <Section title="SignalChain" description="Cross-source pattern reasoning. Stacks vertically on mobile.">
          <SignalChain
            items={[
              { source: "Questionnaire", finding: "Mouth breathing", detail: "primarily at night" },
              { source: "Oral microbiome", finding: "Low Haemophilus", detail: "2.9% (typical 4–10%)" },
              { source: "Connection", finding: "Same root cause", detail: "airway dryness" },
            ]}
          />
        </Section>

        <Section title="InterventionCard" description="Three modes from a single registry entry.">
          <div style={{ display: "grid", gap: 18 }}>
            {mouthBreathing ? <InterventionCard intervention={mouthBreathing} /> : <Missing id="address_mouth_breathing" />}
            {mouthBreathing ? <InterventionCard intervention={mouthBreathing} variant="escalation" /> : null}
            {mouthBreathing ? <InterventionCard intervention={mouthBreathing} showAffirmation /> : null}
            {dietaryNitrate ? <InterventionCard intervention={dietaryNitrate} /> : <Missing id="add_dietary_nitrate" />}
            {sleepStudy ? <InterventionCard intervention={sleepStudy} /> : <Missing id="home_sleep_study" />}
          </div>
        </Section>

        <Section title="ConnectionCard" description="Cross-panel synthesis. Uses link-accent (sleep-dusk) instead of gold to signal &lsquo;reasoning across data sources&rsquo;.">
          <ConnectionCard eyebrow="Cross-panel signal" title="Three patterns converge">
            Your inflammatory pattern signal is mildly elevated, your{" "}
            <ConnectionCard.Biomarker>hs-CRP</ConnectionCard.Biomarker> sits at the upper end of the
            normal range, and your{" "}
            <ConnectionCard.Biomarker>LDL</ConnectionCard.Biomarker>{" "}
            crept up at the last draw. Each on its own is unremarkable;
            together they tell a more coherent story about low-grade
            inflammatory load.
          </ConnectionCard>
        </Section>

        <Section title="DistributionViz" description="Slim placement track. Status colors live on the parent Panel.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
            <DistributionExample
              caption="Neisseria (above range)"
              position={78}
              healthyZone={{ from: 25, to: 65 }}
              labels={{ left: "0%", center: "healthy 25–65%", right: "30%+" }}
            />
            <DistributionExample
              caption="Haemophilus (below range)"
              position={14}
              healthyZone={{ from: 25, to: 75 }}
              labels={{ left: "0%", center: "healthy 4–10%", right: "15%+" }}
            />
            <DistributionExample
              caption="Translocation indicator"
              position={50}
              healthyZone={{ from: 0, to: 30 }}
              labels={{ left: "low", center: "elevated", right: "very high" }}
            />
          </div>
        </Section>

        <Section title="TrajectoryPanel" description="Past samples + recommended retest.">
          <TrajectoryPanel
            pastTests={[{ date: "April 2026", label: "baseline" }]}
            nextTest={{ date: "~October 2026", label: "recommended retest" }}
            note="Trajectory matters more than any single snapshot. Most users see the clearest signals on their second sample."
          />
        </Section>

        <p style={{ fontFamily: sans, fontSize: 12, color: "var(--ink-soft-2)", marginTop: 64 }}>
          Internal-only route. <code>noindex</code> set in metadata.
        </p>
      </main>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section style={{ marginTop: 56 }}>
      <h3
        className="font-display"
        style={{
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          margin: "0 0 6px",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: sans,
          fontSize: 14,
          color: "var(--ink-soft-2)",
          margin: "0 0 18px",
          maxWidth: 680,
        }}
      >
        {description}
      </p>
      {children}
    </section>
  )
}

function DistributionExample({
  caption,
  position,
  healthyZone,
  labels,
}: {
  caption: string
  position: number
  healthyZone: { from: number; to: number }
  labels: { left: string; center: string; right: string }
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontWeight: 600,
          fontSize: 12,
          color: "var(--ink-soft)",
          marginBottom: 10,
        }}
      >
        {caption}
      </div>
      <DistributionViz position={position} healthyZone={healthyZone} labels={labels} />
    </div>
  )
}

function Missing({ id }: { id: string }) {
  return (
    <div
      style={{
        background: "var(--paper-warm)",
        border: "1px dashed var(--hairline-strong)",
        borderRadius: 4,
        padding: 16,
        fontFamily: sans,
        fontSize: 13,
        color: "var(--status-attention)",
      }}
    >
      Intervention <code>{id}</code> not found in registry.
    </div>
  )
}

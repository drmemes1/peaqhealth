import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "../../../../../lib/supabase/server"
import { getUserPanelContext } from "../../../../../lib/user-context"
import { computeBiofilmMaturity, BIOFILM_STAGE_LABELS } from "../../../../../lib/oral/biofilmMaturity"
import { computeTranslocation, TRANSLOCATION_LEVEL_LABELS } from "../../../../../lib/oral/translocationRisk"
import { computeInflammatoryPattern, INFLAMMATORY_LEVEL_LABELS } from "../../../../../lib/oral/inflammatoryPattern"
import { WhatThisMeans } from "../../../../components/ui/WhatThisMeans"
import { Nav } from "../../../../components/nav"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

type Status = "strong" | "watch" | "attention"

const STATUS_COLORS: Record<Status, string> = { strong: "#4A7A4A", watch: "#8A6B22", attention: "#8C3A3A" }

const SLUGS = ["biofilm-maturity", "translocation-risk", "inflammatory-pattern"] as const
type IndexSlug = typeof SLUGS[number]

function isIndexSlug(s: string): s is IndexSlug {
  return (SLUGS as readonly string[]).includes(s)
}

export default async function IndexDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  if (!isIndexSlug(name)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return (
      <div style={{ background: "#EDEAE1", minHeight: "100vh" }}>
        <Nav />
        <main style={{ maxWidth: 840, margin: "0 auto", padding: "64px 24px" }}>
          <p style={{ fontFamily: sans, fontSize: 14, color: "#8C897F" }}>Sign in to view your indices.</p>
        </main>
      </div>
    )
  }

  const ctx = await getUserPanelContext(user.id)
  const o = ctx.oralKit
  if (!o) {
    return (
      <div style={{ background: "#EDEAE1", minHeight: "100vh" }}>
        <Nav />
        <main style={{ maxWidth: 840, margin: "0 auto", padding: "64px 24px" }}>
          <Link href="/dashboard/oral" style={{ fontFamily: sans, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#B8935A", fontWeight: 600, textDecoration: "none" }}>← Back to oral panel</Link>
          <h1 style={{ fontFamily: serif, fontSize: 40, fontWeight: 500, marginTop: 24 }}>No oral results on file</h1>
          <p style={{ fontFamily: sans, fontSize: 14, color: "#8C897F" }}>Take your sample to see your indices.</p>
        </main>
      </div>
    )
  }

  let view
  if (name === "biofilm-maturity") view = renderBiofilmMaturity(o)
  else if (name === "translocation-risk") view = renderTranslocationRisk(o)
  else view = renderInflammatoryPattern(o)

  return (
    <div style={{ background: "#EDEAE1", minHeight: "100vh" }}>
      <Nav />
      <main style={{ maxWidth: 840, margin: "0 auto", padding: "56px 24px 96px" }}>
        <Link href="/dashboard/oral" style={{ fontFamily: sans, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#B8935A", fontWeight: 600, textDecoration: "none" }}>← Back to oral panel</Link>
        {view}
      </main>
    </div>
  )
}

function Header({ title, italic, value, unit, statusLabel, status, rangePos }: {
  title: string; italic?: string; value: string; unit: string; statusLabel: string; status: Status; rangePos: number
}) {
  const color = STATUS_COLORS[status]
  return (
    <div style={{ marginTop: 28, paddingBottom: 28, borderBottom: "1px solid #D6D3C8" }}>
      <h1 style={{ fontFamily: serif, fontSize: 48, fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1.1, margin: "0 0 14px" }}>
        {title}{italic ? <> <em style={{ fontStyle: "italic", color: "#6B6860" }}>{italic}</em></> : null}
      </h1>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <span style={{ fontFamily: serif, fontSize: 36, fontWeight: 500, letterSpacing: "-0.02em" }}>{value}</span>
        <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: 16, color: "#8C897F" }}>{unit}</span>
        <span style={{
          fontFamily: sans, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase",
          fontWeight: 700, color, background: `${color}1A`, borderRadius: 4, padding: "4px 10px",
        }}>
          {statusLabel}
        </span>
      </div>
      <div style={{ marginTop: 18, height: 30, position: "relative" }}>
        <svg viewBox="0 0 320 30" preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          <path d="M 0 26 Q 80 16, 160 6 Q 220 4, 320 26 L 320 28 L 0 28 Z" fill="rgba(184,147,90,0.10)" />
          <path d="M 0 26 Q 80 16, 160 6 Q 220 4, 320 26" fill="none" stroke="#8C897F" strokeWidth={0.6} opacity={0.4} />
          <line x1={rangePos} y1={0} x2={rangePos} y2={28} stroke={color} strokeWidth={1.5} />
          <circle cx={rangePos} cy={7} r={3} fill={color} />
        </svg>
      </div>
    </div>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>{children}</h2>
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: sans, fontSize: 14, color: "#3A3830", lineHeight: 1.75, margin: "0 0 12px" }}>{children}</p>
}
function UL({ children }: { children: React.ReactNode }) {
  return <ul style={{ fontFamily: sans, fontSize: 14, color: "#3A3830", lineHeight: 1.75, margin: "8px 0 16px", paddingLeft: 22, listStyleType: "disc", listStylePosition: "outside" }}>{children}</ul>
}
function LI({ children }: { children: React.ReactNode }) {
  return <li style={{ margin: "4px 0", paddingLeft: 4 }}>{children}</li>
}
function References({ items }: { items: string[] }) {
  return (
    <div style={{ marginTop: 36, paddingTop: 20, borderTop: "1px solid #D6D3C8" }}>
      <div style={{ fontFamily: sans, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8C897F", fontWeight: 600, marginBottom: 8 }}>References</div>
      <ul style={{ fontFamily: serif, fontStyle: "italic", fontSize: 13, color: "#6B6860", lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
        {items.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </div>
  )
}

// ── Biofilm Maturity ────────────────────────────────────────────────────

import type { OralKitData } from "../../../../../lib/user-context"

function renderBiofilmMaturity(o: OralKitData) {
  const r = computeBiofilmMaturity({
    streptococcusPct: o.streptococcusTotalPct,
    actinomycesPct: o.actinomycesPct,
    porphyromonasPct: o.porphyromonasPct,
    treponemaPct: o.treponemaPct,
    tannerellaPct: o.tannerellaPct,
  })
  const rangePos = Math.max(20, Math.min(300, (r.ratio / 0.40) * 300))

  return (
    <>
      <Header
        title="Biofilm" italic="maturity pattern"
        value={r.ratio.toFixed(2)}
        unit="late ÷ early ratio"
        statusLabel={BIOFILM_STAGE_LABELS[r.stage]}
        status={r.status}
        rangePos={rangePos}
      />
      <div style={{ marginTop: 28 }}>
        <WhatThisMeans variant="methodology">
          Your mouth&rsquo;s bacteria form layers, like geological strata. Early bacteria settle in first, then bridging bacteria, then late-arrival bacteria. The ratio of late-to-early colonizers tells us how &lsquo;mature&rsquo; your biofilm is.
        </WhatThisMeans>
      </div>

      <H2>What this is</H2>
      <P>Biofilm maturity reflects the ecological succession of oral bacteria first described by Socransky&rsquo;s color-coded complexes. Early colonizers (green / yellow complex) anchor to the tooth surface and dominate when biofilm is young. As biofilm matures, bridging organisms create the conditions for late colonizers (orange / red complex) — strict anaerobes whose presence in higher proportions correlates with periodontal progression in untreated patients.</P>

      <H2>Your specific drivers</H2>
      <P>Early colonizers in your sample:</P>
      <UL>
        <LI>Streptococcus: {fmt(o.streptococcusTotalPct)}%</LI>
        <LI>Actinomyces: {fmt(o.actinomycesPct)}%</LI>
      </UL>
      <P>Late colonizers:</P>
      <UL>
        <LI>Porphyromonas: {fmt(o.porphyromonasPct)}%</LI>
        <LI>Tannerella: {fmt(o.tannerellaPct)}%</LI>
        <LI>Treponema: {fmt(o.treponemaPct)}%</LI>
      </UL>

      <H2>What raises and lowers it</H2>
      <P><strong>Lower (improving):</strong></P>
      <UL>
        <LI>Regular professional cleaning disrupts mature biofilms before they reseed.</LI>
        <LI>Daily flossing prevents late-colonizer establishment in interdental spaces.</LI>
        <LI>Reducing inflammation in gum tissue removes the anaerobic pockets late colonizers need.</LI>
      </UL>
      <P><strong>Higher (worsening):</strong></P>
      <UL>
        <LI>Untreated gum inflammation creates pockets where late colonizers thrive.</LI>
        <LI>Smoking — directly favors anaerobic, late-colonizer-friendly conditions.</LI>
        <LI>Certain medications that reduce salivary flow.</LI>
      </UL>

      <H2>Why this matters</H2>
      <P>Mature biofilms are physically harder to disrupt and are correlated with periodontal disease progression. Early-stage biofilms respond well to standard hygiene and tend to revert to a healthy succession state.</P>

      <H2>What it doesn&rsquo;t mean</H2>
      <P>This index is a community-shape signal, not a diagnosis of gum disease. A higher ratio without bleeding, pocketing, or other clinical findings is not periodontitis — it&rsquo;s a flag worth discussing at your next cleaning.</P>

      <References items={[
        "Socransky SS et al. (1998). Microbial complexes in subgingival plaque. J Clin Periodontol.",
        "Lamont RJ, Koo H, Hajishengallis G (2018). The oral microbiota: dynamic communities and host interactions. Nat Rev Microbiol.",
      ]} />
    </>
  )
}

// ── Translocation Risk ──────────────────────────────────────────────────

function renderTranslocationRisk(o: OralKitData) {
  const r = computeTranslocation({
    fNucleatumPct: o.fNucleatumPct,
    pGingivalisPct: o.pGingivalisPct,
    fusobacteriumPct: o.fusobacteriumPct,
  })
  const rangePos = Math.max(20, Math.min(300, (r.score / 5.0) * 300))

  return (
    <>
      <Header
        title="Translocation" italic="risk indicator"
        value={r.score.toFixed(2)}
        unit="weighted score"
        statusLabel={TRANSLOCATION_LEVEL_LABELS[r.level]}
        status={r.status}
        rangePos={rangePos}
      />

      <div style={{ marginTop: 28 }}>
        <WhatThisMeans variant="caution">
          This is a risk indicator, not a diagnosis. Many people with elevated oral-translocator bacteria have no gut symptoms at all.
        </WhatThisMeans>
      </div>

      <H2>What this is</H2>
      <P>A weighted indicator of oral bacteria most validated in literature as &lsquo;translocators&rsquo; — organisms shown to reach the gut and, in some cohorts, associate with extra-oral inflammation. The strongest evidence is for <em>Fusobacterium nucleatum</em>; supporting evidence exists for <em>Porphyromonas gingivalis</em>.</P>

      <H2>Your specific drivers</H2>
      <UL>
        <LI><em>F. nucleatum</em> {fmt(o.fNucleatumPct)}% × 2.0 = {r.contributions.fNucleatum.toFixed(2)}</LI>
        <LI><em>P. gingivalis</em> {fmt(o.pGingivalisPct)}% × 1.5 = {r.contributions.pGingivalis.toFixed(2)}</LI>
        <LI><em>Fusobacterium</em> genus {fmt(o.fusobacteriumPct)}% × 0.5 = {r.contributions.fusobacteriumGenus.toFixed(2)}</LI>
      </UL>

      <H2>What raises and lowers it</H2>
      <P><strong>Lower:</strong></P>
      <UL>
        <LI>Treating gingivitis or periodontitis reduces the oral reservoir these species draw from.</LI>
        <LI>Regular interdental cleaning reduces <em>Fusobacterium</em>-friendly biofilm sites.</LI>
        <LI>Stopping smoking — strongly modifies anaerobic load.</LI>
      </UL>
      <P><strong>Higher:</strong></P>
      <UL>
        <LI>Active gum inflammation, untreated periodontitis.</LI>
        <LI>Frequent oral bleeding events (vigorous brushing or extractions create transient bacteremia).</LI>
        <LI>Smoking and certain immunosuppressive states.</LI>
      </UL>

      <H2>Why this matters</H2>
      <P>Oral-to-gut translocation is now well-documented in research cohorts. Whether it produces symptoms in any individual is another question — most carriers are asymptomatic. The indicator helps surface a modifiable variable in a category (oral hygiene) most people can control.</P>

      <H2>What it doesn&rsquo;t mean</H2>
      <P><strong>This is a risk indicator, not a diagnosis.</strong> It does not mean you have IBD, colorectal cancer, or any extra-oral disease. Many people with elevated translocator scores have no gut symptoms at all. Use it as a reason to be more rigorous with oral hygiene, not to alarm yourself.</P>

      <References items={[
        "Atarashi K et al. (2017). Ectopic colonization of oral bacteria in the intestine drives Th1 cell induction and inflammation. Science.",
        "Konig MF et al. (2016). Aggregatibacter actinomycetemcomitans-induced hypercitrullination links periodontal infection to autoimmunity in rheumatoid arthritis. Sci Transl Med.",
        "Schmidt TS et al. (2019). Extensive transmission of microbes along the gastrointestinal tract. eLife.",
      ]} />
    </>
  )
}

// ── Inflammatory Pattern ────────────────────────────────────────────────

function renderInflammatoryPattern(o: OralKitData) {
  const r = computeInflammatoryPattern({
    prevotellaPct: o.prevotellaPct,
    veillonellaPct: o.veillonellaPct,
    neisseriaPct: o.neisseriaPct,
    haemophilusPct: o.haemophilusPct,
  })
  const rangePos = Math.max(20, Math.min(300, (r.signal / 2.0) * 300))

  return (
    <>
      <Header
        title="Inflammatory" italic="pattern signal"
        value={r.signal.toFixed(2)}
        unit="ratio"
        statusLabel={INFLAMMATORY_LEVEL_LABELS[r.level]}
        status={r.status}
        rangePos={rangePos}
      />

      <div style={{ marginTop: 28 }}>
        <WhatThisMeans variant="caution">
          This is a pattern signal, not a diagnosis. Most people with this bacterial pattern do not have autoimmune or inflammatory conditions. It&rsquo;s one signal among many, and worth discussing with your doctor only if you have unexplained symptoms.
        </WhatThisMeans>
      </div>

      <H2>What this is</H2>
      <P>The ratio of two genera reported across multiple studies as enriched in inflammatory states (<em>Prevotella</em>, <em>Veillonella</em>) over two organisms common in healthy, aerobic oral environments (<em>Neisseria</em>, <em>Haemophilus</em>). The ratio is a community-shape signal, not a measurement of inflammation.</P>

      <H2>Your specific drivers</H2>
      <UL>
        <LI>Inflammatory genera total: {fmt(o.prevotellaPct)} + {fmt(o.veillonellaPct)} = {r.inflammatoryTotalPct.toFixed(2)}%</LI>
        <LI>Baseline genera total: {fmt(o.neisseriaPct)} + {fmt(o.haemophilusPct)} = {(r.baselineTotalPct - 0.1).toFixed(2)}%</LI>
      </UL>

      <H2>What raises and lowers it</H2>
      <P><strong>Lower:</strong></P>
      <UL>
        <LI>Reducing oral inflammation — flossing, scaling, treating gingivitis.</LI>
        <LI>Diets richer in dietary nitrate (leafy greens, beets) feed <em>Neisseria</em> / <em>Haemophilus</em>.</LI>
        <LI>Avoiding daily antiseptic mouthwash, which suppresses the baseline genera.</LI>
      </UL>
      <P><strong>Higher:</strong></P>
      <UL>
        <LI>Active gum inflammation; mouth-breathing and dry mouth shift the community anaerobic.</LI>
        <LI>Frequent fermentable carbohydrate intake feeds <em>Veillonella</em>.</LI>
      </UL>

      <H2>Why this matters</H2>
      <P>Pattern-level signals correlate weakly but consistently with systemic inflammation in research cohorts. They&rsquo;re a sensitive way to notice ecological drift before any symptom appears.</P>

      <H2>What it doesn&rsquo;t mean</H2>
      <P><strong>This is a pattern signal, not a diagnosis.</strong> It is not a marker of autoimmunity, IBD, RA, or any other inflammatory disease. Most people with this bacterial pattern do not have inflammatory conditions. Discuss with a doctor only if you have unexplained systemic symptoms.</P>

      <References items={[
        "Wei Y et al. (2024). Prevotella, Veillonella and the inflammatory oral milieu. (review)",
        "Jung H et al. (2026). Anaerobic shifts in the supra-gingival plaque associated with low-grade systemic inflammation.",
      ]} />
    </>
  )
}

function fmt(v: number | null): string { return v == null ? "—" : v.toFixed(2) }

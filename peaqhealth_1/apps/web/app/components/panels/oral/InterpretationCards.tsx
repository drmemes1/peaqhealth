"use client"

import type { UserPanelContext } from "../../../../lib/user-context"
import { getSubInsights } from "../../../../lib/oral/subInsights"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

function f(v: number | null | undefined, d = 1): string { return v == null ? "—" : v.toFixed(d) }

export function InterpretationCards({ ctx }: { ctx: UserPanelContext }) {
  const o = ctx.oralKit
  if (!o) return null

  const subInsights = getSubInsights(o)
  const haemSub = subInsights.find(s => s.parentCompositeId === "nitrate_reducer_pathway")
  const qMb = ctx.questionnaire?.mouthBreathing === "confirmed" || ctx.questionnaire?.mouthBreathing === "often"
  const oralMb = (o.fusobacteriumPct ?? 0) > 1.5 || (o.neisseriaPct ?? 0) > 12

  const gumStatus = o.gumHealthTotal < 2 ? "strong" : o.gumHealthTotal < 5 ? "watch" : "attention"
  const nrStatus = haemSub ? "strong-with-note" : o.nitricOxideTotal >= 20 ? "strong" : "watch"
  const breathStatus = qMb || oralMb ? "watch" : "strong"
  const divStatus = (o.shannonIndex ?? 0) >= 4.0 ? "strong" : "watch"

  const accentColors: Record<string, string> = { strong: "#4A7A4A", watch: "#B8923C", attention: "#8C3A3A", "strong-with-note": "#4A7A4A" }
  const pillBg: Record<string, string> = { strong: "rgba(74,122,74,0.08)", watch: "rgba(184,146,60,0.10)", attention: "rgba(140,58,58,0.08)", "strong-with-note": "rgba(74,122,74,0.08)" }
  const pillColor: Record<string, string> = { strong: "#3A613A", watch: "#8A6B22", attention: "#8C3A3A", "strong-with-note": "#3A613A" }
  const pillLabel: Record<string, string> = { strong: "Strong", watch: "Watch", attention: "Attention", "strong-with-note": "Strong" }

  const borderStyle = (status: string) => status === "strong-with-note"
    ? "linear-gradient(to bottom, #4A7A4A 0%, #4A7A4A 55%, #B8923C 55%, #B8923C 100%)"
    : accentColors[status] ?? "#8C897F"

  function Card({ status, eyebrow, title, primary, meta, chips, isFeature, isSleep, subInsight, sources, children }: {
    status: string; eyebrow: string; title: string; primary: React.ReactNode; meta?: string
    chips?: Array<{ name: string; pct: string; flagged?: boolean }>
    isFeature?: boolean; isSleep?: boolean
    subInsight?: { title: string; body: string } | null
    sources?: Array<{ label: string; fired: boolean }>
    children?: React.ReactNode
  }) {
    const bg = isSleep ? "linear-gradient(135deg, rgba(168,191,212,0.12) 0%, rgba(168,191,212,0.04) 100%), #FAFAF8" : "#FAFAF8"
    return (
      <div style={{
        background: bg, border: `1px solid ${isSleep ? "#D8E3EE" : "#D6D3C8"}`,
        borderRadius: 18, padding: "28px 32px 26px", position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(44,42,36,0.08)" }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none" }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: borderStyle(status), borderRadius: "18px 0 0 18px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: isSleep ? "#4A6485" : "#8C897F", fontWeight: 500, marginBottom: 6 }}>{eyebrow}</div>
            <div style={{ fontFamily: serif, fontSize: isFeature ? 36 : 28, fontWeight: 500, letterSpacing: "-0.012em", lineHeight: 1.1, color: isSleep ? "#2E3E5C" : "#2C2A24" }}>{title}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 100, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, background: pillBg[status], color: pillColor[status], fontFamily: sans }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: accentColors[status] }} />{pillLabel[status]}
            </span>
            {status === "strong-with-note" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 100, fontSize: 9, letterSpacing: "0.13em", textTransform: "uppercase", fontWeight: 600, background: "rgba(184,146,60,0.10)", color: "#8A6B22", fontFamily: sans }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#B8923C" }} />One to notice
              </span>
            )}
          </div>
        </div>
        <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: isFeature ? 22 : 19, lineHeight: 1.4, color: isSleep ? "#2E3E5C" : "#3A3830", marginBottom: 12 }}>{primary}</div>
        {meta && <div style={{ fontFamily: sans, fontSize: 13, color: "#6B6860", lineHeight: 1.6, marginBottom: 16 }}>{meta}</div>}
        {subInsight && (
          <div style={{ background: "rgba(184,146,60,0.10)", border: "1px solid rgba(196,153,46,0.22)", borderLeft: "2px solid #B8923C", borderRadius: 8, padding: "12px 14px", marginBottom: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8A6B22", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>◆ {subInsight.title}</div>
            <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 14, lineHeight: 1.5, color: "#5A4823" }}>{subInsight.body}</div>
          </div>
        )}
        {sources && (
          <div style={{ display: "flex", gap: 12, fontSize: 11, alignItems: "center", fontWeight: 500, marginTop: 10, fontFamily: sans }}>
            {sources.map((s, i) => <span key={i} style={{ color: s.fired ? "#8A6B22" : "#8C897F" }}>{s.fired ? "● " : "○ "}{s.label}</span>)}
          </div>
        )}
        {chips && chips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 14, marginTop: "auto", borderTop: "1px dashed #E5E2D8" }}>
            {chips.map((c, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 100, background: c.flagged ? "rgba(184,146,60,0.10)" : "rgba(184,147,90,0.10)", fontFamily: serif, fontStyle: "italic", fontSize: 13, color: c.flagged ? "#8A6B22" : "#B8935A", fontWeight: 500 }}>
                {c.name} <span style={{ fontStyle: "normal", fontFamily: sans, fontSize: 11, color: c.flagged ? "#8A6B22" : "#8A6D3A" }}>{c.pct}</span>
                {c.flagged && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#B8923C", marginLeft: 3 }} />}
              </span>
            ))}
          </div>
        )}
        {children}
      </div>
    )
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card status={gumStatus} eyebrow="Gum tissue · Attention" title="Gum health signals" isFeature
          primary={<>Orange-complex bacteria are <strong style={{ fontStyle: "normal", fontWeight: 600, color: "#2C2A24" }}>moderately elevated</strong>, but your red-complex species — the ones linked to active gum disease — remain in normal range.</>}
          meta={`Fusobacterium ${f(o.fusobacteriumPct)}%, Aggregatibacter ${f(o.aggregatibacterPct)}%, Campylobacter ${f(o.campylobacterPct)}%. Red-complex all in normal range. This pattern shows up early, before bleeding or recession is visible.`}
          chips={[
            { name: "Fusobacterium", pct: `${f(o.fusobacteriumPct)}%` },
            { name: "Aggregatibacter", pct: `${f(o.aggregatibacterPct)}%`, flagged: (o.aggregatibacterPct ?? 0) > 0.5 },
            { name: "Campylobacter", pct: `${f(o.campylobacterPct)}%`, flagged: (o.campylobacterPct ?? 0) > 0.5 },
            { name: "Porphyromonas", pct: `${f(o.porphyromonasPct, 2)}%` },
            { name: "Tannerella", pct: `${f(o.tannerellaPct, 2)}%` },
          ]}
        />
        <Card status={breathStatus} eyebrow="Sleep · Airway" title="Nighttime breathing" isSleep
          primary={<>{qMb && oralMb ? <>Your questionnaire and oral bacteria <strong style={{ fontStyle: "normal", fontWeight: 600, color: "#2E3E5C" }}>both confirm</strong> mouth breathing.</> : qMb ? "Your questionnaire indicates mouth breathing." : "Oral bacteria suggest possible mouth breathing."}</>}
          meta={`Bacterial markers: Fusobacterium ${f(o.fusobacteriumPct)}%, Neisseria ${f(o.neisseriaPct)}%.`}
          sources={[{ label: "Questionnaire", fired: qMb }, { label: "Oral bacteria", fired: oralMb }, { label: "Wearable", fired: ctx.hasWearable }]}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card status={nrStatus} eyebrow="Cardiovascular support" title="Heart-protective bacteria"
          primary={<>Your nitrate-reducing community is <strong style={{ fontStyle: "normal", fontWeight: 600, color: "#2C2A24" }}>strong at {o.nitricOxideTotal.toFixed(1)}%</strong>. These bacteria turn dietary nitrate into nitric oxide — your body's blood pressure regulator.</>}
          subInsight={haemSub ? { title: "One to notice", body: haemSub.calloutBody } : null}
          chips={[
            { name: "Neisseria", pct: `${f(o.neisseriaPct)}%` },
            { name: "Rothia", pct: `${f(o.rothiaPct)}%` },
            { name: "Haemophilus", pct: `${f(o.haemophilusPct)}%`, flagged: haemSub != null },
          ]}
        />
        <Card status={divStatus} eyebrow="Ecosystem resilience" title="Microbial balance"
          primary={<><strong style={{ fontStyle: "normal", fontWeight: 600, color: "#2C2A24" }}>{o.namedSpecies ?? "—"} species</strong> living in balance. No single bacterial group dominates.</>}
          meta={`Shannon diversity ${f(o.shannonIndex, 2)} — ${(o.shannonIndex ?? 0) >= 4.0 ? "top quartile of healthy adults" : "below the resilient threshold"}. ${o.genera ?? "—"} distinct genera.`}
        />
      </div>
    </>
  )
}

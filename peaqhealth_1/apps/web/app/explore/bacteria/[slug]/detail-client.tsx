"use client"

import { useState } from "react"
import Link from "next/link"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

interface Citation {
  section_number: number
  notes: string | null
  title: string
  first_author: string
  journal: string
  year: number
  doi: string | null
  url: string | null
  public_summary: string | null
  pmid: string | null
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  periodontal_pathogen: { bg: "rgba(192,57,43,0.12)", text: "#C0392B" },
  inflammatory: { bg: "rgba(192,57,43,0.12)", text: "#C0392B" },
  caries: { bg: "rgba(184,134,11,0.12)", text: "#9A7200" },
  nitrate_reducer: { bg: "rgba(26,122,106,0.12)", text: "#1A7A6A" },
  protective: { bg: "rgba(45,106,79,0.12)", text: "#2D6A4F" },
  commensal: { bg: "rgba(45,106,79,0.08)", text: "#3B6D11" },
  context_dependent: { bg: "rgba(20,20,16,0.06)", text: "#6B6860" },
  metabolic: { bg: "rgba(100,60,160,0.12)", text: "#6A3CA0" },
  osa_associated: { bg: "rgba(20,20,16,0.06)", text: "#6B6860" },
}

const CATEGORY_LABELS: Record<string, string> = {
  periodontal_pathogen: "Disease-associated",
  nitrate_reducer: "Nitrate-reducing",
  protective: "Health-associated",
  commensal: "Commensal",
  caries: "Cavity-associated",
  inflammatory: "Inflammatory",
  metabolic: "Metabolic",
  context_dependent: "Context-dependent",
  osa_associated: "OSA associated",
}

// ── Markdown renderer ──────────────────────────────────────────────────────

function renderMarkdown(md: string): React.ReactNode[] {
  if (!md) return []
  const lines = md.split("\n")
  const nodes: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith("## ")) {
      nodes.push(<h3 key={i} style={{ fontFamily: sans, fontSize: 16, fontWeight: 600, color: "#042C53", margin: "24px 0 10px" }}>{renderInline(line.slice(3))}</h3>)
      i++; continue
    }
    if (line.startsWith("### ")) {
      nodes.push(<h4 key={i} style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: "#042C53", margin: "18px 0 8px" }}>{renderInline(line.slice(4))}</h4>)
      i++; continue
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = []
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) { items.push(lines[i].slice(2)); i++ }
      nodes.push(
        <ul key={`ul-${i}`} style={{ fontFamily: sans, fontSize: 14, color: "#3A3830", lineHeight: 1.75, margin: "8px 0 8px 20px", padding: 0 }}>
          {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ul>
      )
      continue
    }
    if (line.startsWith("> ")) {
      nodes.push(
        <blockquote key={i} style={{ borderLeft: "3px solid #185FA5", background: "rgba(24,95,165,0.04)", padding: "12px 16px", margin: "14px 0", borderRadius: "0 8px 8px 0" }}>
          <p style={{ fontFamily: serif, fontSize: 16, fontStyle: "italic", color: "#141410", margin: 0, lineHeight: 1.5 }}>{renderInline(line.slice(2))}</p>
        </blockquote>
      )
      i++; continue
    }
    if (line.trim() === "") { i++; continue }
    nodes.push(<p key={i} style={{ fontFamily: sans, fontSize: 14, color: "#3A3830", lineHeight: 1.75, margin: "0 0 12px" }}>{renderInline(line)}</p>)
    i++
  }
  return nodes
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    const italicMatch = remaining.match(/_(.+?)_/)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)
    const candidates: { idx: number; len: number; node: React.ReactNode }[] = []
    if (boldMatch?.index !== undefined) candidates.push({ idx: boldMatch.index, len: boldMatch[0].length, node: <strong key={`b-${key++}`} style={{ fontWeight: 600, color: "#141410" }}>{boldMatch[1]}</strong> })
    if (italicMatch?.index !== undefined) candidates.push({ idx: italicMatch.index, len: italicMatch[0].length, node: <em key={`i-${key++}`} style={{ fontStyle: "italic" }}>{italicMatch[1]}</em> })
    if (linkMatch?.index !== undefined) candidates.push({ idx: linkMatch.index, len: linkMatch[0].length, node: <a key={`a-${key++}`} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" style={{ color: "#185FA5", textDecoration: "underline" }}>{linkMatch[1]}</a> })
    if (candidates.length === 0) { parts.push(remaining); break }
    candidates.sort((a, b) => a.idx - b.idx)
    const first = candidates[0]
    if (first.idx > 0) parts.push(remaining.slice(0, first.idx))
    parts.push(first.node)
    remaining = remaining.slice(first.idx + first.len)
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>
}

// ── Collapsible ────────────────────────────────────────────────────────────

function Collapsible({ title, defaultOpen, children, sectionCitations }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode
  sectionCitations?: Citation[]
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div style={{ borderTop: "0.5px solid rgba(20,20,16,0.08)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 0", background: "none", border: "none", cursor: "pointer",
        }}
      >
        <span style={{ fontFamily: sans, fontSize: 16, fontWeight: 500, color: "#141410", textAlign: "left" }}>{title}</span>
        <span style={{ fontFamily: sans, fontSize: 22, color: "rgba(20,20,16,0.3)", lineHeight: 1, flexShrink: 0, marginLeft: 12 }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 24 }}>
          {children}
          {sectionCitations && sectionCitations.length > 0 && (
            <p style={{ fontFamily: sans, fontSize: 11, color: "rgba(20,20,16,0.35)", marginTop: 16 }}>
              Sources: {sectionCitations.map((c, i) => (
                <span key={i}>{c.first_author} {c.year}{i < sectionCitations.length - 1 ? " · " : ""}</span>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function DetailClient({ row, citations, userOralValue, userOralDate, isLoggedIn }: {
  row: Record<string, unknown>
  citations: Citation[]
  userOralValue: number | null
  userOralDate: string | null
  isLoggedIn: boolean
}) {
  const categories = (row.peaq_categories ?? []) as string[]
  const direction = row.desired_direction as string | null
  const detectability = row.salivary_detectability as string | null
  const rangeMin = row.typical_healthy_range_min as number | null
  const rangeMax = row.typical_healthy_range_max as number | null
  const summaryBox = row.summary_box_text as string | null
  const actionDo = row.quick_action_do as string | null
  const actionAvoid = row.quick_action_avoid as string | null
  const hasUserData = userOralValue != null

  let statusLabel = ""
  let statusColor = "#185FA5"
  if (hasUserData && rangeMin != null && rangeMax != null) {
    if (userOralValue! >= rangeMin && userOralValue! <= rangeMax) {
      statusLabel = "In healthy range"; statusColor = "#2D6A4F"
    } else if (userOralValue! > rangeMax) {
      statusLabel = "Higher than typical"; statusColor = "#C0392B"
    } else {
      statusLabel = "Lower than typical"; statusColor = "#9A7200"
    }
  }

  const uniqueCitations = citations.filter((c, i, arr) =>
    arr.findIndex(x => x.title === c.title && x.first_author === c.first_author) === i
  )

  function citationsForSections(...nums: number[]) {
    return citations.filter(c => nums.includes(c.section_number))
      .filter((c, i, arr) => arr.findIndex(x => x.first_author === c.first_author && x.year === c.year) === i)
  }

  const updatedAt = row.updated_at as string | null
  const updatedLabel = updatedAt ? new Date(updatedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null

  return (
    <>
      {/* 1. Hero */}
      <div style={{ background: "#141410", padding: "80px 24px 48px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Link href="/explore" style={{
            fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.35)",
            textDecoration: "none", display: "inline-block", marginBottom: 20,
          }}>
            Explore &rsaquo; Oral bacteria &rsaquo; {row.full_name as string}
          </Link>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {categories.map(cat => {
              const colors = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.context_dependent
              return (
                <span key={cat} style={{
                  fontFamily: sans, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase",
                  background: colors.bg, color: colors.text,
                  borderRadius: 4, padding: "4px 10px",
                }}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </span>
              )
            })}
            {(detectability === "rare" || detectability === "undetectable_in_healthy") && (
              <span style={{
                fontFamily: sans, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase",
                background: "rgba(192,57,43,0.15)", color: "#C0392B",
                borderRadius: 4, padding: "4px 10px",
              }}>
                {detectability === "undetectable_in_healthy" ? "Rarely seen in healthy saliva" : "Rarely seen in saliva"}
              </span>
            )}
          </div>

          <h1 style={{
            fontFamily: serif, fontSize: 40, fontWeight: 400, fontStyle: "italic",
            color: "#fff", lineHeight: 1.15, margin: "0 0 8px",
          }}>
            {row.full_name as string}
          </h1>

          <p style={{ fontFamily: sans, fontSize: 14, color: "rgba(255,255,255,0.4)", margin: 0 }}>
            {row.consumer_friendly_name as string ?? ""}
            {row.oxygen_requirement ? ` · ${row.oxygen_requirement}` : ""}
            {row.primary_niche ? ` · Lives in ${row.primary_niche}` : ""}
          </p>
        </div>
      </div>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
        {/* 3. Blue summary box */}
        {summaryBox ? (
          <div style={{
            background: "linear-gradient(135deg, #EBF2FA 0%, #E0EBF7 100%)",
            borderRadius: 16, padding: "32px 32px 28px",
            margin: "-24px 0 40px",
            position: "relative", zIndex: 2,
          }}>
            <span style={{
              fontFamily: sans, fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase",
              color: "#185FA5", fontWeight: 600,
              display: "block", marginBottom: 12,
            }}>
              The short version
            </span>
            <p style={{
              fontFamily: sans, fontSize: 15, color: "#042C53",
              lineHeight: 1.7, margin: "0 0 20px",
            }}>
              {summaryBox}
            </p>

            {/* Your result sub-card */}
            {hasUserData && (
              <div style={{
                background: "rgba(255,255,255,0.6)", borderRadius: 12,
                padding: "18px 22px", marginBottom: 16,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <span style={{ fontFamily: sans, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#185FA5" }}>
                      Your result{userOralDate ? ` · ${new Date(userOralDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}
                    </span>
                    <div style={{ fontFamily: serif, fontSize: 36, fontWeight: 300, color: "#042C53", lineHeight: 1, marginTop: 4 }}>
                      {userOralValue!.toFixed(1)}%
                    </div>
                  </div>
                  {statusLabel && (
                    <span style={{
                      fontFamily: sans, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase",
                      fontWeight: 600, color: statusColor,
                      background: `${statusColor}14`, borderRadius: 4, padding: "4px 10px",
                    }}>
                      {statusLabel}
                    </span>
                  )}
                </div>
                {rangeMin != null && rangeMax != null && (
                  <p style={{ fontFamily: sans, fontSize: 12, color: "#185FA5", margin: "8px 0 0", opacity: 0.7 }}>
                    Healthy range: {rangeMin}–{rangeMax}%
                  </p>
                )}
              </div>
            )}

            {/* Do / Avoid action cards */}
            {(actionDo || actionAvoid) ? (
              <div className="action-grid" style={{ display: "grid", gridTemplateColumns: actionDo && actionAvoid ? "1fr 1fr" : "1fr", gap: 12 }}>
                {actionDo ? (
                  <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 12, padding: "16px 18px" }}>
                    <span style={{ fontFamily: sans, fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 600, color: "#2D6A4F", display: "block", marginBottom: 8 }}>
                      Do
                    </span>
                    <p style={{ fontFamily: sans, fontSize: 13, color: "#042C53", lineHeight: 1.6, margin: 0 }}>
                      {actionDo}
                    </p>
                  </div>
                ) : null}
                {actionAvoid ? (
                  <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 12, padding: "16px 18px" }}>
                    <span style={{ fontFamily: sans, fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 600, color: "#C0392B", display: "block", marginBottom: 8 }}>
                      Avoid
                    </span>
                    <p style={{ fontFamily: sans, fontSize: 13, color: "#042C53", lineHeight: 1.6, margin: 0 }}>
                      {actionAvoid}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ height: 32 }} />
        )}

        {/* 4. Collapsible sections */}
        <div style={{ marginBottom: 40 }}>
          {row.section_1_ecological_role ? (
            <Collapsible title="How it lives" sectionCitations={citationsForSections(1)}>
              {renderMarkdown(row.section_1_ecological_role as string)}
            </Collapsible>
          ) : null}

          {row.section_2_healthy_abundance ? (
            <Collapsible title="How it shows up in saliva" sectionCitations={citationsForSections(2)}>
              {renderMarkdown(row.section_2_healthy_abundance as string)}
            </Collapsible>
          ) : null}

          {row.section_3_clinical ? (
            <Collapsible title="Clinical associations" sectionCitations={citationsForSections(3)}>
              {renderMarkdown(row.section_3_clinical as string)}
            </Collapsible>
          ) : null}

          {(row.section_4_systemic || row.section_9_tri_panel) ? (
            <Collapsible title="How it connects to your blood and sleep" sectionCitations={citationsForSections(4, 9)}>
              {row.section_4_systemic ? (
                <>
                  <h3 style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: "#141410", margin: "0 0 10px" }}>Systemic connections</h3>
                  {renderMarkdown(row.section_4_systemic as string)}
                </>
              ) : null}
              {row.section_9_tri_panel ? (
                <>
                  <h3 style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: "#141410", margin: "24px 0 10px" }}>Tri-panel associations</h3>
                  {renderMarkdown(row.section_9_tri_panel as string)}
                </>
              ) : null}
            </Collapsible>
          ) : null}

          {(row.section_5_increase || row.section_6_decrease) ? (
            <Collapsible title="What you can do" defaultOpen sectionCitations={citationsForSections(5, 6)}>
              {direction === "context_dependent" ? (
                <>
                  {row.section_5_increase ? (
                    <>
                      <h3 style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: "#141410", margin: "0 0 10px" }}>To support beneficial species</h3>
                      {renderMarkdown(row.section_5_increase as string)}
                    </>
                  ) : null}
                  {row.section_6_decrease ? (
                    <>
                      <h3 style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: "#141410", margin: "24px 0 10px" }}>To reduce harmful species</h3>
                      {renderMarkdown(row.section_6_decrease as string)}
                    </>
                  ) : null}
                </>
              ) : direction === "decrease" ? (
                row.section_6_decrease ? <>{renderMarkdown(row.section_6_decrease as string)}</> : null
              ) : (
                row.section_5_increase ? <>{renderMarkdown(row.section_5_increase as string)}</> : null
              )}
            </Collapsible>
          ) : null}

          {row.section_7_species_nuance ? (
            <Collapsible title="Species detail" sectionCitations={citationsForSections(7)}>
              {renderMarkdown(row.section_7_species_nuance as string)}
            </Collapsible>
          ) : null}

          {row.section_8_uncertainty ? (
            <Collapsible title="What's still uncertain" sectionCitations={citationsForSections(8)}>
              {renderMarkdown(row.section_8_uncertainty as string)}
            </Collapsible>
          ) : null}

          {row.section_10_product ? (
            <Collapsible title="For the technically curious" sectionCitations={citationsForSections(10)}>
              {renderMarkdown(row.section_10_product as string)}
            </Collapsible>
          ) : null}

          {/* Bottom border for last collapsible */}
          <div style={{ borderTop: "0.5px solid rgba(20,20,16,0.08)" }} />
        </div>

        {/* 5. Citations footer */}
        {uniqueCitations.length > 0 && (
          <p style={{
            fontFamily: sans, fontSize: 12, color: "rgba(20,20,16,0.4)",
            marginBottom: 24,
          }}>
            Synthesized from {uniqueCitations.length} peer-reviewed source{uniqueCitations.length !== 1 ? "s" : ""}
            {updatedLabel ? ` · Last updated ${updatedLabel}` : ""}
          </p>
        )}

        {/* 6. Disclaimer */}
        <p style={{
          fontFamily: sans, fontSize: 11, fontStyle: "italic",
          color: "rgba(20,20,16,0.3)", lineHeight: 1.6,
          marginBottom: 40,
        }}>
          This information is for wellness purposes only and is not a medical assessment. Always consult a medical professional about any health concerns.
        </p>

        {/* Back CTA */}
        <div style={{
          textAlign: "center", padding: "24px 0 88px",
          borderTop: "0.5px solid rgba(20,20,16,0.06)",
        }}>
          <Link href="/explore" style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "1.5px",
            textTransform: "uppercase", textDecoration: "none",
            color: "#9A7200", border: "1px solid #9A7200",
            borderRadius: 6, padding: "12px 28px",
            display: "inline-block",
          }}>
            &larr; Back to all bacteria
          </Link>
        </div>
      </main>

      <style>{`
        @media (max-width: 640px) {
          main h1 { font-size: 32px !important; }
        }
        @media (max-width: 480px) {
          .action-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}

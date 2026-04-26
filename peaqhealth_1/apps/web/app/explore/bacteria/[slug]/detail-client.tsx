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
  nitrate_reducer: { bg: "rgba(45,106,79,0.12)", text: "#2D6A4F" },
  protective: { bg: "rgba(45,106,79,0.12)", text: "#2D6A4F" },
  commensal: { bg: "rgba(45,106,79,0.08)", text: "#3B6D11" },
  context_dependent: { bg: "rgba(20,20,16,0.06)", text: "#6B6860" },
  metabolic: { bg: "rgba(100,60,160,0.12)", text: "#6A3CA0" },
}

const CATEGORY_LABELS: Record<string, string> = {
  periodontal_pathogen: "Periodontal pathogen",
  nitrate_reducer: "Nitrate reducer",
  protective: "Protective",
  commensal: "Commensal",
  caries: "Caries-associated",
  inflammatory: "Inflammatory",
  metabolic: "Metabolic",
  context_dependent: "Context dependent",
  osa_associated: "OSA associated",
}

function renderMarkdown(md: string): React.ReactNode[] {
  if (!md) return []
  const lines = md.split("\n")
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith("## ")) {
      nodes.push(<h3 key={i} style={{ fontFamily: sans, fontSize: 16, fontWeight: 600, color: "#141410", margin: "28px 0 12px" }}>{renderInline(line.slice(3))}</h3>)
      i++; continue
    }
    if (line.startsWith("### ")) {
      nodes.push(<h4 key={i} style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: "#141410", margin: "20px 0 8px" }}>{renderInline(line.slice(4))}</h4>)
      i++; continue
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = []
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(lines[i].slice(2)); i++
      }
      nodes.push(
        <ul key={`ul-${i}`} style={{ fontFamily: sans, fontSize: 14, color: "#4A4A42", lineHeight: 1.75, margin: "8px 0 8px 20px", padding: 0 }}>
          {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ul>
      )
      continue
    }
    if (line.startsWith("> ")) {
      nodes.push(
        <blockquote key={i} style={{ borderLeft: "3px solid #B8860B", background: "rgba(184,134,11,0.04)", padding: "12px 16px", margin: "16px 0", borderRadius: "0 8px 8px 0" }}>
          <p style={{ fontFamily: serif, fontSize: 16, fontStyle: "italic", color: "#141410", margin: 0, lineHeight: 1.5 }}>{renderInline(line.slice(2))}</p>
        </blockquote>
      )
      i++; continue
    }
    if (line.trim() === "") { i++; continue }
    nodes.push(<p key={i} style={{ fontFamily: sans, fontSize: 14, color: "#4A4A42", lineHeight: 1.75, margin: "0 0 12px" }}>{renderInline(line)}</p>)
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
    if (linkMatch?.index !== undefined) candidates.push({ idx: linkMatch.index, len: linkMatch[0].length, node: <a key={`a-${key++}`} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" style={{ color: "#9A7200", textDecoration: "underline" }}>{linkMatch[1]}</a> })
    if (candidates.length === 0) { parts.push(remaining); break }
    candidates.sort((a, b) => a.idx - b.idx)
    const first = candidates[0]
    if (first.idx > 0) parts.push(remaining.slice(0, first.idx))
    parts.push(first.node)
    remaining = remaining.slice(first.idx + first.len)
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>
}

function Section({ id, title, content }: { id: string; title: string; content: string | null }) {
  if (!content) return null
  return (
    <section id={id} style={{ marginBottom: 48 }}>
      <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, color: "#141410", margin: "0 0 16px", lineHeight: 1.2 }}>
        {title}
      </h2>
      <div>{renderMarkdown(content)}</div>
    </section>
  )
}

export function DetailClient({ row, citations, userOralValue, userOralDate, isLoggedIn }: {
  row: Record<string, unknown>
  citations: Citation[]
  userOralValue: number | null
  userOralDate: string | null
  isLoggedIn: boolean
}) {
  const [scienceOpen, setScienceOpen] = useState(false)
  const categories = (row.peaq_categories ?? []) as string[]
  const direction = row.desired_direction as string | null
  const detectability = row.salivary_detectability as string | null
  const rangeMin = row.typical_healthy_range_min as number | null
  const rangeMax = row.typical_healthy_range_max as number | null
  const hasUserData = userOralValue != null

  let statusLabel = ""
  let statusColor = "#6B6860"
  if (hasUserData && rangeMin != null && rangeMax != null) {
    if (userOralValue! <= rangeMax && userOralValue! >= rangeMin) {
      statusLabel = "Within range"; statusColor = "#2D6A4F"
    } else if (userOralValue! > rangeMax) {
      statusLabel = "Elevated"; statusColor = "#C0392B"
    } else {
      statusLabel = "Below range"; statusColor = "#9A7200"
    }
  }

  const uniqueCitations = citations.filter((c, i, arr) =>
    arr.findIndex(x => x.title === c.title && x.first_author === c.first_author) === i
  )

  return (
    <>
      {/* Hero */}
      <div style={{
        background: "#141410",
        backgroundImage: "radial-gradient(ellipse at 80% 40%, rgba(40,38,30,0.6) 0%, transparent 60%)",
        padding: "100px 24px 56px",
      }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Link href="/explore" style={{
            fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.4)",
            textDecoration: "none", display: "inline-block", marginBottom: 24,
          }}>
            Explore &rsaquo; Oral bacteria &rsaquo; {row.full_name as string}
          </Link>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {categories.map(cat => {
              const colors = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.context_dependent
              return (
                <span key={cat} style={{
                  fontFamily: sans, fontSize: 10, letterSpacing: "1px",
                  textTransform: "uppercase",
                  background: colors.bg, color: colors.text,
                  borderRadius: 4, padding: "4px 10px",
                }}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </span>
              )
            })}
            {direction && (
              <span style={{
                fontFamily: sans, fontSize: 10, letterSpacing: "1px",
                textTransform: "uppercase",
                background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)",
                borderRadius: 4, padding: "4px 10px",
              }}>
                {direction === "increase" ? "Higher is better" : direction === "decrease" ? "Lower is better" : "Context dependent"}
              </span>
            )}
            {(detectability === "rare" || detectability === "undetectable_in_healthy") && (
              <span style={{
                fontFamily: sans, fontSize: 10, letterSpacing: "1px",
                textTransform: "uppercase",
                background: "rgba(192,57,43,0.15)", color: "#C0392B",
                borderRadius: 4, padding: "4px 10px",
              }}>
                {detectability === "undetectable_in_healthy" ? "Rarely seen in healthy saliva" : "Rarely seen in saliva"}
              </span>
            )}
          </div>

          <h1 style={{
            fontFamily: serif, fontSize: 44, fontWeight: 400, fontStyle: "italic",
            color: "#fff", lineHeight: 1.15, margin: "0 0 8px",
          }}>
            {row.full_name as string}
          </h1>

          <p style={{
            fontFamily: sans, fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0,
          }}>
            {row.consumer_friendly_name as string ?? ""}
            {row.oxygen_requirement ? ` · ${row.oxygen_requirement}` : ""}
            {row.primary_niche ? ` · Lives in ${row.primary_niche}` : ""}
          </p>
        </div>
      </div>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
        {/* Personalized result strip */}
        {hasUserData && (
          <div style={{
            background: "#fff", borderRadius: 10, padding: "24px 28px",
            border: "0.5px solid rgba(20,20,16,0.08)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            margin: "-28px 0 40px",
            position: "relative", zIndex: 2,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 16,
          }}>
            <div>
              <div style={{ fontFamily: sans, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(20,20,16,0.4)", marginBottom: 6 }}>
                Your latest result
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: serif, fontSize: 36, fontWeight: 300, color: "#141410" }}>
                  {userOralValue!.toFixed(1)}%
                </span>
                {statusLabel && (
                  <span style={{
                    fontFamily: sans, fontSize: 10, letterSpacing: "1px",
                    textTransform: "uppercase", fontWeight: 600,
                    color: statusColor,
                  }}>
                    {statusLabel}
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              {userOralDate && (
                <div style={{ fontFamily: sans, fontSize: 11, color: "rgba(20,20,16,0.35)" }}>
                  {new Date(userOralDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
              {rangeMin != null && rangeMax != null && (
                <div style={{ fontFamily: sans, fontSize: 12, color: "rgba(20,20,16,0.5)", marginTop: 4 }}>
                  Healthy range: {rangeMin}–{rangeMax}%
                </div>
              )}
            </div>
          </div>
        )}

        {!isLoggedIn && (
          <div style={{
            background: "rgba(154,114,0,0.06)", borderRadius: 10, padding: "24px 28px",
            margin: "32px 0 40px",
            textAlign: "center",
          }}>
            <p style={{ fontFamily: sans, fontSize: 14, color: "#141410", margin: "0 0 12px" }}>
              Order a kit to see your personal levels.
            </p>
            <Link href="/shop" style={{
              fontFamily: sans, fontSize: 11, letterSpacing: "1.5px",
              textTransform: "uppercase", textDecoration: "none",
              color: "#9A7200", border: "1px solid #9A7200",
              borderRadius: 6, padding: "10px 24px",
              display: "inline-block",
            }}>
              Shop &rarr;
            </Link>
          </div>
        )}

        {/* What it is */}
        <section style={{ marginBottom: 48, marginTop: hasUserData ? 0 : 40 }}>
          <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, color: "#141410", margin: "0 0 16px" }}>What it is</h2>
          {row.what_it_is ? <div>{renderMarkdown(row.what_it_is as string)}</div> : null}
          {row.section_0_identification ? <div>{renderMarkdown(row.section_0_identification as string)}</div> : null}
        </section>

        {/* Anchor navigation */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 48,
          paddingBottom: 24, borderBottom: "1px solid rgba(20,20,16,0.06)",
        }}>
          {[
            { id: "ecological", label: "How it lives", show: !!row.section_1_ecological_role },
            { id: "abundance", label: "How it shows up in saliva", show: !!row.section_2_healthy_abundance },
            { id: "clinical", label: "Clinical associations", show: !!row.section_3_clinical },
            { id: "systemic", label: "Systemic connections", show: !!row.section_4_systemic },
            { id: "action", label: "What you can do", show: !!(row.section_5_increase || row.section_6_decrease) },
            { id: "uncertainty", label: "What's still uncertain", show: !!row.section_8_uncertainty },
            { id: "science-toggle", label: "The science", show: !!(row.section_9_tri_panel || row.section_10_product) },
          ].filter(a => a.show).map(a => (
            <a key={a.id} href={`#${a.id}`} style={{
              fontFamily: sans, fontSize: 12, color: "#9A7200",
              textDecoration: "none", padding: "6px 14px",
              borderRadius: 20, border: "1px solid rgba(154,114,0,0.2)",
              transition: "background 150ms",
            }}>
              {a.label}
            </a>
          ))}
        </div>

        {/* Body sections */}
        <Section id="ecological" title="How it lives" content={row.section_1_ecological_role as string | null} />
        <Section id="abundance" title="How it shows up in saliva" content={row.section_2_healthy_abundance as string | null} />
        <Section id="clinical" title="Clinical associations" content={row.section_3_clinical as string | null} />
        <Section id="systemic" title="Systemic connections" content={row.section_4_systemic as string | null} />

        {/* What you can do */}
        {(row.section_5_increase || row.section_6_decrease) ? (
          <section id="action" style={{ marginBottom: 48 }}>
            <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, color: "#141410", margin: "0 0 16px" }}>What you can do</h2>
            {direction === "context_dependent" ? (
              <>
                {row.section_5_increase ? <><h3 style={{ fontFamily: sans, fontSize: 16, fontWeight: 600, color: "#141410", margin: "20px 0 12px" }}>To increase</h3>{renderMarkdown(row.section_5_increase as string)}</> : null}
                {row.section_6_decrease ? <><h3 style={{ fontFamily: sans, fontSize: 16, fontWeight: 600, color: "#141410", margin: "20px 0 12px" }}>To decrease</h3>{renderMarkdown(row.section_6_decrease as string)}</> : null}
              </>
            ) : direction === "increase" ? (
              row.section_5_increase ? <div>{renderMarkdown(row.section_5_increase as string)}</div> : null
            ) : (
              row.section_6_decrease ? <div>{renderMarkdown(row.section_6_decrease as string)}</div> : null
            )}
          </section>
        ) : null}

        <Section id="species" title="Species-level detail" content={row.section_7_species_nuance as string | null} />
        <Section id="uncertainty" title="What's still uncertain" content={row.section_8_uncertainty as string | null} />

        {/* The science toggle */}
        {(row.section_9_tri_panel || row.section_10_product) ? (
          <div id="science-toggle" style={{ marginBottom: 48 }}>
            <button
              onClick={() => setScienceOpen(o => !o)}
              style={{
                fontFamily: sans, fontSize: 13, fontWeight: 500,
                color: "#9A7200", background: "rgba(154,114,0,0.06)",
                border: "1px solid rgba(154,114,0,0.15)",
                borderRadius: 8, padding: "12px 20px",
                cursor: "pointer", width: "100%", textAlign: "left",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}
            >
              <span>The science</span>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{scienceOpen ? "−" : "+"}</span>
            </button>
            {scienceOpen && (
              <div style={{ padding: "24px 0 0" }}>
                {row.section_9_tri_panel ? <div>{renderMarkdown(row.section_9_tri_panel as string)}</div> : null}
                {row.section_10_product ? <div style={{ marginTop: 24 }}>{renderMarkdown(row.section_10_product as string)}</div> : null}
              </div>
            )}
          </div>
        ) : null}

        {/* Citations */}
        {uniqueCitations.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <span style={{
              fontFamily: sans, fontSize: 11, letterSpacing: "2px",
              textTransform: "uppercase", color: "#9A7200",
              display: "block", marginBottom: 16,
            }}>
              Synthesized from {uniqueCitations.length} peer-reviewed source{uniqueCitations.length !== 1 ? "s" : ""}
            </span>
            <div style={{ borderLeft: "2px solid rgba(20,20,16,0.06)", paddingLeft: 20 }}>
              {uniqueCitations.map((c, i) => {
                const href = c.doi ? `https://doi.org/${c.doi}` : c.url ?? (c.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${c.pmid}` : null)
                return (
                  <div key={i} style={{ marginBottom: i < uniqueCitations.length - 1 ? 14 : 0 }}>
                    <p style={{ fontFamily: sans, fontSize: 12, color: "rgba(20,20,16,0.55)", lineHeight: 1.5, margin: 0 }}>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#9A7200", textDecoration: "none" }}>
                          {c.first_author} et al., <em>{c.journal}</em> {c.year}
                        </a>
                      ) : (
                        <>{c.first_author} et al., <em>{c.journal}</em> {c.year}</>
                      )}
                    </p>
                    {c.public_summary && (
                      <p style={{ fontFamily: sans, fontSize: 11, color: "rgba(20,20,16,0.4)", lineHeight: 1.5, margin: "4px 0 0" }}>
                        {c.public_summary}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Last updated */}
        {row.updated_at ? (
          <p style={{
            fontFamily: sans, fontSize: 11, color: "rgba(20,20,16,0.3)",
            marginBottom: 40,
          }}>
            Last updated: {new Date(row.updated_at as string).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        ) : null}

        {/* Bottom CTA */}
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
      `}</style>
    </>
  )
}

"use client"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split("\n")
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith("![")) {
      const match = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/)
      if (match) {
        nodes.push(
          <img
            key={i}
            src={match[2]}
            alt={match[1]}
            style={{
              width: "100%", maxHeight: 400, objectFit: "cover",
              borderRadius: 8, marginBottom: 32, display: "block",
            }}
          />
        )
        i++
        continue
      }
    }

    if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={i} style={{
          fontFamily: serif, fontSize: 26, fontWeight: 400,
          color: "#141410", margin: "40px 0 16px", lineHeight: 1.2,
        }}>
          {line.slice(3)}
        </h2>
      )
      i++
      continue
    }

    if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={i} style={{
          fontFamily: sans, fontSize: 16, fontWeight: 600,
          color: "#141410", margin: "28px 0 12px",
        }}>
          {line.slice(4)}
        </h3>
      )
      i++
      continue
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = []
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(lines[i].slice(2))
        i++
      }
      nodes.push(
        <ul key={`ul-${i}`} style={{
          fontFamily: sans, fontSize: 15, color: "#4A4A42",
          lineHeight: 1.8, margin: "12px 0 16px", paddingLeft: 24,
          listStyleType: "disc", listStylePosition: "outside",
        }}>
          {items.map((item, j) => <li key={j} style={{ margin: "6px 0", paddingLeft: 4 }}>{renderInline(item)}</li>)}
        </ul>
      )
      continue
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""))
        i++
      }
      nodes.push(
        <ol key={`ol-${i}`} style={{
          fontFamily: sans, fontSize: 15, color: "#4A4A42",
          lineHeight: 1.8, margin: "12px 0 16px", paddingLeft: 26,
          listStyleType: "decimal", listStylePosition: "outside",
        }}>
          {items.map((item, j) => <li key={j} style={{ margin: "6px 0", paddingLeft: 4 }}>{renderInline(item)}</li>)}
        </ol>
      )
      continue
    }

    if (line.startsWith("> ")) {
      nodes.push(
        <blockquote key={i} style={{
          borderLeft: "3px solid #B8860B",
          background: "rgba(184,134,11,0.04)",
          padding: "12px 16px", margin: "20px 0",
          borderRadius: "0 8px 8px 0",
        }}>
          <p style={{
            fontFamily: serif, fontSize: 18, fontStyle: "italic",
            color: "#141410", margin: 0, lineHeight: 1.5,
          }}>
            {renderInline(line.slice(2))}
          </p>
        </blockquote>
      )
      i++
      continue
    }

    if (line.trim() === "") {
      i++
      continue
    }

    nodes.push(
      <p key={i} style={{
        fontFamily: sans, fontSize: 15, color: "#4A4A42",
        lineHeight: 1.8, margin: "0 0 16px",
      }}>
        {renderInline(line)}
      </p>
    )
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
    const italicUnderscoreMatch = remaining.match(/_(.+?)_/)
    const italicAsteriskMatch = remaining.match(/(?<!\*)\*([^*\n]+?)\*(?!\*)/)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)

    const candidates: { idx: number; len: number; node: React.ReactNode }[] = []
    if (boldMatch?.index !== undefined)
      candidates.push({ idx: boldMatch.index, len: boldMatch[0].length, node: <strong key={`b-${key++}`} style={{ fontWeight: 600, color: "#141410" }}>{boldMatch[1]}</strong> })
    if (italicUnderscoreMatch?.index !== undefined)
      candidates.push({ idx: italicUnderscoreMatch.index, len: italicUnderscoreMatch[0].length, node: <em key={`i-${key++}`} style={{ fontStyle: "italic" }}>{italicUnderscoreMatch[1]}</em> })
    if (italicAsteriskMatch?.index !== undefined)
      candidates.push({ idx: italicAsteriskMatch.index, len: italicAsteriskMatch[0].length, node: <em key={`i-${key++}`} style={{ fontStyle: "italic" }}>{italicAsteriskMatch[1]}</em> })
    if (linkMatch?.index !== undefined)
      candidates.push({ idx: linkMatch.index, len: linkMatch[0].length, node: <a key={`a-${key++}`} href={linkMatch[2]} style={{ color: "#B8860B", textDecoration: "underline" }}>{linkMatch[1]}</a> })

    if (candidates.length === 0) { parts.push(remaining); break }
    candidates.sort((a, b) => a.idx - b.idx)
    const first = candidates[0]
    if (first.idx > 0) parts.push(remaining.slice(0, first.idx))
    parts.push(first.node)
    remaining = remaining.slice(first.idx + first.len)
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>
}

function stripLeadingImage(body: string): string {
  return body.replace(/^!\[.*?\]\(.*?\)\n\n?/, "")
}

export function ArticleBody({ markdown, stripFirstImage }: { markdown: string; stripFirstImage?: boolean }) {
  const md = stripFirstImage ? stripLeadingImage(markdown) : markdown
  return <div>{renderMarkdown(md)}</div>
}

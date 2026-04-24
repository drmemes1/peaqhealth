import { readFileSync, readdirSync } from "fs"
import { join } from "path"

export interface KnowledgeBase {
  voice: string
  evidence: string
  philosophy: string
  methodology: string
  positioning: string
}

const CLASSIFICATION: Record<string, keyof KnowledgeBase> = {
  "INSIGHT_COMPOSITION_GUIDE.md": "voice",
  "clinical-evidence-base.md": "evidence",
  "HRV.md": "evidence",
  "INSIGHTS.md": "philosophy",
  "CONNECTION_LINE_PATTERN.md": "methodology",
  "QUESTIONNAIRE_CROSS_REFERENCE.md": "methodology",
  "saliva-collection-protocol.md": "methodology",
}

const SKIP = new Set(["README.md", "UPDATE_RUNBOOK.md", "PHI_FLOW.md", "db-field-usage-audit.md"])

function loadDocs(): KnowledgeBase {
  const base: KnowledgeBase = { voice: "", evidence: "", philosophy: "", methodology: "", positioning: "" }

  try {
    const docsDir = join(process.cwd(), "docs")
    const files = readdirSync(docsDir).filter(f => f.endsWith(".md") && !SKIP.has(f))

    for (const file of files) {
      const category = CLASSIFICATION[file] ?? "methodology"
      try {
        const content = readFileSync(join(docsDir, file), "utf-8")
        const truncated = content.length > 12000 ? content.slice(0, 12000) + "\n\n[...truncated for context limits]" : content
        base[category] += `\n\n--- ${file} ---\n${truncated}`
      } catch {
        // File read failed — skip silently
      }
    }
  } catch {
    // docs dir not found — return empty base
  }

  return base
}

let _cached: KnowledgeBase | null = null

export function getKnowledgeBase(): KnowledgeBase {
  if (!_cached) _cached = loadDocs()
  return _cached
}

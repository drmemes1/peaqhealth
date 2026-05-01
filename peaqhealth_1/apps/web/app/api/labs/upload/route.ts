/**
 * Blood-results PDF parsing endpoint.
 *
 * Post-architectural-reset (PR-252 / ADR-0020), this route is a thin
 * wrapper around `parseBloodPDF` from apps/web/lib/blood/parser.ts.
 * The OpenAI prompt is built from the marker registry, so adding a
 * marker requires zero changes here — just a row in the registry and
 * a column in the migration.
 *
 * The old per-format branching (Quest pattern, LabCorp pattern,
 * Junction-specific path, regex fallback, Azure OCR, unpdf-then-OpenAI
 * cascade) is all gone. parseBloodPDF handles every format from a
 * single configuration. The Function Health 14-bug — and the class of
 * layout-artifact failures that produced it — is caught at the parser
 * layer's uniform-value guard.
 *
 * Response shape matches what /api/labs/save expects: registry-keyed
 * markers + parser metadata. The frontend pipes the response straight
 * through to save without translation.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { parseBloodPDF, type ParseResult } from "../../../../lib/blood/parser"

interface FileInput {
  base64: string
  filename: string
  type?: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Lab parser not configured" }, { status: 500 })
  }

  // ── Accept any of the legacy upload shapes ──────────────────────────────
  let files: FileInput[]
  try {
    const body = (await request.json()) as Record<string, unknown>
    if (Array.isArray(body.files)) {
      files = body.files as FileInput[]
    } else if (typeof body.pdfBase64 === "string") {
      files = [{ base64: body.pdfBase64, filename: "lab_report.pdf", type: "application/pdf" }]
    } else if (typeof body.file === "string") {
      files = [{ base64: body.file, filename: (body.filename as string) ?? "lab_report.pdf", type: "application/pdf" }]
    } else {
      return NextResponse.json({ error: "Missing files" }, { status: 422 })
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 422 })
  }

  // ── Parse each file via the registry-driven parser ──────────────────────
  // The parser throws on uniform-value layout artifacts (the 14-bug
  // failure mode). Out-of-range values are rejected at the value
  // level (marker → null + warning).
  const results: Array<{ filename: string; result?: ParseResult; error?: string }> = []
  for (const file of files) {
    try {
      const buffer = Buffer.from(file.base64, "base64")
      const result = await parseBloodPDF(buffer)
      results.push({ filename: file.filename, result })
    } catch (err) {
      const message = (err as Error).message ?? "Unknown parsing error"
      console.error(`[labs-upload] ${file.filename}:`, message)
      results.push({ filename: file.filename, error: message })
    }
  }

  const succeeded = results.filter(r => r.result)
  if (succeeded.length === 0) {
    return NextResponse.json(
      {
        error:
          "Could not read your lab reports. If the parser detected a likely layout artifact, " +
          "try downloading a fresh PDF from your lab's portal — portal PDFs parse most reliably.",
        perFile: results.map(r => ({ filename: r.filename, error: r.error })),
      },
      { status: 422 },
    )
  }

  // ── Merge across multiple files ─────────────────────────────────────────
  // Most-recent collectedAt wins on conflicts. For a single-file upload
  // this is a no-op.
  const sorted = [...succeeded].sort((a, b) => {
    const aDate = a.result!.collectedAt ?? ""
    const bDate = b.result!.collectedAt ?? ""
    return bDate.localeCompare(aDate)
  })

  const mergedMarkers: ParseResult["markers"] = {}
  const mergedWarnings: string[] = []
  let mergedSourceLab: string | null = null
  let mergedCollectedAt: string | null = null
  let mergedConfidence = 0
  let confidenceCount = 0

  for (const { result } of sorted as Array<{ result: ParseResult }>) {
    for (const [markerId, parsed] of Object.entries(result.markers)) {
      if (parsed && !mergedMarkers[markerId]) {
        mergedMarkers[markerId] = parsed
      } else if (!mergedMarkers[markerId]) {
        // first-seen null is fine — caller treats absent as null
        mergedMarkers[markerId] = null
      }
    }
    if (!mergedSourceLab && result.sourceLab) mergedSourceLab = result.sourceLab
    if (!mergedCollectedAt && result.collectedAt) mergedCollectedAt = result.collectedAt
    if (typeof result.overallConfidence === "number") {
      mergedConfidence += result.overallConfidence
      confidenceCount++
    }
    mergedWarnings.push(...result.warnings)
  }

  return NextResponse.json({
    status: "complete",
    markers: mergedMarkers,
    sourceLab: mergedSourceLab,
    collectedAt: mergedCollectedAt,
    parserUsed: "openai-vision-v1",
    parseConfidence: confidenceCount > 0 ? mergedConfidence / confidenceCount : 0,
    markersFound: Object.values(mergedMarkers).filter(m => m !== null).length,
    warnings: mergedWarnings,
    perFile: results.map(r => ({ filename: r.filename, error: r.error })),
  })
}

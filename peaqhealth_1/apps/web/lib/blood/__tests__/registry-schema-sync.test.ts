/**
 * Schema-sync test — the "no drift possible" guarantee.
 *
 * Reads supabase/migrations/20260501_blood_marker_reset.sql, parses out
 * the column names declared on `blood_results`, and asserts they match
 * BLOOD_MARKER_REGISTRY ids exactly. The build fails if the registry
 * and the migration disagree.
 *
 * This is what makes "add a marker = one row in the registry + one
 * column in a generated migration" a true claim. If you forget the
 * migration column, this test fails. If you ship a column without
 * a registry entry, this test fails.
 *
 * Note: this test compares against the most recent blood-marker-reset
 * migration. Future migrations that ADD or REMOVE columns from
 * `blood_results` need to update this test's input file path (or it
 * needs to be generalized to read every migration ALTER TABLE
 * directive in order).
 */

import * as fs from "fs"
import * as path from "path"
import { BLOOD_MARKER_REGISTRY } from "../markerRegistry"

// Reserved (non-marker) columns on blood_results. Anything in the
// migration that's NOT a marker column should be in this list, or the
// test fails. Keeps us honest if someone adds a new metadata field —
// it has to be acknowledged here.
const RESERVED_COLUMNS = new Set([
  "id",
  "user_id",
  "collected_at",
  "source_lab",
  "parser_used",
  "parse_confidence",
  "raw_pdf_path",
  "created_at",
  "updated_at",
])

// Path is relative to the test file. Test runs from apps/web with
// jest's rootDir, but the migration lives at the repo's
// peaqhealth_1/supabase/migrations/ — five levels up from this file.
const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../../../supabase/migrations/20260501_blood_marker_reset.sql",
)

function extractBloodResultsColumns(sql: string): string[] {
  // Find the CREATE TABLE blood_results (...) block, body only.
  const match = sql.match(/CREATE TABLE\s+blood_results\s*\(([\s\S]*?)\);/i)
  if (!match) {
    throw new Error(`Could not find CREATE TABLE blood_results in ${MIGRATION_PATH}`)
  }
  const body = match[1]

  const cols: string[] = []
  for (const rawLine of body.split("\n")) {
    // Strip everything from the first `--` to end-of-line (SQL line comment).
    const noComment = rawLine.split("--")[0].trim()
    if (!noComment) continue
    // Skip table-level constraints.
    if (/^(PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK)\b/i.test(noComment)) continue
    // Column line shape: `<name> <type>...`. Take the first token.
    const tokenMatch = noComment.match(/^([a-z_][a-z0-9_]*)\b/i)
    if (!tokenMatch) continue
    const col = tokenMatch[1].toLowerCase()
    cols.push(col)
  }
  return cols
}

describe("registry ↔ blood_results schema sync", () => {
  let migrationSql: string
  let migrationColumns: string[]

  beforeAll(() => {
    migrationSql = fs.readFileSync(MIGRATION_PATH, "utf8")
    migrationColumns = extractBloodResultsColumns(migrationSql)
  })

  test("migration parses to a non-empty column list", () => {
    expect(migrationColumns.length).toBeGreaterThan(20)
  })

  test("every registry id has a matching column in the migration", () => {
    const cols = new Set(migrationColumns)
    const missing = BLOOD_MARKER_REGISTRY
      .map(m => m.id)
      .filter(id => !cols.has(id))
    expect(missing).toEqual([])
  })

  test("every non-reserved migration column corresponds to a registry id", () => {
    const registryIds = new Set(BLOOD_MARKER_REGISTRY.map(m => m.id))
    const orphans = migrationColumns.filter(
      c => !RESERVED_COLUMNS.has(c) && !registryIds.has(c),
    )
    expect(orphans).toEqual([])
  })

  test("registry IDs are unique", () => {
    const ids = BLOOD_MARKER_REGISTRY.map(m => m.id)
    const uniq = new Set(ids)
    expect(uniq.size).toBe(ids.length)
  })

  test("every derived marker references valid operand IDs", () => {
    const ids = new Set(BLOOD_MARKER_REGISTRY.map(m => m.id))
    for (const m of BLOOD_MARKER_REGISTRY) {
      if (!m.derivedFrom) continue
      for (const op of m.derivedFrom.operands) {
        expect(ids.has(op)).toBe(true)
      }
    }
  })

  test("every marker has at least one synonym (the parser depends on this)", () => {
    for (const m of BLOOD_MARKER_REGISTRY) {
      expect(m.synonyms.length).toBeGreaterThan(0)
    }
  })

  test("validRange.min < validRange.max for every marker", () => {
    for (const m of BLOOD_MARKER_REGISTRY) {
      expect(m.validRange.min).toBeLessThan(m.validRange.max)
    }
  })
})

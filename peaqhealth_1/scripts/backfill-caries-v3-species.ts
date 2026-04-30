/**
 * Backfill caries v3 species columns for existing kits.
 *
 * Reads `oral_kit_orders.raw_otu_table.__meta.entries` from each kit, re-runs
 * the v3 species mapping (with hyphenated-call resolution), and writes the
 * 13 new species columns plus `parser_unresolved_species`.
 *
 * Idempotent: kits whose `s_cristatus_pct` is already non-zero are assumed
 * backfilled and skipped, unless `FORCE=1` is set.
 *
 * Usage (from repo root):
 *   pnpm tsx peaqhealth_1/scripts/backfill-caries-v3-species.ts
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL       — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY      — service-role key (writes!)
 *   DRY_RUN=1                      — preview without writing
 *   FORCE=1                        — re-write kits that already have v3 columns
 *   ONLY=<id1,id2,…>               — limit to a comma-separated list of kit IDs
 *
 * Pre-flight check before running in production:
 *   SELECT id, (raw_otu_table IS NOT NULL) AS has_otu, status
 *   FROM oral_kit_orders
 *   WHERE id IN ('TEST-1','TEST-2','TEST-3') OR id LIKE '%pilot%';
 *
 * Kits that lack `raw_otu_table.__meta.entries` cannot be backfilled — they
 * need a fresh upload of the original Zymo TSV. The script logs them and
 * skips.
 */

import { createClient } from "@supabase/supabase-js"
import {
  GENUS_COLUMNS,
  SPECIES_COLUMNS,
  resolveSpeciesColumn,
} from "../apps/web/lib/oral/upload-parser"

export type Entry = {
  genus: string
  species: string | null
  pct: number
  is_named: boolean
  is_placeholder: boolean
}

const DRY_RUN = process.env.DRY_RUN === "1"
const FORCE = process.env.FORCE === "1"
const ONLY = (process.env.ONLY ?? "").split(",").map(s => s.trim()).filter(Boolean)

export function reparseEntries(entries: Entry[]): {
  columnValues: Record<string, number>
  unresolved: string[]
} {
  const genusSums: Record<string, number> = {}
  const speciesSums: Record<string, number> = {}
  const unresolved: string[] = []
  let sSalivariusTotal = 0
  let strepTotal = 0
  let prevotellaCommensalTotal = 0

  for (const entry of entries) {
    const genusLower = entry.genus?.toLowerCase() ?? ""

    if (!entry.is_named) {
      if (entry.is_placeholder && entry.genus && entry.genus !== "NA") {
        // Placeholder species (Zymo's `sp\d+` unresolved-OTU calls) aggregate
        // into the parent-genus column, mirroring upload-parser.ts (PR-247 /
        // ADR-0017). Without this, kits with significant placeholder share
        // (Porphyromonas, Veillonella, …) get under-counted on backfill —
        // e.g. Pilot.Peaq.1's porphyromonas_pct collapsed from 2.18% to 0.28%.
        // See ADR-0018.
        if (GENUS_COLUMNS[genusLower]) {
          const col = GENUS_COLUMNS[genusLower]
          genusSums[col] = (genusSums[col] ?? 0) + entry.pct
        }
        if (genusLower === "streptococcus") strepTotal += entry.pct
        if (genusLower === "prevotella") prevotellaCommensalTotal += entry.pct
      }
      continue
    }

    const speciesLower = entry.species?.toLowerCase() ?? ""

    const exactKey = `${genusLower} ${speciesLower}`
    const exactCol = SPECIES_COLUMNS[exactKey]

    if (exactCol) {
      speciesSums[exactCol] = (speciesSums[exactCol] ?? 0) + entry.pct
    } else {
      const hyphen = speciesLower.includes("-")
        ? resolveSpeciesColumn(genusLower, speciesLower)
        : { column: null, unresolved: null }

      if (hyphen.column) {
        speciesSums[hyphen.column] = (speciesSums[hyphen.column] ?? 0) + entry.pct
        if (hyphen.unresolved) unresolved.push(hyphen.unresolved)
      } else if (genusLower === "streptococcus" && (speciesLower.includes("salivarius") || speciesLower.includes("vestibularis"))) {
        sSalivariusTotal += entry.pct
      } else if (genusLower === "prevotella") {
        if (speciesLower.includes("intermedia")) {
          speciesSums["prevotella_intermedia_pct"] = (speciesSums["prevotella_intermedia_pct"] ?? 0) + entry.pct
        } else {
          prevotellaCommensalTotal += entry.pct
        }
      } else if (GENUS_COLUMNS[genusLower]) {
        const col = GENUS_COLUMNS[genusLower]
        genusSums[col] = (genusSums[col] ?? 0) + entry.pct
      }
    }

    if (genusLower === "streptococcus") strepTotal += entry.pct
  }

  const ALL_TRACKED = [
    ...Object.values(GENUS_COLUMNS),
    ...Object.values(SPECIES_COLUMNS),
    "s_salivarius_pct", "streptococcus_total_pct", "prevotella_commensal_pct",
  ]
  const columnValues: Record<string, number> = {}
  for (const col of ALL_TRACKED) columnValues[col] = 0
  for (const [col, val] of Object.entries(genusSums)) columnValues[col] = parseFloat(val.toFixed(4))
  for (const [col, val] of Object.entries(speciesSums)) columnValues[col] = parseFloat(val.toFixed(4))
  columnValues["s_salivarius_pct"] = parseFloat(sSalivariusTotal.toFixed(4))
  columnValues["streptococcus_total_pct"] = parseFloat(strepTotal.toFixed(4))
  columnValues["prevotella_commensal_pct"] = parseFloat(prevotellaCommensalTotal.toFixed(4))

  return { columnValues, unresolved }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }
  const supabase = createClient(url, serviceKey)

  let query = supabase
    .from("oral_kit_orders")
    .select("id, raw_otu_table, s_cristatus_pct")
    .not("raw_otu_table", "is", null)

  if (ONLY.length > 0) query = query.in("id", ONLY)

  const { data: kits, error } = await query
  if (error) { console.error("Query failed:", error.message); process.exit(1) }
  if (!kits || kits.length === 0) { console.log("No kits to process."); return }

  let processed = 0, written = 0, skipped = 0, missing = 0, totalUnresolved = 0
  for (const kit of kits as Array<{ id: string; raw_otu_table: Record<string, unknown> | null; s_cristatus_pct: number | null }>) {
    processed++

    if (!FORCE && (kit.s_cristatus_pct ?? 0) > 0) {
      skipped++
      continue
    }

    const meta = (kit.raw_otu_table as Record<string, unknown> | null)?.__meta as Record<string, unknown> | undefined
    const entries = (meta?.entries ?? []) as Entry[]
    if (entries.length === 0) {
      console.warn(`[skip] ${kit.id}: no __meta.entries — needs full re-upload`)
      missing++
      continue
    }

    const { columnValues, unresolved } = reparseEntries(entries)
    totalUnresolved += unresolved.length

    if (DRY_RUN) {
      console.log(`[dry] ${kit.id}: would update ${Object.keys(columnValues).length} columns; ${unresolved.length} unresolved`)
      continue
    }

    const update: Record<string, unknown> = {
      ...columnValues,
      parser_unresolved_species: unresolved.length > 0 ? unresolved : null,
    }
    const { error: writeErr } = await supabase
      .from("oral_kit_orders")
      .update(update)
      .eq("id", kit.id)
    if (writeErr) {
      console.error(`[fail] ${kit.id}: ${writeErr.message}`)
      continue
    }
    written++
    const significant = ["s_cristatus_pct", "s_mitis_pct", "rothia_dentocariosa_pct"]
      .map(c => `${c}=${columnValues[c]}`).join(" ")
    console.log(`[ok]   ${kit.id}: ${significant}; unresolved=${unresolved.length}`)
  }

  console.log(`\nDone. processed=${processed} written=${written} skipped_already_done=${skipped} missing_otu=${missing} unresolved_total=${totalUnresolved}`)
  if (DRY_RUN) console.log("(DRY_RUN was set — no writes performed)")
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1) })
}

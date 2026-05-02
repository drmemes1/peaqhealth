/**
 * Backfill periodontal burden v1 output columns for existing kits.
 *
 * Reads each kit's raw_otu_table.__meta.entries (authoritative source)
 * + the user's most recent lifestyle_records row, runs
 * calculatePerioBurdenV1, and writes the perio v1 output columns.
 * Idempotent — safe to re-run.
 *
 * Usage (from repo root):
 *   pnpm tsx peaqhealth_1/scripts/backfill-perio-burden-v1-outputs.ts
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL       — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY      — service-role key (writes!)
 *   DRY_RUN=1                      — preview without writing
 *   FORCE=1                        — re-run on kits that already have
 *                                    perio_v1_computed_at set
 *   ONLY=<id1,id2,…>               — limit to a comma-separated list of kit IDs
 *
 * Run in DRY_RUN against production first to validate that pilot kits
 * classify per the ADR-0023 contract:
 *   - Igor (Pilot.Peaq.1, past Arestin): borderline OR stable_low_risk
 *     depending on how S. mitis hyphenation affects PDI
 *   - red_complex_status.status_label expected 'below_clinical_threshold'
 */

import { createClient } from "@supabase/supabase-js"
import { runPerioBurdenV1 } from "../apps/web/lib/oral/perio-burden-v1-runner"

const DRY_RUN = process.env.DRY_RUN === "1"
const FORCE = process.env.FORCE === "1"
const ONLY = (process.env.ONLY ?? "").split(",").map(s => s.trim()).filter(Boolean)

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }
  const supabase = createClient(url, serviceKey)

  let query = supabase.from("oral_kit_orders").select("*").not("raw_otu_table", "is", null)
  if (ONLY.length > 0) query = query.in("id", ONLY)

  const { data: kits, error } = await query
  if (error) { console.error("Query failed:", error.message); process.exit(1) }
  if (!kits || kits.length === 0) { console.log("No kits to process."); return }

  const userIds = Array.from(new Set(kits.map(k => k.user_id).filter(Boolean)))
  const lifestyleByUser = new Map<string, Record<string, unknown>>()
  if (userIds.length > 0) {
    const { data: lifestyles } = await supabase
      .from("lifestyle_records")
      .select("*")
      .in("user_id", userIds)
      .order("updated_at", { ascending: false })
    for (const ls of (lifestyles ?? []) as Array<Record<string, unknown>>) {
      const uid = ls.user_id as string
      if (!lifestyleByUser.has(uid)) lifestyleByUser.set(uid, ls)
    }
  }

  let processed = 0, written = 0, skipped = 0, errored = 0
  const byCategory: Record<string, number> = {}
  const byRedComplex: Record<string, number> = {}

  for (const kit of kits as Array<Record<string, unknown>>) {
    processed++
    const id = kit.id as string

    if (!FORCE && kit.perio_v1_computed_at) {
      skipped++
      continue
    }

    const lifestyle = lifestyleByUser.get(kit.user_id as string) ?? null
    const perio = runPerioBurdenV1(kit, lifestyle)
    if (!perio) {
      console.error(`[fail] ${id}: runner returned null`)
      errored++
      continue
    }

    const r = perio.result
    byCategory[r.perio_risk_category] = (byCategory[r.perio_risk_category] ?? 0) + 1
    byRedComplex[r.red_complex_status.status_label] = (byRedComplex[r.red_complex_status.status_label] ?? 0) + 1
    const summary = `${r.perio_risk_category} (PBI=${r.perio_burden_index_adjusted.toFixed(2)} ${r.perio_burden_category}, PDI=${r.perio_defense_index.toFixed(2)} ${r.perio_defense_category}, CDM=${r.commensal_depletion_factor.toFixed(2)}x, redCx=${r.red_complex_status.status_label})`

    if (DRY_RUN) {
      console.log(`[dry] ${id}: ${summary}`)
      continue
    }

    const { error: writeErr } = await supabase
      .from("oral_kit_orders")
      .update(perio.update)
      .eq("id", id)
    if (writeErr) {
      console.error(`[fail] ${id}: ${writeErr.message}`)
      errored++
      continue
    }
    written++
    console.log(`[ok]   ${id}: ${summary}`)
  }

  console.log(`\nDone. processed=${processed} written=${written} skipped_already_done=${skipped} errored=${errored}`)
  console.log(`Perio risk distribution:`)
  for (const [cat, n] of Object.entries(byCategory).sort()) console.log(`  ${cat}: ${n}`)
  console.log(`Red complex distribution:`)
  for (const [cat, n] of Object.entries(byRedComplex).sort()) console.log(`  ${cat}: ${n}`)
  if (DRY_RUN) console.log("\n(DRY_RUN was set — no writes performed)")
}

main().catch(e => { console.error(e); process.exit(1) })

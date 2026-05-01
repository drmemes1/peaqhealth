/**
 * Backfill NR v1 (nitric oxide pathway) output columns for existing kits.
 *
 * Reads each kit's species columns + the user's most recent lifestyle_records
 * row, runs calculateNRV1, and writes the 11 NR output columns. Idempotent —
 * safe to re-run.
 *
 * Usage (from repo root):
 *   pnpm tsx peaqhealth_1/scripts/backfill-nr-v1-outputs.ts
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL       — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY      — service-role key (writes!)
 *   DRY_RUN=1                      — preview without writing; prints a
 *                                    summary by nr_risk_category
 *   FORCE=1                        — re-run on kits that already have
 *                                    nr_v1_computed_at set
 *   ONLY=<id1,id2,…>               — limit to a comma-separated list of kit IDs
 *
 * Run in DRY_RUN against production first to validate that pilot kits
 * classify per the ADR-0019 contract:
 *   - Igor (rothia 8.4 + neisseria 14.8 → robust, signature 2.0 → favorable)
 *     → optimal
 *   - Gabby (limited NR biomass + Prevotella-dominant signature)
 *     → composition_constrained (paradox=true)
 *   - Evelina (Bristle data, similar pattern)
 *     → composition_constrained (paradox=true)
 */

import { createClient } from "@supabase/supabase-js"
import { runNRV1 } from "../apps/web/lib/oral/nr-v1-runner"

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

  // Fetch kits with species data populated. The runner tolerates missing
  // columns and defaults everything to 0.
  let query = supabase.from("oral_kit_orders").select("*").not("raw_otu_table", "is", null)
  if (ONLY.length > 0) query = query.in("id", ONLY)

  const { data: kits, error } = await query
  if (error) { console.error("Query failed:", error.message); process.exit(1) }
  if (!kits || kits.length === 0) { console.log("No kits to process."); return }

  // Index lifestyle by user_id (most recent per user) so we don't query per-kit.
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
  let paradoxCount = 0

  for (const kit of kits as Array<Record<string, unknown>>) {
    processed++
    const id = kit.id as string

    if (!FORCE && kit.nr_v1_computed_at) {
      skipped++
      continue
    }

    const lifestyle = lifestyleByUser.get(kit.user_id as string) ?? null
    const nr = runNRV1(kit, lifestyle)
    if (!nr) {
      console.error(`[fail] ${id}: runner returned null`)
      errored++
      continue
    }

    byCategory[nr.result.nrRiskCategory] = (byCategory[nr.result.nrRiskCategory] ?? 0) + 1
    if (nr.result.nrParadoxFlag) paradoxCount++
    const summary = `${nr.result.nrRiskCategory} (capacity=${nr.result.nrCapacityIndex.toFixed(2)} ${nr.result.nrCapacityCategory}, signature=${nr.result.noSignature.toFixed(2)} ${nr.result.noSignatureCategory}, paradox=${nr.result.nrParadoxFlag})`

    if (DRY_RUN) {
      console.log(`[dry] ${id}: ${summary}`)
      continue
    }

    const { error: writeErr } = await supabase
      .from("oral_kit_orders")
      .update(nr.update)
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
  console.log(`Paradox flag fired on ${paradoxCount}/${processed} kits.`)
  console.log(`Risk category distribution:`)
  for (const [cat, n] of Object.entries(byCategory).sort()) {
    console.log(`  ${cat}: ${n}`)
  }
  if (DRY_RUN) console.log("\n(DRY_RUN was set — no writes performed)")
}

main().catch(e => { console.error(e); process.exit(1) })

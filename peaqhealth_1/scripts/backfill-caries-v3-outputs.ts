/**
 * Backfill caries v3 output columns for existing kits.
 *
 * Reads each kit's species columns + the user's most recent
 * lifestyle_records row, runs calculateCariesV3, and writes the 19 v3
 * output columns. Idempotent — safe to re-run.
 *
 * Usage (from repo root):
 *   pnpm tsx peaqhealth_1/scripts/backfill-caries-v3-outputs.ts
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL       — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY      — service-role key (writes!)
 *   DRY_RUN=1                      — preview without writing; prints
 *                                    a summary by caries_risk_category
 *   FORCE=1                        — re-run on kits that already have
 *                                    caries_v3_computed_at set
 *   ONLY=<id1,id2,…>               — limit to a comma-separated list of kit IDs
 *
 * Run in DRY_RUN against production first to validate that pilot kits
 * classify per the ADR-0014 contract:
 *   - Igor (s_mutans_pct ≈ 0.27) → compensated_active_risk
 *   - Gabby (s_mutans_pct ≈ 0.035, ADS robust) → low_risk_stable
 *   - Evelina (severely depleted ADS, Veillonella elevated) → compensated_dysbiosis_risk
 */

import { createClient } from "@supabase/supabase-js"
import { runCariesV3 } from "../apps/web/lib/oral/caries-v3-runner"

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

  // Fetch all kits with species data already populated. We pull * to keep the
  // runner's row-shape flexible — speciesFromKitRow / lifestyleFromRow tolerate
  // missing columns and default everything to 0.
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

  for (const kit of kits as Array<Record<string, unknown>>) {
    processed++
    const id = kit.id as string

    if (!FORCE && kit.caries_v3_computed_at) {
      skipped++
      continue
    }

    const lifestyle = lifestyleByUser.get(kit.user_id as string) ?? null
    const v3 = runCariesV3(kit, lifestyle)
    if (!v3) {
      console.error(`[fail] ${id}: runner returned null`)
      errored++
      continue
    }

    byCategory[v3.result.cariesRiskCategory] = (byCategory[v3.result.cariesRiskCategory] ?? 0) + 1
    const summary = `${v3.result.cariesRiskCategory} (CLI=${v3.result.cariogenicLoadIndex.toFixed(3)} ${v3.result.cariogenicLoadCategory}, CSI=${v3.result.commensalSufficiencyCategory}, synergy=${v3.result.synergyActiveFlag})`

    if (DRY_RUN) {
      console.log(`[dry] ${id}: ${summary}`)
      continue
    }

    const { error: writeErr } = await supabase
      .from("oral_kit_orders")
      .update(v3.update)
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
  console.log(`Risk category distribution:`)
  for (const [cat, n] of Object.entries(byCategory).sort()) {
    console.log(`  ${cat}: ${n}`)
  }
  if (DRY_RUN) console.log("\n(DRY_RUN was set — no writes performed)")
}

main().catch(e => { console.error(e); process.exit(1) })

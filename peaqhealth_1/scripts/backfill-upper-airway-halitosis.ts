/**
 * Backfill upper-airway-v1 + halitosis-v2 outputs for existing kits.
 *
 * Usage (from repo root):
 *   pnpm tsx peaqhealth_1/scripts/backfill-upper-airway-halitosis.ts
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL       — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY      — service-role key (writes!)
 *   DRY_RUN=1                      — preview without writing
 *   FORCE=1                        — re-run on kits that already have
 *                                    upper_airway_v1_computed_at /
 *                                    halitosis_v2_computed_at set
 *   ONLY=<id1,id2,…>               — limit to specific kit IDs
 */

import { createClient } from "@supabase/supabase-js"
import { runUpperAirway } from "../apps/web/lib/oral/upper-airway-v1-runner"
import { runHalitosisV2 } from "../apps/web/lib/oral/halitosis-v2-runner"

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
  const profileByUser = new Map<string, Record<string, unknown>>()
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
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds)
    for (const p of (profiles ?? []) as Array<Record<string, unknown>>) {
      profileByUser.set(p.id as string, p)
    }
  }

  let processed = 0, uaWritten = 0, halWritten = 0, skipped = 0, errored = 0
  const uaTiers: Record<string, number> = {}
  const halCategories: Record<string, number> = {}

  for (const kit of kits as Array<Record<string, unknown>>) {
    processed++
    const id = kit.id as string
    const lifestyle = lifestyleByUser.get(kit.user_id as string) ?? null
    const profile = profileByUser.get(kit.user_id as string) ?? null

    // ── Upper airway ──
    if (FORCE || !kit.upper_airway_v1_computed_at) {
      const ua = runUpperAirway(kit, lifestyle, profile)
      if (!ua) {
        console.error(`[fail] ${id}: upper-airway runner returned null`)
        errored++
      } else {
        uaTiers[ua.result.tier] = (uaTiers[ua.result.tier] ?? 0) + 1
        const summary = `UA=${ua.result.tier} (bact=${ua.result.bacterial.features_present}/4, STOP=${ua.result.stop_questionnaire.stop_score}, nasal=${ua.result.nasal_obstruction.category})`
        if (DRY_RUN) {
          console.log(`[dry] ${id}: ${summary}`)
        } else {
          const { error: w } = await supabase.from("oral_kit_orders").update(ua.update).eq("id", id)
          if (w) console.error(`[fail] ${id} UA write: ${w.message}`)
          else { uaWritten++; console.log(`[ok]  ${id}: ${summary}`) }
        }
      }
    } else { skipped++ }

    // ── Halitosis ──
    // Re-fetch the kit so caries v3 outputs are visible (UA write above
    // doesn't change halitosis inputs; still safe to use the current row).
    if (FORCE || !kit.halitosis_v2_computed_at) {
      const hal = runHalitosisV2(kit, lifestyle, profile)
      if (!hal) {
        console.error(`[fail] ${id}: halitosis runner returned null`)
        errored++
      } else {
        halCategories[hal.result.pathway] = (halCategories[hal.result.pathway] ?? 0) + 1
        const summary = `HAL=${hal.result.pathway} (HMI=${hal.result.hmi.toFixed(2)} ${hal.result.hmi_category}, mod=${hal.result.protective_modifier.toFixed(2)}, LHM=${hal.result.lhm.toFixed(2)})`
        if (DRY_RUN) {
          console.log(`[dry] ${id}: ${summary}`)
        } else {
          const { error: w } = await supabase.from("oral_kit_orders").update(hal.update).eq("id", id)
          if (w) console.error(`[fail] ${id} HAL write: ${w.message}`)
          else { halWritten++; console.log(`[ok]  ${id}: ${summary}`) }
        }
      }
    }
  }

  console.log(`\nDone. processed=${processed} ua_written=${uaWritten} hal_written=${halWritten} skipped=${skipped} errored=${errored}`)
  console.log(`Upper airway tier distribution:`)
  for (const [k, n] of Object.entries(uaTiers).sort()) console.log(`  ${k}: ${n}`)
  console.log(`Halitosis phenotype distribution:`)
  for (const [k, n] of Object.entries(halCategories).sort()) console.log(`  ${k}: ${n}`)
  if (DRY_RUN) console.log("\n(DRY_RUN was set — no writes performed)")
}

main().catch(e => { console.error(e); process.exit(1) })

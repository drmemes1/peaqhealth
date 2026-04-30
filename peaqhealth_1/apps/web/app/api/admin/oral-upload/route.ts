import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import {
  recalculateScore,
  computeInterpretabilityTier,
  computeOralEnvironmentIndex,
  computeDifferentialScores,
} from "../../../../lib/score/recalculate"
import { computeCariesPanel } from "../../../../lib/oral/caries-panel"
import {
  GENUS_COLUMNS,
  SPECIES_COLUMNS,
  resolveSpeciesColumn,
  parseL7Input,
} from "../../../../lib/oral/upload-parser"
import type { ParsedEntry, ParseResult } from "../../../../lib/oral/upload-parser"

const ADMIN_USER_ID = "f08a47b5-4a8f-4b8c-b4d5-8f1de407d686"

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Species/genus column mapping tables and the L7 parser now live in
// apps/web/lib/oral/upload-parser.ts so they can be unit-tested. The route
// imports the public surface above.

interface ShannonResult {
  shannon: number
  sampleName: string
  maxDepth: number
  iterations: number
  rarefactionCurve: Record<string, number>
  allSamples: string[]
}

function parseShannonFile(raw: string, sampleIndex?: number): ShannonResult {
  const lines = raw.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) throw new Error("Shannon file too short")

  const headerCols = lines[0].split("\t")
  const META_HEADERS = ["", "sequences per sample", "iteration"]
  const sampleStartIdx = headerCols.findIndex(
    (col, i) => i > 0 && !META_HEADERS.includes(col.trim().toLowerCase())
  )
  if (sampleStartIdx < 0) throw new Error("No sample columns found in Shannon header")
  const sampleNames = headerCols.slice(sampleStartIdx)
  if (sampleNames.length === 0) throw new Error("No sample columns found in Shannon header")

  const colIdx = sampleIndex ?? 0
  if (colIdx >= sampleNames.length) throw new Error(`Sample index ${colIdx} out of range (${sampleNames.length} samples)`)

  const depthRows: Record<number, number[]> = {}

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t")
    if (cols.length < sampleStartIdx + 1 + colIdx) continue
    const depthStr = cols[1]?.trim()
    const depth = parseInt(depthStr, 10)
    if (!Number.isFinite(depth)) continue
    const val = parseFloat(cols[sampleStartIdx + colIdx])
    if (!Number.isFinite(val)) continue
    if (!depthRows[depth]) depthRows[depth] = []
    depthRows[depth].push(val)
  }

  const depths = Object.keys(depthRows).map(Number).sort((a, b) => a - b)
  if (depths.length === 0) throw new Error("No valid rarefaction rows found")

  const maxDepth = depths[depths.length - 1]
  const maxVals = depthRows[maxDepth]
  const shannon = maxVals.reduce((a, b) => a + b, 0) / maxVals.length

  const rarefactionCurve: Record<string, number> = {}
  for (const d of depths) {
    const vals = depthRows[d]
    rarefactionCurve[String(d)] = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(4))
  }

  return {
    shannon: parseFloat(shannon.toFixed(4)),
    sampleName: sampleNames[colIdx],
    maxDepth,
    iterations: maxVals.length,
    rarefactionCurve,
    allSamples: sampleNames,
  }
}


// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json() as Record<string, unknown>
  const action = body.action as string

  if (action === "list_users") {
    const supabase = svc()
    const { data } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .order("email")
    return NextResponse.json({ users: data ?? [] })
  }

  if (action === "list_kits") {
    const supabase = svc()
    const targetUserId = body.user_id as string
    const { data } = await supabase
      .from("oral_kit_orders")
      .select("id, kit_code, status, ordered_at, collection_date, shannon_diversity, neisseria_pct, primary_pattern, interpretability_tier")
      .eq("user_id", targetUserId)
      .order("ordered_at", { ascending: false })
    return NextResponse.json({ kits: data ?? [] })
  }

  if (action === "parse") {
    const rawInput = body.raw_input as string
    const shannonInput = body.shannon_input as string | undefined
    const sampleIndex = typeof body.sample_index === "number" ? body.sample_index : undefined
    if (!rawInput?.trim()) return NextResponse.json({ error: "Empty input" }, { status: 400 })
    try {
      const result = parseL7Input(rawInput)
      let shannonResult: ShannonResult | null = null
      if (shannonInput?.trim()) {
        shannonResult = parseShannonFile(shannonInput, sampleIndex)
        result.shannonDiversity = shannonResult.shannon
        result.shannonSource = "zymo_rarefaction"
      }
      return NextResponse.json({ parsed: result, shannon: shannonResult })
    } catch (err) {
      return NextResponse.json({ error: `Parse failed: ${err}` }, { status: 400 })
    }
  }

  if (action === "save") {
    const kitId = body.kit_id as string
    const targetUserId = body.user_id as string
    const rawInput = body.raw_input as string
    const shannonInput = body.shannon_input as string | undefined
    const sampleIndex = typeof body.sample_index === "number" ? body.sample_index : undefined

    if (!kitId || !targetUserId || !rawInput) {
      return NextResponse.json({ error: "Missing kit_id, user_id, or raw_input" }, { status: 400 })
    }

    const supabase = svc()
    const parsed = parseL7Input(rawInput)
    const steps: string[] = []

    let shannonResult: ShannonResult | null = null
    if (shannonInput?.trim()) {
      shannonResult = parseShannonFile(shannonInput, sampleIndex)
      parsed.shannonDiversity = shannonResult.shannon
      parsed.shannonSource = "zymo_rarefaction"
    }

    try {
      // Step 1: write species + raw OTU to oral_kit_orders
      const rawOtuWithMeta = {
        ...parsed.rawOtu,
        ...(shannonResult ? { sample_column: shannonResult.sampleName } : {}),
      }
      const updateData: Record<string, unknown> = {
        ...parsed.columnValues,
        raw_otu_table: rawOtuWithMeta,
        shannon_diversity: parsed.shannonDiversity,
        species_count: parsed.speciesCount,
        status: "results_uploaded",
        parser_unresolved_species: parsed.parserUnresolvedSpecies.length > 0 ? parsed.parserUnresolvedSpecies : null,
      }
      if (shannonResult) {
        updateData.rarefaction_curve = shannonResult.rarefactionCurve
      }
      const { error: writeErr } = await supabase
        .from("oral_kit_orders")
        .update(updateData)
        .eq("id", kitId)
      if (writeErr) throw new Error(`Write species failed: ${writeErr.message}`)
      steps.push(`Wrote ${Object.keys(parsed.columnValues).length} columns + raw_otu_table (${parsed.speciesCount} species)`)
      if (parsed.parserUnresolvedSpecies.length > 0) {
        steps.push(`Hyphenated calls resolved: ${parsed.parserUnresolvedSpecies.length} (e.g. ${parsed.parserUnresolvedSpecies[0]})`)
      }
      steps.push(`Shannon: ${parsed.shannonDiversity?.toFixed(4)} (${parsed.shannonSource}${shannonResult ? `, depth ${shannonResult.maxDepth}, ${shannonResult.iterations} iterations` : ""})`)

      // Step 2: reload kit row for scoring
      const { data: kitRow, error: readErr } = await supabase
        .from("oral_kit_orders")
        .select("*")
        .eq("id", kitId)
        .single()
      if (readErr || !kitRow) throw new Error(`Reload kit failed: ${readErr?.message}`)

      // Step 2b: compute caries panel
      const caries = computeCariesPanel(kitRow as Parameters<typeof computeCariesPanel>[0])
      const { error: cariesErr } = await supabase.from("oral_kit_orders").update({
        ph_balance_api: caries.phBalanceApi, ph_balance_category: caries.phBalanceCategory,
        ph_balance_confidence: caries.phBalanceConfidence,
        cariogenic_load_pct: caries.cariogenicLoadPct, cariogenic_load_category: caries.cariogenicLoadCategory,
        protective_ratio: caries.protectiveRatio, protective_ratio_category: caries.protectiveRatioCategory,
      }).eq("id", kitId)
      if (cariesErr) throw new Error(`Caries write failed: ${cariesErr.message}`)
      steps.push(`Caries: pH ${caries.phBalanceApi.toFixed(3)} (${caries.phBalanceCategory}), CLI ${caries.cariogenicLoadPct.toFixed(3)} (${caries.cariogenicLoadCategory}), PR ${caries.protectiveRatio?.toFixed(2) ?? "N/A"} (${caries.protectiveRatioCategory})`)

      // Step 3: fetch lifestyle for scoring
      const { data: lifestyle } = await supabase
        .from("lifestyle_records")
        .select("*")
        .eq("user_id", targetUserId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      // Step 4: interpretability tier
      const tierResult = computeInterpretabilityTier(kitRow)
      await supabase
        .from("oral_kit_orders")
        .update({
          interpretability_tier: tierResult.tier,
          compliance_flags: tierResult.flags,
          protocol_compliant: tierResult.protocol_compliant,
        })
        .eq("id", kitId)
      steps.push(`Interpretability tier: ${tierResult.tier}`)

      let envPattern: string | null = null
      let primaryPattern: string | null = null
      let secondaryPattern: string | null = null

      if (tierResult.tier !== "deferred") {
        // Step 5: environment index
        const envIndex = computeOralEnvironmentIndex(kitRow, lifestyle)
        envPattern = envIndex.env_pattern

        // Step 6: differential scores
        const diffScores = computeDifferentialScores(kitRow, envIndex, lifestyle, null)
        primaryPattern = diffScores.primary_pattern
        secondaryPattern = diffScores.secondary_pattern

        await supabase
          .from("oral_kit_orders")
          .update({
            env_acid_ratio: envIndex.env_acid_ratio,
            env_acid_total_pct: envIndex.env_acid_total_pct,
            env_base_total_pct: envIndex.env_base_total_pct,
            env_aerobic_score_pct: envIndex.env_aerobic_score_pct,
            env_anaerobic_load_pct: envIndex.env_anaerobic_load_pct,
            env_aerobic_anaerobic_ratio: envIndex.env_aerobic_anaerobic_ratio,
            env_pattern: envIndex.env_pattern,
            env_pattern_confidence: envIndex.env_pattern_confidence,
            env_peroxide_flag: envIndex.env_peroxide_flag,
            env_dietary_nitrate_flag: envIndex.env_dietary_nitrate_flag,
            score_osa: diffScores.score_osa,
            score_uars: diffScores.score_uars,
            score_mouth_breathing: diffScores.score_mouth_breathing,
            score_periodontal_activity: diffScores.score_periodontal_activity,
            score_bruxism: diffScores.score_bruxism,
            score_caries_risk: diffScores.score_caries_risk,
            primary_pattern: diffScores.primary_pattern,
            secondary_pattern: diffScores.secondary_pattern,
            no_wearable_caveat: diffScores.no_wearable_caveat,
          })
          .eq("id", kitId)
        steps.push(`Env pattern: ${envIndex.env_pattern} (${envIndex.env_pattern_confidence}). Primary: ${primaryPattern}, Secondary: ${secondaryPattern}`)
      } else {
        steps.push("Scoring skipped (deferred)")
      }

      // Step 7: recalculate total score
      const newScore = await recalculateScore(targetUserId, supabase)
      steps.push(`Recalculated total score: ${newScore}`)

      // Step 8: mark results_ready
      await supabase
        .from("oral_kit_orders")
        .update({ status: "results_ready" })
        .eq("id", kitId)
      steps.push("Status → results_ready")

      return NextResponse.json({
        success: true,
        steps,
        summary: {
          speciesCount: parsed.speciesCount,
          shannonDiversity: parsed.shannonDiversity,
          interpretabilityTier: tierResult.tier,
          envPattern,
          primaryPattern,
          secondaryPattern,
          totalScore: newScore,
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("[oral-upload] pipeline failed:", msg)
      await supabase
        .from("oral_kit_orders")
        .update({ status: "failed" })
        .eq("id", kitId)
      return NextResponse.json({ success: false, error: msg, steps }, { status: 500 })
    }
  }

  if (action === "reprocess") {
    const kitId = body.kit_id as string
    const targetUserId = body.user_id as string
    if (!kitId || !targetUserId) return NextResponse.json({ error: "Missing kit_id or user_id" }, { status: 400 })

    const supabase = svc()
    const steps: string[] = []

    try {
      const { data: kitRow, error: readErr } = await supabase
        .from("oral_kit_orders")
        .select("*")
        .eq("id", kitId)
        .single()
      if (readErr || !kitRow) throw new Error(`Load kit failed: ${readErr?.message}`)
      steps.push("Loaded kit row")

      const { data: lifestyle } = await supabase
        .from("lifestyle_records")
        .select("*")
        .eq("user_id", targetUserId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const tierResult = computeInterpretabilityTier(kitRow)
      const { error: tierErr } = await supabase
        .from("oral_kit_orders")
        .update({ interpretability_tier: tierResult.tier, compliance_flags: tierResult.flags, protocol_compliant: tierResult.protocol_compliant })
        .eq("id", kitId)
      if (tierErr) throw new Error(`Tier write failed: ${tierErr.message}`)
      steps.push(`Tier: ${tierResult.tier} (flags: ${tierResult.flags.join(", ") || "none"})`)

      let envPattern: string | null = null
      let primaryPattern: string | null = null

      if (tierResult.tier !== "deferred") {
        const envIndex = computeOralEnvironmentIndex(kitRow, lifestyle)
        const diffScores = computeDifferentialScores(kitRow, envIndex, lifestyle, null)
        envPattern = envIndex.env_pattern
        primaryPattern = diffScores.primary_pattern

        const { error: envErr } = await supabase
          .from("oral_kit_orders")
          .update({
            env_acid_ratio: envIndex.env_acid_ratio, env_acid_total_pct: envIndex.env_acid_total_pct,
            env_base_total_pct: envIndex.env_base_total_pct, env_aerobic_score_pct: envIndex.env_aerobic_score_pct,
            env_anaerobic_load_pct: envIndex.env_anaerobic_load_pct, env_aerobic_anaerobic_ratio: envIndex.env_aerobic_anaerobic_ratio,
            env_pattern: envIndex.env_pattern, env_pattern_confidence: envIndex.env_pattern_confidence,
            env_peroxide_flag: envIndex.env_peroxide_flag, env_dietary_nitrate_flag: envIndex.env_dietary_nitrate_flag,
            score_osa: diffScores.score_osa, score_uars: diffScores.score_uars,
            score_mouth_breathing: diffScores.score_mouth_breathing, score_periodontal_activity: diffScores.score_periodontal_activity,
            score_bruxism: diffScores.score_bruxism, score_caries_risk: diffScores.score_caries_risk,
            primary_pattern: diffScores.primary_pattern, secondary_pattern: diffScores.secondary_pattern,
            no_wearable_caveat: diffScores.no_wearable_caveat,
          })
          .eq("id", kitId)
        if (envErr) throw new Error(`Env/scores write failed: ${envErr.message}`)
        steps.push(`Env: ${envIndex.env_pattern} (${envIndex.env_pattern_confidence}). Primary: ${primaryPattern}`)
      }

      const newScore = await recalculateScore(targetUserId, supabase)
      steps.push(`Recalculated score: ${newScore}`)

      await supabase.from("oral_kit_orders").update({ status: "results_ready" }).eq("id", kitId)
      steps.push("Status → results_ready")

      return NextResponse.json({
        success: true, steps,
        summary: { interpretabilityTier: tierResult.tier, envPattern, primaryPattern, totalScore: newScore },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("[oral-upload] reprocess failed:", msg)
      return NextResponse.json({ success: false, error: msg, steps }, { status: 500 })
    }
  }

  if (action === "reparse") {
    const kitId = body.kit_id as string
    const targetUserId = body.user_id as string
    if (!kitId || !targetUserId) return NextResponse.json({ error: "Missing kit_id or user_id" }, { status: 400 })

    const supabase = svc()
    const steps: string[] = []

    try {
      const { data: kitRow, error: readErr } = await supabase
        .from("oral_kit_orders")
        .select("raw_otu_table, shannon_diversity, rarefaction_curve")
        .eq("id", kitId)
        .single()
      if (readErr || !kitRow) throw new Error(`Load kit failed: ${readErr?.message}`)

      const rawOtu = kitRow.raw_otu_table as Record<string, unknown> | null
      const meta = (rawOtu as Record<string, unknown>)?.__meta as Record<string, unknown> | undefined
      const entries = (meta?.entries ?? []) as Array<{ genus: string; species: string | null; pct: number; is_named: boolean; is_placeholder: boolean }>
      if (entries.length === 0) throw new Error("No __meta.entries in raw_otu_table — needs full re-upload")
      steps.push(`Found ${entries.length} entries in raw_otu_table.__meta.entries`)

      // Re-run column mapping with current parser rules. Hyphenated species
      // calls go through resolveSpeciesColumn() so the v3 species map (e.g.
      // "mitis-pneumoniae" → s_mitis_pct) backfills correctly.
      const genusSums: Record<string, number> = {}
      const speciesSums: Record<string, number> = {}
      const reparseUnresolved: string[] = []
      let sSalivariusTotal = 0
      let strepTotal = 0
      let prevotellaCommensalTotal = 0

      for (const entry of entries) {
        if (!entry.is_named) continue
        const genusLower = entry.genus.toLowerCase()
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
            if (hyphen.unresolved) reparseUnresolved.push(hyphen.unresolved)
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
        ...Object.values(GENUS_COLUMNS), ...Object.values(SPECIES_COLUMNS),
        "s_salivarius_pct", "streptococcus_total_pct", "prevotella_commensal_pct",
      ]
      const columnValues: Record<string, number> = {}
      for (const col of ALL_TRACKED) columnValues[col] = 0
      for (const [col, val] of Object.entries(genusSums)) columnValues[col] = parseFloat(val.toFixed(4))
      for (const [col, val] of Object.entries(speciesSums)) columnValues[col] = parseFloat(val.toFixed(4))
      columnValues["s_salivarius_pct"] = parseFloat(sSalivariusTotal.toFixed(4))
      columnValues["streptococcus_total_pct"] = parseFloat(strepTotal.toFixed(4))
      columnValues["prevotella_commensal_pct"] = parseFloat(prevotellaCommensalTotal.toFixed(4))

      const reparseUpdate: Record<string, unknown> = {
        ...columnValues,
        parser_unresolved_species: reparseUnresolved.length > 0 ? reparseUnresolved : null,
      }
      const { error: writeErr } = await supabase
        .from("oral_kit_orders")
        .update(reparseUpdate)
        .eq("id", kitId)
      if (writeErr) throw new Error(`Write columns failed: ${writeErr.message}`)
      steps.push(`Wrote ${Object.keys(columnValues).length} columns (s_salivarius=${sSalivariusTotal.toFixed(2)}, lactobacillus=${columnValues["lactobacillus_pct"]})`)
      if (reparseUnresolved.length > 0) {
        steps.push(`Hyphenated calls resolved: ${reparseUnresolved.length} (e.g. ${reparseUnresolved[0]})`)
      }

      // Re-compute caries panel
      const cariesReparse = computeCariesPanel(columnValues as unknown as Parameters<typeof computeCariesPanel>[0])
      await supabase.from("oral_kit_orders").update({
        ph_balance_api: cariesReparse.phBalanceApi, ph_balance_category: cariesReparse.phBalanceCategory,
        ph_balance_confidence: cariesReparse.phBalanceConfidence,
        cariogenic_load_pct: cariesReparse.cariogenicLoadPct, cariogenic_load_category: cariesReparse.cariogenicLoadCategory,
        protective_ratio: cariesReparse.protectiveRatio, protective_ratio_category: cariesReparse.protectiveRatioCategory,
      }).eq("id", kitId)
      steps.push(`Caries: pH ${cariesReparse.phBalanceApi.toFixed(3)} (${cariesReparse.phBalanceCategory}), CLI ${cariesReparse.cariogenicLoadPct.toFixed(3)}, PR ${cariesReparse.protectiveRatio?.toFixed(2) ?? "N/A"}`)

      // Re-read and run full pipeline (tier + env + scores)
      const { data: updated } = await supabase.from("oral_kit_orders").select("*").eq("id", kitId).single()
      if (!updated) throw new Error("Failed to reload after column write")

      const { data: lifestyle } = await supabase
        .from("lifestyle_records").select("*")
        .eq("user_id", targetUserId).order("updated_at", { ascending: false }).limit(1).maybeSingle()

      const tierResult = computeInterpretabilityTier(updated)
      await supabase.from("oral_kit_orders").update({
        interpretability_tier: tierResult.tier, compliance_flags: tierResult.flags, protocol_compliant: tierResult.protocol_compliant,
      }).eq("id", kitId)
      steps.push(`Tier: ${tierResult.tier} (flags: ${tierResult.flags.join(", ") || "none"})`)

      let envPattern: string | null = null
      let primaryPattern: string | null = null

      if (tierResult.tier !== "deferred") {
        const envIndex = computeOralEnvironmentIndex(updated, lifestyle)
        const diffScores = computeDifferentialScores(updated, envIndex, lifestyle, null)
        envPattern = envIndex.env_pattern
        primaryPattern = diffScores.primary_pattern

        const { error: envErr } = await supabase.from("oral_kit_orders").update({
          env_acid_ratio: envIndex.env_acid_ratio, env_acid_total_pct: envIndex.env_acid_total_pct,
          env_base_total_pct: envIndex.env_base_total_pct, env_aerobic_score_pct: envIndex.env_aerobic_score_pct,
          env_anaerobic_load_pct: envIndex.env_anaerobic_load_pct, env_aerobic_anaerobic_ratio: envIndex.env_aerobic_anaerobic_ratio,
          env_pattern: envIndex.env_pattern, env_pattern_confidence: envIndex.env_pattern_confidence,
          env_peroxide_flag: envIndex.env_peroxide_flag, env_dietary_nitrate_flag: envIndex.env_dietary_nitrate_flag,
          score_osa: diffScores.score_osa, score_uars: diffScores.score_uars,
          score_mouth_breathing: diffScores.score_mouth_breathing, score_periodontal_activity: diffScores.score_periodontal_activity,
          score_bruxism: diffScores.score_bruxism, score_caries_risk: diffScores.score_caries_risk,
          primary_pattern: diffScores.primary_pattern, secondary_pattern: diffScores.secondary_pattern,
          no_wearable_caveat: diffScores.no_wearable_caveat,
        }).eq("id", kitId)
        if (envErr) throw new Error(`Env write failed: ${envErr.message}`)
        steps.push(`Env: ${envPattern} (${envIndex.env_pattern_confidence}). Primary: ${primaryPattern}, Secondary: ${diffScores.secondary_pattern}`)
        steps.push(`Scores — perio: ${diffScores.score_periodontal_activity}, mb: ${diffScores.score_mouth_breathing}, osa: ${diffScores.score_osa}, caries: ${diffScores.score_caries_risk}`)
      }

      const newScore = await recalculateScore(targetUserId, supabase)
      steps.push(`Total score: ${newScore}`)

      await supabase.from("oral_kit_orders").update({ status: "results_ready" }).eq("id", kitId)

      return NextResponse.json({
        success: true, steps,
        summary: { interpretabilityTier: tierResult.tier, envPattern, primaryPattern, totalScore: newScore,
          s_salivarius: sSalivariusTotal.toFixed(4), lactobacillus: columnValues["lactobacillus_pct"].toFixed(4),
          prevotella_commensal: prevotellaCommensalTotal.toFixed(4) },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("[oral-upload] reparse failed:", msg)
      return NextResponse.json({ success: false, error: msg, steps }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import {
  recalculateScore,
  computeInterpretabilityTier,
  computeOralEnvironmentIndex,
  computeDifferentialScores,
} from "../../../../lib/score/recalculate"

const ADMIN_USER_ID = "f08a47b5-4a8f-4b8c-b4d5-8f1de407d686"

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ── Species-to-column mapping ───────────────────────────────────────────────

const GENUS_COLUMNS: Record<string, string> = {
  neisseria: "neisseria_pct",
  haemophilus: "haemophilus_pct",
  rothia: "rothia_pct",
  actinomyces: "actinomyces_pct",
  veillonella: "veillonella_pct",
  porphyromonas: "porphyromonas_pct",
  treponema: "treponema_pct",
  fusobacterium: "fusobacterium_pct",
  aggregatibacter: "aggregatibacter_pct",
  campylobacter: "campylobacter_pct",
  lactobacillus: "lactobacillus_pct",
  peptostreptococcus: "peptostreptococcus_pct",
  parvimonas: "parvimonas_pct",
  granulicatella: "granulicatella_pct",
}

const SPECIES_COLUMNS: Record<string, string> = {
  "tannerella forsythia": "tannerella_pct",
  "prevotella intermedia": "prevotella_intermedia_pct",
  "streptococcus mutans": "s_mutans_pct",
  "streptococcus sobrinus": "s_sobrinus_pct",
  "streptococcus sanguinis": "s_sanguinis_pct",
  "streptococcus gordonii": "s_gordonii_pct",
  "scardovia wiggsiae": "scardovia_pct",
}

const S_SALIVARIUS_SPECIES = ["streptococcus salivarius", "streptococcus vestibularis"]

interface ParsedEntry {
  rawName: string
  genus: string
  species: string | null
  pct: number
  mappedColumn: string | null
  mappingType: "genus_sum" | "species_exact" | "special" | "unmatched"
}

interface ParseResult {
  entries: ParsedEntry[]
  columnValues: Record<string, number>
  shannonDiversity: number | null
  speciesCount: number
  rawOtu: Record<string, number>
}

function extractGenusSpecies(taxon: string): { genus: string; species: string | null; fullSpecies: string; skip: boolean } {
  const levels = taxon.split(";").map(l => l.trim())
  let genus = ""
  let species: string | null = null

  for (const level of levels) {
    if (level.startsWith("g__")) genus = level.slice(3).replace(/_/g, " ").trim()
    if (level.startsWith("s__")) species = level.slice(3).replace(/_/g, " ").trim()
  }

  if (!genus && !species) {
    const cleaned = taxon.replace(/[dkpcofgs]__/g, "").replace(/;/g, " ").replace(/_/g, " ").trim()
    const parts = cleaned.split(/\s+/)
    genus = parts[0] || ""
    species = parts.length >= 2 ? parts[1] : null
  }

  if (!species || species === "" || species.toLowerCase() === "na" || /^sp\d/i.test(species)) {
    return { genus, species: null, fullSpecies: genus, skip: true }
  }

  const fullSpecies = `${genus} ${species}`
  return { genus, species, fullSpecies, skip: false }
}

function parseL7Input(raw: string): ParseResult {
  const lines = raw.trim().split(/\r?\n/).filter(l => l.trim() && !l.startsWith("#"))

  const delimiter = lines[0]?.includes("\t") ? "\t" : ","
  const hasHeader = lines[0]?.toLowerCase().includes("otu") || lines[0]?.toLowerCase().includes("taxonomy")
  const dataLines = hasHeader ? lines.slice(1) : lines

  // First pass: collect all raw values to detect fractional vs percentage
  const rawValues: { genus: string; species: string | null; fullSpecies: string; val: number; skip: boolean }[] = []
  let valSum = 0

  for (const line of dataLines) {
    const cols = line.split(delimiter).map(c => c.trim())
    if (cols.length < 2) continue

    const taxon = cols[0]
    const firstNumCol = cols.slice(1).find(c => { const v = parseFloat(c); return Number.isFinite(v) })
    const val = firstNumCol != null ? parseFloat(firstNumCol) : NaN
    if (!Number.isFinite(val) || val <= 0) continue

    const parsed = extractGenusSpecies(taxon)
    valSum += val
    rawValues.push({ ...parsed, val })
  }

  const isFractional = valSum > 0 && valSum <= 2
  const multiplier = isFractional ? 100 : 1

  const rawOtu: Record<string, number> = {}
  const entries: ParsedEntry[] = []
  const genusSums: Record<string, number> = {}
  const speciesSums: Record<string, number> = {}
  const sSalivariusSum: { total: number } = { total: 0 }
  let strepTotal = 0
  let prevotellaTotal = 0
  let prevotellaIntermedia = 0

  for (const { genus, species, fullSpecies, val, skip } of rawValues) {
    const pct = val * multiplier

    rawOtu[fullSpecies] = (rawOtu[fullSpecies] ?? 0) + pct / 100

    if (skip) continue

    const genusLower = genus.toLowerCase()
    const speciesLower = fullSpecies.toLowerCase()

    let mappedColumn: string | null = null
    let mappingType: ParsedEntry["mappingType"] = "unmatched"

    if (SPECIES_COLUMNS[speciesLower]) {
      mappedColumn = SPECIES_COLUMNS[speciesLower]
      mappingType = "species_exact"
      speciesSums[mappedColumn] = (speciesSums[mappedColumn] ?? 0) + pct
    } else if (S_SALIVARIUS_SPECIES.includes(speciesLower)) {
      mappedColumn = "s_salivarius_pct"
      mappingType = "special"
      sSalivariusSum.total += pct
    } else if (GENUS_COLUMNS[genusLower]) {
      mappedColumn = GENUS_COLUMNS[genusLower]
      mappingType = "genus_sum"
      genusSums[mappedColumn] = (genusSums[mappedColumn] ?? 0) + pct
    }

    if (genusLower === "streptococcus") strepTotal += pct
    if (genusLower === "prevotella") {
      prevotellaTotal += pct
      if (speciesLower === "prevotella intermedia") prevotellaIntermedia += pct
    }

    entries.push({ rawName: fullSpecies, genus, species: fullSpecies.includes(" ") ? fullSpecies.split(" ").slice(1).join(" ") : null, pct, mappedColumn, mappingType })
  }

  const columnValues: Record<string, number> = {}

  for (const [col, val] of Object.entries(genusSums)) columnValues[col] = parseFloat(val.toFixed(4))
  for (const [col, val] of Object.entries(speciesSums)) columnValues[col] = parseFloat(val.toFixed(4))
  if (sSalivariusSum.total > 0) columnValues["s_salivarius_pct"] = parseFloat(sSalivariusSum.total.toFixed(4))
  columnValues["streptococcus_total_pct"] = parseFloat(strepTotal.toFixed(4))
  columnValues["prevotella_commensal_pct"] = parseFloat((prevotellaTotal - prevotellaIntermedia).toFixed(4))

  const vals = Object.values(rawOtu).filter(v => v > 0)
  const total = vals.reduce((a, b) => a + b, 0)
  let shannonDiversity: number | null = null
  if (total > 0) {
    shannonDiversity = -vals.reduce((h, v) => {
      const p = v / total
      return p > 0 ? h + p * Math.log(p) : h
    }, 0)
    shannonDiversity = parseFloat(shannonDiversity.toFixed(3))
  }

  return {
    entries: entries.sort((a, b) => b.pct - a.pct),
    columnValues,
    shannonDiversity,
    speciesCount: vals.length,
    rawOtu,
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
    if (!rawInput?.trim()) return NextResponse.json({ error: "Empty input" }, { status: 400 })
    try {
      const result = parseL7Input(rawInput)
      return NextResponse.json({ parsed: result })
    } catch (err) {
      return NextResponse.json({ error: `Parse failed: ${err}` }, { status: 400 })
    }
  }

  if (action === "save") {
    const kitId = body.kit_id as string
    const targetUserId = body.user_id as string
    const rawInput = body.raw_input as string

    if (!kitId || !targetUserId || !rawInput) {
      return NextResponse.json({ error: "Missing kit_id, user_id, or raw_input" }, { status: 400 })
    }

    const supabase = svc()
    const parsed = parseL7Input(rawInput)
    const steps: string[] = []

    try {
      // Step 1: write species + raw OTU to oral_kit_orders
      const updateData: Record<string, unknown> = {
        ...parsed.columnValues,
        raw_otu_table: parsed.rawOtu,
        shannon_diversity: parsed.shannonDiversity,
        species_count: parsed.speciesCount,
        status: "results_uploaded",
      }
      const { error: writeErr } = await supabase
        .from("oral_kit_orders")
        .update(updateData)
        .eq("id", kitId)
      if (writeErr) throw new Error(`Write species failed: ${writeErr.message}`)
      steps.push(`Wrote ${Object.keys(parsed.columnValues).length} columns + raw_otu_table (${parsed.speciesCount} species)`)

      // Step 2: reload kit row for scoring
      const { data: kitRow, error: readErr } = await supabase
        .from("oral_kit_orders")
        .select("*")
        .eq("id", kitId)
        .single()
      if (readErr || !kitRow) throw new Error(`Reload kit failed: ${readErr?.message}`)

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

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}

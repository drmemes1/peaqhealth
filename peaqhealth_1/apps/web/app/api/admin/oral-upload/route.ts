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
  taxonomy_full: string
  kingdom: string
  phylum: string
  class_: string
  order: string
  family: string
  genus: string
  species: string | null
  is_named: boolean
  is_placeholder: boolean
  pct: number
  mapped_column: string | null
  mapping_type: "genus_sum" | "species_exact" | "special" | "unmatched" | "placeholder"
}

interface ShannonResult {
  shannon: number
  sampleName: string
  maxDepth: number
  iterations: number
  rarefactionCurve: Record<string, number>
  allSamples: string[]
}

interface CommunitySummary {
  total_entries_present: number
  named_species_count: number
  unnamed_placeholder_count: number
  distinct_genera: number
  distinct_phyla: number
  total_abundance_captured: number
}

interface ParseResult {
  entries: ParsedEntry[]
  communitySummary: CommunitySummary
  columnValues: Record<string, number>
  shannonDiversity: number | null
  shannonSource: "zymo_rarefaction" | "computed_l7" | null
  speciesCount: number
  totalTracked: number
  totalUntracked: number
  rawOtu: Record<string, number>
}

interface TaxonomyParsed {
  taxonomy_full: string
  kingdom: string
  phylum: string
  class_: string
  order: string
  family: string
  genus: string
  species: string | null
  is_named: boolean
  is_placeholder: boolean
  fullSpecies: string
}

function extractTaxonomy(taxon: string): TaxonomyParsed {
  const levels = taxon.split(";").map(l => l.trim())
  const extract = (prefix: string) => {
    const match = levels.find(l => l.startsWith(prefix))
    return match ? match.slice(prefix.length).replace(/_/g, " ").trim() : ""
  }

  const kingdom = extract("k__")
  const phylum = extract("p__")
  const class_ = extract("c__")
  const order = extract("o__")
  const family = extract("f__")
  const genus = extract("g__")
  let species = extract("s__") || null

  if (!genus && !species) {
    const cleaned = taxon.replace(/[dkpcofgs]__/g, "").replace(/;/g, " ").replace(/_/g, " ").trim()
    const parts = cleaned.split(/\s+/)
    return {
      taxonomy_full: taxon, kingdom, phylum, class_, order, family,
      genus: parts[0] || "", species: parts[1] || null,
      is_named: true, is_placeholder: false, fullSpecies: parts.slice(0, 2).join(" "),
    }
  }

  if (!species || species === "" || species.toLowerCase() === "na") {
    return { taxonomy_full: taxon, kingdom, phylum, class_, order, family, genus, species: null, is_named: false, is_placeholder: true, fullSpecies: genus }
  }

  const firstPart = species.split("-")[0].replace(/ /g, "")
  const isPureSpNumber = /^sp\d+$/i.test(firstPart)

  return {
    taxonomy_full: taxon, kingdom, phylum, class_, order, family, genus, species,
    is_named: !isPureSpNumber,
    is_placeholder: isPureSpNumber,
    fullSpecies: `${genus} ${species}`,
  }
}

function parseShannonFile(raw: string, sampleIndex?: number): ShannonResult {
  const lines = raw.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) throw new Error("Shannon file too short")

  const headerCols = lines[0].split("\t")
  const sampleNames = headerCols.slice(3)
  if (sampleNames.length === 0) throw new Error("No sample columns found in Shannon header")

  const colIdx = sampleIndex ?? 0
  if (colIdx >= sampleNames.length) throw new Error(`Sample index ${colIdx} out of range (${sampleNames.length} samples)`)

  const depthRows: Record<number, number[]> = {}

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t")
    if (cols.length < 4 + colIdx) continue
    const depthStr = cols[1]?.trim()
    const depth = parseInt(depthStr, 10)
    if (!Number.isFinite(depth)) continue
    const val = parseFloat(cols[3 + colIdx])
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

function parseL7Input(raw: string): ParseResult {
  const lines = raw.trim().split(/\r?\n/).filter(l => l.trim() && !l.startsWith("#"))

  const delimiter = lines[0]?.includes("\t") ? "\t" : ","
  const hasHeader = lines[0]?.toLowerCase().includes("otu") || lines[0]?.toLowerCase().includes("taxonomy")
  const dataLines = hasHeader ? lines.slice(1) : lines

  // First pass: collect all rows, detect fractional vs percentage
  const rawRows: { taxo: TaxonomyParsed; val: number }[] = []
  let valSum = 0

  for (const line of dataLines) {
    const cols = line.split(delimiter).map(c => c.trim())
    if (cols.length < 2) continue
    const taxon = cols[0]
    const firstNumCol = cols.slice(1).find(c => { const v = parseFloat(c); return Number.isFinite(v) })
    const val = firstNumCol != null ? parseFloat(firstNumCol) : NaN
    if (!Number.isFinite(val) || val <= 0) continue
    valSum += val
    rawRows.push({ taxo: extractTaxonomy(taxon), val })
  }

  const isFractional = valSum > 0 && valSum <= 2
  const multiplier = isFractional ? 100 : 1

  // Second pass: classify, map, and accumulate
  const allEntries: ParsedEntry[] = []
  const genusSums: Record<string, number> = {}
  const speciesSums: Record<string, number> = {}
  let sSalivariusTotal = 0
  let strepTotal = 0
  let prevotellaCommensalTotal = 0
  const generaSet = new Set<string>()
  const phylaSet = new Set<string>()
  let namedCount = 0
  let placeholderCount = 0
  let totalAbundance = 0

  for (const { taxo, val } of rawRows) {
    const pct = parseFloat((val * multiplier).toFixed(4))
    totalAbundance += pct

    const genusLower = taxo.genus.toLowerCase()
    const speciesLower = taxo.fullSpecies.toLowerCase()
    if (taxo.genus) generaSet.add(taxo.genus)
    if (taxo.phylum) phylaSet.add(taxo.phylum)
    if (taxo.is_named) namedCount++
    if (taxo.is_placeholder) placeholderCount++

    let mapped_column: string | null = null
    let mapping_type: ParsedEntry["mapping_type"] = taxo.is_placeholder ? "placeholder" : "unmatched"

    // Only named species contribute to dedicated columns
    if (taxo.is_named) {
      if (SPECIES_COLUMNS[speciesLower]) {
        mapped_column = SPECIES_COLUMNS[speciesLower]
        mapping_type = "species_exact"
        speciesSums[mapped_column] = (speciesSums[mapped_column] ?? 0) + pct
      } else if (S_SALIVARIUS_SPECIES.includes(speciesLower)) {
        mapped_column = "s_salivarius_pct"
        mapping_type = "special"
        sSalivariusTotal += pct
      } else if (genusLower === "prevotella") {
        if (taxo.species?.toLowerCase() === "intermedia") {
          mapped_column = "prevotella_intermedia_pct"
          mapping_type = "species_exact"
          speciesSums[mapped_column] = (speciesSums[mapped_column] ?? 0) + pct
        } else {
          mapped_column = "prevotella_commensal_pct"
          mapping_type = "special"
          prevotellaCommensalTotal += pct
        }
      } else if (GENUS_COLUMNS[genusLower]) {
        mapped_column = GENUS_COLUMNS[genusLower]
        mapping_type = "genus_sum"
        genusSums[mapped_column] = (genusSums[mapped_column] ?? 0) + pct
      }

      if (genusLower === "streptococcus") strepTotal += pct
    }

    allEntries.push({
      taxonomy_full: taxo.taxonomy_full,
      kingdom: taxo.kingdom,
      phylum: taxo.phylum,
      class_: taxo.class_,
      order: taxo.order,
      family: taxo.family,
      genus: taxo.genus,
      species: taxo.species,
      is_named: taxo.is_named,
      is_placeholder: taxo.is_placeholder,
      pct,
      mapped_column,
      mapping_type,
    })
  }

  // Column values for dedicated DB columns
  const columnValues: Record<string, number> = {}
  for (const [col, val] of Object.entries(genusSums)) columnValues[col] = parseFloat(val.toFixed(4))
  for (const [col, val] of Object.entries(speciesSums)) columnValues[col] = parseFloat(val.toFixed(4))
  if (sSalivariusTotal > 0) columnValues["s_salivarius_pct"] = parseFloat(sSalivariusTotal.toFixed(4))
  columnValues["streptococcus_total_pct"] = parseFloat(strepTotal.toFixed(4))
  columnValues["prevotella_commensal_pct"] = parseFloat(prevotellaCommensalTotal.toFixed(4))

  // Fallback Shannon (natural log, all entries — inaccurate vs Zymo rarefaction)
  const pctVals = allEntries.map(e => e.pct).filter(v => v > 0)
  const pctTotal = pctVals.reduce((a, b) => a + b, 0)
  let shannonDiversity: number | null = null
  if (pctTotal > 0) {
    shannonDiversity = -pctVals.reduce((h, v) => {
      const p = v / pctTotal
      return p > 0 ? h + p * Math.log(p) : h
    }, 0)
    shannonDiversity = parseFloat(shannonDiversity.toFixed(3))
  }

  const communitySummary: CommunitySummary = {
    total_entries_present: allEntries.length,
    named_species_count: namedCount,
    unnamed_placeholder_count: placeholderCount,
    distinct_genera: generaSet.size,
    distinct_phyla: phylaSet.size,
    total_abundance_captured: parseFloat(totalAbundance.toFixed(2)),
  }

  // Build raw_otu_table — flat species→fraction at top level for backward compatibility
  const flatOtu: Record<string, unknown> = {}
  for (const entry of allEntries) {
    const key = entry.species ? `${entry.genus} ${entry.species}` : entry.genus
    flatOtu[key] = ((flatOtu[key] as number) ?? 0) + entry.pct / 100
  }
  flatOtu["__meta"] = {
    community_summary: communitySummary,
    entries: allEntries,
    parsed_at: new Date().toISOString(),
    parser_version: "v3",
  }

  const trackedCount = allEntries.filter(e => e.mapping_type !== "unmatched" && e.mapping_type !== "placeholder").length

  return {
    entries: allEntries.sort((a, b) => b.pct - a.pct),
    communitySummary,
    columnValues,
    shannonDiversity,
    shannonSource: shannonDiversity != null ? "computed_l7" : null,
    speciesCount: allEntries.length,
    totalTracked: trackedCount,
    totalUntracked: allEntries.length - trackedCount,
    rawOtu: flatOtu,
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
      steps.push(`Shannon: ${parsed.shannonDiversity?.toFixed(4)} (${parsed.shannonSource}${shannonResult ? `, depth ${shannonResult.maxDepth}, ${shannonResult.iterations} iterations` : ""})`)

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

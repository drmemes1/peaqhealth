/**
 * Oral Microbiome Scoring v2 — 7 dimensions, 30 points total
 *
 * D1 Shannon diversity        6pts
 * D2 Nitrate reducers         5pts
 * D3 Periodontal pathogens    5pts  (inverse)
 * D4 Protective bacteria      4pts
 * D5 Neurodegeneration signal 5pts  (inverse — P. gingivalis + T. denticola)
 * D6 Metabolic signal         3pts  (inverse — Prevotella total)
 * D7 Proliferative signal     2pts  (inverse — Fusobacterium total)
 */

export interface OralDimensionInputs {
  // Existing (already parsed by oral-parser.ts)
  shannonDiversity: number | null
  nitrateReducerPct: number | null      // fractional 0-1 scale from parser
  pGingivalisPct: number | null         // fractional 0-1
  tDenticolaPct: number | null          // fractional 0-1
  tForsythiaPct: number | null          // fractional 0-1
  fNucleatumPct: number | null          // fractional 0-1
  pIntermediaPct: number | null         // fractional 0-1
  aActinoPct: number | null             // fractional 0-1
  protectivePct: number | null          // fractional 0-1
  periodontalBurden: number | null      // weighted burden score from parser

  // New species — extracted from raw OTU
  prevotellaTotalPct: number | null     // fractional 0-1 (sum all Prevotella species)
  fusobacteriumTotalPct: number | null  // fractional 0-1 (sum all Fusobacterium species)
}

export interface OralScoreBreakdown {
  d1_shannon: number        // 0-6
  d2_nitrate: number        // 0-5
  d3_periodontal: number    // 0-5
  d4_protective: number     // 0-4
  d5_neuro: number          // 0-5
  d6_metabolic: number      // 0-3
  d7_proliferative: number  // 0-2
  total: number             // 0-30
}

/**
 * Note on units: The oral-parser returns raw fractional abundances (0–1 scale)
 * for species percentages BUT the mock/real OTU data uses percentage scale (0-100).
 * The parser's calculateNitrateReducerPct etc. sum raw taxonomy values.
 * For mock data with values like 9.6 (meaning 9.6%), nitrateReducerPct = 9.6.
 *
 * The oral_score_snapshot stored in DB has already-computed values.
 * We accept whatever scale the caller provides and document thresholds accordingly.
 *
 * For D5/D6/D7 we use fractional (0–1) scale since that's what pGingivalisPct etc. use
 * in the oral_score_snapshot.
 */

export function scoreOralV2(inputs: OralDimensionInputs): OralScoreBreakdown {

  // D1 — Shannon diversity (6pts)
  const d1 = inputs.shannonDiversity === null ? 0 :
    inputs.shannonDiversity >= 3.5 ? 6 :
    inputs.shannonDiversity >= 3.0 ? 5 :
    inputs.shannonDiversity >= 2.5 ? 3 :
    inputs.shannonDiversity >= 2.0 ? 1 : 0

  // D2 — Nitrate reducers (5pts)
  // nitrateReducerPct comes from parser — same scale as taxonomy values
  // For fractional OTU: 0.20 = 20%. For percentage OTU: 20.0 = 20%
  // We use protectivePct-style thresholds matching the oral_score_snapshot
  const nitratePct = inputs.nitrateReducerPct ?? 0
  // Detect scale: if > 1.0 it's percentage scale, normalize to percentage for thresholds
  const nitrateNorm = nitratePct > 1.0 ? nitratePct : nitratePct * 100
  const d2 = inputs.nitrateReducerPct === null ? 0 :
    nitrateNorm >= 20 ? 5 :
    nitrateNorm >= 15 ? 4 :
    nitrateNorm >= 10 ? 3 :
    nitrateNorm >= 5  ? 1 : 0

  // D3 — Periodontal pathogens inverse (5pts)
  // periodontalBurden is now simple sum of pathogen fractional abundances (0–1)
  // 0.005 = 0.5%, 0.02 = 2%, 0.05 = 5%, 0.10 = 10%
  const d3 = inputs.periodontalBurden === null ? 3 : // neutral if no data
    inputs.periodontalBurden < 0.005 ? 5 :   // <0.5% — excellent
    inputs.periodontalBurden < 0.02  ? 4 :   // <2%
    inputs.periodontalBurden < 0.05  ? 2 :   // <5%
    inputs.periodontalBurden < 0.10  ? 1 : 0 // ≥10%

  // D4 — Protective bacteria (4pts)
  // protectivePct is fractional (0-1) from parser
  const protNorm = inputs.protectivePct !== null
    ? (inputs.protectivePct > 1.0 ? inputs.protectivePct : inputs.protectivePct * 100)
    : 0
  const d4 = inputs.protectivePct === null ? 0 :
    protNorm >= 10 ? 4 :
    protNorm >= 5  ? 3 :
    protNorm >= 3  ? 2 :
    protNorm >= 1  ? 1 : 0

  // D5 — Neurodegeneration signal (5pts) INVERSE
  // Based on P. gingivalis + T. denticola combined (fractional 0-1)
  const pGing = inputs.pGingivalisPct ?? 0
  const tDent = inputs.tDenticolaPct ?? 0
  const neuroPathogenPct = pGing + tDent
  const d5 = inputs.pGingivalisPct === null && inputs.tDenticolaPct === null ? 3 : // neutral
    neuroPathogenPct < 0.0005 ? 5 :  // < 0.05%
    neuroPathogenPct < 0.001  ? 4 :  // < 0.1%
    neuroPathogenPct < 0.005  ? 2 :  // < 0.5%
    neuroPathogenPct < 0.01   ? 1 :  // < 1.0%
    0

  // D6 — Metabolic signal (3pts) INVERSE
  // Based on Prevotella total abundance (fractional 0-1)
  const prevNorm = inputs.prevotellaTotalPct !== null
    ? (inputs.prevotellaTotalPct > 1.0 ? inputs.prevotellaTotalPct : inputs.prevotellaTotalPct * 100)
    : null
  const d6 = prevNorm === null ? 2 : // neutral if species not detected
    prevNorm < 1.0  ? 3 :
    prevNorm < 3.0  ? 2 :
    prevNorm < 8.0  ? 1 : 0

  // D7 — Proliferative signal (2pts) INVERSE
  // Based on Fusobacterium total abundance (fractional 0-1)
  const fusoNorm = inputs.fusobacteriumTotalPct !== null
    ? (inputs.fusobacteriumTotalPct > 1.0 ? inputs.fusobacteriumTotalPct : inputs.fusobacteriumTotalPct * 100)
    : null
  const d7 = fusoNorm === null ? 1 : // neutral if species not detected
    fusoNorm < 0.5 ? 2 :
    fusoNorm < 2.0 ? 1 : 0

  const total = d1 + d2 + d3 + d4 + d5 + d6 + d7

  return {
    d1_shannon: d1,
    d2_nitrate: d2,
    d3_periodontal: d3,
    d4_protective: d4,
    d5_neuro: d5,
    d6_metabolic: d6,
    d7_proliferative: d7,
    total,
  }
}

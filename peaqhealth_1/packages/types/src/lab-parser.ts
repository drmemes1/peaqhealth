// ─── Canonical lab parser contract ───────────────────────────────────────────
// All parsers (Azure, Junction, Textract, manual) must satisfy LabParser and
// return LabParserResult. The score engine and upload routes depend only on
// these types — never on parser-specific shapes.

export interface ParsedMarker {
  canonicalKey: string        // e.g. "ldl_mgdL"
  canonicalName: string       // e.g. "LDL Cholesterol"
  aliases: string[]           // ["LDL-C", "LDL Cholesterol Calc"]
  value: number
  unit: string
  normalizedUnit: string      // always lowercase e.g. "mg/dl"
  referenceRangeLow?: number
  referenceRangeHigh?: number
  interpretation: "normal" | "abnormal" | "critical" | "unknown"
  sourceLabName?: string
  collectionDate?: string
  confidence: number          // 0–1
  rawText: string             // original text from report — do not log externally
  loincCode?: string          // if available
  isFasting?: boolean
}

export interface LabParserResult {
  markers: ParsedMarker[]
  labName?: string
  collectionDate?: string
  reportDate?: string
  parserUsed: "junction" | "azure" | "textract" | "manual"
  parseConfidence: number     // overall 0–1
  markersFound: number
}

export interface LabParser {
  parse(
    fileBase64: string,
    fileType: string,
    userId: string
  ): Promise<LabParserResult>
}

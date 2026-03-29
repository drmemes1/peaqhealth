"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BloodMarkers {
  // Cardiovascular
  ldl_mgdL?:              number
  hdl_mgdL?:              number
  triglycerides_mgdL?:    number
  totalCholesterol_mgdL?: number
  apoB_mgdL?:             number
  lpa_mgdL?:              number
  nonHDL_mgdL?:           number
  vldl_mgdL?:             number
  ldlHdlRatio?:           number
  // Inflammation
  hsCRP_mgL?:             number
  wbc_kul?:               number
  rdw_pct?:               number
  albumin_gdL?:           number
  // Metabolic
  glucose_mgdL?:          number
  hba1c_pct?:             number
  creatinine_mgdL?:       number
  egfr_mLmin?:            number
  bun_mgdL?:              number
  uricAcid_mgdL?:         number
  fastingInsulin_uIUmL?:  number
  // Liver
  alt_UL?:                number
  ast_UL?:                number
  alkPhos_UL?:            number
  totalBilirubin_mgdL?:   number
  // Hormones
  testosterone_ngdL?:     number
  freeTesto_pgmL?:        number
  tsh_uIUmL?:             number
  dhea_s_ugdL?:           number
  igf1_ngmL?:             number
  shbg_nmolL?:            number
  // Micronutrients
  vitaminD_ngmL?:         number
  ferritin_ngmL?:         number
  hemoglobin_gdL?:        number
  mcv_fL?:                number
  // CBC
  hematocrit_pct?:        number
  platelets_kul?:         number
  rbc_mil?:               number
  mch_pg?:                number
  mchc_gdl?:              number
  neutrophils_pct?:       number
  lymphs_pct?:            number
  // Electrolytes
  sodium_mmolL?:          number
  potassium_mmolL?:       number
  chloride_mmolL?:        number
  co2_mmolL?:             number
  calcium_mgdL?:          number
  totalProtein_gdL?:      number
  globulin_gdL?:          number
  // Meta
  labDate?: string
}

interface LabUploadProps {
  onSkip?: () => void
  onComplete?: () => void
}

// ─── Category groups ─────────────────────────────────────────────────────────

interface MarkerDef {
  slug: string
  name: string
  unit: string
  placeholder: string
}

const CATEGORIES: Array<{ name: string; markers: MarkerDef[] }> = [
  {
    name: "Cardiovascular",
    markers: [
      { slug: "ldl_mgdL",             name: "LDL Cholesterol",   unit: "mg/dL",   placeholder: "110"  },
      { slug: "hdl_mgdL",             name: "HDL Cholesterol",   unit: "mg/dL",   placeholder: "58"   },
      { slug: "triglycerides_mgdL",   name: "Triglycerides",     unit: "mg/dL",   placeholder: "95"   },
      { slug: "totalCholesterol_mgdL",name: "Total Cholesterol", unit: "mg/dL",   placeholder: "180"  },
      { slug: "apoB_mgdL",            name: "ApoB",              unit: "mg/dL",   placeholder: "85"   },
      { slug: "lpa_mgdL",             name: "Lp(a)",             unit: "mg/dL",   placeholder: "18"   },
      { slug: "nonHDL_mgdL",          name: "Non-HDL",           unit: "mg/dL",   placeholder: "130"  },
      { slug: "vldl_mgdL",            name: "VLDL",              unit: "mg/dL",   placeholder: "14"   },
      { slug: "ldlHdlRatio",          name: "LDL:HDL Ratio",     unit: "ratio",   placeholder: "2.1"  },
    ],
  },
  {
    name: "Inflammation",
    markers: [
      { slug: "hsCRP_mgL",  name: "hs-CRP",  unit: "mg/L",  placeholder: "0.8" },
      { slug: "wbc_kul",    name: "WBC",     unit: "K/uL",  placeholder: "5.5" },
      { slug: "rdw_pct",    name: "RDW",     unit: "%",     placeholder: "13"  },
      { slug: "albumin_gdL",name: "Albumin", unit: "g/dL",  placeholder: "4.5" },
    ],
  },
  {
    name: "Metabolic",
    markers: [
      { slug: "glucose_mgdL",        name: "Glucose",         unit: "mg/dL",   placeholder: "88"  },
      { slug: "hba1c_pct",           name: "HbA1c",           unit: "%",       placeholder: "5.2" },
      { slug: "creatinine_mgdL",     name: "Creatinine",      unit: "mg/dL",   placeholder: "0.9" },
      { slug: "egfr_mLmin",          name: "eGFR",            unit: "mL/min",  placeholder: "95"  },
      { slug: "bun_mgdL",            name: "BUN",             unit: "mg/dL",   placeholder: "14"  },
      { slug: "uricAcid_mgdL",       name: "Uric Acid",       unit: "mg/dL",   placeholder: "5.5" },
      { slug: "fastingInsulin_uIUmL",name: "Fasting Insulin", unit: "µIU/mL",  placeholder: "7"   },
    ],
  },
  {
    name: "Liver",
    markers: [
      { slug: "alt_UL",             name: "ALT",       unit: "U/L",   placeholder: "22" },
      { slug: "ast_UL",             name: "AST",       unit: "U/L",   placeholder: "20" },
      { slug: "alkPhos_UL",         name: "Alk Phos",  unit: "U/L",   placeholder: "70" },
      { slug: "totalBilirubin_mgdL",name: "Bilirubin", unit: "mg/dL", placeholder: "0.8"},
    ],
  },
  {
    name: "Hormones",
    markers: [
      { slug: "testosterone_ngdL", name: "Testosterone",      unit: "ng/dL",  placeholder: "550" },
      { slug: "freeTesto_pgmL",    name: "Free Testosterone", unit: "pg/mL",  placeholder: "12"  },
      { slug: "tsh_uIUmL",         name: "TSH",               unit: "µIU/mL", placeholder: "1.8" },
      { slug: "dhea_s_ugdL",       name: "DHEA-S",            unit: "µg/dL",  placeholder: "200" },
      { slug: "igf1_ngmL",         name: "IGF-1",             unit: "ng/mL",  placeholder: "180" },
      { slug: "shbg_nmolL",        name: "SHBG",              unit: "nmol/L", placeholder: "40"  },
    ],
  },
  {
    name: "Micronutrients",
    markers: [
      { slug: "vitaminD_ngmL",   name: "Vitamin D",  unit: "ng/mL", placeholder: "42"  },
      { slug: "ferritin_ngmL",   name: "Ferritin",   unit: "ng/mL", placeholder: "80"  },
      { slug: "hemoglobin_gdL",  name: "Hemoglobin", unit: "g/dL",  placeholder: "14"  },
      { slug: "mcv_fL",          name: "MCV",        unit: "fL",    placeholder: "90"  },
    ],
  },
  {
    name: "CBC",
    markers: [
      { slug: "hematocrit_pct",  name: "Hematocrit",  unit: "%",     placeholder: "42"  },
      { slug: "platelets_kul",   name: "Platelets",   unit: "K/uL",  placeholder: "250" },
      { slug: "rbc_mil",         name: "RBC",         unit: "M/uL",  placeholder: "4.8" },
      { slug: "mch_pg",          name: "MCH",         unit: "pg",    placeholder: "30"  },
      { slug: "mchc_gdl",        name: "MCHC",        unit: "g/dL",  placeholder: "33"  },
      { slug: "neutrophils_pct", name: "Neutrophils", unit: "%",     placeholder: "60"  },
      { slug: "lymphs_pct",      name: "Lymphs",      unit: "%",     placeholder: "30"  },
    ],
  },
  {
    name: "Electrolytes",
    markers: [
      { slug: "sodium_mmolL",     name: "Sodium",        unit: "mmol/L", placeholder: "140" },
      { slug: "potassium_mmolL",  name: "Potassium",     unit: "mmol/L", placeholder: "4.2" },
      { slug: "chloride_mmolL",   name: "Chloride",      unit: "mmol/L", placeholder: "102" },
      { slug: "co2_mmolL",        name: "CO2",           unit: "mmol/L", placeholder: "25"  },
      { slug: "calcium_mgdL",     name: "Calcium",       unit: "mg/dL",  placeholder: "9.5" },
      { slug: "totalProtein_gdL", name: "Total Protein", unit: "g/dL",   placeholder: "7.2" },
      { slug: "globulin_gdL",     name: "Globulin",      unit: "g/dL",   placeholder: "2.5" },
    ],
  },
]

// Slugs for the legacy manual-entry display (kept for manual phase)
const DISPLAY_MARKERS: MarkerDef[] = CATEGORIES.flatMap(c => c.markers)

// High-value markers to show as blank "+" rows when missing
const HIGH_VALUE_SLUGS = new Set([
  "apoB_mgdL", "hsCRP_mgL", "hba1c_pct", "vitaminD_ngmL",
  "lpa_mgdL", "egfr_mLmin", "testosterone_ngdL", "ferritin_ngmL",
])

// Plausible ranges [min, max] — warn if outside, don't block
const PLAUSIBLE_RANGES: Record<string, [number, number]> = {
  ldl_mgdL:              [10,  400],
  hdl_mgdL:              [5,   150],
  triglycerides_mgdL:    [20,  1500],
  totalCholesterol_mgdL: [50,  500],
  apoB_mgdL:             [20,  300],
  lpa_mgdL:              [0,   400],
  nonHDL_mgdL:           [10,  400],
  vldl_mgdL:             [1,   150],
  ldlHdlRatio:           [0.5, 15],
  hsCRP_mgL:             [0,   50],
  wbc_kul:               [1,   50],
  rdw_pct:               [8,   25],
  albumin_gdL:           [1,   6],
  glucose_mgdL:          [40,  600],
  hba1c_pct:             [3,   20],
  creatinine_mgdL:       [0.2, 15],
  egfr_mLmin:            [5,   200],
  bun_mgdL:              [2,   120],
  uricAcid_mgdL:         [1,   20],
  fastingInsulin_uIUmL:  [1,   200],
  alt_UL:                [5,   1000],
  ast_UL:                [5,   1000],
  alkPhos_UL:            [20,  1000],
  totalBilirubin_mgdL:   [0.1, 30],
  testosterone_ngdL:     [5,   2000],
  freeTesto_pgmL:        [0.5, 50],
  tsh_uIUmL:             [0.01,50],
  dhea_s_ugdL:           [5,   800],
  igf1_ngmL:             [30,  800],
  shbg_nmolL:            [5,   300],
  vitaminD_ngmL:         [4,   200],
  ferritin_ngmL:         [1,   3000],
  hemoglobin_gdL:        [5,   22],
  mcv_fL:                [50,  130],
  hematocrit_pct:        [15,  65],
  platelets_kul:         [50,  1500],
  rbc_mil:               [1,   9],
  mch_pg:                [15,  50],
  mchc_gdl:              [25,  40],
  neutrophils_pct:       [5,   95],
  lymphs_pct:            [5,   90],
  sodium_mmolL:          [110, 160],
  potassium_mmolL:       [2,   7],
  chloride_mmolL:        [80,  120],
  co2_mmolL:             [10,  40],
  calcium_mgdL:          [5,   15],
  totalProtein_gdL:      [3,   12],
  globulin_gdL:          [1,   8],
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(",")[1] ?? result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function slugToName(slug: string): string {
  return DISPLAY_MARKERS.find(m => m.slug === slug)?.name ?? slug
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LabUpload({ onSkip, onComplete }: LabUploadProps) {
  type Phase = "idle" | "parsing" | "confirm" | "saving" | "manual"

  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("idle")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [parsedLabName, setParsedLabName] = useState<string | undefined>()
  const [parsedCollectionDate, setParsedCollectionDate] = useState<string | undefined>()
  // editedMarkers: slug → number | null (null = user removed; absent key = not parsed)
  const [editedMarkers, setEditedMarkers] = useState<Record<string, number | null>>({})
  // which slugs were originally parsed (to distinguish found vs. "+" add rows)
  const [parsedSlugs, setParsedSlugs] = useState<Set<string>>(new Set())
  const [manualLabDate, setManualLabDate] = useState(new Date().toISOString().slice(0, 10))
  const [manualValues, setManualValues] = useState<Partial<Record<string, string>>>({})
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationWarning, setValidationWarning] = useState<string | null>(null)
  const [invalidSlugs, setInvalidSlugs] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(newFiles: FileList | File[]) {
    const valid = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/")
    )
    if (valid.length === 0) {
      setError("Please upload PDF, JPG, or PNG files.")
      return
    }
    setError(null)
    setSelectedFiles((prev) => [...prev, ...valid])
  }

  function removeFile(name: string) {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name))
  }

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return
    setError(null)
    setPhase("parsing")

    try {
      const filesPayload = await Promise.all(
        selectedFiles.map(async (f) => ({
          base64: await fileToBase64(f),
          filename: f.name,
          type: f.type,
        }))
      )

      const res = await fetch("/api/labs/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: filesPayload }),
      })

      const data = await res.json() as {
        markers?: Record<string, number>
        labName?: string
        collectionDate?: string
        error?: string
      }

      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      if (!data.markers || Object.keys(data.markers).length === 0) {
        throw new Error("We processed your files but couldn't identify standard lab markers. Try entering your values manually.")
      }

      // Capture ALL markers from API
      const edited: Record<string, number | null> = {}
      const found = new Set<string>()
      for (const [k, v] of Object.entries(data.markers)) {
        if (typeof v === "number" && v > 0) {
          edited[k] = v
          found.add(k)
        }
      }

      setEditedMarkers(edited)
      setParsedSlugs(found)
      setParsedLabName(data.labName)
      setParsedCollectionDate(data.collectionDate ?? new Date().toISOString().slice(0, 10))
      setValidationWarning(null)
      setInvalidSlugs(new Set())
      setPhase("confirm")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setPhase("idle")
    }
  }, [selectedFiles])

  async function saveMarkers(markers: Record<string, unknown>, src = "upload_pdf", labName?: string) {
    setPhase("saving")
    try {
      const res = await fetch("/api/labs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markers, labDate: markers.labDate, source: src, labName }),
      })
      const data = await res.json() as { score?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      if (onComplete) onComplete()
      else router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
      setPhase("confirm")
    }
  }

  const updateMarker = (key: string, val: string) => {
    const num = parseFloat(val)
    setEditedMarkers(prev => ({ ...prev, [key]: isNaN(num) ? null : num }))
    if (invalidSlugs.has(key)) {
      setInvalidSlugs(prev => { const s = new Set(prev); s.delete(key); return s })
    }
  }

  const removeMarker = (key: string) => {
    setEditedMarkers(prev => { const next = { ...prev }; delete next[key]; return next })
    setParsedSlugs(prev => { const s = new Set(prev); s.delete(key); return s })
  }

  function handleConfirmSave() {
    // Validate plausible ranges
    const badSlugs = new Set<string>()
    const badNames: string[] = []
    for (const [slug, val] of Object.entries(editedMarkers)) {
      if (val == null) continue
      const range = PLAUSIBLE_RANGES[slug]
      if (range && (val < range[0] || val > range[1])) {
        badSlugs.add(slug)
        badNames.push(slugToName(slug))
      }
    }

    setInvalidSlugs(badSlugs)
    setValidationWarning(badSlugs.size > 0
      ? `Some values look unusual — please check ${badNames.join(", ")} before saving`
      : null
    )

    // Build final markers object (only non-null, positive values)
    const markers: Record<string, unknown> = { labDate: parsedCollectionDate }
    for (const [slug, val] of Object.entries(editedMarkers)) {
      if (val != null && val > 0) markers[slug] = val
    }

    saveMarkers(markers, "upload_pdf", parsedLabName)
  }

  function handleManualSave() {
    const markers: Record<string, unknown> = { labDate: manualLabDate }
    for (const m of DISPLAY_MARKERS) {
      const v = parseFloat(manualValues[m.slug] ?? "")
      if (!isNaN(v)) markers[m.slug] = v
    }
    saveMarkers(markers, "manual_entry")
  }

  // ── Saving ────────────────────────────────────────────────────────────────

  if (phase === "saving") {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <div className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: "var(--blood-c)" }} />
        <p className="font-body text-sm" style={{ color: "var(--ink-60)" }}>Saving to your profile...</p>
      </div>
    )
  }

  // ── Parsing ───────────────────────────────────────────────────────────────

  if (phase === "parsing") {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <div className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: "var(--blood-c)" }} />
        <p className="font-body text-sm" style={{ color: "var(--ink)" }}>
          Analyzing your lab reports...
        </p>
        <p className="font-body text-xs" style={{ color: "var(--ink-30)" }}>
          Processing {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""}...
        </p>
      </div>
    )
  }

  // ── Confirm ───────────────────────────────────────────────────────────────

  if (phase === "confirm") {
    const nonEmptyCount = Object.values(editedMarkers).filter(v => v != null && v > 0).length

    // Build per-category view: found markers + high-value missing "+" rows
    const categoryViews = CATEGORIES.map(cat => {
      const found = cat.markers.filter(m => parsedSlugs.has(m.slug))
      const missing = cat.markers.filter(
        m => !parsedSlugs.has(m.slug) && HIGH_VALUE_SLUGS.has(m.slug)
      )
      return { ...cat, found, missing }
    }).filter(cat => cat.found.length > 0 || cat.missing.length > 0)

    return (
      <div className="flex flex-col gap-5 w-full">
        {/* Header */}
        <div>
          <p className="font-body text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--ink-30)" }}>
            Found {parsedSlugs.size} marker{parsedSlugs.size !== 1 ? "s" : ""}
            {parsedLabName ? ` · ${parsedLabName}` : ""}
            {parsedCollectionDate ? ` · ${parsedCollectionDate}` : ""}
          </p>
          <p className="font-body text-[13px]" style={{ color: "var(--ink-40)" }}>
            Review and edit your results before saving
          </p>
        </div>

        {/* Category groups */}
        {categoryViews.map(cat => (
          <div key={cat.name}>
            {/* Category header */}
            <div
              className="flex items-center justify-between px-1 pb-1.5 mb-0.5"
              style={{ borderBottom: "0.5px solid var(--ink-08)" }}
            >
              <span
                className="font-body text-[11px] uppercase tracking-widest"
                style={{ color: "var(--ink-40)", fontVariant: "small-caps" }}
              >
                {cat.name}
              </span>
              <span className="font-body text-[10px]" style={{ color: "var(--ink-30)" }}>
                {cat.found.length} found
              </span>
            </div>

            {/* Rows */}
            <div style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4, overflow: "hidden" }}>
              {/* Found markers — editable */}
              {cat.found.map((m, i) => {
                const isInvalid = invalidSlugs.has(m.slug)
                const isLast = i === cat.found.length - 1 && cat.missing.length === 0
                return (
                  <div
                    key={m.slug}
                    className="flex items-center gap-3 px-3 py-2"
                    style={{
                      borderBottom: isLast ? "none" : "0.5px solid var(--ink-06)",
                      background: "var(--white)",
                    }}
                  >
                    <span style={{ color: "var(--blood-c)", fontSize: 10, flexShrink: 0 }}>✓</span>
                    <span className="font-body text-sm flex-1" style={{ color: "var(--ink)" }}>{m.name}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editedMarkers[m.slug] ?? ""}
                      onChange={e => updateMarker(m.slug, e.target.value)}
                      className="font-body text-sm text-right"
                      style={{
                        width: 72,
                        color: "var(--ink)",
                        background: "transparent",
                        border: "none",
                        borderBottom: isInvalid ? "1px solid #dc2626" : "1px solid var(--ink-12)",
                        outline: "none",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      className="font-body text-[10px]"
                      style={{ color: "var(--ink-30)", width: 52, textAlign: "right", flexShrink: 0 }}
                    >
                      {m.unit}
                    </span>
                    <button
                      onClick={() => removeMarker(m.slug)}
                      className="font-body text-[11px] leading-none"
                      style={{ color: "var(--ink-30)", flexShrink: 0, lineHeight: 1 }}
                      title="Remove this marker"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}

              {/* Missing high-value markers — blank "+" add rows */}
              {cat.missing.map((m, i) => {
                const isLast = i === cat.missing.length - 1
                return (
                  <div
                    key={m.slug}
                    className="flex items-center gap-3 px-3 py-2"
                    style={{
                      borderBottom: isLast ? "none" : "0.5px solid var(--ink-06)",
                      background: "var(--ink-04)",
                    }}
                  >
                    <span style={{ color: "var(--ink-30)", fontSize: 11, flexShrink: 0 }}>+</span>
                    <span className="font-body text-sm flex-1" style={{ color: "var(--ink-40)" }}>{m.name}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={m.placeholder}
                      value={editedMarkers[m.slug] ?? ""}
                      onChange={e => {
                        const num = parseFloat(e.target.value)
                        if (!isNaN(num) && num > 0) {
                          setEditedMarkers(prev => ({ ...prev, [m.slug]: num }))
                          setParsedSlugs(prev => new Set([...prev, m.slug]))
                        } else {
                          setEditedMarkers(prev => { const next = { ...prev }; delete next[m.slug]; return next })
                          setParsedSlugs(prev => { const s = new Set(prev); s.delete(m.slug); return s })
                        }
                      }}
                      className="font-body text-sm text-right"
                      style={{
                        width: 72,
                        color: "var(--ink)",
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px solid var(--ink-12)",
                        outline: "none",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      className="font-body text-[10px]"
                      style={{ color: "var(--ink-30)", width: 52, textAlign: "right", flexShrink: 0 }}
                    >
                      {m.unit}
                    </span>
                    <span style={{ width: 14, flexShrink: 0 }} />
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Validation warning */}
        {validationWarning && (
          <p className="font-body text-xs" style={{ color: "#b45309" }}>{validationWarning}</p>
        )}

        {error && <p className="font-body text-xs" style={{ color: "#991B1B" }}>{error}</p>}

        <button
          onClick={handleConfirmSave}
          className="h-12 w-full font-body text-xs uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-85"
          style={{ background: "var(--blood-c)" }}
        >
          Save {nonEmptyCount} marker{nonEmptyCount !== 1 ? "s" : ""} to my profile
        </button>
        <button
          onClick={() => { setPhase("idle"); setError(null); setSelectedFiles([]) }}
          className="font-body text-xs uppercase tracking-widest"
          style={{ color: "var(--ink-30)" }}
        >
          Re-upload
        </button>
      </div>
    )
  }

  // ── Manual entry ──────────────────────────────────────────────────────────

  if (phase === "manual") {
    const today = new Date().toISOString().slice(0, 10)
    return (
      <div className="flex flex-col gap-4">
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4, background: "var(--white)" }}
        >
          <span className="font-body text-sm flex-1" style={{ color: "var(--ink)" }}>Date of blood draw</span>
          <input
            type="date"
            max={today}
            value={manualLabDate}
            onChange={(e) => setManualLabDate(e.target.value)}
            className="font-body text-sm"
            style={{ color: "var(--ink)", background: "transparent", border: "none", outline: "none" }}
          />
        </div>

        <div className="grid items-center gap-2 px-1" style={{ gridTemplateColumns: "1fr 110px 52px" }}>
          {["Marker", "Value", "Unit"].map((h) => (
            <span key={h} className="font-body text-[9px] uppercase tracking-widest" style={{ color: "var(--ink-30)", textAlign: h !== "Marker" ? "right" : undefined }}>{h}</span>
          ))}
        </div>

        {DISPLAY_MARKERS.map((m) => (
          <div key={m.slug} className="grid items-center gap-2 p-3" style={{ gridTemplateColumns: "1fr 110px 52px", border: "0.5px solid var(--ink-12)", borderRadius: 4, background: "var(--white)" }}>
            <span className="font-body text-sm" style={{ color: "var(--ink)" }}>{m.name}</span>
            <input
              type="number" step="0.1" min="0" placeholder={m.placeholder}
              value={manualValues[m.slug] ?? ""}
              onChange={(e) => setManualValues((prev) => ({ ...prev, [m.slug]: e.target.value }))}
              className="font-body text-sm w-full text-right"
              style={{ color: "var(--ink)", background: "transparent", border: "none", outline: "none", borderBottom: "1px solid var(--ink-12)" }}
            />
            <span className="font-body text-xs text-right" style={{ color: "var(--ink-30)" }}>{m.unit}</span>
          </div>
        ))}

        {error && <p className="font-body text-xs" style={{ color: "#991B1B" }}>{error}</p>}

        <button onClick={handleManualSave} className="h-12 w-full font-body text-xs uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-85 mt-2" style={{ background: "var(--blood-c)" }}>
          Save values
        </button>
        <button onClick={() => { setPhase("idle"); setError(null) }} className="font-body text-xs uppercase tracking-widest" style={{ color: "var(--ink-30)" }}>
          ← Back to upload
        </button>
      </div>
    )
  }

  // ── Idle (default) ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
        }}
        className="flex w-full cursor-pointer flex-col items-center gap-4 px-8 py-14 transition-colors"
        style={{
          border: dragOver ? "0.5px dashed var(--gold)" : "0.5px dashed var(--ink-20)",
          background: dragOver ? "rgba(184,134,11,0.04)" : "var(--white)",
          borderRadius: 4,
        }}
      >
        <div className="flex h-12 w-12 items-center justify-center" style={{ border: "0.5px solid var(--ink-12)", borderRadius: 2 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--ink-30)" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </div>
        <div className="text-center">
          <span className="font-display text-sm" style={{ color: "var(--ink)", fontStyle: "italic" }}>
            Drop your lab reports here
          </span>
          <span className="block font-body text-[10px] uppercase tracking-widest mt-2" style={{ color: "var(--ink-30)" }}>
            or click to select · PDF, JPG, or PNG
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) addFiles(e.target.files)
          }}
        />
      </label>

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <div className="w-full flex flex-col gap-2">
          {selectedFiles.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4, background: "var(--white)" }}
            >
              <span className="font-body text-xs" style={{ color: "var(--ink-30)" }}>📄</span>
              <span className="font-body text-sm flex-1" style={{ color: "var(--ink)" }}>{f.name}</span>
              <button
                onClick={() => removeFile(f.name)}
                className="font-body text-xs"
                style={{ color: "var(--ink-30)" }}
              >
                ×
              </button>
            </div>
          ))}

          <button
            onClick={handleUpload}
            className="h-12 w-full font-body text-xs uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-85 mt-1"
            style={{ background: "var(--blood-c)" }}
          >
            {selectedFiles.length === 1
              ? "Analyze my lab results"
              : `Analyze all ${selectedFiles.length} lab reports`}
          </button>
        </div>
      )}

      {error && (
        <p className="font-body text-xs self-start" style={{ color: "#991B1B" }}>{error}</p>
      )}

      {onSkip && (
        <button
          onClick={onSkip}
          className="font-body text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
          style={{ color: "var(--ink-30)" }}
        >
          Skip — add later
        </button>
      )}

      <div className="w-full text-center" style={{ borderTop: "0.5px solid var(--ink-08)", paddingTop: 14 }}>
        <button
          onClick={() => { setError(null); setPhase("manual") }}
          className="font-body text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
          style={{ color: "var(--ink-30)" }}
        >
          Have your results but no PDF? Enter them here.
        </button>
      </div>
    </div>
  )
}

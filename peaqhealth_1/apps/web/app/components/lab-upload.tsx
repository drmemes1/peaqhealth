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
  wbc_thousand_ul?:               number
  rdw_percent?:               number
  albumin_gdL?:           number
  // Metabolic
  glucose_mgdL?:          number
  hba1c_percent?:             number
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
  hematocrit_percent?:        number
  platelets_thousand_ul?:         number
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

// CATEGORIES is now derived from the marker registry — every registry entry
// shows up in the review UI, grouped by its primary category. Adding a marker
// to the registry automatically adds it here. See ADR-0020.
import {
  BLOOD_MARKER_REGISTRY,
  type BloodMarker,
  type MarkerCategory,
} from "../../lib/blood/markerRegistry"

// Display order + label for each category. Anything not listed falls under
// "Other" at the end.
const CATEGORY_DISPLAY: Array<{ key: MarkerCategory; label: string }> = [
  { key: "lipids",             label: "Heart & Lipids" },
  { key: "metabolic",          label: "Metabolic" },
  { key: "kidney",             label: "Kidney" },
  { key: "liver",              label: "Liver" },
  { key: "blood_count",        label: "Complete Blood Count" },
  { key: "immune",             label: "White Blood Cells" },
  { key: "electrolytes",       label: "Electrolytes" },
  { key: "nutrients",          label: "Nutrients" },
  { key: "hormones",           label: "Hormones" },
  { key: "thyroid",            label: "Thyroid" },
  { key: "stress_aging",       label: "Stress & Aging" },
  { key: "inflammation",       label: "Advanced Inflammation" },
  { key: "advanced_lipids",    label: "Advanced Lipids (NMR)" },
  { key: "advanced_nutrients", label: "Omega & Methylation" },
  { key: "advanced_thyroid",   label: "Thyroid Antibodies" },
  { key: "heavy_metals",       label: "Heavy Metals" },
  { key: "male_health",        label: "Prostate / Male Health" },
  { key: "pancreas",           label: "Pancreas" },
]

const PLACEHOLDER_BY_UNIT: Record<string, string> = {
  "mg/dL": "0", "mg/L": "0", "g/dL": "0", "U/L": "0", "%": "0",
  "ng/mL": "0", "pg/mL": "0", "µg/dL": "0", "µg/L": "0",
  "K/µL": "0", "million/µL": "0", "fL": "0", "pg": "0",
  "mmol/L": "0", "µmol/L": "0", "nmol/L": "0", "µmol/L (free T4)": "0",
  "µIU/mL": "0", "mIU/mL": "0", "IU/mL": "0", "ratio": "0",
  "mL/min/1.73m²": "0", "Å": "0",
}

function buildCategoriesFromRegistry(): Array<{ name: string; markers: MarkerDef[] }> {
  // Group by the marker's PRIMARY (first) category so each marker appears once.
  const byCategory = new Map<MarkerCategory | "other", BloodMarker[]>()
  for (const m of BLOOD_MARKER_REGISTRY) {
    const primary = m.categories[0] ?? "other"
    if (!byCategory.has(primary)) byCategory.set(primary, [])
    byCategory.get(primary)!.push(m)
  }
  const groups: Array<{ name: string; markers: MarkerDef[] }> = []
  const seen = new Set<MarkerCategory>()
  for (const { key, label } of CATEGORY_DISPLAY) {
    const list = byCategory.get(key)
    if (!list || list.length === 0) continue
    seen.add(key)
    groups.push({
      name: label,
      markers: list.map(m => ({
        slug: m.id,
        name: m.shortName ?? m.displayName,
        unit: m.unit,
        placeholder: PLACEHOLDER_BY_UNIT[m.unit] ?? "0",
      })),
    })
  }
  // Sweep up any categories not in CATEGORY_DISPLAY (defensive — if a new
  // category is added to the registry without updating this list).
  for (const [key, list] of byCategory) {
    if (key === "other" || seen.has(key as MarkerCategory)) continue
    groups.push({
      name: String(key),
      markers: list.map(m => ({
        slug: m.id,
        name: m.shortName ?? m.displayName,
        unit: m.unit,
        placeholder: PLACEHOLDER_BY_UNIT[m.unit] ?? "0",
      })),
    })
  }
  const otherList = byCategory.get("other") ?? []
  if (otherList.length > 0) {
    groups.push({
      name: "Other",
      markers: otherList.map(m => ({
        slug: m.id,
        name: m.shortName ?? m.displayName,
        unit: m.unit,
        placeholder: PLACEHOLDER_BY_UNIT[m.unit] ?? "0",
      })),
    })
  }
  return groups
}

const CATEGORIES = buildCategoriesFromRegistry()

// Manual-entry shorthand (one big flat list).
const DISPLAY_MARKERS: MarkerDef[] = CATEGORIES.flatMap(c => c.markers)

// High-value markers to show as blank "+" rows when missing — these are
// the markers users most frequently want to manually enter when not on
// the lab. Registry IDs.
const HIGH_VALUE_SLUGS = new Set([
  "apob_mgdl", "hs_crp_mgl", "hba1c_percent", "vitamin_d_ngml",
  "lipoprotein_a_mgdl", "egfr_mlmin", "testosterone_total_ngdl",
  "ferritin_ngml", "vitamin_b12_pgml", "homocysteine_umoll",
])

// Plausible ranges [min, max] — derived from the registry's validRange,
// keyed by registry ID. Used for client-side warnings on edited values.
const PLAUSIBLE_RANGES: Record<string, [number, number]> = Object.fromEntries(
  BLOOD_MARKER_REGISTRY.map(m => [m.id, [m.validRange.min, m.validRange.max] as [number, number]]),
)

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

  // Post-architectural-reset (PR-252):
  //   • /api/labs/upload returns registry-keyed markers (`{ [id]: { value, … } | null }`),
  //     plus sourceLab, collectedAt, parserUsed, parseConfidence, warnings.
  //   • Flow: select files → parse → confirm/review → save → /dashboard/blood.
  //   • The CATEGORIES list driving the confirm UI uses registry IDs as
  //     slugs; editedMarkers is keyed by registry id. /api/labs/save's
  //     normalizeMarker accepts bare numbers, so the confirm UI's saveMarkers
  //     payload (Record<string, number>) flows through unchanged.
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
        markers?: Record<string, { value: number; unitFound?: string; confidence?: number; rawExtractedText?: string; wasComputed?: boolean } | null>
        sourceLab?: string | null
        collectedAt?: string | null
        parserUsed?: string
        parseConfidence?: number
        warnings?: string[]
        error?: string
      }

      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      if (!data.markers) {
        throw new Error("Parser returned no markers payload.")
      }

      // Flatten the structured ParseResult into editedMarkers (registry id →
      // numeric value) so the confirm UI can render and edit. Track which
      // ids were actually extracted (vs missing) for the "found" indicator.
      const edited: Record<string, number | null> = {}
      const found = new Set<string>()
      for (const [id, parsed] of Object.entries(data.markers)) {
        if (parsed && typeof parsed.value === "number" && Number.isFinite(parsed.value) && parsed.value > 0) {
          edited[id] = parsed.value
          found.add(id)
        }
      }

      if (found.size === 0) {
        throw new Error("We processed your file but couldn't identify any markers from this layout. Try downloading a fresh PDF from your lab's portal.")
      }

      setEditedMarkers(edited)
      setParsedSlugs(found)
      setParsedLabName(data.sourceLab ?? undefined)
      setParsedCollectionDate(
        data.collectedAt ? data.collectedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      )
      setValidationWarning(
        data.warnings && data.warnings.length > 0
          ? `${data.warnings.length} parser warning${data.warnings.length === 1 ? "" : "s"} (e.g. "${data.warnings[0]}")`
          : null,
      )
      setInvalidSlugs(new Set())
      setPhase("confirm")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setPhase("idle")
    }
  }, [selectedFiles])

  async function saveMarkers(markers: Record<string, unknown>) {
    // Saves editedMarkers (Record<string, number>) keyed by registry id.
    // /api/labs/save normalizeMarker accepts bare numbers and treats them
    // as manual-entry-style ParseResult markers. After persist, redirect
    // to /dashboard/blood so the user lands on their fresh panel.
    setPhase("saving")
    try {
      const res = await fetch("/api/labs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markers,
          collectedAt: parsedCollectionDate ?? null,
          sourceLab:   parsedLabName ?? null,
          parserUsed:  "openai-vision-v1",
        }),
      })
      const data = await res.json() as { score?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      if (onComplete) onComplete()
      else router.push("/dashboard/blood")
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

    saveMarkers(markers)
  }

  function handleManualSave() {
    const markers: Record<string, unknown> = { labDate: manualLabDate }
    for (const m of DISPLAY_MARKERS) {
      const v = parseFloat(manualValues[m.slug] ?? "")
      if (!isNaN(v)) markers[m.slug] = v
    }
    saveMarkers(markers)
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

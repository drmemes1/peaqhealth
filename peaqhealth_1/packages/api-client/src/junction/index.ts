/**
 * Junction API client
 * Docs: https://docs.junction.com
 *
 * Handles:
 *   - Wearable device connections (Link widget token)
 *   - Sleep data retrieval (GET /v2/summary/sleep/{user_id})
 *   - Lab report parsing (POST /lab_report/v1/parser/job)
 *   - Webhook verification
 */

const JUNCTION_BASE_URL =
  process.env.JUNCTION_ENV === 'production'
    ? 'https://api.tryvital.io'
    : 'https://api.sandbox.tryvital.io'

const JUNCTION_API_KEY = process.env.JUNCTION_API_KEY ?? ''

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Create a Junction user and return their junction_user_id.
 * Called once during Peaq account creation.
 * Docs: POST /v2/user
 */
export async function createJunctionUser(params: {
  clientUserId: string  // your Supabase user ID
  email?: string
}): Promise<{ junctionUserId: string }> {
  const res = await junctionFetch('/v2/user', {
    method: 'POST',
    body: JSON.stringify({
      client_user_id: params.clientUserId,
      email: params.email,
    }),
  })
  return { junctionUserId: res.user_id as string }
}

/**
 * Generate a short-lived Link token for the frontend widget.
 * The widget uses this to let the user OAuth-connect their wearable.
 * Docs: POST /v2/link/token
 */
export async function createLinkToken(junctionUserId: string): Promise<{ linkToken: string }> {
  const res = await junctionFetch('/v2/link/token', {
    method: 'POST',
    body: JSON.stringify({ user_id: junctionUserId }),
  })
  return { linkToken: res.link_token as string }
}

// ─── Sleep data ───────────────────────────────────────────────────────────────

export interface JunctionSleepSummary {
  id: string
  date: string
  duration: number           // total sleep in seconds
  deep_sleep_duration: number
  rem_sleep_duration: number
  light_sleep_duration: number
  awake_duration: number
  sleep_efficiency: number   // 0–1
  hrv_rmssd_evening: number | null
  spo2_avg: number | null
  spo2_min: number | null
  source: string
}

/**
 * Fetch sleep summaries for the past N days.
 * Returns normalised summaries regardless of wearable brand.
 * Docs: GET /v2/summary/sleep/{user_id}
 */
export async function getSleepSummaries(
  junctionUserId: string,
  opts: { days?: number } = {}
): Promise<JunctionSleepSummary[]> {
  const days = opts.days ?? 14
  const endDate   = new Date().toISOString().slice(0, 10)
  const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

  const res = await junctionFetch(
    `/v2/summary/sleep/${junctionUserId}?start_date=${startDate}&end_date=${endDate}`
  )
  return (res.sleep ?? []) as JunctionSleepSummary[]
}

/**
 * Compute the SleepInputs the Peaq score engine needs
 * from a rolling window of Junction sleep summaries.
 * Requires at least 7 nights; uses up to 10.
 *
 * @param opts.highOsaRisk - Pass true when a sleep_apnea_alert event has been received
 *                           for this user (stored in wearable_connections.high_osa_risk).
 */
export function aggregateSleepInputs(
  summaries: JunctionSleepSummary[],
  opts?: { highOsaRisk?: boolean }
): import('@peaq/types').SleepInputs | null {
  const valid = summaries
    .filter((s) => s.duration > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)

  if (valid.length < 7) return null

  const avg = (key: keyof JunctionSleepSummary): number => {
    const vals: number[] = []
    for (const s of valid) {
      const v = s[key]
      if (typeof v === 'number' && v > 0) vals.push(v)
    }
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }

  const avgDuration   = avg('duration')           // seconds
  const avgDeepSecs   = avg('deep_sleep_duration')
  const avgRemSecs    = avg('rem_sleep_duration')
  const avgEfficiency = avg('sleep_efficiency')
  const avgHrv        = avg('hrv_rmssd_evening')

  // SpO2 dips: estimate from spo2_min — dips/night inferred
  const spo2Dips = valid.filter(
    (s) => s.spo2_min !== null && s.spo2_min < 90
  ).length / valid.length * 5

  // Average SpO2: use spo2_avg across valid nights that have it (v4.1)
  const spo2AvgVals = valid
    .map((s) => s.spo2_avg)
    .filter((v): v is number => typeof v === 'number' && v > 0)
  const avgSpo2 = spo2AvgVals.length > 0
    ? Math.round((spo2AvgVals.reduce((a, b) => a + b, 0) / spo2AvgVals.length) * 10) / 10
    : undefined

  return {
    deepSleepPct:       avgDuration > 0 ? (avgDeepSecs / avgDuration) * 100 : 0,
    hrv_ms:             avgHrv,
    spo2DipsPerNight:   Math.round(spo2Dips * 10) / 10,
    remPct:             avgDuration > 0 ? (avgRemSecs / avgDuration) * 100 : 0,
    sleepEfficiencyPct: avgEfficiency * 100,
    avgSpo2,
    highOsaRisk:        opts?.highOsaRisk,
  }
}

/**
 * Request a historical data pull for a Junction user.
 * Junction will backfill sleep summaries for the specified date range
 * and emit a historical.data webhook event when complete.
 * Docs: POST /v2/user/{user_id}/historical-pulls
 */
export async function requestHistoricalPull(
  junctionUserId: string,
  opts: { days?: number } = {}
): Promise<{ pullId: string }> {
  const days      = opts.days ?? 90
  const endDate   = new Date().toISOString().slice(0, 10)
  const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

  const res = await junctionFetch(`/v2/user/${junctionUserId}/historical-pulls`, {
    method: 'POST',
    body: JSON.stringify({ start_date: startDate, end_date: endDate }),
  })
  // Junction may return pull_id or id depending on API version
  const pullId = (res.pull_id ?? res.id ?? '') as string
  return { pullId }
}

// ─── Lab report parser ────────────────────────────────────────────────────────

export type LabParserStatus = 'upload_pending' | 'started' | 'completed' | 'failed'

export interface LabParserJob {
  jobId: string
  status: LabParserStatus
}

export interface LabParserResultEntry {
  test_name: string
  value: string
  units: string
  interpretation: string
  is_above_max_range: boolean
  is_below_min_range: boolean
  loinc_matches?: Array<{
    loinc_code: string
    loinc_name: string
    display_name: string
    confidence_score: number
  }>
}

export interface LabParserResult {
  jobId: string
  status: LabParserStatus
  data?: {
    metadata?: {
      lab_name: string
      date_collected: string
      date_reported: string
      patient_first_name: string
    }
    results?: LabParserResultEntry[]
  }
}

/**
 * Submit a lab PDF for parsing via multipart/form-data.
 * Returns immediately with a job_id; poll getLabParserJob for results.
 * Docs: POST /lab_report/v1/parser/job
 *
 * @param pdfBase64 - Base64-encoded PDF file
 * @param junctionUserId - Junction user UUID (from profiles.junction_user_id)
 */
export async function createLabParserJob(pdfBase64: string, junctionUserId: string): Promise<LabParserJob> {
  const url = `${JUNCTION_BASE_URL}/lab_report/v1/parser/job`
  console.log('[lab-parser] submitting job to:', url, 'user_id:', junctionUserId)

  const buffer = Buffer.from(pdfBase64, 'base64')
  const blob = new Blob([buffer], { type: 'application/pdf' })
  const formData = new FormData()
  formData.append('file', blob, 'lab_report.pdf')
  formData.append('user_id', junctionUserId)
  formData.append('needs_human_review', 'false')

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-vital-api-key': JUNCTION_API_KEY },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[lab-parser] POST ${url} → ${res.status}:`, body)
    throw new Error(`Junction lab parser error ${res.status}: ${body}`)
  }

  const data = await res.json() as Record<string, unknown>
  const jobId = (data.job_id ?? '') as string
  console.log('[lab-parser] job created:', jobId, 'status:', data.status)
  return { jobId, status: (data.status as LabParserStatus) ?? 'upload_pending' }
}

/**
 * Poll for lab parser job completion.
 * Docs: GET /lab_report/v1/parser/job/{job_id}
 */
export async function getLabParserJob(jobId: string): Promise<LabParserResult> {
  const url = `${JUNCTION_BASE_URL}/lab_report/v1/parser/job/${jobId}`
  console.log('[lab-parser] polling job:', url)
  const res = await junctionFetch(`/lab_report/v1/parser/job/${jobId}`)
  const status = (res.status as LabParserStatus) ?? 'upload_pending'
  console.log('[lab-parser] poll result — status:', status)
  return {
    jobId,
    status,
    data: res.data as LabParserResult['data'],
  }
}

/**
 * Map Junction parser results → BloodInputs for score engine.
 * Uses case-insensitive test_name matching against known lab names
 * (Quest, LabCorp, etc.).
 */
export function mapParserResultToBloodInputs(
  result: LabParserResult
): Partial<import('@peaq/types').BloodInputs> & { labName?: string } {
  if (result.status !== 'completed' || !result.data?.results) return {}

  const results = result.data.results

  // Case-insensitive search by test_name — returns first numeric match
  const get = (...patterns: string[]): number | undefined => {
    for (const pattern of patterns) {
      const lower = pattern.toLowerCase()
      const match = results.find((r) => r.test_name.toLowerCase().includes(lower))
      if (match) {
        const num = parseFloat(match.value)
        if (!isNaN(num)) return num
      }
    }
    return undefined
  }

  return {
    hsCRP_mgL:           get('hs-crp', 'hscrp', 'c-reactive protein', 'crp'),
    vitaminD_ngmL:       get('25-oh vitamin d', '25-hydroxyvitamin', 'vitamin d', 'vit d'),
    apoB_mgdL:           get('apolipoprotein b', 'apob'),
    ldl_mgdL:            get('ldl cholesterol', 'ldl-c', 'ldl chol'),
    hdl_mgdL:            get('hdl cholesterol', 'hdl-c', 'hdl chol'),
    triglycerides_mgdL:  get('triglyceride'),
    lpa_mgdL:            get('lipoprotein(a)', 'lipoprotein (a)', 'lp(a)'),
    glucose_mgdL:        get('glucose'),
    hba1c_pct:           get('hemoglobin a1c', 'hba1c', 'a1c'),
    esr_mmhr:            get('erythrocyte sedimentation', 'sed rate', 'esr'),
    homocysteine_umolL:  get('homocysteine'),
    ferritin_ngmL:       get('ferritin'),
    labCollectionDate:   result.data.metadata?.date_collected,
    labName:             result.data.metadata?.lab_name,
  }
}

// ─── Sandbox test data ────────────────────────────────────────────────────────

/**
 * Seed synthetic sleep data for a sandbox Junction user.
 * Only call this in non-production environments.
 * Junction fires webhook events for each backfilled day.
 * Docs: POST /v2/user/{user_id}/test_data
 */
export async function seedSandboxSleepData(
  junctionUserId: string,
  opts: { daysToBackfill?: number } = {}
): Promise<void> {
  await junctionFetch(`/v2/user/${junctionUserId}/test_data`, {
    method: 'POST',
    body: JSON.stringify({
      resource: 'sleep',
      days_to_backfill: opts.daysToBackfill ?? 30,
    }),
  })
}

// ─── Internal fetch helper ────────────────────────────────────────────────────

async function junctionFetch(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const url = `${JUNCTION_BASE_URL}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-vital-api-key': JUNCTION_API_KEY,
      ...init.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[junction] ${init.method ?? 'GET'} ${url} → ${res.status}:`, body)
    throw new Error(`Junction API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<Record<string, unknown>>
}

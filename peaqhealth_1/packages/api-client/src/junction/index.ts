/**
 * Junction API client
 * Docs: https://docs.junction.com
 *
 * Handles:
 *   - Wearable device connections (Link widget token)
 *   - Sleep data retrieval (GET /v2/summary/sleep/{user_id})
 *   - Lab report parsing (POST /v3/lab-report-parser)
 *   - Webhook verification
 */

const JUNCTION_BASE_URL =
  process.env.JUNCTION_ENV === 'production'
    ? 'https://api.us.junction.com'
    : 'https://api.sandbox.us.junction.com'

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
 */
export function aggregateSleepInputs(
  summaries: JunctionSleepSummary[]
): import('@peaq/types').SleepInputs | null {
  const valid = summaries
    .filter((s) => s.duration > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)

  if (valid.length < 7) return null

  const avg = <K extends keyof JunctionSleepSummary>(key: K): number => {
    const vals = valid
      .map((s) => s[key])
      .filter((v): v is number => typeof v === 'number' && v > 0)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }

  const avgDuration       = avg('duration')           // seconds
  const avgDeepSecs       = avg('deep_sleep_duration')
  const avgRemSecs        = avg('rem_sleep_duration')
  const avgAwakeSecs      = avg('awake_duration')
  const avgEfficiency     = avg('sleep_efficiency')
  const avgHrv            = avg('hrv_rmssd_evening')

  // SpO2 dips: estimate from spo2_min — dips/night inferred
  // A min below 90 is flagged as ≥1 dip; rough approximation until raw data available
  const spo2Dips = valid.filter(
    (s) => s.spo2_min !== null && s.spo2_min < 90
  ).length / valid.length * 5  // rough scaling

  return {
    deepSleepPct:       avgDuration > 0 ? (avgDeepSecs / avgDuration) * 100 : 0,
    hrv_ms:             avgHrv,
    spo2DipsPerNight:   Math.round(spo2Dips * 10) / 10,
    remPct:             avgDuration > 0 ? (avgRemSecs / avgDuration) * 100 : 0,
    sleepEfficiencyPct: avgEfficiency * 100,
  }
}

// ─── Lab report parser ────────────────────────────────────────────────────────

export interface LabParserJob {
  jobId: string
  status: 'pending' | 'processing' | 'complete' | 'failed'
}

export interface LabParserResult {
  jobId: string
  status: 'complete' | 'failed'
  metadata?: {
    laboratory: string
    date_collected: string
    patient: string
  }
  results?: Array<{
    name: string
    slug: string
    value: number
    unit: string
    interpretation: 'normal' | 'abnormal' | 'critical'
    is_above_max_range: boolean
    is_below_min_range: boolean
    min_range_value?: number
    max_range_value?: number
    loinc?: string
  }>
}

/**
 * Submit a lab PDF for parsing.
 * Returns immediately with a job_id; poll getLabParserJob for results.
 * Docs: POST /v3/lab-report-parser
 */
export async function createLabParserJob(pdfBase64: string): Promise<LabParserJob> {
  const res = await junctionFetch('/v3/lab-report-parser', {
    method: 'POST',
    body: JSON.stringify({ file: pdfBase64, file_type: 'application/pdf' }),
  })
  return { jobId: res.job_id as string, status: 'pending' }
}

/**
 * Poll for lab parser job completion.
 * Docs: GET /v3/lab-report-parser/{job_id}
 */
export async function getLabParserJob(jobId: string): Promise<LabParserResult> {
  const res = await junctionFetch(`/v3/lab-report-parser/${jobId}`)
  return res as LabParserResult
}

/**
 * Map Junction parser result slugs → BloodInputs for score engine.
 * Junction uses LOINC-based slugs — map the most common ones.
 */
export function mapParserResultToBloodInputs(
  result: LabParserResult
): Partial<import('@peaq/types').BloodInputs> {
  if (result.status !== 'complete' || !result.results) return {}

  const get = (slug: string): number | undefined =>
    result.results?.find((r) => r.slug === slug || r.name.toLowerCase().includes(slug))?.value

  return {
    hsCRP_mgL:           get('hs-crp') ?? get('crp') ?? get('c-reactive'),
    vitaminD_ngmL:       get('25-hydroxyvitamin') ?? get('vitamin-d'),
    apoB_mgdL:           get('apolipoprotein-b') ?? get('apob'),
    ldl_mgdL:            get('ldl-cholesterol') ?? get('ldl'),
    hdl_mgdL:            get('hdl-cholesterol') ?? get('hdl'),
    triglycerides_mgdL:  get('triglyceride'),
    lpa_mgdL:            get('lipoprotein-a') ?? get('lp(a)'),
    glucose_mgdL:        get('glucose'),
    hba1c_pct:           get('hemoglobin-a1c') ?? get('hba1c'),
    esr_mmhr:            get('erythrocyte-sedimentation'),
    homocysteine_umolL:  get('homocysteine'),
    ferritin_ngmL:       get('ferritin'),
    labCollectionDate:   result.metadata?.date_collected,
  }
}

// ─── Internal fetch helper ────────────────────────────────────────────────────

async function junctionFetch(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`${JUNCTION_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-vital-api-key': JUNCTION_API_KEY,
      ...init.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Junction API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<Record<string, unknown>>
}

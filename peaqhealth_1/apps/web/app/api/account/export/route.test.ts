jest.mock('./report-pdf', () => ({
  buildReportDocument: jest.fn().mockResolvedValue(Buffer.from('%PDF-mock')),
}))

jest.mock('./report-data', () => ({
  fetchReportData: jest.fn().mockResolvedValue({
    fullName: 'Test Patient', email: 'test@example.com',
    score: 62, baseScore: 66, sleepSub: 18, bloodSub: 32, oralSub: 16,
    modifierTotal: 0, modifiersApplied: [], engineVersion: '8.1', calculatedAt: '',
    labs: null, labName: null, collectionDate: null,
    sleepAverages: { trackedNights: 0, provider: '', avgHrv: 0, avgEfficiency: 0, avgDeepPct: 0, avgRemPct: 0, avgSpo2: 0, avgTotalHours: 0, lastSyncDate: null },
    shannonDiversity: null, nitrateReducerPct: null, periodontopathogenPct: null, osaTaxaPct: null,
    neuroSignalPct: null, metabolicSignalPct: null, proliferativeSignalPct: null,
    rawOtu: null, reportDate: null, oralScoreSnapshot: null,
    ageRange: null, exerciseLevel: null, smokingStatus: null, brushingFreq: null,
    flossingFreq: null, mouthwashType: null, lastDentalVisit: null,
    knownHypertension: null, knownDiabetes: null,
  }),
  computeSleepAverages: jest.fn(),
}))

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(Buffer.from('fake-logo')),
}))

jest.mock('../../../../lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { POST, GET } from './route'
import { createClient } from '../../../../lib/supabase/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function makeAuthClient() {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
  }
}

describe('POST /api/account/export', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(makeAuthClient() as never)
  })

  it('returns PDF with correct headers for download', async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment.*\.pdf/)
  })

  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    const res = await POST()
    expect(res.status).toBe(401)
  })
})

describe('GET /api/account/export', () => {
  it('returns 405', async () => {
    const res = await GET()
    expect(res.status).toBe(405)
  })
})

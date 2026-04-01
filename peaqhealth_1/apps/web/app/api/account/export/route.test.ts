// Must mock ESM packages before any imports
import { Readable } from 'stream'
function mockPdfStream() { return Readable.from(Buffer.from('%PDF-mock')) }
jest.mock('@react-pdf/renderer', () => ({
  pdf: jest.fn().mockReturnValue({ toBuffer: jest.fn().mockImplementation(() => Promise.resolve(mockPdfStream())) }),
  Document: ({ children }: { children: unknown }) => children,
  Page: ({ children }: { children: unknown }) => children,
  Text: ({ children }: { children: unknown }) => children,
  View: ({ children }: { children: unknown }) => children,
  Image: () => null,
  StyleSheet: { create: (x: unknown) => x },
  Font: { register: jest.fn() },
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

jest.mock('./report-pdf', () => ({
  buildReportDocument: jest.fn().mockReturnValue(null),
}))

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(Buffer.from('fake-logo')),
}))

const mockEmailSend = jest.fn().mockResolvedValue({ data: { id: 'email-id' }, error: null })
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockEmailSend } })),
}))

jest.mock('../../../../lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { POST, GET } from './route'
import { createClient } from '../../../../lib/supabase/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function makeAuthClient() {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
  }
}

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/account/export', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/account/export', () => {
  beforeEach(() => {
    mockEmailSend.mockClear()
    mockCreateClient.mockResolvedValue(makeAuthClient() as never)
  })

  it('returns PDF with correct headers for download', async () => {
    const res = await POST(makeRequest({ sendEmail: false }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment.*\.pdf/)
  })

  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    const res = await POST(makeRequest({ sendEmail: false }))
    expect(res.status).toBe(401)
  })

  it('calls Resend.emails.send with PDF attachment when sendEmail=true', async () => {
    const res = await POST(makeRequest({ sendEmail: true, recipientEmail: 'doc@clinic.com', recipientName: 'Dr. Jones' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { sent: boolean; to: string }
    expect(body.sent).toBe(true)
    expect(body.to).toBe('doc@clinic.com')
    expect(mockEmailSend).toHaveBeenCalledWith(expect.objectContaining({
      to: 'doc@clinic.com',
      attachments: expect.arrayContaining([
        expect.objectContaining({ filename: expect.stringMatching(/\.pdf$/) }),
      ]),
    }))
  })

  it('returns 500 when Resend returns an error', async () => {
    mockEmailSend.mockResolvedValueOnce({ data: null, error: { message: 'Invalid API key' } })
    const res = await POST(makeRequest({ sendEmail: true, recipientEmail: 'doc@clinic.com' }))
    expect(res.status).toBe(500)
  })
})

describe('GET /api/account/export', () => {
  it('returns 405', async () => {
    const res = await GET()
    expect(res.status).toBe(405)
  })
})

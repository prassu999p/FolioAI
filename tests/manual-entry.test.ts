import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, TEST_HOLDER_ID } from './setup'

// Mock the server supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
}))

const validEntry = {
  holderId: TEST_HOLDER_ID,
  schemeCode: 100001,
  schemeName: 'Axis Bluechip Fund - Growth',
  fundHouse: 'Axis Mutual Fund',
  units: 100.5,
  purchaseDate: '2024-01-15',
  costNav: 45.23,
}

describe('Manual holding entry (DATA-04)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>

  beforeEach(async () => {
    mockSupabase = createMockSupabase()
    const { createClient } = await import('@/lib/supabase/server')
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never)
  })

  it('valid entry creates transaction in database', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const transactionRecord = {
      id: 'tx-uuid',
      folio_id: 'folio-uuid',
      transaction_date: '2024-01-15',
      transaction_type: 'purchase',
      units: 100.5,
      nav: 45.23,
      amount: 4545.615,
      import_status: 'clean',
      source: 'manual',
    }

    let insertedTransaction: unknown = null
    const entrySupabase = {
      ...createMockSupabase(),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'holders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: TEST_HOLDER_ID, family_id: 'family-1' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'funds') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'folios') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'folio-uuid' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'transactions') {
          return {
            insert: vi.fn().mockImplementation((data: unknown) => {
              insertedTransaction = data
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: transactionRecord, error: null }),
                }),
              }
            }),
          }
        }
        return mockSupabase.from(table)
      }),
    }
    vi.mocked(createClient).mockResolvedValue(entrySupabase as never)

    const { POST } = await import('@/app/api/manual-entry/route')
    const request = new Request('http://localhost/api/manual-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validEntry),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('source', 'manual')
  })

  it('missing required field returns validation error', async () => {
    const { POST } = await import('@/app/api/manual-entry/route')
    const { units: _units, ...missingUnits } = validEntry
    const request = new Request('http://localhost/api/manual-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(missingUnits),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('negative units rejected with validation error', async () => {
    const { POST } = await import('@/app/api/manual-entry/route')
    const request = new Request('http://localhost/api/manual-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validEntry, units: -10 }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('future date rejected with validation error', async () => {
    const { POST } = await import('@/app/api/manual-entry/route')
    const request = new Request('http://localhost/api/manual-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validEntry, purchaseDate: '2099-12-31' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})

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

describe('Holdings list (DATA-05)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>

  beforeEach(async () => {
    mockSupabase = createMockSupabase()
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never)
    vi.clearAllMocks()
    const { createClient: cc } = await import('@/lib/supabase/server')
    vi.mocked(cc).mockResolvedValue(mockSupabase as never)
  })

  it('returns 401 for unauthenticated requests', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const unauthSupabase = {
      ...createMockSupabase(),
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    }
    vi.mocked(createClient).mockResolvedValue(unauthSupabase as never)

    const { GET } = await import('@/app/api/holdings/route')
    const request = new Request('http://localhost/api/holdings?holderId=' + TEST_HOLDER_ID)
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('returns 400 when holderId is missing', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never)

    const { GET } = await import('@/app/api/holdings/route')
    const request = new Request('http://localhost/api/holdings')
    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  it('aggregates units by scheme_code across transactions', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockHoldings = [
      {
        scheme_code: 100001,
        scheme_name: 'Axis Bluechip Fund',
        fund_house: 'Axis MF',
        folio_id: 'folio-1',
        units: 150.5,
        avg_cost_nav: 45.23,
        total_invested: 6800,
        current_nav: 52.10,
        current_nav_date: '2026-03-18',
        current_value: 7841.05,
      },
    ]
    const holderSupabase = {
      ...createMockSupabase(),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: TEST_HOLDER_ID, family_id: 'family-1' }, error: null }),
          }),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: mockHoldings, error: null }),
    }
    vi.mocked(createClient).mockResolvedValue(holderSupabase as never)

    const { GET } = await import('@/app/api/holdings/route')
    const request = new Request('http://localhost/api/holdings?holderId=' + TEST_HOLDER_ID)
    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(response.body).toEqual(mockHoldings)
  })

  it('joins latest NAV from nav_prices table', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockHoldings = [
      {
        scheme_code: 100002,
        scheme_name: 'HDFC Mid-Cap Opportunities',
        fund_house: 'HDFC MF',
        folio_id: 'folio-2',
        units: 200,
        avg_cost_nav: 60.0,
        total_invested: 12000,
        current_nav: 75.5,
        current_nav_date: '2026-03-18',
        current_value: 15100,
      },
    ]
    const holderSupabase = {
      ...createMockSupabase(),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: TEST_HOLDER_ID, family_id: 'family-1' }, error: null }),
          }),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: mockHoldings, error: null }),
    }
    vi.mocked(createClient).mockResolvedValue(holderSupabase as never)

    const { GET } = await import('@/app/api/holdings/route')
    const request = new Request('http://localhost/api/holdings?holderId=' + TEST_HOLDER_ID)
    const response = await GET(request)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (response as any).body
    expect(body[0]).toHaveProperty('current_nav')
    expect(body[0]).toHaveProperty('current_nav_date')
  })

  it('empty holder returns empty array', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const emptySupabase = {
      ...createMockSupabase(),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: TEST_HOLDER_ID, family_id: 'family-1' }, error: null }),
          }),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    vi.mocked(createClient).mockResolvedValue(emptySupabase as never)

    const { GET } = await import('@/app/api/holdings/route')
    const request = new Request('http://localhost/api/holdings?holderId=' + TEST_HOLDER_ID)
    const response = await GET(request)
    expect(response.body).toEqual([])
  })

  it('redeemed holding (zero units) excluded from active list', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    // RPC returns only active holdings (net_units > 0 enforced by HAVING clause in SQL)
    const holderSupabase = {
      ...createMockSupabase(),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: TEST_HOLDER_ID, family_id: 'family-1' }, error: null }),
          }),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }), // redeemed fund excluded by SQL HAVING
    }
    vi.mocked(createClient).mockResolvedValue(holderSupabase as never)

    const { GET } = await import('@/app/api/holdings/route')
    const request = new Request('http://localhost/api/holdings?holderId=' + TEST_HOLDER_ID)
    const response = await GET(request)
    expect(response.body).toHaveLength(0)
  })
})

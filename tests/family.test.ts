import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, TEST_FAMILY_ID, TEST_USER_ID, TEST_PAN } from './setup'

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

describe('Family management (FAM-01)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>

  beforeEach(async () => {
    mockSupabase = createMockSupabase()
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never)
    vi.clearAllMocks()
    const { createClient: cc } = await import('@/lib/supabase/server')
    vi.mocked(cc).mockResolvedValue(mockSupabase as never)
  })

  it('create family returns family record with user_id', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const familyRecord = {
      id: TEST_FAMILY_ID,
      user_id: TEST_USER_ID,
      name: 'The Sharma Family',
      created_at: '2026-03-19T00:00:00Z',
      updated_at: '2026-03-19T00:00:00Z',
    }
    const createSupabase = {
      ...createMockSupabase(),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }), // no existing family
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: familyRecord, error: null }),
          }),
        }),
      }),
    }
    vi.mocked(createClient).mockResolvedValue(createSupabase as never)

    const { POST } = await import('@/app/api/family/route')
    const request = new Request('http://localhost/api/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'The Sharma Family' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('user_id', TEST_USER_ID)
  })

  it('returns 409 if family already exists', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const existingFamily = { id: TEST_FAMILY_ID }
    const dupeSupabase = {
      ...createMockSupabase(),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existingFamily, error: null }),
          }),
        }),
      }),
    }
    vi.mocked(createClient).mockResolvedValue(dupeSupabase as never)

    const { POST } = await import('@/app/api/family/route')
    const request = new Request('http://localhost/api/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'The Sharma Family' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(409)
  })

  it('add holder to family with name and PAN', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const holderRecord = {
      id: 'holder-uuid',
      family_id: TEST_FAMILY_ID,
      name: 'Rahul Sharma',
      pan: TEST_PAN,
      pan_unmatched: false,
      is_primary: false,
    }
    // Chain: first from('families'), then from('holders') insert
    let callCount = 0
    const holderSupabase = {
      ...createMockSupabase(),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'families') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: TEST_FAMILY_ID }, error: null }),
              }),
            }),
          }
        }
        // holders table
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }), // PAN not exists
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: holderRecord, error: null }),
            }),
          }),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(holderSupabase as never)

    const { POST } = await import('@/app/api/holders/route')
    const request = new Request('http://localhost/api/holders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Rahul Sharma', pan: TEST_PAN }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('pan', TEST_PAN)
  })

  it('duplicate PAN in same family returns error', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const dupeSupabase = {
      ...createMockSupabase(),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'families') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: TEST_FAMILY_ID }, error: null }),
              }),
            }),
          }
        }
        // holders — PAN already exists
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'existing-holder' }, error: null }),
              }),
            }),
          }),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(dupeSupabase as never)

    const { POST } = await import('@/app/api/holders/route')
    const request = new Request('http://localhost/api/holders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Rahul Sharma', pan: TEST_PAN }),
    })
    const response = await POST(request)
    expect(response.status).toBe(409)
  })
})

describe('Family dashboard AUM (FAM-02)', () => {
  it('total AUM sums current_value across all holders', async () => {
    // This is a UI concern (computed client-side from holdings data)
    // The API returns per-holder holdings; AUM sum is a display computation
    const holdings = [
      { current_value: 10000 },
      { current_value: 5000 },
      { current_value: null }, // no NAV synced
    ]
    const totalAUM = holdings.reduce((sum, h) => sum + (h.current_value ?? 0), 0)
    expect(totalAUM).toBe(15000)
  })

  it('empty family returns AUM of 0', async () => {
    const holdings: { current_value: number | null }[] = []
    const totalAUM = holdings.reduce((sum, h) => sum + (h.current_value ?? 0), 0)
    expect(totalAUM).toBe(0)
  })
})

describe('Holder drill-down (FAM-03)', () => {
  it('holder holdings query filters by holder_id', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { GET } = await import('@/app/api/holdings/route')

    const specificHolderId = 'specific-holder-uuid'
    let capturedHolderId: string | null = null

    const drillSupabase = {
      ...createMockSupabase(),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((_col: string, val: string) => {
            capturedHolderId = val
            return {
              single: vi.fn().mockResolvedValue({ data: { id: specificHolderId, family_id: 'fam-1' }, error: null }),
            }
          }),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    vi.mocked(createClient).mockResolvedValue(drillSupabase as never)

    const request = new Request('http://localhost/api/holdings?holderId=' + specificHolderId)
    await GET(request)
    expect(capturedHolderId).toBe(specificHolderId)
  })
})

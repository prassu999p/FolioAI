import { describe, it, expect, vi, beforeEach } from 'vitest'

// Note: scoreFundsForHolder calls Anthropic SDK and Supabase — we mock both.
// We test the orchestration logic, signal computation, and upsert behavior.

// Mock the Anthropic SDK before importing the service
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Fund narrative from Claude.' }],
      }),
    },
  })),
}))

// Mock lib/ai/scoring to avoid real XIRR computation in unit tests
vi.mock('@/lib/ai/scoring', () => ({
  computeAlpha: vi.fn().mockReturnValue(0.05),
  computeAUMTrend: vi.fn().mockReturnValue('growing'),
  computeQualityScore: vi.fn().mockReturnValue(75),
}))

vi.mock('@/lib/ai/prompts', () => ({
  buildScorecardPrompt: vi.fn().mockReturnValue('prompt text'),
}))

// Import after mocking
import { scoreFundsForHolder } from '@/lib/ai/score-funds-service'

describe('scoreFundsForHolder', () => {
  let mockSupabase: ReturnType<typeof buildMockSupabase>

  function buildMockSupabase(holdings: unknown[] = [], transactions: unknown[] = [], nifty: unknown[] = [], funds: unknown[] = []) {
    const upsertMock = vi.fn().mockResolvedValue({ error: null })

    // Build a chainable mock per table
    const makeChain = (data: unknown[]) => {
      const chain = {
        data,
        error: null,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        // resolves to { data, error }
        then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data, error: null }),
      }
      return chain
    }

    const rpcMock = vi.fn().mockImplementation((fn: string, _args: unknown) => {
      if (fn === 'get_holder_holdings') return Promise.resolve({ data: holdings, error: null })
      if (fn === 'get_holder_analytics_transactions') return Promise.resolve({ data: transactions, error: null })
      return Promise.resolve({ data: [], error: null })
    })

    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === 'nifty50_daily') return makeChain(nifty)
      if (table === 'funds') return makeChain(funds)
      if (table === 'fund_ai_scores') {
        return {
          upsert: upsertMock,
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
        }
      }
      return makeChain([])
    })

    return { rpc: rpcMock, from: fromMock, _upsertMock: upsertMock }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 0 when holder has no active holdings', async () => {
    mockSupabase = buildMockSupabase([], [])
    const result = await scoreFundsForHolder('holder-uuid-1234-5678-abcd', mockSupabase as unknown as Parameters<typeof scoreFundsForHolder>[1])
    expect(result).toBe(0)
  })

  it('scores one holding and upserts fund_ai_scores', async () => {
    const holdings = [{
      scheme_code: 101,
      scheme_name: 'Test Equity Fund',
      category: 'Equity',
      units: 500,
      current_value: 75000,
      folio_id: 'folio-1',
    }]
    const transactions = [
      { folio_id: 'folio-1', scheme_code: 101, scheme_name: 'Test Equity Fund', transaction_date: '2023-01-01', transaction_type: 'purchase', amount: 50000, units: 500, nav: 100 },
    ]
    const nifty = [{ nav_date: '2023-01-01', close: 18000 }, { nav_date: '2023-06-01', close: 19000 }]
    const funds = [{ scheme_code: 101, ter: 0.8 }]

    mockSupabase = buildMockSupabase(holdings, transactions, nifty, funds)

    const result = await scoreFundsForHolder('holder-uuid-1234-5678-abcd', mockSupabase as unknown as Parameters<typeof scoreFundsForHolder>[1])
    expect(result).toBe(1)
    expect(mockSupabase._upsertMock).toHaveBeenCalledOnce()
  })

  it('handles insufficient data (< 3 months transactions) gracefully', async () => {
    const holdings = [{
      scheme_code: 202,
      scheme_name: 'New Fund',
      category: 'Debt',
      units: 100,
      current_value: 10500,
      folio_id: 'folio-2',
    }]
    // Only 1 transaction — insufficient data
    const transactions = [
      { folio_id: 'folio-2', scheme_code: 202, scheme_name: 'New Fund', transaction_date: '2024-01-01', transaction_type: 'purchase', amount: 10000, units: 100, nav: 100 },
    ]
    mockSupabase = buildMockSupabase(holdings, transactions, [], [])

    // When computeAlpha is mocked to return 0.05, it will still score the fund
    // But we verify the service doesn't crash with minimal data
    const result = await scoreFundsForHolder('holder-uuid-1234-5678-abcd', mockSupabase as unknown as Parameters<typeof scoreFundsForHolder>[1])
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('returns count of scored holdings when multiple holdings present', async () => {
    const holdings = [
      { scheme_code: 101, scheme_name: 'Fund A', category: 'Equity', units: 500, current_value: 75000, folio_id: 'folio-1' },
      { scheme_code: 202, scheme_name: 'Fund B', category: 'Debt', units: 200, current_value: 22000, folio_id: 'folio-2' },
    ]
    const transactions = [
      { folio_id: 'folio-1', scheme_code: 101, scheme_name: 'Fund A', transaction_date: '2023-01-01', transaction_type: 'purchase', amount: 50000, units: 500, nav: 100 },
      { folio_id: 'folio-2', scheme_code: 202, scheme_name: 'Fund B', transaction_date: '2023-01-01', transaction_type: 'purchase', amount: 20000, units: 200, nav: 100 },
    ]
    mockSupabase = buildMockSupabase(holdings, transactions, [], [])

    const result = await scoreFundsForHolder('holder-uuid-1234-5678-abcd', mockSupabase as unknown as Parameters<typeof scoreFundsForHolder>[1])
    expect(result).toBe(2)
  })
})

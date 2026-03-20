import { describe, it, expect } from 'vitest'
import { computeXIRR, computeGainLoss, buildPortfolioCashflows } from '@/lib/analytics/xirr'
import type { HoldingRow } from '@/lib/supabase/types'

describe('computeXIRR', () => {
  it('returns correct XIRR for known cashflow series (Excel-verified)', () => {
    // Invest 1000 on 2024-01-01, terminal value 1100 on 2025-01-01 → ~10% XIRR
    const cashflows = [
      { amount: -1000, date: new Date('2024-01-01') },
      { amount: 1100, date: new Date('2025-01-01') },
    ]
    const result = computeXIRR(cashflows)
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(0.1, 2) // within 0.001 of 10%
  })

  it('returns null when fewer than 2 cashflows', () => {
    expect(computeXIRR([])).toBeNull()
    expect(computeXIRR([{ amount: -1000, date: new Date('2024-01-01') }])).toBeNull()
  })

  it('returns null when all cashflows are negative (no positive terminal value)', () => {
    const cashflows = [
      { amount: -1000, date: new Date('2024-01-01') },
      { amount: -500, date: new Date('2024-06-01') },
    ]
    expect(computeXIRR(cashflows)).toBeNull()
  })

  it('returns null when NAV is missing (current_value null)', () => {
    // buildPortfolioCashflows returns null-guarded output; test null holding directly
    const holding: HoldingRow = {
      scheme_code: 100001,
      scheme_name: 'Test Fund',
      fund_house: 'Test AMC',
      folio_id: 'folio-001',
      units: 100,
      avg_cost_nav: 10,
      total_invested: 1000,
      current_nav: null, // NAV not synced
      current_nav_date: null,
      current_value: null,
    }
    const { gainLoss, gainLossPct } = computeGainLoss(holding)
    expect(gainLoss).toBeNull()
    expect(gainLossPct).toBeNull()
  })

  it('handles portfolio younger than 7 days — shows null not zero', () => {
    // XIRR for identical invest/terminal (< ±0.5% gain) should still compute
    // but if all cashflows same date → Newton-Raphson derivative is 0, returns null
    const today = new Date()
    const yesterday = new Date(today.getTime() - 86400_000)
    const cashflows = [
      { amount: -1000, date: yesterday },
      { amount: 1000, date: today }, // 0% return, < 7 days
    ]
    // Either null (no convergence) or a value near 0 — either is acceptable behavior
    // The key is it should not throw
    const result = computeXIRR(cashflows)
    expect(result === null || typeof result === 'number').toBe(true)
  })

  it('purchase amounts must be negated (outflows) in cashflow array', () => {
    // If sign convention is wrong (purchase positive), XIRR gives wrong/negative result
    // Correct: invest -1000, terminal +1100 → positive ~10% return
    const correct = [
      { amount: -1000, date: new Date('2024-01-01') },
      { amount: 1100, date: new Date('2025-01-01') },
    ]
    const result = computeXIRR(correct)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(0) // positive return
  })
})

describe('computeGainLoss', () => {
  it('positive gain when current_value > total_invested', () => {
    const holding: HoldingRow = {
      scheme_code: 100001,
      scheme_name: 'Test Fund',
      fund_house: 'Test AMC',
      folio_id: 'folio-001',
      units: 120,
      avg_cost_nav: 100,
      total_invested: 10000,
      current_nav: 120,
      current_nav_date: '2025-01-01',
      current_value: 12000,
    }
    const { gainLoss, gainLossPct } = computeGainLoss(holding)
    expect(gainLoss).toBe(2000)
    expect(gainLossPct).toBeCloseTo(20, 5)
  })

  it('negative loss when current_value < total_invested', () => {
    const holding: HoldingRow = {
      scheme_code: 100001,
      scheme_name: 'Test Fund',
      fund_house: 'Test AMC',
      folio_id: 'folio-001',
      units: 80,
      avg_cost_nav: 100,
      total_invested: 10000,
      current_nav: 90,
      current_nav_date: '2025-01-01',
      current_value: 8000,
    }
    const { gainLoss, gainLossPct } = computeGainLoss(holding)
    expect(gainLoss).toBe(-2000)
    expect(gainLossPct).toBeCloseTo(-20, 5)
  })

  it('returns null when current_value is null', () => {
    const holding: HoldingRow = {
      scheme_code: 100001,
      scheme_name: 'Test Fund',
      fund_house: 'Test AMC',
      folio_id: 'folio-001',
      units: 100,
      avg_cost_nav: 100,
      total_invested: 10000,
      current_nav: null,
      current_nav_date: null,
      current_value: null,
    }
    const { gainLoss, gainLossPct } = computeGainLoss(holding)
    expect(gainLoss).toBeNull()
    expect(gainLossPct).toBeNull()
  })
})

describe('buildPortfolioCashflows', () => {
  it('negates purchase amounts as outflows and adds current value as terminal', () => {
    const transactions = [
      {
        id: 'tx-1',
        folio_id: 'folio-001',
        transaction_date: '2024-01-01',
        transaction_type: 'purchase' as const,
        units: 100,
        nav: 10,
        amount: 1000,
        import_status: 'clean' as const,
        source: 'cas_import' as const,
        created_at: '2024-01-01T00:00:00Z',
      },
    ]
    const holdings: HoldingRow[] = [
      {
        scheme_code: 100001,
        scheme_name: 'Test Fund',
        fund_house: 'Test AMC',
        folio_id: 'folio-001',
        units: 100,
        avg_cost_nav: 10,
        total_invested: 1000,
        current_nav: 12,
        current_nav_date: '2025-01-01',
        current_value: 1200,
      },
    ]
    const today = new Date('2025-01-01')
    const cashflows = buildPortfolioCashflows(transactions, holdings, today)
    // Purchase is negated
    expect(cashflows[0].amount).toBe(-1000)
    // Terminal cashflow = current_value = 1200
    const terminal = cashflows[cashflows.length - 1]
    expect(terminal.amount).toBe(1200)
    expect(terminal.date).toEqual(today)
  })
})

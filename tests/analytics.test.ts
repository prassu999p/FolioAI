import { describe, it, expect } from 'vitest'
import { computeGainLoss, computeXIRR } from '@/lib/analytics/xirr'
import { getPeriodBounds, getCurrentFY } from '@/lib/analytics/period-utils'
import type { HoldingRow } from '@/lib/supabase/types'

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

describe('getPeriodBounds', () => {
  it('1M returns start date ~30 days ago', () => {
    const bounds = getPeriodBounds('1M')
    expect(bounds).not.toBeNull()
    const now = new Date()
    const diffMs = now.getTime() - bounds!.start.getTime()
    const diffDays = diffMs / 86400_000
    expect(diffDays).toBeCloseTo(30, 0)
    expect(bounds!.end.getTime()).toBeCloseTo(now.getTime(), -3) // within 1s
  })

  it('all returns null (no filter)', () => {
    const bounds = getPeriodBounds('all')
    expect(bounds).toBeNull()
  })

  it('3M returns ~90 days', () => {
    const bounds = getPeriodBounds('3M')
    expect(bounds).not.toBeNull()
    const diffDays = (new Date().getTime() - bounds!.start.getTime()) / 86400_000
    expect(diffDays).toBeCloseTo(90, 0)
  })

  it('6M returns ~180 days', () => {
    const bounds = getPeriodBounds('6M')
    expect(bounds).not.toBeNull()
    const diffDays = (new Date().getTime() - bounds!.start.getTime()) / 86400_000
    expect(diffDays).toBeCloseTo(180, 0)
  })

  it('1Y returns ~365 days', () => {
    const bounds = getPeriodBounds('1Y')
    expect(bounds).not.toBeNull()
    const diffDays = (new Date().getTime() - bounds!.start.getTime()) / 86400_000
    expect(diffDays).toBeCloseTo(365, 0)
  })

  it('3Y returns ~1095 days', () => {
    const bounds = getPeriodBounds('3Y')
    expect(bounds).not.toBeNull()
    const diffDays = (new Date().getTime() - bounds!.start.getTime()) / 86400_000
    expect(diffDays).toBeCloseTo(1095, 0)
  })
})

describe('getCurrentFY', () => {
  it('April 1 is start of Indian financial year', () => {
    const { start } = getCurrentFY()
    expect(start.getMonth()).toBe(3) // April = month index 3 (0-indexed)
    expect(start.getDate()).toBe(1)
  })

  it('March 31 is end of Indian financial year', () => {
    const { end } = getCurrentFY()
    expect(end.getMonth()).toBe(2) // March = month index 2 (0-indexed)
    expect(end.getDate()).toBe(31)
  })

  it('FY end year is one after FY start year', () => {
    const { start, end } = getCurrentFY()
    expect(end.getFullYear()).toBe(start.getFullYear() + 1)
  })
})

describe('benchmark XIRR', () => {
  it('synthetic Nifty cashflows follow same sign convention as portfolio cashflows', () => {
    // Benchmark XIRR uses same sign convention: purchases → negative, terminal → positive
    // This is a structural test — same computeXIRR is used for both
    // Verify the function returns a valid number for a correct 10% annual return scenario
    const cashflows = [
      { amount: -10000, date: new Date('2024-01-01') },
      { amount: 11000, date: new Date('2025-01-01') },
    ]
    const result = computeXIRR(cashflows)
    expect(result).not.toBeNull()
    expect(result).toBeCloseTo(0.1, 2)
  })
})

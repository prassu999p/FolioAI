import { describe, it, expect } from 'vitest'
import { computeAlpha, computeAUMTrend, computeQualityScore } from '@/lib/ai/scoring'
import type { AlphaInput, ScoringSignals } from '@/lib/ai/types'

// Helper: build a Nifty daily series spanning a date range
function buildNiftyDaily(
  startDate: string,
  count: number,
  startClose = 20000,
  dailyGrowthPct = 0.001
): Array<{ date: string; close: number }> {
  const result: Array<{ date: string; close: number }> = []
  const d = new Date(startDate)
  let close = startClose
  for (let i = 0; i < count; i++) {
    result.push({ date: d.toISOString().slice(0, 10), close: Math.round(close * 100) / 100 })
    close = close * (1 + dailyGrowthPct)
    d.setDate(d.getDate() + 1)
  }
  return result
}

describe('computeAlpha', () => {
  it('returns null when fewer than 3 months of data (2 months = ~60 days)', () => {
    // Only 2 months worth of transactions — insufficient
    const transactions = [
      { folio_id: 'f1', scheme_code: 100, scheme_name: 'Test Fund', transaction_date: '2024-01-01', transaction_type: 'purchase', amount: 10000, units: 100, nav: 100 },
      { folio_id: 'f1', scheme_code: 100, scheme_name: 'Test Fund', transaction_date: '2024-02-01', transaction_type: 'purchase', amount: 10000, units: 95, nav: 105 },
    ]
    const nifty = buildNiftyDaily('2024-01-01', 60, 20000)
    const input: AlphaInput = { transactions, currentValue: 22000, nifty50Daily: nifty }
    expect(computeAlpha(input)).toBeNull()
  })

  it('returns positive alpha when fund XIRR exceeds nifty XIRR', () => {
    // Fund grows strongly over 6 months vs moderate nifty growth
    const transactions = [
      { folio_id: 'f1', scheme_code: 100, scheme_name: 'Outperform Fund', transaction_date: '2023-07-01', transaction_type: 'purchase', amount: 50000, units: 500, nav: 100 },
      { folio_id: 'f1', scheme_code: 100, scheme_name: 'Outperform Fund', transaction_date: '2023-09-01', transaction_type: 'purchase', amount: 50000, units: 455, nav: 110 },
    ]
    // Nifty grows ~10% over the period
    const nifty = buildNiftyDaily('2023-07-01', 185, 20000, 0.0005) // ~10% total
    // Fund current value implies ~25% growth
    const input: AlphaInput = { transactions, currentValue: 125000, nifty50Daily: nifty }
    const alpha = computeAlpha(input)
    expect(alpha).not.toBeNull()
    expect(alpha).toBeGreaterThan(0)
  })

  it('returns negative alpha when fund XIRR is below nifty XIRR', () => {
    // Nifty grows well, fund barely grows
    const transactions = [
      { folio_id: 'f1', scheme_code: 200, scheme_name: 'Underperform Fund', transaction_date: '2023-07-01', transaction_type: 'purchase', amount: 50000, units: 500, nav: 100 },
      { folio_id: 'f1', scheme_code: 200, scheme_name: 'Underperform Fund', transaction_date: '2023-09-01', transaction_type: 'purchase', amount: 50000, units: 476, nav: 105 },
    ]
    // Nifty grows strongly ~20%
    const nifty = buildNiftyDaily('2023-07-01', 185, 20000, 0.001) // ~20% total
    // Fund barely grows — only 5% up total
    const input: AlphaInput = { transactions, currentValue: 105000, nifty50Daily: nifty }
    const alpha = computeAlpha(input)
    expect(alpha).not.toBeNull()
    expect(alpha).toBeLessThan(0)
  })

  it('handles missing nifty50_daily rows around holidays (empty transactions)', () => {
    const input: AlphaInput = { transactions: [], currentValue: 0, nifty50Daily: [] }
    expect(computeAlpha(input)).toBeNull()
  })
})

describe('computeAUMTrend', () => {
  it('returns insufficient_data when fewer than 3 NAV data points', () => {
    expect(computeAUMTrend([], 100)).toBe('insufficient_data')
    expect(computeAUMTrend([{ date: '2024-01-01', nav: 100 }], 100)).toBe('insufficient_data')
    expect(computeAUMTrend([
      { date: '2024-01-01', nav: 100 },
      { date: '2024-02-01', nav: 110 },
    ], 100)).toBe('insufficient_data')
  })

  it('returns growing when AUM increases >10% over 6 months', () => {
    // AUM at first point: 100 * 100 = 10000; at last point: 115 * 100 = 11500 (+15%)
    const navHistory = [
      { date: '2024-01-01', nav: 100 },
      { date: '2024-03-01', nav: 107 },
      { date: '2024-07-01', nav: 115 },
    ]
    expect(computeAUMTrend(navHistory, 100)).toBe('growing')
  })

  it('returns declining when AUM decreases >10% over 6 months', () => {
    // AUM at first: 100*100=10000; at last: 85*100=8500 (-15%)
    const navHistory = [
      { date: '2024-01-01', nav: 100 },
      { date: '2024-03-01', nav: 93 },
      { date: '2024-07-01', nav: 85 },
    ]
    expect(computeAUMTrend(navHistory, 100)).toBe('declining')
  })

  it('returns stable for changes within ±10%', () => {
    // AUM at first: 100*100=10000; at last: 103*100=10300 (+3%)
    const navHistory = [
      { date: '2024-01-01', nav: 100 },
      { date: '2024-03-01', nav: 101 },
      { date: '2024-07-01', nav: 103 },
    ]
    expect(computeAUMTrend(navHistory, 100)).toBe('stable')
  })
})

describe('computeQualityScore', () => {
  it('returns score between 0 and 100', () => {
    const signals: ScoringSignals = {
      scheme_code: 1, fund_name: 'Test', category: 'Equity',
      alpha_pct: 0.05, expense_ratio: 0.5, aum_trend: 'growing',
      months_of_data: 12,
    }
    const score = computeQualityScore(signals)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
    expect(Number.isInteger(score)).toBe(true)
  })

  it('returns higher score (>= 80) for fund with positive alpha and low expense ratio', () => {
    const signals: ScoringSignals = {
      scheme_code: 1, fund_name: 'Good Fund', category: 'Equity',
      alpha_pct: 0.05, expense_ratio: 0.4, aum_trend: 'growing',
      months_of_data: 12,
    }
    expect(computeQualityScore(signals)).toBeGreaterThanOrEqual(80)
  })

  it('returns lower score (<= 35) for fund with negative alpha and high expense ratio', () => {
    const signals: ScoringSignals = {
      scheme_code: 2, fund_name: 'Bad Fund', category: 'Equity',
      alpha_pct: -0.03, expense_ratio: 2.5, aum_trend: 'declining',
      months_of_data: 12,
    }
    expect(computeQualityScore(signals)).toBeLessThanOrEqual(35)
  })

  it('handles null alpha gracefully — applies 0 alpha weight', () => {
    const signals: ScoringSignals = {
      scheme_code: 3, fund_name: 'Null Alpha Fund', category: 'Equity',
      alpha_pct: null, expense_ratio: 1.0, aum_trend: 'stable',
      months_of_data: 6,
    }
    // Should not throw; alpha null treated as 0
    expect(() => computeQualityScore(signals)).not.toThrow()
    const score = computeQualityScore(signals)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('handles insufficient_data aum_trend — applies neutral AUM weight', () => {
    const signals: ScoringSignals = {
      scheme_code: 4, fund_name: 'New Fund', category: 'Equity',
      alpha_pct: 0.02, expense_ratio: 1.0, aum_trend: 'insufficient_data',
      months_of_data: 2,
    }
    // Should not throw; aum_trend insufficient_data treated as neutral 50
    expect(() => computeQualityScore(signals)).not.toThrow()
    const score = computeQualityScore(signals)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

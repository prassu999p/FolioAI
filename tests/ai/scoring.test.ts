import { describe, it } from 'vitest'
// import { computeAlpha, computeAUMTrend, computeQualityScore } from '@/lib/ai/scoring'

describe('computeAlpha', () => {
  it.todo('returns null when fewer than 3 months of data')
  it.todo('returns positive alpha when fund XIRR exceeds nifty XIRR')
  it.todo('returns negative alpha when fund XIRR is below nifty XIRR')
  it.todo('handles missing nifty50_daily rows around holidays')
})

describe('computeAUMTrend', () => {
  it.todo('returns insufficient_data when fewer than 3 NAV data points')
  it.todo('returns growing when AUM increases >10% over 6 months')
  it.todo('returns declining when AUM decreases >10% over 6 months')
  it.todo('returns stable for changes within ±10%')
})

describe('computeQualityScore', () => {
  it.todo('returns score between 0 and 100')
  it.todo('returns higher score for fund with positive alpha and low expense ratio')
  it.todo('returns lower score for fund with negative alpha and high expense ratio')
  it.todo('handles null alpha gracefully — applies 0 alpha weight')
  it.todo('handles insufficient_data aum_trend — applies neutral AUM weight')
})

// tests/goals-engine.test.ts
import { describe, it, expect } from 'vitest'
import { computeProjectedCorpus, computeGoalProjection } from '@/lib/analytics/goals-engine'

describe('computeProjectedCorpus', () => {
  it('returns currentLinkedValue when yearsToTarget is 0 or negative', () => {
    expect(computeProjectedCorpus(100000, 10, 0)).toBe(100000)
    expect(computeProjectedCorpus(100000, 10, -1)).toBe(100000)
  })

  it('compounds correctly: 100000 at 12% for 5 years ≈ 176234', () => {
    const result = computeProjectedCorpus(100000, 12, 5)
    expect(result).toBeGreaterThanOrEqual(176230)
    expect(result).toBeLessThanOrEqual(176240)
  })

  it('handles fractional years: 100000 at 10% for 1.5 years ≈ 115000', () => {
    const result = computeProjectedCorpus(100000, 10, 1.5)
    // 100000 * (1.10)^1.5 ≈ 115369
    expect(result).toBeGreaterThan(115000)
    expect(result).toBeLessThan(116000)
  })
})

describe('computeGoalProjection', () => {
  // A goal with a future target date ~5 years from now
  const futureDate = new Date()
  futureDate.setFullYear(futureDate.getFullYear() + 5)
  const targetDate = futureDate.toISOString().slice(0, 10)

  it('isOnTrack is true when projected corpus >= target_amount', () => {
    // 1000000 at 12% for 5 years ≈ 1762342 >= target 1500000
    const result = computeGoalProjection(
      { target_amount: 1500000, assumed_cagr: 12, target_date: targetDate },
      1000000
    )
    expect(result.isOnTrack).toBe(true)
  })

  it('isOnTrack is false when projected corpus < target_amount', () => {
    // 100000 at 5% for 5 years ≈ 127628 < target 500000
    const result = computeGoalProjection(
      { target_amount: 500000, assumed_cagr: 5, target_date: targetDate },
      100000
    )
    expect(result.isOnTrack).toBe(false)
  })

  it('progressPct is capped at 100 when currentLinkedValue > target_amount', () => {
    const result = computeGoalProjection(
      { target_amount: 100000, assumed_cagr: 10, target_date: targetDate },
      200000
    )
    expect(result.progressPct).toBe(100)
  })

  it('falls back to totalHolderAUM when no linked holdings (currentLinkedValue = 0)', () => {
    const fallbackAUM = 500000
    const result = computeGoalProjection(
      { target_amount: 1000000, assumed_cagr: 10, target_date: targetDate },
      0,
      fallbackAUM
    )
    // Should use fallbackAUM as base, not 0
    expect(result.currentLinkedValue).toBe(fallbackAUM)
    expect(result.projectedCorpus).toBeGreaterThan(0)
  })

  it('progressPct uses currentLinkedValue / target_amount * 100', () => {
    const result = computeGoalProjection(
      { target_amount: 200000, assumed_cagr: 10, target_date: targetDate },
      50000
    )
    expect(result.progressPct).toBeCloseTo(25, 0)
  })
})

// tests/goals-engine.test.ts
// Wave 0 stubs — RED phase. Implementation in 05-02-PLAN.md.
import { describe, it } from 'vitest'
// import { computeProjectedCorpus, computeGoalProjection } from '@/lib/analytics/goals-engine'

describe('computeProjectedCorpus', () => {
  it.todo('returns currentLinkedValue when yearsToTarget is 0 or negative')
  it.todo('compounds correctly: 100000 at 12% for 5 years ≈ 176234')
  it.todo('handles fractional years: 100000 at 10% for 1.5 years ≈ 115000')
})

describe('computeGoalProjection', () => {
  it.todo('isOnTrack is true when projected corpus >= target_amount')
  it.todo('isOnTrack is false when projected corpus < target_amount')
  it.todo('progressPct is capped at 100 when currentLinkedValue > target_amount')
  it.todo('falls back to totalHolderAUM when no linked holdings (currentLinkedValue = 0)')
  it.todo('progressPct uses currentLinkedValue / target_amount * 100')
})

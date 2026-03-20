import { describe, it } from 'vitest'
// Future imports (created in Plan 02):
// import { computeGainLoss } from '@/lib/analytics/xirr'
// import { getPeriodBounds, getCurrentFY } from '@/lib/analytics/period-utils'
// import { buildBenchmarkCashflows } from '@/lib/analytics/xirr'

describe('computeGainLoss', () => {
  it.todo('positive gain when current_value > total_invested')
  it.todo('negative loss when current_value < total_invested')
  it.todo('returns null when current_value is null')
})

describe('getPeriodBounds', () => {
  it.todo('1M returns start date 30 days ago')
  it.todo('all returns null (no filter)')
})

describe('getCurrentFY', () => {
  it.todo('April 1 is start of Indian financial year')
  it.todo('March 31 is end of Indian financial year')
})

describe('benchmark XIRR', () => {
  it.todo('synthetic Nifty cashflows follow same sign convention as portfolio cashflows')
})

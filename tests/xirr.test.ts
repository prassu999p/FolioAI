import { describe, it } from 'vitest'
// Future import (created in Plan 02):
// import { computeXIRR } from '@/lib/analytics/xirr'

describe('computeXIRR', () => {
  it.todo('returns correct XIRR for known cashflow series (Excel-verified)')
  it.todo('returns null when fewer than 2 cashflows')
  it.todo('returns null when all cashflows are negative (no positive terminal value)')
  it.todo('returns null when NAV is missing (current_value null)')
  it.todo('handles portfolio younger than 7 days — shows null not zero')
  it.todo('purchase amounts must be negated (outflows) in cashflow array')
})

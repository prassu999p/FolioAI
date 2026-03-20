import { describe, it } from 'vitest'
// Future import (created in Plan 02):
// import { detectActiveSIPs } from '@/lib/analytics/sip-detector'

describe('detectActiveSIPs', () => {
  it.todo('detects active SIP: 3+ same-amount transactions within 30-day cadence in last 90 days')
  it.todo('returns empty array when fewer than 3 recurring transactions')
  it.todo('returns empty array when transactions older than 90 days')
  it.todo('infers next debit date as lastDate + median interval (using date-fns addMonths)')
  it.todo('SIP XIRR uses only sip transaction_type cashflows')
  it.todo('SIP XIRR excludes purchase/lumpsum cashflows')
})

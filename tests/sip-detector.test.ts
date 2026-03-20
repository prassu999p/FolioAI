import { describe, it, expect } from 'vitest'
import { detectActiveSIPs } from '@/lib/analytics/sip-detector'
import { addMonths, parseISO } from 'date-fns'

// Helper: create a folio transaction
function makeTx(
  folio_id: string,
  scheme_name: string,
  transaction_date: string,
  amount: number,
  transaction_type = 'sip'
) {
  return { folio_id, scheme_name, transaction_type, transaction_date, amount }
}

// Helper: create dates spread across ~monthly cadence
function makeMonthlyDates(startDate: string, count: number): string[] {
  const dates: string[] = [startDate]
  let current = parseISO(startDate)
  for (let i = 1; i < count; i++) {
    current = addMonths(current, 1)
    dates.push(current.toISOString().split('T')[0])
  }
  return dates
}

describe('detectActiveSIPs', () => {
  it('detects active SIP: 3+ same-amount transactions within 30-day cadence in last 90 days', () => {
    // Use a fixed "today" so dates are deterministic
    const today = new Date('2025-04-01')
    // 3 transactions: March 1, Feb 1, Jan 1 — all within 90 days of April 1
    const transactions = [
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-03-01', 5000),
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-02-01', 5000),
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-01-02', 5000),
    ]
    const result = detectActiveSIPs(transactions, today)
    expect(result).toHaveLength(1)
    expect(result[0].folio_id).toBe('folio-001')
    expect(result[0].monthly_amount).toBe(5000)
  })

  it('returns empty array when fewer than 3 recurring transactions', () => {
    const today = new Date('2025-04-01')
    const transactions = [
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-03-01', 5000),
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-02-01', 5000),
      // Only 2 — not enough to qualify as active SIP
    ]
    const result = detectActiveSIPs(transactions, today)
    expect(result).toHaveLength(0)
  })

  it('returns empty array when transactions older than 90 days', () => {
    const today = new Date('2025-04-01')
    // All transactions before Jan 1, 2025 (>90 days from April 1)
    const transactions = [
      makeTx('folio-001', 'HDFC Flexi Cap', '2024-12-01', 5000),
      makeTx('folio-001', 'HDFC Flexi Cap', '2024-11-01', 5000),
      makeTx('folio-001', 'HDFC Flexi Cap', '2024-10-01', 5000),
    ]
    const result = detectActiveSIPs(transactions, today)
    expect(result).toHaveLength(0)
  })

  it('infers next debit date as lastDate + 1 month (using date-fns addMonths)', () => {
    const today = new Date('2025-04-01')
    const transactions = [
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-03-15', 5000),
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-02-15', 5000),
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-01-15', 5000),
    ]
    const result = detectActiveSIPs(transactions, today)
    expect(result).toHaveLength(1)
    // next_debit_date = addMonths('2025-03-15', 1) = 2025-04-15
    const expected = new Date('2025-04-15')
    expect(result[0].next_debit_date.getFullYear()).toBe(expected.getFullYear())
    expect(result[0].next_debit_date.getMonth()).toBe(expected.getMonth())
    expect(result[0].next_debit_date.getDate()).toBe(expected.getDate())
  })

  it('SIP XIRR uses only sip transaction_type cashflows (sip_cashflows contains negated amounts)', () => {
    const today = new Date('2025-04-01')
    const transactions = [
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-03-01', 5000, 'sip'),
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-02-01', 5000, 'sip'),
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-01-02', 5000, 'sip'),
    ]
    const result = detectActiveSIPs(transactions, today)
    expect(result).toHaveLength(1)
    // sip_cashflows: amounts should be negative (outflows from investor perspective)
    const sipCashflows = result[0].sip_cashflows
    expect(sipCashflows.length).toBe(3)
    sipCashflows.forEach(cf => {
      expect(cf.amount).toBeLessThan(0)  // negated outflows
    })
  })

  it('SIP XIRR excludes purchase/lumpsum cashflows', () => {
    const today = new Date('2025-04-01')
    // Mix of sip and purchase transactions in same folio
    // Only the sip ones should be counted for SIP detection
    const transactions = [
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-03-01', 5000, 'sip'),
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-02-01', 5000, 'sip'),
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-01-02', 5000, 'sip'),
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-01-15', 50000, 'purchase'), // lumpsum — different amount
    ]
    const result = detectActiveSIPs(transactions, today)
    // Should detect the SIPs but not include the purchase in sip_cashflows
    expect(result).toHaveLength(1)
    const sipCashflows = result[0].sip_cashflows
    // All sip_cashflows should be -5000, not -50000
    sipCashflows.forEach(cf => {
      expect(Math.abs(cf.amount)).toBe(5000)
    })
  })

  it('detects two separate active SIPs in different folios', () => {
    const today = new Date('2025-04-01')
    const transactions = [
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-03-01', 5000),
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-02-01', 5000),
      makeTx('folio-001', 'HDFC Flexi Cap', '2025-01-02', 5000),
      makeTx('folio-002', 'Axis Bluechip', '2025-03-10', 3000),
      makeTx('folio-002', 'Axis Bluechip', '2025-02-10', 3000),
      makeTx('folio-002', 'Axis Bluechip', '2025-01-10', 3000),
    ]
    const result = detectActiveSIPs(transactions, today)
    expect(result).toHaveLength(2)
    const folioIds = result.map(r => r.folio_id).sort()
    expect(folioIds).toEqual(['folio-001', 'folio-002'])
  })
})

import { describe, it, expect } from 'vitest'
import { normaliseHeaders, COLUMN_ALIASES } from '../lib/tradebook/tradebook-column-mapper'

describe('tradebook-column-mapper: normaliseHeaders', () => {
  it('maps Zerodha "symbol" header to canonical "symbol"', () => {
    const result = normaliseHeaders({ symbol: 'INFY' })
    expect(result['symbol']).toBe('INFY')
  })

  it('maps "Scrip Name" (case-insensitive) to canonical "symbol"', () => {
    const result = normaliseHeaders({ 'Scrip Name': 'INFY' })
    expect(result['symbol']).toBe('INFY')
    expect('Scrip Name' in result).toBe(false)
  })

  it('maps "ISIN Code" to canonical "isin"', () => {
    const result = normaliseHeaders({ 'ISIN Code': 'INE009A01021' })
    expect(result['isin']).toBe('INE009A01021')
  })

  it('maps "Trade Date" to canonical "trade_date"', () => {
    const result = normaliseHeaders({ 'Trade Date': '2024-01-15' })
    expect(result['trade_date']).toBe('2024-01-15')
  })

  it('maps "Buy/Sell" to canonical "trade_type"', () => {
    const result = normaliseHeaders({ 'Buy/Sell': 'B' })
    expect(result['trade_type']).toBe('B')
  })

  it('maps "B/S" to canonical "trade_type"', () => {
    const result = normaliseHeaders({ 'B/S': 'S' })
    expect(result['trade_type']).toBe('S')
  })

  it('maps "Qty" to canonical "quantity"', () => {
    const result = normaliseHeaders({ Qty: '10' })
    expect(result['quantity']).toBe('10')
  })

  it('maps "Trade Price" to canonical "price"', () => {
    const result = normaliseHeaders({ 'Trade Price': '1500.50' })
    expect(result['price']).toBe('1500.50')
  })

  it('maps "Order ID" to canonical "trade_id"', () => {
    const result = normaliseHeaders({ 'Order ID': 'ORD123' })
    expect(result['trade_id']).toBe('ORD123')
  })

  it('maps "Ref No" to canonical "trade_id"', () => {
    const result = normaliseHeaders({ 'Ref No': 'TXN001' })
    expect(result['trade_id']).toBe('TXN001')
  })

  it('passes through unknown headers unchanged', () => {
    const result = normaliseHeaders({ Volume: '500' })
    // Unknown key passes through lowercased
    expect(result['Volume']).toBe('500')
  })

  it('handles extra whitespace in header names', () => {
    const result = normaliseHeaders({ '  Qty  ': '20' })
    expect(result['quantity']).toBe('20')
  })
})

describe('tradebook-column-mapper: COLUMN_ALIASES', () => {
  it('exports COLUMN_ALIASES with at least 8 canonical keys', () => {
    const keys = Object.keys(COLUMN_ALIASES)
    expect(keys.length).toBeGreaterThanOrEqual(8)
  })

  it('each canonical key has at least one alias', () => {
    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
      expect(aliases.length).toBeGreaterThanOrEqual(1), `${key} has no aliases`
    }
  })
})

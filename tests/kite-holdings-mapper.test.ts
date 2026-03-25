// tests/kite-holdings-mapper.test.ts
import { describe, it, expect } from 'vitest'
import { mapKiteHoldingToStockRow } from '@/lib/broker/kite-holdings-mapper'
import type { KiteHolding } from '@/lib/broker/kite-holdings-mapper'

const sampleHolding: KiteHolding = {
  tradingsymbol: 'INFY',
  exchange: 'NSE',
  isin: 'INE009A01021',
  quantity: 50,
  average_price: 1400.5,
  last_price: 1520.75,
  pnl: 6012.5,
}

describe('mapKiteHoldingToStockRow', () => {
  it('maps tradingsymbol, exchange, quantity, average_price, last_price, pnl from KiteHolding', () => {
    const result = mapKiteHoldingToStockRow(sampleHolding, 'holder-uuid-001')
    expect(result.tradingsymbol).toBe('INFY')
    expect(result.exchange).toBe('NSE')
    expect(result.quantity).toBe(50)
    expect(result.average_price).toBe(1400.5)
    expect(result.last_price).toBe(1520.75)
    expect(result.pnl).toBe(6012.5)
  })

  it('sets broker_source to zerodha', () => {
    const result = mapKiteHoldingToStockRow(sampleHolding, 'holder-uuid-001')
    expect(result.broker_source).toBe('zerodha')
  })

  it('sets holder_id from the provided holderId argument', () => {
    const result = mapKiteHoldingToStockRow(sampleHolding, 'holder-uuid-999')
    expect(result.holder_id).toBe('holder-uuid-999')
  })

  it('sets isin to null when KiteHolding.isin is empty string', () => {
    const holdingNoIsin: KiteHolding = { ...sampleHolding, isin: '' }
    const result = mapKiteHoldingToStockRow(holdingNoIsin, 'holder-uuid-001')
    expect(result.isin).toBeNull()
  })
})

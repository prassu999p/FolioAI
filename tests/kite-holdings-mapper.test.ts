// tests/kite-holdings-mapper.test.ts
// Wave 0 stubs — RED phase. Implementation in 05-04-PLAN.md.
import { describe, it } from 'vitest'
// import { mapKiteHoldingToStockRow } from '@/lib/broker/kite-holdings-mapper'

describe('mapKiteHoldingToStockRow', () => {
  it.todo('maps tradingsymbol, exchange, quantity, average_price, last_price, pnl from KiteHolding')
  it.todo('sets broker_source to zerodha')
  it.todo('sets holder_id from the provided holderId argument')
  it.todo('sets isin to null when KiteHolding.isin is empty string')
})

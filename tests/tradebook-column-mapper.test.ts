import { describe, it } from 'vitest'
import { normaliseHeaders, COLUMN_ALIASES } from '../lib/tradebook/tradebook-column-mapper'

// Silence unused import warning — will be used in Plan 02 tests
void normaliseHeaders
void COLUMN_ALIASES

describe('tradebook-column-mapper: normaliseHeaders', () => {
  it.todo('maps Zerodha "symbol" header to canonical "symbol"')
  it.todo('maps "Scrip Name" (case-insensitive) to canonical "symbol"')
  it.todo('maps "ISIN Code" to canonical "isin"')
  it.todo('maps "Trade Date" to canonical "trade_date"')
  it.todo('maps "Buy/Sell" to canonical "trade_type"')
  it.todo('maps "B/S" to canonical "trade_type"')
  it.todo('maps "Qty" to canonical "quantity"')
  it.todo('maps "Trade Price" to canonical "price"')
  it.todo('maps "Order ID" to canonical "trade_id"')
  it.todo('maps "Ref No" to canonical "trade_id"')
  it.todo('passes through unknown headers unchanged')
  it.todo('handles extra whitespace in header names')
})

describe('tradebook-column-mapper: COLUMN_ALIASES', () => {
  it.todo('exports COLUMN_ALIASES with at least 8 canonical keys')
  it.todo('each canonical key has at least one alias')
})

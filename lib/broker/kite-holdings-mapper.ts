// lib/broker/kite-holdings-mapper.ts
// Stub — implementation in 05-04-PLAN.md

export interface KiteHolding {
  tradingsymbol: string
  exchange: string
  isin: string
  quantity: number
  average_price: number
  last_price: number
  pnl: number
}

export interface StockHoldingInsert {
  holder_id: string
  tradingsymbol: string
  exchange: string
  isin: string | null
  quantity: number
  average_price: number
  last_price: number
  pnl: number
  broker_source: 'zerodha'
}

export function mapKiteHoldingToStockRow(
  _holding: KiteHolding,
  _holderId: string
): StockHoldingInsert {
  throw new Error('Not implemented')
}

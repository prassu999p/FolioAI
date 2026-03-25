// lib/broker/kite-holdings-mapper.ts
// Maps Kite API /portfolio/holdings response to the stock_holdings DB shape.

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

/**
 * Maps a single Kite API holding to the stock_holdings DB row shape.
 * Converts empty-string isin to null (Kite returns "" when ISIN is unavailable).
 */
export function mapKiteHoldingToStockRow(
  holding: KiteHolding,
  holderId: string
): StockHoldingInsert {
  return {
    holder_id: holderId,
    tradingsymbol: holding.tradingsymbol,
    exchange: holding.exchange,
    isin: holding.isin || null,
    quantity: holding.quantity,
    average_price: holding.average_price,
    last_price: holding.last_price,
    pnl: holding.pnl,
    broker_source: 'zerodha',
  }
}

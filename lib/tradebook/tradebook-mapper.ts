/**
 * tradebook-mapper.ts
 *
 * Maps a ValidatedRow (output of tradebook-validator.ts) to the shape
 * required for inserting into the stock_transactions table.
 *
 * Exports:
 *  - StockTransactionInsert: interface matching stock_transactions columns
 *  - mapToStockTransactionInsert: maps a validated row to DB insert shape
 */

import type { ValidatedRow } from './tradebook-validator'

/**
 * StockTransactionInsert
 *
 * Matches the stock_transactions table columns required for INSERT.
 * Does not include auto-generated fields (id, imported_at, created_at).
 */
export interface StockTransactionInsert {
  holder_id: string
  tradingsymbol: string
  exchange: string
  isin: string
  trade_date: string   // ISO date string, e.g. '2024-01-15'
  trade_type: 'buy' | 'sell'
  quantity: number
  price: number
  trade_id: string | null
  batch_id: string
  import_filename: string
}

/**
 * mapToStockTransactionInsert
 *
 * Converts a ValidatedRow into a StockTransactionInsert ready for DB upsert.
 *
 * @param row - Validated tradebook row (from validateRow)
 * @param holderId - UUID of the holder this transaction belongs to
 * @param batchId - UUID identifying this import batch (for dedup and rollback)
 * @param filename - Original filename of the imported tradebook file
 * @returns StockTransactionInsert object ready for supabase .insert()
 */
export function mapToStockTransactionInsert(
  row: ValidatedRow,
  holderId: string,
  batchId: string,
  filename: string
): StockTransactionInsert {
  return {
    holder_id: holderId,
    tradingsymbol: row.symbol,
    exchange: row.exchange,
    isin: row.isin,
    trade_date: row.trade_date,
    trade_type: row.trade_type,
    quantity: row.quantity,
    price: row.price,
    trade_id: row.trade_id ?? null,
    batch_id: batchId,
    import_filename: filename,
  }
}

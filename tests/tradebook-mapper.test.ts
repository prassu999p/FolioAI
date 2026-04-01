import { describe, it, expect } from 'vitest'
import { mapToStockTransactionInsert } from '../lib/tradebook/tradebook-mapper'
import type { StockTransactionInsert } from '../lib/tradebook/tradebook-mapper'
import type { ValidatedRow } from '../lib/tradebook/tradebook-validator'

// A fully validated row for use in tests
const validRow: ValidatedRow = {
  symbol: 'INFY',
  isin: 'INE009A01021',
  trade_date: '2024-01-15',
  exchange: 'NSE',
  trade_type: 'buy',
  quantity: 10,
  price: 1500.5,
  trade_id: 'TXN001',
}

const HOLDER_ID = 'holder-uuid-1234-abcd'
const BATCH_ID = 'batch-uuid-5678-efgh'
const FILENAME = 'tradebook_jan2024.csv'

describe('tradebook-mapper: mapToStockTransactionInsert', () => {
  it('maps row.symbol to tradingsymbol', () => {
    const result = mapToStockTransactionInsert(validRow, HOLDER_ID, BATCH_ID, FILENAME)
    expect(result.tradingsymbol).toBe('INFY')
  })

  it('maps row.isin to isin', () => {
    const result = mapToStockTransactionInsert(validRow, HOLDER_ID, BATCH_ID, FILENAME)
    expect(result.isin).toBe('INE009A01021')
  })

  it('maps row.trade_date to trade_date as ISO string', () => {
    const result = mapToStockTransactionInsert(validRow, HOLDER_ID, BATCH_ID, FILENAME)
    // Should be a valid ISO date string YYYY-MM-DD
    expect(result.trade_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.trade_date).toBe('2024-01-15')
  })

  it('maps row.trade_type to trade_type', () => {
    const result = mapToStockTransactionInsert(validRow, HOLDER_ID, BATCH_ID, FILENAME)
    expect(result.trade_type).toBe('buy')
  })

  it('maps row.quantity to quantity', () => {
    const result = mapToStockTransactionInsert(validRow, HOLDER_ID, BATCH_ID, FILENAME)
    expect(result.quantity).toBe(10)
  })

  it('maps row.price to price', () => {
    const result = mapToStockTransactionInsert(validRow, HOLDER_ID, BATCH_ID, FILENAME)
    expect(result.price).toBe(1500.5)
  })

  it('maps row.trade_id to trade_id when present', () => {
    const result = mapToStockTransactionInsert(validRow, HOLDER_ID, BATCH_ID, FILENAME)
    expect(result.trade_id).toBe('TXN001')
  })

  it('sets trade_id to null when row.trade_id is undefined', () => {
    const rowNoTradeId: ValidatedRow = {
      ...validRow,
      trade_id: undefined,
    }
    const result = mapToStockTransactionInsert(rowNoTradeId, HOLDER_ID, BATCH_ID, FILENAME)
    expect(result.trade_id).toBeNull()
  })

  it('sets holder_id from holderId argument', () => {
    const result = mapToStockTransactionInsert(validRow, HOLDER_ID, BATCH_ID, FILENAME)
    expect(result.holder_id).toBe(HOLDER_ID)
  })

  it('sets batch_id from batchId argument', () => {
    const result = mapToStockTransactionInsert(validRow, HOLDER_ID, BATCH_ID, FILENAME)
    expect(result.batch_id).toBe(BATCH_ID)
  })

  it('sets import_filename from filename argument', () => {
    const result = mapToStockTransactionInsert(validRow, HOLDER_ID, BATCH_ID, FILENAME)
    expect(result.import_filename).toBe(FILENAME)
  })
})

describe('tradebook-mapper: StockTransactionInsert', () => {
  it('interface has all required fields matching stock_transactions table columns', () => {
    // Compile-time check — construct a complete object matching the interface
    const insert: StockTransactionInsert = {
      holder_id: 'uuid',
      tradingsymbol: 'INFY',
      exchange: 'NSE',
      isin: 'INE009A01021',
      trade_date: '2024-01-15',
      trade_type: 'buy',
      quantity: 10,
      price: 1500.5,
      trade_id: null,
      batch_id: 'batch-uuid',
      import_filename: 'file.csv',
    }
    expect(insert.holder_id).toBeDefined()
    expect(insert.tradingsymbol).toBeDefined()
    expect(insert.exchange).toBeDefined()
    expect(insert.isin).toBeDefined()
    expect(insert.trade_date).toBeDefined()
    expect(insert.trade_type).toBeDefined()
    expect(insert.quantity).toBeDefined()
    expect(insert.price).toBeDefined()
    expect(insert.batch_id).toBeDefined()
    expect(insert.import_filename).toBeDefined()
  })
})

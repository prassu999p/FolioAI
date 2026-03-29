import { describe, it } from 'vitest'
import { mapToStockTransactionInsert } from '../lib/tradebook/tradebook-mapper'
import type { StockTransactionInsert } from '../lib/tradebook/tradebook-mapper'
import type { ValidatedRow } from '../lib/tradebook/tradebook-validator'

// Silence unused import warnings — will be used in Plan 02 tests
void mapToStockTransactionInsert
const _insert: StockTransactionInsert | undefined = undefined
void _insert
const _vr: ValidatedRow | undefined = undefined
void _vr

describe('tradebook-mapper: mapToStockTransactionInsert', () => {
  it.todo('maps row.symbol to tradingsymbol')
  it.todo('maps row.isin to isin')
  it.todo('maps row.trade_date to trade_date as ISO string')
  it.todo('maps row.trade_type to trade_type')
  it.todo('maps row.quantity to quantity')
  it.todo('maps row.price to price')
  it.todo('maps row.trade_id to trade_id when present')
  it.todo('sets trade_id to null when row.trade_id is undefined')
  it.todo('sets holder_id from holderId argument')
  it.todo('sets batch_id from batchId argument')
  it.todo('sets import_filename from filename argument')
})

describe('tradebook-mapper: StockTransactionInsert', () => {
  it.todo('interface has all required fields matching stock_transactions table columns')
})

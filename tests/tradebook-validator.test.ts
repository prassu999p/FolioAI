import { describe, it } from 'vitest'
import { TradebookRowSchema, validateRow } from '../lib/tradebook/tradebook-validator'
import type { ValidatedRow } from '../lib/tradebook/tradebook-validator'

// Silence unused import warnings — will be used in Plan 02 tests
void TradebookRowSchema
void validateRow
const _vr: ValidatedRow | undefined = undefined
void _vr

describe('tradebook-validator: validateRow', () => {
  it.todo('returns valid:true for a well-formed row with all required fields')
  it.todo('maps trade_type "b" to "buy"')
  it.todo('maps trade_type "buy" to "buy"')
  it.todo('maps trade_type "purchase" to "buy"')
  it.todo('maps trade_type "s" to "sell"')
  it.todo('maps trade_type "sell" to "sell"')
  it.todo('returns valid:false when trade_type is unrecognised (e.g. "hold")')
  it.todo('uppercases exchange from "nse" to "NSE"')
  it.todo('uppercases exchange from "bse" to "BSE"')
  it.todo('returns valid:false when exchange is not NSE or BSE')
  it.todo('returns valid:false when isin is empty string')
  it.todo('returns valid:false when symbol is empty string')
  it.todo('returns valid:false when quantity is zero or negative')
  it.todo('returns valid:false when price is zero or negative')
  it.todo('coerces string quantity "10" to number 10')
  it.todo('coerces string price "1500.50" to number 1500.5')
  it.todo('trade_id is optional — row without trade_id passes validation')
  it.todo('returns errors array with human-readable messages on failure')
})

describe('tradebook-validator: TradebookRowSchema', () => {
  it.todo('is a valid Zod schema (z.ZodObject or z.ZodType instance)')
})

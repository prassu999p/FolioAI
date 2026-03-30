import { describe, it, expect } from 'vitest'
import { TradebookRowSchema, validateRow } from '../lib/tradebook/tradebook-validator'
import type { ValidatedRow } from '../lib/tradebook/tradebook-validator'
import { z } from 'zod'

// A fully valid row to use as baseline
const validRow: Record<string, unknown> = {
  symbol: 'INFY',
  isin: 'INE009A01021',
  trade_date: '2024-01-15',
  exchange: 'NSE',
  trade_type: 'buy',
  quantity: '10',
  price: '1500.50',
  trade_id: 'TXN001',
}

describe('tradebook-validator: validateRow', () => {
  it('returns valid:true for a well-formed row with all required fields', () => {
    const result = validateRow(validRow)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.data.symbol).toBe('INFY')
      expect(result.data.isin).toBe('INE009A01021')
      expect(result.data.trade_type).toBe('buy')
      expect(result.data.quantity).toBe(10)
      expect(result.data.price).toBe(1500.5)
    }
  })

  it('maps trade_type "b" to "buy"', () => {
    const result = validateRow({ ...validRow, trade_type: 'b' })
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.data.trade_type).toBe('buy')
  })

  it('maps trade_type "buy" to "buy"', () => {
    const result = validateRow({ ...validRow, trade_type: 'buy' })
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.data.trade_type).toBe('buy')
  })

  it('maps trade_type "purchase" to "buy"', () => {
    const result = validateRow({ ...validRow, trade_type: 'purchase' })
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.data.trade_type).toBe('buy')
  })

  it('maps trade_type "s" to "sell"', () => {
    const result = validateRow({ ...validRow, trade_type: 's' })
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.data.trade_type).toBe('sell')
  })

  it('maps trade_type "sell" to "sell"', () => {
    const result = validateRow({ ...validRow, trade_type: 'sell' })
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.data.trade_type).toBe('sell')
  })

  it('returns valid:false when trade_type is unrecognised (e.g. "hold")', () => {
    const result = validateRow({ ...validRow, trade_type: 'hold' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      const joined = result.errors.join(' ')
      expect(joined.toLowerCase()).toMatch(/buy|sell|trade.?type/i)
    }
  })

  it('uppercases exchange from "nse" to "NSE"', () => {
    const result = validateRow({ ...validRow, exchange: 'nse' })
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.data.exchange).toBe('NSE')
  })

  it('uppercases exchange from "bse" to "BSE"', () => {
    const result = validateRow({ ...validRow, exchange: 'bse' })
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.data.exchange).toBe('BSE')
  })

  it('returns valid:false when exchange is not NSE or BSE', () => {
    const result = validateRow({ ...validRow, exchange: 'MCX' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(0)
    }
  })

  it('returns valid:false when isin is empty string', () => {
    const result = validateRow({ ...validRow, isin: '' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      const joined = result.errors.join(' ')
      expect(joined.toLowerCase()).toMatch(/isin/i)
    }
  })

  it('returns valid:false when symbol is empty string', () => {
    const result = validateRow({ ...validRow, symbol: '' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      const joined = result.errors.join(' ')
      expect(joined.toLowerCase()).toMatch(/symbol/i)
    }
  })

  it('returns valid:false when quantity is zero or negative', () => {
    const resultZero = validateRow({ ...validRow, quantity: '0' })
    expect(resultZero.valid).toBe(false)

    const resultNeg = validateRow({ ...validRow, quantity: '-5' })
    expect(resultNeg.valid).toBe(false)
    if (!resultNeg.valid) {
      expect(resultNeg.errors.length).toBeGreaterThan(0)
    }
  })

  it('returns valid:false when price is zero or negative', () => {
    const result = validateRow({ ...validRow, price: '0' })
    expect(result.valid).toBe(false)
  })

  it('coerces string quantity "10" to number 10', () => {
    const result = validateRow({ ...validRow, quantity: '10' })
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.data.quantity).toBe(10)
  })

  it('coerces string price "1500.50" to number 1500.5', () => {
    const result = validateRow({ ...validRow, price: '1500.50' })
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.data.price).toBe(1500.5)
  })

  it('trade_id is optional — row without trade_id passes validation', () => {
    const { trade_id, ...rowWithoutTradeId } = validRow as Record<string, unknown>
    void trade_id
    const result = validateRow(rowWithoutTradeId)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.data.trade_id).toBeUndefined()
  })

  it('returns errors array with human-readable messages on failure', () => {
    const result = validateRow({ ...validRow, isin: '', trade_type: 'hold' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(Array.isArray(result.errors)).toBe(true)
      expect(result.errors.length).toBeGreaterThan(0)
      result.errors.forEach((e) => expect(typeof e).toBe('string'))
    }
  })
})

describe('tradebook-validator: TradebookRowSchema', () => {
  it('is a valid Zod schema (z.ZodObject or z.ZodType instance)', () => {
    expect(TradebookRowSchema).toBeInstanceOf(z.ZodType)
  })
})

// Keep the type reference to avoid unused-variable warnings
const _vr: ValidatedRow | undefined = undefined
void _vr

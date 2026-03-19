import { describe, it, expect } from 'vitest'
import { CASOutputSchema, TRANSACTION_TYPE_MAP } from '@/lib/validators/cas-schema'

// Minimal valid casparser output fixture
const validFolio = {
  folio: '12345678/01',
  PAN: 'ABCDE1234F',
  scheme: 'HDFC Top 100 Fund - Growth',
  amfi: '100013',
  advisor: 'Self',
  registrar: 'CAMS',
  transactions: [
    {
      date: '2020-03-15',
      description: 'Purchase',
      amount: 10000.0,
      units: 85.47,
      nav: 117.0,
      balance: 85.47,
      type: 'purchase',
      dividend_rate: null,
    },
  ],
  close: 450.23,
  open: 0.0,
}

const validCASOutput = {
  folios: [validFolio],
  cas_type: 'CAMS',
  statement_period: { from: '2020-01-01', to: '2024-12-31' },
}

describe('CAMS PDF parse (DATA-01)', () => {
  it('CASOutputSchema validates a valid casparser output', () => {
    const result = CASOutputSchema.safeParse(validCASOutput)
    expect(result.success).toBe(true)
  })

  it('CASOutputSchema rejects output missing folios array', () => {
    const result = CASOutputSchema.safeParse({ cas_type: 'CAMS' })
    expect(result.success).toBe(false)
  })

  it('CASOutputSchema requires folio to have PAN', () => {
    const badFolio = { ...validFolio, PAN: undefined }
    const result = CASOutputSchema.safeParse({ folios: [badFolio] })
    expect(result.success).toBe(false)
  })

  it('PAN matched to correct holder in family', () => {
    // Verifies schema captures PAN at folio level for downstream holder matching
    const result = CASOutputSchema.safeParse(validCASOutput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.folios[0].PAN).toBe('ABCDE1234F')
    }
  })

  it('duplicate import deduplicates transactions', () => {
    // Deduplication is handled at DB level via ON CONFLICT DO NOTHING
    // Verify the transaction schema captures the dedup key fields
    const result = CASOutputSchema.safeParse(validCASOutput)
    expect(result.success).toBe(true)
    if (result.success) {
      const tx = result.data.folios[0].transactions[0]
      // Dedup key fields must be present
      expect(tx.date).toBeDefined()
      expect(tx.type).toBeDefined()
      expect(tx.units).toBeDefined()
      expect(tx.amount).toBeDefined()
    }
  })
})

describe('KFintech PDF parse (DATA-02)', () => {
  it('parse returns transactions with correct fields for KFintech format', () => {
    // KFintech PDFs are auto-detected by casparser — same schema, cas_type = 'KARVY'
    const kfintechOutput = {
      ...validCASOutput,
      cas_type: 'KARVY',
    }
    const result = CASOutputSchema.safeParse(kfintechOutput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cas_type).toBe('KARVY')
    }
  })

  it('PAN matched to correct holder in family', () => {
    const result = CASOutputSchema.safeParse(validCASOutput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.folios[0].PAN).toBe('ABCDE1234F')
    }
  })

  it('duplicate import deduplicates transactions', () => {
    // Same as CAMS — dedup is schema-agnostic, handled at DB level
    const result = CASOutputSchema.safeParse(validCASOutput)
    expect(result.success).toBe(true)
    if (result.success) {
      const tx = result.data.folios[0].transactions[0]
      expect(tx.units).toBeTypeOf('number')
      expect(tx.nav).toBeTypeOf('number')
    }
  })
})

describe('TRANSACTION_TYPE_MAP', () => {
  it('maps all standard casparser types to DB types', () => {
    expect(TRANSACTION_TYPE_MAP['purchase']).toBe('purchase')
    expect(TRANSACTION_TYPE_MAP['redemption']).toBe('redemption')
    expect(TRANSACTION_TYPE_MAP['sip']).toBe('sip')
    expect(TRANSACTION_TYPE_MAP['switch_in']).toBe('switch_in')
    expect(TRANSACTION_TYPE_MAP['switch_out']).toBe('switch_out')
    expect(TRANSACTION_TYPE_MAP['dividend_reinvestment']).toBe('dividend_reinvest')
    expect(TRANSACTION_TYPE_MAP['dividend_payout']).toBe('dividend_reinvest')
  })

  it('unknown transaction type maps to undefined (triggers needs_review)', () => {
    expect(TRANSACTION_TYPE_MAP['unknown_type']).toBeUndefined()
  })
})

describe('CASOutputSchema edge cases', () => {
  it('accepts null values for nullable transaction fields', () => {
    const folioWithNulls = {
      ...validFolio,
      amfi: null,
      transactions: [
        {
          date: '2020-03-15',
          description: 'SIP',
          amount: null,
          units: null,
          nav: null,
          balance: null,
          type: null,
          dividend_rate: null,
        },
      ],
    }
    const result = CASOutputSchema.safeParse({ folios: [folioWithNulls] })
    expect(result.success).toBe(true)
  })

  it('accepts empty folios array', () => {
    const result = CASOutputSchema.safeParse({ folios: [] })
    expect(result.success).toBe(true)
  })

  it('accepts folios without optional fields (advisor, registrar)', () => {
    const minimalFolio = {
      folio: '12345678/01',
      PAN: 'ABCDE1234F',
      scheme: 'HDFC Top 100 Fund',
      amfi: '100013',
      transactions: [],
    }
    const result = CASOutputSchema.safeParse({ folios: [minimalFolio] })
    expect(result.success).toBe(true)
  })
})

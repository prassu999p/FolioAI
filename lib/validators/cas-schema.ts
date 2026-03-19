import { z } from 'zod'

// Transaction type mapping: casparser type → DB transaction_type
export const TRANSACTION_TYPE_MAP: Record<string, string> = {
  purchase: 'purchase',
  redemption: 'redemption',
  sip: 'sip',
  switch_in: 'switch_in',
  switch_out: 'switch_out',
  dividend_reinvestment: 'dividend_reinvest',
  dividend_payout: 'dividend_reinvest', // treat as reinvest for ledger purposes
}

export const CASTransactionSchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.number().nullable(),
  units: z.number().nullable(),
  nav: z.number().nullable(),
  balance: z.number().nullable(),
  type: z.string().nullable(),
  dividend_rate: z.number().nullable(),
})

export const CASFolioSchema = z.object({
  folio: z.string(),
  PAN: z.string(),
  scheme: z.string(),
  amfi: z.string().nullable(), // AMFI scheme code as string
  advisor: z.string().optional(),
  registrar: z.string().optional(),
  transactions: z.array(CASTransactionSchema),
  close: z.number().optional(),
  open: z.number().optional(),
})

export const CASOutputSchema = z.object({
  folios: z.array(CASFolioSchema),
  cas_type: z.string().optional(), // "CAMS" or "KARVY"
  statement_period: z
    .object({
      from: z.string().nullable(),
      to: z.string().nullable(),
    })
    .optional(),
})

export type CASTransaction = z.infer<typeof CASTransactionSchema>
export type CASFolio = z.infer<typeof CASFolioSchema>
export type CASOutput = z.infer<typeof CASOutputSchema>

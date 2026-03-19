import { z } from 'zod'

// Transaction type mapping: casparser type → DB transaction_type
export const TRANSACTION_TYPE_MAP: Record<string, string> = {
  purchase: 'purchase',
  PURCHASE: 'purchase',
  PURCHASE_SIP: 'sip',
  redemption: 'redemption',
  REDEMPTION: 'redemption',
  sip: 'sip',
  SIP: 'sip',
  switch_in: 'switch_in',
  SWITCH_IN: 'switch_in',
  switch_out: 'switch_out',
  SWITCH_OUT: 'switch_out',
  dividend_reinvestment: 'dividend_reinvest',
  DIVIDEND_REINVESTMENT: 'dividend_reinvest',
  dividend_payout: 'dividend_reinvest',
  DIVIDEND_PAYOUT: 'dividend_reinvest',
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

export const CASSchemeSchema = z.object({
  scheme: z.string(),
  amfi: z.string().nullable().optional(),
  advisor: z.string().nullable().optional(),
  registrar: z.string().nullable().optional(),
  rta: z.string().nullable().optional(),
  rta_code: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  isin: z.string().nullable().optional(),
  transactions: z.array(CASTransactionSchema),
  close: z.union([z.number(), z.string()]).nullable().optional(),
  open: z.union([z.number(), z.string()]).nullable().optional(),
  close_calculated: z.union([z.number(), z.string()]).nullable().optional(),
  valuation: z.object({
    date: z.union([z.string(), z.date()]).nullable().optional(),
    nav: z.union([z.number(), z.string()]).nullable().optional(),
    cost: z.union([z.number(), z.string()]).nullable().optional(),
    value: z.union([z.number(), z.string()]).nullable().optional(),
  }).nullable().optional(),
  nominees: z.array(z.string()).optional(),
})

export const CASFolioSchema = z.object({
  folio: z.string(),
  PAN: z.string(),
  amc: z.string().optional(),
  KYC: z.string().optional(),
  PANKYC: z.string().optional(),
  schemes: z.array(CASSchemeSchema),
})

export const CASOutputSchema = z.object({
  folios: z.array(CASFolioSchema),
  cas_type: z.string().optional(),
  file_type: z.string().optional(),
  investor_info: z.record(z.unknown()).optional(),
  statement_period: z
    .object({
      from: z.string().nullable().optional(),
      to: z.string().nullable().optional(),
    })
    .optional(),
})

export type CASTransaction = z.infer<typeof CASTransactionSchema>
export type CASScheme = z.infer<typeof CASSchemeSchema>
export type CASFolio = z.infer<typeof CASFolioSchema>
export type CASOutput = z.infer<typeof CASOutputSchema>

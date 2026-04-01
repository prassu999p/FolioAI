/**
 * tradebook-validator.ts
 *
 * Validates a normalised tradebook row using Zod.
 * Assumes headers have already been normalised by tradebook-column-mapper.ts.
 *
 * Exports:
 *  - TradebookRowSchema: Zod schema for a single validated row
 *  - ValidatedRow: TypeScript type inferred from the schema
 *  - validateRow: function that validates a raw row and returns typed result
 */

import { z } from 'zod'

/**
 * Normalise trade_type values from various broker formats to 'buy' | 'sell'.
 */
function normaliseTradeType(val: unknown): string | null {
  if (typeof val !== 'string') return null
  const lower = val.trim().toLowerCase()
  if (lower === 'b' || lower === 'buy' || lower === 'purchase') return 'buy'
  if (lower === 's' || lower === 'sell') return 'sell'
  return null
}

/**
 * Zod schema that validates a single tradebook row after header normalisation.
 *
 * Each field handles the various raw formats brokers use:
 *  - trade_type: 'b'|'buy'|'purchase' → 'buy'; 's'|'sell' → 'sell'
 *  - exchange: uppercased to 'NSE' | 'BSE'
 *  - quantity/price: coerced from string to positive number
 *  - trade_id: optional (some brokers omit it)
 */
export const TradebookRowSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  isin: z.string().min(1, 'ISIN required'),
  trade_date: z.string().min(1, 'Trade date is required'),
  exchange: z
    .string()
    .transform((val) => val.trim().toUpperCase())
    .pipe(z.enum(['NSE', 'BSE'], { message: 'Exchange must be NSE or BSE' })),
  trade_type: z
    .unknown()
    .transform((val) => normaliseTradeType(val))
    .refine((val): val is 'buy' | 'sell' => val !== null, {
      message: "Trade type must be 'buy' or 'sell'",
    }),
  quantity: z.coerce.number().positive('Quantity must be a positive number'),
  price: z.coerce.number().positive('Price must be a positive number'),
  trade_id: z.string().optional(),
})

/**
 * TypeScript type for a successfully validated tradebook row.
 */
export type ValidatedRow = z.infer<typeof TradebookRowSchema>

/**
 * validateRow
 *
 * Validates a single normalised row against TradebookRowSchema.
 * Returns a discriminated union: { valid: true; data } | { valid: false; errors }.
 *
 * @param row - A normalised row (output of normaliseHeaders)
 * @returns Typed validation result
 */
export function validateRow(
  row: Record<string, unknown>
): { valid: true; data: ValidatedRow } | { valid: false; errors: string[] } {
  const result = TradebookRowSchema.safeParse(row)

  if (result.success) {
    return { valid: true, data: result.data }
  }

  const errors = result.error.errors.map((err) => {
    const path = err.path.length > 0 ? `${err.path.join('.')}: ` : ''
    return `${path}${err.message}`
  })

  return { valid: false, errors }
}

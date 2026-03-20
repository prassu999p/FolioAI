import type { HoldingRow, Transaction } from '@/lib/supabase/types'

export interface Cashflow {
  amount: number  // negative = outflow (purchase), positive = inflow (redemption + terminal value)
  date: Date
}

/**
 * Compute XIRR using Newton-Raphson iterative root-finding.
 * Same algorithm as Excel XIRR / LibreOffice Calc / nodejs-xirr.
 *
 * @param cashflows - Array of cashflows with amount and date. Purchases must be NEGATIVE.
 * @param guess - Initial guess for the rate (default 0.1 = 10%)
 * @returns Annual rate as a decimal (0.10 = 10%), or null if cannot converge
 */
export function computeXIRR(cashflows: Cashflow[], guess = 0.1): number | null {
  if (cashflows.length < 2) return null

  const hasPositive = cashflows.some(c => c.amount > 0)
  const hasNegative = cashflows.some(c => c.amount < 0)
  if (!hasPositive || !hasNegative) return null

  const t0 = cashflows[0].date.getTime()
  const years = (date: Date) => (date.getTime() - t0) / (365.25 * 24 * 3600 * 1000)

  let r = guess
  for (let i = 0; i < 100; i++) {
    let f = 0
    let df = 0
    for (const { amount, date } of cashflows) {
      const t = years(date)
      f  += amount / Math.pow(1 + r, t)
      df -= t * amount / Math.pow(1 + r, t + 1)
    }
    if (Math.abs(df) < 1e-12) return null  // derivative too small, won't converge
    const rNew = r - f / df
    if (Math.abs(rNew - r) < 1e-8) return rNew  // converged
    r = rNew
  }
  return null  // failed to converge in 100 iterations
}

/**
 * Compute gain/loss in absolute (₹) and percentage terms from a holding row.
 *
 * @returns { gainLoss: number | null, gainLossPct: number | null }
 *          null when current_value is not yet synced
 */
export function computeGainLoss(holding: HoldingRow): {
  gainLoss: number | null
  gainLossPct: number | null
} {
  if (holding.current_value === null) {
    return { gainLoss: null, gainLossPct: null }
  }
  const gainLoss = holding.current_value - holding.total_invested
  const gainLossPct = holding.total_invested > 0
    ? (gainLoss / holding.total_invested) * 100
    : null
  return { gainLoss, gainLossPct }
}

/**
 * Build the XIRR cashflow series for a portfolio.
 *
 * Sign convention (Pitfall 3):
 * - Purchases/SIPs/switch_in/dividend_reinvest → NEGATIVE (money out of investor's pocket)
 * - Redemptions/switch_out → POSITIVE (money returned to investor)
 * - Current portfolio value → POSITIVE terminal cashflow on today's date
 *
 * DB stores all amounts as positive — this function applies the sign convention.
 *
 * @param transactions - Raw transaction rows from DB
 * @param holdings - HoldingRow[] with current_value for each folio
 * @param today - Date to use as terminal cashflow date (typically new Date())
 * @returns Cashflow[] ready to pass to computeXIRR
 */
export function buildPortfolioCashflows(
  transactions: Transaction[],
  holdings: HoldingRow[],
  today: Date
): Cashflow[] {
  const outflowTypes = ['purchase', 'sip', 'switch_in', 'dividend_reinvest'] as const

  const cashflows: Cashflow[] = transactions.map(t => ({
    amount: outflowTypes.includes(t.transaction_type as typeof outflowTypes[number])
      ? -t.amount   // outflow: money leaving investor
      : +t.amount,  // inflow: redemption or switch_out
    date: new Date(t.transaction_date),
  }))

  // Add current portfolio value as terminal positive cashflow (as if selling today)
  const totalCurrentValue = holdings.reduce(
    (sum, h) => sum + (h.current_value ?? 0),
    0
  )
  cashflows.push({ amount: totalCurrentValue, date: today })

  return cashflows
}

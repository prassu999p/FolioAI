import { addMonths, parseISO, differenceInDays } from 'date-fns'
import type { Cashflow } from '@/lib/analytics/xirr'

export interface FolioTransaction {
  folio_id: string
  scheme_name: string
  transaction_type: string
  transaction_date: string  // ISO date string e.g. '2025-03-01'
  amount: number
}

export interface SIPSummary {
  folio_id: string
  scheme_name: string
  monthly_amount: number
  next_debit_date: Date
  sip_cashflows: Cashflow[]  // negated amounts (outflows) for XIRR computation
}

/**
 * Detect active SIPs from transaction history.
 *
 * Algorithm:
 * 1. Filter to last 90 days from today
 * 2. Group by folio_id
 * 3. For each folio: find recurring transactions with ~30-day cadence (25-35 day gaps)
 *    and similar amounts (within ±5% tolerance)
 * 4. If count >= 3, mark as active SIP
 * 5. Next debit date = addMonths(lastDate, 1) — uses date-fns to avoid month-end arithmetic errors
 * 6. Monthly amount = median of the qualifying amounts
 *
 * @param folioTransactions - All transaction rows to analyze (across multiple folios)
 * @param today - Reference date (default: new Date()). Injectable for testing.
 * @returns Array of SIPSummary for each detected active SIP folio
 */
export function detectActiveSIPs(
  folioTransactions: FolioTransaction[],
  today: Date = new Date()
): SIPSummary[] {
  // Step 1: Compute 90-day cutoff
  const cutoff = new Date(today.getTime() - 90 * 86400_000)

  // Step 2: Group by folio_id and filter to last 90 days
  const byFolio = new Map<string, FolioTransaction[]>()
  for (const tx of folioTransactions) {
    const txDate = parseISO(tx.transaction_date)
    if (txDate < cutoff) continue  // older than 90 days

    const existing = byFolio.get(tx.folio_id) ?? []
    existing.push(tx)
    byFolio.set(tx.folio_id, existing)
  }

  const results: SIPSummary[] = []

  // Step 3: For each folio, find recurring SIP-like transactions
  for (const [folio_id, txs] of byFolio) {
    if (txs.length === 0) continue

    // Sort by date ascending
    const sorted = [...txs].sort(
      (a, b) => parseISO(a.transaction_date).getTime() - parseISO(b.transaction_date).getTime()
    )

    // Find the longest run of transactions with ~30-day cadence and similar amounts
    const sipRun = findSIPRun(sorted)
    if (sipRun.length < 3) continue

    // Compute monthly amount as median of the run amounts
    const amounts = sipRun.map(tx => tx.amount).sort((a, b) => a - b)
    const median = amounts[Math.floor(amounts.length / 2)]

    // Next debit date: addMonths from the last transaction date
    const lastTx = sipRun[sipRun.length - 1]
    const lastDate = parseISO(lastTx.transaction_date)
    const next_debit_date = addMonths(lastDate, 1)

    // SIP cashflows: negated amounts (outflows from investor perspective)
    const sip_cashflows: Cashflow[] = sipRun.map(tx => ({
      amount: -tx.amount,  // negate: purchase = outflow
      date: parseISO(tx.transaction_date),
    }))

    results.push({
      folio_id,
      scheme_name: txs[0].scheme_name,
      monthly_amount: median,
      next_debit_date,
      sip_cashflows,
    })
  }

  return results
}

/**
 * Find the longest run of transactions with ~30-day cadence (25-35 days) and
 * similar amounts (within ±5% of the first transaction's amount in the run).
 *
 * Returns the qualifying transactions (may be a subset of input).
 * If no run of 3+ is found, returns an empty array.
 */
function findSIPRun(sortedTxs: FolioTransaction[]): FolioTransaction[] {
  if (sortedTxs.length < 3) return []

  let bestRun: FolioTransaction[] = []

  // Try each transaction as a potential run start
  for (let start = 0; start < sortedTxs.length; start++) {
    const run: FolioTransaction[] = [sortedTxs[start]]
    const baseAmount = sortedTxs[start].amount

    for (let i = start + 1; i < sortedTxs.length; i++) {
      const prev = run[run.length - 1]
      const curr = sortedTxs[i]

      const prevDate = parseISO(prev.transaction_date)
      const currDate = parseISO(curr.transaction_date)
      const gap = differenceInDays(currDate, prevDate)

      // Check cadence: 25-35 days
      if (gap < 25 || gap > 35) {
        // Gap too large or too small — if gap > 35, reset run
        if (gap > 35) break
        continue  // skip this transaction (same-day duplicate or too close)
      }

      // Check amount similarity: within ±5% of base amount
      const amountDiff = Math.abs(curr.amount - baseAmount) / baseAmount
      if (amountDiff > 0.05) continue  // amount varies too much

      run.push(curr)
    }

    if (run.length > bestRun.length) {
      bestRun = run
    }
  }

  return bestRun.length >= 3 ? bestRun : []
}

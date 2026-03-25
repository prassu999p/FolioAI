import type { ScoringSignals, AlphaInput } from './types'
import { computeXIRR } from '@/lib/analytics/xirr'
import type { Cashflow } from '@/lib/analytics/xirr'

/**
 * Build Nifty synthetic cashflows matching the same dates as fund transactions.
 * Same amounts invested but in Nifty index units; terminal cashflow uses current Nifty NAV.
 */
function computeNiftyXIRR(
  transactions: AlphaInput['transactions'],
  nifty50Daily: AlphaInput['nifty50Daily']
): number | null {
  if (transactions.length === 0) return null

  // Build a date→close map for fast lookup
  const niftyMap = new Map<string, number>()
  for (const { date, close } of nifty50Daily) {
    niftyMap.set(date, close)
  }

  const outflowTypes = new Set(['purchase', 'sip', 'switch_in', 'dividend_reinvest'])
  let totalNiftyUnits = 0
  const cashflows: Cashflow[] = []

  for (const tx of transactions) {
    // Find the Nifty close on this date (or the nearest available date within ±5 days)
    let niftyClose: number | undefined
    for (let offset = 0; offset <= 5; offset++) {
      const d = new Date(tx.transaction_date)
      d.setDate(d.getDate() + offset)
      const key = d.toISOString().slice(0, 10)
      if (niftyMap.has(key)) {
        niftyClose = niftyMap.get(key)
        break
      }
      if (offset > 0) {
        const d2 = new Date(tx.transaction_date)
        d2.setDate(d2.getDate() - offset)
        const key2 = d2.toISOString().slice(0, 10)
        if (niftyMap.has(key2)) {
          niftyClose = niftyMap.get(key2)
          break
        }
      }
    }

    if (!niftyClose) continue

    const sign = outflowTypes.has(tx.transaction_type) ? -1 : 1
    const niftyUnits = tx.amount / niftyClose

    if (sign < 0) {
      totalNiftyUnits += niftyUnits
    } else {
      totalNiftyUnits -= niftyUnits
    }

    cashflows.push({
      amount: sign * tx.amount,
      date: new Date(tx.transaction_date),
    })
  }

  if (cashflows.length === 0 || totalNiftyUnits <= 0) return null

  // Terminal cashflow: what the Nifty units are worth today
  const lastNiftyClose = nifty50Daily[nifty50Daily.length - 1].close
  const terminalValue = totalNiftyUnits * lastNiftyClose
  cashflows.push({
    amount: terminalValue,
    date: new Date(), // today
  })

  return computeXIRR(cashflows)
}

/**
 * Compute fund alpha: fund XIRR minus Nifty 50 XIRR over same period.
 * Returns null if insufficient data (< 90 days span).
 */
export function computeAlpha(input: AlphaInput): number | null {
  const { transactions, currentValue, nifty50Daily } = input

  if (transactions.length === 0) return null
  if (nifty50Daily.length === 0) return null

  // Check date span — require at least 90 days from first transaction to last transaction
  const dates = transactions.map(t => new Date(t.transaction_date).getTime())
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  const spanDays = (maxDate - minDate) / (1000 * 3600 * 24)
  if (spanDays < 90) return null

  // Build fund cashflows
  const outflowTypes = new Set(['purchase', 'sip', 'switch_in', 'dividend_reinvest'])
  const fundCashflows: Cashflow[] = transactions.map(t => ({
    amount: outflowTypes.has(t.transaction_type) ? -t.amount : +t.amount,
    date: new Date(t.transaction_date),
  }))

  // Add terminal cashflow for fund
  fundCashflows.push({ amount: currentValue, date: new Date() })

  const fundXIRR = computeXIRR(fundCashflows)
  if (fundXIRR === null) return null

  const niftyXIRR = computeNiftyXIRR(transactions, nifty50Daily)
  if (niftyXIRR === null) return null

  return fundXIRR - niftyXIRR
}

/**
 * Compute AUM trend from NAV × units over the last 6 months.
 * Returns 'insufficient_data' if fewer than 3 data points.
 */
export function computeAUMTrend(
  navHistory: Array<{ date: string; nav: number }>,
  units: number
): ScoringSignals['aum_trend'] {
  if (navHistory.length < 3) return 'insufficient_data'

  const firstAUM = navHistory[0].nav * units
  const lastAUM = navHistory[navHistory.length - 1].nav * units

  if (firstAUM === 0) return 'insufficient_data'

  const changePct = (lastAUM - firstAUM) / firstAUM

  if (changePct > 0.1) return 'growing'
  if (changePct < -0.1) return 'declining'
  return 'stable'
}

/**
 * Rule-based quality score 0-100 from weighted signals.
 * Weights: alpha 50%, expense ratio rank 30%, AUM stability 20%.
 * Claude does NOT produce this number.
 */
export function computeQualityScore(signals: ScoringSignals): number {
  // Alpha component: alpha_pct * 100 clamped 0-100; null → 50
  let alphaComponent: number
  if (signals.alpha_pct === null) {
    alphaComponent = 50
  } else {
    // alpha_pct is a decimal (e.g. 0.05 = 5% outperformance)
    // Scale: 0.10 alpha → 100 pts, -0.10 alpha → 0 pts; linear between
    const scaled = (signals.alpha_pct + 0.10) / 0.20 * 100
    alphaComponent = Math.max(0, Math.min(100, scaled))
  }

  // Expense ratio component per tier
  let expenseComponent: number
  if (signals.expense_ratio === null) {
    expenseComponent = 50
  } else {
    const er = signals.expense_ratio
    if (er < 0.5) expenseComponent = 100
    else if (er < 1.0) expenseComponent = 80
    else if (er < 1.5) expenseComponent = 60
    else if (er < 2.0) expenseComponent = 40
    else expenseComponent = 20
  }

  // AUM stability component
  const aumComponentMap: Record<ScoringSignals['aum_trend'], number> = {
    growing: 100,
    stable: 75,
    declining: 25,
    insufficient_data: 50,
  }
  const aumComponent = aumComponentMap[signals.aum_trend]

  const weightedSum =
    alphaComponent * 0.5 +
    expenseComponent * 0.3 +
    aumComponent * 0.2

  return Math.round(Math.max(0, Math.min(100, weightedSum)))
}

import {
  computeXIRR,
  buildPortfolioCashflows,
  computeGainLoss,
  type Cashflow,
} from '@/lib/analytics/xirr'
import type { AnalyticsTransaction, HoldingRowWithAnalytics } from '@/lib/supabase/types'
import type { Transaction } from '@/lib/supabase/types'

const formatINR = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

interface SummaryCardsProps {
  holderId: string
  period: string
  transactions: AnalyticsTransaction[]
  holdings: HoldingRowWithAnalytics[]
  nifty50Xirr?: number | null
  viewMode?: 'xirr' | 'absolute' | 'benchmark' | null
}

/**
 * Map AnalyticsTransaction rows (from RPC) into Transaction shape for buildPortfolioCashflows.
 * The only field used by buildPortfolioCashflows is transaction_type, amount, and transaction_date.
 */
function toTransactions(rows: AnalyticsTransaction[]): Transaction[] {
  const validTypes = ['purchase', 'redemption', 'switch_in', 'switch_out', 'sip', 'dividend_reinvest'] as const
  type ValidType = typeof validTypes[number]

  return rows.map((r) => ({
    id: `${r.folio_id}-${r.transaction_date}`,
    folio_id: r.folio_id,
    transaction_date: r.transaction_date,
    transaction_type: (validTypes.includes(r.transaction_type as ValidType)
      ? r.transaction_type
      : 'purchase') as ValidType,
    units: r.units,
    nav: r.nav,
    amount: r.amount,
    import_status: 'clean' as const,
    source: 'cas_import' as const,
    created_at: r.transaction_date,
  }))
}

export function SummaryCards({
  transactions,
  holdings,
  nifty50Xirr = null,
  viewMode = null,
}: SummaryCardsProps) {
  const today = new Date()

  // Compute portfolio-level totals
  // For holdings without current_value (NAV not synced), use total_invested as fallback
  const total_aum = holdings.reduce((sum, h) => {
    const value = h.current_value ?? h.total_invested ?? 0
    return sum + value
  }, 0)
  const total_invested = holdings.reduce((sum, h) => sum + h.total_invested, 0)

  // Gain/loss aggregated from per-holding computeGainLoss
  let total_gain_loss = 0
  for (const holding of holdings) {
    const { gainLoss } = computeGainLoss(holding)
    total_gain_loss += gainLoss ?? 0
  }
  const gain_loss_pct =
    total_invested > 0 ? (total_gain_loss / total_invested) * 100 : 0

  // XIRR: build cashflow series from transactions + terminal value
  const txRows = toTransactions(transactions)
  const cashflows: Cashflow[] = buildPortfolioCashflows(txRows, holdings, today)
  const xirr = computeXIRR(cashflows)

  // Helper to get card prominence classes based on viewMode
  const cardActive = (card: 'aum' | 'invested' | 'absolute' | 'xirr') => {
    if (!viewMode) return '' // no mode selected — all cards at normal prominence
    const match =
      (card === 'xirr' && viewMode === 'xirr') ||
      (card === 'absolute' && viewMode === 'absolute') ||
      ((card === 'aum' || card === 'xirr') && viewMode === 'benchmark')
    return match ? 'ring-2 ring-secondary' : 'opacity-60'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Card 1: Total AUM — left accent border */}
      <div className={`bg-surface-container-lowest p-8 rounded-2xl shadow-sm border-l-4 border-primary hover:bg-surface-container transition-colors ${cardActive('aum')}`}>
        <p className="text-on-surface-variant text-sm font-medium mb-1">Total AUM</p>
        <h3 className="text-3xl font-extrabold tabular-nums text-primary tracking-tight font-headline">
          {formatINR(total_aum)}
        </h3>
        <div className="mt-4 flex items-center text-secondary font-bold text-sm">
          <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
          {gain_loss_pct > 0 ? '+' : ''}{gain_loss_pct.toFixed(1)}% overall
        </div>
      </div>

      {/* Card 2: Total Invested */}
      <div className={`bg-surface-container-lowest p-8 rounded-2xl shadow-sm hover:bg-surface-container transition-colors ${cardActive('invested')}`}>
        <p className="text-on-surface-variant text-sm font-medium mb-1">Total Invested</p>
        <h3 className="text-3xl font-extrabold tabular-nums text-primary tracking-tight font-headline">
          {formatINR(total_invested)}
        </h3>
      </div>

      {/* Card 3: Absolute Gain */}
      <div className={`bg-surface-container-lowest p-8 rounded-2xl shadow-sm hover:bg-surface-container transition-colors ${cardActive('absolute')}`}>
        <p className="text-on-surface-variant text-sm font-medium mb-1">Absolute Gain</p>
        <h3 className={`text-3xl font-extrabold tabular-nums tracking-tight font-headline ${total_gain_loss >= 0 ? 'text-secondary' : 'text-error'}`}>
          {formatINR(total_gain_loss)}
        </h3>
        <div className="mt-4 flex items-center bg-secondary-container/30 text-on-secondary-container px-2 py-1 rounded text-xs font-bold w-fit">
          {gain_loss_pct.toFixed(2)}%
        </div>
      </div>

      {/* Card 4: XIRR — right accent border + mini bar */}
      <div className={`bg-surface-container-lowest p-8 rounded-2xl shadow-sm border-r-4 border-secondary-fixed hover:bg-surface-container transition-colors ${cardActive('xirr')}`}>
        <p className="text-on-surface-variant text-sm font-medium mb-1">XIRR (Annualized)</p>
        <h3 className="text-3xl font-extrabold tabular-nums text-primary tracking-tight font-headline">
          {xirr !== null ? `${(xirr * 100).toFixed(2)}%` : '—'}
        </h3>
        {/* Benchmark comparison below XIRR value */}
        {nifty50Xirr !== null && (
          <p className="mt-2 text-xs text-on-surface-variant">
            vs Nifty 50:{' '}
            <span className="font-bold text-primary">{(nifty50Xirr * 100).toFixed(2)}%</span>
          </p>
        )}
        <div className="mt-4 h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
          <div
            className="h-full bg-secondary rounded-full"
            style={{ width: `${Math.min(Math.max((xirr ?? 0) * 100 / 30 * 100, 0), 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

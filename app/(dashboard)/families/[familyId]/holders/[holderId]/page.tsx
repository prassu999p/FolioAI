import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { HoldingsTable } from '@/components/holdings/holdings-table'
import { SummaryCards } from '@/components/analytics/summary-cards'
import { SipSection } from '@/components/analytics/sip-section'
import { AllocationSection } from '@/components/analytics/allocation-section'
import { AIPortfolioHealth } from '@/components/ai/ai-portfolio-health'
import { RefreshScoresButton } from '@/components/ai/refresh-scores-button'
import { GenerateReviewButton } from '@/components/ai/generate-review-button'
import { getPeriodBounds } from '@/lib/analytics/period-utils'
import type { HoldingRow, HoldingRowWithAnalytics, AnalyticsTransaction, Transaction } from '@/lib/supabase/types'
import type { FundScore } from '@/lib/ai/types'
import { computeXIRR, computeGainLoss } from '@/lib/analytics/xirr'

interface HolderHoldingsPageProps {
  params: Promise<{ familyId: string; holderId: string }>
  searchParams: Promise<{ period?: string; view?: string }>
}

export default async function HolderHoldingsPage({ params, searchParams }: HolderHoldingsPageProps) {
  const { familyId, holderId } = await params
  const { period: periodParam, view: viewParam } = await searchParams
  const period = periodParam ?? 'all'
  const view = (viewParam ?? null) as 'xirr' | 'absolute' | 'benchmark' | null

  const supabase = await createClient()

  // Fetch holder info
  const { data: holderData } = await supabase
    .from('holders')
    .select('id, name, pan, is_primary')
    .eq('id', holderId)
    .single()
  const holder = holderData as { id: string; name: string; pan: string; is_primary: boolean } | null

  // Compute period bounds for RPC calls
  const bounds = getPeriodBounds(period)
  const startDateStr = bounds ? bounds.start.toISOString().split('T')[0] : null
  const endDateStr = bounds ? bounds.end.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]

  // Fetch holdings and transactions in parallel
  // NOTE: For XIRR calculation, we need ALL historical transactions (not period-filtered).
  // Period-filtered transactions are used for display and gain/loss calculations only.

  const [holdingsResult, stockHoldingsResult, allTransactionsResult, periodTransactionsResult] = await Promise.all([
    // Fetch mutual fund holdings via RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_holder_holdings', {
      p_holder_id: holderId,
    }),
    // Fetch stock holdings (from tradebook imports)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('stock_holdings')
      .select('*')
      .eq('holder_id', holderId),
    // Fetch ALL historical transactions for XIRR calculation (no period filter)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_holder_analytics_transactions', {
      p_holder_id: holderId,
      p_start_date: null,  // No period filter
      p_end_date: new Date().toISOString().split('T')[0],
    }),
    // Fetch period-filtered transactions for display and gain/loss
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_holder_analytics_transactions', {
      p_holder_id: holderId,
      p_start_date: startDateStr,
      p_end_date: endDateStr,
    }),
  ])

  if (holdingsResult.error) {
    return (
      <div className="px-12 py-8">
        <p className="text-error text-sm">
          Failed to load holdings: {holdingsResult.error.message}
        </p>
      </div>
    )
  }

  const rawHoldings: HoldingRow[] = holdingsResult.data ?? []
  // Stock holdings from tradebook imports
  const stockHoldings = stockHoldingsResult.error ? [] : (stockHoldingsResult.data ?? [])
  // Use ALL historical transactions for XIRR calculation, period-filtered for display/gain-loss
  const allTransactions: AnalyticsTransaction[] = allTransactionsResult.error
    ? []
    : (allTransactionsResult.data ?? [])
  const transactions: AnalyticsTransaction[] = periodTransactionsResult.error
    ? []
    : (periodTransactionsResult.data ?? [])

  // Create combined holdings for AUM (includes both mutual funds and stocks)
  // Convert stock holdings to have a current_value for AUM calculation
  const stockHoldingsForAUM = (stockHoldings as Array<any>).map((holding: any) => {
    const qty = Number(holding.quantity || 0)
    const lastPrice = Number(holding.last_price || holding.average_price || 0)
    const currentValue = qty * lastPrice
    return {
      ...holding,
      current_value: currentValue,
      total_invested: qty * Number(holding.average_price || 0),
    }
  })

  // Map holdings to HoldingRowWithAnalytics with per-holding XIRR computation
  const validTxTypes = ['purchase', 'redemption', 'switch_in', 'switch_out', 'sip', 'dividend_reinvest'] as const
  type ValidTxType = typeof validTxTypes[number]
  const toHoldingTransaction = (r: AnalyticsTransaction): Transaction => ({
    id: `${r.folio_id}-${r.transaction_date}`,
    folio_id: r.folio_id,
    transaction_date: r.transaction_date,
    transaction_type: (validTxTypes.includes(r.transaction_type as ValidTxType)
      ? r.transaction_type : 'purchase') as ValidTxType,
    units: r.units, nav: r.nav, amount: r.amount,
    import_status: 'clean' as const, source: 'cas_import' as const,
    created_at: r.transaction_date,
  })

  const today = new Date()
  const outflowTypes = new Set(['purchase', 'sip', 'switch_in', 'dividend_reinvest'])
  const holdingsWithAnalytics: HoldingRowWithAnalytics[] = rawHoldings.map((h) => {
    // Filter transactions to this holding's folio only (use allTransactions for XIRR)
    const folioTxs = allTransactions
      .filter(t => t.folio_id === h.folio_id)
      .map(toHoldingTransaction)

    // Build cashflow series: outflows (purchases) + terminal value (current value as of today)
    // Sign convention: purchases → negative, terminal value → positive
    const cashflows = [
      ...folioTxs.map(t => ({
        amount: outflowTypes.has(t.transaction_type) ? -t.amount : +t.amount,
        date: new Date(t.transaction_date),
      })),
      // Terminal cashflow: current value of this holding as of today
      { amount: h.current_value ?? 0, date: today },
    ]

    const xirr = cashflows.length >= 2 ? computeXIRR(cashflows) : null
    const { gainLoss, gainLossPct } = computeGainLoss(h)

    return { ...h, gain_loss: gainLoss, gain_loss_pct: gainLossPct, xirr }
  })

  // --- Nifty 50 benchmark XIRR (PERF-03) ---
  // Build synthetic benchmark cashflows: for each portfolio purchase (outflow),
  // buy equivalent "units" of Nifty 50 at its close price on that date.
  // Terminal value: sell those units at the most recent Nifty 50 close.
  // This produces the XIRR you would have earned investing the same amounts in Nifty 50.
  // NOTE: Use allTransactions (not period-filtered) for benchmark calculation

  let benchmarkXirr: number | null = null

  const purchaseTxs = allTransactions.filter(t => outflowTypes.has(t.transaction_type))

  if (purchaseTxs.length > 0) {
    // Find the earliest purchase date to bound the Nifty 50 query
    const sortedDates = [...purchaseTxs].sort((a, b) =>
      a.transaction_date.localeCompare(b.transaction_date)
    )
    const earliestDate = sortedDates[0].transaction_date  // 'YYYY-MM-DD'

    // Fetch Nifty 50 close prices from earliest purchase date onwards
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: niftyData } = await (supabase as any)
      .from('nifty50_daily')
      .select('nav_date, close')
      .gte('nav_date', earliestDate)
      .order('nav_date', { ascending: true })

    const niftyRows: Array<{ nav_date: string; close: number }> = niftyData ?? []

    if (niftyRows.length >= 2) {
      // Build a date → close lookup for quick access
      const niftyMap = new Map<string, number>()
      for (const row of niftyRows) {
        niftyMap.set(row.nav_date, Number(row.close))
      }

      // Helper: find the nearest available Nifty 50 close for a given date string
      // Searches forward up to 5 trading days to skip weekends/holidays
      const getNearestClose = (dateStr: string): number | null => {
        for (let offset = 0; offset <= 5; offset++) {
          const d = new Date(dateStr)
          d.setDate(d.getDate() + offset)
          const key = d.toISOString().split('T')[0]
          if (niftyMap.has(key)) return niftyMap.get(key)!
        }
        return null
      }

      // For each purchase, compute how many Nifty "units" that amount buys
      let totalUnits = 0
      const validPurchaseTxs: AnalyticsTransaction[] = []

      for (const tx of purchaseTxs) {
        const close = getNearestClose(tx.transaction_date)
        if (close === null || close <= 0) continue
        const units = tx.amount / close
        totalUnits += units
        validPurchaseTxs.push(tx)
      }

      // Terminal value: total units × most recent Nifty close
      const latestClose = Number(niftyRows[niftyRows.length - 1].close)
      const terminalValue = totalUnits * latestClose
      const terminalDate = new Date(niftyRows[niftyRows.length - 1].nav_date)

      if (validPurchaseTxs.length > 0 && terminalValue > 0) {
        const benchmarkCashflows = [
          // Outflows: original investment amounts (negative)
          ...validPurchaseTxs.map(tx => ({ amount: -tx.amount, date: new Date(tx.transaction_date) })),
          // Terminal inflow: current value of benchmark portfolio
          { amount: terminalValue, date: terminalDate },
        ]

        benchmarkXirr = computeXIRR(benchmarkCashflows)
      }
    }
  }

  // Fetch fund categories for AllocationSection
  const schemeCodes = rawHoldings.map(h => h.scheme_code)
  let fundCategories: Record<number, string> = {}
  if (schemeCodes.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fundsData } = await (supabase as any)
      .from('funds')
      .select('scheme_code, category')
      .in('scheme_code', schemeCodes)
    fundCategories = Object.fromEntries(
      ((fundsData ?? []) as Array<{ scheme_code: number; category: string | null }>).map(
        f => [f.scheme_code, f.category ?? '']
      )
    )
  }

  // Fetch AI scores for this holder from fund_ai_scores cache
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: aiScoresData } = await (supabase as any)
    .from('fund_ai_scores')
    .select('*')
    .eq('holder_id', holderId)
  const rawAiScores: FundScore[] = aiScoresData ?? []

  // Merge scheme_name into each score from holdings data (join by scheme_code)
  const schemeNameMap = new Map<number, string>(
    rawHoldings.map(h => [h.scheme_code, h.scheme_name])
  )
  const aiScores = rawAiScores.map(score => ({
    ...score,
    scheme_name: schemeNameMap.get(score.scheme_code) ?? `Fund ${score.scheme_code}`,
  }))

  // Last synced: use the oldest nav date across holdings
  const navDates = rawHoldings
    .map(h => h.current_nav_date)
    .filter((d): d is string => d !== null)
  const oldestNavDate = navDates.length > 0 ? navDates.sort()[0] : null
  const lastSyncedLabel = oldestNavDate
    ? new Date(oldestNavDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Not synced'

  return (
    <>
      {/* Sticky header */}
      <header className="flex justify-between items-center w-full px-12 py-6 bg-surface sticky top-0 z-30">
        <nav className="flex items-center text-sm font-medium text-on-surface-variant">
          <a href={`/families/${familyId}`} className="hover:text-primary cursor-pointer">Family Dashboard</a>
          <span className="material-symbols-outlined text-xs mx-2">chevron_right</span>
          <span className="text-primary font-bold">{holder?.name ?? 'Holder'}</span>
        </nav>
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-highest/30 text-primary font-bold rounded-lg border border-outline-variant/20 hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined">add</span>
              Add Manual Holding
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 transition-all">
              <span className="material-symbols-outlined">download</span>
              Export Statement
            </button>
          </div>
          <div className="h-8 w-px bg-outline-variant/30" />
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer">notifications</span>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer">settings</span>
          </div>
        </div>
      </header>

      <div className="px-12 pb-12">
        {/* Hero section */}
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="text-4xl font-extrabold text-primary tracking-tight font-headline">
              {holder?.name ?? 'Holder'}
            </h2>
            <p className="text-on-surface-variant mt-2 max-w-lg">
              {holder?.is_primary ? 'Primary portfolio holder' : 'Portfolio holder'} — managed by FolioAI
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-on-surface-variant block uppercase tracking-tighter">Last Synced</span>
            <span className="font-bold text-primary">{lastSyncedLabel}</span>
          </div>
        </div>

        {/* Bento summary cards */}
        <div className="mb-12">
          <SummaryCards
            holderId={holderId}
            period={period}
            transactions={allTransactions}
            holdings={[...holdingsWithAnalytics, ...stockHoldingsForAUM] as any}
            nifty50Xirr={benchmarkXirr}
            viewMode={view}
          />
        </div>

        {/* 2/3 holdings + 1/3 sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            {/* Mutual fund holdings */}
            <HoldingsTable
                holdings={holdingsWithAnalytics}
                fundCategories={fundCategories}
                transactions={transactions}
              />

            {/* Stock holdings from tradebook imports */}
            {stockHoldings.length > 0 && (
              <div className="mt-12">
                <h3 className="text-lg font-bold text-primary mb-6">Stock Holdings</h3>
                <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest overflow-y-auto" style={{ maxHeight: '60vh' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                    <thead className="bg-surface-container text-on-surface text-sm font-semibold">
                      <tr>
                        <th className="px-6 py-4 text-left">Symbol</th>
                        <th className="px-6 py-4 text-left">ISIN</th>
                        <th className="px-6 py-4 text-right">Quantity</th>
                        <th className="px-6 py-4 text-right">Avg Price (₹)</th>
                        <th className="px-6 py-4 text-right">Invested (₹)</th>
                        <th className="px-6 py-4 text-right">Current Value (₹)</th>
                        <th className="px-6 py-4 text-right">Gain/Loss %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {(stockHoldings as Array<any>).map((holding: any) => {
                        const qty = Number(holding.quantity || 0)
                        const avgPrice = Number(holding.average_price || 0)
                        const lastPrice = Number(holding.last_price || avgPrice)
                        const invested = qty * avgPrice
                        const currentValue = qty * lastPrice
                        const gainLoss = currentValue - invested
                        const gainLossPct = invested > 0 ? (gainLoss / invested) * 100 : 0
                        const isPositive = gainLoss >= 0

                        return (
                          <tr key={holding.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-on-surface">{holding.tradingsymbol}</td>
                            <td className="px-6 py-4 text-sm text-on-surface-variant">{holding.isin}</td>
                            <td className="px-6 py-4 text-right text-on-surface tabular-nums">{qty.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right text-on-surface tabular-nums">₹{avgPrice.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right text-on-surface tabular-nums">₹{invested.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right text-on-surface tabular-nums">₹{currentValue.toFixed(2)}</td>
                            <td className={`px-6 py-4 text-right font-semibold tabular-nums ${isPositive ? 'text-secondary' : 'text-error'}`}>
                              {isPositive ? '+' : ''}{gainLossPct.toFixed(2)}%
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-8">
            <SipSection transactions={allTransactions} />
            <AIPortfolioHealth scores={aiScores} holderName={holder?.name ?? ''} />
            <RefreshScoresButton holderId={holderId} />
            <GenerateReviewButton holderId={holderId} hasExisting={false} />
          </div>
        </div>

        {/* Asset allocation — full width below the grid */}
        <AllocationSection
          holderId={holderId}
          holdings={holdingsWithAnalytics}
          fundCategories={fundCategories}
        />
      </div>
    </>
  )
}

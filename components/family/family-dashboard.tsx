import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computeXIRR } from '@/lib/analytics/xirr'
import { mapCategoryToAssetClass } from '@/lib/analytics/asset-class-mapper'
import type { HoldingRow, AnalyticsTransaction, Transaction } from '@/lib/supabase/types'

const formatINR = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

interface HolderWithAUM {
  id: string
  name: string
  pan: string
  role: string              // 'Primary Holder' | 'Joint Holder' | 'Minor'
  totalCurrentValue: number | null
  totalInvested: number
  oldestNavDate: string | null
  xirr: number | null       // per-holder XIRR
}

interface FamilyDashboardProps {
  familyId: string
}

// Mask PAN: show only last 4 chars
function maskPAN(pan: string): string {
  return pan.length >= 4 ? `XXXXXX${pan.slice(-4)}` : pan
}

// Convert AnalyticsTransaction to Transaction type
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

const outflowTypes = new Set(['purchase', 'sip', 'switch_in', 'dividend_reinvest'])

// Build cashflows for a holder from their transactions and total current value
function buildHolderCashflows(
  transactions: Transaction[],
  totalCurrentValue: number,
  today: Date
) {
  const cashflows = [
    ...transactions.map(t => ({
      amount: outflowTypes.has(t.transaction_type) ? -t.amount : +t.amount,
      date: new Date(t.transaction_date),
    })),
    { amount: totalCurrentValue, date: today },
  ]
  return cashflows
}

// Avatar background cycle
const avatarBgs = [
  'bg-primary-container text-on-primary',
  'bg-secondary text-on-primary',
  'bg-surface-container-highest text-primary',
]

export async function FamilyDashboard({ familyId }: FamilyDashboardProps) {
  const supabase = await createClient()

  // Fetch family info with holders (including is_primary and pan_unmatched for role)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: family } = await (supabase.from('families') as any)
    .select('id, name, holders(id, name, pan, is_primary, pan_unmatched)')
    .eq('id', familyId)
    .single() as {
      data: {
        id: string
        name: string
        holders: Array<{ id: string; name: string; pan: string; is_primary: boolean; pan_unmatched: boolean }>
      } | null
    }

  if (!family) {
    return <p className="text-on-surface-variant">Family not found.</p>
  }

  const today = new Date()
  const endDateStr = today.toISOString().split('T')[0]

  // For each holder: fetch holdings + transactions in parallel, compute per-holder XIRR
  const holdersWithAUM: HolderWithAUM[] = await Promise.all(
    family.holders.map(async (holder, _index) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [holdingsResult, txResult] = await Promise.all([
        (supabase as any).rpc('get_holder_holdings', { p_holder_id: holder.id }),
        (supabase as any).rpc('get_holder_analytics_transactions', {
          p_holder_id: holder.id,
          p_start_date: null,
          p_end_date: endDateStr,
        }),
      ])

      const holdings: HoldingRow[] = holdingsResult.data ?? []
      const rawTxs: AnalyticsTransaction[] = txResult.error ? [] : (txResult.data ?? [])
      const transactions = rawTxs.map(toHoldingTransaction)

      const hasNavData = holdings.some(h => h.current_value !== null)
      const totalCurrentValue = hasNavData
        ? holdings.reduce((sum, h) => sum + (h.current_value ?? 0), 0)
        : null
      const totalInvested = holdings.reduce((sum, h) => sum + h.total_invested, 0)

      const navDates = holdings
        .map(h => h.current_nav_date)
        .filter((d): d is string => d !== null)
      const oldestNavDate = navDates.length > 0 ? navDates.sort()[0] : null

      // Compute per-holder XIRR
      let xirr: number | null = null
      if (totalCurrentValue !== null && transactions.length > 0) {
        const cashflows = buildHolderCashflows(transactions, totalCurrentValue, today)
        xirr = cashflows.length >= 2 ? computeXIRR(cashflows) : null
      }

      // Derive role
      let role = 'Joint Holder'
      if (holder.is_primary) role = 'Primary Holder'
      else if (holder.pan_unmatched) role = 'Minor'

      return {
        id: holder.id,
        name: holder.name,
        pan: holder.pan,
        role,
        totalCurrentValue,
        totalInvested,
        oldestNavDate,
        xirr,
      }
    })
  )

  // Total AUM — only if all holders have nav data
  const allHaveNav = holdersWithAUM.every(h => h.totalCurrentValue !== null)
  const totalAUM = allHaveNav
    ? holdersWithAUM.reduce((sum, h) => sum + (h.totalCurrentValue ?? 0), 0)
    : null

  // Family-total aggregates
  const familyTotalInvested = holdersWithAUM.reduce((sum, h) => sum + h.totalInvested, 0)
  const familyGainLoss = totalAUM !== null ? totalAUM - familyTotalInvested : null
  const familyGainLossPct =
    familyGainLoss !== null && familyTotalInvested > 0
      ? (familyGainLoss / familyTotalInvested) * 100
      : null

  // Oldest nav date across all holders
  const allNavDates = holdersWithAUM
    .map(h => h.oldestNavDate)
    .filter((d): d is string => d !== null)
  const oldestNavDate = allNavDates.length > 0 ? allNavDates.sort()[0] : null

  // Compute family-level XIRR by aggregating all holder transactions
  // We fetch fresh all-holder transactions for family-level computation
  let familyXirr: number | null = null
  {
    try {
      const allFamilyTxArrays = await Promise.all(
        family.holders.map(async (holder) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = await (supabase as any).rpc('get_holder_analytics_transactions', {
            p_holder_id: holder.id,
            p_start_date: null,
            p_end_date: endDateStr,
          })
          if (error) return null
          return (data ?? []) as AnalyticsTransaction[]
        })
      )

      if (allFamilyTxArrays.every(arr => arr !== null)) {
        const allTxs = allFamilyTxArrays.flat().map(t => toHoldingTransaction(t as AnalyticsTransaction))
        const terminalValue = totalAUM ?? 0
        if (allTxs.length > 0 && terminalValue > 0) {
          const familyCashflows = buildHolderCashflows(allTxs, terminalValue, today)
          familyXirr = familyCashflows.length >= 2 ? computeXIRR(familyCashflows) : null
        }
      }
    } catch {
      familyXirr = null
    }
  }

  // Compute asset allocation from all holders' holdings
  // Gather all holdings across holders
  const allHoldingsResult = await Promise.all(
    family.holders.map(async (holder) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).rpc('get_holder_holdings', { p_holder_id: holder.id })
      return (data ?? []) as HoldingRow[]
    })
  )
  const allHoldings = allHoldingsResult.flat()

  // Fetch fund categories for all holdings
  const allSchemeCodes = [...new Set(allHoldings.map(h => h.scheme_code))]
  let fundCategoryMap: Record<number, string> = {}
  if (allSchemeCodes.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fundsData } = await (supabase as any)
      .from('funds')
      .select('scheme_code, category')
      .in('scheme_code', allSchemeCodes)
    fundCategoryMap = Object.fromEntries(
      ((fundsData ?? []) as Array<{ scheme_code: number; category: string | null }>).map(
        f => [f.scheme_code, f.category ?? '']
      )
    )
  }

  // Aggregate allocation by value
  const allocationByValue = { equity: 0, debt: 0, gold: 0, international: 0 }
  for (const h of allHoldings) {
    if (h.current_value !== null) {
      const category = fundCategoryMap[h.scheme_code] ?? ''
      const assetClass = mapCategoryToAssetClass(category)
      allocationByValue[assetClass] += h.current_value
    }
  }

  const totalAllocated = Object.values(allocationByValue).reduce((s, v) => s + v, 0)

  // Allocation percentages
  const equityPct = totalAllocated > 0 ? allocationByValue.equity / totalAllocated : 0
  const intlPct = totalAllocated > 0 ? allocationByValue.international / totalAllocated : 0
  const debtPct = totalAllocated > 0 ? allocationByValue.debt / totalAllocated : 0
  const goldPct = totalAllocated > 0 ? allocationByValue.gold / totalAllocated : 0
  const combinedEquityPct = equityPct + intlPct

  // SVG donut segments (circumference = 2π × 90 ≈ 565.48)
  const CIRC = 565.48
  const domEquityOffset = CIRC * (1 - equityPct)
  const intlEquityOffset = CIRC * (1 - intlPct)
  const debtOffset = CIRC * (1 - debtPct)
  const goldOffset = CIRC * (1 - goldPct)

  // Cumulative rotations for segments
  const intlRotationDeg = equityPct * 360
  const debtRotationDeg = intlRotationDeg + intlPct * 360
  const goldRotationDeg = debtRotationDeg + debtPct * 360

  // Top 2 performing funds by absolute return
  interface TopFund {
    schemeName: string
    category: string
    absoluteReturn: number
  }
  const topFunds: TopFund[] = allHoldings
    .filter(h => h.current_value !== null && h.total_invested > 0)
    .map(h => ({
      schemeName: h.scheme_name,
      category: fundCategoryMap[h.scheme_code] ?? 'Equity',
      absoluteReturn: ((h.current_value! - h.total_invested) / h.total_invested) * 100,
    }))
    .sort((a, b) => b.absoluteReturn - a.absoluteReturn)
    .slice(0, 2)

  // Recent Activity: query transactions for this family
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentTxData } = await (supabase as any)
    .from('transactions')
    .select('id, transaction_type, amount, transaction_date, folios!inner(holder_id, holders!inner(family_id, name))')
    .eq('folios.holders.family_id', familyId)
    .order('transaction_date', { ascending: false })
    .limit(5)

  interface ActivityItem {
    type: 'sip' | 'cas_import' | 'purchase' | 'redemption'
    title: string
    description: string
    timestamp: string
  }

  const recentActivity: ActivityItem[] = ((recentTxData ?? []) as Array<{
    id: string
    transaction_type: string
    amount: number
    transaction_date: string
    folios: { holder_id: string; holders: { family_id: string; name: string } }
  }>).map(tx => {
    const isSip = tx.transaction_type === 'sip'
    const isRedemption = tx.transaction_type === 'redemption'
    const holderName = tx.folios?.holders?.name ?? 'Holder'
    const dateLabel = new Date(tx.transaction_date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    return {
      type: isSip ? 'sip' : isRedemption ? 'redemption' : 'purchase',
      title: isSip ? 'SIP Debit Successful' : isRedemption ? 'Redemption Processed' : 'Purchase Recorded',
      description: `${formatINR(tx.amount)} ${isSip ? 'invested' : isRedemption ? 'redeemed' : 'purchased'} for ${holderName}`,
      timestamp: dateLabel,
    }
  })

  // XIRR progress bar width (visual proxy: clamp 0–100%)
  const xirrBarWidth = familyXirr !== null
    ? `${Math.min(100, Math.max(0, familyXirr * 5 * 100))}%`
    : '0%'

  return (
    <div className="space-y-8">
      {/* Section 1 — AI Morning Insight banner (glassmorphism) */}
      <section
        style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,109,67,0.1)' }}
        className="p-6 rounded-2xl flex items-start gap-4 relative overflow-hidden group"
      >
        <div className="p-3 rounded-full bg-secondary-container text-on-secondary-container">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        </div>
        <div>
          <h3 className="font-headline font-bold text-primary mb-1">Morning Insight</h3>
          <p className="text-on-surface-variant leading-relaxed font-label">
            Your family wealth is on track. Import a CAS to see personalised insights powered by AI.
            <span className="block mt-2 text-sm italic opacity-80">AI-powered morning insights will be available in Phase 4.</span>
          </p>
        </div>
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rounded-full blur-2xl group-hover:bg-secondary/10 transition-all" />
      </section>

      {/* Section 2 — 4-column bento metric grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1: Total Family AUM (col-span-2) */}
        <div className="col-span-2 bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
          <span className="text-xs uppercase tracking-widest text-on-surface-variant font-medium">
            Total Family AUM
          </span>
          <h2 className="text-[3.5rem] font-headline font-extrabold text-primary leading-tight mt-2 tabular-nums">
            {totalAUM !== null ? formatINR(totalAUM) : '—'}
          </h2>
          {familyGainLossPct !== null && totalAUM !== null && (
            <div className="flex items-center gap-3 mt-4">
              <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                {familyGainLossPct >= 0 ? '+' : ''}{familyGainLossPct.toFixed(1)}%
              </span>
              <span className="text-on-surface-variant font-label text-sm">since inception</span>
            </div>
          )}
          {totalAUM === null && (
            <p className="text-xs text-on-surface-variant mt-3">Sync NAV to calculate</p>
          )}
        </div>

        {/* Card 2: Total Invested + Absolute Gain (stacked) */}
        <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-widest text-on-surface-variant font-medium">Total Invested</span>
            <p className="text-2xl font-headline font-bold text-primary mt-2 tabular-nums">
              {familyTotalInvested > 0 ? formatINR(familyTotalInvested) : '—'}
            </p>
          </div>
          <div className="border-t border-outline-variant/10 mt-4 pt-4">
            <span className="text-xs uppercase tracking-widest text-on-surface-variant font-medium">Absolute Gain</span>
            <p className="text-xl font-headline font-bold text-secondary mt-1 tabular-nums">
              {familyGainLoss !== null
                ? `${familyGainLoss >= 0 ? '+' : ''}${formatINR(familyGainLoss)}`
                : '—'}
            </p>
          </div>
        </div>

        {/* Card 3: Family XIRR (bg-primary) */}
        <div className="bg-primary p-6 rounded-2xl flex flex-col justify-between text-on-primary relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-xs uppercase tracking-widest opacity-70 font-medium">Family XIRR</span>
            <p className="text-4xl font-headline font-extrabold mt-2 tabular-nums">
              {familyXirr !== null ? `${(familyXirr * 100).toFixed(2)}%` : '—'}
            </p>
          </div>
          <div className="relative z-10 mt-4">
            <p className="text-xs opacity-60 font-label">Benchmark Nifty 50: —</p>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-secondary-fixed h-full rounded-full"
                style={{ width: xirrBarWidth }}
              />
            </div>
          </div>
          {/* Decorative icon */}
          <div className="absolute right-0 bottom-0 opacity-10">
            <span className="material-symbols-outlined text-[120px]">analytics</span>
          </div>
        </div>
      </section>

      {/* Section 3 — Secondary grid: 1/3 donut + 2/3 holders table */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Asset Allocation Donut (1/3) */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl lg:col-span-1">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-headline font-bold text-primary">Asset Allocation</h3>
            <span className="material-symbols-outlined text-on-surface-variant">more_vert</span>
          </div>
          <div className="relative flex justify-center py-6">
            <svg className="w-56 h-56 transform -rotate-90" viewBox="0 0 224 224">
              {/* Background track */}
              <circle cx="112" cy="112" fill="transparent" r="90" stroke="#e6f6ff" strokeWidth="24" />
              {/* Domestic Equity */}
              <circle
                cx="112" cy="112" fill="transparent" r="90"
                stroke="#001736"
                strokeDasharray={CIRC}
                strokeDashoffset={domEquityOffset}
                strokeWidth="24"
              />
              {/* International Equity */}
              <circle
                cx="112" cy="112" fill="transparent" r="90"
                stroke="#002b5b"
                strokeDasharray={CIRC}
                strokeDashoffset={intlEquityOffset}
                strokeWidth="24"
                style={{ transform: `rotate(${intlRotationDeg}deg)`, transformOrigin: 'center' }}
              />
              {/* Debt */}
              <circle
                cx="112" cy="112" fill="transparent" r="90"
                stroke="#006d43"
                strokeDasharray={CIRC}
                strokeDashoffset={debtOffset}
                strokeWidth="24"
                style={{ transform: `rotate(${debtRotationDeg}deg)`, transformOrigin: 'center' }}
              />
              {/* Gold & Cash */}
              <circle
                cx="112" cy="112" fill="transparent" r="90"
                stroke="#88f5b7"
                strokeDasharray={CIRC}
                strokeDashoffset={goldOffset}
                strokeWidth="24"
                style={{ transform: `rotate(${goldRotationDeg}deg)`, transformOrigin: 'center' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-on-surface-variant uppercase tracking-tighter font-medium">Equities</span>
              <span className="text-2xl font-headline font-extrabold text-primary tabular-nums">
                {Math.round(combinedEquityPct * 100)}%
              </span>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-center text-sm font-label">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span>Domestic Equity</span>
              </div>
              <span className="font-bold tabular-nums text-primary">
                {allocationByValue.equity > 0 ? formatINR(allocationByValue.equity) : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm font-label">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary-container" />
                <span>Intl. Equity</span>
              </div>
              <span className="font-bold tabular-nums text-primary">
                {allocationByValue.international > 0 ? formatINR(allocationByValue.international) : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm font-label">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary" />
                <span>Debt</span>
              </div>
              <span className="font-bold tabular-nums text-primary">
                {allocationByValue.debt > 0 ? formatINR(allocationByValue.debt) : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm font-label">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary-container" />
                <span>Gold &amp; Cash</span>
              </div>
              <span className="font-bold tabular-nums text-primary">
                {allocationByValue.gold > 0 ? formatINR(allocationByValue.gold) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Holders Table (2/3) — div-based for Server Component Link compatibility */}
        <div className="bg-surface-container-lowest rounded-2xl lg:col-span-2 overflow-hidden">
          <div className="p-8 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-headline font-bold text-primary">Family Holders</h3>
              <p className="text-sm text-on-surface-variant mt-1">Allocation by family member entities</p>
            </div>
            <button className="px-4 py-2 text-sm font-bold text-primary bg-surface-container hover:bg-surface-container-high transition-colors rounded-lg">
              View Detailed Report
            </button>
          </div>
          <div className="w-full overflow-x-auto">
            {/* Header row */}
            <div role="table" className="w-full">
              <div role="rowgroup">
                <div role="row" className="grid grid-cols-[2fr_1fr_1fr_auto] bg-surface-container-low/50 px-8 py-4 gap-4">
                  <div role="columnheader" className="text-xs uppercase tracking-widest font-medium text-on-surface-variant">Member</div>
                  <div role="columnheader" className="text-xs uppercase tracking-widest font-medium text-on-surface-variant text-right">Portfolio Value</div>
                  <div role="columnheader" className="text-xs uppercase tracking-widest font-medium text-on-surface-variant text-right">Individual XIRR</div>
                  <div role="columnheader" className="text-xs uppercase tracking-widest font-medium text-on-surface-variant text-right w-8">Action</div>
                </div>
              </div>
              <div role="rowgroup" className="divide-y divide-outline-variant/10">
                {holdersWithAUM.length === 0 ? (
                  <div className="px-8 py-6 text-sm text-on-surface-variant">
                    No holders yet. Use &ldquo;Add Holder&rdquo; to get started.
                  </div>
                ) : (
                  holdersWithAUM.map((holder, index) => (
                    <Link
                      key={holder.id}
                      href={`/families/${familyId}/holders/${holder.id}`}
                      className="grid grid-cols-[2fr_1fr_1fr_auto] px-8 py-6 gap-4 items-center group hover:bg-surface-container-low/30 transition-colors cursor-pointer"
                      role="row"
                    >
                      <div role="cell" className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${avatarBgs[index % avatarBgs.length]}`}>
                          {holder.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-primary">{holder.name}</p>
                          <p className="text-xs text-on-surface-variant">{holder.role}</p>
                        </div>
                      </div>
                      <div role="cell" className="text-right font-headline font-bold tabular-nums text-primary">
                        {holder.totalCurrentValue !== null ? formatINR(holder.totalCurrentValue) : '—'}
                      </div>
                      <div role="cell" className="text-right">
                        <span className="text-secondary font-bold tabular-nums">
                          {holder.xirr !== null ? `${(holder.xirr * 100).toFixed(1)}%` : '—'}
                        </span>
                      </div>
                      <div role="cell" className="text-right w-8">
                        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
                          chevron_right
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 — Bottom row: Top Performers + Recent Activity */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
        {/* Top Performing Funds */}
        <div className="bg-surface-container-low p-8 rounded-2xl">
          <h3 className="text-xl font-headline font-bold text-primary mb-6">Top Performing Funds</h3>
          {topFunds.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No holdings available. Import a CAS to see top performers.</p>
          ) : (
            <div className="space-y-4">
              {topFunds.map((fund, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">
                        {idx === 0 ? 'show_chart' : 'trending_up'}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-primary text-sm line-clamp-1 max-w-[200px]">{fund.schemeName}</p>
                      <p className="text-xs text-on-surface-variant">{fund.category || 'Equity'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-secondary font-bold tabular-nums">
                      {fund.absoluteReturn >= 0 ? '+' : ''}{fund.absoluteReturn.toFixed(1)}%
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">1Y Returns</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-surface-container-low p-8 rounded-2xl">
          <h3 className="text-xl font-headline font-bold text-primary mb-6">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No recent activity. Import a CAS to get started.</p>
          ) : (
            <div className="space-y-6">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center relative z-10 ${activity.type === 'sip' ? 'bg-secondary-container' : 'bg-surface-container-highest'}`}>
                      <span className={`material-symbols-outlined ${activity.type === 'sip' ? 'text-on-secondary-container' : 'text-primary'}`}>
                        {activity.type === 'sip' ? 'sync_alt' : 'upload_file'}
                      </span>
                    </div>
                    {idx < recentActivity.length - 1 && (
                      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-10 bg-outline-variant/20" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex justify-between">
                      <p className="font-bold text-primary">{activity.title}</p>
                      <span className="text-xs text-on-surface-variant tabular-nums">{activity.timestamp}</span>
                    </div>
                    <p className="text-sm text-on-surface-variant mt-1">{activity.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAB — fixed bottom-right */}
      <Link
        href={`/families/${familyId}?import=cas`}
        className="fixed bottom-8 right-8 w-16 h-16 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-all active:scale-95 group z-50"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
        <span className="absolute right-20 bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
          Import New CAS
        </span>
      </Link>
    </div>
  )
}

// Keep maskPAN exported for other consumers
export { maskPAN }

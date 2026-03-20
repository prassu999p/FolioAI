import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { HoldingsTable } from '@/components/holdings/holdings-table'
import { PeriodSelector } from '@/components/analytics/period-selector'
import { SummaryCards } from '@/components/analytics/summary-cards'
import { SipSection } from '@/components/analytics/sip-section'
import { AllocationSection } from '@/components/analytics/allocation-section'
import { getPeriodBounds } from '@/lib/analytics/period-utils'
import type { HoldingRow, HoldingRowWithAnalytics, AnalyticsTransaction } from '@/lib/supabase/types'

interface HolderHoldingsPageProps {
  params: Promise<{ familyId: string; holderId: string }>
  searchParams: Promise<{ period?: string }>
}

export default async function HolderHoldingsPage({ params, searchParams }: HolderHoldingsPageProps) {
  const { familyId, holderId } = await params
  const { period: periodParam } = await searchParams
  const period = periodParam ?? 'all'

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [holdingsResult, transactionsResult] = await Promise.all([
    (supabase as any).rpc('get_holder_holdings', {
      p_holder_id: holderId,
    }),
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
  const transactions: AnalyticsTransaction[] = transactionsResult.error
    ? []
    : (transactionsResult.data ?? [])

  // Map holdings to HoldingRowWithAnalytics (analytics computed inside SummaryCards)
  const holdingsWithAnalytics: HoldingRowWithAnalytics[] = rawHoldings.map(
    (h) => ({ ...h, gain_loss: null, gain_loss_pct: null, xirr: null })
  )

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

        {/* Period selector — above bento cards */}
        <div className="mb-6 flex justify-end">
          <Suspense>
            <PeriodSelector />
          </Suspense>
        </div>

        {/* Bento summary cards */}
        <div className="mb-12">
          <SummaryCards
            holderId={holderId}
            period={period}
            transactions={transactions}
            holdings={holdingsWithAnalytics}
          />
        </div>

        {/* 2/3 holdings + 1/3 sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <HoldingsTable holdings={holdingsWithAnalytics} />
          </div>
          <div className="space-y-8">
            <SipSection transactions={transactions} />
            {/* Phase 4: AI Portfolio Health card will go here */}
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

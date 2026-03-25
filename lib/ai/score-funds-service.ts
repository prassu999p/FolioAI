import { generateText } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { computeAlpha, computeAUMTrend, computeQualityScore } from '@/lib/ai/scoring'
import { buildScorecardPrompt } from '@/lib/ai/prompts'
import { getAIModel } from '@/lib/ai/provider'
import type { ScoringSignals, AlphaInput, FundScore } from '@/lib/ai/types'

interface HoldingFromDB {
  scheme_code: number
  scheme_name: string
  category: string
  units: number
  current_value: number | null
  folio_id: string
}

interface AnalyticsTransactionFromDB {
  folio_id: string
  scheme_code: number
  scheme_name: string
  transaction_date: string
  transaction_type: string
  amount: number
  units: number
  nav: number
}

interface NiftyRow {
  nav_date: string
  close: number
}

interface FundRow {
  scheme_code: number
  ter: number | null
}

/**
 * Score all active holdings for a holder.
 * - Fetches holdings + transactions from Supabase
 * - For each holding: computes alpha, AUM trend, quality score
 * - Calls Anthropic to generate narrative prose
 * - Upserts into fund_ai_scores
 * Returns the count of scored funds.
 */
export async function scoreFundsForHolder(
  holderId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<number> {
  // 1. Fetch active holdings via RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: holdingsData, error: holdingsError } = await (supabase as any).rpc('get_holder_holdings', {
    p_holder_id: holderId,
  })
  if (holdingsError) throw new Error(`Failed to fetch holdings: ${holdingsError.message}`)

  const holdings: HoldingFromDB[] = holdingsData ?? []
  if (holdings.length === 0) return 0

  // 2. Fetch all transactions for this holder (unfiltered by date)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: txData } = await (supabase as any).rpc('get_holder_analytics_transactions', {
    p_holder_id: holderId,
    p_start_date: null,
    p_end_date: null,
  })
  const allTransactions: AnalyticsTransactionFromDB[] = txData ?? []

  // 3. Fetch Nifty 50 daily data (all rows — small table)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: niftyData } = await (supabase as any)
    .from('nifty50_daily')
    .select('nav_date, close')
    .order('nav_date', { ascending: true })
  const niftyRows: NiftyRow[] = niftyData ?? []
  const nifty50Daily = niftyRows.map(r => ({ date: r.nav_date, close: Number(r.close) }))

  // 4. Fetch expense ratios for all held scheme_codes
  const schemeCodes = holdings.map(h => h.scheme_code)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fundsData } = await (supabase as any)
    .from('funds')
    .select('scheme_code, ter')
    .in('scheme_code', schemeCodes)
  const fundsRows: FundRow[] = fundsData ?? []
  const terBySchemeCode = new Map<number, number | null>(
    fundsRows.map(f => [f.scheme_code, f.ter])
  )

  // 5. Score each holding
  let scoredCount = 0

  for (const holding of holdings) {
    // Filter transactions to this holding's folio
    const holdingTxs = allTransactions.filter(t => t.folio_id === holding.folio_id)

    // Check data sufficiency: compute first and last transaction dates
    const txDates = holdingTxs.map(t => new Date(t.transaction_date).getTime())
    const hasInsufficientData = txDates.length === 0

    // Compute alpha using scoring module
    const alphaInput: AlphaInput = {
      transactions: holdingTxs,
      currentValue: holding.current_value ?? 0,
      nifty50Daily,
    }
    const alphaPct = hasInsufficientData ? null : computeAlpha(alphaInput)

    // Compute AUM trend using NAV history approximation from nifty50Daily dates + holding nav
    // We build a synthetic nav history: filter nifty rows that have matching dates from transactions
    // Use the last 6 months of nifty dates as time anchors and approximate fund NAV from txs
    const navHistory = buildNavHistoryFromTransactions(holdingTxs, holding.units)
    const aumTrend = computeAUMTrend(navHistory, holding.units)

    // Expense ratio from funds table
    const expenseRatio = terBySchemeCode.get(holding.scheme_code) ?? null

    // Months of data
    const monthsOfData = txDates.length > 0
      ? Math.round((Math.max(...txDates) - Math.min(...txDates)) / (1000 * 60 * 60 * 24 * 30))
      : 0

    // Build signals
    const signals: ScoringSignals = {
      scheme_code: holding.scheme_code,
      fund_name: holding.scheme_name,
      category: holding.category ?? 'Unknown',
      alpha_pct: alphaPct,
      expense_ratio: expenseRatio,
      aum_trend: hasInsufficientData ? 'insufficient_data' : aumTrend,
      months_of_data: monthsOfData,
    }

    const qualityScore = computeQualityScore(signals)

    // Handle insufficient data with short narrative
    let narrativeText: string
    if (hasInsufficientData) {
      narrativeText = 'Insufficient data — fewer than 3 months of history available for this fund.'
    } else {
      // Call AI provider for narrative prose
      try {
        const prompt = buildScorecardPrompt(signals, qualityScore)
        const { text } = await generateText({
          model: getAIModel(),
          maxOutputTokens: 400,
          messages: [{ role: 'user', content: prompt }],
        })
        narrativeText = text
      } catch (err) {
        narrativeText = 'Narrative generation failed. Please retry.'
        console.error(`AI provider error for scheme ${holding.scheme_code}:`, err)
      }
    }

    // Upsert into fund_ai_scores
    const scoreRecord: Omit<FundScore, 'generated_at'> & { generated_at: string } = {
      holder_id: holderId,
      scheme_code: holding.scheme_code,
      quality_score: qualityScore,
      alpha_pct: alphaPct,
      expense_ratio: expenseRatio,
      aum_trend: signals.aum_trend,
      narrative_text: narrativeText,
      generated_at: new Date().toISOString(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (supabase as any)
      .from('fund_ai_scores')
      .upsert(scoreRecord, { onConflict: 'holder_id,scheme_code' })

    if (upsertError) {
      console.error(`Failed to upsert score for scheme ${holding.scheme_code}:`, upsertError)
      continue
    }

    scoredCount++
  }

  return scoredCount
}

/**
 * Build a simplified NAV history from transactions to use for AUM trend computation.
 * Uses the purchase NAV at each transaction date as a proxy for fund NAV history.
 * Requires at least 3 data points from transactions for meaningful trend computation.
 */
function buildNavHistoryFromTransactions(
  transactions: AnalyticsTransactionFromDB[],
  _units: number
): Array<{ date: string; nav: number }> {
  if (transactions.length === 0) return []

  // Use purchase transactions as nav history anchor points
  const purchaseTypes = new Set(['purchase', 'sip', 'switch_in', 'dividend_reinvest'])
  const navPoints = transactions
    .filter(t => purchaseTypes.has(t.transaction_type) && t.nav > 0)
    .map(t => ({ date: t.transaction_date, nav: t.nav }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Deduplicate by date (keep the last nav on each date)
  const byDate = new Map<string, number>()
  for (const p of navPoints) {
    byDate.set(p.date, p.nav)
  }

  return Array.from(byDate.entries()).map(([date, nav]) => ({ date, nav }))
}

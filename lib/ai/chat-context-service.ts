import type { ChatContext } from '@/lib/ai/types'
import { computeXIRR } from '@/lib/analytics/xirr'
import type { Cashflow } from '@/lib/analytics/xirr'

// Use a flexible client type to accept any Supabase client variant (server, browser, etc.)
type AnySupabaseClient = any

/**
 * Builds the ChatContext for a given holder.
 * Called server-side in the chat route handler.
 * Fetches: family name, holder name, holdings with current value,
 * active SIPs (from transaction pattern), LTCG realized this FY.
 */
export async function buildChatContextForHolder(
  holderId: string,
  supabase: AnySupabaseClient
): Promise<ChatContext | null> {
  // 1. Fetch holder with family name
  const { data: holder } = await supabase
    .from('holders')
    .select('id, name, family_id, families(name)')
    .eq('id', holderId)
    .single() as any

  if (!holder) return null

  // 2. Fetch active holdings
  const { data: holdingsData } = await (supabase as any)
    .rpc('get_holder_holdings', { p_holder_id: holderId })

  const holdings = (holdingsData ?? []) as Array<{
    scheme_code: number; scheme_name: string; category: string
    net_units: number; current_value: number | null; ter: number | null
  }>

  // 3. Fetch transactions for XIRR computation
  const { data: txData } = await (supabase as any)
    .rpc('get_holder_analytics_transactions', { p_holder_id: holderId })
  const transactions = txData ?? []

  // 4. Compute family-level XIRR (all transactions, totalAUM as terminal)
  const totalAUM = holdings.reduce((sum: number, h: any) => sum + (h.current_value ?? 0), 0)

  // Build cashflows manually: purchases are negative outflows, redemptions positive inflows
  const outflowTypes = ['purchase', 'sip', 'switch_in', 'dividend_reinvest']
  const cashflows: Cashflow[] = transactions.map((t: any) => ({
    amount: outflowTypes.includes(t.transaction_type) ? -Math.abs(t.amount) : Math.abs(t.amount),
    date: new Date(t.transaction_date),
  }))
  // Add terminal value (current portfolio value as if selling today)
  if (totalAUM > 0) {
    cashflows.push({ amount: totalAUM, date: new Date() })
  }
  const xirr = computeXIRR(cashflows)

  // 5. Compute sector exposure from fund categories
  // Map SEBI categories to broad sectors
  const sectorMap: Record<string, string> = {
    'Large Cap Fund': 'Large Cap Equity',
    'Mid Cap Fund': 'Mid Cap Equity',
    'Small Cap Fund': 'Small Cap Equity',
    'Flexi Cap Fund': 'Diversified Equity',
    'ELSS': 'Tax-Saving Equity',
    'Debt Fund': 'Debt',
    'Liquid Fund': 'Debt',
    'Gold Fund': 'Gold',
    'International Fund': 'International',
    'Index Fund': 'Index/Passive',
  }
  const sectorTotals: Record<string, number> = {}
  for (const h of holdings) {
    const sector = sectorMap[h.category] ?? h.category ?? 'Other'
    sectorTotals[sector] = (sectorTotals[sector] ?? 0) + (h.current_value ?? 0)
  }
  const sectorExposure = Object.entries(sectorTotals)
    .map(([sector, value]) => ({ sector, pct: totalAUM > 0 ? (value / totalAUM) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct)

  // 6. Detect active SIPs (funds with recurring monthly transactions in last 3 months)
  // Simplified: find funds with 2+ transactions in last 90 days with similar amounts
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const recentTx = transactions.filter((tx: any) =>
    tx.transaction_type === 'purchase' &&
    new Date(tx.transaction_date) >= ninetyDaysAgo
  )
  const sipFunds: Record<number, { name: string; amounts: number[] }> = {}
  for (const tx of recentTx) {
    if (!sipFunds[tx.scheme_code]) {
      const holding = holdings.find((h: any) => h.scheme_code === tx.scheme_code)
      sipFunds[tx.scheme_code] = { name: holding?.scheme_name ?? `Fund ${tx.scheme_code}`, amounts: [] }
    }
    sipFunds[tx.scheme_code].amounts.push(Math.abs(tx.amount))
  }
  const sips = Object.values(sipFunds)
    .filter(f => f.amounts.length >= 2)
    .map(f => ({
      fundName: f.name,
      amount: Math.round(f.amounts.reduce((s, a) => s + a, 0) / f.amounts.length),
    }))

  // 7. LTCG this FY (simplified: default 0 — exact value from tax engine in Phase 3)
  // For chat context, use approximate 0; Phase 3 tax data will be a future enhancement
  const ltcg = 0
  const ltcgExemptionUsed = 0

  return {
    familyId: holder.family_id,
    familyName: holder.families?.name ?? 'Your Family',
    holderName: holder.name,
    holderId,
    totalAUM,
    xirr,
    holdings: holdings.map((h: any) => ({
      scheme_name: h.scheme_name,
      category: h.category,
      units: h.net_units,
      current_value: h.current_value,
      xirr: null,  // per-holding XIRR not needed for chat context summary
      ter: h.ter,
    })),
    sectorExposure,
    sips,
    ltcg,
    ltcgExemptionUsed,
  }
}

import { format } from 'date-fns'
import { detectActiveSIPs } from '@/lib/analytics/sip-detector'
import { computeXIRR } from '@/lib/analytics/xirr'
import type { Cashflow } from '@/lib/analytics/xirr'
import type { FolioTransaction } from '@/lib/analytics/sip-detector'
import type { AnalyticsTransaction } from '@/lib/supabase/types'

const formatINR = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

interface SipSectionProps {
  transactions: AnalyticsTransaction[]
}

/**
 * Estimate current value of a folio from its transaction history.
 * Uses net units × most recent NAV as a proxy for current value.
 * (Actual current value is on HoldingRow; SipSection only has transactions.)
 */
function estimateFolioCurrentValue(
  folioId: string,
  allTxs: AnalyticsTransaction[]
): number {
  const folioTxs = allTxs.filter(t => t.folio_id === folioId)
  if (folioTxs.length === 0) return 0

  const inTypes = new Set(['purchase', 'sip', 'switch_in', 'dividend_reinvest', 'PURCHASE', 'SIP', 'SWITCH_IN', 'DIVIDEND_REINVEST'])
  const outTypes = new Set(['redemption', 'switch_out', 'REDEMPTION', 'SWITCH_OUT'])

  let netUnits = 0
  for (const tx of folioTxs) {
    if (inTypes.has(tx.transaction_type)) netUnits += tx.units
    else if (outTypes.has(tx.transaction_type)) netUnits -= tx.units
  }

  // Use the most recent NAV from this folio's transactions
  const sorted = [...folioTxs].sort((a, b) =>
    b.transaction_date.localeCompare(a.transaction_date)
  )
  const latestNav = sorted[0].nav

  return Math.max(netUnits * latestNav, 0)
}

/**
 * SipSection — Server Component
 *
 * Renders the Active SIPs right sidebar panel for the holder analytics page.
 * Returns null (renders nothing in the DOM) when no active SIPs are detected.
 *
 * Computes SIP XIRR per row using sip_cashflows (negated outflows from
 * detectActiveSIPs) plus a terminal value cashflow estimated from transaction
 * history (net units × most recent NAV). Satisfies SIP-02.
 */
export function SipSection({ transactions }: SipSectionProps) {
  // Convert AnalyticsTransaction[] to FolioTransaction[] shape for detectActiveSIPs
  const folioTransactions: FolioTransaction[] = transactions.map(tx => ({
    folio_id: tx.folio_id,
    scheme_name: tx.scheme_name,
    transaction_type: tx.transaction_type,
    transaction_date: tx.transaction_date,
    amount: tx.amount,
  }))

  const sips = detectActiveSIPs(folioTransactions)

  // Return null — renders absolutely nothing in the DOM when no active SIPs
  if (sips.length === 0) return null

  // Compute XIRR per SIP (SIP-02)
  const sipXirrs = sips.map(sip => {
    const currentValue = estimateFolioCurrentValue(sip.folio_id, transactions)
    if (currentValue <= 0 || sip.sip_cashflows.length === 0) return null

    // Terminal cashflow: current value of the SIP holding (positive inflow)
    const terminalDate = new Date()
    const fullCashflows: Cashflow[] = [
      ...sip.sip_cashflows,
      { amount: currentValue, date: terminalDate },
    ]

    return computeXIRR(fullCashflows)
  })

  return (
    <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-primary font-headline">Active SIPs</h3>
        <span className="text-xs bg-surface-container-high px-3 py-1 rounded-full font-bold text-primary">
          {sips.length} Total
        </span>
      </div>
      <div className="space-y-6">
        {sips.map((sip, idx) => {
          const xirr = sipXirrs[idx]
          return (
            <div key={sip.folio_id} className="flex justify-between items-center group">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-secondary-container transition-colors">
                  <span className="material-symbols-outlined">calendar_month</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-primary tabular-nums">
                    {formatINR(sip.monthly_amount)}
                    <span className="font-normal text-on-surface-variant">/mo</span>
                  </p>
                  <p className="text-xs text-on-surface-variant">{sip.scheme_name}</p>
                  {/* SIP XIRR (SIP-02) */}
                  <p className="text-xs text-secondary font-bold tabular-nums mt-0.5">
                    XIRR: {xirr !== null ? `${(xirr * 100).toFixed(2)}%` : '—'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase">Next Debit</p>
                <p className="text-xs font-bold text-primary">
                  {format(sip.next_debit_date, 'dd MMM')}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <button className="w-full mt-6 py-3 bg-surface border border-outline-variant/30 rounded-xl text-sm font-bold hover:bg-surface-container transition-colors">
        View All SIPs
      </button>
    </div>
  )
}

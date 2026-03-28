import { format } from 'date-fns'
import { detectActiveSIPs } from '@/lib/analytics/sip-detector'
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
 * SipSection — Server Component
 *
 * Renders the Active SIPs right sidebar panel for the holder analytics page.
 * Returns null (renders nothing in the DOM) when no active SIPs are detected.
 *
 * Displays monthly SIP amount and next debit date for each active SIP.
 * XIRR is not shown for SIPs since they are ongoing investments without a defined terminal date.
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

  // SIPs are ongoing investments without a terminal date, so XIRR is not meaningful.
  // For active SIPs, showing a gain/loss % based on current holdings would be more useful,
  // but that requires current holdings data which SipSection doesn't have.
  // For now, we skip XIRR calculation for SIPs.

  return (
    <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-primary font-headline">Active SIPs</h3>
        <span className="text-xs bg-surface-container-high px-3 py-1 rounded-full font-bold text-primary">
          {sips.length} Total
        </span>
      </div>
      <div className="space-y-6">
        {sips.map((sip) => (
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
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase">Next Debit</p>
              <p className="text-xs font-bold text-primary">
                {format(sip.next_debit_date, 'dd MMM')}
              </p>
            </div>
          </div>
        ))}
      </div>
      <button className="w-full mt-6 py-3 bg-surface border border-outline-variant/30 rounded-xl text-sm font-bold hover:bg-surface-container transition-colors">
        View All SIPs
      </button>
    </div>
  )
}

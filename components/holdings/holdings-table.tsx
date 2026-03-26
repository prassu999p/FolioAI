import type { HoldingRowWithAnalytics, AnalyticsTransaction } from '@/lib/supabase/types'
import { SellTaxEstimatorModal } from '@/components/tax/sell-tax-estimator-modal'
import { getTaxAssetClass } from '@/lib/tax/rules'

const formatINR = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

interface HoldingsTableProps {
  holdings: HoldingRowWithAnalytics[]
  fundCategories?: Record<number, string>   // scheme_code → category
  transactions?: AnalyticsTransaction[]     // all holder transactions (for oldest lot date)
}

export function HoldingsTable({ holdings, fundCategories, transactions }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
        <div className="p-8 flex justify-between items-center bg-surface-container-low/50">
          <h3 className="text-xl font-bold text-primary font-headline">Portfolio Holdings</h3>
          <div className="flex gap-4">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              Mutual Funds
            </span>
          </div>
        </div>
        <div className="p-8 text-center text-on-surface-variant">
          No holdings yet. Import a CAS file or add a holding manually.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
      <div className="p-8 flex justify-between items-center bg-surface-container-low/50">
        <h3 className="text-xl font-bold text-primary font-headline">Portfolio Holdings</h3>
        <div className="flex gap-4">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Mutual Funds
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs uppercase text-on-surface-variant/70 font-bold bg-surface-container-low/30">
              <th className="py-4 px-8">Asset Name</th>
              <th className="py-4 px-4 text-center">Units</th>
              <th className="py-4 px-4 text-right">Current NAV</th>
              <th className="py-4 px-4 text-right">Value (&#8377;)</th>
              <th className="py-4 px-4 text-right">XIRR</th>
              <th className="py-4 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {holdings.map((holding, i) => {
              // Derive oldest FIFO purchase date for this holding's folio
              const folioTxs = (transactions ?? [])
                .filter(t => t.folio_id === holding.folio_id &&
                  (t.transaction_type === 'PURCHASE' || t.transaction_type === 'SIP' ||
                   t.transaction_type === 'purchase' || t.transaction_type === 'sip'))
                .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))
              const oldestLot = folioTxs[0]
              const purchaseDate = oldestLot ? new Date(oldestLot.transaction_date) : undefined

              // Correct asset class from fund category
              const category = (fundCategories ?? {})[holding.scheme_code] ?? ''
              const taxAssetClass = getTaxAssetClass(category)

              return (
                <tr
                  key={`${holding.folio_id}-${holding.scheme_code}`}
                  className={`${i % 2 === 1 ? 'bg-surface-container-low/20' : ''} hover:bg-surface-container-low transition-colors`}
                >
                  <td className="py-5 px-8">
                    <div className="font-bold text-primary">{holding.scheme_name}</div>
                    <div className="text-xs text-on-surface-variant">
                      {holding.fund_house}
                    </div>
                  </td>
                  <td className="py-5 px-4 text-center tabular-nums font-medium">
                    {holding.units.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                  </td>
                  <td className="py-5 px-4 text-right tabular-nums">
                    {holding.current_nav != null ? holding.current_nav.toFixed(2) : '—'}
                  </td>
                  <td className="py-5 px-4 text-right tabular-nums font-bold">
                    {holding.current_value != null ? formatINR(holding.current_value) : '—'}
                  </td>
                  <td
                    className={`py-5 px-8 text-right tabular-nums font-bold ${
                      holding.xirr != null && holding.xirr >= 0 ? 'text-secondary' : 'text-error'
                    }`}
                  >
                    {holding.xirr != null ? `${(holding.xirr * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-5 px-4 text-center">
                    <SellTaxEstimatorModal
                      holding={holding}
                      purchaseDate={purchaseDate}
                      grandfatheringNav={null}
                      taxAssetClass={taxAssetClass}
                    >
                      <button className="px-3 py-1.5 text-xs font-medium bg-surface-container-high hover:bg-surface-container rounded-lg transition-colors text-primary">
                        Estimate Tax
                      </button>
                    </SellTaxEstimatorModal>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

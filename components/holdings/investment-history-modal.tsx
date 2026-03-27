'use client'

import { useEffect } from 'react'
import type { HoldingRowWithAnalytics, AnalyticsTransaction } from '@/lib/supabase/types'

const formatINR = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const getTransactionLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'purchase': 'Purchase',
    'PURCHASE': 'Purchase',
    'redemption': 'Redemption',
    'REDEMPTION': 'Redemption',
    'sip': 'SIP',
    'SIP': 'SIP',
    'switch_in': 'Switch In',
    'SWITCH_IN': 'Switch In',
    'switch_out': 'Switch Out',
    'SWITCH_OUT': 'Switch Out',
    'dividend_reinvest': 'Dividend Reinvest',
    'DIVIDEND_REINVEST': 'Dividend Reinvest',
  }
  return labels[type] || type
}

interface InvestmentHistoryModalProps {
  holding: HoldingRowWithAnalytics
  transactions: AnalyticsTransaction[]
  onClose: () => void
}

export function InvestmentHistoryModal({
  holding,
  transactions,
  onClose,
}: InvestmentHistoryModalProps) {
  // Filter transactions for this holding's folio
  const folioTxs = transactions
    .filter(t => t.folio_id === holding.folio_id)
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-surface-container-lowest rounded-3xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-8 border-b border-outline-variant/20 bg-surface-container-low/30">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-primary font-headline">
                  Investment History
                </h2>
                <p className="text-on-surface-variant mt-1">{holding.scheme_name}</p>
              </div>
              <button
                onClick={onClose}
                className="text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-8">
            {folioTxs.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant">
                No transactions found for this holding.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs uppercase text-on-surface-variant/70 font-bold bg-surface-container-low/30 sticky top-0">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Units</th>
                      <th className="py-3 px-4 text-right">NAV</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {folioTxs.map((tx, i) => (
                      <tr
                        key={`${tx.folio_id}-${tx.transaction_date}-${i}`}
                        className={`${i % 2 === 1 ? 'bg-surface-container-low/20' : ''} border-b border-outline-variant/10 last:border-0`}
                      >
                        <td className="py-4 px-4 text-on-surface-variant">
                          {formatDate(tx.transaction_date)}
                        </td>
                        <td className="py-4 px-4 font-medium text-primary">
                          {getTransactionLabel(tx.transaction_type)}
                        </td>
                        <td className="py-4 px-4 text-right tabular-nums">
                          {tx.units.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                        </td>
                        <td className="py-4 px-4 text-right tabular-nums">
                          {tx.nav.toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-right tabular-nums font-bold">
                          {formatINR(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-outline-variant/20 bg-surface-container-low/30 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

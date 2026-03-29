/**
 * Harvesting Execution Modal
 *
 * Confirms and executes the harvesting plan.
 * Uses Dialog pattern to wrap the "Execute Harvesting Plan" button.
 */

'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatINR } from '@/lib/utils'
import type { HarvestingSuggestion } from '@/lib/tax/types'

interface HarvestingExecutionModalProps {
  suggestions: HarvestingSuggestion[]
  totalTaxSaved: number
  children?: React.ReactNode
}

export function HarvestingExecutionModal({
  suggestions,
  totalTaxSaved,
  children,
}: HarvestingExecutionModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleExecute = async () => {
    setIsExecuting(true)
    setExecutionStatus('idle')

    try {
      // TODO: Call API endpoint to execute harvesting transactions
      // For now, this is a placeholder that shows success
      await new Promise(resolve => setTimeout(resolve, 1000))

      setExecutionStatus('success')

      // Auto-close after success
      setTimeout(() => {
        setIsOpen(false)
        setExecutionStatus('idle')
        setIsExecuting(false)
      }, 2000)
    } catch (error) {
      console.error('Harvesting execution failed:', error)
      setExecutionStatus('error')
      setIsExecuting(false)
    }
  }

  const totalGain = suggestions.reduce((sum, s) => sum + s.profitTotal, 0)
  const totalUnits = suggestions.reduce((sum, s) => sum + s.unitsToSell, 0)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <button className="w-full py-4 bg-secondary text-on-secondary rounded-xl font-bold hover:scale-[1.02] transition-transform">
            Execute Harvesting Plan
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <DialogTitle className="text-xl font-bold text-primary font-headline">
              Execute Harvesting Plan
            </DialogTitle>
            <DialogDescription className="text-sm text-on-surface-variant mt-1">
              Review and confirm the tax harvesting execution
            </DialogDescription>
          </div>

          {executionStatus === 'idle' && (
            <>
              {/* Summary Statistics */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-surface-container-low rounded-2xl">
                <div>
                  <p className="text-xs text-on-surface-variant uppercase font-semibold tracking-wider mb-2">
                    Total Gain
                  </p>
                  <p className="text-2xl font-bold text-secondary tabular">
                    ₹{formatINR(totalGain)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase font-semibold tracking-wider mb-2">
                    Units to Sell
                  </p>
                  <p className="text-2xl font-bold text-primary tabular">
                    {totalUnits.toFixed(3)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase font-semibold tracking-wider mb-2">
                    Tax Saved
                  </p>
                  <p className="text-2xl font-bold text-secondary-container tabular">
                    ₹{formatINR(totalTaxSaved)}
                  </p>
                </div>
              </div>

              {/* Suggestions List */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Execution Plan
                </p>
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-outline-variant rounded-xl bg-surface-container-lowest"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-on-surface">{suggestion.schemeName}</p>
                        <p className="text-xs text-on-surface-variant mt-1">
                          {suggestion.unitsToSell.toFixed(3)} Units @ ₹{suggestion.sellValuePerUnit.toFixed(2)}
                        </p>
                      </div>
                      <p className="font-headline font-bold text-secondary tabular">
                        ₹{formatINR(suggestion.profitTotal)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-surface-container rounded-lg">
                        <p className="text-on-surface-variant uppercase text-[9px] font-semibold mb-1">
                          Cost Basis
                        </p>
                        <p className="font-bold text-on-surface tabular">
                          ₹{formatINR(suggestion.costBasisTotal)}
                        </p>
                      </div>
                      <div className="p-2 bg-surface-container rounded-lg">
                        <p className="text-on-surface-variant uppercase text-[9px] font-semibold mb-1">
                          Sell Value
                        </p>
                        <p className="font-bold text-on-surface tabular">
                          ₹{formatINR(suggestion.sellValueTotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Warning/Info */}
              <div className="flex items-start gap-3 p-4 bg-surface-container-high rounded-xl">
                <span className="material-symbols-outlined text-on-surface-variant text-lg flex-shrink-0 mt-0.5">
                  info
                </span>
                <div className="text-sm text-on-surface-variant">
                  <p className="font-semibold mb-1">Reinvestment Required</p>
                  <p>
                    All proceeds will be reinvested in the same funds to reset your cost basis and maximize tax efficiency.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-outline-variant">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-3 px-4 bg-surface-container rounded-xl font-bold text-primary hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isExecuting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="flex-1 py-3 px-4 bg-secondary text-on-secondary rounded-xl font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isExecuting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">
                        hourglass_bottom
                      </span>
                      Executing...
                    </>
                  ) : (
                    'Execute'
                  )}
                </button>
              </div>
            </>
          )}

          {/* Success State */}
          {executionStatus === 'success' && (
            <div className="py-8 text-center space-y-4">
              <div className="flex justify-center">
                <span className="material-symbols-outlined text-6xl text-secondary-fixed">
                  check_circle
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-2">Execution Successful</h3>
                <p className="text-sm text-on-surface-variant">
                  Your harvesting plan has been executed. Proceeds will be reinvested automatically.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {executionStatus === 'error' && (
            <div className="py-8 text-center space-y-4">
              <div className="flex justify-center">
                <span className="material-symbols-outlined text-6xl text-error">
                  error
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-error mb-2">Execution Failed</h3>
                <p className="text-sm text-on-surface-variant mb-4">
                  Something went wrong during execution. Please try again or contact support.
                </p>
                <button
                  onClick={() => setExecutionStatus('idle')}
                  className="px-6 py-2 bg-error text-on-error rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Sell Tax Estimator Modal
 * 
 * Real-time tax estimation when user enters units to sell.
 * Uses uncontrolled Dialog pattern (matches SetTargetModal from Phase 2).
 */

'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { estimateSellTax } from '@/lib/tax/engine'
import { getTaxAssetClass } from '@/lib/tax/rules'
import { formatINR } from '@/lib/utils'
import type { HoldingRowWithAnalytics } from '@/lib/supabase/types'

interface SellTaxEstimatorModalProps {
  holding: HoldingRowWithAnalytics
  children: React.ReactNode
}

export function SellTaxEstimatorModal({ holding, children }: SellTaxEstimatorModalProps) {
  const [units, setUnits] = useState<number>(0)
  const [isOpen, setIsOpen] = useState(false)
  
  // Calculate tax estimation
  const estimation = useMemo(() => {
    if (!holding.current_nav || units <= 0 || units > holding.units) {
      return null
    }
    
    // Use average cost NAV as proxy for purchase NAV (simplified)
    // In a real implementation, we'd fetch actual tax lots
    const assetClass = getTaxAssetClass('')
    
    return estimateSellTax({
      purchaseDate: new Date('2020-01-01'), // Simplified - would use actual lot data
      purchaseNav: holding.avg_cost_nav || 0,
      units,
      saleNav: holding.current_nav,
      grandfatheringNav: null, // Would fetch from DB
      assetClass,
      isPostApr2023: false
    })
  }, [units, holding])
  
  const handleUnitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0
    setUnits(Math.min(value, holding.units))
  }
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setUnits(0) // Reset when closed
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <DialogTitle className="text-xl font-bold text-primary font-headline">
              Estimate Tax
            </DialogTitle>
            <p className="text-sm text-on-surface-variant mt-1">
              {holding.scheme_name}
            </p>
          </div>
          
          {/* Units Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">
              Units to Sell
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="0"
                max={holding.units}
                step="0.001"
                value={units || ''}
                onChange={handleUnitsChange}
                placeholder="Enter units"
                className="flex-1 px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-on-surface-variant">
                Max: {holding.units.toFixed(3)}
              </span>
            </div>
          </div>
          
          {/* Tax Breakdown */}
          {estimation && (
            <div className="space-y-4 p-4 bg-surface-container-low rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant">Total Gain</span>
                <span className={`font-bold tabular ${(estimation.ltcgGain + estimation.stcgGain) >= 0 ? 'text-secondary' : 'text-error'}`}>
                  {(estimation.ltcgGain + estimation.stcgGain) >= 0 ? '+' : ''}₹{formatINR(estimation.ltcgGain + estimation.stcgGain)}
                </span>
              </div>

              {/* LTCG row */}
              {estimation.ltcgGain > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-surface-variant">LTCG Gain</span>
                  <span className="font-bold tabular text-secondary">+₹{formatINR(estimation.ltcgGain)}</span>
                </div>
              )}
              {estimation.ltcgRate !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-surface-variant">LTCG Tax Rate</span>
                  <span className="font-bold text-primary">{(estimation.ltcgRate * 100).toFixed(1)}%</span>
                </div>
              )}

              {/* STCG row */}
              {estimation.stcgGain > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-surface-variant">STCG Gain</span>
                  <span className="font-bold tabular text-secondary">+₹{formatINR(estimation.stcgGain)}</span>
                </div>
              )}
              {estimation.stcgRate !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-surface-variant">STCG Tax Rate</span>
                  <span className="font-bold text-primary">{(estimation.stcgRate * 100).toFixed(1)}%</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant">Holding Period</span>
                <span className="font-bold tabular">
                  {estimation.holdingDays} days
                </span>
              </div>

              <div className="border-t border-outline-variant pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-primary">Estimated Tax</span>
                  <span className="text-2xl font-bold text-primary tabular">
                    ₹{formatINR(estimation.totalEstimatedTax)}
                  </span>
                </div>
              </div>

              {estimation.grandfatheringApplied && (
                <div className="flex items-center gap-2 p-2 bg-secondary-container/30 rounded-lg">
                  <span className="material-symbols-outlined text-secondary text-sm">info</span>
                  <span className="text-xs text-secondary">
                    Grandfathering applied (pre-2018 holding)
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 p-2 bg-surface-container-high rounded-lg">
                <span className="material-symbols-outlined text-on-surface-variant text-sm">lightbulb</span>
                <span className="text-xs text-on-surface-variant">
                  Reinvest proceeds in the same fund to reset cost basis
                </span>
              </div>
            </div>
          )}
          
          {/* No estimation */}
          {!estimation && units > 0 && (
            <div className="p-4 bg-error-container/30 rounded-2xl text-error text-sm">
              Please enter a valid number of units (max {holding.units.toFixed(3)})
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

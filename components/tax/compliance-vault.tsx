/**
 * Compliance Vault Component
 * 
 * Shows LTCG exemption tracker and key dates.
 * Replaces ITR download (deferred to v2).
 * 4-column card following design.
 */

import { daysUntilMarch31 } from '@/lib/tax/fy-utils'
import { formatINR } from '@/lib/utils'

interface ComplianceVaultProps {
  exemptionUsed: number
  exemptionLimit?: number
  ltcgLiability?: number
  className?: string
}

export function ComplianceVault({
  exemptionUsed,
  exemptionLimit = 125000,
  ltcgLiability = 0,
  className = ''
}: ComplianceVaultProps) {
  const remaining = Math.max(0, exemptionLimit - exemptionUsed)
  const daysLeft = daysUntilMarch31()
  
  return (
    <div className={`bg-surface-container-highest rounded-3xl p-6 md:p-8 flex flex-col gap-6 ${className}`}>
      <h4 className="text-lg font-bold text-primary">Compliance Vault</h4>
      
      <div className="space-y-4">
        {/* Exemption Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-on-surface-variant font-medium">Exemption Used</span>
            <span className="font-bold text-primary tabular">
              ₹{formatINR(exemptionUsed)} <span className="text-on-surface-variant font-normal">of ₹{formatINR(exemptionLimit)}</span>
            </span>
          </div>
          <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
            <div 
              className="bg-secondary h-full rounded-full transition-all"
              style={{ width: `${Math.min((exemptionUsed / exemptionLimit) * 100, 100)}%` }}
            />
          </div>
        </div>
        
        {/* Remaining Exemption */}
        <div className="flex justify-between items-center p-4 bg-surface-container-lowest rounded-2xl">
          <span className="text-sm font-medium text-on-surface-variant">Remaining</span>
          <span className="font-headline font-bold text-secondary tabular">
            ₹{formatINR(remaining)}
          </span>
        </div>
        
        {/* Days to March 31 */}
        <div className="flex justify-between items-center p-4 bg-surface-container-lowest rounded-2xl">
          <span className="text-sm font-medium text-on-surface-variant">Key Deadline</span>
          <div className="flex items-center gap-2">
            <span className="font-headline font-bold text-primary tabular">
              Mar 31
            </span>
            {daysLeft > 0 && (
              <span className="px-2 py-0.5 bg-error-container text-error rounded-full text-[10px] font-bold">
                {daysLeft}d left
              </span>
            )}
          </div>
        </div>
        
        {/* Estimated Tax Liability */}
        {ltcgLiability > 0 && (
          <div className="flex justify-between items-center p-4 bg-error-container/30 rounded-2xl">
            <span className="text-sm font-medium text-error">Est. Tax Due</span>
            <span className="font-headline font-bold text-error tabular">
              ₹{formatINR(ltcgLiability)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

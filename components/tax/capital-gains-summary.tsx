/**
 * Capital Gains Summary Card
 * 
 * Displays LTCG and STCG breakdown per holder/FY.
 * Uses bento card pattern from design: bg-surface-container-lowest rounded-2xl shadow-sm
 */

import { formatINR } from '@/lib/utils'

interface CapitalGainsSummaryProps {
  ltcg: number
  stcg: number
  exemptionUsed: number
  exemptionLimit?: number
  fyLabel: string
  className?: string
}

export function CapitalGainsSummary({
  ltcg,
  stcg,
  exemptionUsed,
  exemptionLimit = 125000,
  fyLabel,
  className = ''
}: CapitalGainsSummaryProps) {
  const exemptionPercentage = Math.min((exemptionUsed / exemptionLimit) * 100, 100)
  
  return (
    <div className={`bg-surface-container-lowest rounded-3xl p-8 md:p-10 flex flex-col justify-between ${className}`}>
      <div className="flex justify-between items-start mb-8">
        <div>
          <span className="label-sm uppercase tracking-widest text-on-surface-variant font-bold text-[10px]">
            Realized Gains Summary
          </span>
          <h3 className="text-3xl font-headline font-bold text-primary mt-2">
            Capital Gains {fyLabel}
          </h3>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-surface-container-highest rounded-full text-[10px] font-bold text-primary uppercase tracking-tighter">
            Live Status
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
        {/* LTCG */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-on-surface-variant">Long Term (LTCG)</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-headline font-extrabold text-primary tabular tracking-tight">
              ₹{formatINR(ltcg)}
            </span>
          </div>
          <div className="w-full bg-surface-container-high h-1 rounded-full mt-4">
            <div 
              className="bg-primary h-full rounded-full transition-all" 
              style={{ width: `${exemptionPercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-on-surface-variant font-medium pt-2 italic">
            Exemption Limit: ₹{formatINR(exemptionLimit)} used
          </p>
        </div>
        
        {/* STCG */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-on-surface-variant">Short Term (STCG)</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-headline font-extrabold text-primary tabular tracking-tight">
              ₹{formatINR(stcg)}
            </span>
          </div>
          <div className="w-full bg-surface-container-high h-1 rounded-full mt-4">
            <div className="bg-secondary h-1 rounded-full" style={{ width: '25%' }} />
          </div>
          <p className="text-[10px] text-on-surface-variant font-medium pt-2">
            Tax Rate: 20% applicable
          </p>
        </div>
      </div>
    </div>
  )
}

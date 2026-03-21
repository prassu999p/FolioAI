/**
 * LTCG Harvesting Hero Section
 * 
 * Dark bg-primary card with harvesting suggestions.
 * Follows design from tax_and_ai.html.
 */

import { computeHarvestingSuggestions, calculateHarvestingSavings } from '@/lib/tax/harvesting'
import { formatINR } from '@/lib/utils'
import type { UnrealizedGain } from '@/lib/tax/types'

interface HarvestingHeroProps {
  unrealizedGains: UnrealizedGain[]
  ltcgUsedThisFY: number
  currentNavs: Map<number, number>
  schemeNames: Map<number, string>
  isPriorFY?: boolean
  className?: string
}

export function HarvestingHero({
  unrealizedGains,
  ltcgUsedThisFY,
  currentNavs,
  schemeNames,
  isPriorFY = false,
  className = ''
}: HarvestingHeroProps) {
  const suggestions = computeHarvestingSuggestions(
    unrealizedGains,
    ltcgUsedThisFY,
    currentNavs,
    schemeNames
  )
  
  const savings = calculateHarvestingSavings(suggestions)
  
  // If no suggestions or prior FY, show read-only mode
  const isReadOnly = isPriorFY || suggestions.length === 0
  
  return (
    <section className={`bg-primary text-on-primary rounded-[2.5rem] overflow-hidden relative shadow-2xl ${className}`}>
      {/* Gradient overlay */}
      <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none bg-gradient-to-l from-secondary-container to-transparent" />
      
      <div className="p-12 md:p-16 relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
        {/* Left: Header and message */}
        <div className="max-w-xl">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-secondary-container" data-icon="auto_awesome" data-weight="fill">
              auto_awesome
            </span>
            <span className="uppercase tracking-widest text-secondary-container font-black text-xs">
              Priority AI Optimization
            </span>
          </div>
          
          {isReadOnly ? (
            <>
              <h2 className="text-4xl font-headline font-extrabold leading-tight mb-4">
                Tax Harvesting Review
              </h2>
              <p className="text-surface-variant/80 text-lg font-light leading-relaxed">
                {isPriorFY 
                  ? `Historical harvesting data for ${new Date().getFullYear() - 1}-${new Date().getFullYear()}. Current FY suggestions available.`
                  : 'No harvesting opportunities available at this time. Your unrealized gains are below the exemption threshold.'
                }
              </p>
            </>
          ) : (
            <>
              <h2 className="text-5xl font-headline font-extrabold leading-tight mb-4">
                Harvest ₹1,25,000 in LTCG now to save <span className="text-secondary-container">₹{formatINR(savings.totalTaxSaved)}</span> in taxes.
              </h2>
              <p className="text-surface-variant/80 text-lg font-light leading-relaxed">
                Your current portfolio has unrealized gains exceeding the tax-free limit. 
                Our engine has identified {suggestions.length} {suggestions.length === 1 ? 'fund' : 'funds'} to liquidate and reinvest instantly.
              </p>
            </>
          )}
        </div>
        
        {/* Right: Execution Plan Card */}
        <div className="w-full md:w-96 bg-primary-container rounded-3xl p-8 border border-white/5 space-y-6">
          <h5 className="text-xs font-bold uppercase tracking-widest text-surface-variant/60">
            {isReadOnly ? 'Historical Data' : 'Execution Plan'}
          </h5>
          
          <div className="space-y-4">
            {suggestions.length > 0 ? (
              suggestions.map((suggestion, idx) => (
                <div key={idx} className="flex justify-between items-center pb-4 border-b border-white/10">
                  <div className="text-sm">
                    <p className="font-bold">{suggestion.schemeName}</p>
                    <p className="text-[10px] text-surface-variant/60">
                      {suggestion.unitsToSell.toFixed(3)} Units
                    </p>
                  </div>
                  <p className="font-headline font-bold text-secondary-container tabular tracking-tight">
                    ₹{formatINR(suggestion.ltcgToBook)}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-surface-variant/60">
                <span className="material-symbols-outlined text-4xl mb-4">check_circle</span>
                <p className="text-sm">No action needed</p>
              </div>
            )}
          </div>
          
          {!isReadOnly && suggestions.length > 0 && (
            <button className="w-full py-4 bg-secondary text-on-secondary rounded-xl font-bold hover:scale-[1.02] transition-transform">
              Execute Harvesting Plan
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

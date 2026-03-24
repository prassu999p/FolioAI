/**
 * Tax Intelligence Page
 * 
 * /families/[familyId]/tax
 * 
 * Shows capital gains summary, compliance vault, and harvesting suggestions.
 * Follows design from tax_and_ai.html.
 */

import { createClient } from '@/lib/supabase/server'
import { CapitalGainsSummary } from '@/components/tax/capital-gains-summary'
import { ComplianceVault } from '@/components/tax/compliance-vault'
import { FYToggle } from '@/components/tax/fy-toggle'
import { HarvestingHero } from '@/components/tax/harvesting-hero'
import { computeTaxSummary } from '@/lib/tax/engine'
import type { UnrealizedGain } from '@/lib/tax/types'
import { getCurrentFYBounds, getPriorFYBounds } from '@/lib/tax/fy-utils'
import { getTaxAssetClass } from '@/lib/tax/rules'
import type { AnalyticsTransaction } from '@/lib/supabase/types'

interface TaxPageProps {
  params: Promise<{ familyId: string }>
  searchParams: Promise<{ fy?: string }>
}

export default async function TaxIntelligencePage({ params, searchParams }: TaxPageProps) {
  const { familyId } = await params
  const { fy: fyParam } = await searchParams
  const isPriorFY = fyParam === 'prior'
  
  const supabase = await createClient()
  
  // Get family holders
  const { data: holdersData } = await supabase
    .from('holders')
    .select('id, name, pan, family_id')
    .eq('family_id', familyId) as { data: Array<{ id: string; name: string; pan: string; family_id: string }> | null }
  
  const holders = holdersData || []
  
  // Get current NAVs for all schemes
  const { data: navData } = await supabase
    .from('nav')
    .select('scheme_code, nav_date, nav')
    .order('nav_date', { ascending: false })
    .limit(500) as { data: Array<{ scheme_code: number; nav_date: string; nav: number }> | null }
  
  // Build current NAVs map (most recent nav per scheme)
  const currentNavs = new Map<number, number>()
  if (navData) {
    for (const nav of navData) {
      if (!currentNavs.has(nav.scheme_code)) {
        currentNavs.set(nav.scheme_code, nav.nav)
      }
    }
  }
  
  // Get grandfathering NAVs
  const { data: fgNavData } = await supabase
    .from('grandfathering_nav')
    .select('scheme_code, nav') as { data: Array<{ scheme_code: number; nav: number }> | null }
  
  const grandfatheringNavs = new Map<number, number>()
  if (fgNavData) {
    for (const nav of fgNavData) {
      grandfatheringNavs.set(nav.scheme_code, nav.nav)
    }
  }
  
  // Get funds for scheme names and categories
  const { data: fundsData } = await supabase
    .from('funds')
    .select('scheme_code, scheme_name, category') as { data: Array<{ scheme_code: number; scheme_name: string; category: string }> | null }
  
  const schemeNames = new Map<number, string>()
  const assetClasses = new Map<number, 'equity' | 'debt' | 'hybrid_aggressive' | 'hybrid_other'>()
  if (fundsData) {
    for (const fund of fundsData) {
      schemeNames.set(fund.scheme_code, fund.scheme_name)
      assetClasses.set(fund.scheme_code, getTaxAssetClass(fund.category || ''))
    }
  }
  
  // Determine FY bounds
  const fyBounds = isPriorFY ? getPriorFYBounds() : getCurrentFYBounds()
  
  // Process each holder
  let totalLTCG = 0
  let totalSTCG = 0
  const allUnrealizedGains = new Map<number, UnrealizedGain[]>()
  
  for (const holder of holders) {
    // Fetch all transactions for FIFO lot building (no date filter)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: txData } = await (supabase as any).rpc('get_holder_analytics_transactions', {
      p_holder_id: holder.id,
      p_start_date: null, // Full history for FIFO
      p_end_date: new Date().toISOString().split('T')[0],
    }) as { data: Array<{ folio_id: string; scheme_code: number; scheme_name: string; transaction_date: string; transaction_type: string; amount: number; units: number; nav: number }> | null }
    
    if (txData && txData.length > 0) {
      const summary = computeTaxSummary({
        transactions: txData as unknown as AnalyticsTransaction[],
        grandfatheringNavs,
        currentNavs,
        assetClasses,
        schemeNames,
        fyBounds: { start: fyBounds.start, end: fyBounds.end }
      })
      
      totalLTCG += summary.totalRealizedLTCG
      totalSTCG += summary.totalRealizedSTCG
      
      // Collect unrealized gains for harvesting
      for (const ug of summary.unrealizedGains) {
        const existing = allUnrealizedGains.get(ug.schemeCode) || []
        existing.push(ug)
        allUnrealizedGains.set(ug.schemeCode, existing)
      }
    }
  }
  
  // Flatten unrealized gains for harvesting
  const unrealizedGainsArray = Array.from(allUnrealizedGains.values()).flat()
  
  // Calculate exemption and liability
  const exemptionUsed = Math.max(0, totalLTCG)
  const exemptionLimit = 125000
  const ltcgTaxable = Math.max(0, totalLTCG - exemptionLimit)
  const estimatedLTCGTax = ltcgTaxable * 0.125
  
  return (
    <div className="space-y-8">
      {/* Header with FY Toggle */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary">Tax Intelligence</h2>
          <p className="text-xs text-on-surface-variant font-medium">
            {isPriorFY ? fyBounds.label : fyBounds.label} Summary
          </p>
        </div>
        <FYToggle />
      </div>
      
      {/* Top Row: Capital Gains + Compliance Vault */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Capital Gains Summary - 8 cols */}
        <div className="lg:col-span-8">
          <CapitalGainsSummary
            ltcg={totalLTCG}
            stcg={totalSTCG}
            exemptionUsed={exemptionUsed}
            exemptionLimit={exemptionLimit}
          />
        </div>
        
        {/* Compliance Vault - 4 cols */}
        <div className="lg:col-span-4">
          <ComplianceVault
            exemptionUsed={exemptionUsed}
            exemptionLimit={exemptionLimit}
            ltcgLiability={estimatedLTCGTax}
          />
        </div>
      </div>
      
      {/* Harvesting Hero Section */}
      <HarvestingHero
        unrealizedGains={unrealizedGainsArray}
        ltcgUsedThisFY={exemptionUsed}
        currentNavs={currentNavs}
        schemeNames={schemeNames}
        isPriorFY={isPriorFY}
      />
      
      {/* Placeholder for AI Narrative - will be added in Phase 4 */}
    </div>
  )
}

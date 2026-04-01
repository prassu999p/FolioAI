/**
 * LTCG Harvesting Suggestion Algorithm
 * 
 * Computes optimal suggestions to consume the ₹1.25L annual LTCG exemption
 * by strategically selling units with unrealized gains.
 */

import type { UnrealizedGain, HarvestingSuggestion } from './types'
import { LTCG_EXEMPTION_LIMIT, EQUITY_LTCG_RATE } from './rules'

/**
 * Compute harvesting suggestions to optimize tax savings
 * 
 * Algorithm:
 * 1. Filter to equity-class LTCG-qualifying lots with unrealizedGain > 0
 * 2. Sort by unrealized LTCG amount descending
 * 3. Greedily fill the remaining exemption
 * 4. Calculate exact units to sell for each holding
 */
export function computeHarvestingSuggestions(
  unrealizedGains: UnrealizedGain[],
  ltcgUsedThisFY: number,
  currentNavs: Map<number, number>,
  schemeNames: Map<number, string>
): HarvestingSuggestion[] {
  const remainingExemption = Math.max(0, LTCG_EXEMPTION_LIMIT - ltcgUsedThisFY)
  
  if (remainingExemption <= 0) {
    return []
  }

  // Filter to eligible gains:
  // - Equity class (or aggressive hybrid)
  // - Would be LTCG if sold today
  // - Has positive unrealized gain
  const eligibleGains = unrealizedGains
    .filter(g => {
      const isEquity = g.assetClass === 'equity' || g.assetClass === 'hybrid_aggressive'
      return isEquity && g.wouldBeLTCG && g.unrealizedGain > 0
    })
    .sort((a, b) => b.unrealizedGain - a.unrealizedGain)

  const suggestionsByScheme = new Map<number, HarvestingSuggestion>()
  let remainingExemptionConsumed = remainingExemption

  for (const gain of eligibleGains) {
    if (remainingExemptionConsumed <= 0) break

    // Calculate gain per unit
    const gainPerUnit = gain.currentNav - gain.effectiveCostBasis
    if (gainPerUnit <= 0) continue

    // How much LTCG can we book from this holding?
    const gainToBook = Math.min(gain.unrealizedGain, remainingExemptionConsumed)

    // Calculate exact units to sell (floor to 3 decimal places)
    const unitsToSell = Math.floor((gainToBook / gainPerUnit) * 1000) / 1000

    if (unitsToSell <= 0) continue

    const ltcgToBook = unitsToSell * gainPerUnit
    const taxSaved = ltcgToBook * EQUITY_LTCG_RATE
    const schemeName = gain.schemeName || schemeNames.get(gain.schemeCode) || `Scheme ${gain.schemeCode}`

    // FIFO profit breakdown
    const costBasisPerUnit = gain.effectiveCostBasis
    const costBasisTotal = costBasisPerUnit * unitsToSell
    const sellValuePerUnit = gain.currentNav
    const sellValueTotal = sellValuePerUnit * unitsToSell
    const profitPerUnit = sellValuePerUnit - costBasisPerUnit
    const profitTotal = profitPerUnit * unitsToSell

    // Group by scheme code - consolidate multiple folios of same fund
    const existing = suggestionsByScheme.get(gain.schemeCode)
    if (existing) {
      existing.unitsToSell += unitsToSell
      existing.costBasisTotal += costBasisTotal
      existing.sellValueTotal += sellValueTotal
      existing.profitTotal += profitTotal
      existing.ltcgToBook += Math.round(ltcgToBook)
      existing.exemptionConsumed += Math.round(ltcgToBook)
      existing.taxSaved += Math.round(taxSaved)
    } else {
      suggestionsByScheme.set(gain.schemeCode, {
        schemeCode: gain.schemeCode,
        schemeName,
        unitsToSell,
        costBasisPerUnit,
        costBasisTotal,
        sellValuePerUnit,
        sellValueTotal,
        profitPerUnit,
        profitTotal: Math.round(profitTotal),
        ltcgToBook: Math.round(ltcgToBook),
        exemptionConsumed: Math.round(ltcgToBook),
        taxSaved: Math.round(taxSaved),
        reinvestInstruction: 'Reinvest proceeds in the same fund to reset cost basis'
      })
    }

    remainingExemptionConsumed -= ltcgToBook
  }

  return Array.from(suggestionsByScheme.values())
}

/**
 * Calculate total potential tax savings from harvesting suggestions
 */
export function calculateHarvestingSavings(suggestions: HarvestingSuggestion[]): {
  totalLTCGToBook: number
  totalTaxSaved: number
  exemptionUsed: number
} {
  let totalLTCGToBook = 0
  let totalTaxSaved = 0
  let exemptionUsed = 0

  for (const s of suggestions) {
    totalLTCGToBook += s.ltcgToBook
    totalTaxSaved += s.taxSaved
    exemptionUsed += s.exemptionConsumed
  }

  return {
    totalLTCGToBook,
    totalTaxSaved,
    exemptionUsed
  }
}

/**
 * Tax Engine Type Definitions
 * 
 * Pure TypeScript types for FIFO TaxLot-based tax calculations.
 * Follows the pattern from lib/analytics/xirr.ts
 */

/**
 * A tax lot represents a single purchase transaction that can be
 * partially or fully sold. Tax lots are consumed in FIFO order.
 */
export interface TaxLot {
  lotId: string           // synthetic: `${folio_id}-${transaction_date}-${idx}`
  folioId: string
  schemeCode: number
  purchaseDate: Date
  units: number           // original units in this lot
  remainingUnits: number  // units not yet sold
  purchaseNav: number     // cost basis per unit at purchase
  grandfatheringNav: number | null  // Jan 31 2018 NAV if pre-2018, else null
  assetClass: TaxAssetClass
  isPostApr2023: boolean // for debt: true = always slab rate
}

export type TaxAssetClass = 'equity' | 'debt' | 'hybrid_aggressive' | 'hybrid_other'

/**
 * Classification of capital gains based on holding period
 */
export type GainClassification = 'LTCG' | 'STCG' | 'SLAB'

/**
 * Realized gain from a sale transaction
 */
export interface RealizedGain {
  lotId: string
  saleDate: Date
  soldUnits: number
  costBasis: number         // per unit (after grandfathering formula applied)
  saleNav: number
  holdingDays: number
  gainPerUnit: number
  totalGain: number
  classification: GainClassification
  taxRate: number | null   // 0.125, 0.20, or null for slab
  isLTCG: boolean
}

/**
 * Unrealized gain for remaining holdings
 */
export interface UnrealizedGain {
  lotId: string
  currentNav: number
  currentDate: Date
  holdingDays: number
  effectiveCostBasis: number  // after grandfathering
  unrealizedGain: number
  wouldBeLTCG: boolean        // true if held long enough today
  assetClass: TaxAssetClass
  schemeCode: number
  schemeName?: string
}

/**
 * Complete tax summary for a holder or folio
 */
export interface TaxSummary {
  totalRealizedLTCG: number
  totalRealizedSTCG: number
  totalSlabGains: number
  ltcgExemptionUsed: number   // min(totalRealizedLTCG, 125000)
  ltcgTaxable: number          // max(totalRealizedLTCG - 125000, 0)
  estimatedLTCGTax: number    // ltcgTaxable * 0.125
  estimatedSTCGTax: number     // totalRealizedSTCG * 0.20
  lots: TaxLot[]
  realizedGains: RealizedGain[]
  unrealizedGains: UnrealizedGain[]
}

/**
 * LTCG harvesting suggestion
 */
export interface HarvestingSuggestion {
  schemeCode: number
  schemeName: string
  unitsToSell: number
  ltcgToBook: number
  exemptionConsumed: number
  taxSaved: number
  reinvestInstruction: string
}

/**
 * Tax estimation input for the sell estimator modal
 */
export interface TaxEstimationInput {
  folioId: string
  schemeCode: number
  schemeName: string
  currentUnits: number
  currentNav: number
  grandfatheringNav: number | null
  assetClass: TaxAssetClass
  isPostApr2023: boolean
  purchaseDate: Date
  purchaseNav: number
}

/**
 * Tax estimation result for the sell estimator modal
 */
export interface TaxEstimationResult {
  unitsSold: number
  ltcgGain: number
  stcgGain: number
  ltcgClassification: GainClassification
  stcgClassification: GainClassification
  ltcgRate: number | null
  stcgRate: number | null
  totalEstimatedTax: number
  grandfatheringApplied: boolean
  holdingDays: number
}

/**
 * FY bounds for tax calculations
 */
export interface FYBounds {
  start: Date      // April 1
  end: Date        // March 31
  label: string    // "FY25-26"
  fyYear: number   // 2025 for FY2025-26
}

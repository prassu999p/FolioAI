/**
 * Tax Rules Module
 * 
 * Tax rate lookup and classification based on asset class, purchase date,
 * and holding period. Uses date-fns for date arithmetic.
 */

import { differenceInDays } from 'date-fns'
import type { TaxAssetClass, GainClassification } from './types'

// Tax thresholds and rates
export const EQUITY_LTCG_THRESHOLD_DAYS = 365
export const DEBT_LTCG_THRESHOLD_DAYS = 730  // 24 months
export const EQUITY_LTCG_RATE = 0.125
export const EQUITY_STCG_RATE = 0.20
export const DEBT_LTCG_RATE = 0.125
export const LTCG_EXEMPTION_LIMIT = 125000

/**
 * Classify a gain based on holding period, asset class, and purchase date
 */
export function classifyGain(params: {
  holdingDays: number
  assetClass: TaxAssetClass
  isPostApr2023: boolean
}): { classification: GainClassification; taxRate: number | null } {
  const { holdingDays, assetClass, isPostApr2023 } = params

  // Post-April 2023 debt funds: always slab rate (Section 50AA)
  if (assetClass === 'debt' && isPostApr2023) {
    return { classification: 'SLAB', taxRate: null }
  }

  // Equity-oriented funds (including aggressive hybrids): 1-year rule
  if (assetClass === 'equity' || assetClass === 'hybrid_aggressive') {
    return holdingDays >= EQUITY_LTCG_THRESHOLD_DAYS
      ? { classification: 'LTCG', taxRate: EQUITY_LTCG_RATE }
      : { classification: 'STCG', taxRate: EQUITY_STCG_RATE }
  }

  // Debt and other hybrids: 24-month rule for pre-Apr 2023
  if (assetClass === 'debt' || assetClass === 'hybrid_other') {
    if (isPostApr2023) {
      return { classification: 'SLAB', taxRate: null }
    }
    return holdingDays >= DEBT_LTCG_THRESHOLD_DAYS
      ? { classification: 'LTCG', taxRate: DEBT_LTCG_RATE }
      : { classification: 'STCG', taxRate: null }  // slab rate, user-dependent
  }

  // Default fallback
  return { classification: 'STCG', taxRate: null }
}

/**
 * Apply grandfathering formula for pre-Feb 2018 equity holdings
 * 
 * Formula: MAX(actual cost, MIN(Jan 31 2018 NAV, sale price))
 * 
 * @param purchaseNav - Original purchase NAV per unit
 * @param grandfatheringNav - Jan 31 2018 NAV (if available)
 * @param saleNav - Current or sale NAV per unit
 * @returns Effective cost basis per unit after grandfathering
 */
export function applyGrandfathering(
  purchaseNav: number,
  grandfatheringNav: number | null,
  saleNav: number
): number {
  // No grandfathering if Jan 31 2018 NAV not available
  if (!grandfatheringNav) {
    return purchaseNav
  }

  // Formula: MAX(actual cost, MIN(jan31NAV, sale price))
  const fmv = grandfatheringNav
  return Math.max(purchaseNav, Math.min(fmv, saleNav))
}

/**
 * Calculate holding period in days between two dates
 */
export function calculateHoldingDays(purchaseDate: Date, saleDate: Date): number {
  return differenceInDays(saleDate, purchaseDate)
}

/**
 * Determine if a holding qualifies as equity-oriented for tax purposes
 * Uses 65% equity threshold per SEBI regulations
 * 
 * @param category - Fund category from AMFI/casparser
 * @returns TaxAssetClass classification
 */
export function getTaxAssetClass(category: string): TaxAssetClass {
  const cat = category.toLowerCase()
  
  // Pure equity
  if (cat.includes('large cap') || 
      cat.includes('mid cap') || 
      cat.includes('small cap') ||
      cat.includes('flexi cap') ||
      cat.includes('multi cap') ||
      cat.includes('value') ||
      cat.includes('growth') ||
      cat.includes('focus') ||
      cat.includes('eldest') ||
      cat.includes('dividend yield')) {
    return 'equity'
  }
  
  // Aggressive hybrid (>=65% equity)
  if (cat.includes('aggressive hybrid')) {
    return 'hybrid_aggressive'
  }
  
  // Balanced/Other hybrid (35-65% equity)
  if (cat.includes('balanced') || cat.includes('hybrid')) {
    return 'hybrid_other'
  }
  
  // Debt funds
  if (cat.includes('debt') || 
      cat.includes('liquid') || 
      cat.includes('money market') ||
      cat.includes('overnight') ||
      cat.includes('gilt') ||
      cat.includes('credit risk') ||
      cat.includes('corporate bond') ||
      cat.includes('banking') ||
      cat.includes('psu')) {
    return 'debt'
  }
  
  // Default to debt if unknown (conservative)
  return 'debt'
}

/**
 * Calculate estimated tax for a gain amount
 */
export function calculateTax(
  ltcgAmount: number,
  stcgAmount: number,
  ltcgClassification: GainClassification,
  stcgClassification: GainClassification
): { ltcgTax: number; stcgTax: number; totalTax: number } {
  let ltcgTax = 0
  let stcgTax = 0
  
  // LTCG tax calculation
  if (ltcgClassification === 'LTCG') {
    const taxableLTCG = Math.max(0, ltcgAmount - LTCG_EXEMPTION_LIMIT)
    ltcgTax = taxableLTCG * EQUITY_LTCG_RATE
  }
  
  // STCG tax calculation
  if (stcgClassification === 'STCG') {
    stcgTax = stcgAmount * EQUITY_STCG_RATE
  }
  
  // SLAB classification means user-dependent, we can't calculate
  // Display "at your slab rate" instead
  
  return {
    ltcgTax,
    stcgTax,
    totalTax: ltcgTax + stcgTax
  }
}

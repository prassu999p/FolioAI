/**
 * Tax Engine - Core FIFO TaxLot Computation
 * 
 * Pure TypeScript implementation for computing LTCG/STCG using FIFO method.
 * Follows the pattern from lib/analytics/xirr.ts - no SQL math.
 */

import { differenceInDays } from 'date-fns'
import type {
  TaxLot,
  RealizedGain,
  UnrealizedGain,
  TaxSummary,
  TaxAssetClass,
  TaxEstimationResult
} from './types'
import { 
  classifyGain, 
  applyGrandfathering, 
  EQUITY_LTCG_THRESHOLD_DAYS 
} from './rules'

// Epsilon for floating point comparison
const EPSILON = 0.001

/**
 * Transaction type compatible with database and RPC responses
 */
interface TaxTransaction {
  id?: string
  folio_id: string
  scheme_code: number
  transaction_type: string
  transaction_date: string
  units: number
  nav: number
  amount?: number
}

/**
 * Build tax lots from purchase transactions
 * Sorts by date ascending for FIFO order
 */
export function buildTaxLots(transactions: TaxTransaction[]): TaxLot[] {
  // Filter to only purchases and sort by date
  const purchases = transactions
    .filter(t => t.transaction_type === 'PURCHASE' || t.transaction_type === 'SIP')
    .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())

  const lots: TaxLot[] = []
  let idx = 0

  for (const tx of purchases) {
    const lot: TaxLot = {
      lotId: `${tx.folio_id}-${tx.transaction_date}-${idx}`,
      folioId: tx.folio_id,
      schemeCode: tx.scheme_code,
      purchaseDate: new Date(tx.transaction_date),
      units: tx.units,
      remainingUnits: tx.units,
      purchaseNav: tx.nav,
      grandfatheringNav: null, // Set by caller from grandfathering_nav table
      assetClass: 'equity', // Set by caller
      isPostApr2023: new Date(tx.transaction_date) >= new Date('2023-04-01')
    }
    lots.push(lot)
    idx++
  }

  return lots
}

/**
 * Deplete tax lots using FIFO for a redemption
 * Returns updated lots and realized gains
 */
export function depleteLots(
  lots: TaxLot[],
  redemption: TaxTransaction,
  saleNav: number,
  assetClass: TaxAssetClass,
  isPostApr2023: boolean
): { updatedLots: TaxLot[]; realizedGains: RealizedGain[] } {
  const realizedGains: RealizedGain[] = []
  let unitsToSell = redemption.units

  // Sort lots by purchase date (FIFO)
  const sortedLots = [...lots].sort(
    (a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime()
  )

  for (const lot of sortedLots) {
    if (unitsToSell <= 0) break
    if (lot.remainingUnits < EPSILON) continue

    const soldFromThisLot = Math.min(lot.remainingUnits, unitsToSell)
    const holdingDays = differenceInDays(
      new Date(redemption.transaction_date),
      lot.purchaseDate
    )

    // Apply grandfathering if applicable
    const effectiveCostBasis = applyGrandfathering(
      lot.purchaseNav,
      lot.grandfatheringNav,
      saleNav
    )

    // Classify the gain
    const { classification, taxRate } = classifyGain({
      holdingDays,
      assetClass,
      isPostApr2023
    })

    const gainPerUnit = saleNav - effectiveCostBasis
    const totalGain = soldFromThisLot * gainPerUnit

    realizedGains.push({
      lotId: lot.lotId,
      saleDate: new Date(redemption.transaction_date),
      soldUnits: soldFromThisLot,
      costBasis: effectiveCostBasis,
      saleNav,
      holdingDays,
      gainPerUnit,
      totalGain,
      classification,
      taxRate,
      isLTCG: classification === 'LTCG'
    })

    // Update lot remaining units
    lot.remainingUnits -= soldFromThisLot
    unitsToSell -= soldFromThisLot
  }

  // Filter out fully depleted lots
  const updatedLots = sortedLots.filter(l => l.remainingUnits > EPSILON)

  return { updatedLots, realizedGains }
}

/**
 * Compute unrealized gains for remaining lots
 */
export function computeUnrealizedGains(
  lots: TaxLot[],
  currentNavs: Map<number, number>,
  assetClasses: Map<number, TaxAssetClass>,
  schemeNames: Map<number, string>
): UnrealizedGain[] {
  const unrealizedGains: UnrealizedGain[] = []
  const today = new Date()

  for (const lot of lots) {
    if (lot.remainingUnits < EPSILON) continue

    const currentNav = currentNavs.get(lot.schemeCode) ?? lot.purchaseNav
    const holdingDays = differenceInDays(today, lot.purchaseDate)
    const assetClass = assetClasses.get(lot.schemeCode) ?? lot.assetClass
    
    // Determine if would be LTCG if sold today
    const wouldBeLTCG = holdingDays >= EQUITY_LTCG_THRESHOLD_DAYS &&
      (assetClass === 'equity' || assetClass === 'hybrid_aggressive')

    const effectiveCostBasis = applyGrandfathering(
      lot.purchaseNav,
      lot.grandfatheringNav,
      currentNav
    )

    const unrealizedGain = lot.remainingUnits * (currentNav - effectiveCostBasis)

    unrealizedGains.push({
      lotId: lot.lotId,
      currentNav,
      currentDate: today,
      holdingDays,
      effectiveCostBasis,
      unrealizedGain,
      wouldBeLTCG,
      assetClass,
      schemeCode: lot.schemeCode,
      schemeName: schemeNames.get(lot.schemeCode)
    })
  }

  return unrealizedGains
}

/**
 * Main entry point: compute complete tax summary
 */
export function computeTaxSummary(params: {
  transactions: TaxTransaction[]
  grandfatheringNavs: Map<number, number>  // schemeCode → Jan 31 2018 NAV
  currentNavs: Map<number, number>         // schemeCode → current NAV
  assetClasses: Map<number, TaxAssetClass> // schemeCode → asset class
  schemeNames: Map<number, string>          // schemeCode → fund name
  fyBounds?: { start: Date; end: Date }    // Filter realized gains to FY
}): TaxSummary {
  const { 
    transactions, 
    grandfatheringNavs, 
    currentNavs, 
    assetClasses,
    schemeNames,
    fyBounds 
  } = params

  // Build initial tax lots from purchases
  let lots = buildTaxLots(transactions)

  // Set grandfathering NAVs
  for (const lot of lots) {
    lot.grandfatheringNav = grandfatheringNavs.get(lot.schemeCode) ?? null
    lot.assetClass = assetClasses.get(lot.schemeCode) ?? 'equity'
  }

  // Process redemptions in date order
  const redemptions = transactions
    .filter(t => t.transaction_type === 'REDEMPTION' || t.transaction_type === 'SWITCH_OUT')
    .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())

  const allRealizedGains: RealizedGain[] = []

  for (const redemption of redemptions) {
    const saleNav = redemption.nav
    const schemeLots = lots.filter(l => l.folioId === redemption.folio_id)
    
    const { updatedLots, realizedGains } = depleteLots(
      schemeLots,
      redemption,
      saleNav,
      assetClasses.get(redemption.scheme_code) ?? 'equity',
      new Date(redemption.transaction_date) >= new Date('2023-04-01')
    )

    // Update lots
    lots = [
      ...lots.filter(l => l.folioId !== redemption.folio_id),
      ...updatedLots
    ]

    // Filter to FY if specified
    if (fyBounds) {
      const fyGains = realizedGains.filter(g => 
        g.saleDate >= fyBounds.start && g.saleDate <= fyBounds.end
      )
      allRealizedGains.push(...fyGains)
    } else {
      allRealizedGains.push(...realizedGains)
    }
  }

  // Compute unrealized gains
  const unrealizedGains = computeUnrealizedGains(
    lots,
    currentNavs,
    assetClasses,
    schemeNames
  )

  // Aggregate totals
  let totalRealizedLTCG = 0
  let totalRealizedSTCG = 0
  let totalSlabGains = 0

  for (const gain of allRealizedGains) {
    if (gain.classification === 'LTCG') {
      totalRealizedLTCG += gain.totalGain
    } else if (gain.classification === 'STCG') {
      totalRealizedSTCG += gain.totalGain
    } else {
      totalSlabGains += gain.totalGain
    }
  }

  // Calculate exemption and taxes
  const ltcgExemptionUsed = Math.min(totalRealizedLTCG, 125000)
  const ltcgTaxable = Math.max(0, totalRealizedLTCG - 125000)
  const estimatedLTCGTax = ltcgTaxable * 0.125
  const estimatedSTCGTax = totalRealizedSTCG * 0.20

  return {
    totalRealizedLTCG,
    totalRealizedSTCG,
    totalSlabGains,
    ltcgExemptionUsed,
    ltcgTaxable,
    estimatedLTCGTax,
    estimatedSTCGTax,
    lots,
    realizedGains: allRealizedGains,
    unrealizedGains
  }
}

/**
 * Estimate tax for a potential sale (used by sell estimator modal)
 */
export function estimateSellTax(params: {
  purchaseDate: Date
  purchaseNav: number
  units: number
  saleNav: number
  grandfatheringNav: number | null
  assetClass: TaxAssetClass
  isPostApr2023: boolean
}): TaxEstimationResult {
  const { 
    purchaseDate, 
    purchaseNav, 
    units, 
    saleNav, 
    grandfatheringNav,
    assetClass,
    isPostApr2023 
  } = params

  const holdingDays = differenceInDays(new Date(), purchaseDate)
  const effectiveCostBasis = applyGrandfathering(purchaseNav, grandfatheringNav, saleNav)
  const totalGain = units * (saleNav - effectiveCostBasis)

  const { classification, taxRate } = classifyGain({
    holdingDays,
    assetClass,
    isPostApr2023
  })

  let taxAmount = 0
  if (classification === 'LTCG') {
    // First check exemption
    const taxableGain = Math.max(0, totalGain - 125000)
    taxAmount = taxableGain * 0.125
  } else if (classification === 'STCG') {
    taxAmount = totalGain * 0.20
  }

  const isLTCG = classification === 'LTCG'
  const ltcgGain = isLTCG ? totalGain : 0
  const stcgGain = isLTCG ? 0 : totalGain

  return {
    unitsSold: units,
    ltcgGain,
    stcgGain,
    ltcgClassification: classification,
    stcgClassification: classification,
    ltcgRate: isLTCG ? taxRate : null,
    stcgRate: isLTCG ? null : taxRate,
    totalEstimatedTax: Math.max(0, taxAmount),
    grandfatheringApplied: !!grandfatheringNav && grandfatheringNav < purchaseNav,
    holdingDays,
  }
}

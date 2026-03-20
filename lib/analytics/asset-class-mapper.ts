import { z } from 'zod'

/**
 * Asset class types used for portfolio allocation.
 * Maps SEBI mutual fund categories to broad investment asset classes.
 */
export type AssetClass = 'equity' | 'debt' | 'gold' | 'international'

export interface AssetAllocation {
  equity: number
  debt: number
  gold: number
  international: number
}

// SEBI category keyword lists (covers both pre-2026 and Feb 2026 recategorization)
// Source: SEBI circular Feb 2026 + AMFI category taxonomy
// https://www.sebi.gov.in/legal/circulars/feb-2026/categorization-and-rationalization-of-mutual-fund-schemes_99983.html

const GOLD_KEYWORDS = [
  'gold', 'silver',  // Silver ETF included for completeness
]

const INTERNATIONAL_KEYWORDS = [
  'international', 'overseas', 'global', 'foreign', 'us equity',
  'nasdaq', 'fof overseas', 'fund of fund', 'fof',
]

const DEBT_KEYWORDS = [
  'debt', 'overnight', 'liquid', 'ultra short duration', 'low duration',
  'short duration', 'medium duration', 'long duration', 'money market',
  'corporate bond', 'credit risk', 'banking and psu', 'gilt', 'floater',
  'fixed maturity', 'fmp', 'dynamic bond', 'sectoral debt',
]

const EQUITY_KEYWORDS = [
  'equity', 'large cap', 'mid cap', 'small cap', 'large & mid cap',
  'multi cap', 'flexi cap', 'focused', 'contra', 'value', 'elss',
  'dividend yield', 'sectoral', 'thematic', 'infrastructure', 'banking',
  'fmcg', 'pharma', 'technology', 'consumption', 'nifty', 'sensex',
  'index fund',
]

/**
 * Map a SEBI fund category string to an asset class.
 *
 * Priority order: gold → international → debt → equity
 * (gold and international are more specific, checked first)
 * Fallback: 'equity' (hybrid/solution-oriented funds lean equity)
 *
 * @param category - SEBI fund category string from funds.category
 * @returns AssetClass
 */
export function mapCategoryToAssetClass(category: string): AssetClass {
  const lower = category.toLowerCase()

  // Check most specific first: gold > international > debt > equity
  if (GOLD_KEYWORDS.some(k => lower.includes(k))) return 'gold'
  if (INTERNATIONAL_KEYWORDS.some(k => lower.includes(k))) return 'international'
  if (DEBT_KEYWORDS.some(k => lower.includes(k))) return 'debt'
  if (EQUITY_KEYWORDS.some(k => lower.includes(k))) return 'equity'

  // Fallback: hybrid/solution-oriented funds lean equity per SEBI classification
  return 'equity'
}

/**
 * Zod schema for allocation target validation.
 *
 * Rules:
 * - Each field: 0-100 (individual asset class percentages)
 * - Total sum must not exceed 100% (partial allocation allowed — remainder = unclassified/cash)
 */
export const AllocationTargetSchema = z.object({
  equity:        z.number().min(0).max(100),
  debt:          z.number().min(0).max(100),
  gold:          z.number().min(0).max(100),
  international: z.number().min(0).max(100),
}).refine(
  data => data.equity + data.debt + data.gold + data.international <= 100,
  { message: 'Total allocation cannot exceed 100%' }
)

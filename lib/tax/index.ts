/**
 * Tax Engine Library
 * 
 * Pure TypeScript FIFO-based tax computation for Indian mutual funds.
 * 
 * @example
 * import { computeTaxSummary } from 'lib/tax'
 * 
 * const summary = computeTaxSummary({
 *   transactions: [...],
 *   grandfatheringNavs: new Map([[512345, 245.67]]),
 *   currentNavs: new Map([[512345, 312.45]]),
 *   assetClasses: new Map([[512345, 'equity']]),
 *   schemeNames: new Map([[512345, 'HDFC Top 100']])
 * })
 */

export * from './types'
export * from './rules'
export * from './engine'
export * from './fy-utils'
export * from './harvesting'

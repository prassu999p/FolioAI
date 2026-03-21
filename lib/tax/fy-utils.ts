/**
 * FY Utilities for Tax Calculations
 * 
 * Helper functions for working with Indian Financial Year (April - March).
 * Extends pattern from lib/analytics/period-utils.ts
 */

import { differenceInDays } from 'date-fns'
import type { FYBounds } from './types'

/**
 * Get FY bounds for a given FY year
 * @param fyYear - The year the FY starts (e.g., 2025 for FY2025-26)
 */
export function getFYBounds(fyYear: number): FYBounds {
  return {
    start: new Date(fyYear, 3, 1),        // April 1
    end: new Date(fyYear + 1, 2, 31),   // March 31
    label: `FY${String(fyYear).slice(2)}-${String(fyYear + 1).slice(2)}`,
    fyYear
  }
}

/**
 * Get the current FY year
 * Returns 2025 if we're in FY2025-26 (April 2025 - March 2026)
 */
export function getCurrentFYYear(): number {
  const now = new Date()
  // If April or later, we're in the current calendar year's FY
  // If Jan-Mar, we're still in previous calendar year's FY
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
}

/**
 * Get the prior FY year (one year before current)
 */
export function getPriorFYYear(): number {
  return getCurrentFYYear() - 1
}

/**
 * Get the current FY bounds
 */
export function getCurrentFYBounds(): FYBounds {
  return getFYBounds(getCurrentFYYear())
}

/**
 * Get the prior FY bounds
 */
export function getPriorFYBounds(): FYBounds {
  return getFYBounds(getPriorFYYear())
}

/**
 * Calculate days until March 31 of current FY
 */
export function daysUntilMarch31(): number {
  const now = new Date()
  const { end } = getCurrentFYBounds()
  return Math.max(0, differenceInDays(end, now))
}

/**
 * Check if a date falls within the current FY
 */
export function isInCurrentFY(date: Date): boolean {
  const bounds = getCurrentFYBounds()
  return date >= bounds.start && date <= bounds.end
}

/**
 * Check if a date falls within the prior FY
 */
export function isInPriorFY(date: Date): boolean {
  const bounds = getPriorFYBounds()
  return date >= bounds.start && date <= bounds.end
}

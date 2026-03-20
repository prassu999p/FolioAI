/**
 * Period utilities for portfolio analytics.
 * Handles Indian financial year (April 1 – March 31) and
 * standard time period bounds (1M, 3M, 6M, 1Y, 3Y, all).
 */

export type Period = '1M' | '3M' | '6M' | '1Y' | '3Y' | 'all'

/**
 * Get start/end date bounds for a given period string.
 *
 * @param period - '1M', '3M', '6M', '1Y', '3Y', or 'all'
 * @returns { start: Date, end: Date } or null for 'all' (no date filter)
 */
export function getPeriodBounds(period: string): { start: Date; end: Date } | null {
  if (period === 'all') return null

  const msMap: Record<string, number> = {
    '1M':  30,
    '3M':  90,
    '6M':  180,
    '1Y':  365,
    '3Y':  1095,
  }

  const days = msMap[period]
  if (!days) return null

  const now = new Date()
  return {
    start: new Date(now.getTime() - days * 86400_000),
    end: now,
  }
}

/**
 * Get the current Indian financial year bounds.
 * Indian FY runs April 1 – March 31.
 *
 * @returns { start: April 1 of current FY, end: March 31 of next calendar year }
 */
export function getCurrentFY(): { start: Date; end: Date } {
  const now = new Date()
  // If month is April (3) or later in 0-indexed month, we're in FY starting this calendar year
  // Otherwise (Jan/Feb/Mar), we're in FY that started the previous calendar year
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return {
    start: new Date(year, 3, 1),       // April 1 of the FY start year
    end:   new Date(year + 1, 2, 31),  // March 31 of next calendar year
  }
}

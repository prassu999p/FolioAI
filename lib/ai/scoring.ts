import type { ScoringSignals, AlphaInput } from './types'

/**
 * Compute fund alpha: fund XIRR minus Nifty 50 XIRR over same period.
 * Returns null if insufficient data (< 3 months).
 */
export function computeAlpha(_input: AlphaInput): number | null {
  throw new Error('Not implemented — Phase 4 Plan 02')
}

/**
 * Compute AUM trend from NAV × units over the last 6 months.
 * Returns 'insufficient_data' if fewer than 3 data points.
 */
export function computeAUMTrend(
  _navHistory: Array<{ date: string; nav: number }>,
  _units: number
): ScoringSignals['aum_trend'] {
  throw new Error('Not implemented — Phase 4 Plan 02')
}

/**
 * Rule-based quality score 0-100 from weighted signals.
 * Weights: alpha 50%, expense ratio rank 30%, AUM stability 20%.
 * Claude does NOT produce this number.
 */
export function computeQualityScore(_signals: ScoringSignals): number {
  throw new Error('Not implemented — Phase 4 Plan 02')
}

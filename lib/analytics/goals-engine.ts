// lib/analytics/goals-engine.ts
import { differenceInCalendarDays } from 'date-fns'

export interface GoalProjection {
  projectedCorpus: number
  currentLinkedValue: number
  progressPct: number
  isOnTrack: boolean
  yearsToTarget: number
}

/**
 * Compute the projected corpus value using compound growth.
 *
 * @param currentLinkedValue - Current value of linked holdings (₹)
 * @param assumedCagrPct - Assumed annual growth rate as a percentage (e.g. 12 for 12%)
 * @param yearsToTarget - Fractional years remaining until the target date
 * @returns Projected corpus value at target date
 */
export function computeProjectedCorpus(
  currentLinkedValue: number,
  assumedCagrPct: number,
  yearsToTarget: number
): number {
  if (yearsToTarget <= 0) return currentLinkedValue
  return currentLinkedValue * Math.pow(1 + assumedCagrPct / 100, yearsToTarget)
}

/**
 * Compute the full goal projection for a given goal and current linked value.
 *
 * When currentLinkedValue is 0 and totalHolderAUM is provided, uses totalHolderAUM
 * as the base value (fallback for goals with no explicitly linked holdings).
 *
 * @param goal - Goal record with target_amount, assumed_cagr, and target_date (ISO string)
 * @param currentLinkedValue - Current value of holdings explicitly linked to this goal
 * @param totalHolderAUM - Total portfolio value for the holder (fallback when no linked holdings)
 * @returns GoalProjection containing projected corpus, progress, on-track status, and years
 */
export function computeGoalProjection(
  goal: { target_amount: number; assumed_cagr: number; target_date: string },
  currentLinkedValue: number,
  totalHolderAUM?: number
): GoalProjection {
  // Fallback: use totalHolderAUM when no holdings are explicitly linked to the goal
  const baseValue =
    currentLinkedValue === 0 && totalHolderAUM !== undefined && totalHolderAUM > 0
      ? totalHolderAUM
      : currentLinkedValue

  const targetDate = new Date(goal.target_date)
  const now = new Date()

  // Use fractional years for more accurate projections on sub-year goals
  const daysToTarget = differenceInCalendarDays(targetDate, now)
  const yearsToTarget = daysToTarget / 365

  const projectedCorpus = computeProjectedCorpus(baseValue, goal.assumed_cagr, yearsToTarget)

  const progressPct = Math.min((baseValue / goal.target_amount) * 100, 100)

  const isOnTrack = projectedCorpus >= goal.target_amount

  return {
    projectedCorpus,
    currentLinkedValue: baseValue,
    progressPct,
    isOnTrack,
    yearsToTarget,
  }
}

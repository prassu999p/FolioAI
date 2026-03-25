// lib/analytics/goals-engine.ts
// Stub — implementation in 05-02-PLAN.md (TDD plan)
import { differenceInYears } from 'date-fns'

export interface GoalProjection {
  projectedCorpus: number
  currentLinkedValue: number
  progressPct: number
  isOnTrack: boolean
  yearsToTarget: number
}

export function computeProjectedCorpus(
  _currentLinkedValue: number,
  _assumedCagrPct: number,
  _yearsToTarget: number
): number {
  throw new Error('Not implemented')
}

export function computeGoalProjection(
  _goal: { target_amount: number; assumed_cagr: number; target_date: string },
  _currentLinkedValue: number,
  _totalHolderAUM?: number
): GoalProjection {
  throw new Error('Not implemented')
}

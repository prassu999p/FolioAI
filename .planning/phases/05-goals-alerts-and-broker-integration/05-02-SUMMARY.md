---
phase: 05-goals-alerts-and-broker-integration
plan: 02
subsystem: analytics
tags: [tdd, goals, projection, pure-logic]
requires: [05-01]
provides: [goals-engine-implementation]
affects: [goals-page, goal-cards]
tech_stack:
  added: []
  patterns: [TDD RED-GREEN, fractional-years via date-fns]
key_files:
  created: []
  modified:
    - lib/analytics/goals-engine.ts
    - tests/goals-engine.test.ts
decisions:
  - "differenceInCalendarDays/365 used for fractional years — sub-year goals need accurate projections, not integer truncation"
  - "computeGoalProjection uses baseValue internally for fallback — currentLinkedValue returned as baseValue in GoalProjection so callers see the effective value"
metrics:
  duration: 63s
  completed: 2026-03-25
  tasks_completed: 2
  files_modified: 2
---

# Phase 05 Plan 02: Goals Projection Engine Summary

TDD implementation of goals projection engine — compound growth formula with fractional-year precision and fallback to totalHolderAUM when no holdings are linked.

## What Was Built

`computeProjectedCorpus` and `computeGoalProjection` — real implementations replacing the Wave 0 stubs in `lib/analytics/goals-engine.ts`, verified by 8 green Vitest tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Add failing goals engine tests | 860224e | tests/goals-engine.test.ts |
| 2 (GREEN) | Implement goals projection engine | 4ac0436 | lib/analytics/goals-engine.ts |

## Key Decisions

1. **Fractional years via `differenceInCalendarDays/365`** — sub-year goals require fractional precision; integer `differenceInYears` would return 0 for anything under 12 months, breaking projections.

2. **`currentLinkedValue` in GoalProjection returns the effective base value** — when the fallback to `totalHolderAUM` fires, callers receive the actual value used for projection, not the original 0, ensuring UI components display meaningful numbers.

## Verification

```
npx vitest run tests/goals-engine.test.ts
Test Files  1 passed (1)
Tests       8 passed (8)

npx tsc --noEmit
(no output — clean)
```

Key assertion verified: `computeProjectedCorpus(100000, 12, 5)` returns 176234.17, within the required [176230, 176240] range.

## Deviations from Plan

None — plan executed exactly as written. TDD RED-GREEN-REFACTOR followed. No refactor commit required as JSDoc was added inline during GREEN and no constants needed extraction.

## Self-Check

- [x] `lib/analytics/goals-engine.ts` — exists with real implementations
- [x] `tests/goals-engine.test.ts` — 8 tests, all passing
- [x] Commits 860224e (RED) and 4ac0436 (GREEN) verified in git log

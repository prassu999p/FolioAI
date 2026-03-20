---
phase: 02-portfolio-analytics
plan: "02"
subsystem: analytics
tags: [xirr, newton-raphson, sip-detection, asset-class-mapper, zod, date-fns, vitest, tdd]

# Dependency graph
requires:
  - phase: 02-portfolio-analytics
    plan: "01"
    provides: 4 Vitest scaffold files with it.todo() stubs covering all Phase 2 analytics requirements

provides:
  - lib/analytics/xirr.ts: computeXIRR (Newton-Raphson, 100 iterations, 1e-8 convergence), computeGainLoss, buildPortfolioCashflows with sign convention
  - lib/analytics/period-utils.ts: getPeriodBounds (1M/3M/6M/1Y/3Y/all), getCurrentFY (Indian FY April-March)
  - lib/analytics/sip-detector.ts: detectActiveSIPs with 90-day window, 25-35d cadence, ±5% amount tolerance
  - lib/analytics/asset-class-mapper.ts: mapCategoryToAssetClass (gold→intl→debt→equity priority), AllocationTargetSchema (zod, sum ≤ 100)
  - 42 passing unit tests covering all financial math edge cases

affects:
  - 02-03-PLAN.md (benchmark data — uses period-utils.ts for date bounds)
  - 02-04-PLAN.md (holder analytics page — consumes all 4 lib/analytics modules)
  - 02-05-PLAN.md (SIP section and allocation section — sip-detector and asset-class-mapper)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Newton-Raphson XIRR: hand-rolled 40-line pure TypeScript, no npm dependency, same algorithm as Excel XIRR"
    - "Sign convention: purchases/SIPs/switch_in/dividend_reinvest = NEGATIVE cashflows; redemptions + current_value = POSITIVE"
    - "SIP detection: findSIPRun() algorithm finding longest run of ≥3 transactions with 25-35d gaps and ±5% amount tolerance"
    - "Asset class priority order: gold → international → debt → equity (more specific categories checked first)"
    - "Indian FY: month >= 3 (April=3 in 0-index) means current calendar year is FY start year"

key-files:
  created:
    - lib/analytics/xirr.ts
    - lib/analytics/period-utils.ts
    - lib/analytics/sip-detector.ts
    - lib/analytics/asset-class-mapper.ts
  modified:
    - tests/xirr.test.ts
    - tests/analytics.test.ts
    - tests/sip-detector.test.ts
    - tests/allocation.test.ts

key-decisions:
  - "TDD RED→GREEN for each pair: tests written with real assertions before implementation files created, import failure confirms RED"
  - "analytics.test.ts benchmark XIRR test uses top-level import (not require()) — ESM module system, require() aliases not supported by vitest's @/ path alias"
  - "SIP detection uses findSIPRun() helper that iterates from each potential run start, finding the longest qualifying run per folio"
  - "AllocationTargetSchema uses zod .refine() for sum constraint — individual field bounds (0-100) plus cross-field sum ≤ 100"

patterns-established:
  - "Pure TypeScript financial math: no npm packages for XIRR, SIP detection, or period calculations"
  - "Cashflow interface: { amount: number; date: Date } — amount negative = outflow, positive = inflow"
  - "FolioTransaction interface: { folio_id, scheme_name, transaction_type, transaction_date, amount } for SIP detection input"

requirements-completed: [PERF-01, PERF-02, PERF-03, PERF-05, PERF-06, SIP-01, SIP-02, ALLOC-01, ALLOC-02]

# Metrics
duration: 5min
completed: 2026-03-20
---

# Phase 2 Plan 02: Analytics Computation Library Summary

**Pure TypeScript Newton-Raphson XIRR, Indian FY period utils, SIP pattern detector with 25-35d cadence algorithm, and SEBI-2026-aware asset class mapper — 42 passing unit tests, zero new npm dependencies**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-20T11:36:53Z
- **Completed:** 2026-03-20T11:42:00Z
- **Tasks:** 2
- **Files modified:** 8 (4 created in lib/analytics/, 4 test files converted from stubs to real assertions)

## Accomplishments

- `lib/analytics/xirr.ts`: Newton-Raphson XIRR (100 iterations, 1e-8 convergence), computeGainLoss with null guard for missing NAV, buildPortfolioCashflows applying correct outflow/inflow sign convention
- `lib/analytics/period-utils.ts`: getPeriodBounds for 1M/3M/6M/1Y/3Y/all periods, getCurrentFY implementing Indian April-March financial year boundary
- `lib/analytics/sip-detector.ts`: detectActiveSIPs with 90-day lookback, findSIPRun() algorithm for 25-35d cadence / ±5% amount tolerance, date-fns addMonths() for month-end-safe next debit date computation
- `lib/analytics/asset-class-mapper.ts`: mapCategoryToAssetClass with SEBI 2026 keyword arrays, gold-first priority order, AllocationTargetSchema zod schema with cross-field sum ≤ 100 refinement
- 42 unit tests covering: XIRR known-value (10% annual), null guards, sign convention, gain/loss ₹ and %, period bounds timing, FY boundary (April 1 / March 31), SIP detection cadence, multi-folio separation, allocation schema rejection and acceptance

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement xirr.ts and period-utils.ts (RED → GREEN)** - `f1e7c8c` (feat)
2. **Task 2: Implement sip-detector.ts and asset-class-mapper.ts (RED → GREEN)** - `d4c6099` (feat)

## Files Created/Modified

- `lib/analytics/xirr.ts` - computeXIRR, computeGainLoss, buildPortfolioCashflows, Cashflow interface
- `lib/analytics/period-utils.ts` - getPeriodBounds, getCurrentFY, Period type
- `lib/analytics/sip-detector.ts` - detectActiveSIPs, SIPSummary interface, FolioTransaction interface
- `lib/analytics/asset-class-mapper.ts` - mapCategoryToAssetClass, AllocationTargetSchema, AssetClass type, AssetAllocation interface
- `tests/xirr.test.ts` - 10 real assertions (converted from 6 todo stubs)
- `tests/analytics.test.ts` - 13 real assertions (converted from 8 todo stubs)
- `tests/sip-detector.test.ts` - 7 real assertions (converted from 6 todo stubs, 1 extra multi-folio test added)
- `tests/allocation.test.ts` - 12 real assertions (converted from 8 todo stubs, 4 extra coverage tests added)

## Decisions Made

- TDD RED→GREEN pattern: tests written with real imports before implementation files existed; import failure confirmed RED phase
- analytics.test.ts benchmark test uses top-level import instead of require() — vitest's `@/` path alias doesn't resolve through CommonJS require(); top-level import works correctly
- findSIPRun() iterates from each candidate start position to find longest qualifying run per folio, not a greedy single-pass
- AllocationTargetSchema allows partial allocation (sum < 100) to represent unclassified/cash portion

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed benchmark XIRR test using require() instead of import**
- **Found during:** Task 1 (analytics.test.ts RED phase)
- **Issue:** Original analytics.test.ts benchmark test used `require('@/lib/analytics/xirr')` inside test body; vitest's `@/` alias doesn't resolve through CommonJS require(), causing "Cannot find module" error
- **Fix:** Changed to use the top-level ES import `computeXIRR` already imported at file top
- **Files modified:** tests/analytics.test.ts
- **Verification:** All 13 analytics tests pass after fix
- **Committed in:** f1e7c8c (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Minimal — single import syntax correction. No scope creep.

## Issues Encountered

Pre-existing failures in `tests/cas-import.test.ts` (8 failures) observed during full test run. These are out-of-scope pre-existing issues from Phase 1 — not caused by this plan's changes. All 71 other tests pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 4 lib/analytics/*.ts modules are ready for consumption by Phase 2 Plans 03-05
- Plan 02-03 (Nifty 50 benchmark data) can use computeXIRR directly from lib/analytics/xirr.ts
- Plan 02-04 (holder analytics page) has all financial math functions available
- Plan 02-05 (SIP section + allocation section) has detectActiveSIPs and mapCategoryToAssetClass ready

---
*Phase: 02-portfolio-analytics*
*Completed: 2026-03-20*

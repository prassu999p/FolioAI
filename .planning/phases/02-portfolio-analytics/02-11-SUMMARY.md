---
phase: 02-portfolio-analytics
plan: 11
subsystem: holder-page
tags: [benchmark, xirr, nifty50, analytics, perf-03]
dependency_graph:
  requires: [02-10]
  provides: [nifty50-benchmark-xirr]
  affects: [summary-cards-xirr-display]
tech_stack:
  added: []
  patterns: [synthetic-benchmark-cashflows, nearest-trading-day-lookup]
key_files:
  created: []
  modified:
    - app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx
decisions:
  - "Reuse existing outflowTypes Set from holdings XIRR section rather than redeclaring — avoids duplicate variable error"
  - "Forward-only date search (up to 5 days) for getNearestClose — handles weekends and market holidays without crashing"
  - "validPurchaseTxs tracked separately from totalUnits loop — builds cashflow array only for transactions with valid Nifty closes"
metrics:
  duration: 3min
  completed_date: "2026-03-20T05:56:29Z"
  tasks_completed: 1
  files_modified: 1
---

# Phase 2 Plan 11: Nifty 50 Benchmark XIRR Wiring Summary

**One-liner:** Nifty 50 benchmark XIRR computed from synthetic cashflows (same amounts, index units) and passed to SummaryCards for portfolio comparison rendering.

## What Was Built

Closed the PERF-03 wiring gap between the `nifty50_daily` table and the holder page. The page now:

1. Filters transactions to outflow types (purchase, sip, switch_in, dividend_reinvest)
2. Queries `nifty50_daily` for all rows from the earliest purchase date onward
3. Builds a lookup map for O(1) date → close price resolution
4. Uses a `getNearestClose` helper that searches forward up to 5 trading days to handle weekends and market holidays without crashing
5. Computes synthetic Nifty 50 "units bought" per purchase (amount / close price on that date)
6. Builds benchmark cashflows: original purchase outflows (negative) + terminal value (total units × latest close, positive)
7. Calls `computeXIRR` on benchmark cashflows to get annualized benchmark return
8. Passes result as `nifty50Xirr={benchmarkXirr}` to `SummaryCards`

`SummaryCards` already had the conditional render at line 116 (`{nifty50Xirr !== null && ...}`) — no changes needed there.

## Deviations from Plan

**1. [Rule 1 - Adaptation] Reused outflowTypes instead of creating outflowSet**
- **Found during:** Task 1 implementation
- **Issue:** Plan 10 had already declared `outflowTypes` as `new Set([...])` at line 80 of page.tsx. Creating a second `outflowSet` would be a duplicate with identical content.
- **Fix:** Filtered `purchaseTxs` using the existing `outflowTypes` variable. No behavioral change.
- **Files modified:** None (avoidance of addition)

**2. [Rule 1 - Adaptation] Eliminated intermediate BenchmarkUnit type, tracked validPurchaseTxs array instead**
- **Found during:** Task 1 implementation
- **Issue:** The plan's `unitsBought: BenchmarkUnit[]` approach required two passes over purchaseTxs to build cashflows (one for units, one for amounts). Simplified to a single pass tracking `validPurchaseTxs` and `totalUnits` separately.
- **Fix:** Track `validPurchaseTxs: AnalyticsTransaction[]` during the units loop; build cashflows in one clean `.map()` call after.
- **Files modified:** `app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx`

## Self-Check

- [x] `app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx` — exists and modified
- [x] `npx tsc --noEmit` — passes with no errors
- [x] `grep nifty50_daily` — line 124 confirms query
- [x] `grep nifty50Xirr` — line 264 confirms prop passed
- [x] `grep benchmarkXirr` — lines 110, 175, 264 confirm variable declared, computed, used
- [x] Commit `c76000f` — confirmed in git log

## Self-Check: PASSED

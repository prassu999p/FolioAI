---
phase: 03-tax-engine
plan: "07"
subsystem: tax-engine-tests
tags: [tax, vitest, tdd, fifo, grandfathering, harvesting]
dependency_graph:
  requires: []
  provides: [tax-engine-test-coverage]
  affects: [lib/tax/engine.ts, lib/tax/rules.ts, lib/tax/harvesting.ts]
tech_stack:
  added: []
  patterns: [vitest, pure-function-testing, tdd-red-green]
key_files:
  created: []
  modified:
    - tests/tax/engine.test.ts
    - tests/tax/rules.test.ts
    - tests/tax/harvesting.test.ts
    - lib/tax/engine.ts
decisions:
  - grandfatheringApplied uses Nav presence only — not a comparison to purchaseNav
metrics:
  duration: "147s"
  completed_date: "2026-03-26"
  tasks_completed: 1
  files_modified: 4
---

# Phase 03 Plan 07: Tax Engine Test Implementation Summary

**One-liner:** Real Vitest assertions replace all it.todo() stubs in the three tax test files — FIFO, grandfathering MAX/MIN, and harvesting exemption-limit tests now verified automatically.

## What Was Built

All three tax engine test files had only `it.todo()` stub placeholders from Phase 1 scaffolding. This plan replaced every stub with a real test implementation covering:

- **engine.test.ts** (7 tests): `buildTaxLots` FIFO lot creation and date ordering, `depleteLots` oldest-lot-first consumption and partial splits across two lots, `computeTaxSummary` LTCG classification for >365-day equity, and grandfathering formula with and without Jan 31 2018 NAV
- **rules.test.ts** (11 tests): `classifyGain` for equity LTCG/STCG, debt post-Apr-2023 SLAB, debt pre-Apr-2023 >=730 days LTCG; `applyGrandfathering` MAX/MIN formula and null fallback; `getTaxAssetClass` for Large Cap, Liquid Fund, empty string, and Aggressive Hybrid
- **harvesting.test.ts** (5 tests): `computeHarvestingSuggestions` selecting positive LTCG funds, stopping at ₹1,25,000 exemption limit, excluding negative gain positions, respecting partial remaining exemption (ltcgUsedThisFY=100000), and returning empty when exemption fully consumed

All tests are pure TypeScript with no database calls — functions take primitive inputs and return typed outputs.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement tax engine test stubs | 6ef8ae1 | tests/tax/engine.test.ts, tests/tax/rules.test.ts, tests/tax/harvesting.test.ts, lib/tax/engine.ts |

## Verification

- `npx vitest run tests/tax/` — 4 files, 29 tests, 0 failures
- `npx tsc --noEmit` — clean

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect `grandfatheringApplied` condition in `estimateSellTax`**
- **Found during:** Task 1 — pre-existing test `sell-tax-estimator-modal.test.ts` (committed in plan 03-06) was failing
- **Issue:** `grandfatheringApplied: !!grandfatheringNav && grandfatheringNav < purchaseNav` — the `< purchaseNav` check is backwards; grandfathering applies whenever the Nav is present (the formula MAX/MIN is what handles the math), not only when FMV < purchaseNav
- **Fix:** Changed to `grandfatheringApplied: !!grandfatheringNav` — boolean reflects whether the grandfathering formula was invoked
- **Files modified:** lib/tax/engine.ts
- **Commit:** 6ef8ae1

## Self-Check: PASSED

All key files exist on disk. Commit 6ef8ae1 verified in git log. 29/29 tests passing.

---
phase: 03-tax-engine
plan: "06"
subsystem: tax-engine
tags: [tax, sell-estimator, lot-data, equity, ltcg, stcg, gap-closure]
dependency_graph:
  requires: [03-05]
  provides: [real-lot-data-wiring-in-sell-estimator-modal]
  affects: [sell-tax-estimator-modal, holdings-table, holder-page]
tech_stack:
  added: []
  patterns: [tdd-red-green, prop-threading, fifo-lot-derivation]
key_files:
  created:
    - tests/tax/sell-tax-estimator-modal.test.ts
  modified:
    - components/tax/sell-tax-estimator-modal.tsx
    - components/holdings/holdings-table.tsx
    - app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx
decisions:
  - grandfatheringNav passed as null from HoldingsTable (tax page data not available at holder page; correct assetClass and purchaseDate are the critical fixes)
  - purchaseDate derived from oldest FIFO purchase/SIP transaction per folio via filter+sort
  - isPostApr2023 derived from actual purchaseDate instead of hardcoding false
metrics:
  duration: 3min
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_modified: 3
  files_created: 1
---

# Phase 03 Plan 06: Fix Sell Tax Estimator Real Lot Data Summary

**One-liner:** Wired SellTaxEstimatorModal with real purchaseDate (oldest FIFO lot) and correct taxAssetClass (from fundCategories) instead of hardcoded 2020-01-01 date and getTaxAssetClass('') which always returned 'debt'.

## What Was Built

### Task 1: Add real lot data props to SellTaxEstimatorModal (TDD)

Extended `SellTaxEstimatorModalProps` with three optional props:
- `purchaseDate?: Date` — oldest FIFO purchase date, replaces hardcoded `new Date('2020-01-01')`
- `grandfatheringNav?: number | null` — Jan 31 2018 NAV if pre-2018 (passed as null for now, modal-ready)
- `taxAssetClass?: TaxAssetClass` — correct asset class, replaces `getTaxAssetClass('')` which always returned 'debt'

Also derived `isPostApr2023` from the actual `purchaseDate` instead of hardcoding `false`.

TDD: wrote failing tests first verifying LTCG/STCG/SLAB classification with real props, then implemented.

### Task 2: Thread lot data through HoldingsTable

Updated `HoldingsTable`:
- Added `fundCategories?: Record<number, string>` and `transactions?: AnalyticsTransaction[]` props
- Per holding row, derives `purchaseDate` from the oldest purchase/SIP transaction for that folio
- Derives `taxAssetClass` via `getTaxAssetClass(category)` from `fundCategories`
- Passes all three props to `SellTaxEstimatorModal`

Updated holder page `page.tsx` (line 297) to pass `fundCategories` and `transactions` to `HoldingsTable` — both already in scope.

## Commits

| Hash | Task | Description |
|------|------|-------------|
| 033bc80 | TDD RED | Add failing tests for SellTaxEstimatorModal real lot data props |
| 4f18c74 | Task 1 GREEN | Add real lot data props to SellTaxEstimatorModal |
| 6070e3b | Task 2 | Thread real lot data from holder page through HoldingsTable into modal |

## Verification

- `npx tsc --noEmit` passes with zero errors
- All 6 new tests pass; full suite: 157 passed, 0 failed
- An equity fund purchased 2+ years ago now shows LTCG (12.5%) in modal instead of STCG/SLAB
- getTaxAssetClass('') is no longer called — category derived from fundCategories per holding

## Success Criteria Met

- [x] `getTaxAssetClass('')` is never called — category derived from fundCategories per holding
- [x] purchaseDate 2020-01-01 hardcode is gone — real oldest lot date is used
- [x] TypeScript compiles clean
- [x] An equity holding held 500+ days shows LTCG at 12.5% in the modal

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- components/tax/sell-tax-estimator-modal.tsx — FOUND
- components/holdings/holdings-table.tsx — FOUND
- app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx — FOUND
- tests/tax/sell-tax-estimator-modal.test.ts — FOUND

Commits exist:
- 033bc80 — FOUND
- 4f18c74 — FOUND
- 6070e3b — FOUND

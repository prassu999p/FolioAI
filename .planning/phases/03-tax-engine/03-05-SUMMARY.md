---
phase: 03-tax-engine
plan: "05"
subsystem: tax-ui
tags: [gap-closure, capital-gains, sell-estimator, accessibility]
dependency_graph:
  requires: []
  provides: [fyLabel-prop, TaxEstimationResult-shape, DialogTitle-accessibility]
  affects: [components/tax/capital-gains-summary.tsx, lib/tax/engine.ts, components/tax/sell-tax-estimator-modal.tsx]
tech_stack:
  added: []
  patterns: [TaxEstimationResult typed return, DialogTitle accessibility pattern]
key_files:
  created: []
  modified:
    - components/tax/capital-gains-summary.tsx
    - app/(dashboard)/families/[familyId]/tax/page.tsx
    - lib/tax/engine.ts
    - components/tax/sell-tax-estimator-modal.tsx
decisions:
  - "estimateSellTax returns TaxEstimationResult typed shape — ltcgGain/stcgGain split derived from single classification value"
  - "DialogTitle replaces h3 in SellTaxEstimatorModal — eliminates Radix accessibility console warning"
metrics:
  duration: "2 min"
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_modified: 4
---

# Phase 3 Plan 05: UAT Gap Closure — Capital Gains Heading and Sell Estimator Breakdown Summary

**One-liner:** Fixed FY label hardcoding in Capital Gains heading and added LTCG/STCG split rows with tax rates to Sell Tax Estimator modal, also resolving Radix DialogTitle accessibility warning.

## Objective

Closed two UAT-reported bugs in the Tax Engine:
1. Capital Gains card heading hardcoded the current calendar year (`FY26`) instead of reflecting the selected FY toggle (Prior FY shows `FY25`).
2. Sell Tax Estimator modal lacked separate LTCG/STCG gain rows and tax rates, and had a Radix `DialogTitle` accessibility warning.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix Capital Gains heading — add fyLabel prop | 4a88c48 | capital-gains-summary.tsx, tax/page.tsx |
| 2 | Fix estimateSellTax return shape and modal LTCG/STCG breakdown | f90ca07 | engine.ts, sell-tax-estimator-modal.tsx |

## What Was Built

### Task 1: Capital Gains Heading Fix

- Added `fyLabel: string` required prop to `CapitalGainsSummaryProps`.
- Replaced hardcoded `FY{new Date().getFullYear().toString().slice(2)}` with `Capital Gains {fyLabel}`.
- Passed `fyLabel={fyBounds.label}` at the call site in `tax/page.tsx` — `fyBounds` was already in scope.
- Result: "Capital Gains FY25" shown when Prior FY toggled, "Capital Gains FY25-26" for current FY.

### Task 2: estimateSellTax Return Shape + Modal Breakdown

**engine.ts:**
- Imported `TaxEstimationResult` from `./types` and annotated `estimateSellTax` return type.
- Replaced ad-hoc return object with `TaxEstimationResult`-shaped return:
  - `ltcgGain = totalGain` when LTCG, else `0`
  - `stcgGain = totalGain` when STCG, else `0`
  - `ltcgRate` / `stcgRate` set conditionally based on classification
  - `totalEstimatedTax` replaces `estimatedTax`
  - Removed ad-hoc fields: `totalGain`, `classification`, `effectiveCostBasis`

**sell-tax-estimator-modal.tsx:**
- Added `DialogTitle` to Dialog imports — fixes Radix accessibility warning `DialogContent requires a DialogTitle`.
- Replaced `<h3>` heading with `<DialogTitle>`.
- Updated `Total Gain` row to use `estimation.ltcgGain + estimation.stcgGain`.
- Added conditional LTCG Gain row, LTCG Tax Rate row, STCG Gain row, STCG Tax Rate row.
- Updated `Estimated Tax` row to use `estimation.totalEstimatedTax`.
- Removed `Classification` row (superseded by LTCG/STCG split rows).

## Verification

```
npx tsc --noEmit
```
Result: Zero errors across entire project.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Created files exist
No new files created — N/A.

### Commits exist
- 4a88c48: feat(03-05): add fyLabel prop to CapitalGainsSummary, wire fyBounds.label at call site
- f90ca07: feat(03-05): fix estimateSellTax return shape and modal LTCG/STCG breakdown

## Self-Check: PASSED

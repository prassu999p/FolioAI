---
phase: 02-portfolio-analytics
plan: 10
subsystem: holder-page
tags: [xirr, analytics, wiring, per-holding]
dependency_graph:
  requires: [lib/analytics/xirr.ts, lib/supabase/types.ts]
  provides: [per-holding XIRR in HoldingsTable]
  affects: [app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx]
tech_stack:
  added: []
  patterns: [per-folio cashflow filtering, sign-convention inline, terminal-value cashflow]
key_files:
  created: []
  modified:
    - app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx
decisions:
  - Per-holding XIRR uses only that folio's current_value as terminal cashflow (not sum of all holdings) — buildPortfolioCashflows sums all holdings, which is wrong for per-folio computation
  - toHoldingTransaction helper inlined in page.tsx (not shared) — same pattern as summary-cards.tsx; acceptable duplication for locality
metrics:
  duration: 3min
  completed: 2026-03-20
  tasks: 1
  files: 1
---

# Phase 02 Plan 10: Per-Holding XIRR Wiring Summary

Per-holding XIRR wired in holder page by filtering folio transactions and calling computeXIRR per HoldingRow, replacing the xirr: null hardcode that existed at line 66.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Compute per-holding XIRR replacing the null hardcode at page.tsx line 66 | d25567a | app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx |

## What Was Built

The holder page (`app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx`) now computes XIRR for each holding individually:

1. Added imports: `computeXIRR`, `computeGainLoss` from `@/lib/analytics/xirr` and `Transaction` type from `@/lib/supabase/types`
2. Added `toHoldingTransaction` helper that maps `AnalyticsTransaction` to `Transaction` shape (same pattern as `summary-cards.tsx`)
3. Replaced static `{ ...h, gain_loss: null, gain_loss_pct: null, xirr: null }` mapping with per-folio computation:
   - Filters `transactions` array by `folio_id` matching the holding
   - Applies sign convention inline: purchases/SIPs/switch_in/dividend_reinvest → negative, redemptions/switch_out → positive
   - Adds terminal cashflow: `current_value ?? 0` as of today
   - Calls `computeXIRR(cashflows)` — returns null for < 2 cashflows or non-convergence
   - Calls `computeGainLoss(h)` to populate `gain_loss` and `gain_loss_pct` (previously also null)

`HoldingsTable` already had an XIRR column wired to `HoldingRowWithAnalytics.xirr` — this plan completed the data path without any UI changes.

## Verification

- `npx tsc --noEmit` passes with no TypeScript errors
- `grep "xirr: null" page.tsx` returns nothing (hardcode removed)
- `grep "computeXIRR" page.tsx` confirms import and usage

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Per-holding terminal cashflow uses single holding's current_value** — `buildPortfolioCashflows` was explicitly NOT used because it sums all holdings' current values into a single terminal entry; per-folio XIRR requires only that folio's current value.

2. **toHoldingTransaction inlined in page.tsx** — the plan specified this helper be added directly in the file rather than extracting to a shared utility, keeping the pattern consistent with `summary-cards.tsx`.

## Self-Check: PASSED

- app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx: FOUND
- Commit d25567a: FOUND

---
phase: 02-portfolio-analytics
plan: "04"
subsystem: analytics-ui
tags: [ui, components, tailwind, md3, xirr, holdings-table]
dependency_graph:
  requires: [02-02, 02-03]
  provides: [PeriodSelector, SummaryCards, HoldingsTable-v2, analytics-types]
  affects: [app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx]
tech_stack:
  added: []
  patterns:
    - MD3 color tokens in Tailwind v4 via @theme inline CSS variables
    - AnalyticsTransaction → Transaction adapter function for XIRR computation
    - HoldingRowWithAnalytics extends HoldingRow with null-safe computed fields
key_files:
  created:
    - components/analytics/period-selector.tsx
    - components/analytics/summary-cards.tsx
  modified:
    - app/globals.css
    - app/layout.tsx
    - lib/supabase/types.ts
    - components/holdings/holdings-table.tsx
    - app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx
decisions:
  - Tailwind v4 uses @theme inline CSS variables instead of tailwind.config.ts — MD3 tokens added as --color-* variables
  - SummaryCards accepts pre-fetched transactions and holdings (no internal DB calls) — computation only
  - HoldingsTable changed from HoldingRow[] to HoldingRowWithAnalytics[] — holder page maps null for analytics fields
  - Removed shadcn/ui Table import from HoldingsTable — plain HTML table per design spec
  - AnalyticsTransaction adapter converts RPC rows to Transaction shape for buildPortfolioCashflows compatibility
metrics:
  duration: 6min
  completed_date: 2026-03-20
  tasks_completed: 2
  files_changed: 7
---

# Phase 2 Plan 4: Analytics UI Components Summary

**One-liner:** MD3 design system integrated via Tailwind v4 @theme, PeriodSelector URL-param client toggle, SummaryCards 4-card bento grid with XIRR computation, HoldingsTable redesigned with 5 columns and XIRR color-coding.

## What Was Built

### Task 1: Global Design Setup + Types + PeriodSelector

**app/globals.css** — Added full MD3 color token set as Tailwind v4 `@theme inline` CSS variables (`--color-surface-container-lowest`, `--color-primary`, etc.), font family variables (`--font-headline`, `--font-body`, `--font-label`), typography rules for body/headings, `.tabular-nums` utility class, and `.material-symbols-outlined` variation settings.

**app/layout.tsx** — Added `<head>` with Google Fonts links for Manrope (400–800), Work Sans (300–600), and Material Symbols Outlined (variable font).

**lib/supabase/types.ts** — Added:
- `HoldingRowWithAnalytics` — extends `HoldingRow` with `gain_loss`, `gain_loss_pct`, `xirr` (all nullable)
- `AnalyticsTransaction` — raw RPC row shape
- `HolderAnalyticsSummary` — computed holder-level summary
- `get_holder_analytics_transactions` function added to `Database.Functions`

**components/analytics/period-selector.tsx** — Client component with `'use client'` directive. Reads `period` from `useSearchParams()`, writes via `router.replace()`. Renders 6 period buttons (1M/3M/6M/1Y/3Y/All Time) with active/inactive styling using MD3 tokens.

### Task 2: SummaryCards + HoldingsTable Redesign

**components/analytics/summary-cards.tsx** — Pure computation Server Component. Accepts pre-fetched `transactions: AnalyticsTransaction[]` and `holdings: HoldingRowWithAnalytics[]`. Maps AnalyticsTransaction to Transaction via `toTransactions()` adapter, then calls `buildPortfolioCashflows` + `computeXIRR`. Renders 4-card bento grid:
- Card 1 (Total AUM): left accent border, trending_up icon, gain% subtitle
- Card 2 (Total Invested): clean card, no extras
- Card 3 (Absolute Gain): green/red color-coded, percentage badge
- Card 4 (XIRR): right accent border, optional Nifty 50 comparison, mini progress bar

**components/holdings/holdings-table.tsx** — Redesigned with plain HTML table (removed shadcn/ui Table). New container: `bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm`. 5 columns: Asset Name (fund + fund_house), Units, Current NAV, Value, XIRR. XIRR column: `text-secondary` for positive, `text-error` for negative. Empty state handled gracefully.

**app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx** — Fixed type error: maps `HoldingRow[]` to `HoldingRowWithAnalytics[]` with null analytics fields so the holder page continues to work before full XIRR computation is wired up.

## Verification

- `npx tsc --noEmit`: 0 errors (2 pre-existing errors in cas-import.test.ts, unrelated to this plan)
- `npm test`: 71 passed + 8 todo, 8 pre-existing failures in cas-import.test.ts (unrelated)
- PeriodSelector: 'use client', useSearchParams + useRouter, 6 period buttons with MD3 styling
- SummaryCards: 4 bento cards, XIRR computed from cashflows, Nifty 50 null-safe
- HoldingsTable: HoldingRowWithAnalytics prop, 5 columns, color-coded XIRR
- Material Symbols icons used in SummaryCards trending_up
- tabular-nums applied to all financial numbers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tailwind v4 has no tailwind.config.ts**
- **Found during:** Task 1
- **Issue:** Plan specified adding MD3 tokens to `tailwind.config.ts`, but project uses Tailwind v4 which configures via CSS `@theme` directive, not a config file
- **Fix:** Added all MD3 tokens as `--color-*` CSS variables inside `@theme inline` block in globals.css; same tokens, different mechanism
- **Files modified:** app/globals.css
- **Commit:** 2f6d0b5

**2. [Rule 1 - Bug] HoldingsTable type mismatch in holder page**
- **Found during:** Task 2 tsc verification
- **Issue:** holder/page.tsx passed `HoldingRow[]` to `HoldingsTable` which now expects `HoldingRowWithAnalytics[]`
- **Fix:** Map HoldingRow[] to HoldingRowWithAnalytics[] with null analytics fields in the holder page
- **Files modified:** app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx
- **Commit:** e85e541

## Self-Check: PASSED

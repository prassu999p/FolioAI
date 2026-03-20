---
phase: 02-portfolio-analytics
plan: 15
subsystem: family-dashboard
tags: [xirr, asset-allocation, donut-chart, holders-table, server-component]
dependency_graph:
  requires:
    - lib/analytics/xirr.ts
    - lib/analytics/asset-class-mapper.ts
    - get_holder_holdings RPC
    - get_holder_analytics_transactions RPC
  provides:
    - Full family dashboard matching Family_view.html layout
  affects:
    - app/(dashboard)/families/[familyId]/page.tsx (renders FamilyDashboard)
tech_stack:
  added: []
  patterns:
    - Server Component data aggregation with Promise.all fan-out
    - SVG donut chart with stroke-dashoffset segments
    - div-based accessible table for Link-compatible row navigation
    - Cashflow aggregation across multiple holders for family XIRR
key_files:
  created: []
  modified:
    - components/family/family-dashboard.tsx
decisions:
  - Per-holder XIRR computed from all-time transactions + current_value terminal cashflow
  - Family XIRR aggregates all holder transactions into one cashflow series
  - div-based table with role="table/row/cell" replaces tr/td to allow Link wrapping of rows
  - Absolute return (current_value/total_invested - 1) used as proxy for 1Y return in Top Funds section
  - AI Morning Insight banner uses static copy (Phase 4 will add real AI text)
  - Recent Activity fetches latest 5 transactions via folios!inner join with family_id filter
metrics:
  duration: "3 min"
  completed_date: "2026-03-20"
  tasks_completed: 2
  files_modified: 1
---

# Phase 2 Plan 15: Family Dashboard Full Design Implementation Summary

Replaced the minimal placeholder `FamilyDashboard` component with a full-fidelity implementation matching `Family_view.html` exactly. The component is a Server Component with all data fetching server-side.

## What Was Built

### 7 Visual Sections

1. **AI Morning Insight Banner** — glassmorphism card (`rgba(255,255,255,0.4)`, `backdrop-filter: blur(20px)`) with `auto_awesome` icon, static copy with Phase 4 placeholder note.

2. **4-Column Bento Metric Grid**
   - Total Family AUM (`col-span-2`, `bg-surface-container-lowest`) with gain% badge using `trending_up` icon
   - Total Invested + Absolute Gain stacked card (`bg-surface-container-low`)
   - Family XIRR card (`bg-primary text-on-primary`) with progress bar (visual proxy) and decorative `analytics` icon

3. **Asset Allocation Donut SVG** — 4-segment SVG donut (Domestic Equity `#001736`, Intl Equity `#002b5b`, Debt `#006d43`, Gold `#88f5b7`) with `stroke-dashoffset` + cumulative rotation. Center label shows combined equity %. Legend shows 4 rows with actual `formatINR` values.

4. **Family Holders Table** — div-based table layout with `role="table"` ARIA attributes. Each row is a `<Link>` block. Columns: Member (avatar + name + role), Portfolio Value, Individual XIRR, Action (`chevron_right`). Avatar colors cycle through 3 MD3 backgrounds.

5. **Top Performing Funds** — top 2 holdings sorted by `(current_value - total_invested) / total_invested`. Shows `show_chart` / `trending_up` icons, fund name, category, absolute return labeled "1Y Returns".

6. **Recent Activity Feed** — latest 5 transactions from the family, fetched via `folios!inner(holders!inner(family_id))` join. Each item has SIP (`sync_alt`) or purchase/import (`upload_file`) icon with timeline connector line.

7. **Fixed FAB** — `position: fixed bottom-8 right-8`, `bg-primary`, `rounded-full`, shows "Import New CAS" tooltip on `group-hover`.

## How Family XIRR Is Computed

Family XIRR aggregates all holders' transactions into a single cashflow series. For each holder, `get_holder_analytics_transactions` is called with `p_start_date: null` (all-time). All transactions are mapped to signed cashflows (outflows negative: purchase/sip/switch_in/dividend_reinvest; inflows positive: redemption/switch_out). A terminal cashflow of `totalAUM` (sum of all holders' current values) is appended with today's date. `computeXIRR` is then called on the combined series.

## How Per-Holder XIRR Is Computed

Each holder's XIRR uses the same cashflow pattern. Holder transactions are fetched in the initial `Promise.all` fan-out alongside holdings. Signed cashflows are built and `totalCurrentValue` (sum of that holder's `current_value` across all holdings) is appended as terminal cashflow on today. `computeXIRR` returns the annualised rate, displayed as `X.X%` in the Individual XIRR column.

## Deviations from Family_view.html

- **AI Morning Insight copy** — Design shows personalised text about goal progress. Replaced with generic static copy and Phase 4 note since real AI insights are deferred.
- **1Y Returns in Top Funds** — Design shows 1Y NAV-based return. Implementation uses absolute return (`current_value / total_invested - 1`) as proxy since 1Y historical NAV series are not available in Phase 2.
- **Benchmark XIRR** — Family XIRR card shows "Benchmark Nifty 50: —" placeholder. Family-level benchmark computation is deferred (Phase 2 only computes holder-level benchmark in holder page).
- **Profile avatar in TopAppBar** — Not rendered; the `FamilyDashboard` component does not own the header/sidebar (those belong to the dashboard layout).
- **Recent Activity** — Shows real transaction data instead of hardcoded SIP+CAS events from design mockup.

## Commit

`753dad7` — feat(02-15): implement full family dashboard with XIRR, donut chart, and design layout

## Self-Check: PASSED

- `components/family/family-dashboard.tsx` exists (665 lines, ≥ 250)
- TypeScript compiles with no errors (`npx tsc --noEmit` exits 0)
- All 7 sections present in JSX
- `computeXIRR` imported and called for both family and per-holder XIRR
- `get_holder_analytics_transactions` RPC called for each holder
- Holder rows link to `/families/${familyId}/holders/${holder.id}`
- No 'use client' directive — pure Server Component
- No Lucide icons — all `material-symbols-outlined`
- `formatINR` + `tabular-nums` on all currency values
- `bg-primary text-on-primary` on Family XIRR card

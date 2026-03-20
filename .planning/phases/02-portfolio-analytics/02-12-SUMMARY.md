---
phase: 02-portfolio-analytics
plan: 12
subsystem: ui
tags: [react, next.js, url-params, analytics, view-mode, tailwind]

# Dependency graph
requires:
  - phase: 02-portfolio-analytics
    provides: SummaryCards with nifty50Xirr prop (plan 11), PeriodSelector with URL param pattern
provides:
  - ViewMode type exported from PeriodSelector (xirr | absolute | benchmark)
  - PeriodSelector second row: XIRR / Absolute / Benchmark view tabs writing 'view' URL param
  - SummaryCards viewMode prop with cardActive prominence helper (ring-2 / opacity-60)
  - holder page reads 'view' searchParam and passes viewMode to SummaryCards
affects: [03-goal-tracking, holder-page, analytics-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [URL-param-driven view mode, card prominence via ring-2/opacity-60 conditional classes]

key-files:
  created: []
  modified:
    - components/analytics/period-selector.tsx
    - components/analytics/summary-cards.tsx
    - app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx

key-decisions:
  - "Clicking active view tab deselects it (clears 'view' param) — returns to all-cards-equal mode without adding a separate 'All' button"
  - "Benchmark mode highlights both XIRR card and AUM card — XIRR contains the vs Nifty 50 line, AUM is the portfolio total being compared"

patterns-established:
  - "View mode tab: secondary bg when active, surface-container when inactive — smaller size (text-xs) than period tabs (text-sm)"
  - "cardActive() helper: returns '' for no-mode, 'ring-2 ring-secondary' for match, 'opacity-60' for non-match"

requirements-completed: [PERF-04]

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 2 Plan 12: View-Mode Selector Summary

**XIRR/Absolute/Benchmark tab row added to PeriodSelector; SummaryCards highlights active card via ring-2 and dims inactive cards via opacity-60, wired through 'view' URL param**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T06:15:49Z
- **Completed:** 2026-03-20T06:17:49Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- PeriodSelector gains a second row of three view-mode tabs (XIRR, Absolute, Benchmark) below the existing period buttons
- Clicking a view tab sets `?view=xirr` (or absolute/benchmark) in the URL without affecting the period param; clicking the active tab deselects it
- SummaryCards accepts `viewMode` prop and applies `ring-2 ring-secondary` to the matching card and `opacity-60` to non-matching cards
- Default (no view param) shows all 4 cards at equal prominence — fully backward compatible
- holder page reads `view` from searchParams and threads it as `viewMode` to SummaryCards

## Task Commits

Each task was committed atomically:

1. **Task 1: Add view-mode tabs to PeriodSelector and view prominence to SummaryCards** - `5ae5855` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `components/analytics/period-selector.tsx` - Added ViewMode type, VIEW_MODES array, handleViewSelect handler, second tab row in JSX
- `components/analytics/summary-cards.tsx` - Added viewMode prop to interface and function signature, cardActive() helper, applied to all 4 card divs
- `app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx` - Added view?: string to searchParams type, destructured viewParam, passed viewMode to SummaryCards

## Decisions Made
- Clicking active view tab deselects it (clears 'view' param) — returns to all-cards-equal mode without needing a separate 'All' button
- Benchmark mode highlights both XIRR card and AUM card: XIRR card contains the vs Nifty 50 comparison line; AUM is the portfolio total being compared

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Self-Check: PASSED

All files verified present. Task commit 5ae5855 confirmed in git log.

## Next Phase Readiness
- PERF-04 view-mode selector complete; all 4 PERF gap-closure plans (PERF-02, 03, 04, 06) are now done
- SIP-02 detection was also completed; Phase 2 analytics gap closure is complete
- Ready for Phase 3 goal tracking

---
*Phase: 02-portfolio-analytics*
*Completed: 2026-03-20*

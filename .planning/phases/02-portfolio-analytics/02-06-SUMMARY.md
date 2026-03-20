---
phase: 02-portfolio-analytics
plan: "06"
subsystem: ui
tags: [nextjs, server-components, analytics, portfolio, holder-page, family-dashboard]

# Dependency graph
requires:
  - phase: 02-portfolio-analytics
    plan: "04"
    provides: "PeriodSelector, SummaryCards, HoldingsTable components"
  - phase: 02-portfolio-analytics
    plan: "05"
    provides: "SipSection, AllocationSection components, asset-class-mapper, sip-detector"
  - phase: 02-portfolio-analytics
    plan: "03"
    provides: "get_holder_analytics_transactions RPC, period-utils.ts"
  - phase: 01-data-foundation
    provides: "get_holder_holdings RPC, auth layout, createClient, HoldingRow types"
provides:
  - "Holder analytics page (/families/[id]/holders/[id]) with all 5 analytics sections assembled"
  - "Family dashboard showing family-total AUM, invested, and gain/loss row"
  - "Period searchParam flows from URL to SummaryCards — changing period updates all metrics"
affects: [03-tax-engine, 04-ai-intelligence, 05-goals-alerts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component page fetches holdings + transactions in parallel with Promise.all, maps to HoldingRowWithAnalytics before passing to components"
    - "Period searchParam read in page, converted to date bounds via getPeriodBounds, passed down to all analytics components"
    - "fundCategories fetched from funds table in parent page and prop-drilled to AllocationSection (avoids N+1)"
    - "Family-total analytics aggregated at FamilyDashboard level alongside per-holder data"

key-files:
  created: []
  modified:
    - app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx
    - components/family/family-dashboard.tsx

key-decisions:
  - "Auth check delegated to dashboard layout — holder page does not need to repeat getClaims()"
  - "HoldingsWithAnalytics maps null for gain_loss/xirr — SummaryCards computes internally from cashflows"
  - "Last Synced derived from oldest current_nav_date across holdings — consistent with Phase 1 dashboard pattern"
  - "Family gain/loss conditional on totalAUM being non-null (requires NAV sync) — shows — placeholder otherwise"

patterns-established:
  - "Holder page as pure assembly: all business logic remains in analytics lib modules; page only fetches data and composes components"
  - "Period-aware data fetching: startDateStr/endDateStr derived from getPeriodBounds and passed directly to RPC as p_start_date/p_end_date"

requirements-completed: [PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, PERF-06, SIP-01, SIP-02, ALLOC-01, ALLOC-02]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 2 Plan 06: Page Assembly Summary

**Holder analytics page and family dashboard wired with all Phase 2 components — period-aware XIRR/gain/allocation now user-visible at /families/[id]/holders/[id]**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-20T03:55:08Z
- **Completed:** 2026-03-20T03:57:51Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Holder page now renders sticky header (breadcrumb, Add Manual Holding, Export Statement, icons), hero section (holder name text-4xl, description, Last Synced), PeriodSelector, SummaryCards bento grid, 2/3 HoldingsTable + 1/3 SipSection sidebar, and AllocationSection below
- Period searchParam flows from URL query string through getPeriodBounds to RPC start/end dates, so changing ?period= updates all metrics simultaneously
- Family dashboard extended with family-total AUM, total invested, and gain/loss (₹ and %) row above the holders list — satisfies PERF-01 family-total requirement

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend holder page to assemble all 5 analytics sections** - `351cf53` (feat)
2. **Task 2: Update family dashboard with family-total analytics** - `763e2a3` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx` - Full holder analytics page with 5-section assembly, parallel RPC fetches, period-aware data flow
- `components/family/family-dashboard.tsx` - Added totalInvested tracking per holder, family-level gain/loss aggregation, family total analytics row

## Decisions Made
- Auth check kept in dashboard layout only — no need to repeat `getClaims()` in the holder page since all `/dashboard` routes are already protected
- `HoldingRowWithAnalytics` maps `null` for analytics fields — `SummaryCards` computes XIRR/gain internally from cashflows; no duplication of computation in the page
- `Last Synced` uses oldest nav_date across holdings (shows the least-recently-updated date, consistent with Phase 1 dashboard)
- Family gain/loss shows `—` when totalAUM is null (NAV not synced) rather than showing potentially misleading computed values

## Deviations from Plan

None - plan executed exactly as written. The plan's proposed interface for `getPeriodBounds` used a different signature than the actual implementation in `period-utils.ts` (returns `{ start, end } | null` rather than `{ startDate, endDate }`), but this was trivially handled during implementation.

## Issues Encountered
- Pre-existing TypeScript errors in `tests/cas-import.test.ts` (property `transactions` on casparser type) — unrelated to this plan, not fixed (out of scope per deviation boundary rule)
- Pre-existing test failures in `cas-import.test.ts` (8 tests) — present before this plan, unchanged after

## Next Phase Readiness
- All Phase 2 analytics components are now user-visible through the holder analytics page
- Phase 3 Tax Engine can read the same `get_holder_analytics_transactions` RPC pattern established here
- Phase 4 AI Intelligence placeholder comment left in holder page sidebar (`{/* Phase 4: AI Portfolio Health card will go here */}`)

---
*Phase: 02-portfolio-analytics*
*Completed: 2026-03-20*

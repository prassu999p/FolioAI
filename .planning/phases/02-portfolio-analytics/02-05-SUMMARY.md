---
phase: 02-portfolio-analytics
plan: "05"
subsystem: ui
tags: [react, next.js, server-component, tailwind, shadcn, react-hook-form, zod, sip-detection, asset-allocation, supabase]

# Dependency graph
requires:
  - phase: 02-portfolio-analytics
    plan: "02"
    provides: "detectActiveSIPs (sip-detector.ts), mapCategoryToAssetClass (asset-class-mapper.ts), AllocationTargetSchema"
  - phase: 02-portfolio-analytics
    plan: "03"
    provides: "holder_allocation_targets table with DB-level sum <= 100 CHECK constraint"
  - phase: 02-portfolio-analytics
    plan: "04"
    provides: "HoldingRowWithAnalytics and AnalyticsTransaction types in lib/supabase/types.ts"

provides:
  - "SipSection server component: active SIP right sidebar panel, hidden entirely when no SIPs"
  - "AllocationSection server component: 4 horizontal CSS allocation bars (pure Tailwind, no chart library)"
  - "SetTargetModal client island: equity/debt/gold/international % inputs, zod sum validation, POST /api/allocation"
  - "GET and POST /api/allocation endpoints with auth and holder ownership verification"

affects:
  - 02-06-PLAN.md (holder analytics page assembly — wires SipSection + AllocationSection into the page layout)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component outer + 'use client' island pattern: AllocationSection is server component, SetTargetModal is separate client file imported into it"
    - "Horizontal CSS allocation bars: pure Tailwind with position:relative track, position:absolute target marker — no chart library"
    - "Parent-passes-fundCategories pattern: parent fetches funds.scheme_code → category map, passes as prop to AllocationSection to avoid N+1 queries inside server component"

key-files:
  created:
    - components/analytics/sip-section.tsx
    - components/analytics/allocation-section.tsx
    - components/analytics/set-target-modal.tsx
    - app/api/allocation/route.ts
  modified:
    - lib/supabase/types.ts

key-decisions:
  - "HoldingRowWithAnalytics and AnalyticsTransaction types discovered already committed by plan 04 (wave 3 parallel execution) — no duplicate added"
  - "AllocationSection fetches holder_allocation_targets directly via Supabase query (not via GET /api/allocation) — server component direct DB access avoids unnecessary HTTP round-trip"
  - "SetTargetModal uses react-hook-form with zodResolver — keeps form state entirely in client component, consistent with established pattern"
  - "Deviation bar and target marker use relative/absolute CSS positioning — no transform needed, cleaner than overlapping flex elements"

patterns-established:
  - "SIP section absence pattern: returns null from Server Component (no wrapper div) — DOM level absence, not CSS display:none"
  - "Allocation bar pattern: relative track div + width-controlled fill div + absolute positioned marker line, all pure Tailwind"

requirements-completed: [SIP-01, SIP-02, ALLOC-01, ALLOC-02]

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 2 Plan 05: SIP Section and Asset Allocation Section Summary

**SipSection server component with DOM-absent-when-empty pattern, four horizontal CSS allocation bars with target marker, and SetTargetModal client island with zod sum validation — all pure Tailwind, zero chart dependencies**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-20T03:46:04Z
- **Completed:** 2026-03-20T03:50:11Z
- **Tasks:** 2
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments

- `SipSection`: Server Component that converts AnalyticsTransaction[] to FolioTransaction[], calls detectActiveSIPs, returns `null` (no DOM element whatsoever) when no SIPs detected — matches locked design spec
- `AllocationSection`: Server Component with 4 horizontal CSS bars using pure Tailwind; each bar shows current %, target % marker line, and deviation text (green +N% / red -N% / muted when within 2%)
- `SetTargetModal`: 'use client' island using react-hook-form + zodResolver; real-time total% display warns when exceeds 100; submits to POST /api/allocation, calls router.refresh() on success
- `GET /api/allocation` and `POST /api/allocation`: auth via getClaims(), holder ownership check via RLS-protected holders table, Zod validation for POST, upsert to holder_allocation_targets

## Task Commits

Each task was committed atomically:

1. **Task 1: SIP section and API allocation endpoint** - `440a777` (feat)
2. **Task 2: Allocation section with horizontal bars and Set Target modal** - `c3fd2e1` (feat)

## Files Created/Modified

- `components/analytics/sip-section.tsx` - Server Component; active SIP right sidebar panel; returns null when detectActiveSIPs() returns empty array
- `components/analytics/allocation-section.tsx` - Server Component; 4 horizontal CSS bars; fetches allocation targets directly from DB; accepts fundCategories prop
- `components/analytics/set-target-modal.tsx` - 'use client' island; shadcn Dialog + react-hook-form + AllocationTargetSchema zod resolver; real-time sum display
- `app/api/allocation/route.ts` - GET + POST endpoints; getClaims() auth; holder ownership check; upsert to holder_allocation_targets
- `lib/supabase/types.ts` - Already updated by plan 04 (HoldingRowWithAnalytics, AnalyticsTransaction) — no additional changes needed

## Decisions Made

- AllocationSection queries holder_allocation_targets directly via server-side Supabase client instead of calling GET /api/allocation — avoids HTTP overhead in a Server Component context; consistent with the Phase 1 family-dashboard.tsx direct DB access pattern
- fundCategories prop approach adopted (parent fetches funds table → passes scheme_code→category map): avoids N+1 inside AllocationSection, keeps the component pure/testable
- Deviation threshold set at ±2% (green if current > target + 2%, red if current < target - 2%) — per RESEARCH.md specification

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

Note: `lib/supabase/types.ts` types (HoldingRowWithAnalytics, AnalyticsTransaction) were discovered already committed by Plan 04 which ran in parallel (wave 3). No duplication needed.

## Issues Encountered

Pre-existing 8 failures in `tests/cas-import.test.ts` confirmed present before any changes — not caused by this plan. All 71 other tests pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 5 sections of the holder analytics page are now built (Plans 04 + 05): PeriodSelector, SummaryCards, HoldingsTable, SipSection, AllocationSection
- Plan 06 (holder analytics page assembly) can wire all components into the page layout
- AllocationSection requires parent to pass `fundCategories: Record<number, string>` — Plan 06 page must query funds table for the holder's schemes

---
*Phase: 02-portfolio-analytics*
*Completed: 2026-03-20*

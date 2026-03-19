---
phase: 01-data-foundation
plan: "06"
subsystem: nav-sync-family-dashboard
tags: [next.js, supabase, mfapi, react, typescript, tdd, batch-processing, retry-logic]

# Dependency graph
requires:
  - 01-04 (CAS import pipeline, folios/transactions schema, auth patterns)
  - 01-05 (get_holder_holdings RPC, HoldingRow type, family/holder API routes)
provides:
  - POST /api/nav/sync — fetches latest NAV for all held schemes, upserts nav_prices with retry
  - FamilyDashboard server component showing total AUM and holder cards with drill-down links
  - SyncButton client component with loading state and error display
  - CreateFamilyForm client component for no-family onboarding state
  - Completed Phase 1: Data Foundation (all 6 plans done)
affects:
  - Phase 2 analytics (NAV sync provides current_value data for holdings aggregation)
  - Phase 3 tax engine (holdings with current_nav_date inform grandfathering calculations)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Batch processing with Promise.allSettled: 10 scheme codes per batch, 100ms delay between batches
    - Retry with exponential backoff: fetchNavWithRetry(attempt) — 1s, 2s delays; throws on attempt >= 3
    - mfapi.in date format normalization: "19-03-2026" → "2026-03-19" via parts split
    - AbortSignal.timeout(10000) for per-request timeout without AbortController boilerplate
    - Server Component + Client Island pattern: FamilyDashboard (server) embeds SyncButton (client)
    - Idempotent NAV upsert: onConflict scheme_code,nav_date — safe to re-run

key-files:
  created:
    - app/api/nav/sync/route.ts
    - components/nav/sync-button.tsx
    - components/family/create-family-form.tsx
    - components/family/family-dashboard.tsx
  modified:
    - app/(dashboard)/families/[familyId]/page.tsx (replaced placeholder)
    - app/(dashboard)/dashboard/page.tsx (added CreateFamilyForm for no-family state)
    - tests/nav-sync.test.ts (replaced todo stubs with 7 real tests)

key-decisions:
  - "supabase.from() as any cast in nav sync route — same postgrest-js v2.99.2 limitation as Plans 04/05; typed results declared via inline type assertion"
  - "FamilyDashboard as Server Component calling RPC per holder — avoids client-side waterfall; N+1 acceptable for Phase 1 (families have 2-5 holders)"
  - "already_current field in sync response — user-visible feedback that today's sync was skipped (not misleading 0 synced)"
  - "AbortSignal.timeout(10000) for mfapi.in fetch — prevents hung requests from blocking batch indefinitely"

# Metrics
duration: 4min
completed: 2026-03-19
---

# Phase 1 Plan 06: NAV Sync and Family Dashboard Summary

**POST /api/nav/sync with batch+retry fetching mfapi.in prices, FamilyDashboard server component showing total AUM with holder drill-down cards, and SyncButton client island — completes Phase 1: Data Foundation**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-19T05:27:59Z
- **Completed:** 2026-03-19T05:32:11Z
- **Tasks:** 2 auto-executed + 1 checkpoint (human-verify)
- **Files created:** 4
- **Files modified:** 3

## Accomplishments

- `POST /api/nav/sync` API route: gets user's family, fetches all held scheme codes via `folios` join, skips already-synced-today, processes in batches of 10 with 100ms rate-protection delay, retries each scheme 3x with exponential backoff (1s, 2s), upserts nav_prices ON CONFLICT scheme_code+nav_date, returns `{ synced, failed, schemes_failed, already_current }`
- `fetchNavWithRetry` internal function: normalizes mfapi.in date format ("DD-MM-YYYY" → "YYYY-MM-DD"), uses AbortSignal.timeout(10000) per request, throws on attempt 3 failure
- `SyncButton` client component: POST /api/nav/sync on click, loading state ("Syncing NAVs..."), synced count display, destructive badge for failures, error message display
- `CreateFamilyForm` client component: name input, POST /api/family, router.refresh() on success
- `FamilyDashboard` server component: fetches family + all holders, calls `get_holder_holdings` RPC per holder, computes per-holder AUM and oldest nav_date, renders total AUM card (sum across all holders), holder grid with masked PAN (XXXXXX + last 4), per-holder AUM, Link to /families/[id]/holders/[holderId]
- `FamilyDashboardPage`: verifies family ownership via RLS + .single(), renders FamilyDashboard
- Dashboard page updated to show CreateFamilyForm instead of static text when no family exists
- 7 Vitest tests passing for nav-sync, 37 total tests passing across all test files
- `npx tsc --noEmit` clean, `npm run build` succeeds (14 routes)

## Task Commits

Each task was committed atomically:

1. **Task 1: NAV sync API route** - `f822c11` (feat)
2. **Task 2: Family dashboard UI and NAV sync button** - `c8da778` (feat)

## Files Created

- `app/api/nav/sync/route.ts` — POST handler with fetchNavWithRetry, batch processing, skip-today logic
- `components/nav/sync-button.tsx` — Client component for triggering NAV sync with status display
- `components/family/create-family-form.tsx` — Client component for family creation onboarding
- `components/family/family-dashboard.tsx` — Server component: AUM aggregation, holder cards, SyncButton

## Files Modified

- `app/(dashboard)/families/[familyId]/page.tsx` — replaced placeholder with FamilyDashboard render
- `app/(dashboard)/dashboard/page.tsx` — added CreateFamilyForm to no-family state (replaced static text)
- `tests/nav-sync.test.ts` — replaced 5 todo stubs with 7 real tests (TDD)

## Decisions Made

- **`supabase.from() as any` in nav sync**: Same postgrest-js v2.99.2 limitation established in Plans 04/05. Applied `as any` cast with inline type assertions for type safety at usage site.
- **FamilyDashboard as Server Component with per-holder RPC calls**: Calling `get_holder_holdings` per holder is N+1, but acceptable for Phase 1 (families have 2-5 holders max). A single batched query can be optimized in Phase 2 if needed.
- **`already_current` in sync response**: When all schemes were synced today, `synced` count would show 0 which is confusing. Added `already_current` field so UI can show "all prices current" vs "0 synced" message.
- **AbortSignal.timeout(10000)**: Preferred over manual AbortController — single-line timeout without cleanup code.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] supabase.from() type inference returns `never` for families/folios/nav_prices**
- **Found during:** Task 1 (npx tsc --noEmit after writing route)
- **Issue:** `family.id` errors with "Property 'id' does not exist on type 'never'" — same postgrest-js v2.99.2 limitation from Plans 04/05; `supabase.from()` infers Row as `never` for custom Database generics
- **Fix:** Applied `(supabase.from('families') as any).select(...).single() as { data: ... | null }` pattern — type assertion at usage point, typed result variable declared inline
- **Files modified:** `app/api/nav/sync/route.ts`
- **Commit:** f822c11

---

**Total deviations:** 1 auto-fixed (Rule 1 bug)
**Impact on plan:** Necessary TypeScript fix following established Plan 04/05 pattern. No scope creep.

## Phase 1 Checkpoint Status

Task 3 is a `checkpoint:human-verify` — execution paused for end-to-end verification. See checkpoint details in the CHECKPOINT REACHED message.

## Next Phase Readiness

- Phase 2 analytics: `get_holder_holdings` RPC provides current_value for all active holdings; NAV sync populates nav_prices
- Phase 3 tax: transactions table populated via CAS import and manual entry; grandfathering_nav seed script from Plan 02 ready to run

---
*Phase: 01-data-foundation*
*Completed: 2026-03-19*

## Self-Check: PASSED

- FOUND: app/api/nav/sync/route.ts
- FOUND: components/nav/sync-button.tsx
- FOUND: components/family/create-family-form.tsx
- FOUND: components/family/family-dashboard.tsx
- FOUND: task commit f822c11
- FOUND: task commit c8da778

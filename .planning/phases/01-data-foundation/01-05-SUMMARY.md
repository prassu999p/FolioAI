---
phase: 01-data-foundation
plan: "05"
subsystem: holdings
tags: [next.js, supabase, postgresql, react-hook-form, shadcn, tdd, date-fns]

# Dependency graph
requires:
  - 01-02 (7-table schema, TypeScript types, Supabase client factories)
  - 01-03 (auth middleware, protected route structure, holder page placeholder)
provides:
  - POST /api/family — create family with one-per-user guard
  - GET /api/family — fetch family with nested holders
  - POST /api/holders — add holder with PAN validation and dupe check
  - GET /api/holders — list holders for user's family
  - GET /api/holdings?holderId=X — aggregated holdings via get_holder_holdings RPC
  - POST /api/manual-entry — write manual transaction with fund upsert
  - HoldingsTable component with INR formatting and NAV staleness display
  - NavBadge component (secondary or destructive based on NAV age)
  - ManualEntryForm with mfapi.in fund search
  - Holder holdings page (Server Component + Suspense)
  - Migration 20260319000004_holdings_fn.sql with get_holder_holdings SQL function
affects:
  - Phase 2 analytics (holdings aggregation query is the core read path)
  - 01-06-PLAN (family management fills /dashboard and /families/[familyId])

# Tech tracking
tech-stack:
  added:
    - date-fns (NavBadge date formatting and staleness calculation)
  patterns:
    - TDD (RED then GREEN then verify) for all API routes
    - supabase as any pattern for write ops (established in Plan 02/04)
    - SECURITY DEFINER SQL function for complex aggregation bypassing row-level overhead
    - Zod refine() for cross-field business rules (future date rejection)
    - Test constants must use valid UUIDs when Zod uuid() validation is involved

key-files:
  created:
    - app/api/family/route.ts
    - app/api/holders/route.ts
    - app/api/holdings/route.ts
    - app/api/manual-entry/route.ts
    - components/holdings/holdings-table.tsx
    - components/holdings/nav-badge.tsx
    - components/manual-entry/manual-entry-form.tsx
    - supabase/migrations/20260319000004_holdings_fn.sql
  modified:
    - lib/supabase/types.ts (HoldingRow interface + Functions type for get_holder_holdings)
    - app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx (full implementation)
    - tests/holdings.test.ts (todo stubs replaced with real tests)
    - tests/family.test.ts (todo stubs replaced with real tests)
    - tests/manual-entry.test.ts (todo stubs replaced with real tests)
    - tests/setup.ts (TEST_HOLDER_ID updated to valid UUID)
    - package.json (date-fns added)

key-decisions:
  - "HoldingRow interface moved before Database declaration in types.ts — TypeScript forward reference requires declaration before use in Functions type"
  - "Test constants changed to valid UUID format — Zod z.string().uuid() validation rejects non-UUID strings like 'test-holder-id'"
  - "supabase as any cast in manual-entry route — established Plan 02 pattern for postgrest-js insert/upsert type inference issues"
  - "get_holder_holdings uses SECURITY DEFINER and HAVING net_units > 0 — excludes fully redeemed funds server-side, no client-side filtering needed"

# Metrics
duration: 9min
completed: 2026-03-19
---

# Phase 1 Plan 05: Holdings and Manual Entry Summary

**Unified holdings aggregation (get_holder_holdings SQL function with net units HAVING clause), manual entry route with future-date validation, HoldingsTable with INR formatting showing '—' for missing NAV, NavBadge with staleness indicator, and ManualEntryForm with live mfapi.in fund search**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-03-19T13:16:34Z
- **Completed:** 2026-03-19T13:25:00Z
- **Tasks:** 2
- **Files created:** 8
- **Files modified:** 7

## Accomplishments

- 5 API routes: POST/GET /api/family, POST/GET /api/holders, GET /api/holdings, POST /api/manual-entry
- `get_holder_holdings` Postgres function: CTE-based aggregation computing net units, weighted avg cost, total invested, and latest NAV join — HAVING clause excludes redeemed (zero-unit) funds
- `ManualEntrySchema` with Zod `refine()` rejecting future purchase dates and negative units
- HoldingsTable: shadcn/ui Table with 6 columns, Indian rupee formatting (`en-IN` locale), `—` for null current value (never shows misleading ₹0)
- NavBadge: shows "NAV as of [date]"; `destructive` variant when NAV is > 3 days old
- ManualEntryForm: live mfapi.in fund search (debounced by user typing), dropdown results, field-by-field entry after fund selection
- Holder holdings page: Server Component using `createClient()` directly for initial data + Suspense for holdings list
- 17 tests passing (0 failures) across holdings, family, and manual-entry test files
- `npx tsc --noEmit` clean
- `npm run build` succeeds (all 13 routes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Family/holder/holdings API routes and SQL migration** - `1078008` (feat)
2. **Task 2: Manual entry route, UI components, holder page** - `fdd46d8` (feat)

## Files Created

- `app/api/family/route.ts` — POST (create family, 409 if exists) and GET (family with nested holders)
- `app/api/holders/route.ts` — POST (add holder, PAN regex + dupe check, 409) and GET (list holders)
- `app/api/holdings/route.ts` — GET with auth/holderId/holder-exists guards; calls get_holder_holdings RPC
- `app/api/manual-entry/route.ts` — POST: validates, upserts fund, upserts folio, inserts transaction (source='manual')
- `components/holdings/holdings-table.tsx` — HoldingsTable with INR formatting, empty state, total footer
- `components/holdings/nav-badge.tsx` — NavBadge showing NAV date; red if > 3 days stale
- `components/manual-entry/manual-entry-form.tsx` — ManualEntryForm with mfapi.in search and form validation
- `supabase/migrations/20260319000004_holdings_fn.sql` — get_holder_holdings SECURITY DEFINER function

## Files Modified

- `lib/supabase/types.ts` — HoldingRow interface added (before Database); Functions type updated with get_holder_holdings
- `app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx` — Full implementation replacing placeholder
- `tests/holdings.test.ts` — 6 real tests replacing todo stubs
- `tests/family.test.ts` — 7 real tests replacing todo stubs (including FAM-02 and FAM-03)
- `tests/manual-entry.test.ts` — 4 real tests replacing todo stubs
- `tests/setup.ts` — TEST constants updated to valid UUIDs
- `package.json` — date-fns dependency added

## Decisions Made

- **HoldingRow before Database**: TypeScript requires type to be declared before first use. Moved `HoldingRow` interface before the `Database` interface so `Functions.get_holder_holdings.Returns` can reference it.
- **Valid UUIDs in test constants**: `z.string().uuid()` is strict. Non-UUID strings like `'test-holder-id'` cause 400 validation errors in route tests. Updated all test constants to `00000000-0000-0000-0000-000000000XXX` format.
- **supabase as any for route handlers**: Same pattern established in Plans 02/04. postgrest-js v2.99.2 infers insert/upsert argument types as `never` for custom Database generics; `as any` bypasses this safely.
- **SECURITY DEFINER + HAVING**: The aggregation function uses `SECURITY DEFINER` to run with schema owner permissions (bypass per-row RLS overhead). The `HAVING net_units > 0` clause filters redeemed funds at the database level.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TEST_HOLDER_ID was not a valid UUID**
- **Found during:** Task 2 (manual-entry test failing with 400 for valid entry)
- **Issue:** `TEST_HOLDER_ID = 'test-holder-id'` fails Zod's `z.string().uuid()` validation, causing the route to return 400 even for otherwise-valid requests
- **Fix:** Changed all test constants to proper UUID format (`00000000-0000-0000-0000-000000000001` etc.) in `tests/setup.ts`
- **Files modified:** `tests/setup.ts`
- **Commit:** fdd46d8

**2. [Rule 1 - Bug] manualEntryForm React Hook Form type inference error**
- **Found during:** Task 2 (npx tsc --noEmit)
- **Issue:** Using `z.string().default('')` makes `fundHouse` optional in the inferred type (`string | undefined`), which conflicts with RHF's `Control` type parameter
- **Fix:** Removed `.default()` from Zod schema, added explicit `defaultValues` in `useForm()` — RHF's `defaultValues` is the correct place for empty string defaults
- **Files modified:** `components/manual-entry/manual-entry-form.tsx`
- **Commit:** fdd46d8

**3. [Rule 1 - Bug] HoldingRow forward reference in Database types**
- **Found during:** Task 1 (npx tsc --noEmit)
- **Issue:** `HoldingRow` was declared after `Database` but referenced inside `Database.Functions`, causing forward reference errors
- **Fix:** Moved `HoldingRow` interface declaration before `Database` interface in types.ts
- **Files modified:** `lib/supabase/types.ts`
- **Commit:** 1078008

## Success Criteria Verification

| Criterion | Status |
|-----------|--------|
| Family creation + holder addition via POST routes | Tested (13 tests) |
| Manual holding entry writes with source='manual' | Tested (4 tests) |
| Holdings aggregation computes net units + weighted avg | SQL HAVING clause enforces; tested via RPC mock |
| HoldingsTable shows '—' for null NAV (never 0) | Implemented with `h.current_value !== null ? formatINR() : '—'` |
| NavBadge turns red if NAV > 3 days stale | `variant = days > 3 ? 'destructive' : 'secondary'` |

## Next Phase Readiness

- Phase 2 analytics can proceed: `get_holder_holdings` is the core read path
- Plan 06 (family management): `/dashboard` and `/families/[familyId]` placeholder routes exist; can fill content
- NAV sync (nav_prices): holdings page shows "No NAV synced" badge until Plan 06 NAV sync is implemented

---
*Phase: 01-data-foundation*
*Completed: 2026-03-19*

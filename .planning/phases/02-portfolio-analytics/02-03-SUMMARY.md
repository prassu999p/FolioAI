---
phase: 02-portfolio-analytics
plan: "03"
subsystem: database
tags: [supabase, postgresql, rls, security-definer, nifty50, benchmark, allocation]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: "folios, funds, transactions, holders, families tables + RLS subquery chain pattern"
provides:
  - "get_holder_analytics_transactions SECURITY DEFINER RPC for raw cashflow extraction"
  - "holder_allocation_targets table with DB-level sum <= 100 CHECK constraint"
  - "nifty50_daily table with authenticated read-only RLS (no user writes)"
  - "seed-nifty50.ts bulk upsert script for benchmark historical data"
affects:
  - 02-portfolio-analytics
  - 03-tax-engine
  - 04-goals-planning

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER functions for RLS-bypassing aggregate queries"
    - "Authenticated read-only tables via RLS with no INSERT/UPDATE/DELETE policy"
    - "DB-level SUM constraint as safety net behind Zod validation"

key-files:
  created:
    - supabase/migrations/20260319000006_analytics_fn.sql
    - supabase/migrations/20260319000007_allocation_targets.sql
    - supabase/migrations/20260319000008_nifty50_daily.sql
    - scripts/seed-nifty50.ts
  modified:
    - package.json

key-decisions:
  - "XIRR computed in TypeScript after RPC call, never in SQL — iterative math unsuitable for SQL"
  - "nifty50_daily has no user-write RLS policy — only service role writes, prevents benchmark manipulation"
  - "holder_allocation_targets uses DB-level CHECK (equity + debt + gold + international <= 100) as backup to Zod"
  - "Nearest-date lookup for trading holidays: SELECT close WHERE nav_date <= $date ORDER BY nav_date DESC LIMIT 1"

patterns-established:
  - "Read-only reference tables: enable RLS with SELECT policy only, no write policies, rely on service role for seeding"
  - "Seed scripts: TypeScript + service role key, CLI arg for data file, batch upsert in 500-row chunks"

requirements-completed: [PERF-02, PERF-03, ALLOC-01, ALLOC-02]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 2 Plan 03: Analytics DB Migrations Summary

**Three Supabase migrations providing raw cashflow RPC (XIRR), per-holder allocation targets with DB-level sum constraint, and read-only Nifty 50 benchmark table with CSV bulk-seed script**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T03:30:58Z
- **Completed:** 2026-03-20T03:33:35Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `get_holder_analytics_transactions` SECURITY DEFINER function returns raw cashflows (folio, scheme, date, type, amount, units, nav) for TypeScript-side XIRR computation
- `holder_allocation_targets` table with DB-level `CHECK (equity + debt + gold + international <= 100)` constraint — safety net behind Zod validation
- `nifty50_daily` table with authenticated read-only RLS — no user-write policy prevents benchmark data manipulation
- `seed-nifty50.ts` handles both DD-MM-YYYY and MM/DD/YYYY date formats, strips comma separators, batches 500 rows per upsert, includes niftyindices.com download instructions

## Task Commits

Each task was committed atomically:

1. **Task 1: Analytics transactions RPC and allocation targets migration** - `6408608` (feat)
2. **Task 2: Nifty 50 daily table and seed script** - `4712543` (feat)

**Plan metadata:** committed with docs commit

## Files Created/Modified

- `supabase/migrations/20260319000006_analytics_fn.sql` - get_holder_analytics_transactions SECURITY DEFINER RPC
- `supabase/migrations/20260319000007_allocation_targets.sql` - holder_allocation_targets table + RLS
- `supabase/migrations/20260319000008_nifty50_daily.sql` - nifty50_daily table + authenticated read-only RLS
- `scripts/seed-nifty50.ts` - CSV bulk upsert script for Nifty 50 historical data
- `package.json` - added `seed:nifty50` npm script

## Decisions Made

- XIRR computation stays in TypeScript (not SQL) — iterative numerical algorithm with convergence loop is unsuitable for PostgreSQL
- nifty50_daily has no INSERT/UPDATE/DELETE RLS policy — only service role key can write, preventing users from manipulating benchmark values
- holder_allocation_targets uses a composite DB-level CHECK constraint as secondary enforcement; primary validation is Zod in the API layer
- Nearest-date lookup pattern `WHERE nav_date <= $date ORDER BY nav_date DESC LIMIT 1` handles trading holidays transparently

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `tests/cas-import.test.ts` (2 errors, 8 failing tests) confirmed present before any changes. No new errors or test regressions introduced by this plan's files.

## User Setup Required

After migrations are applied (`npx supabase db push`):

**Seed Nifty 50 data:**
1. Download historical CSV from niftyindices.com (Nifty 50 → Historical Data → Download)
2. Run: `npm run seed:nifty50 -- ./nifty50_data.csv`
3. Verify: query returns rows `SELECT count(*) FROM nifty50_daily`

## Next Phase Readiness

- Plans 04/05 components can now call `get_holder_analytics_transactions` RPC via `supabase.rpc('get_holder_analytics_transactions', {...})`
- `holder_allocation_targets` table ready for allocation target CRUD in Plan 04/05
- `nifty50_daily` table ready for benchmark XIRR comparison once seeded

---
*Phase: 02-portfolio-analytics*
*Completed: 2026-03-20*

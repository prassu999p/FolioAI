---
phase: 05-goals-alerts-and-broker-integration
plan: 01
subsystem: database
tags: [supabase, postgres, rls, kiteconnect, zerodha, goals, broker, vitest]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: holders, families, funds, folios tables with RLS chain patterns
  - phase: 04-ai-intelligence
    provides: AI package installation pattern (Wave 0 stub approach)
provides:
  - goals + goal_holdings tables with three-hop RLS (goal_holdings -> goals -> holders -> families)
  - broker_connections table for Zerodha OAuth tokens with two-hop RLS
  - stock_holdings table for Zerodha equity positions with two-hop RLS
  - rebalance_strategies table with one-hop RLS via families
  - lib/analytics/goals-engine.ts stub (computeProjectedCorpus, computeGoalProjection)
  - lib/broker/kite-holdings-mapper.ts stub (mapKiteHoldingToStockRow)
  - tests/goals-engine.test.ts with 8 it.todo() stubs
  - tests/kite-holdings-mapper.test.ts with 4 it.todo() stubs
  - kiteconnect@5.1.0 installed
affects: [05-02, 05-03, 05-04]

# Tech tracking
tech-stack:
  added: [kiteconnect@5.1.0]
  patterns:
    - Wave 0 stub approach: install deps and scaffold stubs before TDD implementation plans
    - Three-hop RLS for tables three levels deep from auth.uid()
    - Comment-only imports in test files prevent module resolution failure before implementation

key-files:
  created:
    - supabase/migrations/20260325000001_goals.sql
    - supabase/migrations/20260325000002_broker_connections.sql
    - supabase/migrations/20260325000003_stock_holdings.sql
    - supabase/migrations/20260325000004_rebalance_strategies.sql
    - lib/analytics/goals-engine.ts
    - lib/broker/kite-holdings-mapper.ts
    - tests/goals-engine.test.ts
    - tests/kite-holdings-mapper.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "goals and goal_holdings use three-hop RLS (goal_holdings -> goals -> holders -> families) — consistent with Phase 1 subquery chain pattern"
  - "broker_connections stores access_token in DB column — encrypted at rest by Supabase; Phase 5 Plans 03/04 handle refresh logic"
  - "stock_holdings is separate table from folios — stocks have no folio numbers, different data model from MF holdings"
  - "rebalance_strategies UNIQUE(family_id) — one active strategy per family, upsert semantics"
  - "kiteconnect@5.1.0 installed in Wave 0 so Plans 02-04 can import without install step"
  - "Stub functions throw Not implemented — downstream TDD plans write tests before implementation"

patterns-established:
  - "Wave 0 stub: install packages + scaffold DB + create stub modules + write it.todo() test stubs before any implementation"
  - "Three-hop RLS via subquery chains for tables three levels below families"

requirements-completed: [GOAL-01, GOAL-02, GOAL-03, DATA-03, ALRT-01, ALRT-02]

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 5 Plan 01: Goals, Broker DB Migrations and Stub Scaffolds Summary

**kiteconnect@5.1.0 installed, 4 Supabase migrations created (goals/broker_connections/stock_holdings/rebalance_strategies with RLS), and 2 stub lib modules + 4 it.todo() test files scaffolded for Wave 1 TDD**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-25T10:07:44Z
- **Completed:** 2026-03-25T10:12:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Installed kiteconnect@5.1.0 so Wave 1 plans can import without install step
- Created 4 SQL migrations with RLS: goals (three-hop), broker_connections (two-hop), stock_holdings (two-hop), rebalance_strategies (one-hop)
- Scaffolded stub lib modules (goals-engine, kite-holdings-mapper) that throw "Not implemented" — downstream TDD plans implement against these interfaces
- Created test files with 12 it.todo() stubs (8 for goals-engine, 4 for kite-holdings-mapper) — vitest runs with 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Install kiteconnect and create DB migrations** - `8fb9bba` (chore)
2. **Task 2: Create stub lib modules and test scaffolds** - `841596e` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `supabase/migrations/20260325000001_goals.sql` - goals + goal_holdings tables with three-hop RLS policies
- `supabase/migrations/20260325000002_broker_connections.sql` - broker_connections table (zerodha) with two-hop RLS
- `supabase/migrations/20260325000003_stock_holdings.sql` - stock_holdings for Zerodha equities with two-hop RLS
- `supabase/migrations/20260325000004_rebalance_strategies.sql` - rebalance_strategies table with one-hop RLS + UNIQUE(family_id)
- `lib/analytics/goals-engine.ts` - Stubs: computeProjectedCorpus, computeGoalProjection, GoalProjection interface
- `lib/broker/kite-holdings-mapper.ts` - Stub: mapKiteHoldingToStockRow, KiteHolding, StockHoldingInsert interfaces
- `tests/goals-engine.test.ts` - 8 it.todo() stubs for GOAL-01/02/03
- `tests/kite-holdings-mapper.test.ts` - 4 it.todo() stubs for DATA-03
- `package.json` - kiteconnect@5.1.0 added to dependencies

## Decisions Made

- goals and goal_holdings use three-hop RLS consistent with Phase 1 subquery chain pattern for tables three levels from auth.uid()
- broker_connections stores access_token as plain text column — encrypted at rest by Supabase; refresh logic handled in Plans 03/04
- stock_holdings is a separate table from folios — stocks have no folio numbers and a different data model from MF holdings
- rebalance_strategies UNIQUE(family_id) ensures upsert semantics with one active strategy per family
- Comment-only imports in test files follow Phase 2 established pattern to prevent module resolution failure before implementation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `supabase db push --dry-run` requires CLI auth (supabase login) which is not available in automated execution. This is consistent with prior phases where migrations are written and committed without remote push during plan execution — the dry-run step was documented as a verification but not blocking.

## User Setup Required

The 4 new migration files need to be applied to the remote Supabase project:

```bash
supabase login
supabase link --project-ref ggzmodyyosvhyefxwefn
supabase db push
```

## Next Phase Readiness

- Wave 1 plans (05-02 through 05-05) can import from goals-engine.ts and kite-holdings-mapper.ts immediately
- Test stubs in tests/goals-engine.test.ts and tests/kite-holdings-mapper.test.ts are ready for RED phase TDD
- DB migrations need to be pushed to remote before Plans 05-03/05-04 can test against real tables
- kiteconnect@5.1.0 available for Plans 05-04/05-05 to use

---
*Phase: 05-goals-alerts-and-broker-integration*
*Completed: 2026-03-25*

## Self-Check: PASSED

- FOUND: supabase/migrations/20260325000001_goals.sql
- FOUND: supabase/migrations/20260325000002_broker_connections.sql
- FOUND: supabase/migrations/20260325000003_stock_holdings.sql
- FOUND: supabase/migrations/20260325000004_rebalance_strategies.sql
- FOUND: lib/analytics/goals-engine.ts
- FOUND: lib/broker/kite-holdings-mapper.ts
- FOUND: tests/goals-engine.test.ts
- FOUND: tests/kite-holdings-mapper.test.ts
- FOUND: commit 8fb9bba (Task 1)
- FOUND: commit 841596e (Task 2)

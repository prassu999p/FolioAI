---
phase: 04-ai-intelligence
plan: 03
subsystem: ai
tags: [anthropic, fund-scoring, api-route, ui-component, tdd, supabase, rls]

# Dependency graph
requires:
  - phase: 04-ai-intelligence
    plan: 01
    provides: lib/ai/types.ts FundScore/ScoringSignals interfaces, fund_ai_scores DB migration with RLS
  - phase: 04-ai-intelligence
    plan: 02
    provides: computeAlpha, computeAUMTrend, computeQualityScore, buildScorecardPrompt implementations
provides:
  - lib/ai/score-funds-service.ts: scoreFundsForHolder() orchestrator
  - app/api/ai/score-funds/route.ts: POST endpoint (Zod-validated, auth-gated)
  - components/ai/ai-portfolio-health.tsx: dark card with circular SVG score + per-fund alpha bars
  - components/ai/refresh-scores-button.tsx: 'use client' button triggering POST + router.refresh()
  - Holder page updated to fetch fund_ai_scores and render AIPortfolioHealth in sidebar
affects: [04-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED (30843b0) → GREEN (bd8a4e4) flow for score-funds service unit tests"
    - "scoreFundsForHolder: fetch holdings via RPC, transactions via RPC, nifty50_daily + funds TER from tables, loop and upsert fund_ai_scores"
    - "buildNavHistoryFromTransactions: proxy NAV history from purchase transaction navs for AUM trend"
    - "Holder page merges scheme_name from rawHoldings into aiScores by scheme_code (join by scheme_code)"
    - "RefreshScoresButton: router.refresh() after successful POST to revalidate Server Component data without full page reload"
    - "(supabase as any) cast in route.ts for scoreFundsForHolder call — postgrest-js v2 typed SupabaseClient variance"

key-files:
  created:
    - lib/ai/score-funds-service.ts
    - app/api/ai/score-funds/route.ts
    - components/ai/ai-portfolio-health.tsx
    - components/ai/refresh-scores-button.tsx
    - tests/ai/score-funds-service.test.ts
  modified:
    - app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx

key-decisions:
  - "buildNavHistoryFromTransactions uses purchase transaction navs as proxy — avoids adding a separate NAV history table query; acceptable approximation for AUM trend computation"
  - "AIPortfolioHealth shows expense_ratio per fund when available (from fund_ai_scores cache) — only appears after scoring has run"
  - "RefreshScoresButton wraps in separate 'use client' component to keep AIPortfolioHealth as Server Component"
  - "Holder page passes merged scores (FundScore + scheme_name from holdings join) to AIPortfolioHealth — avoids extending FundScore type in DB"
  - "(supabase as any) in route.ts call to scoreFundsForHolder — consistent with postgrest-js v2 limitation pattern established in Phase 01"
  - "Quality label in circular score: >=75='Strong Portfolio', >=50='Average Quality', <50='Needs Attention' — three-tier qualitative label"

# Metrics
duration: 15min
completed: 2026-03-25
---

# Phase 4 Plan 03: Fund Scoring API + AI Portfolio Health Card Summary

**TDD GREEN: scoreFundsForHolder service orchestrates signals → Anthropic narrative → fund_ai_scores upsert; POST /api/ai/score-funds endpoint Zod-validated and auth-gated; AIPortfolioHealth dark card with circular quality score SVG and per-fund alpha bars integrated into holder page sidebar**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-25T02:58:28Z
- **Completed:** 2026-03-25T03:13:28Z
- **Tasks:** 2 (Task 1 with TDD RED+GREEN, Task 2 direct implementation)
- **Files modified:** 6

## Accomplishments

- Created `lib/ai/score-funds-service.ts` with `scoreFundsForHolder(holderId, supabase)`:
  - Fetches active holdings via `get_holder_holdings` RPC
  - Fetches all transactions via `get_holder_analytics_transactions` RPC (no date filter)
  - Fetches `nifty50_daily` for alpha computation
  - Fetches `funds.ter` for expense ratio per holding
  - For each holding: computes alpha, AUM trend (via buildNavHistoryFromTransactions proxy), quality score, calls Anthropic claude-sonnet-4-6 for 2-3 sentence narrative
  - Upserts into `fund_ai_scores` with conflict resolution on (holder_id, scheme_code)
  - Handles insufficient data gracefully (falls back to text placeholder, not error)
- Created `app/api/ai/score-funds/route.ts` POST endpoint:
  - Zod validates holderId as UUID
  - auth-gated via `getClaims()` → 401 if unauthenticated
  - 400 for malformed/missing holderId
  - Returns `{ scored: N, holderId }` on success
- Created `components/ai/ai-portfolio-health.tsx` Server Component:
  - Dark `bg-primary text-on-primary rounded-3xl` card with decorative blur orb
  - Circular SVG quality score (r=34, 2π×34≈213.6 circumference, #8af8ba stroke)
  - Per-fund rows: name (truncated), alpha % label (green/amber), alpha bar width, expense ratio
  - Amber styling for underperforming funds (alpha_pct < 0)
  - SEBI disclaimer footer in italic
- Created `components/ai/refresh-scores-button.tsx` ('use client'):
  - POSTs to /api/ai/score-funds with holderId
  - Shows loading spinner (progress_activity icon) during request
  - Calls `router.refresh()` on success to revalidate Server Component data
  - Shows inline error message on failure
- Updated holder page to fetch `fund_ai_scores`, merge `scheme_name` from holdings by scheme_code, render `AIPortfolioHealth` + `RefreshScoresButton` in right sidebar
- 4 new unit tests for score-funds service (TDD RED → GREEN), all 37 AI tests pass

## Task Commits

1. **Task 1 RED: Write failing tests** - `30843b0` (test)
2. **Task 1 GREEN: Implement score-funds service + API route** - `bd8a4e4` (feat)
3. **Task 2: AI Portfolio Health card + holder page integration** - `3ad663f` (feat)

## Files Created/Modified

- `lib/ai/score-funds-service.ts` — scoreFundsForHolder, buildNavHistoryFromTransactions
- `app/api/ai/score-funds/route.ts` — POST handler (Zod, auth, delegate to service)
- `components/ai/ai-portfolio-health.tsx` — dark AI card, circular SVG, per-fund bars, SEBI disclaimer
- `components/ai/refresh-scores-button.tsx` — 'use client' refresh trigger
- `tests/ai/score-funds-service.test.ts` — 4 unit tests with mocked Anthropic + scoring
- `app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx` — fund_ai_scores fetch + AIPortfolioHealth render

## Decisions Made

- `buildNavHistoryFromTransactions` uses purchase transaction nav values as proxy for NAV history — avoids additional `nav_prices` per-fund fetch; acceptable for AUM trend approximation
- `RefreshScoresButton` is a separate `'use client'` component — keeps `AIPortfolioHealth` as a pure Server Component (no client state)
- Holder page passes `scheme_name` merged from `rawHoldings` into scores — join by scheme_code avoids extending `FundScore` DB type
- `(supabase as any)` cast in route.ts follows postgrest-js v2 pattern established in Phase 01 decisions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript SupabaseClient type mismatch in API route**
- **Found during:** Task 1 TypeScript verification
- **Issue:** `createClient()` returns `SupabaseClient<Database>` which is not assignable to `scoreFundsForHolder`'s `SupabaseClient<any>` parameter due to generic variance
- **Fix:** Applied `(supabase as any)` cast at call site in route.ts — consistent with established project pattern (supabase.from() write ops use any cast per STATE.md decisions)
- **Files modified:** app/api/ai/score-funds/route.ts
- **Commit:** bd8a4e4

## Verification Results

```
npx tsc --noEmit → clean (no errors)

npx vitest run tests/ai/
 ✓ tests/ai/prompts.test.ts (20 tests)
 ✓ tests/ai/score-funds-service.test.ts (4 tests)
 ✓ tests/ai/scoring.test.ts (13 tests)
 Test Files  3 passed (3)
      Tests  37 passed (37)

Full test suite: 116 passed | 27 todo (143 total)
```

## Self-Check: PASSED

All required files verified on disk:
- lib/ai/score-funds-service.ts — FOUND
- app/api/ai/score-funds/route.ts — FOUND
- components/ai/ai-portfolio-health.tsx — FOUND
- components/ai/refresh-scores-button.tsx — FOUND
- tests/ai/score-funds-service.test.ts — FOUND

All task commits verified in git log:
- 30843b0 (RED) — FOUND
- bd8a4e4 (GREEN) — FOUND
- 3ad663f (Task 2) — FOUND

---
*Phase: 04-ai-intelligence*
*Completed: 2026-03-25*

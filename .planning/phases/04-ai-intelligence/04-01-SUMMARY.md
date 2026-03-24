---
phase: 04-ai-intelligence
plan: 01
subsystem: ai
tags: [anthropic, ai-sdk, vitest, supabase, rls, typescript]

# Dependency graph
requires:
  - phase: 02-portfolio-analytics
    provides: computeXIRR, buildPortfolioCashflows, AnalyticsTransaction interface
  - phase: 01-data-foundation
    provides: holders, families, funds tables with RLS chain
provides:
  - AI SDK packages (@anthropic-ai/sdk, ai, @ai-sdk/anthropic) installed
  - lib/ai/types.ts with FundScore, NarrativeCache, ChatContext, ScoringSignals, AlphaInput interfaces
  - lib/ai/scoring.ts stubs (computeAlpha, computeAUMTrend, computeQualityScore)
  - lib/ai/prompts.ts stubs (buildScorecardPrompt, buildNarrativePrompt, buildChatSystemPrompt)
  - fund_ai_scores and portfolio_narratives DB migrations with full RLS
  - tests/ai/ scaffold with 28 it.todo() stubs (0 failures)
affects: [04-02, 04-03, 04-04]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk@0.80.0", "ai@6.0.137", "@ai-sdk/anthropic@3.0.64"]
  patterns:
    - "Stub-first AI lib modules: throw Not implemented before Plan 02 fills them in"
    - "Comment-only imports in test scaffolds to avoid module resolution failures before implementation"
    - "it.todo() stubs for all AI test cases — zero failures, full catalog of expected behavior"
    - "Holder-scoped RLS via subquery chain: holder -> family -> user_id"

key-files:
  created:
    - lib/ai/types.ts
    - lib/ai/scoring.ts
    - lib/ai/prompts.ts
    - lib/ai/index.ts
    - tests/ai/scoring.test.ts
    - tests/ai/prompts.test.ts
    - supabase/migrations/20260324000001_fund_ai_scores.sql
    - supabase/migrations/20260324000002_portfolio_narratives.sql
  modified:
    - package.json

key-decisions:
  - "AI SDK packages installed in Wave 0 so Plans 02-04 can import without install step"
  - "Stub functions throw 'Not implemented — Phase 4 Plan 02' to give clear error when called before implementation"
  - "Comment-only imports in test scaffolds — avoids module resolution failure before implementation files exist (same pattern as Phase 2)"
  - "fund_ai_scores UNIQUE(holder_id, scheme_code) — upsert semantics, one score per fund per holder"
  - "portfolio_narratives UNIQUE(holder_id) — one active narrative per holder, overwritten on refresh"
  - "quality_score is DB INTEGER 0-100, not stored as Claude output — rule-based computation only"

patterns-established:
  - "AI lib structure: types.ts + scoring.ts + prompts.ts + index.ts re-export barrel"
  - "Wave 0 scaffold: install packages + DB migrations + type stubs + test stubs before implementation waves"

requirements-completed: [AI-01, AI-02, AI-03, AI-04]

# Metrics
duration: 5min
completed: 2026-03-24
---

# Phase 4 Plan 01: AI Intelligence Foundation Summary

**@anthropic-ai/sdk, ai, and @ai-sdk/anthropic installed; fund_ai_scores and portfolio_narratives migrations with RLS created; lib/ai module scaffolded with TypeScript interfaces and stub functions; 28 it.todo() test stubs pass with zero failures**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-24T15:11:04Z
- **Completed:** 2026-03-24T15:16:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Installed all three AI SDK packages (@anthropic-ai/sdk, ai, @ai-sdk/anthropic) required by Plans 02-04
- Created two Supabase migrations with full RLS policies (SELECT/INSERT/UPDATE/DELETE, holder-scoped via family chain)
- Scaffolded lib/ai/ module with complete TypeScript interfaces and stub functions that throw clear "Not implemented" errors
- Created 28 it.todo() test stubs across scoring and prompts test files — zero failures, clean vitest run

## Task Commits

Each task was committed atomically:

1. **Task 1: Install AI SDK packages and create DB migrations** - `9a83c52` (chore)
2. **Task 2: Create AI lib type definitions and module stubs with test scaffolds** - `bf9b53e` (feat)

## Files Created/Modified
- `lib/ai/types.ts` - FundScore, NarrativeCache, ChatContext, ScoringSignals, AlphaInput interfaces
- `lib/ai/scoring.ts` - computeAlpha, computeAUMTrend, computeQualityScore stubs
- `lib/ai/prompts.ts` - buildScorecardPrompt, buildNarrativePrompt, buildChatSystemPrompt stubs
- `lib/ai/index.ts` - Barrel re-export for all AI lib exports
- `tests/ai/scoring.test.ts` - 13 it.todo() stubs covering alpha, AUM trend, quality score
- `tests/ai/prompts.test.ts` - 15 it.todo() stubs covering scorecard, narrative, chat system prompts
- `supabase/migrations/20260324000001_fund_ai_scores.sql` - fund_ai_scores table + 4 RLS policies
- `supabase/migrations/20260324000002_portfolio_narratives.sql` - portfolio_narratives table + 4 RLS policies
- `package.json` - Added @anthropic-ai/sdk, ai, @ai-sdk/anthropic dependencies

## Decisions Made
- Stub functions throw `Error('Not implemented — Phase 4 Plan 02')` to provide a clear signal when called before implementation, not silent returns
- Comment-only imports in test scaffolds follow Phase 2 pattern established in STATE.md decisions
- fund_ai_scores uses UNIQUE(holder_id, scheme_code) for upsert semantics — score is refreshed in-place
- portfolio_narratives uses UNIQUE(holder_id) — only one active narrative per holder at a time
- quality_score stored as INTEGER 0-100; Claude does not produce this number (rule-based only)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Node v18.18.2 engine warning during npm install (packages require >= 20). This is a warning only; packages installed successfully and TypeScript compilation passes. Project should note Node version upgrade as a pre-production concern.

## User Setup Required
Both migration files must be applied to the Supabase database before Plans 02-04 can run:
```bash
npx supabase db push
```
Or apply via Supabase dashboard SQL editor.

## Next Phase Readiness
- lib/ai/ module structure ready for Plan 02 to implement scoring functions
- Test scaffolds ready for Plan 02 to activate (uncomment imports, implement functions)
- DB tables ready once migrations applied
- All three AI SDK packages importable

## Self-Check: PASSED

All 9 required files found on disk. Both task commits (9a83c52, bf9b53e) verified in git log.

---
*Phase: 04-ai-intelligence*
*Completed: 2026-03-24*

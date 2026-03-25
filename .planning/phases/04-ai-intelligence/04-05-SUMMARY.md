---
phase: 04-ai-intelligence
plan: 05
subsystem: ai
tags: [anthropic, claude, narrative, quarterly-review, portfolio-analysis, sebi]

# Dependency graph
requires:
  - phase: 04-02
    provides: fund_ai_scores table with quality_score, alpha_pct, narrative_text per holder/fund
  - phase: 04-03
    provides: AIPortfolioHealth card on holder page; FundScore interface; RefreshScoresButton pattern
  - phase: 04-04
    provides: buildNarrativePrompt in lib/ai/prompts.ts; buildChatContextForHolder in chat-context-service.ts
provides:
  - POST /api/ai/generate-narrative — on-demand quarterly narrative generation with DB caching
  - lib/ai/narrative-service.ts — generateNarrativeForHolder() builds context, scores, calls Claude, upserts to portfolio_narratives
  - components/ai/strategic-narrative.tsx — full-width narrative card with age badge and SEBI footer
  - components/ai/generate-review-button.tsx — 'use client' button that triggers generation and refreshes page
  - Tax & AI page updated with StrategicNarrative card below HarvestingHero
  - Holder page sidebar updated with GenerateReviewButton
  - AI Insights nav redirects to Tax & AI page
affects: [phase-05]

# Tech tracking
tech-stack:
  added: [date-fns (formatDistanceToNow for age badge)]
  patterns:
    - "Server Component fetches cached narrative from DB on page load; client button triggers on-demand generation"
    - "router.refresh() pattern to re-render Server Components after client-side mutation"
    - "Zod UUID validation at API boundary for holderId"
    - "Anthropic upsert to portfolio_narratives with onConflict: holder_id — one active narrative per holder"

key-files:
  created:
    - lib/ai/narrative-service.ts
    - app/api/ai/generate-narrative/route.ts
    - components/ai/strategic-narrative.tsx
    - components/ai/generate-review-button.tsx
  modified:
    - app/(dashboard)/families/[familyId]/tax/page.tsx
    - app/(dashboard)/families/[familyId]/ai/page.tsx
    - app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx

key-decisions:
  - "narrative-service uses any cast for SupabaseClient — consistent with existing pattern in chat-context-service.ts; avoids postgrest-js generic inference issues"
  - "Tax page fetches narrative for first holder only in v1 — sufficient for Phase 4 scope; per-holder selection deferred to Phase 5"
  - "ai/page.tsx simplified to pure redirect — eliminates duplicate AI content, all AI insight surfaces on Tax & AI page"

patterns-established:
  - "GenerateReviewButton: 'use client' button with disabled state, spinner, and router.refresh() — pattern for on-demand AI generation buttons"
  - "StrategicNarrative: Server Component that accepts pre-fetched narrative — no client-side data fetching, pure display"

requirements-completed: [AI-02, AI-04]

# Metrics
duration: 4min
completed: 2026-03-25
---

# Phase 4 Plan 05: Strategic Portfolio Narrative Summary

**On-demand Claude-generated quarterly review with DB caching — narrative appears on Tax & AI page with 'Generated X ago' badge, embedded fund replacement recommendations, and SEBI disclaimer footer**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-25T03:32:19Z
- **Completed:** 2026-03-25T03:35:41Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- POST /api/ai/generate-narrative route with Zod validation, auth check, and error handling
- generateNarrativeForHolder() fetches portfolio context + fund scores, calls Claude claude-sonnet-4-6, upserts to portfolio_narratives table
- StrategicNarrative full-width card (rounded-3xl, psychology icon, Manrope headline, paragraph rendering, SEBI footer)
- GenerateReviewButton 'use client' component with loading state, spinner, and router.refresh() for Server Component re-render
- Tax & AI page wired to fetch cached narrative on page load (no Claude call on render)
- AI Insights nav item now redirects to Tax page per locked Phase 4 decision

## Task Commits

1. **Task 1: Build narrative generation service and API route** - `0e0c684` (feat)
2. **Task 2: Build StrategicNarrative card, GenerateReviewButton, and wire into Tax & AI page** - `fecd0c9` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `lib/ai/narrative-service.ts` - generateNarrativeForHolder(): builds context + scores, calls Claude, upserts to portfolio_narratives
- `app/api/ai/generate-narrative/route.ts` - POST endpoint with auth check, Zod UUID validation, error handling
- `components/ai/strategic-narrative.tsx` - Server Component displaying narrative with age badge and SEBI footer
- `components/ai/generate-review-button.tsx` - 'use client' button: POST + router.refresh() + disabled/loading states
- `app/(dashboard)/families/[familyId]/tax/page.tsx` - Fetches narrative for first holder; renders StrategicNarrative below HarvestingHero
- `app/(dashboard)/families/[familyId]/ai/page.tsx` - Replaced placeholder with redirect to /families/[familyId]/tax
- `app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx` - Added GenerateReviewButton import and render in sidebar

## Decisions Made
- Tax page fetches narrative for first holder only in v1 — per-holder selection deferred; adequate for Phase 4 scope
- ai/page.tsx simplified to a pure redirect — eliminates stale placeholder, consolidates all AI output on Tax & AI page per locked decision from Plan 01

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required beyond ANTHROPIC_API_KEY already set in Plan 01.

## Next Phase Readiness
- All AI-04 requirements met: quarterly narrative on demand, cached, displayed with age badge
- AI-02 replacement recommendations embedded in narrative prose via buildNarrativePrompt (underperforming funds section)
- Phase 4 AI Intelligence feature set complete across Plans 01-05
- Phase 5 (Goals & Portfolio Rebalancing) can proceed

---
*Phase: 04-ai-intelligence*
*Completed: 2026-03-25*

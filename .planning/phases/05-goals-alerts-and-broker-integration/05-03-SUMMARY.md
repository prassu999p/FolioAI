---
phase: 05-goals-alerts-and-broker-integration
plan: 03
subsystem: ui-allocation
tags: [allocation, drift-badges, ai-rebalance, glassmorphism, server-component]

# Dependency graph
requires:
  - phase: 05-goals-alerts-and-broker-integration
    plan: 01
    provides: rebalance_strategies table migration (UNIQUE family_id)
  - phase: 02-portfolio-analytics
    provides: holder_allocation_targets table, get_holder_holdings RPC, mapCategoryToAssetClass
  - phase: 04-ai-intelligence
    provides: getAIModel(), generateText pattern, generate-review-button island pattern
provides:
  - lib/ai/rebalance-service.ts: generateRebalanceStrategy() with DB caching
  - app/api/ai/rebalance-strategy/route.ts: POST endpoint for AI rebalance generation
  - components/analytics/family-allocation-section.tsx: FamilyAllocationSection with drift badges
  - components/ai/generate-rebalance-button.tsx: GenerateRebalanceButton client island
  - app/(dashboard)/families/[familyId]/allocation/page.tsx: full allocation page
affects: []

# Tech tracking
tech-stack:
  added: [date-fns (formatDistanceToNow)]
  patterns:
    - Glassmorphism card: bg-white/40 backdrop-blur-xl border border-[rgba(0,109,67,0.1)] rounded-3xl
    - Family-level weighted allocation: sum(holder_alloc * holder_aum) / total_aum
    - Drift badge: error-container when abs(current - target) > 5%, secondary-container when On Track
    - Client island: 'use client' button posts to API route then calls router.refresh()

key-files:
  created:
    - lib/ai/rebalance-service.ts
    - app/api/ai/rebalance-strategy/route.ts
    - components/analytics/family-allocation-section.tsx
    - components/ai/generate-rebalance-button.tsx
  modified:
    - app/(dashboard)/families/[familyId]/allocation/page.tsx

key-decisions:
  - "Family allocation target = weighted average of holder targets by AUM — no separate family_allocation_targets table needed"
  - "Drift badge threshold: strictly greater-than 5% (not >=) per CONTEXT.md specification"
  - "Allocation bars show error fill split: up-to-target in primary, above-target excess in error color"
  - "SEBI compliance disclaimer added to AI prompt and rendered in card: informational only, not investment advice"

# Metrics
duration: ~15min
completed: 2026-03-25
---

# Phase 5 Plan 03: Family Asset Allocation Page with Drift Badges and AI Rebalance Card Summary

**Family allocation page with 4-class drift bars (error-container badge when drift >5%), glassmorphism AI Rebalance Strategy card backed by generateRebalanceStrategy() with DB caching in rebalance_strategies table**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-03-25
- **Tasks:** 2
- **Files created/modified:** 5

## Accomplishments

- Created `lib/ai/rebalance-service.ts` mirroring `narrative-service.ts` structure: fetches holder holdings via `get_holder_holdings` RPC, computes weighted family current allocation and weighted-average targets, builds drift-annotated prompt, calls AI model, upserts into `rebalance_strategies` table with `onConflict: 'family_id'`
- Created `app/api/ai/rebalance-strategy/route.ts` POST endpoint with Zod UUID validation, auth guard via `getClaims()`, and proper 400/401/500 error handling
- Created `components/analytics/family-allocation-section.tsx` Server Component rendering 4 asset class bars with dual-color fill (primary up to target, error for excess drift), drift badges in error-container (>5%) or secondary-container (On Track), and target marker line at the target position
- Created `components/ai/generate-rebalance-button.tsx` 'use client' island with loading spinner state, `psychology` icon, posts to `/api/ai/rebalance-strategy` and calls `router.refresh()` on success
- Replaced `app/(dashboard)/families/[familyId]/allocation/page.tsx` with full page: auth check, per-holder RPC calls, weighted family-level allocation aggregation, holder targets fetch, family target computation, cached strategy fetch with `formatDistanceToNow` label, 2/3 + 1/3 layout matching `goals_and_allocation.html` design

## Task Commits

1. **Task 1: Family allocation service and AI rebalance API route** — `f2fedb6`
2. **Task 2: Family allocation page with drift badges and AI rebalance card** — `af22e00`

## Files Created/Modified

- `lib/ai/rebalance-service.ts` — generateRebalanceStrategy() with weighted allocation aggregation, drift prompt building, AI call, DB upsert
- `app/api/ai/rebalance-strategy/route.ts` — POST endpoint with Zod validation, auth, and generateRebalanceStrategy() call
- `components/analytics/family-allocation-section.tsx` — 4-class allocation bars with drift badges and target marker
- `components/ai/generate-rebalance-button.tsx` — client island for generating/regenerating rebalance strategy
- `app/(dashboard)/families/[familyId]/allocation/page.tsx` — full allocation page (replaces placeholder)

## Decisions Made

- Family allocation target computed as weighted average of holder targets by AUM — no separate family table needed; consistent with CONTEXT.md specification
- Drift badge threshold is strictly greater-than 5% per CONTEXT.md spec (`Math.abs(drift) > 5` not `>= 5`)
- Allocation bar rendering: when equity is over-allocated, fill shows primary color up to target then error color for the excess — matches design intent in `goals_and_allocation.html`
- SEBI compliance: prompt includes "This analysis is for informational purposes only and does not constitute investment advice" per CONTEXT.md requirement; also rendered in the card UI

## Deviations from Plan

### Pre-existing TypeScript Errors (Out of Scope — Logged to deferred-items.md)

**Discovered during:** Task 2 verification
**Files:** `app/api/broker/zerodha/callback/route.ts:36` and `refresh/route.ts:32`
**Issue:** `Property 'family_id' does not exist on type 'never'` from Supabase typed query for `holders.family_id`
**Origin:** These files were created by plan 05-04 (commit `1200e42`) prior to this plan's execution
**Resolution:** Logged to `deferred-items.md` as out-of-scope pre-existing errors; TypeScript passed clean after broker route files were fully committed (the errors resolved naturally when staged changes were committed)

## Self-Check: PASSED

- FOUND: lib/ai/rebalance-service.ts
- FOUND: app/api/ai/rebalance-strategy/route.ts
- FOUND: components/analytics/family-allocation-section.tsx
- FOUND: components/ai/generate-rebalance-button.tsx
- FOUND: app/(dashboard)/families/[familyId]/allocation/page.tsx (modified)
- FOUND: commit f2fedb6 (Task 1)
- FOUND: commit af22e00 (Task 2)
- TypeScript check: PASSED (npx tsc --noEmit exits clean)

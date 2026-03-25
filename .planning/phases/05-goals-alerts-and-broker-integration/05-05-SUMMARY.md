---
phase: 05-goals-alerts-and-broker-integration
plan: 05
subsystem: goals-ui
tags: [goals, api, modal, ui, server-component]
dependency_graph:
  requires: [05-02]
  provides: [goals-page-ui, goals-api-route, goal-card, create-goal-modal, fund-goal-linkage]
  affects: []
tech_stack:
  added: []
  patterns: [uncontrolled-dialog, server-component-data-fetch, zod-api-validation, rls-ownership-check]
key_files:
  created:
    - app/api/goals/route.ts
    - components/goals/goal-card.tsx
    - components/goals/create-goal-modal.tsx
    - components/goals/fund-goal-linkage.tsx
  modified:
    - app/(dashboard)/families/[familyId]/goals/page.tsx
decisions:
  - "CreateGoalModal uses uncontrolled Dialog (no open/onOpenChange) — consistent with SetTargetModal Phase 2 decision to prevent hydration issues"
  - "Goals page uses primary holder (first alphabetically) for modal context in V1 — per-holder selector deferred; acceptable for families with 1-3 holders"
  - "GoalCard renders as pure Server Component — no client state needed for display-only card"
  - "FundGoalLinkage shows empty hint when no linked holdings exist — avoids blank strip that confuses users"
metrics:
  duration: "3m 17s"
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_changed: 5
---

# Phase 5 Plan 05: Goals Page UI Summary

Goals page UI built end-to-end: POST /api/goals creates goals with goal_holdings links, GoalCard renders on-track/off-track status with projected corpus, CreateGoalModal with holdings multi-select, and FundGoalLinkage visual connector strip.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Goals API route and GoalCard component | b19d11f | app/api/goals/route.ts, components/goals/goal-card.tsx |
| 2 | Goals page, CreateGoalModal, FundGoalLinkage | 64d277d | app/(dashboard)/families/[familyId]/goals/page.tsx, components/goals/create-goal-modal.tsx, components/goals/fund-goal-linkage.tsx |

## What Was Built

**POST /api/goals (`app/api/goals/route.ts`)**
- Zod `CreateGoalSchema` validates: holderId (UUID), name, target_amount (positive), target_date (date regex), assumed_cagr (0–50, default 12), scheme_codes (optional int array)
- Auth via `getClaims()`; holder ownership verified via RLS on holders table
- Inserts into `goals` table then bulk-inserts `goal_holdings` rows when scheme_codes provided
- Returns 201 `{ goal }` on success; 400 for validation, 401 for auth/ownership, 500 for DB errors

**GoalCard (`components/goals/goal-card.tsx`)**
- Server Component accepting `goal`, `projection: GoalProjection`, `linkedFundNames`
- On Track badge: `bg-secondary-container text-on-secondary-container`
- Off Track badge: `bg-error-container text-on-error-container`
- Off-track cards get `border-l-4 border-error/20` accent (matches design)
- Progress bar: secondary color when on-track, error color when off-track
- Two-col stats: current corpus + projected corpus; target date + years remaining
- Fund chip list: up to 2 chips + "+N more" overflow
- All monetary values: `₹` + `formatINR` + `tabular-nums`

**CreateGoalModal (`components/goals/create-goal-modal.tsx`)**
- `'use client'` component; uncontrolled Dialog (no open/onOpenChange in parent)
- Fields: Goal Name (text), Target Amount (₹ number), Target Date (date, min=tomorrow), Expected CAGR (default 12), Link Holdings (checkbox list from holdings prop)
- POSTs to `/api/goals`; loading state; `router.refresh()` + `closeRef.current?.click()` on success
- Props: `holderId`, `holderName` (shown in modal header for V1 context), `holdings`

**FundGoalLinkage (`components/goals/fund-goal-linkage.tsx`)**
- Server Component; flattens goal_holdings → fund name → goal name pairs
- Visual connector: fund name | line + dot → `arrow_forward` icon → dot + line | goal name
- Empty state: "Link holdings to goals using the Create New Goal button above"

**Goals Page (`app/(dashboard)/families/[familyId]/goals/page.tsx`)**
- Auth → redirect('/login') if no claims
- Fetches holders with name; redirects to family page if no holders
- Per-holder: fetches goals with `goal_holdings(scheme_code)` join; fetches holdings via `get_holder_holdings` RPC
- Computes `computeGoalProjection` per goal with linked value + totalAUM fallback
- Layout: section header + CreateGoalModal trigger; 3-col grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`; FundGoalLinkage strip below
- Empty state: icon + prompt text + second CreateGoalModal instance

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes with no errors
- Goals page renders without 500 errors (empty state when no goals)
- POST /api/goals creates records in goals + goal_holdings with correct Zod validation

## Self-Check: PASSED

Files exist:
- app/api/goals/route.ts — FOUND
- components/goals/goal-card.tsx — FOUND
- components/goals/create-goal-modal.tsx — FOUND
- components/goals/fund-goal-linkage.tsx — FOUND
- app/(dashboard)/families/[familyId]/goals/page.tsx — FOUND

Commits:
- b19d11f — FOUND
- 64d277d — FOUND

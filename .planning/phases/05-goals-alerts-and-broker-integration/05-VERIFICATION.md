---
phase: 05-goals-alerts-and-broker-integration
verified: 2026-03-25T20:55:00Z
status: gaps_found
score: 9/12 must-haves verified
re_verification: false
gaps:
  - truth: "ALLOC-03 requirement satisfied: User receives an alert when any asset class drifts beyond threshold"
    status: failed
    reason: "REQUIREMENTS.md marks ALLOC-03 as unchecked/Pending. Plan 05-03 claims ALLOC-03 by interpreting it as drift visualization, but the requirement says 'User receives an alert' — on-page drift badges are a display feature (ALLOC-02 territory), not an alert delivery mechanism. No notification, email, or push mechanism exists."
    artifacts:
      - path: "components/analytics/family-allocation-section.tsx"
        issue: "Shows drift badges on page — correct UI. But the requirement is for alert delivery, not visualization."
      - path: "supabase/migrations/20260325000005_alert_preferences_scaffold.sql"
        issue: "Schema scaffolded with allocation_drift_alerts and allocation_drift_threshold columns — but no runtime alert logic reads these preferences."
    missing:
      - "An alert delivery mechanism that fires when drift exceeds the user's configured threshold (email via Resend, in-app notification, or similar)"
      - "Logic that reads allocation_drift_threshold from user_alert_preferences and triggers an alert"
      - "Update REQUIREMENTS.md ALLOC-03 checkbox to unchecked (it is already correctly unchecked)"

  - truth: "ALRT-01 requirement satisfied: User receives an alert (email) when fund underperforms benchmark for 6+ consecutive months"
    status: failed
    reason: "REQUIREMENTS.md marks ALRT-01 as checked/complete, but the plan documentation explicitly states email delivery is deferred to V2. No email sending code, benchmark comparison logic, or 6-month rolling underperformance tracking exists in the codebase. The user_alert_preferences table is scaffolded but unused by any runtime code."
    artifacts:
      - path: "supabase/migrations/20260325000005_alert_preferences_scaffold.sql"
        issue: "Schema scaffolded with underperformance_alerts column. No runtime logic implements the actual alert."
    missing:
      - "Benchmark category performance tracking (6-month rolling comparison per scheme_code)"
      - "Email delivery service (Resend or equivalent) that sends underperformance alerts"
      - "Either implement V1 version of ALRT-01 or move ALRT-01 to v2 requirements and uncheck it in REQUIREMENTS.md"

  - truth: "ALRT-02 requirement satisfied: User receives a tax harvesting window alert in February"
    status: failed
    reason: "Same as ALRT-01 — REQUIREMENTS.md marks it complete but no alert delivery implementation exists. tax_harvesting_alerts column is scaffolded but no February trigger, email, or notification logic exists."
    artifacts:
      - path: "supabase/migrations/20260325000005_alert_preferences_scaffold.sql"
        issue: "Schema scaffolded with tax_harvesting_alerts column. No February trigger or email delivery implemented."
    missing:
      - "Vercel Cron job or scheduled function that fires in February"
      - "Tax harvesting opportunity summary logic"
      - "Email delivery for the February alert"
      - "Either implement V1 version or move ALRT-02 to v2 requirements and uncheck it in REQUIREMENTS.md"

human_verification:
  - test: "Goals page: create a goal and verify on-track/off-track badge correctness"
    expected: "Badge color matches projection — secondary-container (green) for On Track, error-container (red) for Off Track. Progress bar fills correctly. Projected corpus matches compound formula."
    why_human: "Badge color rendering and visual accuracy of the progress bar cannot be verified via grep."
  - test: "Allocation page: set a holder target >5% away from current, verify drift badge"
    expected: "error-container badge shows +N% Drift or -N% Drift text. On Track badge (secondary-container) when drift <= 5%."
    why_human: "Badge rendering and threshold behavior require live data and visual inspection."
  - test: "Zerodha Broker tab: connect via Kite OAuth and verify stock holdings appear"
    expected: "After OAuth redirect, stock holdings table renders with correct symbol, quantity, avg price, last price, P&L columns. Connection status shows 'Connected' badge."
    why_human: "Requires Kite API credentials (KITE_API_KEY, KITE_API_SECRET) and live Zerodha account to test the full OAuth flow."
  - test: "AI Rebalance Strategy card: click Generate, verify narrative appears and persists on reload"
    expected: "Loading spinner appears, narrative text shows after generation, 'Generated just now' label visible. After page reload, cached narrative still displays."
    why_human: "Requires AI model API key and live DB to test generation and caching."
---

# Phase 5: Goals, Alerts, and Broker Integration — Verification Report

**Phase Goal:** Goal tracking, allocation drift alerts, underperformance alerts, and Zerodha stock import — completing the engagement loop with goals projection engine, allocation drift badges, Kite Connect OAuth integration, and Goals page UI.
**Verified:** 2026-03-25T20:55:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | DB migrations for goals/broker_connections/stock_holdings/rebalance_strategies exist with RLS | VERIFIED | All 4 SQL files present; RLS policies follow correct three/two/one-hop chain patterns |
| 2 | kiteconnect package is installed | VERIFIED | `package.json` contains kiteconnect; 1 match confirmed |
| 3 | computeProjectedCorpus applies compound growth formula correctly | VERIFIED | 8/8 tests green; `computeProjectedCorpus(100000, 12, 5)` returns 176234.17 |
| 4 | computeGoalProjection returns correct isOnTrack/progressPct/fallback behavior | VERIFIED | 8/8 goals-engine tests pass; fallback to totalHolderAUM when currentLinkedValue=0 confirmed |
| 5 | mapKiteHoldingToStockRow correctly maps all fields including empty-isin-to-null | VERIFIED | 4/4 kite-holdings-mapper tests pass; isin='' converts to null confirmed |
| 6 | Family allocation page shows current vs target bars with drift badges | VERIFIED | `family-allocation-section.tsx` renders drift badge (error-container when abs(drift)>5, secondary-container On Track); allocation page wires FamilyAllocationSection |
| 7 | AI Rebalance Strategy card renders and calling POST /api/ai/rebalance-strategy caches result | VERIFIED | `generate-rebalance-button.tsx` POSTs to `/api/ai/rebalance-strategy`; `rebalance-service.ts` upserts into `rebalance_strategies` table; page reads cached strategy with `formatDistanceToNow` label |
| 8 | Zerodha OAuth callback exchanges token, upserts stock holdings and broker_connections | VERIFIED | `callback/route.ts` calls `exchangeKiteToken` + `fetchKiteHoldings` + `mapKiteHoldingToStockRow`, upserts `stock_holdings` then `broker_connections` with next-6AM-IST expiry logic |
| 9 | Import page shows Broker tab with Connected/Expired/Not Connected states | VERIFIED | `import/page.tsx` is a Server Component; fetches broker_connections, shows correct conditional state branches; `getKiteLoginURL` used for OAuth initiation |
| 10 | Goals page shows 3-col grid with GoalCard components; CreateGoalModal has all required fields | VERIFIED | `goals/page.tsx` calls `computeGoalProjection` per goal; 3-col grid renders GoalCards; CreateGoalModal has all 5 fields including holdings multi-select |
| 11 | POST /api/goals creates goal and goal_holdings records with Zod validation | VERIFIED | `app/api/goals/route.ts` validates with `CreateGoalSchema`, inserts into `goals`, bulk-inserts `goal_holdings`; returns 201 |
| 12 | ALLOC-03: User receives an alert when asset class drifts beyond threshold | FAILED | `user_alert_preferences` table scaffolded but no runtime alert delivery logic exists; drift is shown visually on-page only; REQUIREMENTS.md correctly marks ALLOC-03 as unchecked/Pending |
| 13 | ALRT-01: User receives email alert when fund underperforms benchmark for 6+ months | FAILED | Schema scaffolded only; no benchmark tracking, no 6-month rolling comparison, no email sending; REQUIREMENTS.md marks as complete but implementation deferred to V2 per plan 05-06 |
| 14 | ALRT-02: User receives February tax harvesting window alert | FAILED | Schema scaffolded only; no Vercel Cron, no February trigger, no email delivery; REQUIREMENTS.md marks as complete but deferred to V2 |

**Score:** 9/12 truths verified (11 automated checks pass; 3 gaps on alert delivery)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260325000001_goals.sql` | goals + goal_holdings tables with RLS | VERIFIED | Three-hop RLS chain; UNIQUE(goal_id, scheme_code) |
| `supabase/migrations/20260325000002_broker_connections.sql` | broker_connections with RLS | VERIFIED | Two-hop RLS; UNIQUE(holder_id, broker) |
| `supabase/migrations/20260325000003_stock_holdings.sql` | stock_holdings with RLS | VERIFIED | Two-hop RLS; UNIQUE(holder_id, tradingsymbol, exchange) |
| `supabase/migrations/20260325000004_rebalance_strategies.sql` | rebalance_strategies with RLS | VERIFIED | One-hop RLS; UNIQUE(family_id) |
| `supabase/migrations/20260325000005_alert_preferences_scaffold.sql` | user_alert_preferences scaffold | VERIFIED (schema only) | 7 columns; RLS scoped to auth.uid(); no runtime code uses it |
| `lib/analytics/goals-engine.ts` | computeProjectedCorpus + computeGoalProjection (real impl) | VERIFIED | Real compound growth formula; fractional years via differenceInCalendarDays/365 |
| `lib/broker/kite-holdings-mapper.ts` | mapKiteHoldingToStockRow (real impl) | VERIFIED | Full field mapping; isin '' → null |
| `lib/broker/kite-client.ts` | getKiteLoginURL, exchangeKiteToken, fetchKiteHoldings | VERIFIED | Thin wrappers over kiteconnect; server-side only |
| `tests/goals-engine.test.ts` | 8 tests all green | VERIFIED | 8/8 passing; no todos |
| `tests/kite-holdings-mapper.test.ts` | 4 tests all green | VERIFIED | 4/4 passing; no todos |
| `app/(dashboard)/families/[familyId]/allocation/page.tsx` | Allocation page with drift badges | VERIFIED | Fetches per-holder allocation, computes weighted family allocation, renders FamilyAllocationSection + AI card |
| `components/analytics/family-allocation-section.tsx` | Drift bars with error-container/secondary-container badges | VERIFIED | Strictly >5% threshold; dual-color bar fill (primary up to target, error for excess) |
| `components/ai/generate-rebalance-button.tsx` | Client island POSTing to /api/ai/rebalance-strategy | VERIFIED | `'use client'`; loading state with spinner; calls router.refresh() on success |
| `lib/ai/rebalance-service.ts` | generateRebalanceStrategy with DB caching | VERIFIED | Fetches holdings, computes weighted allocation, builds drift prompt, calls AI, upserts rebalance_strategies |
| `app/api/ai/rebalance-strategy/route.ts` | POST endpoint | VERIFIED | Zod UUID validation; getClaims() auth guard; calls generateRebalanceStrategy |
| `app/api/broker/zerodha/callback/route.ts` | OAuth callback with token exchange + upsert | VERIFIED | exchangeKiteToken + fetchKiteHoldings + mapKiteHoldingToStockRow; upserts stock_holdings + broker_connections; next-6AM-IST expiry |
| `app/api/broker/zerodha/refresh/route.ts` | Token refresh route | VERIFIED | Exists; re-uses stored token if not expired; redirects to Kite login if expired |
| `app/(dashboard)/families/[familyId]/import/page.tsx` | CAS + Broker tabs; connection status | VERIFIED | Server Component; CAS tab + Broker tab with Connected/Expired/Not Connected states; getKiteLoginURL used |
| `app/(dashboard)/families/[familyId]/goals/page.tsx` | Goals page with 3-col grid | VERIFIED | computeGoalProjection called per goal; 3-col responsive grid; empty state; CreateGoalModal trigger |
| `components/goals/goal-card.tsx` | GoalCard with projection data | VERIFIED | On Track (secondary-container) / Off Track (error-container) badges; progress bar; current + projected corpus; linked fund chips |
| `components/goals/create-goal-modal.tsx` | Modal with 5 fields + holdings multi-select | VERIFIED | Uncontrolled Dialog; all 5 fields; checkbox list from holdings prop; POSTs to /api/goals |
| `components/goals/fund-goal-linkage.tsx` | Visual connector strip | VERIFIED | Server Component; fund → goal connectors; empty state hint |
| `app/api/goals/route.ts` | POST /api/goals | VERIFIED | Zod CreateGoalSchema; holder ownership check; inserts goals + goal_holdings; returns 201 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `tests/goals-engine.test.ts` | `lib/analytics/goals-engine.ts` | `import { computeProjectedCorpus, computeGoalProjection }` | WIRED | Uncommented import; 8 tests call real functions |
| `tests/kite-holdings-mapper.test.ts` | `lib/broker/kite-holdings-mapper.ts` | `import { mapKiteHoldingToStockRow }` | WIRED | 4 tests call real implementation |
| `app/(dashboard)/families/[familyId]/allocation/page.tsx` | `components/analytics/family-allocation-section.tsx` | `import { FamilyAllocationSection }` | WIRED | Component rendered with computed props |
| `components/ai/generate-rebalance-button.tsx` | `app/api/ai/rebalance-strategy/route.ts` | `fetch('/api/ai/rebalance-strategy', { method: 'POST' })` | WIRED | Correct path; JSON body with familyId |
| `lib/ai/rebalance-service.ts` | `rebalance_strategies` table | `supabase.from('rebalance_strategies').upsert(...)` | WIRED | onConflict: 'family_id'; upsert semantics |
| `app/(dashboard)/families/[familyId]/allocation/page.tsx` | `rebalance_strategies` table | `supabase.from('rebalance_strategies').select(...).maybeSingle()` | WIRED | Cached strategy read for "Generated X ago" label |
| `app/api/broker/zerodha/callback/route.ts` | `lib/broker/kite-client.ts` | `import { exchangeKiteToken, fetchKiteHoldings }` | WIRED | Both functions called in sequence |
| `app/api/broker/zerodha/callback/route.ts` | `stock_holdings` table | `supabase.from('stock_holdings').upsert(rows, { onConflict: ... })` | WIRED | Mapped rows upserted |
| `app/(dashboard)/families/[familyId]/import/page.tsx` | `broker_connections` table | `supabase.from('broker_connections').select(...)` | WIRED | Connection status logic reads table |
| `app/(dashboard)/families/[familyId]/import/page.tsx` | `lib/broker/kite-client.ts` | `import { getKiteLoginURL }` | WIRED | Used for Connect and Re-authorise links |
| `app/(dashboard)/families/[familyId]/goals/page.tsx` | `lib/analytics/goals-engine.ts` | `import { computeGoalProjection }` | WIRED | Called per goal with linkedValue + totalAUM |
| `components/goals/goal-card.tsx` | `lib/analytics/goals-engine.ts` | `import type { GoalProjection }` | WIRED | Type imported; projection prop destructured |
| `components/goals/create-goal-modal.tsx` | `app/api/goals/route.ts` | `fetch('/api/goals', { method: 'POST' })` | WIRED | Body matches CreateGoalSchema |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| GOAL-01 | 05-02, 05-05 | User can create a financial goal with name, target amount, target date | SATISFIED | CreateGoalModal with all fields; POST /api/goals inserts to goals table |
| GOAL-02 | 05-02, 05-05 | User can link specific holdings to a goal | SATISFIED | Holdings multi-select in modal; goal_holdings table; FundGoalLinkage strip |
| GOAL-03 | 05-02, 05-05 | User can see projected corpus vs target with on-track/off-track status | SATISFIED | GoalCard renders projectedCorpus + isOnTrack badge; computeGoalProjection tested |
| ALLOC-03 | 05-03 | User receives an alert when asset class drifts beyond threshold | BLOCKED | Drift badges on allocation page are UI visualization, not alert delivery. `user_alert_preferences` table exists but has no runtime consumer. REQUIREMENTS.md correctly marks this as unchecked/Pending. |
| ALRT-01 | 05-06 | User receives email alert when fund underperforms benchmark for 6+ months | BLOCKED | Schema scaffolded only. No benchmark tracking, 6-month comparison, or email delivery implemented. Plan 05-06 explicitly deferred to V2. REQUIREMENTS.md marks as complete — this is a documentation error. |
| ALRT-02 | 05-06 | User receives February tax harvesting window alert | BLOCKED | Schema scaffolded only. No Vercel Cron, February trigger, or email delivery. Deferred to V2 per plan 05-06. REQUIREMENTS.md marks as complete — this is a documentation error. |
| DATA-03 | 05-04 | User can connect Zerodha via Kite Connect to import stock holdings | SATISFIED | Full OAuth flow: callback route exchanges token, fetches holdings, upserts to stock_holdings. Import page shows connection status. REQUIREMENTS.md marks as complete. |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `components/goals/create-goal-modal.tsx` | 133, 150 | `placeholder="..."` HTML attributes | Info | Benign — input field placeholder text, not stub code |

No stub implementations, no TODO/FIXME blockers, no empty return values found across any phase 5 files.

---

## Human Verification Required

### 1. Goal On-Track/Off-Track Badge Rendering

**Test:** Create a goal with target ₹10,00,000, target date 5 years out, CAGR 12%, with ₹1,00,000 linked holdings. Then create a goal where the projected corpus will be less than the target.
**Expected:** First goal shows "On Track" badge in secondary-container (green). Second shows "Off Track" badge in error-container (red). Progress bar fills proportionally.
**Why human:** Badge color rendering and visual correctness require live browser inspection.

### 2. Allocation Drift Badge Threshold Accuracy

**Test:** Set a holder target allocation with equity at 60%, then import holdings where actual equity is 50% (10% below target). Navigate to /families/[familyId]/allocation.
**Expected:** Equity row shows error-container badge with "-10.0% Drift". Other rows within 5% threshold show "On Track" in secondary-container.
**Why human:** Requires live data with a known divergence and visual confirmation of badge styling.

### 3. Zerodha OAuth Full Flow

**Test:** With KITE_API_KEY and KITE_API_SECRET set in env, navigate to /families/[familyId]/import?tab=broker, click "Connect via Kite", complete Zerodha authorization.
**Expected:** Redirected back with `?success=true`, stock holdings appear in table, "Connected" badge visible with last sync time.
**Why human:** Requires real Kite API credentials and a Zerodha account. Cannot test the OAuth exchange without live environment.

### 4. AI Rebalance Strategy Generation and Cache Persistence

**Test:** Navigate to /families/[familyId]/allocation, click "Generate Rebalance Strategy". After generation, reload the page.
**Expected:** Loading spinner → strategy text appears → "Generated just now" label. After reload: strategy still visible with updated "Generated X minutes ago" label.
**Why human:** Requires live AI API key (ANTHROPIC_API_KEY or equivalent) and Supabase connection.

---

## Gaps Summary

Three requirements are blocked. The root cause splits into two categories:

**Category 1 — Scope interpretation gap (ALLOC-03):**
Plan 05-03 claimed ALLOC-03 by interpreting "receives an alert" as "sees a drift badge on the allocation page." The requirement text specifies alert delivery to the user — not visualization on a page the user must navigate to. REQUIREMENTS.md correctly disagrees with the plan's self-assessment and marks ALLOC-03 as Pending. The allocation page drift visualization satisfies ALLOC-02's spirit but not ALLOC-03.

**Category 2 — Intentional V2 deferral (ALRT-01, ALRT-02):**
Plan 05-06 knowingly deferred email delivery to V2, scaffolded only the DB table, and then marked ALRT-01 and ALRT-02 as `requirements-completed` in the summary. REQUIREMENTS.md has conflicting signals — the checkboxes for ALRT-01/ALRT-02 are checked (marking them complete) but ALLOC-03 remains unchecked. The facts: no email sending code, no benchmark tracking, no Vercel Cron, no February trigger exists anywhere in the codebase for either ALRT-01 or ALRT-02.

**Resolution path:**
- For ALRT-01 and ALRT-02: Either (a) accept that Phase 5 delivers only schema scaffolding and move these to v2 requirements with unchecked status in REQUIREMENTS.md, or (b) implement V1 email delivery using Resend + Vercel Cron.
- For ALLOC-03: The foundation is in place (drift is computed and displayed). Delivering ALLOC-03 requires adding an alert mechanism — either in-app notification when the user logs in or email via Resend.

The 9 other must-haves (goals engine, Zerodha integration, allocation drift visualization, goals UI, goals API) are all fully implemented, tested, and wired correctly. TypeScript compiles clean. 12 tests pass.

---

_Verified: 2026-03-25T20:55:00Z_
_Verifier: Claude (gsd-verifier)_

# Phase 5: Goals, Alerts and Broker Integration - Research

**Researched:** 2026-03-25
**Domain:** Goal-based investing, family allocation, Zerodha Kite Connect OAuth, AI rebalance generation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Goals — Scope and Data Model**
- Goals are per-holder — each goal belongs to a specific holder, not family-wide
- Goal fields: name, target corpus amount (₹), target date, linked holdings (optional multi-select from holder's current holdings)
- Goal creation via modal dialog — same Dialog component pattern as SetTargetModal (Phase 2) and sell tax estimator (Phase 3)
- No separate "new goal" page — the 3-col goals grid lives at `/families/[familyId]/goals` with an "Add Goal" button that opens the modal

**Goals — Projection & On-Track Logic**
- Projected corpus uses user-inputted expected CAGR (e.g., 12%) — asked during goal creation
- Formula: `current_linked_value × (1 + r/100)^years_to_target`
- On-track: projected corpus ≥ target amount
- Off-track: projected corpus < target amount
- Status badges: "On Track" in `secondary-container`, "Off Track" in `error-container`

**Goals — Fund-Goal Visual Linkage**
- User picks specific holdings from a dropdown when creating/editing a goal (multi-select from holder's current holdings list)
- The "Fund-Goal Visual Linkage" connector row shows which funds are dedicated to which goal
- Holdings linkage is optional — user can set a goal amount/date without linking funds; projection then uses total holder AUM

**Asset Allocation Page (family-level)**
- `/families/[familyId]/allocation` shows family-level combined allocation (all holders' holdings aggregated)
- Displays "Current vs Target" allocation bars with drift badges
- Drift badge threshold: > 5% deviation from target shows orange/error badge; ≤ 5% shows green "On Track" badge
- The per-holder AllocationSection component on the holder analytics page remains unchanged
- Family-level targets: a separate `family_allocation_targets` table (or aggregate of holder targets) — researcher to decide optimal approach

**AI Rebalance Strategy Card (Allocation page)**
- AI-generated via Claude — same on-demand pattern as Phase 4 quarterly review
- User clicks "Generate Rebalance Strategy" button
- Claude receives: current family allocation %, targets %, drift by asset class, top holdings → generates a rebalancing narrative with specific suggestions
- Result cached in DB (similar to `portfolio_narratives`) with "Generated X days ago" badge
- Glassmorphism card style: `background: rgba(255,255,255,0.4); backdrop-filter: blur(20px); border: 1px solid rgba(0,109,67,0.1)`

**Zerodha Kite Connect — Entry Point**
- "Connect Zerodha" entry point lives on the import page — a new "Broker" tab alongside the existing CAS import tab at `/families/[familyId]/import`
- Tab shows Zerodha logo, description, and a "Connect via Kite" button that initiates the OAuth flow

**Zerodha Kite Connect — OAuth Flow**
- OAuth flow: user clicks → redirects to Kite OAuth → after authorization, Kite redirects to `/api/broker/zerodha/callback`
- Callback handler: exchanges code for access token, fetches holdings from Kite API, imports stocks into the holdings table, redirects user back to import page with success message
- No persistent access token storage — each "Refresh" requires re-authorization (or store token with TTL; researcher to evaluate Kite token lifecycle)

**Zerodha — Stock Display**
- Imported Zerodha stocks appear merged into the holder's existing holdings table (same table as mutual funds)
- `asset_type` column distinguishes `'mf'` vs `'stock'`
- Unified view: stocks and mutual funds appear together in the holdings table with an asset type indicator
- Stock holdings include: symbol, exchange, quantity, average cost price, current price (fetched from Kite or a stock price API)

**Zerodha — Ongoing Sync**
- Manual "Refresh Zerodha" button only — no automated daily sync in V1
- Button appears on the import page (Broker tab) when Zerodha is connected
- No background cron jobs for stock sync in Phase 5

**Email Alerts — Deferred to V2**
- ALRT-01 (fund underperformance 6-month alert) and ALRT-02 (asset drift + tax harvesting window alert) are deferred to V2
- DB schema for alert preferences (`user_alert_preferences` table) and alert state tracking can be scaffolded if needed by other logic, but no email delivery pipeline built in Phase 5
- When V2 implements alerts: use Resend as the email service, Vercel Cron as the trigger mechanism, HTML branded emails (React Email or similar), with all alert types on by default and user-configurable opt-out

### Claude's Discretion
- Exact DB schema for goals table (field names, types, constraints)
- Whether family-level allocation targets are a separate table or aggregated from holder targets
- Kite Connect access token storage strategy (session-only vs short-TTL DB storage)
- Exact loading/skeleton states for AI Rebalance Strategy generation
- How to handle goals with no linked holdings (fallback to total holder AUM or show warning)
- Stock price data source for Zerodha holdings current value (Kite API or NSE/BSE feed)

### Deferred Ideas (OUT OF SCOPE)
- ALRT-01 & ALRT-02: Email alerts — fund underperformance (6-month) and asset drift/tax harvesting alerts deferred to V2
- Family-wide goals — goals that span all holders' combined AUM. V2.
- Automated daily Zerodha sync — cron-based stock holdings refresh. V2.
- ITR Schedule CG export — already deferred from Phase 3; still V2.
- Groww/MFCentral broker integration — Zerodha only in Phase 5; other brokers in V2.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GOAL-01 | User can create a financial goal with a name, target amount (₹), and target date | Goals DB schema, CreateGoalModal dialog pattern, ZOD validation |
| GOAL-02 | User can link specific holdings to a goal so the platform tracks progress toward it | `goal_holdings` junction table, multi-select UI, AllocationSection reuse |
| GOAL-03 | User can see projected corpus vs target amount for each goal, with on-track / off-track status | Pure TS projection engine: `current_linked_value × (1 + r/100)^years`, badge patterns |
| ALLOC-03 | User receives an alert when any asset class drifts beyond a user-defined threshold from target | Family allocation page drift computation, > 5% badge threshold, `family_allocation_targets` table |
| ALRT-01 | User receives an alert (email) when any held fund underperforms its benchmark category average for 6+ consecutive months | DEFERRED — scaffold DB schema only |
| ALRT-02 | User receives a tax harvesting window alert in February | DEFERRED — scaffold DB schema only |
| DATA-03 | User can connect a Zerodha account via Kite Connect API to import stock holdings | Kite OAuth, `kiteconnect` npm package, holdings endpoint, `asset_type` column on holdings |
</phase_requirements>

---

## Summary

Phase 5 adds three distinct feature pillars: goal-based portfolio tracking (GOAL-01/02/03), a fully redesigned family allocation page with drift alerts (ALLOC-03), and Zerodha broker import (DATA-03). Email alerts (ALRT-01/02) are deferred to V2 — only DB scaffolding is needed.

The goals engine is pure TypeScript arithmetic — no external library needed for the CAGR projection formula. The modal dialog and badge patterns are fully established by Phase 2/3 components. The DB design requires two new tables (`goals`, `goal_holdings`) with RLS chains matching the existing hierarchy pattern.

For Zerodha integration, the official `kiteconnect` npm package (v5.1.0, July 2025) provides a typed JS client. The critical constraint: access tokens expire daily at 6 AM IST (regulatory requirement — manual login cannot be automated). This means V1 must require re-authorization on each "Refresh" click rather than silently re-using a cached token. A `broker_connections` table with `token_expires_at` allows the UI to show whether the connection is live or stale. The Kite `/portfolio/holdings` endpoint returns `tradingsymbol`, `exchange`, `quantity`, `average_price`, `last_price`, `pnl`, and `isin` — all fields needed for a unified stock+MF holdings view.

**Primary recommendation:** Build goals as pure-TypeScript engine with two new DB tables; use `kiteconnect` npm package for Zerodha with session-scoped token stored in `broker_connections` table; reuse Phase 4 AI narrative pattern for Rebalance Strategy; aggregate `holder_allocation_targets` for family-level targets (no new table needed in V1).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `kiteconnect` | 5.1.0 | Official Zerodha Kite Connect JS/TS client | Official Zerodha package; typed; NodeJS v18+ compatible; MIT license |
| `zod` | ^3.25 (already installed) | Schema validation for goals input, Kite callback | Project standard for all external data boundaries |
| Supabase Postgres | existing | `goals`, `goal_holdings`, `broker_connections`, `rebalance_strategies` tables | Project database — all new tables follow established RLS chain pattern |
| Anthropic SDK via `ai` | ^6.0.137 (already installed) | AI Rebalance Strategy generation | Same SDK as Phase 4 narrative + chat |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | ^4.1.0 (already installed) | Years-to-target computation for CAGR projection | Use `differenceInYears` for goal time calculations |
| Next.js Route Handlers | 15.5.13 (already installed) | `/api/broker/zerodha/callback`, `/api/broker/zerodha/refresh`, `/api/ai/rebalance-strategy` | Server-side token exchange and AI generation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `kiteconnect` (official) | `kiteconnect-ts` (unofficial) | Official package is MIT licensed, maintained by Zerodha; unofficial has better TypeScript types but adds third-party risk |
| Aggregate `holder_allocation_targets` for family targets | New `family_allocation_targets` table | Aggregating holder targets avoids new table and migration; downside is no independent family-level override |
| Session-only token (no DB) | `broker_connections` DB table | DB table enables "is connected" status display and `token_expires_at` check without re-auth on every page load |

**Installation:**
```bash
npm install kiteconnect
```

---

## Architecture Patterns

### Recommended Project Structure
```
app/(dashboard)/families/[familyId]/
├── goals/
│   └── page.tsx               # Server Component: fetches goals + holdings
├── allocation/
│   └── page.tsx               # REPLACE: family-level allocation, targets, AI rebalance
import/
│   └── page.tsx               # ADD Broker tab (tabs UI, Zerodha OAuth initiation)

app/api/
├── broker/zerodha/
│   ├── callback/route.ts      # OAuth callback: code → token → holdings import
│   └── refresh/route.ts       # Manual re-sync: re-auth redirect
├── ai/
│   └── rebalance-strategy/route.ts  # POST → generate + cache rebalance narrative

lib/
├── analytics/
│   └── goals-engine.ts        # computeProjectedCorpus(), isOnTrack()
├── broker/
│   └── kite-client.ts         # KiteConnect wrapper, getHoldings(), mapToHoldingRow()
│   └── kite-holdings-mapper.ts # Maps Kite holding → unified HoldingRow with asset_type='stock'
├── ai/
│   └── rebalance-service.ts   # buildRebalancePrompt(), generateRebalanceStrategy()

supabase/migrations/
├── 20260325000001_goals.sql           # goals + goal_holdings tables + RLS
├── 20260325000002_broker_connections.sql  # broker_connections table + RLS
├── 20260325000003_holdings_asset_type.sql # ALTER holdings ADD asset_type, broker_source
├── 20260325000004_rebalance_strategies.sql # rebalance_strategies table + RLS

tests/
├── goals-engine.test.ts       # Unit: computeProjectedCorpus, isOnTrack
├── kite-holdings-mapper.test.ts  # Unit: Kite holding → HoldingRow mapping
```

### Pattern 1: Goals Projection Engine (Pure TypeScript)
**What:** Stateless function computing projected corpus and on-track status
**When to use:** Called in Server Component on goals page render; no side effects

```typescript
// lib/analytics/goals-engine.ts
// Source: CONTEXT.md locked formula

export interface GoalProjection {
  projectedCorpus: number
  currentLinkedValue: number
  progressPct: number
  isOnTrack: boolean
  yearsToTarget: number
}

export function computeProjectedCorpus(
  currentLinkedValue: number,  // sum of current_value for linked holdings (0 if none → use totalAUM)
  assumedCagrPct: number,      // e.g. 12 for 12%
  yearsToTarget: number        // fractional years from today to target_date
): number {
  if (yearsToTarget <= 0) return currentLinkedValue
  return currentLinkedValue * Math.pow(1 + assumedCagrPct / 100, yearsToTarget)
}

export function computeGoalProjection(
  goal: { target_amount: number; assumed_cagr: number; target_date: string },
  currentLinkedValue: number
): GoalProjection {
  const years = differenceInYears(new Date(goal.target_date), new Date())
  const projected = computeProjectedCorpus(currentLinkedValue, goal.assumed_cagr, years)
  return {
    projectedCorpus: projected,
    currentLinkedValue,
    progressPct: Math.min((currentLinkedValue / goal.target_amount) * 100, 100),
    isOnTrack: projected >= goal.target_amount,
    yearsToTarget: years,
  }
}
```

### Pattern 2: Kite OAuth Flow (Next.js Route Handler)
**What:** Three-step Kite Connect OAuth with server-side token exchange
**When to use:** `/api/broker/zerodha/callback` route handler

```typescript
// app/api/broker/zerodha/callback/route.ts
// Source: https://github.com/zerodha/kiteconnectjs + CONTEXT.md

import { KiteConnect } from 'kiteconnect'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const requestToken = searchParams.get('request_token')
  const familyId = searchParams.get('state')  // pass familyId via OAuth state param

  const kc = new KiteConnect({ api_key: process.env.KITE_API_KEY! })
  const session = await kc.generateSession(requestToken!, process.env.KITE_API_SECRET!)
  kc.setAccessToken(session.access_token)

  // Fetch holdings from Kite
  const kiteHoldings = await kc.getHoldings()

  // Map and upsert into holdings table
  // ... (see kite-holdings-mapper.ts)

  // Store connection metadata + token for status display
  const tokenExpiresAt = new Date()
  tokenExpiresAt.setHours(6, 0, 0, 0)
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 1)  // next day 6 AM IST

  // Redirect back to import page
  return NextResponse.redirect(`/families/${familyId}/import?tab=broker&success=true`)
}
```

### Pattern 3: AI Rebalance Strategy (On-Demand with DB Cache)
**What:** Exactly mirrors Phase 4 `generateNarrativeForHolder` → `portfolio_narratives` pattern
**When to use:** Family allocation page with "Generate Rebalance Strategy" button

```typescript
// lib/ai/rebalance-service.ts
// Pattern: same as lib/ai/narrative-service.ts from Phase 4

export async function generateRebalanceStrategy(
  familyId: string,
  supabase: SupabaseClient
): Promise<{ strategy: string }> {
  // 1. Fetch family allocation current % and targets %
  // 2. Build prompt with drift data and top holdings
  // 3. Call generateText() from ai SDK
  // 4. Upsert into rebalance_strategies table
  return { strategy }
}
```

Client island (identical to `GenerateReviewButton`):
```typescript
// components/analytics/generate-rebalance-button.tsx — 'use client'
// POST to /api/ai/rebalance-strategy, then router.refresh()
```

### Pattern 4: Family Allocation Targets (Aggregated from Holder Targets)
**What:** For V1, family allocation target = weighted average of all holder targets by AUM
**When to use:** Family allocation page drift computation (no new table needed in V1)
**Recommendation:** Aggregate `holder_allocation_targets` rows; if no holder has targets set, show "Set Target" prompt

```typescript
// No separate family_allocation_targets table in V1
// Family target = weighted average of holder targets by holder AUM
function computeFamilyTargets(
  holders: Array<{ targets: AllocationTargets; aum: number }>
): AllocationTargets {
  const totalAUM = holders.reduce((s, h) => s + h.aum, 0)
  if (totalAUM === 0) return { equity: 0, debt: 0, gold: 0, international: 0 }
  return {
    equity: holders.reduce((s, h) => s + h.targets.equity * h.aum, 0) / totalAUM,
    // ...etc
  }
}
```

### Anti-Patterns to Avoid
- **Storing Kite access tokens in client-side state:** Token must only exist server-side (env + Supabase server client) — never pass to browser
- **Automating Kite re-login:** Regulatory requirement prohibits it; always prompt user for re-auth after token expires
- **Computing goal projection in SQL:** Same reason as XIRR — iterative math, stay in TypeScript
- **Separate family_allocation_targets table in V1:** Premature; weighted average from `holder_allocation_targets` is sufficient and avoids a migration
- **Using `'use client'` on the goals page:** Goals data fetching and projection are pure server-side operations; only the CreateGoalModal is a client island

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zerodha OAuth exchange | Custom fetch to Kite token endpoint | `kiteconnect` npm package `generateSession()` | Handles checksum (SHA-256 of api_key+request_token+api_secret), error codes, typed response |
| Kite holdings fetch | Custom fetch to `/portfolio/holdings` | `kc.getHoldings()` | Handles auth header, response parsing, typed `KiteHolding[]` |
| Years-to-target calculation | Manual date math | `date-fns` `differenceInYears()` (already installed) | Handles leap years, month boundaries correctly |
| Supabase upsert for rebalance cache | INSERT + UPDATE logic | `.upsert({ ... }, { onConflict: 'family_id' })` | Same pattern as `portfolio_narratives` in Phase 4 |
| Goal dialog form validation | Custom validation | `zod` + `react-hook-form` (both installed) | Project standard; same pattern as SetTargetModal |

**Key insight:** The Kite OAuth flow has a cryptographic checksum step that is easy to get wrong manually. The official `kiteconnect` package handles it correctly.

---

## Common Pitfalls

### Pitfall 1: Kite Access Token Daily Expiry
**What goes wrong:** Token stored in DB is used the next day after 6 AM IST and returns 403. If the callback handler stores the token without an expiry timestamp, the UI has no way to tell the user to re-authorize.
**Why it happens:** Zerodha regulatory requirement — tokens expire at 6 AM daily; no automated re-login is possible.
**How to avoid:** Store `token_expires_at` in `broker_connections` table; on "Refresh Zerodha" click, check if token is expired before attempting API call. If expired, redirect to Kite OAuth instead of calling API directly.
**Warning signs:** HTTP 403 with `"TokenException"` error code from Kite API.

### Pitfall 2: Kite Holdings vs Positions
**What goes wrong:** Using `/portfolio/positions` instead of `/portfolio/holdings` and getting only intraday/short-term positions.
**Why it happens:** Kite has both `/portfolio/positions` (intraday + short-term) and `/portfolio/holdings` (long-term DEMAT stocks). For a wealth management app, only holdings matter.
**How to avoid:** Always use `kc.getHoldings()` — maps to `/portfolio/holdings`. Log a note in kite-client.ts.

### Pitfall 3: Goals with No Linked Holdings — Fallback Ambiguity
**What goes wrong:** If a goal has no linked holdings, `currentLinkedValue = 0`, which makes projection trivially 0 and always "Off Track".
**Why it happens:** Optional holdings linkage with no fallback logic.
**How to avoid:** When `goal_holdings` is empty for a goal, fall back to total holder AUM. Show a subtle indicator ("Using total portfolio as proxy"). Expose this logic as a config flag in `computeGoalProjection`.

### Pitfall 4: Family Allocation Drift Badge at Exactly 5%
**What goes wrong:** Off-by-one in drift threshold (> 5 vs >= 5) causes inconsistent badge display.
**Why it happens:** Context says "> 5% deviation" shows drift badge. Strictly greater-than is the rule.
**How to avoid:** `Math.abs(current - target) > 5` — strictly greater, consistent with CONTEXT.md.

### Pitfall 5: Holdings Table Schema Change Breaking Existing Queries
**What goes wrong:** Adding `asset_type` and `broker_source` columns to the `holdings` view/table without defaults causes existing queries to break if they use `SELECT *` or expect specific column order.
**Why it happens:** The existing `get_holder_holdings` Postgres function selects specific columns. Adding columns to the base table doesn't break the function, but `HoldingRow` TypeScript interface needs updating.
**How to avoid:** Add columns with `DEFAULT 'mf'` for `asset_type` and `DEFAULT 'cas'` for `broker_source` — existing CAS-imported holdings get correct defaults automatically. Update `HoldingRow` and `HoldingRowWithAnalytics` in `types.ts`.

### Pitfall 6: Goal Holdings Junction Table and RLS
**What goes wrong:** `goal_holdings` needs RLS but it doesn't directly reference `families.user_id` — it chains through `goals → holders → families`.
**Why it happens:** The RLS subquery must traverse: `goal_holdings.goal_id → goals.holder_id → holders.family_id → families.user_id`.
**How to avoid:** Use established three-hop subquery pattern from Phase 1. Never denormalize `user_id` onto child tables.

---

## Code Examples

Verified patterns from official sources:

### Kite Connect OAuth Initiation (login URL)
```typescript
// Source: https://github.com/zerodha/kiteconnectjs
import { KiteConnect } from 'kiteconnect'

const kc = new KiteConnect({ api_key: process.env.KITE_API_KEY! })

// Redirect user to this URL — append &state=familyId for post-auth redirect
const loginUrl = kc.getLoginURL()
// https://kite.zerodha.com/connect/login?api_key=xxx&v=3
```

### Kite Connect Token Exchange + Holdings Fetch
```typescript
// Source: https://github.com/zerodha/kiteconnectjs
const session = await kc.generateSession(requestToken, process.env.KITE_API_SECRET!)
// session.access_token, session.user_id, session.login_time, session.email

kc.setAccessToken(session.access_token)
const holdings = await kc.getHoldings()
// holdings[].tradingsymbol, .exchange, .quantity, .average_price, .last_price, .pnl, .isin
```

### Goal Projection Formula
```typescript
// Source: CONTEXT.md locked decision
// Pure TypeScript — no library needed
import { differenceInYears } from 'date-fns'

const years = differenceInYears(new Date(goal.target_date), new Date())
const projected = currentLinkedValue * Math.pow(1 + assumedCagrPct / 100, years)
const isOnTrack = projected >= goal.target_amount
```

### DB Schema — Goals Tables (recommended)
```sql
-- Source: Researcher recommendation following Phase 1/2 patterns

CREATE TABLE goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id       UUID NOT NULL REFERENCES holders(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  target_amount   NUMERIC(16, 2) NOT NULL CHECK (target_amount > 0),
  target_date     DATE NOT NULL,
  assumed_cagr    NUMERIC(5, 2) NOT NULL DEFAULT 12
                  CHECK (assumed_cagr >= 0 AND assumed_cagr <= 50),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE goal_holdings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id         UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  scheme_code     INTEGER NOT NULL REFERENCES funds(scheme_code),
  UNIQUE (goal_id, scheme_code)
);
```

### DB Schema — Broker Connections
```sql
-- One row per holder-broker pair. Stores token for status display (not for silent reuse).
CREATE TABLE broker_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id       UUID NOT NULL REFERENCES holders(id) ON DELETE CASCADE,
  broker          TEXT NOT NULL CHECK (broker IN ('zerodha')),
  zerodha_user_id TEXT,
  access_token    TEXT,                  -- short-lived; NULL after expiry
  token_expires_at TIMESTAMPTZ,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (holder_id, broker)
);
```

### DB Schema — Holdings Table Additions
```sql
-- ALTER existing holdings or the RPC output type
-- Add asset_type and broker_source with safe defaults
ALTER TABLE holdings
  ADD COLUMN IF NOT EXISTS asset_type    TEXT NOT NULL DEFAULT 'mf'
    CHECK (asset_type IN ('mf', 'stock')),
  ADD COLUMN IF NOT EXISTS broker_source TEXT NOT NULL DEFAULT 'cas'
    CHECK (broker_source IN ('cas', 'manual', 'zerodha'));
```

Note: The `holdings` view is actually implemented as a Postgres function `get_holder_holdings`. The `asset_type` and `broker_source` columns need to be added to the underlying `folios` or a new `stock_holdings` table. Researcher recommendation: add a separate `stock_holdings` table for Zerodha stocks to avoid disrupting the existing folios/transactions schema. See Open Questions.

### RLS Pattern for Goal Holdings
```sql
-- Three-hop subquery: goal_holdings → goals → holders → families
CREATE POLICY "goal_holdings_select" ON goal_holdings
  FOR SELECT USING (
    goal_id IN (
      SELECT id FROM goals WHERE holder_id IN (
        SELECT id FROM holders WHERE family_id IN (
          SELECT id FROM families WHERE user_id = auth.uid()
        )
      )
    )
  );
```

### Drift Badge Logic (ALLOC-03)
```typescript
// Source: CONTEXT.md — > 5% threshold confirmed
const drift = current - target
const showDriftBadge = Math.abs(drift) > 5

// Badge classes:
// On Track: bg-secondary-container text-on-secondary-container
// Drift:    bg-error-container text-on-error-container
// Text:     drift > 0 ? `+${drift.toFixed(1)}% Drift` : `${drift.toFixed(1)}% Drift`
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Kite Connect v1/v2 JS client | `kiteconnect` v5.1.0 (official) | July 2025 | Typed, supports NodeJS v18+, ESM compatible |
| Separate family allocation table | Aggregate holder targets (weighted by AUM) | Phase 5 design | Simpler schema, no migration for family-level target setting |

**Deprecated/outdated:**
- `kiteconnect-ts` (unofficial): Not needed; official v5.1.0 has adequate TypeScript support
- Direct fetch to Kite REST endpoints: Use `kiteconnect` npm package instead

---

## Open Questions

1. **Holdings Table: ALTER vs Separate `stock_holdings` Table**
   - What we know: Existing `holdings` is presented via Postgres RPC `get_holder_holdings` which joins `folios + transactions + nav_prices`. Stocks have no NAV history — they use `last_price` from Kite.
   - What's unclear: Adding `asset_type` to folios is possible but folios are MF-specific (folio numbers don't exist for stocks). Stocks from Zerodha don't have folios.
   - Recommendation: Create a separate `stock_holdings` table (holding symbol, exchange, quantity, avg_price, last_price, broker_source='zerodha', holder_id). The `get_holder_holdings` RPC can UNION this table's output. This cleanly separates MF and stock schema without retrofitting folio concepts onto stocks.

2. **Kite Access Token — Session Cookie vs DB Storage**
   - What we know: Token expires daily at 6 AM. Manual re-auth is required each day.
   - What's unclear: Whether to store the token in `broker_connections` DB table (visible to all server routes) or only in an encrypted session cookie (lost on browser close).
   - Recommendation: Store in `broker_connections` table with `token_expires_at`. Reasons: (a) The "Refresh Zerodha" button on import page needs to know if token is valid without requiring the user to re-auth just to see status. (b) If user has multiple tabs/devices, DB is the source of truth. The token value is short-lived (< 24h) and scope is holdings-only read access.

3. **Stock Current Price After Initial Import**
   - What we know: `last_price` from Kite is provided at import time. Subsequent page loads won't auto-refresh this.
   - What's unclear: How to show current stock value on the goals/holdings page after initial import without a live API call.
   - Recommendation: Store `last_price` at import time in `stock_holdings.last_price`. When user clicks "Refresh Zerodha", re-fetch all holdings with fresh prices. Display a "prices as of [last_synced_at]" label. This matches the V1 "manual refresh only" decision.

---

## Validation Architecture

nyquist_validation is enabled in `.planning/config.json`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.mts` (project root) |
| Quick run command | `npx vitest run tests/goals-engine.test.ts tests/kite-holdings-mapper.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GOAL-01 | Goal creation validates required fields (name, target_amount > 0, target_date in future) | unit | `npx vitest run tests/goals-engine.test.ts` | ❌ Wave 0 |
| GOAL-02 | goal_holdings links holdings to goal; computeGoalProjection uses linked value when holdings exist | unit | `npx vitest run tests/goals-engine.test.ts` | ❌ Wave 0 |
| GOAL-03 | computeProjectedCorpus returns correct compound growth; isOnTrack true when projected >= target | unit | `npx vitest run tests/goals-engine.test.ts` | ❌ Wave 0 |
| GOAL-03 | Fallback to totalHolderAUM when no linked holdings | unit | `npx vitest run tests/goals-engine.test.ts` | ❌ Wave 0 |
| ALLOC-03 | Drift badge shows when abs(current - target) > 5% | unit | `npx vitest run tests/allocation.test.ts` | ✅ (extend) |
| DATA-03 | Kite holding mapped to unified HoldingRow shape correctly | unit | `npx vitest run tests/kite-holdings-mapper.test.ts` | ❌ Wave 0 |
| DATA-03 | OAuth callback with missing request_token returns 400 | unit | `npx vitest run tests/kite-holdings-mapper.test.ts` | ❌ Wave 0 |
| ALRT-01/02 | Schema migration creates user_alert_preferences table | manual | Supabase studio verify | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/goals-engine.test.ts tests/kite-holdings-mapper.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/goals-engine.test.ts` — covers GOAL-01, GOAL-02, GOAL-03 (computeProjectedCorpus, computeGoalProjection, fallback)
- [ ] `tests/kite-holdings-mapper.test.ts` — covers DATA-03 (Kite holding → stock_holdings mapping)
- [ ] `lib/analytics/goals-engine.ts` — stub file (throw `Not implemented`) so import resolves

*(No new framework install needed — Vitest already configured)*

---

## Sources

### Primary (HIGH confidence)
- [zerodha/kiteconnectjs GitHub](https://github.com/zerodha/kiteconnectjs) — package name, version 5.1.0, OAuth flow code examples, `getHoldings()` method
- [Kite Connect v3 Portfolio docs](https://kite.trade/docs/connect/v3/portfolio/) — `/portfolio/holdings` endpoint, data fields (tradingsymbol, exchange, quantity, average_price, last_price, pnl, isin)
- [Kite Connect v3 User docs](https://kite.trade/docs/connect/v3/user/) — OAuth three-step flow (login URL → request_token → generateSession → access_token)
- Project codebase — `components/analytics/allocation-section.tsx`, `lib/ai/narrative-service.ts`, `components/ai/generate-review-button.tsx`, `supabase/migrations/`, `lib/supabase/types.ts`

### Secondary (MEDIUM confidence)
- [Kite Connect developer forum — token expiry](https://kite.trade/forum/discussion/3468/access-token-expiry-time-everyday) — confirmed: expires at 6 AM IST daily, manual login mandatory, regulatory requirement
- [Kite Connect developer forum — earliest token time](https://kite.trade/forum/discussion/13884/what-is-the-earliest-time-in-the-day-i-can-generate-the-access-token-for-the-day) — confirmed token cadence

### Tertiary (LOW confidence)
- WebSearch results re: kiteconnect TypeScript usage patterns — multiple sources, cross-verified with official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — official `kiteconnect` v5.1.0 package verified on GitHub; all other deps are already installed
- Architecture: HIGH — closely mirrors Phase 2/4 established patterns; Kite API fields verified from docs
- Goals engine: HIGH — pure TS arithmetic, no external dependencies, formula from locked CONTEXT.md decision
- Kite OAuth: HIGH — three-step flow documented on official Kite docs, token lifecycle confirmed from developer forum
- DB schema design: MEDIUM — `stock_holdings` separation is researcher recommendation (not locked); `broker_connections` table design is recommended but not verified against a real implementation
- Pitfalls: HIGH — token expiry is a documented regulatory constraint, not speculation

**Research date:** 2026-03-25
**Valid until:** 2026-06-25 (stable libraries; Kite API versioning rarely changes)

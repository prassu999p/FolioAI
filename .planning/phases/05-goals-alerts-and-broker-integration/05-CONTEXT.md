# Phase 5: Goals, Alerts and Broker Integration - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Financial goals creation and tracking per holder (GOAL-01, GOAL-02, GOAL-03), proactive email alerts for underperformance/drift/tax harvesting window (ALRT-01, ALRT-02 — deferred to V2 per user decision), Zerodha Kite Connect broker integration for stock import (DATA-03), and a full redesign of the family-level Asset Allocation page (ALLOC-03). UI follows `.planning/UI-design/goals_and_allocation.html`.

**Email alerts explicitly deferred to V2** — alert logic and DB schema can be scaffolded but no email delivery in Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Goals — Scope and Data Model
- Goals are **per-holder** — each goal belongs to a specific holder, not family-wide
- Goal fields: name, target corpus amount (₹), target date, linked holdings (optional multi-select from holder's current holdings)
- Goal creation via **modal dialog** — same Dialog component pattern as SetTargetModal (Phase 2) and sell tax estimator (Phase 3)
- No separate "new goal" page — the 3-col goals grid lives at `/families/[familyId]/goals` with an "Add Goal" button that opens the modal

### Goals — Projection & On-Track Logic
- Projected corpus uses **user-inputted expected CAGR** (e.g., 12%) — asked during goal creation
- Formula: `current_linked_value × (1 + r/100)^years_to_target`
- On-track: projected corpus ≥ target amount
- Off-track: projected corpus < target amount
- Status badges: "On Track" in `secondary-container`, "Off Track" in `error-container`

### Goals — Fund-Goal Visual Linkage
- User **picks specific holdings** from a dropdown when creating/editing a goal (multi-select from holder's current holdings list)
- The "Fund-Goal Visual Linkage" connector row on the goals page shows which funds are dedicated to which goal
- Holdings linkage is **optional** — user can set a goal amount/date without linking funds; projection then uses total holder AUM

### Asset Allocation Page (family-level)
- `/families/[familyId]/allocation` shows **family-level combined allocation** (all holders' holdings aggregated)
- Displays "Current vs Target" allocation bars with drift badges
- Drift badge threshold: **> 5% deviation** from target shows orange/error badge; ≤ 5% shows green "On Track" badge
- The per-holder `AllocationSection` component on the holder analytics page remains unchanged
- Family-level targets: a separate `family_allocation_targets` table (or aggregate of holder targets) — researcher to decide optimal approach

### AI Rebalance Strategy Card (Allocation page)
- **AI-generated via Claude** — same on-demand pattern as Phase 4 quarterly review
- User clicks "Generate Rebalance Strategy" button
- Claude receives: current family allocation %, targets %, drift by asset class, top holdings → generates a rebalancing narrative with specific suggestions
- Result cached in DB (similar to `portfolio_narratives`) with "Generated X days ago" badge
- Glassmorphism card style: `background: rgba(255,255,255,0.4); backdrop-filter: blur(20px); border: 1px solid rgba(0,109,67,0.1)` — matches design

### Zerodha Kite Connect — Entry Point
- "Connect Zerodha" entry point lives on the **import page** — a new "Broker" tab alongside the existing CAS import tab at `/families/[familyId]/import`
- Tab shows Zerodha logo, description, and a "Connect via Kite" button that initiates the OAuth flow

### Zerodha Kite Connect — OAuth Flow
- OAuth flow: user clicks → redirects to Kite OAuth → after authorization, Kite redirects to `/api/broker/zerodha/callback`
- Callback handler: exchanges code for access token, fetches holdings from Kite API, imports stocks into the holdings table, redirects user back to import page with success message
- No persistent access token storage — each "Refresh" requires re-authorization (or store token with TTL; researcher to evaluate Kite token lifecycle)

### Zerodha — Stock Display
- Imported Zerodha stocks appear **merged into the holder's existing holdings table** (same table as mutual funds)
- `asset_type` column distinguishes `'mf'` vs `'stock'`
- Unified view: stocks and mutual funds appear together in the holdings table with an asset type indicator
- Stock holdings include: symbol, exchange, quantity, average cost price, current price (fetched from Kite or a stock price API)

### Zerodha — Ongoing Sync
- **Manual "Refresh Zerodha" button** only — no automated daily sync in V1
- Button appears on the import page (Broker tab) when Zerodha is connected
- No background cron jobs for stock sync in Phase 5

### Email Alerts — Deferred to V2
- **ALRT-01** (fund underperformance 6-month alert) and **ALRT-02** (asset drift + tax harvesting window alert) are **deferred to V2**
- DB schema for alert preferences (`user_alert_preferences` table) and alert state tracking can be scaffolded if needed by other logic, but no email delivery pipeline built in Phase 5
- When V2 implements alerts: use **Resend** as the email service, **Vercel Cron** as the trigger mechanism, **HTML branded emails** (React Email or similar), with all alert types on by default and user-configurable opt-out

### Claude's Discretion
- Exact DB schema for goals table (field names, types, constraints)
- Whether family-level allocation targets are a separate table or aggregated from holder targets
- Kite Connect access token storage strategy (session-only vs short-TTL DB storage)
- Exact loading/skeleton states for AI Rebalance Strategy generation
- How to handle goals with no linked holdings (fallback to total holder AUM or show warning)
- Stock price data source for Zerodha holdings current value (Kite API or NSE/BSE feed)

</decisions>

<specifics>
## Specific Ideas

- Goals page: 3-col grid of goal cards matching `goals_and_allocation.html` — each card shows goal name, target amount, current linked corpus, projected corpus at target date, progress bar, and on-track/off-track badge
- The "Fund-Goal Visual Linkage" connector row from the design: a visual strip below the goals grid showing fund → goal arrows/connectors
- Allocation page: follows the exact "Current vs Target" layout from `goals_and_allocation.html` with `+10% Drift` badge style in `error-container`, `On Track` in `secondary-container`
- AI Rebalance Strategy card: glassmorphism style matching the AI cards from Phase 4 (consistent with "Ask AI Intelligence" card aesthetic)
- Zerodha stocks in holdings table: add a small chip/badge (e.g., `Z` icon or "Zerodha" label) to distinguish broker-imported stocks from CAS-imported MF holdings

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/dialog.tsx` — Dialog component; reuse for goal creation modal (same pattern as SetTargetModal and sell tax estimator)
- `components/analytics/allocation-section.tsx` — Full allocation bars + SetTargetModal; family-level allocation page adapts this pattern for combined family data
- `components/ui/badge.tsx` — Badge; use for on-track/off-track goal status and allocation drift badges
- `lib/analytics/period-utils.ts` — Period boundary utilities; reuse for goal time-to-target calculations
- `lib/analytics/xirr.ts` — XIRR computation; goal projection follows similar pure TypeScript pattern
- `lib/analytics/asset-class-mapper.ts` — Asset class categorization; reuse for family allocation computation
- `app/(dashboard)/families/[familyId]/import/page.tsx` — Existing import page; add "Broker" tab here for Zerodha connect
- Phase 4 `portfolio_narratives` table and on-demand generation pattern — AI Rebalance Strategy card follows this exact pattern

### Established Patterns
- Server Components for data fetching + `'use client'` only for interactive islands — goals page fetches data server-side, modal is client
- `formatINR` + `tabular-nums` on all financial values — goals amounts, projected corpus, target corpus all use this
- Dialog component pattern for modals — goal creation, goal editing
- RLS via subquery chains — goals table must scope to holder → family → user_id
- `it.todo()` stubs for test files — goals engine tests scaffold first
- On-demand AI generation with DB caching (Phase 4 pattern) — AI Rebalance Strategy card reuses this

### Integration Points
- Extends `/families/[familyId]/goals/page.tsx` — currently a placeholder "coming soon" page; replaces entirely
- Extends `/families/[familyId]/allocation/page.tsx` — currently basic prototype; replaces with full design
- Extends `/families/[familyId]/import/page.tsx` — adds "Broker" tab for Zerodha OAuth
- New `/api/broker/zerodha/callback` route — Kite Connect OAuth callback handler
- New `goals` table (per holder, with name, target_amount, target_date, assumed_cagr)
- New `goal_holdings` junction table (goal_id → holding scheme_code linkage)
- Holdings table: add `asset_type` column (`'mf'` | `'stock'`) and `broker_source` column (`'cas'` | `'zerodha'`)
- Reads `holder_allocation_targets` table (Phase 2) for per-holder targets; family-level may aggregate or add `family_allocation_targets`
- Claude Anthropic API — AI Rebalance Strategy generation (same SDK pattern as Phase 4)

</code_context>

<deferred>
## Deferred Ideas

- **ALRT-01 & ALRT-02: Email alerts** — fund underperformance (6-month) and asset drift/tax harvesting alerts deferred to V2. Infrastructure notes: Resend + Vercel Cron + React Email HTML templates, all alert types on by default with user opt-out settings.
- **Family-wide goals** — goals that span all holders' combined AUM. V2.
- **Automated daily Zerodha sync** — cron-based stock holdings refresh. V2.
- **ITR Schedule CG export** — already deferred from Phase 3; still V2.
- **Groww/MFCentral broker integration** — Zerodha only in Phase 5; other brokers in V2.

</deferred>

---

*Phase: 05-goals-alerts-and-broker-integration*
*Context gathered: 2026-03-25*

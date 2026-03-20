# Phase 3: Tax Engine - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

LTCG/STCG calculations with TaxLot FIFO, grandfathering for pre-2018 holdings, sell tax estimator (inline on holdings table), LTCG harvesting suggestions, and a reworked Compliance Vault section. UI follows `tax_and_ai.html`.

ITR Schedule CG export (TAX-05) is explicitly deferred to v2 — not in scope for Phase 3.

</domain>

<decisions>
## Implementation Decisions

### FY Selection
- Tax Intelligence page shows **current FY by default**
- Users can switch to **one prior FY** (e.g., FY25 when in FY26) — a simple 2-option toggle in the sticky header next to the page title
- When prior FY is selected, **everything on the page updates**: capital gains summary, harvesting hero (becomes read-only), and Compliance Vault all reflect the selected FY
- Harvesting suggestions are always forward-looking — when prior FY is selected, the harvesting section shows historical data only (no "units to sell" action)
- Tax rates for FY2025-26 must be **verified during research** — Budget 2026 (Feb 1, 2026) may have changed LTCG/STCG rates; researcher confirms from official CBDT sources before planning

### Sell Tax Estimator (TAX-03)
- Estimator lives **inline on the holdings table** — each holding row gets an "Estimate Tax" action
- Clicking opens a **modal dialog** (not inline row expansion)
- Modal shows: fund name, input for units to sell, then a full breakdown:
  - LTCG gain (₹) on those units
  - STCG gain (₹) on those units
  - Applicable tax rate per type
  - Total estimated tax liability
  - Grandfathering applied automatically if holding qualifies (pre-Feb 1, 2018 purchase)
- Calculation is real-time, rule-based — no LLM involvement
- No estimator section on the Tax Intelligence page itself; it lives on the holder's holdings table

### LTCG Harvesting Suggestions (TAX-04)
- Scope: **all eligible holdings with unrealized LTCG > ₹0** — not limited to underperforming funds
- Engine picks the optimal set of holdings to fill the remaining ₹1.25L annual exemption (sorted by LTCG amount, largest first until exemption is consumed)
- Display-only — **no interactive "mark as harvested"** state tracking; user reads the suggestions and executes manually via their broker
- Each suggestion row shows:
  - Fund name
  - Units to sell
  - LTCG to book (₹)
  - Remaining exemption consumed by this suggestion
  - Estimated tax saved vs not harvesting
  - Explicit instruction: "Reinvest proceeds in the same fund" — spelled out on each row to clarify the cost-basis reset mechanic
- The dark hero card (`bg-primary`) matches the design; the "Execution Plan" inner card lists the suggestions

### Compliance Vault (replaces ITR download)
- ITR Schedule CG download is **deferred to v2** — not built in Phase 3
- The 4/12 col Compliance Vault card is repurposed as an **LTCG exemption tracker + key dates** panel:
  - Exemption used this FY: ₹X of ₹1,25,000 (progress bar)
  - Remaining exemption available: ₹Y
  - Key deadline: March 31 (days remaining badge)
  - FY-end tax liability estimate (LTCG above exemption × applicable rate)
- This keeps the card actionable and informative without requiring the export feature

### Tax Calculation Engine
- Rule-based, never LLM — locked pre-Phase 1
- TaxLot method: **FIFO** (First In, First Out) — required by Indian IT rules for mutual funds
- Grandfathering (TAX-02): equity holdings purchased before **Feb 1, 2018** use MAX(actual cost, MIN(Jan 31 2018 NAV, sale price)) as cost basis — NAV seed data was loaded in Phase 1
- Equity holding period: 1 year for LTCG classification (≥ 365 days = LTCG)
- Debt funds purchased **after April 1, 2023**: all gains taxed at income slab rate (no LTCG/STCG distinction)
- Tax rates: researcher confirms post-Budget 2026 rates before planning

### Claude's Discretion
- Exact TypeScript data model for TaxLot (how to structure lots, realized gains, unrealized gains)
- How to handle partial unit sales across multiple lots (FIFO lot splitting logic)
- Loading/skeleton states for tax calculations (complex computation)
- Modal animation and exact layout of the sell estimator dialog
- How many harvesting suggestions to show (cap at 5? show all that fit in the exemption?)
- Error state when Jan 31 2018 NAV is missing for a pre-2018 holding

</decisions>

<specifics>
## Specific Ideas

- Harvesting hero copy: "Harvest ₹1,25,000 in LTCG now to save ₹X in taxes" — the tax saved number is the key hook; it should be prominent in the card header
- The "Reinvest proceeds in same fund" instruction is explicit on each suggestion row — users must understand this to benefit from the cost-basis reset
- Sell estimator modal should feel like the "Set Target" allocation modal from Phase 2 (same Dialog component pattern) — familiar UX pattern already in the codebase

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/dialog.tsx` — Dialog component (used for SetTargetModal in Phase 2); reuse for sell tax estimator modal — same open/close pattern
- `components/holdings/holdings-table.tsx` — Holdings table with row structure; add "Estimate Tax" action column/button per row
- `components/ui/badge.tsx` — Badge; use for "days to March 31" countdown, FY toggle chips
- `lib/analytics/xirr.ts` — XIRR computation; tax engine follows same pure-TypeScript pattern (no SQL math)
- `lib/analytics/period-utils.ts` — FY boundary utilities (getCurrentFY, getPeriodBounds with 'FY' case); reuse for FY switching logic
- `components/analytics/summary-cards.tsx` — Bento grid card pattern; reuse for capital gains summary cards

### Established Patterns
- Pure TypeScript libs for financial math (XIRR, SIP detection) — tax computation follows same pattern in `lib/tax/`
- Server Components for data fetching + RPC calls — tax page fetches transaction history server-side
- `formatINR` utility for ₹ formatting — reuse everywhere in tax UI
- `tabular-nums` class on all financial values — locked convention
- `it.todo()` stubs for test files — Phase 2 pattern; tax engine tests scaffold first
- RLS via subquery chains (transactions → folio → holder → family → user_id) — tax queries must respect same RLS hierarchy

### Integration Points
- Reads `transactions` table (full cashflow ledger from Phase 1) — same table XIRR uses; add FY filter
- Reads `grandfathering_navs` table (Jan 31 2018 NAV seed from Phase 1) — required for TAX-02
- Extends `/families/[familyId]/holders/[holderId]/page.tsx` holdings table — adds "Estimate Tax" action to existing HoldingsTable component
- New route: `/families/[familyId]/tax` or `/tax` — Tax Intelligence page (separate from holder analytics page)
- Nifty 50 daily table exists from Phase 2 — not needed for tax calculations

</code_context>

<deferred>
## Deferred Ideas

- **TAX-05: ITR Schedule CG export** (CSV/PDF download) — deferred to v2. User explicitly removed this from Phase 3 scope. The Compliance Vault card is repurposed to show the exemption tracker instead.
- Per-holder tax breakdown from the family dashboard — show in Phase 3 or Phase 5 when family-level tax view is needed
- ELSS lock-in tracker (TAXV2-01) — v2, in REQUIREMENTS.md
- Bonus stripping / wash sale rule flagging (TAXV2-02) — v2
- SWP per-redemption LTCG/STCG events (TAXV2-03) — v2

</deferred>

---

*Phase: 03-tax-engine*
*Context gathered: 2026-03-20*

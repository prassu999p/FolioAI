# Phase 2: Portfolio Analytics - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Add XIRR, absolute gain/loss, benchmark comparison, SIP tracking, and asset allocation view on top of the Phase 1 transaction ledger and holdings foundation. Users can see exactly how their portfolio is performing — overall and per holding.

Creating tax calculations, AI features, and alerts are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Benchmark & Period Comparison
- Benchmark comparison shown at **holder-level summary only** — overall holder XIRR vs Nifty 50 as metric cards (e.g., "Your XIRR: 14.2% vs Nifty 50: 12.8%")
- Per-fund benchmark comparison deferred — that level of detail belongs in Phase 4 AI Intelligence
- **Nifty 50 only** for v1 benchmark comparison (no fund category average, no user-selectable benchmarks)
- Display as **text metric cards**, not charts — consistent with the minimal card pattern already in the UI
- **Page-level period selector** — one toggle (1M, 3M, 6M, 1Y, 3Y, all-time) at the top of the holder analytics page; changing period updates all metrics (XIRR, gain/loss, benchmark) together

### SIP Tracking
- SIP tracking appears as a **section on the holder analytics page** (below holdings table), not a separate route
- Each SIP row shows: fund name, monthly amount, next debit date, SIP XIRR
- SIP detection is **inferred from transaction pattern**: a holding is classified as an active SIP if it has 3+ recurring transactions of similar amounts within ~30 days of each other in the last 90 days — no user tagging required
- If no active SIPs detected, **hide the section entirely** (don't show an empty state)

### Asset Allocation
- User defines target allocation via a **modal dialog** triggered by a "Set Target" button within the allocation section — equity / debt / gold / international % inputs
- Visualized as **horizontal bars per asset class** — each bar shows current %, with a target % marker and deviation highlighted in red/green; no chart library needed (pure CSS/Tailwind)
- Fund classification into asset classes: **auto-mapped from SEBI fund category** (e.g., "Equity Schemes" → equity, "Debt Schemes" → debt, "Gold ETF" → gold, "International FoF" → international); user can override individual holdings if auto-mapping is wrong
- Allocation section appears on the **holder analytics page**, below the SIP section — same single scrollable page

### Holder Analytics Page Structure
- One scrollable holder page:
  1. Period selector (page-level toggle)
  2. Summary metric cards (total AUM, total invested, gain/loss ₹ and %, XIRR, vs Nifty 50)
  3. Holdings table (extended from Phase 1 with gain/loss and XIRR columns)
  4. Active SIPs section (hidden if none)
  5. Asset Allocation section

### Claude's Discretion
- Exact column layout for extending the holdings table (gain/loss + XIRR columns vs hover/expand pattern)
- XIRR computation library choice (newton-raphson, financial.js, or custom implementation)
- How to handle missing NAV data gracefully in XIRR calculation (partial data, loading states)
- Nifty 50 data source for benchmark (NSE API, Yahoo Finance proxy, or static seed)
- Error/loading states for analytics computations
- Exact spacing, typography, and color scheme for gain/loss (positive vs negative)

</decisions>

<specifics>
## Specific Ideas

- No charts in Phase 2 — text metric cards only; keeps the implementation clean and avoids adding a chart library
- Horizontal allocation bars: pure CSS, consistent with Tailwind — no Recharts or similar for this phase
- SIP XIRR is shown separately from lumpsum XIRR to reflect the cost-averaging effect accurately
- Allocation target stored per holder in DB (not per family) — each holder can have different allocation targets

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/card.tsx` — Card component with shadcn variants; use for metric summary cards
- `components/ui/table.tsx` — Table component; already used in HoldingsTable; extend with gain/loss + XIRR columns
- `components/ui/badge.tsx` — Badge; use for period selector tabs, SIP/lumpsum labels
- `components/ui/dialog.tsx` — Dialog; use for the "Set Target" allocation modal
- `components/holdings/holdings-table.tsx` — Current holdings table (Fund, Units, Avg Cost NAV, Current Value, NAV Date); extend with new columns
- `components/family/family-dashboard.tsx` — formatINR utility (en-IN, no decimals); reuse across all analytics
- `lib/supabase/types.ts` — HoldingRow type; will need extension for analytics fields

### Established Patterns
- Server Components for data fetching (family-dashboard.tsx pattern) — analytics pages should follow same pattern
- `font-mono` class for all financial numbers — keep consistent
- RPC calls for complex queries (`get_holder_holdings`) — XIRR and analytics will need new RPC functions or server-side computation
- `formatINR` utility already handles en-IN locale formatting — reuse everywhere

### Integration Points
- Extends `/families/[familyId]/holders/[holderId]/page.tsx` — Phase 1 holder page becomes the holder analytics page in Phase 2
- Reads from `transactions` table (full cashflow ledger from Phase 1) for XIRR computation
- Reads from `funds` table for SEBI category → asset class mapping
- Phase 3 Tax Engine will also read the same transaction ledger — keep query patterns clean
- N+1 pattern (per-holder RPC calls) noted in Phase 1 as acceptable; Phase 2 may consolidate into a single analytics RPC if performance is a concern

</code_context>

<deferred>
## Deferred Ideas

- Per-fund benchmark comparison (vs fund category average) — Phase 4 AI Intelligence
- Fund category average as a second benchmark option — v2 or Phase 4
- Donut/pie chart for allocation visualization — user preferred horizontal bars; add chart if needed later
- Portfolio overlap analysis (stock-level overlap across funds) — v2 (REQUIREMENTS.md ANLYV2-01)
- Automated cron for NAV sync replacing manual sync button — v2

</deferred>

---

*Phase: 02-portfolio-analytics*
*Context gathered: 2026-03-19*

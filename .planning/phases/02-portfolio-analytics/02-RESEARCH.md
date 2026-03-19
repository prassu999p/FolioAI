# Phase 2: Portfolio Analytics - Research

**Researched:** 2026-03-19
**Domain:** Financial analytics, XIRR computation, benchmark data, asset allocation, SIP detection — Next.js 15 / Supabase / TypeScript
**Confidence:** HIGH (core stack verified from codebase; financial algorithm patterns verified from primary sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Benchmark & Period Comparison**
- Benchmark comparison shown at holder-level summary only — overall holder XIRR vs Nifty 50 as metric cards (e.g., "Your XIRR: 14.2% vs Nifty 50: 12.8%")
- Per-fund benchmark comparison deferred — that level of detail belongs in Phase 4 AI Intelligence
- Nifty 50 only for v1 benchmark comparison (no fund category average, no user-selectable benchmarks)
- Display as text metric cards, not charts — consistent with the minimal card pattern already in the UI
- Page-level period selector — one toggle (1M, 3M, 6M, 1Y, 3Y, all-time) at the top of the holder analytics page; changing period updates all metrics (XIRR, gain/loss, benchmark) together

**SIP Tracking**
- SIP tracking appears as a section on the holder analytics page (below holdings table), not a separate route
- Each SIP row shows: fund name, monthly amount, next debit date, SIP XIRR
- SIP detection is inferred from transaction pattern: a holding is classified as an active SIP if it has 3+ recurring transactions of similar amounts within ~30 days of each other in the last 90 days — no user tagging required
- If no active SIPs detected, hide the section entirely (don't show an empty state)

**Asset Allocation**
- User defines target allocation via a modal dialog triggered by a "Set Target" button within the allocation section — equity / debt / gold / international % inputs
- Visualized as horizontal bars per asset class — each bar shows current %, with a target % marker and deviation highlighted in red/green; no chart library needed (pure CSS/Tailwind)
- Fund classification into asset classes: auto-mapped from SEBI fund category (e.g., "Equity Schemes" → equity, "Debt Schemes" → debt, "Gold ETF" → gold, "International FoF" → international); user can override individual holdings if auto-mapping is wrong
- Allocation section appears on the holder analytics page, below the SIP section — same single scrollable page

**Holder Analytics Page Structure**
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

### Deferred Ideas (OUT OF SCOPE)
- Per-fund benchmark comparison (vs fund category average) — Phase 4 AI Intelligence
- Fund category average as a second benchmark option — v2 or Phase 4
- Donut/pie chart for allocation visualization — user preferred horizontal bars; add chart if needed later
- Portfolio overlap analysis (stock-level overlap across funds) — v2 (REQUIREMENTS.md ANLYV2-01)
- Automated cron for NAV sync replacing manual sync button — v2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | User can see total portfolio value, total invested amount, and absolute gain/loss (₹ and %) per holder and family total | Phase 1 `get_holder_holdings` RPC already returns `total_invested` and `current_value`; extend with derived gain/loss computation on server |
| PERF-02 | User can see XIRR for the overall portfolio, per holding, and per holder — calculated from full transaction cashflow series | Requires `xirr` npm package + new Supabase RPC to fetch raw transactions per folio; computation on server side in Next.js route |
| PERF-03 | User can compare portfolio returns against Nifty 50 benchmark | Requires Nifty 50 data fetch (static seed or cached server-side proxy); locked to holder-level metric cards only |
| PERF-04 | User can switch between XIRR, absolute return, and benchmark comparison views | Period selector as client component controlling which time window is used; metrics recalculate per period |
| PERF-05 | User can see portfolio performance over selectable time periods (1M, 3M, 6M, 1Y, 3Y, all-time) | Period filter on transaction query — start_date param passed to analytics RPC; period selector is client `useState` toggle |
| PERF-06 | All analytics are segmented by Indian financial year (April–March), not calendar year | Financial year helper function: `getFYBounds(year)` → `{start: Apr 1, end: Mar 31}` used in period display and filtering |
| SIP-01 | User can view all active SIPs with monthly debit amount, fund name, and next scheduled date | SIP detection algorithm: query last 90 days transactions per folio, find `sip` type OR recurring `purchase` ≥ 3 within 30-day cadence; infer next date from last + cadence |
| SIP-02 | User can see SIP portfolio XIRR separately from lumpsum holdings | Separate XIRR computation: SIP cashflows only (transaction_type = 'sip') vs all cashflows; surfaced in SIP section |
| ALLOC-01 | User can define target asset allocation per holder | New DB table `holder_allocation_targets` (holder_id FK, equity%, debt%, gold%, international%, updated_at); modal with react-hook-form + zod; percentages must sum to ≤100 |
| ALLOC-02 | User can see current allocation vs target allocation with deviation highlighted | SEBI category → asset class mapping (see mapping table in Architecture Patterns); horizontal CSS bars per class; red/green deviation text |
</phase_requirements>

---

## Summary

Phase 2 builds financial analytics on top of the Phase 1 transaction ledger. The three core technical challenges are: (1) XIRR computation — an iterative Newton-Raphson algorithm applied to irregular cashflows with time-period filtering; (2) Nifty 50 benchmark data — historical index values needed to compute benchmark return over the same period as the user's portfolio; (3) SEBI category → asset class mapping — deterministic rules converting `funds.category` text to equity/debt/gold/international buckets.

The architecture is straightforward: extend the existing Supabase RPC pattern with a new analytics RPC that returns raw transactions per holder (not just aggregated holdings), compute XIRR in TypeScript server-side (not in PostgreSQL — XIRR is iterative, not a set-based operation), and add one new DB table for allocation targets. The holder page becomes a hybrid: a Server Component outer shell that fetches analytics data, with a thin Client Component period-selector toggle that triggers re-fetch via URL search params.

**Primary recommendation:** Implement XIRR as a pure TypeScript function using Newton-Raphson (no npm dependency) to avoid adding dead weight; use a seeded Supabase table for Nifty 50 historical data (populated from niftyindices.com CSV download at setup, refreshed monthly via manual script) to avoid runtime API fragility; map SEBI categories to asset classes via a deterministic lookup object in TypeScript.

---

## Standard Stack

### Core (existing — from Phase 1)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Next.js | 15.5.13 | App router, Server Components, route handlers | Use Server Component pattern for analytics data fetch |
| @supabase/supabase-js | ^2.50.0 | Supabase client + RPC calls | Use `(supabase as any).rpc()` pattern established in Phase 1 |
| @supabase/ssr | ^0.6.1 | Server-side cookie auth | Use `createClient()` from `lib/supabase/server` |
| react-hook-form | ^7.71.2 | Form handling | Use for "Set Target" allocation modal |
| zod | ^3.25.76 | Runtime validation | Validate allocation target inputs (must sum ≤100) |
| date-fns | ^4.1.0 | Date arithmetic | Period calculations, SIP next-date inference, FY boundary computation |
| tailwindcss | ^4.0.0 | Styling | Pure CSS horizontal allocation bars |
| shadcn/ui components | (installed) | Card, Table, Badge, Dialog | All needed components already installed |

### New Addition (XIRR)
| Approach | Version | Purpose | Why |
|---------|---------|---------|-----|
| Pure TypeScript XIRR (hand-rolled — 40 lines) | n/a | Newton-Raphson XIRR computation | No npm dependency; XIRR is ~40 lines of math; the `xirr` npm package (v1.1.0) is 5 years stale with no TypeScript types; full control over convergence behavior |

**Installation:** No new npm packages required. All dependencies already present.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure TS XIRR | `xirr` npm package (RayDeCampo) | Package is 5 years stale, no TS types, same algorithm; not worth adding dependency |
| Seeded `nifty50_daily` Supabase table | Yahoo Finance fetch at runtime | Runtime Yahoo Finance fetch is unreliable (CORS, rate limits, scraping); seeded table is always available |
| Server Component + URL search params for period | Client Component with useState + API calls | URL params allow shareable links and work with Next.js caching; cleaner architecture |

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)
```
app/
├── (dashboard)/families/[familyId]/holders/[holderId]/
│   └── page.tsx                  # EXTEND: becomes analytics page (Server Component)
├── api/
│   └── benchmark/route.ts        # NEW: Nifty 50 data endpoint (optional proxy)
components/
├── analytics/
│   ├── period-selector.tsx        # NEW: 'use client' period toggle (1M/3M/6M/1Y/3Y/all)
│   ├── summary-cards.tsx          # NEW: Server Component metric cards
│   ├── sip-section.tsx            # NEW: Active SIPs section
│   └── allocation-section.tsx     # NEW: Allocation bars + Set Target modal
├── holdings/
│   └── holdings-table.tsx         # EXTEND: add gain/loss + XIRR columns
lib/
├── analytics/
│   ├── xirr.ts                    # NEW: Pure TS Newton-Raphson XIRR function
│   ├── sip-detector.ts            # NEW: SIP pattern detection from transactions
│   ├── asset-class-mapper.ts      # NEW: SEBI category → equity/debt/gold/intl mapping
│   └── period-utils.ts            # NEW: Period bounds, Indian FY helpers
supabase/
└── migrations/
    ├── 20260319000006_analytics_fn.sql      # NEW: get_holder_analytics RPC
    └── 20260319000007_allocation_targets.sql # NEW: holder_allocation_targets table
```

### Pattern 1: Analytics RPC (Server-side data fetch)
**What:** A new Postgres function `get_holder_analytics(p_holder_id, p_start_date, p_end_date)` returns raw transaction cashflows + per-folio summaries in one round-trip. XIRR is computed in TypeScript after receiving the data.
**When to use:** Any time analytics data is needed for the holder page.

```typescript
// Source: established Phase 1 pattern (family-dashboard.tsx, holdings page)
// Supabase RPC call in Server Component
const { data: analyticsData } = await (supabase as any).rpc('get_holder_analytics', {
  p_holder_id: holderId,
  p_start_date: startDate,  // null = all-time
  p_end_date: endDate,
}) as { data: HolderAnalyticsRow[] | null }
```

### Pattern 2: XIRR Computation
**What:** Newton-Raphson iterative root-finding on cashflow series. Outflows are negative (purchases/SIPs), inflows are positive (redemptions + current value as terminal cashflow).
**When to use:** Computing XIRR for overall portfolio, per-holding, or SIP-only filtered cashflows.

```typescript
// lib/analytics/xirr.ts
// Source: Newton-Raphson XIRR — same algorithm as Excel XIRR / nodejs-xirr / LibreOffice Calc
// Verified against: https://github.com/RayDeCampo/nodejs-xirr

interface Cashflow {
  amount: number   // negative = outflow (purchase), positive = inflow (redemption + terminal value)
  date: Date
}

export function computeXIRR(cashflows: Cashflow[], guess = 0.1): number | null {
  if (cashflows.length < 2) return null
  const hasPositive = cashflows.some(c => c.amount > 0)
  const hasNegative = cashflows.some(c => c.amount < 0)
  if (!hasPositive || !hasNegative) return null

  const t0 = cashflows[0].date.getTime()
  const years = (date: Date) => (date.getTime() - t0) / (365.25 * 24 * 3600 * 1000)

  let r = guess
  for (let i = 0; i < 100; i++) {
    let f = 0, df = 0
    for (const { amount, date } of cashflows) {
      const t = years(date)
      f  += amount / Math.pow(1 + r, t)
      df -= t * amount / Math.pow(1 + r, t + 1)
    }
    if (Math.abs(df) < 1e-12) return null   // derivative too small, won't converge
    const rNew = r - f / df
    if (Math.abs(rNew - r) < 1e-8) return rNew  // converged
    r = rNew
  }
  return null  // failed to converge
}
```

### Pattern 3: Period Selector (Client Component)
**What:** Client Component that reads/writes a URL search param `period` (1M | 3M | 6M | 1Y | 3Y | all). Parent Server Component re-renders when URL changes.
**When to use:** Period toggle at top of holder analytics page.

```typescript
// components/analytics/period-selector.tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'

const PERIODS = ['1M', '3M', '6M', '1Y', '3Y', 'all'] as const
type Period = typeof PERIODS[number]

export function PeriodSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = (searchParams.get('period') ?? 'all') as Period

  const setPeriod = (p: Period) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', p)
    router.replace(`?${params.toString()}`)
  }
  // Render Badge-based toggle buttons
}
```

### Pattern 4: Indian Financial Year Helper
**What:** Period bounds computation respecting April–March FY boundary (PERF-06).

```typescript
// lib/analytics/period-utils.ts
export function getPeriodBounds(period: string): { start: Date; end: Date } | null {
  const now = new Date()
  if (period === 'all') return null
  const msMap: Record<string, number> = {
    '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '3Y': 1095,
  }
  const days = msMap[period]
  if (!days) return null
  return { start: new Date(now.getTime() - days * 86400_000), end: now }
}

// Indian FY: April 1 – March 31
export function getCurrentFY(): { start: Date; end: Date } {
  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return {
    start: new Date(year, 3, 1),      // April 1
    end:   new Date(year + 1, 2, 31), // March 31 next year
  }
}
```

### Pattern 5: SEBI Category → Asset Class Mapping
**What:** Deterministic lookup from `funds.category` text to one of `equity | debt | gold | international`.
**Note:** SEBI issued a new categorization circular in February 2026 that restructures some categories. The mapping below covers both old and new category names.

```typescript
// lib/analytics/asset-class-mapper.ts
// Source: SEBI circular Feb 2026 + AMFI category taxonomy
// https://www.sebi.gov.in/legal/circulars/feb-2026/categorization-and-rationalization-of-mutual-fund-schemes_99983.html

type AssetClass = 'equity' | 'debt' | 'gold' | 'international'

const EQUITY_KEYWORDS = [
  'equity', 'large cap', 'mid cap', 'small cap', 'large & mid cap',
  'multi cap', 'flexi cap', 'focused', 'contra', 'value', 'elss',
  'dividend yield', 'sectoral', 'thematic', 'infrastructure', 'banking',
  'fmcg', 'pharma', 'technology', 'consumption', 'nifty', 'sensex',
  'index fund',
]

const DEBT_KEYWORDS = [
  'debt', 'overnight', 'liquid', 'ultra short duration', 'low duration',
  'short duration', 'medium duration', 'long duration', 'money market',
  'corporate bond', 'credit risk', 'banking and psu', 'gilt', 'floater',
  'fixed maturity', 'fmp', 'dynamic bond', 'sectoral debt',
]

const GOLD_KEYWORDS = ['gold', 'silver']  // Silver ETF included for completeness

const INTERNATIONAL_KEYWORDS = [
  'international', 'overseas', 'global', 'foreign', 'us equity',
  'nasdaq', 'fof overseas', 'fund of fund', 'fof',
]

export function mapCategoryToAssetClass(category: string): AssetClass {
  const lower = category.toLowerCase()
  if (GOLD_KEYWORDS.some(k => lower.includes(k))) return 'gold'
  if (INTERNATIONAL_KEYWORDS.some(k => lower.includes(k))) return 'international'
  if (DEBT_KEYWORDS.some(k => lower.includes(k))) return 'debt'
  // Default to equity for hybrid/solution-oriented (conservative: show as equity)
  if (EQUITY_KEYWORDS.some(k => lower.includes(k))) return 'equity'
  return 'equity'  // fallback — hybrid funds lean equity
}
```

### Pattern 6: SIP Detection Algorithm
**What:** Infer active SIPs from transaction patterns without user tagging.

```typescript
// lib/analytics/sip-detector.ts
// A folio is "active SIP" if it has 3+ transactions of type 'sip' OR
// 3+ recurring 'purchase' transactions within ~30-day cadence in last 90 days

export function detectActiveSIPs(
  folioTransactions: Array<{ folio_id: string; scheme_name: string; transaction_type: string; transaction_date: string; amount: number }>,
  today: Date = new Date()
): SIPSummary[] {
  const cutoff = new Date(today.getTime() - 90 * 86400_000)
  // Group by folio_id, filter to last 90 days
  // Count recurring transactions within 25-35 day cadence
  // If count >= 3, classify as active SIP
  // Infer monthly amount as median of recent amounts
  // Infer next date as lastDate + median_interval
}
```

### Nifty 50 Benchmark Data — Recommended Approach
**Decision (Claude's Discretion):** Seed a `nifty50_daily` table in Supabase. Populate from niftyindices.com CSV download at setup. Refresh monthly via manual admin script. This avoids runtime CORS issues, rate limits, and Yahoo Finance API fragility.

**Why not runtime fetch:**
- Yahoo Finance has no official public API; their endpoints break without warning
- NSE/niftyindices.com blocks server-side requests (Cloudflare protection)
- Runtime failure would make benchmark metric unavailable (bad UX)

**Seeded table approach:**
```sql
-- New migration: nifty50_daily
CREATE TABLE nifty50_daily (
  nav_date  DATE PRIMARY KEY,
  close     NUMERIC(12, 2) NOT NULL  -- Nifty 50 closing value
);
-- RLS: authenticated read, no user write
```

**Benchmark XIRR computation:** Apply same cashflow pattern — for each purchase transaction in the user's portfolio, simulate buying Nifty 50 units at that day's closing value; add current Nifty value as terminal cashflow; compute XIRR of that synthetic series.

### Anti-Patterns to Avoid
- **Computing XIRR in PostgreSQL:** XIRR requires iteration — not a set operation. Do it in TypeScript after fetching raw cashflows.
- **Fetching transactions in N+1 loops per holding:** Fetch all transactions for a holder in one query, group by `folio_id` in TypeScript.
- **Storing computed analytics in DB:** XIRR, gain/loss are derived values — compute at request time from source transactions. Caching in DB creates staleness risk.
- **Chart library for allocation bars:** Locked decision is pure CSS — don't add Recharts/Chart.js in Phase 2.
- **Global period state in React context:** Use URL search params — allows server-side rendering, bookmarkable links.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date arithmetic | Custom days/months diff | `date-fns` (already installed) | DST, leap year, month boundary edge cases |
| Form validation | Custom % validator | `zod` + `react-hook-form` (already installed) | Existing pattern in project; handles sum-to-100 with `.refine()` |
| UI components | Custom modal, table, card | shadcn/ui Dialog, Table, Card (already installed) | Phase 1 established pattern; visual consistency |
| TypeScript types | Ad-hoc inline types | Extend `HoldingRow` interface in `types.ts` | Central type registry established in Phase 1 |
| Auth check | Custom auth middleware | `getClaims()` pattern (established in Phase 1) | Handles JWT validation correctly |

**Key insight:** The only net-new code is financial math (XIRR, SIP detection, asset class mapping) — everything else reuses Phase 1 infrastructure.

---

## Common Pitfalls

### Pitfall 1: XIRR Convergence Failure on New Holdings
**What goes wrong:** XIRR returns `null` or throws for holdings with only purchase transactions (no redemption + no current NAV). Newton-Raphson needs at least one positive and one negative cashflow.
**Why it happens:** New holdings have only negative cashflows (purchases) until a current NAV value is added as the terminal "sell" entry.
**How to avoid:** Always add the current value as a positive terminal cashflow on today's date before running XIRR. If `current_nav` is null (NAV not yet synced), show `—` instead of computing XIRR.
**Warning signs:** `computeXIRR` returns null for holdings that clearly have value.

### Pitfall 2: Period Filter Cutting Off Initial Investment
**What goes wrong:** User selects "1Y" but their initial SIP started 3 years ago. The period-filtered XIRR only sees recent cashflows and shows incorrect return.
**Why it happens:** XIRR requires the full cost basis. If you filter to only last 12 months of transactions, you miss the original purchase price.
**How to avoid:** For period-filtered XIRR, reconstruct cost basis: include all transactions up to period start as a single synthetic "invested value" cashflow on the period start date. Only filter period end for the terminal value.

### Pitfall 3: Amount Sign Convention
**What goes wrong:** XIRR returns negative rates or wrong values because purchase amounts are stored as positive in the DB but XIRR needs them as negative (outflows).
**Why it happens:** DB stores `amount` as positive for all transaction types.
**How to avoid:** In the XIRR cashflow builder, negate purchase/SIP/switch_in amounts: `amount: -transaction.amount` for outflows, `amount: +transaction.amount` for redemptions, `amount: +current_value` for terminal entry.

### Pitfall 4: allocation_targets Percentages Summing > 100
**What goes wrong:** User enters equity=60, debt=30, gold=20 (sum=110) — makes no financial sense.
**Why it happens:** Form allows individual inputs without cross-field validation.
**How to avoid:** Zod `.refine()` on the form schema: `total must be ≤ 100`. Show real-time sum in modal. Allow partial allocation (sum < 100 means unclassified/cash).

### Pitfall 5: SIP "Next Date" Computation on Month-End Dates
**What goes wrong:** SIP on the 31st of each month — next date computed as "April 31" which doesn't exist.
**Why it happens:** Simple date arithmetic adds 30 days without accounting for varying month lengths.
**How to avoid:** Use `date-fns addMonths()` which handles month-end clamping correctly.

### Pitfall 6: SEBI 2026 Category Recategorisation Impact
**What goes wrong:** Funds reclassified under February 2026 SEBI circular may have new `category` values in `funds` table after next NAV sync — previously working asset class mapping may break.
**Why it happens:** SEBI Feb 2026 circular introduced new categories (Life Cycle Funds, Sectoral Debt Fund) and discontinued solution-oriented schemes.
**How to avoid:** Keyword-based mapping (rather than exact string match) handles new category names gracefully. Add a fallback log for unmapped categories to detect reclassifications.

### Pitfall 7: Nifty 50 Date Gaps (Trading Holidays)
**What goes wrong:** Looking up Nifty 50 closing value for a purchase date that falls on a market holiday returns null.
**Why it happens:** `nifty50_daily` table only has trading day values; weekends and Indian market holidays have no row.
**How to avoid:** Benchmark computation should use the nearest available date (`SELECT ... WHERE nav_date <= $date ORDER BY nav_date DESC LIMIT 1`).

---

## Code Examples

### Gain/Loss Computation (per holding)
```typescript
// Source: derived from HoldingRow fields in lib/supabase/types.ts
// total_invested and current_value already available from get_holder_holdings RPC
function computeGainLoss(holding: HoldingRow): { gainLoss: number | null; gainLossPct: number | null } {
  if (holding.current_value === null) return { gainLoss: null, gainLossPct: null }
  const gainLoss = holding.current_value - holding.total_invested
  const gainLossPct = holding.total_invested > 0
    ? (gainLoss / holding.total_invested) * 100
    : null
  return { gainLoss, gainLossPct }
}
```

### XIRR Cashflow Builder (portfolio-level)
```typescript
// Source: standard XIRR cashflow construction for mutual fund portfolio
function buildPortfolioCashflows(
  transactions: Transaction[],
  holdingRows: HoldingRow[],
  today: Date
): Cashflow[] {
  const cashflows: Cashflow[] = transactions.map(t => ({
    amount: ['purchase', 'sip', 'switch_in', 'dividend_reinvest'].includes(t.transaction_type)
      ? -t.amount   // outflow
      : +t.amount,  // inflow (redemption, switch_out)
    date: new Date(t.transaction_date),
  }))
  // Add current value as terminal positive cashflow
  const totalCurrentValue = holdingRows.reduce((sum, h) => sum + (h.current_value ?? 0), 0)
  cashflows.push({ amount: totalCurrentValue, date: today })
  return cashflows
}
```

### Allocation Target Zod Schema
```typescript
// Source: established project pattern (zod v3.25.76)
import { z } from 'zod'

export const AllocationTargetSchema = z.object({
  equity: z.number().min(0).max(100),
  debt:   z.number().min(0).max(100),
  gold:   z.number().min(0).max(100),
  international: z.number().min(0).max(100),
}).refine(
  data => data.equity + data.debt + data.gold + data.international <= 100,
  { message: 'Total allocation cannot exceed 100%' }
)
```

### New Supabase RPC for Analytics Transactions
```sql
-- Migration: get_holder_analytics_transactions
-- Returns raw transaction cashflows for a holder within a date range
-- XIRR is computed in TypeScript after this call
CREATE OR REPLACE FUNCTION get_holder_analytics_transactions(
  p_holder_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date   DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  folio_id          UUID,
  scheme_code       INTEGER,
  scheme_name       TEXT,
  transaction_date  DATE,
  transaction_type  TEXT,
  amount            NUMERIC,
  units             NUMERIC,
  nav               NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    t.folio_id,
    fo.scheme_code,
    f.scheme_name,
    t.transaction_date,
    t.transaction_type,
    t.amount,
    t.units,
    t.nav
  FROM folios fo
  JOIN funds f ON f.scheme_code = fo.scheme_code
  JOIN transactions t ON t.folio_id = fo.id
  WHERE fo.holder_id = p_holder_id
    AND (p_start_date IS NULL OR t.transaction_date >= p_start_date)
    AND t.transaction_date <= p_end_date
    AND t.import_status = 'clean'
  ORDER BY t.transaction_date ASC
$$;
```

### Horizontal Allocation Bar (pure Tailwind CSS)
```tsx
// No chart library — pure CSS as per locked decision
// Source: Tailwind CSS width utility pattern
function AllocationBar({ label, current, target }: {
  label: string; current: number; target: number | null
}) {
  const deviation = target !== null ? current - target : null
  const deviationColor = deviation === null ? '' :
    deviation > 2 ? 'text-green-600' :
    deviation < -2 ? 'text-red-600' : 'text-muted-foreground'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={`font-mono ${deviationColor}`}>
          {current.toFixed(1)}%
          {deviation !== null && ` (${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%)`}
        </span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-visible">
        <div
          className="absolute h-full bg-primary rounded-full"
          style={{ width: `${Math.min(current, 100)}%` }}
        />
        {target !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-foreground/50"
            style={{ left: `${Math.min(target, 100)}%` }}
          />
        )}
      </div>
    </div>
  )
}
```

---

## New Database Objects Required

| Object | Type | Purpose |
|--------|------|---------|
| `get_holder_analytics_transactions` | Postgres function (RPC) | Returns raw transaction cashflows for a holder within date range |
| `holder_allocation_targets` | Table | Stores equity/debt/gold/international target % per holder |
| `nifty50_daily` | Table | Nifty 50 closing values by date (seeded, not user-writable) |

### holder_allocation_targets DDL
```sql
CREATE TABLE holder_allocation_targets (
  holder_id     UUID PRIMARY KEY REFERENCES holders(id) ON DELETE CASCADE,
  equity        NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (equity >= 0 AND equity <= 100),
  debt          NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (debt >= 0 AND debt <= 100),
  gold          NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (gold >= 0 AND gold <= 100),
  international NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (international >= 0 AND international <= 100),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT total_allocation_max CHECK (equity + debt + gold + international <= 100)
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| XIRR via npm `xirr` package | Pure TS implementation (same algorithm) | Package last updated 2019; no TS types | Eliminates stale dependency, same math |
| SEBI 2017 36-category system | SEBI Feb 2026 new categorization (5 broad types, Life Cycle added, solution-oriented discontinued) | Feb 26, 2026 | Category names in `funds.category` may shift — use keyword matching, not exact match |
| SQL-level analytics aggregation | TypeScript XIRR post-RPC | N/A for this project | Correct approach — iterative math not suited for SQL |

**Note on SEBI 2026 Recategorization (HIGH confidence):** SEBI's February 26, 2026 circular reclassified mutual fund schemes. Life Cycle Funds introduced; Children's and Retirement Funds discontinued. All AMCs must transition by a specified date. The `funds.category` field populated from AMFI data will gradually reflect new names. Use keyword-based mapping (not exact string equality) to remain robust.

---

## Open Questions

1. **Nifty 50 seed data currency**
   - What we know: niftyindices.com provides CSV download of historical Nifty 50 data for free
   - What's unclear: How frequently the seed script should run; whether the data can be imported in bulk at phase start vs needing a live API
   - Recommendation: Create a one-time seed script (similar to `seed-grandfathering-nav.ts`) that downloads Nifty 50 CSV from niftyindices.com and bulk-inserts into `nifty50_daily`. Run once at phase start. Add a refresh endpoint for future use.

2. **XIRR convergence for very new portfolios**
   - What we know: XIRR needs at least one positive and one negative cashflow; very recent investments with no price appreciation may converge near zero
   - What's unclear: Whether to show 0% or `—` for portfolios < 30 days old
   - Recommendation: Show `—` if portfolio age < 7 days OR total invested equals current value within ±0.5% (not enough price movement for meaningful XIRR)

3. **period-filtered XIRR correctness**
   - What we know: The correct approach is to use cost-basis reconstruction (synthetic cashflow at period start), not simple transaction filtering
   - What's unclear: Whether Phase 2 requires period-filtered XIRR or only all-time XIRR (the requirements say "selectable periods" but the real complexity is in filtered XIRR)
   - Recommendation: For Phase 2, compute all-time XIRR and period-filtered absolute returns; label period-filtered XIRR as "Since [date]" and accept the cost-basis reconstruction complexity

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.0 |
| Config file | `vitest.config.mts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` (all tests in `tests/`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | gain/loss computation (₹ and %) from total_invested + current_value | unit | `npm test -- --reporter=verbose tests/analytics.test.ts` | ❌ Wave 0 |
| PERF-02 | XIRR computed correctly for known cashflow series | unit | `npm test -- tests/xirr.test.ts` | ❌ Wave 0 |
| PERF-02 | XIRR returns null when NAV missing | unit | `npm test -- tests/xirr.test.ts` | ❌ Wave 0 |
| PERF-03 | Benchmark XIRR computed for Nifty 50 synthetic cashflows | unit | `npm test -- tests/analytics.test.ts` | ❌ Wave 0 |
| PERF-05 | period bounds computation (1M, 3M, 6M, 1Y, 3Y) | unit | `npm test -- tests/analytics.test.ts` | ❌ Wave 0 |
| PERF-06 | Indian FY bounds: April 1 – March 31 boundary | unit | `npm test -- tests/analytics.test.ts` | ❌ Wave 0 |
| SIP-01 | SIP detection: 3+ transactions within 30-day cadence in last 90 days | unit | `npm test -- tests/sip-detector.test.ts` | ❌ Wave 0 |
| SIP-01 | SIP detection: returns empty for fewer than 3 matching | unit | `npm test -- tests/sip-detector.test.ts` | ❌ Wave 0 |
| SIP-02 | SIP XIRR uses only `sip` transaction type cashflows | unit | `npm test -- tests/sip-detector.test.ts` | ❌ Wave 0 |
| ALLOC-01 | allocation target zod schema rejects sum > 100 | unit | `npm test -- tests/allocation.test.ts` | ❌ Wave 0 |
| ALLOC-02 | asset class mapper: equity/debt/gold/international from category string | unit | `npm test -- tests/allocation.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` (full suite — fast, ~30 seconds)
- **Per wave merge:** `npm test` + `npx tsc --noEmit`
- **Phase gate:** Full suite green + `npm run build` clean before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/xirr.test.ts` — covers PERF-02 (XIRR unit tests with known cashflows)
- [ ] `tests/analytics.test.ts` — covers PERF-01, PERF-03, PERF-05, PERF-06
- [ ] `tests/sip-detector.test.ts` — covers SIP-01, SIP-02
- [ ] `tests/allocation.test.ts` — covers ALLOC-01, ALLOC-02

---

## Sources

### Primary (HIGH confidence)
- Existing codebase — `lib/supabase/types.ts`, `components/holdings/holdings-table.tsx`, `components/family/family-dashboard.tsx`, `supabase/migrations/20260319000004_holdings_fn.sql` — verified Phase 1 patterns
- `package.json` — confirmed all existing dependencies (date-fns, zod, react-hook-form, shadcn/ui, supabase-js)
- `vitest.config.mts` + `tests/` directory — confirmed test infrastructure
- SEBI circular Feb 2026 URL: https://www.sebi.gov.in/legal/circulars/feb-2026/categorization-and-rationalization-of-mutual-fund-schemes_99983.html — confirmed new categorization effective 2026

### Secondary (MEDIUM confidence)
- [nodejs-xirr README (RayDeCampo)](https://github.com/RayDeCampo/nodejs-xirr/blob/master/README.md) — verified API shape, confirmed Newton-Raphson algorithm, confirms package age (last updated ~2019)
- [SEBI New Classification 2026 (indmoney.com / upstox.com)](https://upstox.com/news/personal-finance/mutual-funds/sebi-new-classification-rules-for-equity-mutual-fund-schemes-2026-all-you-need-to-know/article-189995/) — verified new categories including Life Cycle Funds, Sectoral Debt
- [Groww SEBI categories](https://groww.in/blog/guide-to-sebi-new-categories-of-mutual-fund) — confirmed 5-category taxonomy (equity/debt/hybrid/solution-oriented/other)

### Tertiary (LOW confidence)
- niftyindices.com programmatic access — confirmed manual CSV download exists; undocumented POST endpoint found in community sources; treat as best-effort, seed approach is safer

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all Phase 1 dependencies verified from `package.json`; no new dependencies required
- Architecture: HIGH — RPC pattern established in Phase 1; XIRR algorithm verified against multiple sources
- XIRR math: HIGH — Newton-Raphson XIRR is the same algorithm used in Excel/LibreOffice; verified against nodejs-xirr source
- Pitfalls: HIGH — XIRR convergence edge cases verified from nodejs-xirr issue tracker and Excel community docs
- SEBI category mapping: MEDIUM — keyword list covers pre-2026 and 2026 categories; new categories under transition may not all be captured
- Nifty 50 data source: MEDIUM — seeded table approach is reliable; seed process requires manual download, no programmatic API is officially supported

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable domain; SEBI category changes should be monitored)

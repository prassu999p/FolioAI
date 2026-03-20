# Phase 3: Tax Engine - Research

**Researched:** 2026-03-20
**Domain:** Indian mutual fund tax computation — FIFO TaxLot engine, LTCG/STCG classification, grandfathering, harvesting suggestions
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Tax Intelligence page shows **current FY by default**; users can switch to **one prior FY** via a 2-option toggle in the sticky header
- When prior FY selected, everything on the page updates (gains summary, harvesting hero becomes read-only, Compliance Vault reflects selected FY)
- Harvesting suggestions are always forward-looking — prior FY view shows historical data only (no "units to sell" action)
- **Tax rates confirmed post-Budget 2026 (Feb 1, 2026): NO changes** — rates remain LTCG 12.5%, STCG 20% for equity, exemption ₹1.25L unchanged
- Sell Tax Estimator (TAX-03): lives **inline on holdings table** as an "Estimate Tax" action per row; clicking opens a **modal dialog**
- Modal shows: fund name, units input, then LTCG gain (₹), STCG gain (₹), applicable rates, total estimated tax; grandfathering applied automatically
- Calculation is real-time, rule-based — no LLM involvement
- No estimator section on Tax Intelligence page itself; it lives on the holder's holdings table
- LTCG Harvesting Suggestions (TAX-04): scope = all eligible holdings with unrealized LTCG > ₹0; engine picks optimal set (sorted by LTCG descending until ₹1.25L exemption consumed)
- Suggestions are **display-only** — no "mark as harvested" state tracking
- Each suggestion row: fund name, units to sell, LTCG to book (₹), remaining exemption consumed, estimated tax saved, explicit "Reinvest proceeds in same fund" instruction
- Dark hero card (`bg-primary`) with inner "Execution Plan" card listing suggestions
- Compliance Vault (replaces ITR download, deferred to v2): repurposed as LTCG exemption tracker + key dates:
  - Exemption used this FY: ₹X of ₹1,25,000 (progress bar)
  - Remaining exemption available: ₹Y
  - Key deadline: March 31 (days remaining badge)
  - FY-end tax liability estimate (LTCG above exemption × 12.5%)
- TaxLot method: **FIFO** (First In, First Out)
- Grandfathering (TAX-02): equity holdings purchased before **Feb 1, 2018** use `MAX(actual cost, MIN(Jan 31 2018 NAV, sale price))` as cost basis
- Equity holding period: **1 year (≥ 365 days) = LTCG**; < 365 days = STCG
- Debt funds purchased **after April 1, 2023**: all gains taxed at income slab rate (no LTCG/STCG distinction)
- Tax calculation engine: **rule-based, never LLM** — locked pre-Phase 1
- **TAX-05 (ITR Schedule CG export) is DEFERRED to v2** — not in scope for Phase 3

### Claude's Discretion
- Exact TypeScript data model for TaxLot (how to structure lots, realized gains, unrealized gains)
- How to handle partial unit sales across multiple lots (FIFO lot splitting logic)
- Loading/skeleton states for tax calculations (complex computation)
- Modal animation and exact layout of the sell estimator dialog
- How many harvesting suggestions to show (cap at 5? show all that fit in the exemption?)
- Error state when Jan 31 2018 NAV is missing for a pre-2018 holding

### Deferred Ideas (OUT OF SCOPE)
- TAX-05: ITR Schedule CG export (CSV/PDF download) — deferred to v2
- Per-holder tax breakdown from the family dashboard — Phase 5 or later
- ELSS lock-in tracker (TAXV2-01) — v2
- Bonus stripping / wash sale rule flagging (TAXV2-02) — v2
- SWP per-redemption LTCG/STCG events (TAXV2-03) — v2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TAX-01 | User can see LTCG and STCG breakdown per holding and total — equity 1-year rule, 12.5% above ₹1.25L; debt slab rate for post-Apr-2023 purchases | FIFO TaxLot engine in `lib/tax/`; Tax Intelligence page server component; confirmed rates |
| TAX-02 | Grandfathering applied correctly for equity holdings purchased before Feb 1, 2018 (cost basis = MAX(actual cost, MIN(Jan 31 2018 NAV, sale price))) | `grandfathering_nav` table exists with Jan 31 2018 NAV data; formula documented |
| TAX-03 | Real-time sell tax estimator: units input → LTCG/STCG breakdown + total estimated tax (rule-based, not LLM) | Modal dialog pattern reused from SetTargetModal; pure TS computation, no network call |
| TAX-04 | LTCG harvesting suggestions — units to sell per fund to consume ₹1.25L annual exemption; show fund, units, LTCG booked, remaining exemption, tax saved | Greedy algorithm on unrealized gains; display-only; design from tax_and_ai.html dark hero |
| TAX-05 | ITR Schedule CG statement download | DEFERRED TO V2 — not implemented in Phase 3 |
</phase_requirements>

---

## Summary

Phase 3 builds the tax computation engine for Indian mutual fund investors. The core challenge is correctly implementing FIFO TaxLot accounting with three distinct tax regimes: (1) equity funds with a 1-year holding period rule, 12.5% LTCG above ₹1.25L exemption, 20% STCG; (2) equity grandfathering using Jan 31 2018 NAV for pre-Feb 2018 purchases; and (3) debt funds purchased after April 1, 2023 taxed at slab rates regardless of holding period.

Budget 2026 (Feb 1, 2026) made no changes to LTCG or STCG rates for mutual funds. The ₹1.25L annual LTCG exemption remains unchanged. Rates confirmed: equity LTCG 12.5%, equity STCG 20%. India has no wash-sale rule, so the "sell and reinvest in same fund immediately" harvesting technique is legally valid and must be prominently explained to users.

The tax engine is a pure TypeScript library (`lib/tax/`) following the same pattern as `lib/analytics/xirr.ts` — no SQL math, no LLM. Data inputs come from the existing `transactions` table (full FIFO ledger) and `grandfathering_nav` table (Phase 1 seed). The UI adds a new `/families/[familyId]/tax` route and extends the existing holdings table with an "Estimate Tax" action per row.

**Primary recommendation:** Build `lib/tax/engine.ts` as a pure TypeScript FIFO TaxLot engine that returns structured `TaxLot[]`, `RealizedGain[]`, and `UnrealizedGain[]` per folio. All UI and API layers call this single engine function.

---

## Confirmed Tax Rates (Post-Budget 2026)

**Source:** Budget 2026 (Feb 1, 2026) confirmed no rate changes. Rates from Finance Act 2024 (Budget July 2024) remain in effect.

| Asset Type | Purchase Date | Holding Period | Tax Treatment |
|-----------|---------------|---------------|---------------|
| Equity-oriented MF (≥65% equity) | Any | ≥ 12 months | LTCG 12.5%, first ₹1.25L exempt |
| Equity-oriented MF (≥65% equity) | Any | < 12 months | STCG 20% |
| Debt MF (≤35% equity) | Before Apr 1, 2023 | ≥ 24 months | LTCG 12.5% (no indexation, per Budget 2024) |
| Debt MF (≤35% equity) | Before Apr 1, 2023 | < 24 months | STCG at slab rate |
| Debt MF (≤35% equity) | On/after Apr 1, 2023 | Any | Always slab rate (Section 50AA, Finance Act 2023) |
| Balanced/Moderate Hybrid (35–65% equity) | Any | ≥ 24 months | LTCG 12.5% |
| Balanced/Moderate Hybrid (35–65% equity) | Any | < 24 months | STCG at slab rate |

**Annual LTCG Exemption:** ₹1,25,000 per financial year (April 1 – March 31), across all equity shares and equity-oriented mutual funds combined.

**Surcharge and cess:** All rates above are base rates. Add 4% Health & Education Cess + applicable surcharge. For Phase 3 UI, display base rate only (the standard practice for display-only tax estimators).

---

## Standard Stack

### Core (existing, inherited from Phases 1–2)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| TypeScript | 5.x | Tax engine computation | All financial math in TS, never SQL |
| Vitest | 3.x | Unit tests for tax engine | Existing test infrastructure |
| Zod | 3.x | Input validation | Existing pattern; validate folio IDs, units input |
| Next.js | 15.5.13 | App Router, Server Components | Existing framework |
| @supabase/ssr | 0.6.x | Server-side DB access | Existing pattern |

### Supporting (existing UI primitives)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `components/ui/dialog.tsx` | existing | Sell estimator modal | Reuse SetTargetModal pattern directly |
| `components/ui/badge.tsx` | existing | Days-to-March-31 countdown, FY toggle chips | Available now |
| `date-fns` | 4.x | Date arithmetic (holding period in days) | Already installed; use `differenceInDays` |

### No New Packages Needed
The tax engine requires no new npm packages. Pure TypeScript date arithmetic via `date-fns` (already installed) handles holding period classification. All data is already in Supabase.

## Architecture Patterns

### Recommended Project Structure
```
lib/tax/
├── engine.ts          # Core FIFO TaxLot engine — pure TS function
├── types.ts           # TaxLot, RealizedGain, UnrealizedGain, TaxSummary interfaces
├── rules.ts           # Tax rate lookup by asset class + purchase date + holding days
├── harvesting.ts      # LTCG harvesting suggestion algorithm
└── fy-utils.ts        # FY-aware helpers (getFYBounds with year param, getFYLabel)

app/(dashboard)/families/[familyId]/tax/
└── page.tsx           # Tax Intelligence page (Server Component)

components/tax/
├── capital-gains-summary.tsx   # 8/12 col capital gains FY summary card
├── compliance-vault.tsx        # 4/12 col exemption tracker + key dates
├── harvesting-hero.tsx         # Full-width dark bg-primary harvesting section
├── fy-toggle.tsx               # 2-option FY switcher (current / prior FY)
└── sell-tax-estimator-modal.tsx # 'use client' modal with units input + breakdown

tests/tax/
├── engine.test.ts     # FIFO lot allocation, partial splits, grandfathering
├── rules.test.ts      # Tax rate lookup, holding period classification
└── harvesting.test.ts # Suggestion algorithm, exemption consumption
```

### Pattern 1: FIFO TaxLot Engine
**What:** Build tax lots from transactions array, apply FIFO lot depletion for redemptions, compute LTCG/STCG per lot.
**When to use:** Called for every tax calculation (realized gains summary, sell estimator, harvesting).
**Data source:** `transactions` table filtered by `folio_id`; sorted ascending by `transaction_date`.

```typescript
// lib/tax/types.ts
export interface TaxLot {
  lotId: string           // synthetic: `${folio_id}-${transaction_date}-${idx}`
  folioId: string
  schemeCode: number
  purchaseDate: Date
  units: number           // original units in this lot (not depleted)
  remainingUnits: number  // units not yet sold (for unrealized gain calc)
  purchaseNav: number     // cost basis per unit
  grandfatheringNav: number | null  // Jan 31 2018 NAV if pre-2018, else null
  assetClass: 'equity' | 'debt' | 'hybrid_aggressive' | 'hybrid_other'
  isPostApr2023: boolean  // for debt: true = always slab rate
}

export interface RealizedGain {
  lotId: string
  saleDate: Date
  soldUnits: number
  costBasis: number       // per unit (after grandfathering formula applied)
  saleNav: number
  holdingDays: number
  gainPerUnit: number
  totalGain: number
  classification: 'LTCG' | 'STCG' | 'SLAB'  // SLAB = post-Apr-2023 debt
  taxRate: number         // 0.125, 0.20, or null (slab - user-dependent)
  isLTCG: boolean
}

export interface UnrealizedGain {
  lotId: string
  currentNav: number
  currentDate: Date
  holdingDays: number
  effectiveCostBasis: number  // after grandfathering
  unrealizedGain: number
  wouldBeLTCG: boolean        // true if held long enough today
  assetClass: 'equity' | 'debt' | 'hybrid_aggressive' | 'hybrid_other'
}

export interface TaxSummary {
  totalRealizedLTCG: number
  totalRealizedSTCG: number
  totalSlabGains: number
  ltcgExemptionUsed: number   // min(totalRealizedLTCG, 125000)
  ltcgTaxable: number         // max(totalRealizedLTCG - 125000, 0)
  estimatedLTCGTax: number    // ltcgTaxable * 0.125
  estimatedSTCGTax: number    // totalRealizedSTCG * 0.20
  lots: TaxLot[]
  realizedGains: RealizedGain[]
  unrealizedGains: UnrealizedGain[]
}
```

### Pattern 2: FIFO Lot Depletion for Partial Sales
**What:** When a redemption transaction depletes units, consume lots oldest-first. If a redemption partially depletes a lot, split it.
**When to use:** Every redemption/switch_out transaction processed by the engine.

```typescript
// lib/tax/engine.ts (pseudocode pattern)
function depleteLots(
  lots: TaxLot[],
  redemption: Transaction,
  saleNav: number
): { updatedLots: TaxLot[]; realizedGains: RealizedGain[] } {
  let unitsToSell = redemption.units
  const realizedGains: RealizedGain[] = []

  for (const lot of lots.sort by purchaseDate asc) {
    if (unitsToSell <= 0) break

    const soldFromThisLot = Math.min(lot.remainingUnits, unitsToSell)
    const holdingDays = differenceInDays(redemption.transaction_date, lot.purchaseDate)
    const effectiveCost = applyGrandfathering(lot, saleNav)

    realizedGains.push({
      soldUnits: soldFromThisLot,
      costBasis: effectiveCost,
      holdingDays,
      // ... classification via rules.ts
    })

    lot.remainingUnits -= soldFromThisLot
    unitsToSell -= soldFromThisLot
  }

  return { updatedLots: lots.filter(l => l.remainingUnits > 0.001), realizedGains }
}
```

### Pattern 3: Grandfathering Formula
**What:** For equity lots purchased before Feb 1, 2018, replace actual purchase NAV with the grandfathering-adjusted cost basis.
**Formula (verified from CBDT/Finance Act 2018):**
```
effectiveCostPerUnit = MAX(actualPurchaseNAV, MIN(jan31NAV, saleNAV))
```
**Edge case:** If `jan31NAV` is null (missing from `grandfathering_nav` table), log a warning and fall back to `actualPurchaseNAV`. Show a UI callout: "Grandfathering NAV unavailable for this fund — using actual cost."

```typescript
// lib/tax/engine.ts
function applyGrandfathering(lot: TaxLot, saleNav: number): number {
  if (!lot.grandfatheringNav) return lot.purchaseNav  // fallback
  const fmv = lot.grandfatheringNav
  return Math.max(lot.purchaseNav, Math.min(fmv, saleNav))
}
```

### Pattern 4: Tax Rule Lookup
**What:** Determine LTCG/STCG/Slab classification and applicable rate from holding period + asset class + purchase date.

```typescript
// lib/tax/rules.ts
const EQUITY_LTCG_THRESHOLD_DAYS = 365
const DEBT_LTCG_THRESHOLD_DAYS = 730  // 24 months
const EQUITY_LTCG_RATE = 0.125
const EQUITY_STCG_RATE = 0.20
const DEBT_LTCG_RATE = 0.125          // for pre-Apr-2023 debt held > 24 months

export function classifyGain(params: {
  holdingDays: number
  assetClass: 'equity' | 'debt' | 'hybrid_aggressive' | 'hybrid_other'
  isPostApr2023: boolean  // debt purchased on/after Apr 1, 2023
}): { classification: 'LTCG' | 'STCG' | 'SLAB'; taxRate: number | null } {
  const { holdingDays, assetClass, isPostApr2023 } = params

  if (assetClass === 'equity' || assetClass === 'hybrid_aggressive') {
    // equity-oriented: 1 year rule
    return holdingDays >= EQUITY_LTCG_THRESHOLD_DAYS
      ? { classification: 'LTCG', taxRate: EQUITY_LTCG_RATE }
      : { classification: 'STCG', taxRate: EQUITY_STCG_RATE }
  }

  if (assetClass === 'debt' || assetClass === 'hybrid_other') {
    if (isPostApr2023) return { classification: 'SLAB', taxRate: null }
    return holdingDays >= DEBT_LTCG_THRESHOLD_DAYS
      ? { classification: 'LTCG', taxRate: DEBT_LTCG_RATE }
      : { classification: 'STCG', taxRate: null }  // slab rate
  }

  return { classification: 'STCG', taxRate: null }
}
```

### Pattern 5: Harvesting Suggestion Algorithm
**What:** Given unrealized gains, find the optimal set of lots to sell to consume the remaining ₹1.25L exemption.
**Algorithm:** Sort eligible holdings (LTCG-qualifying equity lots with unrealizedGain > 0) by total unrealized LTCG descending; fill greedily until exemption consumed. If a single holding exceeds remaining exemption, calculate exact units to sell.

```typescript
// lib/tax/harvesting.ts
export function computeHarvestingSuggestions(
  unrealizedGains: UnrealizedGain[],
  ltcgUsedThisFY: number,
  currentNav: Map<number, number>  // schemeCode → current NAV
): HarvestingSuggestion[] {
  const exemptionLimit = 125000
  const remaining = Math.max(0, exemptionLimit - ltcgUsedThisFY)
  if (remaining <= 0) return []

  // Only equity-class LTCG-qualifying lots
  const eligible = unrealizedGains
    .filter(g => g.wouldBeLTCG && g.unrealizedGain > 0 && isEquityClass(g.assetClass))
    .sort((a, b) => b.unrealizedGain - a.unrealizedGain)

  const suggestions: HarvestingSuggestion[] = []
  let remainingExemption = remaining

  for (const gain of eligible) {
    if (remainingExemption <= 0) break
    const gainToBook = Math.min(gain.unrealizedGain, remainingExemption)
    const gainPerUnit = (currentNav.get(gain.schemeCode) ?? gain.currentNav) - gain.effectiveCostBasis
    if (gainPerUnit <= 0) continue
    const unitsToSell = Math.floor((gainToBook / gainPerUnit) * 1000) / 1000  // round down to 3dp

    suggestions.push({
      schemeCode: gain.schemeCode,
      schemeName: ...,
      unitsToSell,
      ltcgToBook: gainToBook,
      exemptionConsumed: gainToBook,
      taxSaved: gainToBook * EQUITY_LTCG_RATE,
      reinvestInstruction: 'Reinvest proceeds in the same fund to reset cost basis',
    })
    remainingExemption -= gainToBook
  }

  return suggestions
}
```

### Pattern 6: FY-Scoped Transactions Query
**What:** Tax Intelligence page needs all transactions for the selected FY — both purchases (to build lots) and redemptions (to realize gains).
**Key insight:** Unlike XIRR which uses `get_holder_analytics_transactions` with date filters, tax computation needs the FULL purchase history (to build lots correctly), but only filters redemptions to the selected FY for realized gains display.

```typescript
// app/(dashboard)/families/[familyId]/tax/page.tsx
// Fetch ALL transactions (no date filter) to build the complete FIFO lot stack
// Then filter realized gains to current FY for display
const allTransactions = await supabase.rpc('get_holder_analytics_transactions', {
  p_holder_id: holderId,
  p_start_date: null,  // no start date — need full history for FIFO
  p_end_date: new Date().toISOString().split('T')[0],
})
```

### Pattern 7: FY Toggle with URL Search Params
**What:** 2-option FY toggle (current FY / prior FY) uses URL search param `?fy=current` (default) or `?fy=prior`. Page reads this param server-side and passes `fyBounds` to tax engine.
**Follows:** Same pattern as `period` param in holder analytics page.

### Anti-Patterns to Avoid
- **Computing tax in SQL:** Tax rules are too complex for SQL functions; use pure TypeScript
- **Fetching only filtered-date transactions for lot building:** FIFO requires ALL purchase history; redemptions must deplete lots regardless of FY
- **Using avg_cost_nav from HoldingRow for tax calculations:** `avg_cost_nav` is a weighted average — useless for FIFO. Always build lots from raw `transactions`
- **Treating each SIP installment as one lot:** Each SIP transaction IS its own lot with its own date and NAV; FIFO applies per lot not per folio
- **Rounding units prematurely:** Maintain 4 decimal precision throughout lot depletion; round only at the final display layer

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date arithmetic (holding period) | Custom day-counting | `date-fns differenceInDays` | Handles leap years, DST edge cases; already installed |
| Dialog modal | Custom overlay/portal | `components/ui/dialog.tsx` (Radix) | Already exists; SetTargetModal pattern proven |
| INR formatting | Custom number formatter | `formatINR` util (already in holdings-table) | Consistent `en-IN` locale formatting |
| FY boundary calculation | Hardcoded dates | Extend `lib/analytics/period-utils.ts` with `getFYBounds(year)` | Reuses existing getCurrentFY logic |
| Asset class determination | Per-fund manual classification | `mapCategoryToAssetClass` from `lib/analytics/asset-class-mapper.ts` | Already maps SEBI categories to asset classes |

**Key insight:** The grandfathering NAV data is pre-seeded in `grandfathering_nav` table (Phase 1). The asset class classification is already built in `asset-class-mapper.ts`. The FY boundary logic is in `period-utils.ts`. The tax engine primarily needs to wire these together correctly.

---

## Common Pitfalls

### Pitfall 1: Full History Required for FIFO Lot Building
**What goes wrong:** Developer queries transactions with FY date filter → lot stack is incomplete → FIFO gives wrong results (treats mid-history lots as oldest).
**Why it happens:** Intuition is to filter by selected FY. But FIFO needs the full purchase history to correctly sequence lots.
**How to avoid:** Always fetch ALL transactions for a folio (no start_date filter) when building lots. Apply FY filter only when presenting realized gains.
**Warning signs:** Holding period calculations showing 0 or negative days for clearly long-held funds.

### Pitfall 2: avg_cost_nav vs FIFO Cost Basis Confusion
**What goes wrong:** Using `HoldingRow.avg_cost_nav` (weighted average from the DB RPC) as the cost basis in tax calculations → wrong LTCG numbers.
**Why it happens:** avg_cost_nav is convenient and available, but it blends all purchase NAVs — useless for lot-level FIFO.
**How to avoid:** Tax engine always reconstructs lots from raw `transactions` rows, never from `HoldingRow`.
**Warning signs:** Tax amounts don't match user's CAS statement tax calculations.

### Pitfall 3: Grandfathering NAV Missing Edge Case
**What goes wrong:** Pre-2018 fund has no entry in `grandfathering_nav` (seed script may have failed for some schemes) → engine crashes or uses wrong cost basis.
**Why it happens:** mfapi.in reliability issues during Phase 1 seeding; some older/merged scheme codes may be absent.
**How to avoid:** Check for null grandfathering_nav before applying formula; fall back to actual purchase NAV; show UI callout about the fallback.
**Warning signs:** 500 errors on tax page for users with pre-2018 holdings.

### Pitfall 4: Debt Fund Asset Class Misclassification for Tax
**What goes wrong:** Hybrid fund with 40% equity classified as 'equity' by asset-class-mapper → incorrect 1-year LTCG rule applied instead of 24-month rule.
**Why it happens:** `mapCategoryToAssetClass` maps to broad 'equity'/'debt' buckets for allocation purposes, not tax purposes. Tax law has a 65% equity threshold for equity-oriented fund status.
**How to avoid:** Tax engine uses a separate `getTaxAssetClass` function that checks `funds.category` for the "hybrid" keyword and applies 65% equity threshold rule. Do not reuse `mapCategoryToAssetClass` directly for tax classification.
**Warning signs:** Hybrid aggressive fund gains classified as STCG when held 13 months.

### Pitfall 5: Partial Lot Split Floating Point Errors
**What goes wrong:** Deducting 50.334 units from a lot with 50.334 units remaining → floating point residue of 0.0000000001 units → lot not fully depleted, creates phantom micro-lots.
**Why it happens:** JavaScript floating point arithmetic on decimal unit quantities.
**How to avoid:** Use an epsilon check (`remainingUnits < 0.001`) to treat a lot as fully depleted; filter out micro-lots before unrealized gain computation.
**Warning signs:** Unrealized gain computations returning tiny non-zero values for funds you know were fully redeemed.

### Pitfall 6: FY Boundary Off-By-One
**What goes wrong:** March 31 transactions are included in the wrong FY (e.g., date comparison uses `>` instead of `>=`).
**Why it happens:** Indian FY ends on March 31; inclusive boundary required.
**How to avoid:** Use `>= April 1` and `<= March 31` for FY bounds. `getCurrentFY()` already implements this correctly — extend it to `getFYBounds(fyYear: number)` following the same pattern.

### Pitfall 7: Harvesting Suggestion Shows Negative Tax Saved
**What goes wrong:** A holding with unrealized gain where `saleNav - effectiveCostBasis` is slightly negative due to grandfathering formula → negative "tax saved" shown in harvesting card.
**Why it happens:** Grandfathering raises the cost basis above current NAV for some holdings (NAV has fallen since Jan 31 2018 but grandfathering basis = Jan 31 2018 NAV).
**How to avoid:** Filter out lots where `unrealizedGain <= 0` before generating harvesting suggestions.

---

## Code Examples

Verified from existing codebase + Indian tax law sources.

### FY Bounds Helper (extending existing period-utils.ts)
```typescript
// lib/tax/fy-utils.ts
export function getFYBounds(fyYear: number): { start: Date; end: Date; label: string } {
  // fyYear = the year FY starts. FY2025-26 → fyYear = 2025
  return {
    start: new Date(fyYear, 3, 1),        // April 1
    end:   new Date(fyYear + 1, 2, 31),   // March 31
    label: `FY${String(fyYear).slice(2)}-${String(fyYear + 1).slice(2)}`,  // "FY25-26"
  }
}

export function getCurrentFYYear(): number {
  const now = new Date()
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
}

export function getPriorFYYear(): number {
  return getCurrentFYYear() - 1
}

export function daysUntilMarch31(): number {
  const now = new Date()
  const { end } = getFYBounds(getCurrentFYYear())
  return Math.max(0, differenceInDays(end, now))
}
```

### Main Tax Engine Entry Point
```typescript
// lib/tax/engine.ts
export function computeTaxSummary(params: {
  transactions: Transaction[]         // ALL transactions (no date filter) for a folio
  grandfatheringNavs: Map<number, number>  // schemeCode → Jan 31 2018 NAV
  currentNavs: Map<number, number>    // schemeCode → today's NAV
  funds: Map<number, Fund>            // schemeCode → fund metadata
  fyBounds: { start: Date; end: Date }  // only used to filter realized gains for display
  asOf: Date                           // computation date (today or FY end)
}): TaxSummary
```

### Sell Estimator Modal (Pattern Reference)
```typescript
// components/tax/sell-tax-estimator-modal.tsx
// Follows SetTargetModal pattern exactly:
// - 'use client' directive
// - <Dialog> with <DialogTrigger> wrapping the "Estimate Tax" button
// - Uncontrolled Dialog (no open/onOpenChange — matches Phase 2 decision)
// - Units input → local state → compute TaxEstimate inline (no API call)
// - All computation in a pure function: estimateSellTax(holding, units, taxLots, navs, grandfatheringNavs)
```

### Compliance Vault Exemption Progress
```typescript
// components/tax/compliance-vault.tsx (Server Component)
// Data needed:
//   ltcgUsedThisFY: number   — sum of realized LTCG from tax engine
//   exemptionLimit: 125000
//   ltcgRemaining: exemptionLimit - ltcgUsedThisFY
//   daysUntilMarch31: number — from fy-utils.ts
//   fyEndLiability: max(ltcgUsedThisFY - exemptionLimit, 0) * 0.125
```

---

## Existing Assets to Reuse

| Asset | Location | How Used in Phase 3 |
|-------|----------|---------------------|
| `Dialog, DialogContent, DialogTrigger, DialogClose` | `components/ui/dialog.tsx` | Sell estimator modal |
| `HoldingsTable` | `components/holdings/holdings-table.tsx` | Extend with "Estimate Tax" action column |
| `Badge` | `components/ui/badge.tsx` | Days-to-March-31 badge, FY toggle chips |
| `formatINR` | inline in holdings-table | Extract to `lib/utils.ts` or duplicate in tax components |
| `getCurrentFY`, `getPeriodBounds` | `lib/analytics/period-utils.ts` | FY bounds logic for tax page |
| `mapCategoryToAssetClass` | `lib/analytics/asset-class-mapper.ts` | Base for tax asset class mapping (wrap with 65% equity check) |
| `GrandfatheringNav` type | `lib/supabase/types.ts` | Already typed; query `grandfathering_nav` table |
| `Transaction` type | `lib/supabase/types.ts` | Input to tax engine |
| `SummaryCards` | `components/analytics/summary-cards.tsx` | Adapt for capital gains summary (LTCG + STCG display) |
| `get_holder_analytics_transactions` RPC | Supabase function | Fetch ALL transactions (no start_date) for FIFO lot building |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Debt LTCG with indexation at 20% | Debt post-Apr-2023: slab rate; pre-Apr-2023 LTCG at 12.5% (no indexation) | Finance Act 2023 + Budget July 2024 | Phase 3 must handle both pre/post 2023 debt investments |
| Equity LTCG exempt entirely | Equity LTCG taxed at 10% above ₹1L | Budget 2018 | Grandfathering provision introduced |
| Equity LTCG 10% above ₹1L | Equity LTCG 12.5% above ₹1.25L | Budget July 2024 | Rate and exemption both changed |
| No wash-sale rule in India | Still no wash-sale rule | Never implemented | Sell + immediate reinvest in same fund is legal; must warn users about cost basis reset |

**Deprecated/outdated:**
- LTCG 10% rate: replaced by 12.5% from July 23, 2024 onwards
- ₹1L exemption: replaced by ₹1.25L from July 23, 2024 onwards
- Debt indexation: removed for all debt MF purchases from April 1, 2023 onwards
- 3-year holding period for debt LTCG: reduced to 24 months for pre-2023 debt by Budget July 2024

---

## Open Questions

1. **Hybrid fund 65% equity threshold verification**
   - What we know: SEBI defines equity-oriented funds as those investing ≥65% in equity shares; these get 1-year LTCG rule. Balanced hybrids (35-65%) get 24-month rule.
   - What's unclear: The `funds.category` field from AMFI/casparser may not always clearly indicate whether a specific hybrid fund qualifies as equity-oriented. The actual portfolio equity % is fund-specific and changes over time.
   - Recommendation: For Phase 3, use category keyword matching (funds with "Aggressive Hybrid" or "Equity Savings" → equity-oriented; "Balanced Hybrid", "Conservative Hybrid" → hybrid_other with 24-month rule). Document limitation clearly in tax disclaimer.

2. **Missing Jan 31 2018 NAV for some scheme codes**
   - What we know: Grandfathering NAV seed runs via mfapi.in; some older schemes may be missing.
   - What's unclear: How many users have pre-2018 holdings for schemes with missing NAV data.
   - Recommendation: Null check and fallback to actual purchase NAV with UI callout; do not block page render.

3. **Tax liability display format for "slab rate" gains**
   - What we know: Post-Apr-2023 debt gains are taxed at user's income slab (varies 5%, 20%, 30%).
   - What's unclear: Phase 3 doesn't know the user's income tax slab.
   - Recommendation: Display as "Taxable at your income slab rate" without showing a specific rate or amount for slab-rate gains. This matches how AMFI and ClearTax present it.

---

## Validation Architecture

> nyquist_validation = true (from .planning/config.json)

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.mts` (root) |
| Quick run command | `npx vitest run tests/tax/` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TAX-01 | FIFO lot building from transactions produces correct lot queue | unit | `npx vitest run tests/tax/engine.test.ts` | ❌ Wave 0 |
| TAX-01 | Equity gain classified LTCG after 365 days, STCG before | unit | `npx vitest run tests/tax/rules.test.ts` | ❌ Wave 0 |
| TAX-01 | Debt post-Apr-2023 purchase classified SLAB regardless of holding period | unit | `npx vitest run tests/tax/rules.test.ts` | ❌ Wave 0 |
| TAX-01 | `computeTaxSummary` returns correct LTCG/STCG totals for known scenario | unit | `npx vitest run tests/tax/engine.test.ts` | ❌ Wave 0 |
| TAX-02 | Grandfathering formula `MAX(cost, MIN(fmv, sale))` applied correctly to pre-2018 lot | unit | `npx vitest run tests/tax/engine.test.ts` | ❌ Wave 0 |
| TAX-02 | Missing grandfathering NAV falls back to actual cost without crash | unit | `npx vitest run tests/tax/engine.test.ts` | ❌ Wave 0 |
| TAX-03 | `estimateSellTax(units)` returns correct LTCG/STCG split for known holding | unit | `npx vitest run tests/tax/engine.test.ts` | ❌ Wave 0 |
| TAX-04 | Harvesting algorithm selects correct funds and units to consume ₹1.25L | unit | `npx vitest run tests/tax/harvesting.test.ts` | ❌ Wave 0 |
| TAX-04 | Harvesting stops when exemption fully consumed | unit | `npx vitest run tests/tax/harvesting.test.ts` | ❌ Wave 0 |
| TAX-04 | Harvesting excludes lots where `unrealizedGain <= 0` | unit | `npx vitest run tests/tax/harvesting.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/tax/`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/tax/engine.test.ts` — covers TAX-01 lot building, TAX-02 grandfathering, TAX-03 estimator
- [ ] `tests/tax/rules.test.ts` — covers TAX-01 rate/classification logic
- [ ] `tests/tax/harvesting.test.ts` — covers TAX-04 suggestion algorithm
- [ ] `lib/tax/engine.ts` — core tax engine (does not exist yet)
- [ ] `lib/tax/types.ts` — TaxLot, RealizedGain, UnrealizedGain, TaxSummary types
- [ ] `lib/tax/rules.ts` — tax rate lookup and classification
- [ ] `lib/tax/harvesting.ts` — harvesting suggestion algorithm
- [ ] `lib/tax/fy-utils.ts` — FY boundary helpers

---

## Sources

### Primary (HIGH confidence)
- Budget 2026 (Feb 1, 2026) confirmed no LTCG/STCG rate changes — [BusinessToday pre-budget analysis](https://www.businesstoday.in/union-budget/story/capital-gains-tax-and-stt-explained-what-investors-need-to-know-ahead-of-budget-2026-513821-2026-02-01) + [BusinessToday expectation article](https://www.businesstoday.in/personal-finance/tax/story/union-budget-2026-dont-expect-ltcg-rate-cut-exemption-hike-more-likely-says-investment-manager-509274-2026-01-03)
- LTCG 12.5%, STCG 20% for equity MFs — confirmed from Nippon India Tax Reckoner FY 2025-26 PDF (official AMC publication): [mf.nipponindiaim.com](https://mf.nipponindiaim.com/LearnAndInvest/TaxRateDocuments/Tax-Reckoner-for-FY-2025-26.pdf)
- Grandfathering formula `MAX(actual cost, MIN(Jan 31 2018 NAV, sale price))` — [ClearTax Section 112A](https://cleartax.in/s/long-term-capital-gains-on-shares), [Geojit support article](https://support.geojit.com/support/solutions/articles/89000006851-what-is-grandfathering-how-are-long-term-capital-gains-ltcg-treated-under-the-grandfathering-provi)
- Debt post-Apr-2023 = slab rate via Section 50AA, Finance Act 2023 — [ClearTax Debt Funds](https://cleartax.in/s/tax-on-debt-funds), [Aditya Birla Capital](https://mutualfund.adityabirlacapital.com/blog/new-tax-%20rules-on-debt-mutual-funds)
- FIFO required by Indian IT rules — [Motilal Oswal FIFO article](https://www.motilaloswal.com/learning-centre/2025/9/what-is-fifo-in-demat-mutual-fund-investors-must-know-this-before-filing-their-taxes), [Business Standard 2008 foundational article](https://www.business-standard.com/article/markets/capital-gains-is-calculated-through-fifo-method-108102601011_1.html)
- No wash-sale rule in India — [Swastika tax harvesting](https://www.swastika.co.in/blog/tax-loss-harvesting-explained-how-to-save-on-capital-gains-legally)
- Existing codebase: `lib/supabase/types.ts`, `lib/analytics/xirr.ts`, `lib/analytics/period-utils.ts`, `lib/analytics/asset-class-mapper.ts`, `components/analytics/set-target-modal.tsx` — HIGH confidence (read directly)

### Secondary (MEDIUM confidence)
- Hybrid aggressive fund (≥65% equity) = 1-year LTCG rule; balanced hybrid (35-65%) = 24-month rule — [Finnovate FY 2025-26](https://www.finnovate.in/learn/blog/mutual-fund-taxation-india-fy-2025-26)
- Debt pre-Apr-2023 LTCG at 12.5% (no indexation) for holdings > 24 months — [Bajaj Finance Debt Taxation](https://www.bajajfinserv.in/investments/taxation-on-debt-mutual-funds)
- Tax harvesting "sell and reinvest same fund" cost basis reset strategy — [Arthgyaan harvesting guide](https://arthgyaan.com/blog/save-15625-tax-harvesting-mutual-funds.html)

### Tertiary (LOW confidence)
- Exact 65% equity threshold for hybrid fund LTCG classification — flag for validation: need to confirm from SEBI circular text whether the 65% threshold applies to the fund's stated mandate or actual portfolio

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing codebase fully scanned
- Tax rules (rates, exemption limit): HIGH — confirmed from AMC official tax reckoner + Budget 2026 non-change
- Grandfathering formula: HIGH — multiple authoritative sources agree
- Debt fund post-Apr-2023 slab rate: HIGH — Finance Act 2023 Section 50AA is clear
- FIFO lot splitting algorithm: HIGH — standard IT Act requirement, well documented
- Hybrid fund tax classification threshold: MEDIUM — confirm 65% rule boundary in practice
- Architecture patterns: HIGH — follows established project patterns

**Research date:** 2026-03-20
**Valid until:** 2026-09-20 (stable tax law; next Union Budget Feb 2027 may change rates)

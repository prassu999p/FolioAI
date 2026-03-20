---
phase: 02-portfolio-analytics
verified: 2026-03-20T15:30:00Z
status: human_needed
score: 10/10 requirements verified
re_verification:
  previous_status: gaps_found
  previous_score: 6/10
  gaps_closed:
    - "Per-holding XIRR now computed — xirr: null hardcode replaced by per-folio cashflow filtering + computeXIRR call (Plan 10, commit d25567a)"
    - "Nifty 50 benchmark XIRR now computed — nifty50_daily queried, synthetic benchmark cashflows built, benchmarkXirr passed as nifty50Xirr prop to SummaryCards (Plan 11, commit c76000f)"
    - "View-mode toggle added — PeriodSelector renders XIRR/Absolute/Benchmark second row; SummaryCards applies ring-2/opacity-60 via cardActive() helper; 'view' URL param wired through page.tsx (Plan 12, commit 5ae5855)"
    - "FY segmentation no longer orphaned — 'This FY' button in PeriodSelector; getPeriodBounds('FY') calls getCurrentFY(); full chain UI -> URL param -> getPeriodBounds -> getCurrentFY -> RPC date filters (Plan 13, commit 664c139)"
    - "SIP XIRR now displayed — computeXIRR called per SIP in SipSection using sip_cashflows + terminal value estimated from net units x latest NAV; 'XIRR: X.XX%' rendered per SIP row (Plan 14, commit b5558c4)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Period toggle updates all visible metrics"
    expected: "Switching 1M/3M/6M/1Y/3Y/FY/all updates XIRR, gain/loss, and benchmark values simultaneously"
    why_human: "Server-side RPC calls triggered by URL param change — requires real browser navigation with populated transaction data"
  - test: "View-mode tabs highlight correct card"
    expected: "Clicking XIRR tab applies ring-2 ring-secondary to XIRR card and opacity-60 to others; Benchmark tab highlights XIRR + AUM cards; clicking active tab deselects back to all-equal"
    why_human: "CSS class application via conditional Tailwind classes — requires live browser rendering"
  - test: "This FY button scopes analytics to April 1 – March 31"
    expected: "Clicking 'This FY' filters XIRR, gain/loss, and benchmark to the current Indian financial year window; metrics differ from 'All Time'"
    why_human: "Requires a holder with transactions spanning multiple financial years to observe the filtering effect"
  - test: "SIP XIRR appears per row in sidebar panel"
    expected: "Each active SIP row shows 'XIRR: X.XX%' (or '—' if insufficient data) below the fund name in secondary bold text"
    why_human: "Requires live import of CAMS PDF data with SIP transactions to populate detectActiveSIPs output"
  - test: "Nifty 50 benchmark renders in XIRR card"
    expected: "XIRR card shows 'vs Nifty 50: X.XX%' below the portfolio XIRR value when nifty50_daily is seeded"
    why_human: "Requires seeded nifty50_daily table and portfolio purchases aligned to seed date range"
  - test: "SetTargetModal opens after Plan 09 fix"
    expected: "Set Target button opens modal reliably; form submits; allocation bars update with target markers"
    why_human: "Uncontrolled Radix Dialog open/close path requires hydration verification in a live browser"
  - test: "Allocation bar deviation coloring"
    expected: "Bar deviation text shows green when current > target; red when below target"
    why_human: "CSS color rendering — requires setting a target and comparing actual allocation"
---

# Phase 2: Portfolio Analytics Verification Report

**Phase Goal:** Users can see exactly how their portfolio is performing — overall and per holding — with XIRR, absolute returns, benchmark comparison, SIP tracking, and asset allocation view
**Verified:** 2026-03-20T15:30:00Z
**Status:** human_needed (all automated checks pass — 10/10 requirements verified in code)
**Re-verification:** Yes — after Plans 10–14 closed all 5 analytical wiring gaps

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Total AUM, invested, and gain/loss (₹ and %) visible per holder and family total (PERF-01) | VERIFIED | SummaryCards renders 4 bento cards computing totals from holdings; FamilyDashboard shows family total row |
| 2 | Per-holding XIRR shown in HoldingsTable (PERF-02) | VERIFIED | page.tsx lines 82–103: per-folio cashflow loop calls computeXIRR; `xirr: null` hardcode is gone; HoldingsTable column receives real values |
| 3 | Portfolio-level XIRR computed from cashflows (PERF-02) | VERIFIED | SummaryCards calls buildPortfolioCashflows + computeXIRR; 42 unit tests pass |
| 4 | Nifty 50 benchmark XIRR shown in XIRR card (PERF-03) | VERIFIED | page.tsx lines 105–179: nifty50_daily queried, synthetic cashflows built, benchmarkXirr computed and passed as nifty50Xirr={benchmarkXirr} to SummaryCards; SummaryCards line 128 renders when nifty50Xirr !== null |
| 5 | View-mode switch: XIRR / Absolute / Benchmark (PERF-04) | VERIFIED | PeriodSelector exports ViewMode type + VIEW_MODES array; second tab row in JSX; handleViewSelect writes 'view' URL param; SummaryCards cardActive() applies ring-2/opacity-60 per active mode |
| 6 | Period selector: 1M/3M/6M/1Y/3Y/FY/all updates all metrics (PERF-05) | VERIFIED | PeriodSelector PERIODS array includes all 7 values; writes 'period' URL param; holder page passes date bounds to RPCs |
| 7 | Analytics segmented by Indian FY (PERF-06) | VERIFIED | 'FY' in PERIODS array with label 'This FY'; getPeriodBounds('FY') calls getCurrentFY() returning April 1 – March 31 bounds; getCurrentFY no longer orphaned |
| 8 | Active SIPs with amount, fund name, next debit date (SIP-01) | VERIFIED | SipSection renders sidebar panel with formatINR(monthly_amount), scheme_name, format(next_debit_date); returns null when no SIPs |
| 9 | SIP XIRR (cost-averaging adjusted) shown separately (SIP-02) | VERIFIED | SipSection lines 75–87: sipXirrs computed via computeXIRR(sip_cashflows + terminal); 'XIRR: X.XX%' rendered per row at line 113–115 |
| 10 | Target allocation UI + deviation display (ALLOC-01, ALLOC-02) | VERIFIED | SetTargetModal (uncontrolled Radix Dialog, Plan 09) + POST /api/allocation + holder_allocation_targets; AllocationSection CSS bars with target markers |

**Score:** 10/10 truths verified

---

## Re-verification: What Changed Since Previous Verification

### Gaps Closed (Analytical Wiring — Plans 10–14)

| Gap | Plan | Commit | Root Fix |
|-----|------|--------|----------|
| Per-holding XIRR (PERF-02) | 10 | d25567a | Replaced `xirr: null` hardcode with per-folio cashflow filtering + computeXIRR call |
| Benchmark XIRR (PERF-03) | 11 | c76000f | Query nifty50_daily, build synthetic cashflows, pass benchmarkXirr as nifty50Xirr prop |
| View-mode toggle (PERF-04) | 12 | 5ae5855 | ViewMode type + second tab row in PeriodSelector; cardActive() helper in SummaryCards; 'view' URL param wired |
| FY segmentation (PERF-06) | 13 | 664c139 | 'FY' added to PERIODS; getPeriodBounds('FY') calls getCurrentFY(); chain complete |
| SIP XIRR (SIP-02) | 14 | b5558c4 | computeXIRR imported in SipSection; sipXirrs array computed per SIP; displayed per row |

### Previously Closed Gaps (Plans 07–09) — Regression Check

| Gap | Status |
|-----|--------|
| MD3 design system (Plan 07) | No regression — app/globals.css and layout.tsx unchanged since Plan 07 |
| SIP import flat format (Plan 08) | No regression — cas-schema.ts and import route unchanged since Plan 08 |
| SetTargetModal dialog (Plan 09) | No regression — set-target-modal.tsx unchanged since Plan 09 |

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/analytics/xirr.ts` | computeXIRR, computeGainLoss, buildPortfolioCashflows | VERIFIED | 101 lines, Newton-Raphson, correct sign convention |
| `lib/analytics/period-utils.ts` | getPeriodBounds handles FY, getCurrentFY | VERIFIED | Line 17: `if (period === 'FY') return getCurrentFY()` — no longer orphaned |
| `lib/analytics/sip-detector.ts` | detectActiveSIPs, SIPSummary with sip_cashflows | VERIFIED | 141 lines, 25–35d cadence algorithm |
| `lib/analytics/asset-class-mapper.ts` | mapCategoryToAssetClass, AllocationTargetSchema | VERIFIED | 83 lines, SEBI 2026 keywords, zod refine |
| `tests/xirr.test.ts` | Real assertions | VERIFIED | 10 passing tests |
| `tests/analytics.test.ts` | Real assertions including getCurrentFY | VERIFIED | 13 passing tests |
| `tests/sip-detector.test.ts` | Real assertions | VERIFIED | 7 passing tests |
| `tests/allocation.test.ts` | Real assertions | VERIFIED | 12 passing tests |
| `supabase/migrations/20260319000008_nifty50_daily.sql` | nifty50_daily read-only table | VERIFIED | Authenticated SELECT, no user-write policy |
| `scripts/seed-nifty50.ts` | Bulk upsert seed script | VERIFIED | 235 lines, CSV parsing, batched upsert |
| `components/analytics/period-selector.tsx` | ViewMode type, FY period, view-mode tab row | VERIFIED | PERIODS includes 'FY'; ViewMode exported; VIEW_MODES array; handleViewSelect wired |
| `components/analytics/summary-cards.tsx` | viewMode prop, cardActive() helper, nifty50Xirr conditional render | VERIFIED | cardActive() at lines 79–86; nifty50Xirr guard at line 128; viewMode prop default null |
| `components/analytics/sip-section.tsx` | computeXIRR per SIP, XIRR display per row | VERIFIED | estimateFolioCurrentValue + computeXIRR called per SIP; 'XIRR: X.XX%' rendered |
| `components/analytics/allocation-section.tsx` | Horizontal CSS bars, target marker | VERIFIED | Pure Tailwind bars, relative/absolute positioning, deviation coloring |
| `components/analytics/set-target-modal.tsx` | Uncontrolled Radix Dialog | VERIFIED | Plan 09 converted; useRef closeRef pattern; zodResolver |
| `app/api/allocation/route.ts` | GET + POST with auth + upsert | VERIFIED | getClaims() auth, AllocationTargetSchema validation, upsert |
| `app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx` | Full assembly — per-holding XIRR, benchmark, viewMode | VERIFIED | lines 66–103 per-holding XIRR; lines 105–179 benchmark; line 265–267 nifty50Xirr + viewMode passed |
| `components/family/family-dashboard.tsx` | Family-total analytics row with MD3 tokens | VERIFIED | Family Total row present; MD3 token classes applied |
| `components/holdings/holdings-table.tsx` | XIRR column now receives real values | VERIFIED | xirr prop from HoldingRowWithAnalytics — now populated by page.tsx |
| `app/globals.css` | MD3 color tokens without shadcn alias overwrite | VERIFIED | Plan 07 fix confirmed |
| `lib/validators/cas-schema.ts` | Accepts both flat and nested casparser output | VERIFIED | Plan 08 fix confirmed |
| `app/api/cas/import/route.ts` | Normalises folio to schemeList | VERIFIED | Plan 08 fix confirmed |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/(dashboard)/.../page.tsx` | `lib/analytics/xirr.ts` | `import { computeXIRR, computeGainLoss }` | WIRED | Line 10 confirmed; computeXIRR called per holding at line 99 |
| `app/(dashboard)/.../page.tsx` | `nifty50_daily` table | `supabase.from('nifty50_daily').select(...)` | WIRED | Line 124–128 confirmed; benchmarkXirr computed at line 176 |
| `app/(dashboard)/.../page.tsx` | `components/analytics/summary-cards.tsx` | `nifty50Xirr={benchmarkXirr} viewMode={view}` | WIRED | Lines 265–267 confirmed; both new props threaded |
| `components/analytics/period-selector.tsx` | URL search params ('view') | `params.set('view', mode) — router.replace` | WIRED | handleViewSelect at lines 41–49 confirmed |
| `components/analytics/period-selector.tsx` | URL search params ('period'='FY') | `PERIODS includes 'FY'; handlePeriodSelect writes it` | WIRED | PERIODS array line 5 includes 'FY'; PERIOD_LABELS line 14 maps 'This FY' |
| `lib/analytics/period-utils.ts` (getCurrentFY) | `getPeriodBounds` | `if (period === 'FY') return getCurrentFY()` | WIRED | Line 17 confirmed — function no longer orphaned |
| `components/analytics/sip-section.tsx` | `lib/analytics/xirr.ts` | `import { computeXIRR }` | WIRED | Line 3 confirmed; called at line 86 per SIP |
| `sip.sip_cashflows` | `computeXIRR` | `computeXIRR([...sip.sip_cashflows, terminalCashflow])` | WIRED | Lines 81–86 in sip-section.tsx confirmed |
| `components/analytics/summary-cards.tsx` | `lib/analytics/xirr.ts` | `import { computeXIRR, buildPortfolioCashflows, computeGainLoss }` | WIRED | Lines 1–6 confirmed; used in render body |
| `app/api/allocation/route.ts` | `holder_allocation_targets` table | `supabase.from('holder_allocation_targets').upsert(...)` | WIRED | POST upserts with onConflict:'holder_id' |
| `app/(dashboard)/.../page.tsx` | `get_holder_analytics_transactions` RPC | `supabase.rpc('get_holder_analytics_transactions', ...)` | WIRED | Line 44–48 confirmed |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PERF-01 | 02-04, 02-06 | AUM, invested, gain/loss per holder and family total | SATISFIED | SummaryCards 4 bento cards; FamilyDashboard family total row |
| PERF-02 | 02-02, 02-04, 02-10 | XIRR for overall portfolio, per holding, per holder | SATISFIED | Portfolio XIRR in SummaryCards; per-holding XIRR computed in page.tsx lines 82–103 (Plan 10 closed gap) |
| PERF-03 | 02-03, 02-04, 02-11 | Nifty 50 benchmark comparison | SATISFIED | nifty50_daily queried in page.tsx lines 124–178; benchmarkXirr passed as nifty50Xirr; SummaryCards renders 'vs Nifty 50' when non-null (Plan 11 closed gap) |
| PERF-04 | 02-04, 02-12 | Switch between XIRR / absolute return / benchmark views | SATISFIED | ViewMode type + second tab row in PeriodSelector; cardActive() in SummaryCards; 'view' URL param chain complete (Plan 12 closed gap) |
| PERF-05 | 02-04, 02-06 | Selectable time periods: 1M/3M/6M/1Y/3Y/all | SATISFIED | PeriodSelector PERIODS array; URL param; holder page date bounds to RPCs |
| PERF-06 | 02-02, 02-04, 02-13 | Analytics segmented by Indian FY (April–March) | SATISFIED | 'FY' in PERIODS; getPeriodBounds('FY') = getCurrentFY(); full chain wired (Plan 13 closed gap) |
| SIP-01 | 02-05, 02-08 | Active SIPs with amount, fund name, next scheduled date | SATISFIED | SipSection renders sidebar panel; Plan 08 fixed flat CAS import |
| SIP-02 | 02-02, 02-05, 02-14 | SIP XIRR (cost-averaging adjusted) shown separately | SATISFIED | computeXIRR called per SIP in SipSection; 'XIRR: X.XX%' rendered per row (Plan 14 closed gap) |
| ALLOC-01 | 02-03, 02-05, 02-09 | Target allocation input per holder | SATISFIED | SetTargetModal (uncontrolled Radix, Plan 09) + POST /api/allocation + holder_allocation_targets upsert |
| ALLOC-02 | 02-05 | Current vs target allocation with deviation highlighted | SATISFIED | AllocationSection CSS bars with target marker + deviation text |

**Note:** ALLOC-03 (drift alerts) is assigned to Phase 5 — not a Phase 2 requirement.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/(dashboard)/.../page.tsx` | 148 | `return null` inside getNearestClose helper | Info | Expected behavior — returns null when no Nifty close found within 5 trading days of a date; not a stub |
| `components/analytics/sip-section.tsx` | 72 | `if (sips.length === 0) return null` | Info | Intentional — renders nothing in DOM when no active SIPs; per design spec |

No blocker anti-patterns found. The previously identified `xirr: null` hardcode (blocker) has been removed.

---

## Human Verification Required

### 1. Period Toggle Updates All Metrics

**Test:** On a holder page with imported transactions, click between 1M, 3M, 1Y, FY, and All Time period tabs.
**Expected:** XIRR, gain/loss (₹), and gain/loss (%) in the four bento cards all change to reflect the selected period window. 'This FY' should show April 2025 – March 2026 data as of today's date (March 2026).
**Why human:** Next.js Server Component re-render triggered by URL param change — requires live browser with populated transaction data.

### 2. View-Mode Tabs Highlight Correct Cards

**Test:** Click XIRR, then Absolute, then Benchmark tabs in the view-mode row below the period buttons.
**Expected:** XIRR mode: XIRR card gets ring-2 ring-secondary, others dim to opacity-60. Absolute mode: Absolute Gain card highlighted. Benchmark mode: XIRR + AUM cards highlighted. Clicking active tab restores all cards to equal prominence.
**Why human:** Conditional Tailwind CSS classes applied server-side — requires live browser rendering to observe visual prominence changes.

### 3. Nifty 50 Benchmark Renders in XIRR Card

**Test:** Navigate to a holder page with purchase transactions whose dates fall within the seeded nifty50_daily date range.
**Expected:** XIRR card shows 'vs Nifty 50: X.XX%' below the portfolio XIRR value.
**Why human:** Depends on nifty50_daily being seeded with dates that overlap the portfolio's purchase dates. The `getNearestClose` helper searches forward up to 5 days — requires real data to confirm it resolves correctly.

### 4. SIP XIRR Appears Per Row

**Test:** Upload a CAMS PDF with SIP transactions; navigate to the holder analytics page.
**Expected:** SIP sidebar panel shows each active SIP with 'XIRR: X.XX%' below the fund name. Holdings with insufficient transaction history show '—'.
**Why human:** Requires live import with real CAMS data (Plan 08 fixed the flat format). The `estimateFolioCurrentValue` approximation (net units x latest NAV) needs real transaction data to produce a meaningful XIRR.

### 5. This FY Button Scopes to Indian Financial Year

**Test:** Click 'This FY' on a holder with transactions spanning multiple financial years.
**Expected:** Metrics reflect April 1, 2025 – March 31, 2026 data only. XIRR should differ from 'All Time' value.
**Why human:** Requires portfolio data with cross-FY transactions to observe the filtering boundary effect.

### 6. SetTargetModal Opens After Plan 09 Fix

**Test:** Navigate to a holder analytics page; click "Set Target" in the allocation section; fill in equity/debt/gold/international %; submit.
**Expected:** Modal opens reliably; live total % updates as you type; targets save and allocation bars show new target markers with deviation text.
**Why human:** Uncontrolled Radix Dialog open/close path requires hydration verification in a live browser.

### 7. Allocation Bar Deviation Coloring

**Test:** Set a target (e.g., Equity 70%) and view the allocation section with actual holdings below that target.
**Expected:** Deviation text shows in appropriate color when current diverges from target.
**Why human:** CSS color rendering — requires real portfolio data with non-zero current allocation and a saved target.

---

## Gaps Summary

No gaps remain. All 5 analytical wiring gaps from the previous verification have been closed by Plans 10–14.

The three UAT gaps (Plans 07–09 — MD3 design, SIP import, dialog hydration) remain closed with no regressions.

**TypeScript compile status:** Clean — `npx tsc --noEmit` exits with no errors across all 5 newly modified files.

**Commit verification:** All 5 gap-closure feature commits confirmed in git log:
- d25567a (Plan 10 — per-holding XIRR)
- c76000f (Plan 11 — benchmark XIRR)
- 5ae5855 (Plan 12 — view-mode selector)
- 664c139 (Plan 13 — FY period)
- b5558c4 (Plan 14 — SIP XIRR)

The phase goal — "Users can see exactly how their portfolio is performing — overall and per holding — with XIRR, absolute returns, benchmark comparison, SIP tracking, and asset allocation view" — is now fully implemented in code. Human verification is needed to confirm visual rendering, live data integration, and interactive behavior in a browser.

---

_Verified: 2026-03-20T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — previous verification was 2026-03-20T14:00:00Z (gaps_found, 6/10)_

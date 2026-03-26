---
phase: 03-tax-engine
verified: 2026-03-26T02:29:21Z
status: gaps_found
score: 3/5 must-haves verified
gaps:
  - truth: "Grandfathering (MAX/MIN formula) is applied in the Sell Tax Estimator modal for pre-Feb 2018 holdings"
    status: failed
    reason: "sell-tax-estimator-modal.tsx hardcodes grandfatheringNav: null and purchaseDate: new Date('2020-01-01') with inline comments 'Would fetch from DB' and 'Simplified - would use actual lot data'. Grandfathering is never applied in the modal regardless of holding age. TAX-02 requires it at this surface."
    artifacts:
      - path: "components/tax/sell-tax-estimator-modal.tsx"
        issue: "Lines 38-49: purchaseDate hardcoded to 2020-01-01, grandfatheringNav hardcoded to null, assetClass always 'debt' (getTaxAssetClass('') returns 'debt'). These are commented as simplifications awaiting real lot data."
    missing:
      - "Pass actual tax lot data (purchaseDate, purchaseNav, grandfatheringNav, assetClass) from holdings-table.tsx into SellTaxEstimatorModal props"
      - "Or add an API route that fetches the oldest FIFO lot for a holding and returns its purchase date, nav, and grandfathering nav"
      - "Replace hardcoded purchaseDate and grandfatheringNav with real values from the holding's tax lot"

  - truth: "Sell Tax Estimator modal computes LTCG/STCG classification using the holding's actual asset class"
    status: failed
    reason: "getTaxAssetClass('') is called with an empty string, which falls through all category matches and returns 'debt' (the conservative default). This means every holding in the modal is treated as a debt fund, producing incorrect STCG/SLAB classification for equity funds."
    artifacts:
      - path: "components/tax/sell-tax-estimator-modal.tsx"
        issue: "Line 39: getTaxAssetClass('') — empty string passed, always returns 'debt'. The holding prop contains scheme_name but not category. Category is needed for correct classification."
    missing:
      - "Pass category or taxAssetClass into SellTaxEstimatorModal as a prop"
      - "Resolve category in holdings-table.tsx from available fund data, or fetch it when building the holding row"

  - truth: "TAX-05: User can generate and download an ITR-ready capital gains statement in Schedule CG format"
    status: failed
    reason: "TAX-05 is listed as Pending in REQUIREMENTS.md and was never claimed by any plan in this phase. No ITR download component, API route, or Schedule CG formatter exists. The Compliance Vault explicitly defers it to v2 with a comment."
    artifacts:
      - path: "components/tax/compliance-vault.tsx"
        issue: "Line 6 comment: 'Replaces ITR download (deferred to v2)'. No ITR feature exists anywhere."
    missing:
      - "This requirement was never in scope for any phase 03 plan — must be addressed in a future plan or phase"
      - "Flag as out-of-scope for phase 03, or create a gap-closure plan to implement Schedule CG export"

human_verification:
  - test: "Open Sell Tax Estimator for a pre-Feb 2018 equity holding and enter units to sell"
    expected: "LTCG Gain row appears (not STCG), LTCG Tax Rate shows 12.5%, Grandfathering Applied badge appears"
    why_human: "Cannot verify classification correctness without live data; code analysis shows it would display STCG due to debt default and 2020 date"
  - test: "Navigate to Tax page, switch to Prior FY, verify Capital Gains heading shows correct FY label"
    expected: "Heading reads 'Capital Gains FY24-25' when Prior FY is selected"
    why_human: "This gap was fixed by plan 03-05; UAT screenshot would confirm it works in browser"
---

# Phase 3: Tax Engine Verification Report

**Phase Goal:** Users can see exactly what their tax liability is on every holding — calculated correctly per Indian rules — and receive actionable LTCG harvesting suggestions before March 31
**Verified:** 2026-03-26T02:29:21Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | LTCG/STCG breakdown per holding displayed on Tax Intelligence page, calculated correctly per Indian rules | ✓ VERIFIED | `computeTaxSummary` in engine.ts runs FIFO depletion with correct classification (equity: 365d, debt: 730d, post-Apr-2023 debt: slab). Tax page fetches real transactions, grandfathering navs, and renders CapitalGainsSummary with live totals. |
| 2   | Grandfathering (MAX/MIN formula) applied for pre-Feb 2018 holdings in Tax page and Engine | ✓ VERIFIED | `applyGrandfathering(purchaseNav, grandfatheringNav, saleNav)` in rules.ts implements `MAX(actual, MIN(jan31NAV, saleNav))` correctly. Engine fetches `grandfathering_nav` table and applies it in `depleteLots` and `computeUnrealizedGains`. |
| 3   | Grandfathering applied in Sell Tax Estimator modal for pre-Feb 2018 holdings | ✗ FAILED | Modal hardcodes `grandfatheringNav: null` and `purchaseDate: new Date('2020-01-01')`. Code comments confirm this is a known simplification. |
| 4   | Sell Tax Estimator modal shows correct LTCG/STCG split with applicable rates | ✗ PARTIAL | UI rows for LTCG Gain, LTCG Tax Rate, STCG Gain, STCG Tax Rate are wired and render correctly from `TaxEstimationResult`. However the classification is always wrong because `getTaxAssetClass('')` returns `'debt'` for every holding — equity funds will show as STCG/SLAB instead of LTCG. |
| 5   | User receives LTCG harvesting suggestions with fund, units, LTCG booked, tax saved, reinvest instruction | ✓ VERIFIED | `computeHarvestingSuggestions` wired in HarvestingHero. Greedy fill algorithm, suggestions show fund name, `unitsToSell.toFixed(3)`, `ltcgToBook`, `taxSaved`, `reinvestInstruction`. Page passes real unrealized gains from engine. |
| 6   | FY toggle switches between current and prior FY, all data updates | ✓ VERIFIED | `fyBounds` computed from URL param (`?fy=prior`) via `getPriorFYBounds()` / `getCurrentFYBounds()`. Passed to `computeTaxSummary`, `CapitalGainsSummary` (fyLabel), and `HarvestingHero` (isPriorFY). |
| 7   | ITR-ready capital gains statement download (Schedule CG format) | ✗ FAILED | TAX-05 not implemented. Compliance Vault comment confirms deferred to v2. No plan in phase 03 claimed TAX-05. |

**Score:** 3/5 requirements fully verified (TAX-01, TAX-02 at engine level, TAX-04)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `lib/tax/types.ts` | TaxLot, RealizedGain, UnrealizedGain, TaxSummary, HarvestingSuggestion, TaxEstimationResult, FYBounds interfaces | ✓ VERIFIED | All 8 interfaces present and exported. Follows xirr.ts pattern. |
| `lib/tax/rules.ts` | classifyGain, applyGrandfathering, getTaxAssetClass, LTCG/STCG constants | ✓ VERIFIED | All functions implemented. Grandfathering formula correct. Hybrid 65% threshold handled. |
| `lib/tax/engine.ts` | buildTaxLots, depleteLots, computeUnrealizedGains, computeTaxSummary, estimateSellTax | ✓ VERIFIED | FIFO depletion implemented. `estimateSellTax` returns `TaxEstimationResult` shape with ltcgGain/stcgGain split (gap closure 03-05 applied). |
| `lib/tax/fy-utils.ts` | getFYBounds, getCurrentFYBounds, getPriorFYBounds, daysUntilMarch31 | ✓ VERIFIED | All functions present. April-March FY boundary correct. |
| `lib/tax/harvesting.ts` | computeHarvestingSuggestions, greedy fill algorithm | ✓ VERIFIED | Sorts by unrealized gain descending, fills ₹1.25L exemption greedily, floors units to 3 decimal places. |
| `app/(dashboard)/families/[familyId]/tax/page.tsx` | Server component, real DB fetch, FY toggle, tax computation | ✓ VERIFIED | Fetches transactions (full history for FIFO), grandfathering_nav, nav, funds tables. Passes real data to all components. `fyLabel={fyBounds.label}` wired (gap 03-05). |
| `components/tax/capital-gains-summary.tsx` | LTCG/STCG breakdown card, fyLabel prop | ✓ VERIFIED | `fyLabel` prop required and used in heading. ₹ formatting with tabular-nums. Gap closure 03-05 confirmed. |
| `components/tax/compliance-vault.tsx` | Exemption progress bar, days countdown, tax liability | ✓ VERIFIED | Progress bar, remaining exemption, March 31 countdown badge, estimated tax liability display all present. |
| `components/tax/fy-toggle.tsx` | 2-option toggle, URL param update | ✓ VERIFIED | Updates `?fy=prior` / removes param. Uses `useRouter` and `useSearchParams`. |
| `components/tax/harvesting-hero.tsx` | Dark bg-primary card, suggestions list, read-only prior FY mode | ✓ VERIFIED | bg-primary styling, execution plan card, suggestions map with fund/units/ltcg, reinvest instruction, isPriorFY read-only mode. |
| `components/tax/sell-tax-estimator-modal.tsx` | Real-time estimator, LTCG/STCG rows, DialogTitle, grandfathering | ✗ PARTIAL | UI rows and DialogTitle present (gap 03-05 applied). Calculation uses hardcoded date/null grandfathering/wrong asset class. TAX-02 not satisfied for this surface. |
| `components/holdings/holdings-table.tsx` | "Estimate Tax" button per row | ✓ VERIFIED | `SellTaxEstimatorModal` imported and rendered on line 86 with "Estimate Tax" button. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `tax/page.tsx` | `lib/tax/engine.ts` | `computeTaxSummary(...)` | ✓ WIRED | Called with real transactions, grandfatheringNavs, currentNavs, assetClasses, fyBounds |
| `tax/page.tsx` | `components/tax/capital-gains-summary.tsx` | `fyLabel={fyBounds.label}` | ✓ WIRED | Gap 03-05 confirmed in code at line 161 |
| `tax/page.tsx` | `components/tax/harvesting-hero.tsx` | `unrealizedGains`, `ltcgUsedThisFY`, `isPriorFY` | ✓ WIRED | All props passed at lines 176-182 |
| `lib/tax/harvesting.ts` | `components/tax/harvesting-hero.tsx` | `computeHarvestingSuggestions(...)` | ✓ WIRED | Called in component with all 4 required args |
| `components/tax/sell-tax-estimator-modal.tsx` | `lib/tax/engine.ts` | `estimateSellTax(...)` returning ltcgGain/stcgGain | ✓ WIRED | Function imported and called; return fields correctly consumed |
| `sell-tax-estimator-modal.tsx` | Real tax lot data | purchaseDate, grandfatheringNav from DB | ✗ NOT_WIRED | Modal uses hardcoded `purchaseDate: new Date('2020-01-01')` and `grandfatheringNav: null`; no prop or API fetch supplies real lot data |
| `components/holdings/holdings-table.tsx` | `sell-tax-estimator-modal.tsx` | `SellTaxEstimatorModal` wrap with holding prop | ✓ WIRED | Import confirmed at line 2, usage at lines 86-90 |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | -------------- | ----------- | ------ | -------- |
| TAX-01 | 03-01, 03-02 | LTCG/STCG breakdown per holding, correct Indian rules | ✓ SATISFIED | Engine FIFO + classification correct. Tax page renders breakdown. FY toggle wired. |
| TAX-02 | 03-01, 03-03 | Grandfathering applied for pre-Feb 2018 holdings | ✗ PARTIAL | Correct in engine/tax page. NOT applied in sell estimator modal — hardcoded `grandfatheringNav: null`. TAX-02 requires it at both surfaces. |
| TAX-03 | 03-03, 03-05 | Real-time sell tax estimator with correct breakdown | ✗ PARTIAL | UI structure correct (gap 03-05 applied). Classification and grandfathering use wrong inputs — every holding classified as debt due to `getTaxAssetClass('')`. Numbers shown are incorrect for equity funds. |
| TAX-04 | 03-04 | LTCG harvesting suggestions with units/LTCG/tax saved | ✓ SATISFIED | `computeHarvestingSuggestions` greedy algorithm wired end-to-end. Shows fund, units (3dp), LTCG, exemption, tax saved, reinvest instruction. |
| TAX-05 | ORPHANED — no plan claimed it | ITR-ready capital gains statement, Schedule CG format | ✗ NOT IMPLEMENTED | No plan in phase 03 addresses TAX-05. Compliance Vault comment explicitly defers to v2. This requirement remains open for a future phase. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `components/tax/sell-tax-estimator-modal.tsx` | 42 | `purchaseDate: new Date('2020-01-01') // Simplified - would use actual lot data` | Blocker | Holding period always calculated from 2020; pre-2018 holdings will never show grandfathering; newer holdings may get wrong LTCG classification |
| `components/tax/sell-tax-estimator-modal.tsx` | 39 | `getTaxAssetClass('')` — empty string, always returns `'debt'` | Blocker | All equity funds treated as debt; LTCG rate (12.5%) never shown; users see incorrect STCG/SLAB classification |
| `components/tax/sell-tax-estimator-modal.tsx` | 46 | `grandfatheringNav: null // Would fetch from DB` | Blocker | Grandfathering never applied in modal; cost basis always uses raw purchaseNav; TAX-02 requirement not met at this surface |
| `tests/tax/engine.test.ts` | 4-11 | All tests are `it.todo()` stubs | Warning | No automated verification of FIFO logic, grandfathering formula, or tax summary aggregation |

### Human Verification Required

#### 1. Sell Tax Estimator — Pre-2018 Equity Holding

**Test:** Open Estimate Tax modal on an equity holding purchased before Feb 2018. Enter any number of units.
**Expected:** LTCG Gain row appears (fund held >365 days from 2020 date), LTCG Tax Rate shows 12.5%. Grandfathering Applied badge appears.
**Why human:** Code analysis shows the modal will classify it as STCG/SLAB (debt default) and not apply grandfathering; a human test would confirm the severity of the user experience issue.

#### 2. Capital Gains Heading — Prior FY Label

**Test:** Navigate to Tax Intelligence page, click Prior FY toggle.
**Expected:** Capital Gains card heading shows "Capital Gains FY24-25" (not "Capital Gains FY26" which was the pre-gap-closure behavior).
**Why human:** Gap closure plan 03-05 is confirmed in code (`fyLabel={fyBounds.label}` present), but a visual browser confirm is the cleanest verification.

#### 3. Harvesting Suggestions — Data Accuracy

**Test:** On Tax page with real portfolio data, verify the execution plan shows correct fund names and unit counts.
**Expected:** Fund names match actual holdings. Units to sell (3dp) multiplied by gain-per-unit equals the LTCG to book shown.
**Why human:** Mathematical cross-check of live data cannot be done programmatically without access to DB.

---

## Gaps Summary

Three gaps block full goal achievement:

**Gap 1 — TAX-02/TAX-03: Sell Tax Estimator uses fabricated inputs (Blocker)**

The sell estimator modal calculates a number but it is wrong for most users. The modal hardcodes `purchaseDate: new Date('2020-01-01')` and `grandfatheringNav: null` with explicit comments acknowledging these are simplified placeholders. Additionally `getTaxAssetClass('')` always returns `'debt'`, causing every equity fund to be misclassified as STCG/SLAB. The modal appears functional but produces incorrect estimates. This violates both TAX-02 (grandfathering must be applied) and TAX-03 (estimate must be correct). The fix requires passing real lot data — purchase date, nav, asset class, and grandfathering nav — from the holdings table row into the modal props.

**Gap 2 — TAX-05: ITR download not implemented (Out of scope for phase)**

TAX-05 (Schedule CG format export) was never claimed by any plan in phase 03. The Compliance Vault component explicitly defers it with a comment. REQUIREMENTS.md lists it as Pending. This is not a regression — it was never attempted. It must be addressed in a future plan or phase.

**Gap 3 — Tests are all stubs**

All three test files (`engine.test.ts`, `rules.test.ts`, `harvesting.test.ts`) contain only `it.todo()` stubs. This is a warning-level concern: the FIFO algorithm, grandfathering formula, and classification logic have no automated coverage. Any future refactor has no safety net.

---

_Verified: 2026-03-26T02:29:21Z_
_Verifier: Claude (gsd-verifier)_

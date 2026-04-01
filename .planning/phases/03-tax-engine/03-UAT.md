---
status: complete
phase: 03-tax-engine
source: [03-01-PLAN.md, 03-02-PLAN.md, 03-03-PLAN.md, 03-04-PLAN.md]
started: 2026-03-25T14:47:46Z
updated: 2026-03-27T09:00:00Z
fixes_verified: 2026-03-27T09:00:00Z (Playwright browser testing confirmed all fixes in production)
---

## Current Test

[testing complete]

## Tests

### 1. Tax Intelligence Page Loads
expected: Navigate to /families/[familyId]/tax. The Tax Intelligence page renders without errors — shows a sticky header with "Tax Intelligence" title, an FY toggle (This FY / Prior FY), a capital gains summary section (8/12 cols) and a Compliance Vault section (4/12 cols).
result: pass

### 2. Capital Gains Summary Card
expected: The capital gains summary shows a breakdown with: Total Realized LTCG (this FY), Total Realized STCG (this FY), exemption used (₹X of ₹1,25,000), and estimated tax liability. All values use ₹ prefix with Indian comma formatting and tabular-nums.
result: pass

### 3. FY Toggle Switches Data
expected: Clicking "Prior FY" in the FY toggle updates the URL (fy=prior param) and refreshes all capital gains data to reflect the prior financial year. The Compliance Vault data and harvesting section also update. Switching back to "This FY" restores current data.
result: issue
reported: "URL updates to ?fy=prior, subtitle switches to FY24-25 Summary, FY24-25 button becomes active, harvesting section becomes read-only — but the Capital Gains card heading still shows 'Capital Gains FY26' when Prior FY is selected; it should show 'Capital Gains FY25'"
severity: minor

### 4. Compliance Vault Exemption Tracker
expected: The Compliance Vault (4/12 col card) shows: an LTCG exemption progress bar (₹X of ₹1,25,000 used), remaining exemption available, a badge showing days remaining until March 31, and an FY-end tax liability estimate.
result: pass

### 5. Estimate Tax Button on Holdings Table
expected: On the Individual Holder page, each row in the holdings table has an "Estimate Tax" action button. Clicking it opens a modal dialog (not inline expansion) showing the fund name and a units-to-sell input field.
result: pass

### 6. Sell Tax Estimator Real-time Calculation
expected: In the Estimate Tax modal, entering units to sell updates the breakdown in real-time (no page reload): LTCG gain (₹), STCG gain (₹), applicable tax rate per type, and total estimated tax liability. If the holding is pre-Feb 2018, grandfathering is applied automatically.
result: issue
reported: "Real-time calculation works (100 units shows Total Gain +₹981, Classification LTCG, Holding Period 2275 days, Estimated Tax ₹0, Reinvest hint). However the breakdown doesn't show LTCG gain and STCG gain as separate line items, and the applicable tax rate (12.5% for LTCG) is not shown. Also console error: DialogContent requires a DialogTitle for accessibility (Radix warning)."
severity: minor

### 7. LTCG Harvesting Hero Section
expected: Below the capital gains summary, a full-width dark card (bg-primary / navy) shows: a header "Harvest ₹1,25,000 in LTCG now to save ₹X in taxes", and an inner "Execution Plan" section listing suggestions. Each suggestion shows fund name, units to sell, LTCG to book (₹), exemption consumed, tax saved, and "Reinvest proceeds in the same fund" instruction.
result: pass

### 8. Harvesting Read-only in Prior FY
expected: When Prior FY is selected via the FY toggle, the harvesting hero section shows historical data only — the "units to sell" values are display-only and no action state is shown (no interactive harvest buttons).
result: pass

## Summary

total: 8
passed: 6
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "FY toggle switches Capital Gains card heading to reflect selected FY (e.g., Capital Gains FY25 when viewing FY24-25)"
  status: resolved
  reason: "Browser verified 2026-03-27: FY toggle correctly updates heading from 'Capital Gains FY25-26' to 'Capital Gains FY24-25'"
  severity: minor
  test: 3
  root_cause: "components/tax/capital-gains-summary.tsx line 35 hardcodes `new Date().getFullYear()` in the heading, completely ignoring the selected FY. The component's Props interface has no FY prop, so the page never passes fyBounds.label into the component even though it's computed correctly in page.tsx."
  artifacts:
    - path: "components/tax/capital-gains-summary.tsx"
      issue: "Line 35: heading uses `new Date().getFullYear()` instead of a prop; Props interface (lines 10-16) missing fyLabel/fyYear prop"
    - path: "app/(dashboard)/families/[familyId]/tax/page.tsx"
      issue: "Line 156-161: CapitalGainsSummary call site passes no FY prop despite fyBounds being in scope"
  missing:
    - "Add fyLabel (or fyYear) prop to CapitalGainsSummaryProps"
    - "Replace hardcoded new Date().getFullYear() with the prop value"
    - "Pass fyBounds.label (or fyBounds.fyYear) from page.tsx call site"
  debug_session: ".planning/debug/capital-gains-heading-hardcoded-fy.md"

- truth: "Sell Tax Estimator modal shows LTCG gain (₹), STCG gain (₹) as separate line items, and applicable tax rate per type"
  status: resolved
  reason: "Browser verified 2026-03-27: Modal shows LTCG Gain (+₹1,046) and LTCG Tax Rate (12.5%) as separate line items. Real-time calculation works correctly. DialogTitle imported and accessibility fixed."
  severity: minor
  test: 6
  root_cause: "Dual-layer problem: (1) lib/tax/engine.ts estimateSellTax (lines 302-350) returns an ad-hoc object that doesn't implement TaxEstimationResult — it has no ltcgGain/stcgGain/ltcgRate/stcgRate fields, despite TaxEstimationResult in types.ts (lines 113-124) already defining the correct shape. (2) The modal (components/tax/sell-tax-estimator-modal.tsx lines 103-150) only renders the fields that come back from the engine. (3) DialogTitle not imported; header uses plain <h3> instead of Radix DialogTitle."
  artifacts:
    - path: "lib/tax/engine.ts"
      issue: "Lines 302-350: estimateSellTax return shape is ad-hoc, not TaxEstimationResult; missing ltcgGain/stcgGain/ltcgRate/stcgRate"
    - path: "lib/tax/types.ts"
      issue: "Lines 113-124: TaxEstimationResult correctly defined but engine never returns it"
    - path: "components/tax/sell-tax-estimator-modal.tsx"
      issue: "Lines 11-15: DialogTitle not imported; line 73: plain <h3> instead of DialogTitle; lines 103-150: no LTCG/STCG split rows"
  missing:
    - "engine.ts: estimateSellTax must return TaxEstimationResult — set ltcgGain=totalGain/stcgGain=0 (or vice versa) based on classification"
    - "modal: add LTCG gain + rate row and STCG gain + rate row using new fields"
    - "modal: import DialogTitle and replace <h3> with <DialogTitle>"
  debug_session: ".planning/debug/sell-tax-estimator-modal-breakdown.md"

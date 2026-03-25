---
status: complete
phase: 03-tax-engine
source: [03-01-PLAN.md, 03-02-PLAN.md, 03-03-PLAN.md, 03-04-PLAN.md]
started: 2026-03-25T14:47:46Z
updated: 2026-03-25T14:55:00Z
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
  status: failed
  reason: "User reported: URL updates to ?fy=prior, subtitle switches to FY24-25 Summary, FY24-25 button becomes active, harvesting section becomes read-only — but the Capital Gains card heading still shows 'Capital Gains FY26' when Prior FY is selected; it should show 'Capital Gains FY25'"
  severity: minor
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Sell Tax Estimator modal shows LTCG gain (₹), STCG gain (₹) as separate line items, and applicable tax rate per type"
  status: failed
  reason: "User reported: Real-time calculation works (100 units shows Total Gain +₹981, Classification LTCG, Holding Period 2275 days, Estimated Tax ₹0, Reinvest hint). However the breakdown doesn't show LTCG gain and STCG gain as separate line items, and the applicable tax rate (12.5% for LTCG) is not shown. Also console error: DialogContent requires a DialogTitle for accessibility (Radix warning)."
  severity: minor
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

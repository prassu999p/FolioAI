---
status: complete
phase: 02-portfolio-analytics
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md, 02-06-SUMMARY.md]
started: 2026-03-20T04:14:09Z
updated: 2026-03-20T04:19:47Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Clear ephemeral state. Start the app from scratch (npm run dev + python api/main.py). Server boots without errors and the family dashboard loads live data.
result: pass

### 2. Period Selector
expected: On the holder analytics page (/families/.../holders/...), 6 period buttons appear: 1M, 3M, 6M, 1Y, 3Y, All Time. Clicking one updates the URL (?period=1m etc.) and highlights that button as active. The page metrics update to reflect the selected period.
result: pass

### 3. Summary Cards bento grid
expected: Below the period selector, 4 metric cards appear: Total AUM (with a trending_up icon), Total Invested, Absolute Gain (green if positive, red if negative), and XIRR %. All numbers use tabular-nums formatting.
result: pass

### 4. Holdings Table with XIRR
expected: Holdings table shows 5 columns: Asset Name (fund + fund house), Units, Current NAV, Value, and XIRR. The XIRR column shows a percentage for each holding — green for positive, red for negative. Shows "—" when XIRR cannot be computed.
result: pass

### 5. SIP Section
expected: If the holder has recurring SIP transactions, a SIP panel appears in the right sidebar alongside the holdings table. It shows each detected active SIP with the fund name and inferred monthly amount. If there are no active SIPs, the sidebar panel is completely absent from the page (no empty card/placeholder).
result: issue
reported: "even though I have uploaded CAMS with SIP its not not showing up"
severity: major

### 6. Allocation Section
expected: Below the holdings+SIP row, an Asset Allocation section appears with 4 horizontal bars: Equity, Debt, Gold, International. Each bar shows the current allocation % as a filled bar. If a target has been set, a vertical marker line shows the target position, and deviation text shows +N% / -N% in green/red.
result: pass

### 7. Set Target Modal
expected: A "Set Target" button (or similar) opens a modal with 4 inputs: Equity %, Debt %, Gold %, International %. The modal shows a live total % as you type. If the total exceeds 100%, an error is shown. Submitting saves the targets and the allocation bars update to show the new target markers.
result: issue
reported: "button is not responsive"
severity: major

### 8. Family Dashboard Total Row
expected: On the family dashboard page (/families/...), a "Family Total" row appears above (or below) the individual holder rows. It shows the sum of all holders' AUM, total invested, and overall gain/loss (₹ and %). Gain/loss is green if positive, red if negative.
result: issue
reported: "page loaded but UI is not according to the plan which I shared earlier — page looks unstyled, no MD3 design system, no proper card layout, plain text rendering"
severity: major

## Summary

total: 8
passed: 5
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "The family dashboard and all pages render with the MD3 design system — Manrope/Work Sans fonts, MD3 color tokens, proper card layout matching the frontend.html reference"
  status: failed
  reason: "User reported: page loaded but UI is not according to the plan which I shared earlier — page looks unstyled, no MD3 design system, no proper card layout, plain text rendering"
  severity: major
  test: 8
  artifacts: []
  missing: []

- truth: "SIP section shows active SIPs detected from imported CAMS transactions"
  status: failed
  reason: "User reported: even though I have uploaded CAMS with SIP its not not showing up"
  severity: major
  test: 5
  artifacts: []
  missing: []

- truth: "Set Target button opens modal for editing allocation targets"
  status: failed
  reason: "User reported: button is not responsive"
  severity: major
  test: 7
  artifacts: []
  missing: []


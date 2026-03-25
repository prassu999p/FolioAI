---
status: complete
phase: 05-goals-alerts-and-broker-integration
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md, 05-06-SUMMARY.md]
started: 2026-03-25T13:00:00Z
updated: 2026-03-25T14:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Clear ephemeral state (temp DBs, caches, lock files). Start the application from scratch. Server boots without errors, any seed/migration completes, and a primary query (health check, homepage load, or basic API call) returns live data.
result: pass

### 2. Family Allocation Page Loads
expected: Navigate to a family's allocation page (e.g. /families/[familyId]/allocation). The page renders a 2/3 + 1/3 layout: left side shows 4 asset class rows (Equity, Debt, Gold, Cash) with dual-color fill bars (primary color up to target, error color for excess drift). Right side shows the AI Rebalance Strategy card.
result: pass

### 3. Drift Badges on Allocation Bars
expected: Each allocation row shows a badge. If an asset class is over/under-allocated by more than 5%, the badge reads something like "Drifted" or shows the drift % in an error-container (red-tinted) style. If within 5%, the badge shows "On Track" in a secondary-container (green-tinted) style.
result: pass

### 4. AI Rebalance Strategy Card — Generate Button
expected: The AI Rebalance Strategy card on the right side of the allocation page shows a "Generate Strategy" (or "Regenerate") button with a psychology icon. Clicking it sends a request and shows a loading state. After completion, the card displays the AI-generated rebalancing text with a SEBI disclaimer ("informational purposes only, not investment advice"). Subsequent visits show a cached result with a "Generated X ago" label.
result: pass

### 5. Import Page — Broker Tab
expected: Navigate to /families/[familyId]/import?tab=broker (or click the Broker tab on the import page). The page shows two tabs: CAS and Broker. The Broker tab displays a Zerodha connection status — either "Not Connected" with a "Connect via Kite" link, "Connected" with last-sync time and a holdings count, or "Expired" with a re-auth option.
result: pass

### 6. Goals Page — Empty State
expected: Navigate to /families/[familyId]/goals. If no goals exist for this family's holders, the page shows an empty state with an icon and a prompt like "No goals yet" along with a "Create New Goal" button.
result: pass

### 7. Create New Goal — Modal
expected: Click the "Create New Goal" button on the goals page. A modal dialog opens with fields: Goal Name (text), Target Amount (₹), Target Date (date picker, min tomorrow), Expected CAGR (number, default 12%), and a checkbox list to link existing holdings/funds to this goal. Submitting creates the goal and the modal closes, then the new goal card appears on the page without a full reload.
result: pass

### 8. Goal Card — On-Track / Off-Track Status
expected: Each goal card shows: the goal name, a status badge (green "On Track" or red "Off Track"), current corpus value and projected corpus at target date, target date and years remaining, and a progress bar (green when on track, red when off track). Fund chips (up to 2 + "+N more") show linked holdings.
result: pass

### 9. Fund-Goal Linkage Strip
expected: Below the goal cards grid, a visual connector strip shows which holdings/funds are linked to which goals. Each row shows: fund name → arrow connector → goal name. If no holdings are linked to any goal, a hint text reads something like "Link holdings to goals using the Create New Goal button above."
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0

## Gaps

[none]

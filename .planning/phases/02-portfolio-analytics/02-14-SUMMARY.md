---
phase: 02-portfolio-analytics
plan: 14
subsystem: ui
tags: [xirr, sip, analytics, server-component, typescript]

# Dependency graph
requires:
  - phase: 02-portfolio-analytics
    provides: detectActiveSIPs with sip_cashflows (negated outflows) and computeXIRR pure function
provides:
  - SipSection renders per-SIP XIRR percentage below each SIP fund name (SIP-02 satisfied)
  - estimateFolioCurrentValue helper: net units x most recent NAV from transaction history
affects: [02-portfolio-analytics]

# Tech tracking
tech-stack:
  added: []
  patterns: [server-side XIRR computation in Server Component using pure TypeScript function]

key-files:
  created: []
  modified:
    - components/analytics/sip-section.tsx

key-decisions:
  - "estimateFolioCurrentValue uses net units x most recent transaction NAV as proxy — avoids adding holdings prop to SipSection; acceptable approximation for Phase 2"

patterns-established:
  - "SIP XIRR: sip_cashflows (negated outflows) + terminal value cashflow passed to computeXIRR per folio"
  - "Server Component XIRR computation: computeXIRR is pure TypeScript with no browser dependencies — runs fine on server"

requirements-completed: [SIP-02]

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 02 Plan 14: SIP XIRR Display Summary

**Per-SIP XIRR computed server-side in SipSection using sip_cashflows + estimated terminal value (net units x latest NAV), displayed as 'XIRR: X.XX%' below each SIP fund name**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T05:51:50Z
- **Completed:** 2026-03-20T05:53:05Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `estimateFolioCurrentValue` helper that computes net units from transaction history and multiplies by most recent NAV to approximate current folio value
- Added per-SIP XIRR computation: calls `computeXIRR` with `sip_cashflows` (already negated outflows from `detectActiveSIPs`) plus terminal cashflow at current value
- Renders `XIRR: X.XX%` (or `—` when null) below each SIP fund name using `text-xs text-secondary font-bold tabular-nums` style
- SipSection remains a Server Component — no `'use client'` directive added; `computeXIRR` is pure TypeScript

## Task Commits

Each task was committed atomically:

1. **Task 1: Add terminal value computation and computeXIRR call per SIP in SipSection** - `b5558c4` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `components/analytics/sip-section.tsx` - Added `estimateFolioCurrentValue`, `computeXIRR` import/call, and XIRR display row per SIP

## Decisions Made
- `estimateFolioCurrentValue` uses net units × most recent transaction NAV as a proxy for current value — avoids changing `SipSection`'s props interface (actual current value is on `HoldingRow` which is not passed down); acceptable approximation for Phase 2

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SIP-02 satisfied: SIP XIRR displayed per row in sidebar panel
- Actual current NAV-based value (from `HoldingRow.current_value`) could replace the proxy estimate in a future plan if higher accuracy is needed
- All 7 sip-detector unit tests continue to pass

---
*Phase: 02-portfolio-analytics*
*Completed: 2026-03-20*

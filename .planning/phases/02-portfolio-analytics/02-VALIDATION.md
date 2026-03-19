---
phase: 2
slug: portfolio-analytics
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.0 |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` (all tests in `tests/`) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test` + `npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run build` clean
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-W0-01 | W0 | 0 | PERF-02 | unit | `npm test -- tests/xirr.test.ts` | ❌ W0 | ⬜ pending |
| 2-W0-02 | W0 | 0 | PERF-01, PERF-03, PERF-05, PERF-06 | unit | `npm test -- tests/analytics.test.ts` | ❌ W0 | ⬜ pending |
| 2-W0-03 | W0 | 0 | SIP-01, SIP-02 | unit | `npm test -- tests/sip-detector.test.ts` | ❌ W0 | ⬜ pending |
| 2-W0-04 | W0 | 0 | ALLOC-01, ALLOC-02 | unit | `npm test -- tests/allocation.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-01 | 01 | 1 | PERF-01, PERF-02 | unit | `npm test -- tests/xirr.test.ts tests/analytics.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | PERF-03 | unit | `npm test -- tests/analytics.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | PERF-05, PERF-06 | unit | `npm test -- tests/analytics.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | SIP-01, SIP-02 | unit | `npm test -- tests/sip-detector.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 1 | ALLOC-01, ALLOC-02 | unit | `npm test -- tests/allocation.test.ts` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 2 | PERF-04 | manual | Browser: period toggle updates all metrics | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/xirr.test.ts` — stubs for PERF-02 (XIRR unit tests with known cashflows, convergence, null-on-missing-NAV)
- [ ] `tests/analytics.test.ts` — stubs for PERF-01 (gain/loss), PERF-03 (benchmark XIRR), PERF-05 (period bounds), PERF-06 (Indian FY bounds)
- [ ] `tests/sip-detector.test.ts` — stubs for SIP-01 (detection logic), SIP-02 (SIP-only cashflows)
- [ ] `tests/allocation.test.ts` — stubs for ALLOC-01 (zod schema sum validation), ALLOC-02 (asset class mapper)

*Existing Vitest infrastructure (vitest.config.mts) covers all phase requirements — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Period selector toggle updates all metrics simultaneously | PERF-04 | UI interaction; no DOM testing setup | 1. Open holder analytics page. 2. Switch period (1M→1Y). 3. Verify XIRR, gain/loss, and benchmark all update. |
| Holdings table gain/loss columns display correctly | PERF-01 | Visual rendering; Tailwind color classes | 1. Open holder page. 2. Verify gain shown in green, loss in red. |
| Active SIPs section hidden when no SIPs detected | SIP-01 | DOM visibility logic | 1. Use holder with no recurring transactions. 2. Verify SIP section is absent. |
| Allocation bars render current vs target deviation | ALLOC-02 | CSS bar rendering | 1. Set target allocation. 2. Verify deviation highlighted red/green. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

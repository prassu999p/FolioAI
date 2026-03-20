---
phase: 3
slug: tax-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.mts` (root) |
| **Quick run command** | `npx vitest run tests/tax/` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/tax/`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | TAX-01 | unit | `npx vitest run tests/tax/engine.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 0 | TAX-01 | unit | `npx vitest run tests/tax/rules.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 0 | TAX-04 | unit | `npx vitest run tests/tax/harvesting.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | TAX-01 | unit | `npx vitest run tests/tax/engine.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | TAX-01 | unit | `npx vitest run tests/tax/rules.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 1 | TAX-02 | unit | `npx vitest run tests/tax/engine.test.ts` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 1 | TAX-03 | unit | `npx vitest run tests/tax/engine.test.ts` | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 2 | TAX-04 | unit | `npx vitest run tests/tax/harvesting.test.ts` | ❌ W0 | ⬜ pending |
| 3-05-01 | 05 | 2 | TAX-05 | manual | N/A — PDF download | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/tax/engine.test.ts` — stubs for TAX-01 lot building, TAX-02 grandfathering, TAX-03 estimator
- [ ] `tests/tax/rules.test.ts` — stubs for TAX-01 rate/classification logic
- [ ] `tests/tax/harvesting.test.ts` — stubs for TAX-04 suggestion algorithm
- [ ] `lib/tax/types.ts` — TaxLot, RealizedGain, UnrealizedGain, TaxSummary types (referenced by tests)
- [ ] `lib/tax/engine.ts` — stub exports so test imports resolve
- [ ] `lib/tax/rules.ts` — stub exports so test imports resolve
- [ ] `lib/tax/harvesting.ts` — stub exports so test imports resolve

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ITR-ready capital gains PDF download renders correctly | TAX-05 | PDF binary output; no DOM to assert against | Navigate to Tax Intelligence page, click Download button, verify PDF opens with correct Schedule CG format, ISIN/fund names, FY header, LTCG/STCG columns, and totals |
| Floating AI chat widget opens and sends message | TAX-05 UI | Browser interaction with streaming response | Click bottom-right chat widget, type a question, verify response streams without layout shift |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

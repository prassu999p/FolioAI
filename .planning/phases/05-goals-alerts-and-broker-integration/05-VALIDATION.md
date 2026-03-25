---
phase: 5
slug: goals-alerts-and-broker-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.mts` (project root) |
| **Quick run command** | `npx vitest run tests/goals-engine.test.ts tests/kite-holdings-mapper.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/goals-engine.test.ts tests/kite-holdings-mapper.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-W0-01 | Wave 0 | 0 | GOAL-01/02/03 | unit | `npx vitest run tests/goals-engine.test.ts` | ❌ W0 | ⬜ pending |
| 5-W0-02 | Wave 0 | 0 | DATA-03 | unit | `npx vitest run tests/kite-holdings-mapper.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-01 | 01 | 1 | GOAL-01 | unit | `npx vitest run tests/goals-engine.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | GOAL-02 | unit | `npx vitest run tests/goals-engine.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-03 | 01 | 1 | GOAL-03 | unit | `npx vitest run tests/goals-engine.test.ts` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 1 | ALLOC-03 | unit | `npx vitest run tests/allocation.test.ts` | ✅ extend | ⬜ pending |
| 5-03-01 | 03 | 2 | DATA-03 | unit | `npx vitest run tests/kite-holdings-mapper.test.ts` | ❌ W0 | ⬜ pending |
| 5-04-01 | 04 | 2 | ALRT-01/02 | manual | Supabase Studio — verify `user_alert_preferences` table exists | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/goals-engine.test.ts` — stubs for GOAL-01, GOAL-02, GOAL-03 (computeProjectedCorpus, computeGoalProjection, fallback to totalHolderAUM)
- [ ] `tests/kite-holdings-mapper.test.ts` — stubs for DATA-03 (Kite holding → stock_holdings mapping, OAuth callback validation)
- [ ] `lib/analytics/goals-engine.ts` — stub file (throw `Not implemented`) so imports resolve before implementation

*(No new framework install needed — Vitest already configured via `vitest.config.mts`)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Alert preferences schema scaffolded | ALRT-01, ALRT-02 | Schema migration only — no code path to test; email delivery deferred to V2 | Open Supabase Studio, verify `user_alert_preferences` table exists with expected columns |
| Kite OAuth redirect flow (login URL → Kite → callback) | DATA-03 | Requires live Kite sandbox credentials and browser redirect | Use Kite sandbox: click "Connect via Kite", complete OAuth, verify holdings appear in holdings table |
| Zerodha connection status shows "Connected / Expired" correctly | DATA-03 | Requires expired token state which can't be faked in unit tests | Set `token_expires_at` to past timestamp in DB, verify UI shows "Expired — Re-authorize" state |
| Goals page displays correct on-track / off-track status badges | GOAL-03 | UI badge rendering requires browser | Check goals page: create a goal with future target date and confirm green "On Track" / red "Off Track" badge matches projection logic |
| AI Rebalance Strategy generates and caches correctly | ALLOC-03 | Requires live Anthropic API call | Click "Generate Rebalance Strategy" on allocation page, verify narrative appears and is cached in `rebalance_strategies` table |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

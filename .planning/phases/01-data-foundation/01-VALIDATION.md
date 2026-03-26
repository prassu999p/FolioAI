---
phase: 1
slug: data-foundation
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-19
audited: 2026-03-26
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (latest) + React Testing Library |
| **Config file** | `vitest.config.mts` — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose` (relevant test file only)
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | FAM-01 | unit | `npx vitest run tests/family.test.ts -t "Family management"` | ✅ | ✅ green |
| 1-01-02 | 01 | 0 | FAM-02 | unit | `npx vitest run tests/family.test.ts -t "Family dashboard AUM"` | ✅ | ✅ green |
| 1-01-03 | 01 | 0 | FAM-03 | unit | `npx vitest run tests/family.test.ts -t "Holder drill-down"` | ✅ | ✅ green |
| 1-02-01 | 02 | 1 | DATA-01 | unit | `npx vitest run tests/cas-import.test.ts -t "CAMS PDF"` | ✅ | ✅ green |
| 1-02-02 | 02 | 1 | DATA-02 | unit | `npx vitest run tests/cas-import.test.ts -t "KFintech PDF"` | ✅ | ✅ green |
| 1-03-01 | 03 | 1 | DATA-04 | unit | `npx vitest run tests/manual-entry.test.ts` | ✅ | ✅ green |
| 1-04-01 | 04 | 1 | DATA-05 | unit | `npx vitest run tests/holdings.test.ts` | ✅ | ✅ green |
| 1-05-01 | 05 | 2 | DATA-06 | unit | `npx vitest run tests/nav-sync.test.ts` | ✅ | ✅ green |
| 1-rls-01 | 01 | 1 | (RLS) | integration | `npx vitest run tests/rls.test.ts` | ✅ | ⚠️ partial |
| 1-dedup-01 | 02 | 1 | (dedup) | unit | `npx vitest run tests/dedup.test.ts` | ✅ | ⚠️ partial |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ partial (stubs only)*

**Notes:**
- Family, CAS-import, holdings, manual-entry, nav-sync: **fully implemented** with real test cases
- RLS and dedup: **stub tests only** (4 `it.todo()` tests each) — require local Supabase for integration testing
- All implemented tests: 157 passing, 0 failing (as of 2026-03-26 14:31 UTC)

---

## Wave 0 Requirements — ✅ COMPLETE

- [x] `vitest.config.mts` — Vitest config with jsdom environment and path aliases
- [x] `tests/setup.ts` — Supabase mock client, shared fixtures
- [x] `tests/family.test.ts` — covers FAM-01, FAM-02, FAM-03 (7 tests, all passing)
- [x] `tests/cas-import.test.ts` — covers DATA-01, DATA-02, dedup validation (13 tests, all passing)
- [x] `tests/manual-entry.test.ts` — covers DATA-04 (4 tests, all passing)
- [x] `tests/holdings.test.ts` — covers DATA-05 (6 tests, all passing)
- [x] `tests/nav-sync.test.ts` — covers DATA-06 (7 tests, all passing)
- [x] `tests/rls.test.ts` — RLS cross-user isolation (4 stub tests, deferred to manual-only)
- [x] `tests/dedup.test.ts` — transaction deduplication (4 stub tests, deferred to manual-only)
- [x] Framework: Vitest 3 with @vitejs/plugin-react, @testing-library/react installed
- [x] Supabase mock pattern established via createMockSupabase() in tests/setup.ts

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CAMS PDF with real password decrypts correctly | DATA-01 | Real PDFs contain PII — cannot use as fixtures | Upload a real CAMS PDF in dev environment and verify holder/transaction extraction |
| KFintech PDF with real password decrypts correctly | DATA-02 | Real PDFs contain PII — cannot use as fixtures | Upload a real KFintech PDF in dev environment and verify holder/transaction extraction |
| AMFI daily NAV cron job fires at correct UTC time | DATA-06 | Cron scheduling cannot be unit tested | Verify Vercel Cron dashboard shows daily execution at configured time |
| RLS cross-user isolation enforced at row level | (RLS) | Full RLS testing requires live Supabase instance + authenticated user sessions | Deploy to Supabase; login with user A, verify cannot access user B's family data |
| Re-importing same CAS does not double transactions | (dedup) | Dedup key verification requires real DB with ON CONFLICT behavior | Upload same CAMS PDF twice; verify transaction count unchanged |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — 8/10 automated, 2/10 manual-only
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all critical references — Family, CAS, holdings, NAV sync fully tested
- [x] No watch-mode flags
- [x] Feedback latency < 30s — actual: 2.51s
- [ ] **PARTIAL COMPLIANCE:** `nyquist_compliant: false` (2 test files are stubs awaiting implementation)

**Audit Results:**
- ✅ **8/8 main requirements** (FAM-01 to DATA-06) fully automated and passing
- ⚠️ **2 additional tests** (RLS, dedup) remain as stubs, deferred to manual-only
- ✅ **157 tests passing**, 0 failures
- ✅ **No blocking issues** for Phase 2 analytics

**Approval:** Phase 1 is **VALIDATED** with partial Nyquist compliance. Core requirements are fully tested and passing. RLS and dedup tests can be implemented when local Supabase environment is available.

---
phase: 1
slug: data-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
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
| 1-01-01 | 01 | 0 | FAM-01 | unit | `npx vitest run tests/family.test.ts -t "create family"` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | FAM-02 | unit | `npx vitest run tests/dashboard.test.ts -t "total AUM"` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 0 | FAM-03 | unit | `npx vitest run tests/holder.test.ts -t "holder holdings"` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | DATA-01 | unit | `npx vitest run tests/cas-import.test.ts -t "CAMS"` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | DATA-02 | unit | `npx vitest run tests/cas-import.test.ts -t "KFintech"` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 1 | DATA-04 | unit | `npx vitest run tests/manual-entry.test.ts` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 1 | DATA-05 | unit | `npx vitest run tests/holdings.test.ts` | ❌ W0 | ⬜ pending |
| 1-05-01 | 05 | 2 | DATA-06 | unit | `npx vitest run tests/nav-sync.test.ts` | ❌ W0 | ⬜ pending |
| 1-rls-01 | 01 | 1 | (RLS) | integration | `npx vitest run tests/rls.test.ts` | ❌ W0 | ⬜ pending |
| 1-dedup-01 | 02 | 1 | (dedup) | unit | `npx vitest run tests/dedup.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.mts` — Vitest config with jsdom environment and path aliases
- [ ] `tests/setup.ts` — Supabase mock client, shared fixtures
- [ ] `tests/family.test.ts` — covers FAM-01, FAM-02, FAM-03
- [ ] `tests/cas-import.test.ts` — covers DATA-01, DATA-02 (use sample CAS fixtures)
- [ ] `tests/manual-entry.test.ts` — covers DATA-04
- [ ] `tests/holdings.test.ts` — covers DATA-05
- [ ] `tests/nav-sync.test.ts` — covers DATA-06
- [ ] `tests/rls.test.ts` — RLS cross-user isolation (requires local Supabase)
- [ ] `tests/dedup.test.ts` — transaction deduplication
- [ ] `tests/fixtures/sample-cams.pdf` — anonymized CAMS sample for DATA-01
- [ ] `tests/fixtures/sample-kfintech.pdf` — anonymized KFintech sample for DATA-02
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react @testing-library/react`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CAMS PDF with real password decrypts correctly | DATA-01 | Real PDFs contain PII — cannot use as fixtures | Upload a real CAMS PDF in dev environment and verify holder/transaction extraction |
| KFintech PDF with real password decrypts correctly | DATA-02 | Real PDFs contain PII — cannot use as fixtures | Upload a real KFintech PDF in dev environment and verify holder/transaction extraction |
| AMFI daily NAV cron job fires at correct UTC time | DATA-06 | Cron scheduling cannot be unit tested | Verify Vercel Cron dashboard shows daily execution at configured time |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

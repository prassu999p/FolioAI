---
phase: 6
slug: i-want-to-add-option-to-import-stocks-bought-using-tradebooks-downloaded-manually
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (existing) |
| **Quick run command** | `npm test -- phase-6` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~60 seconds (quick), ~180 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- phase-6`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | W0: DB migration, SheetJS setup | integration | `npm test -- migrations` | ✅ | ⬜ pending |
| 06-01-02 | 01 | 0 | W0: TradebookImportForm stub | unit | `npm test -- TradebookImportForm` | ✅ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | Column mapper, file parsing | unit | `npm test -- parseTradebook` | ✅ | ⬜ pending |
| 06-02-02 | 02 | 1 | Preview table rendering | unit | `npm test -- TradebookPreview` | ✅ | ⬜ pending |
| 06-03-01 | 03 | 1 | Import API route validation | integration | `npm test -- import-tradebook-api` | ✅ | ⬜ pending |
| 06-03-02 | 03 | 1 | Stock holdings deduplication | unit | `npm test -- deduplicateTradebook` | ✅ | ⬜ pending |
| 06-04-01 | 04 | 2 | Tab routing + UI integration | unit | `npm test -- import-page-tabs` | ✅ | ⬜ pending |
| 06-04-02 | 04 | 2 | Metadata storage (source, batch_id) | integration | `npm test -- tradebook-metadata` | ✅ | ⬜ pending |
| 06-05-01 | 05 | 2 | Holder selection UI + validation | unit | `npm test -- holder-selector` | ✅ | ⬜ pending |
| 06-05-02 | 05 | 2 | Post-import redirect to holdings | unit | `npm test -- import-redirect` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — migrate SheetJS CDN URL test fixtures
- [ ] `tests/lib/tradebook.test.ts` — stubs for parseTradebook, validateTradebook, deduplicateTradebook
- [ ] `tests/migrations/` — migration test for stock_transactions table + broker_source constraint
- [ ] `components/__tests__/TradebookImportForm.test.tsx` — form interaction stubs
- [ ] Fixture: `tests/fixtures/sample-tradebook.xlsx` — Zerodha format sample for all tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CSV/XLSX file upload triggers parsing without hangs | File format handling | Requires file system + SheetJS interaction | 1) Upload test CSV, 2) Verify parse completes <2s, 3) Check console logs for no errors |
| Column mapper shows correct suggestions for non-Zerodha format | Column name flexibility | Requires knowledge of real broker tradebook variations | 1) Upload CSV with different column headers (e.g., "BuySell" instead of "Trade Type"), 2) Verify mapper detects and suggests correct mapping |
| Invalid rows highlighted red in preview, skipped on import | Error visibility | Visual inspection of highlighted rows | 1) Upload file with 1 invalid row, 2) Open preview, 3) Verify red highlight on invalid row, 4) Import, 5) Verify counts show 1 skipped |
| Post-import redirect navigates to holdings, new stocks visible | User feedback | End-to-end UX verification | 1) Import 3 stocks from tradebook, 2) Watch for success toast, 3) Verify redirect to holdings page, 4) Confirm 3 new rows appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

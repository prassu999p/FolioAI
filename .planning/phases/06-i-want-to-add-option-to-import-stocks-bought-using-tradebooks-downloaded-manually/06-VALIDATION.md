---
phase: 6
slug: i-want-to-add-option-to-import-stocks-bought-using-tradebooks-downloaded-manually
status: approved
nyquist_compliant: true
wave_0_complete: true
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
| **Quick run command** | `npx vitest run tests/tradebook-*.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~60 seconds (quick), ~180 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/tradebook-*.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | DB migration, SheetJS install | integration | `node -e "require('xlsx')"` | ✅ | ⬜ pending |
| 06-01-02 | 01 | 1 | lib/tradebook/* scaffolds + test stubs | unit | `npx vitest run tests/tradebook-parser.test.ts tests/tradebook-column-mapper.test.ts tests/tradebook-validator.test.ts tests/tradebook-mapper.test.ts tests/tradebook-dedup.test.ts` | ✅ | ⬜ pending |
| 06-02-01 | 02 | 2 | Parser + column mapper TDD | unit | `npx vitest run tests/tradebook-parser.test.ts tests/tradebook-column-mapper.test.ts` | ✅ | ⬜ pending |
| 06-02-02 | 02 | 2 | Validator + mapper TDD | unit | `npx vitest run tests/tradebook-validator.test.ts tests/tradebook-mapper.test.ts` | ✅ | ⬜ pending |
| 06-03-01 | 03 | 3 | Import API route | integration | `npx tsc --noEmit && echo "TypeScript OK"` | ✅ | ⬜ pending |
| 06-03-02 | 03 | 3 | TradebookImportForm + column mapping UI | unit | `npx tsc --noEmit && echo "TypeScript OK"` | ✅ | ⬜ pending |
| 06-03-03 | 03 | 3 | Stock holdings page + table | unit | `npx tsc --noEmit && echo "TypeScript OK"` | ✅ | ⬜ pending |
| 06-04-01 | 04 | 4 | End-to-end browser verification | manual | `npx vitest run tests/tradebook-parser.test.ts tests/tradebook-column-mapper.test.ts tests/tradebook-validator.test.ts tests/tradebook-mapper.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Plan 01 creates all required test scaffolds. The following files must exist after Plan 01 completes (all with `it.todo()` stubs only — zero test failures):

- [ ] `tests/tradebook-parser.test.ts` — stubs for parseSpreadsheet
- [ ] `tests/tradebook-column-mapper.test.ts` — stubs for normaliseHeaders / COLUMN_ALIASES
- [ ] `tests/tradebook-validator.test.ts` — stubs for validateRow / TradebookRowSchema
- [ ] `tests/tradebook-mapper.test.ts` — stubs for mapToStockTransactionInsert
- [ ] `tests/tradebook-dedup.test.ts` — stubs for dedup behavior (3 specific stubs per Plan 01 action)
- [ ] `tests/fixtures/sample-tradebook.csv` — Zerodha-format CSV fixture with 3 rows (2 valid, 1 missing ISIN)

Plan 02 fills in the actual test implementations (RED→GREEN→REFACTOR cycle).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CSV/XLSX file upload triggers parsing without hangs | File format handling | Requires browser file system + SheetJS interaction | 1) Upload test CSV, 2) Verify parse completes <2s, 3) Check console for no errors |
| Column mapping panel shows correct detected mappings for Zerodha CSV format | Locked decision: show mapping preview | Visual inspection of mapping panel | 1) Upload tests/fixtures/sample-tradebook.csv, 2) Verify mapping panel appears with all required columns detected as "Auto-detected", 3) Click "Confirm mappings", 4) Verify row-data preview table appears |
| Column mapping panel shows "Unknown" status for unrecognised headers | Flexible column matching edge case | Visual inspection | 1) Upload CSV with extra columns (e.g., "Notes"), 2) Verify "Unknown — will be ignored" appears for that column |
| Invalid rows highlighted red in preview, skipped on import | Error visibility | Visual inspection | 1) Upload sample-tradebook.csv (1 invalid row), 2) Open preview, 3) Verify red highlight, 4) Import, 5) Verify counts show 1 skipped |
| Post-import redirect navigates to unified holdings view, all sources visible | End-to-end UX | Browser navigation | 1) Import 2 stocks from tradebook, 2) Verify redirect to /families/[id]/holdings, 3) Confirm both tradebook stocks appear alongside any Zerodha holdings |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 files align with Plan 01 files_modified
- [x] No watch-mode flags in any verify command
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] No references to non-existent plans (06-05 removed)

**Approval:** approved

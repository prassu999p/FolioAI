---
phase: 06-tradebook-import
plan: "01"
subsystem: tradebook-import
tags: [sheetjs, database, migrations, parsing, vitest]
dependency_graph:
  requires: []
  provides:
    - xlsx@0.20.3 package (CDN tarball, not npm registry)
    - stock_transactions DB table with RLS
    - stock_holdings source/batch/filename columns
    - lib/tradebook/tradebook-parser.ts (parseSpreadsheet)
    - lib/tradebook/tradebook-column-mapper.ts (normaliseHeaders, COLUMN_ALIASES)
    - lib/tradebook/tradebook-validator.ts (TradebookRowSchema, ValidatedRow, validateRow)
    - lib/tradebook/tradebook-mapper.ts (StockTransactionInsert, mapToStockTransactionInsert)
    - 5 Vitest test scaffold files (55 it.todo() stubs)
  affects:
    - plans 06-02 (implements TDD tests against these modules)
    - plans 06-03 (dedup logic uses tradebook-dedup.test.ts stubs)
    - plans 06-04 (UI imports lib modules via API routes)
tech_stack:
  added:
    - xlsx@0.20.3 (SheetJS from cdn.sheetjs.com tarball)
  patterns:
    - three-hop RLS chain (stock_transactions → holders → families → user_id)
    - it.todo() stubs for deferred test implementation
    - Zod discriminated union transform for trade_type normalisation
key_files:
  created:
    - supabase/migrations/20260329000001_tradebook_import.sql
    - lib/tradebook/tradebook-column-mapper.ts
    - lib/tradebook/tradebook-parser.ts
    - lib/tradebook/tradebook-validator.ts
    - lib/tradebook/tradebook-mapper.ts
    - tests/tradebook-parser.test.ts
    - tests/tradebook-column-mapper.test.ts
    - tests/tradebook-validator.test.ts
    - tests/tradebook-mapper.test.ts
    - tests/tradebook-dedup.test.ts
    - tests/fixtures/sample-tradebook.csv
  modified:
    - package.json (xlsx dependency added)
    - pnpm-lock.yaml (updated lockfile)
decisions:
  - "SheetJS installed from cdn.sheetjs.com tarball via pnpm (npm v9.8.1 arborist bug prevented npm install of URL dependencies)"
  - "COLUMN_ALIASES reverse lookup map computed at module load for O(1) normalisation"
  - "trade_type normalisation via unknown→string|null transform then refine — avoids intermediate z.union complexity"
  - "tradebook-dedup.test.ts stubs match exact it.todo() strings specified in plan — Plan 06-03 Task 1 depends on these"
metrics:
  duration: "8 minutes"
  completed_date: "2026-03-29"
  tasks_completed: 2
  tasks_total: 2
  files_created: 11
  files_modified: 2
---

# Phase 6 Plan 01: Tradebook Import Foundation Summary

SheetJS 0.20.3 installed from CDN tarball, stock_transactions DB migration created, and four lib/tradebook/* parsing modules scaffolded with 55 Vitest it.todo() stubs — zero test failures.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Install SheetJS + create DB migration | f6ae7db | package.json, pnpm-lock.yaml, supabase/migrations/20260329000001_tradebook_import.sql |
| 2 | Create lib/tradebook/* modules + test scaffolds | c0d4c18 | lib/tradebook/{parser,column-mapper,validator,mapper}.ts, tests/tradebook-*.test.ts, tests/fixtures/sample-tradebook.csv |

## What Was Built

### Task 1: SheetJS + DB Migration

**SheetJS Installation:**
- Installed `xlsx@0.20.3` from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` via pnpm
- Added to `package.json` dependencies with the CDN URL (not npm registry — avoids CVE-2023-30533 and CVE-2024-22363)
- Verified: `node -e "require('xlsx')"` returns version 0.20.3

**DB Migration (`20260329000001_tradebook_import.sql`):**
- Adds `source TEXT NOT NULL DEFAULT 'zerodha' CHECK (source IN ('zerodha', 'manual', 'tradebook'))` to stock_holdings
- Adds `imported_at TIMESTAMPTZ`, `batch_id UUID`, `import_filename TEXT` to stock_holdings
- Deprecates `broker_source` via SQL COMMENT (kept for Zerodha backward compat)
- Creates `stock_transactions` table with full RLS mirroring stock_holdings three-hop holder chain
- `UNIQUE (holder_id, trade_id)` constraint enables dedup logic in Plan 06-03

### Task 2: lib/tradebook/* Modules

**tradebook-column-mapper.ts:**
- `COLUMN_ALIASES`: 8 canonical keys × multiple broker header variations (Zerodha, HDFC, ICICI patterns)
- `normaliseHeaders()`: O(1) lookup via reverse map computed at module load; unknown headers pass through unchanged

**tradebook-parser.ts:**
- `parseSpreadsheet(file: File)`: uses `XLSX.read(buffer, { cellDates: true, raw: false })` + `sheet_to_json({ defval: '', raw: false })`
- Returns raw rows — no header normalisation (single responsibility)

**tradebook-validator.ts:**
- `TradebookRowSchema`: Zod schema with trade_type normalisation (b/buy/purchase → buy; s/sell → sell), exchange uppercasing, numeric coercion
- `ValidatedRow`: inferred TypeScript type
- `validateRow()`: discriminated union `{ valid: true; data }` | `{ valid: false; errors: string[] }`

**tradebook-mapper.ts:**
- `StockTransactionInsert`: interface matching stock_transactions INSERT columns
- `mapToStockTransactionInsert(row, holderId, batchId, filename)`: maps ValidatedRow fields to DB shape; `trade_id ?? null` handles optional field

### Test Scaffolds
- 5 test files, 55 `it.todo()` stubs — all import without errors
- `tests/tradebook-dedup.test.ts` has the exact 3 stubs required by Plan 06-03 Task 1
- `tests/fixtures/sample-tradebook.csv`: 3 rows (2 valid, 1 missing ISIN for error handling tests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm install via URL failed due to npm v9.8.1 arborist bug**
- **Found during:** Task 1
- **Issue:** `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` threw `TypeError: Cannot read properties of null (reading 'matches')` in `@npmcli/arborist`. Both URL and local file path variants failed identically.
- **Fix:** Manually added `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"` to `package.json` dependencies, then ran `pnpm install` (pnpm v10.33.0 was already the project's package manager per pnpm-lock.yaml). SheetJS installed successfully.
- **Files modified:** package.json, pnpm-lock.yaml
- **Commit:** f6ae7db

## Verification Results

```
SheetJS:  node -e "require('xlsx')" → OK (version 0.20.3)
Migration: Contains CREATE TABLE stock_transactions + ALTER TABLE stock_holdings ADD COLUMN source → OK
TypeScript: npx tsc --noEmit → 0 errors
Vitest:   55 tests | 55 todo (0 failures) → OK
```

## Self-Check: PASSED

- lib/tradebook/tradebook-column-mapper.ts: EXISTS
- lib/tradebook/tradebook-parser.ts: EXISTS
- lib/tradebook/tradebook-validator.ts: EXISTS
- lib/tradebook/tradebook-mapper.ts: EXISTS
- tests/tradebook-dedup.test.ts: EXISTS
- tests/fixtures/sample-tradebook.csv: EXISTS
- supabase/migrations/20260329000001_tradebook_import.sql: EXISTS
- Commit f6ae7db: EXISTS
- Commit c0d4c18: EXISTS

---
phase: 06-tradebook-import
plan: "03"
subsystem: tradebook-import
tags: [next.js, api-route, client-component, server-component, supabase, zod, sheetjs]
dependency_graph:
  requires:
    - plan 06-01 (lib/tradebook/* modules: parser, column-mapper, validator, mapper)
    - plan 06-02 (52 passing Vitest tests validating lib/tradebook/* contract)
  provides:
    - POST /api/holdings/import-tradebook (deduplicate + upsert transactions + holdings)
    - TradebookImportForm (file → column mapping → preview → import workflow)
    - /families/[familyId]/holdings (unified stock holdings view, all sources)
  affects:
    - app/(dashboard)/families/[familyId]/import/page.tsx (Tradebook third tab added)
    - components/holdings/ (new directory)
tech_stack:
  added: []
  patterns:
    - next/dynamic with ssr:false inside 'use client' wrapper (Server Component limitation)
    - Supabase subquery IN for multi-holder family queries
    - ignoreDuplicates:true upsert pattern for Zerodha-safe tradebook holdings merge
    - Inline aggregation (buy_qty - sell_qty, weighted avg price) before DB upsert
key_files:
  created:
    - app/api/holdings/import-tradebook/route.ts
    - app/(dashboard)/families/[familyId]/import/TradebookImportForm.tsx
    - app/(dashboard)/families/[familyId]/import/TradebookImportLazy.tsx
    - app/(dashboard)/families/[familyId]/holdings/page.tsx
    - components/holdings/stock-holdings-table.tsx
  modified:
    - app/(dashboard)/families/[familyId]/import/page.tsx
decisions:
  - "TradebookImportLazy.tsx wrapper for dynamic import — next/dynamic ssr:false disallowed in Server Components (Next.js 15 App Router); extracted into 'use client' wrapper to preserve bundle-splitting intent"
  - "ignoreDuplicates:true on stock_holdings upsert — tradebook data is historical cost basis only; existing Zerodha rows (source='zerodha') must never be overwritten"
  - "Inline aggregation before upsert — net_quantity and weighted_avg_price computed in TypeScript from submitted rows; avoids a second DB query to re-aggregate"
  - "Column mapping detection uses module-level reverse lookup from COLUMN_ALIASES — same lookup built in tradebook-column-mapper avoids divergence"
metrics:
  duration: "13 minutes"
  completed_date: "2026-03-30"
  tasks_completed: 3
  tasks_total: 3
  files_created: 5
  files_modified: 1
---

# Phase 6 Plan 03: End-to-End Tradebook Import Wiring Summary

Full tradebook import flow: CSV/XLSX upload → column mapping confirmation → row preview → POST deduplicated transactions → aggregated holdings upsert → unified stock holdings view with import attribution and read-only enforcement for tradebook rows.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | POST /api/holdings/import-tradebook route | d979316 | app/api/holdings/import-tradebook/route.ts |
| 2 | TradebookImportForm + update import page | 8cde6b0 | TradebookImportForm.tsx, import/page.tsx |
| 3 | Stock holdings page + tooltip + read-only | 0100233 | holdings/page.tsx, stock-holdings-table.tsx |
| F | Auto-fix: ssr:false in Server Component | 664ce0d | TradebookImportLazy.tsx, import/page.tsx |

## What Was Built

### POST /api/holdings/import-tradebook

- Zod validates request body: `holderId` (UUID), `batchId` (UUID), `filename`, `rows[]`
- Auth via `getClaims()` — 401 if unauthenticated
- Holder ownership verified (explicit 404, RLS also enforces)
- Maps `ValidatedRow[]` to `StockTransactionInsert[]` via `mapToStockTransactionInsert()`
- Upserts `stock_transactions` with `onConflict: 'holder_id,trade_id'` + `ignoreDuplicates: true` — re-upload of same file skips already-imported rows
- Aggregates net positions in TypeScript: `net_quantity = SUM(buy) - SUM(sell)`, `weighted_avg_price = SUM(buy_qty * price) / SUM(buy_qty)`
- Upserts `stock_holdings` with `ignoreDuplicates: true` on `(holder_id, tradingsymbol, exchange)` — Zerodha rows are never overwritten
- Returns `{ imported: N, skipped: N, batched: UUID }`

### TradebookImportForm (client component, 4-step flow)

**Step 1** — Holder dropdown (required before file can be selected) + dashed-border file picker (`.csv,.xlsx`).

**Step 2** — Column mapping confirmation panel (inline, not modal):
- Compares raw headers to `COLUMN_ALIASES` reverse lookup
- Shows each raw header → canonical key with `Auto-detected` / `Unknown — will be ignored` status
- Shows green "All required columns detected" or amber warnings for missing required columns
- "Confirm mappings" button advances to preview; "Cancel" resets

**Step 3** — Row preview table:
- Runs `normaliseHeaders()` + `validateRow()` on each raw row
- Valid rows: normal background; invalid rows: red (`#fef2f2`) with error text in Status column
- Shows `"{N} valid rows • {M} will be skipped"` count above table
- `tabular-nums` on quantity and price columns; `formatINR` on price

**Step 4** — Import button:
- Disabled unless `validRows.length > 0 && selectedHolderId`
- Generates `batchId = crypto.randomUUID()` client-side
- POSTs JSON to `/api/holdings/import-tradebook`
- Success banner: `"Imported N stocks (M duplicates skipped)"`
- `setTimeout(() => router.push('/families/[familyId]/holdings'), 1500)`

### import/page.tsx updates

- Third tab "Tradebook" with `upload_file` icon, same active-tab styling as CAS/Broker tabs
- Tab content branch: `tab === 'tradebook'` renders `<TradebookImportLazy />`
- `TradebookImportLazy` is a `'use client'` wrapper that uses `next/dynamic` with `ssr: false`

### StockHoldingsTable (client component)

- 9 columns: Symbol, Exchange, ISIN, Qty, Avg Price, Last Price, P&L, Source, Actions
- **Tradebook symbol cell**: `<span title="Imported via Tradebook on Jan 15, 2024">` + inline `upload_file` badge (green, 14px)
- **Source badge**: Tradebook (green pill), Zerodha (navy pill), Manual (grey pill)
- **Actions — read-only enforcement**: tradebook rows show italic "Read-only" with descriptive title; non-tradebook rows show edit + delete icon buttons (no-op `alert()` stubs)
- Empty state message with `show_chart` icon
- `formatINR` + `tabular-nums` on all financial columns

### /families/[familyId]/holdings page (Server Component)

- Fetches all `stock_holdings` for all holders in the family using subquery `IN (SELECT id FROM holders WHERE family_id = X)`
- Orders by `tradingsymbol`
- "Import Tradebook" button in header links back to `import?tab=tradebook`
- Back arrow to family dashboard

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] next/dynamic ssr:false not allowed in Server Components**

- **Found during:** Task 2 verification — `npm run build` failed with `'ssr: false' is not allowed with next/dynamic in Server Components`
- **Issue:** Plan specified `dynamic(() => import('./TradebookImportForm'), { ssr: false })` directly in `page.tsx`, but Next.js 15 App Router forbids `ssr: false` in Server Components
- **Fix:** Created `TradebookImportLazy.tsx` as a `'use client'` wrapper that uses `next/dynamic` with `ssr: false`; `page.tsx` imports the wrapper instead. Bundle-splitting intent preserved.
- **Files modified:** `TradebookImportLazy.tsx` (created), `import/page.tsx` (updated import)
- **Commit:** 664ce0d

## Verification Results

```
TypeScript:        npx tsc --noEmit → 0 errors (all 4 tasks)
Build:             npm run build → 0 errors, all routes compiled
Tradebook tests:   52 passed | 3 todo (Plan 02 tests unaffected)
Full vitest suite: 52 passed | 3 todo
Routes visible:    /families/[familyId]/holdings (1.49 kB)
                   /families/[familyId]/import (3.08 kB)
                   /api/holdings/import-tradebook (186 B)
```

All plan success criteria met:
- Three tabs visible: CAS Import, Broker, Tradebook
- Column mapping panel shown after file selection, before row data
- Mapping panel lists raw header → canonical key with auto-detected/unknown status
- File upload → column mapping → preview → confirm workflow works end-to-end
- Post-import redirect goes to `/families/[familyId]/holdings`
- API deduplicates by `trade_id` — re-upload skips already-imported rows
- `stock_transactions` rows inserted per import
- `stock_holdings` updated with aggregated net positions (source = 'tradebook')
- Zerodha holdings NOT overwritten (`ignoreDuplicates: true` on stock_holdings upsert)
- Holdings page shows all sources unified; tradebook rows have import tooltip + read-only enforcement

## Self-Check: PASSED

- app/api/holdings/import-tradebook/route.ts: EXISTS
- app/(dashboard)/families/[familyId]/import/TradebookImportForm.tsx: EXISTS (316 lines)
- app/(dashboard)/families/[familyId]/import/TradebookImportLazy.tsx: EXISTS
- app/(dashboard)/families/[familyId]/import/page.tsx: MODIFIED (Tradebook tab added)
- app/(dashboard)/families/[familyId]/holdings/page.tsx: EXISTS
- components/holdings/stock-holdings-table.tsx: EXISTS
- Commit d979316: EXISTS (Task 1)
- Commit 8cde6b0: EXISTS (Task 2)
- Commit 0100233: EXISTS (Task 3)
- Commit 664ce0d: EXISTS (Auto-fix)

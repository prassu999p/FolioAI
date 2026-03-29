# Phase 6: I want to add option to import stocks bought using tradebooks downloaded manually - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable users to import stock trading history from manually-downloaded tradebook files (CSV/Excel). Tradebooks contain historical buy/sell transactions with symbol, quantity, price, and date. Imported stocks integrate seamlessly into the unified holdings view alongside Zerodha broker API imports and manual entries. No real-time syncing — uploads are one-time, user-initiated imports.

</domain>

<decisions>
## Implementation Decisions

### File Format & Parsing
- Support **both CSV and Excel (.xlsx)** — users upload whichever they have
- Expected format: standard CDSL tradebook layout with columns: Symbol, ISIN, Trade Date, Exchange, Trade Type (buy/sell), Quantity, Price, Trade ID
- **ISIN required** — must be present in all rows (symbol alone is too ambiguous for equity)
- **Flexible column name matching** — accept variations (case-insensitive, synonyms); show user a column mapping preview if needed before import
- Parse Trade Type column to distinguish buy vs sell transactions

### UI Entry Point
- **New "Tradebook" tab** on `/families/[familyId]/import` page — third tab alongside CAS and Broker tabs (consistent with Phase 5 pattern)
- **Holder selection required** — dropdown to pick which family member owns these stocks (same pattern as Zerodha Broker tab)
- **Preview-then-confirm workflow** — after file selected:
  1. Parse and validate
  2. Show preview table of parsed rows + identified errors (invalid rows highlighted)
  3. Let user choose to skip invalid rows or cancel
  4. "Import" button triggers the actual DB insert
- **Post-import UX** — Success toast ("Imported 10 stocks") + auto-redirect to `/families/[familyId]/holdings` to see newly imported stocks

### Data Validation & Errors
- **Invalid rows warning** — Preview shows invalid rows highlighted in red; user can see which rows will be skipped and why
- **Deduplication by Trade ID** — If Trade ID already exists in DB, skip that row (idempotent re-import prevention)
- **Unknown symbols accepted** — If symbol/ISIN not recognized, import anyway; price lookup can happen later
- **Re-upload protection** — Trade IDs checked against existing DB; duplicates automatically skipped with summary shown

### Display & Attribution
- **Hover tooltip on stock symbol** — Shows "Imported via Tradebook on Jan 15, 2024" (import source + date)
- **Comprehensive metadata stored**: source (`'tradebook'`), import_date, batch_id (groups one upload), original_filename
- **Price from tradebook stored as cost basis only** — historical purchase price for tax/XIRR calculations, not used as current market value
- **Read-only after import** — Tradebook-imported transactions cannot be edited or deleted individually; if correction needed, user re-uploads a corrected file or deletes the entire import batch

### Claude's Discretion
- Exact DB schema for storing tradebook metadata (new columns on `stock_holdings` table or separate `stock_import_metadata` table)
- Column mapping UI implementation (dropdown selectors, free-form text, or auto-detect with override)
- Error message specificity (which validation rules to enforce, where to warn vs fail)
- Batch ID generation strategy (UUID, incrementing, or timestamp-based)
- How to handle partial uploads (if file has 100 rows but only 95 valid — show summary, proceed with 95)

</decisions>

<specifics>
## Specific Ideas

- Actual tradebook format: standard CDSL export with Trade Type, ISIN, Symbol, Quantity, Price, Trade Date, Trade ID, Exchange columns
- Users typically export from broker portals or download from CDSL/NSE websites
- Tab icon suggestion: `description` Material Symbol (same as CAS tab) or `upload_file`
- For metadata tooltip: "Imported via Tradebook • Jan 15, 2024" (bullet-separated for consistency with Phase 5 Zerodha badge style)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/(dashboard)/families/[familyId]/import/page.tsx` — Existing import page structure; add Tradebook tab here (third tab after CAS and Broker)
- `app/(dashboard)/families/[familyId]/import/CASImportForm.tsx` — File upload + parsing pattern; tradebook form can follow similar structure
- `components/ui/dialog.tsx` — Dialog pattern for preview modal (if needed for column mapping)
- `stock_holdings` table from Phase 5 — Reuse directly; add new columns for source metadata (source, imported_at, batch_id, import_filename)

### Established Patterns
- Tab-based routing via `?tab=` URL param — import page already uses this
- Server Component for page, client component for upload form (like CASImportForm)
- Supabase RLS via subquery chains — tradebook imports subject to same RLS as other holdings (holder → family → user_id)
- `formatINR` + `tabular-nums` on all financial values — apply to price/cost columns in preview and display
- Error banners: styled with Material Symbols icons + inline error messages (see Broker tab for pattern)

### Integration Points
- Extends `/families/[familyId]/import/page.tsx` — add Tradebook tab
- New form component: `TradebookImportForm.tsx` — handles file upload, parsing, validation UI
- New API route: `/api/holdings/import-tradebook` — POST endpoint to validate, parse, and upsert rows
- New DB columns on `stock_holdings` table: `source` (enum: 'tradebook' | 'zerodha' | 'manual'), `imported_at`, `batch_id`, `import_filename`
- Existing `stock_holdings` table from Phase 5 — reuse for storage
- Hover tooltip on stock rows — could use shadcn Tooltip component or title attribute

</code_context>

<deferred>
## Deferred Ideas

- **Real-time stock price syncing for tradebook imports** — Phase 5 does manual Refresh for Zerodha; tradebook stocks could use same flow later
- **Bulk edit of imported tradebook batch** — V2: allow user to adjust quantities/prices for entire import batch at once
- **Tradebook history / audit trail** — V2: show user all tradebook uploads with counts and dates
- **Automatic tradebook detection from email** — V2: detect tradebook attachments, parse automatically
- **Integration with broker data reconciliation** — V2: match tradebook imports against actual broker statements for accuracy verification

</deferred>

---

*Phase: 06-tradebook-import*
*Context gathered: 2026-03-29*

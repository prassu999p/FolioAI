# Phase 6: Tradebook Import - Research

**Researched:** 2026-03-29
**Domain:** CSV/Excel file parsing, stock transaction import, Next.js API routes, Supabase schema migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### File Format & Parsing
- Support **both CSV and Excel (.xlsx)** — users upload whichever they have
- Expected format: standard CDSL tradebook layout with columns: Symbol, ISIN, Trade Date, Exchange, Trade Type (buy/sell), Quantity, Price, Trade ID
- **ISIN required** — must be present in all rows (symbol alone is too ambiguous for equity)
- **Flexible column name matching** — accept variations (case-insensitive, synonyms); show user a column mapping preview if needed before import
- Parse Trade Type column to distinguish buy vs sell transactions

#### UI Entry Point
- **New "Tradebook" tab** on `/families/[familyId]/import` page — third tab alongside CAS and Broker tabs
- **Holder selection required** — dropdown to pick which family member owns these stocks
- **Preview-then-confirm workflow** — after file selected:
  1. Parse and validate
  2. Show preview table of parsed rows + identified errors (invalid rows highlighted)
  3. Let user choose to skip invalid rows or cancel
  4. "Import" button triggers the actual DB insert
- **Post-import UX** — Success toast ("Imported 10 stocks") + auto-redirect to `/families/[familyId]/holdings`

#### Data Validation & Errors
- **Invalid rows warning** — Preview shows invalid rows highlighted in red
- **Deduplication by Trade ID** — If Trade ID already exists in DB, skip that row
- **Unknown symbols accepted** — Import even if symbol/ISIN not recognized
- **Re-upload protection** — Trade IDs checked against existing DB; duplicates automatically skipped

#### Display & Attribution
- **Hover tooltip on stock symbol** — Shows "Imported via Tradebook on Jan 15, 2024"
- **Comprehensive metadata stored**: source (`'tradebook'`), import_date, batch_id (groups one upload), original_filename
- **Price from tradebook stored as cost basis only** — historical purchase price for tax/XIRR calculations
- **Read-only after import** — Tradebook-imported transactions cannot be edited or deleted individually

### Claude's Discretion
- Exact DB schema for storing tradebook metadata (new columns on `stock_holdings` or separate `stock_import_metadata` table)
- Column mapping UI implementation (dropdown selectors, free-form text, or auto-detect with override)
- Error message specificity (which validation rules to enforce, where to warn vs fail)
- Batch ID generation strategy (UUID, incrementing, or timestamp-based)
- How to handle partial uploads (if file has 100 rows but only 95 valid — show summary, proceed with 95)

### Deferred Ideas (OUT OF SCOPE)
- Real-time stock price syncing for tradebook imports
- Bulk edit of imported tradebook batch
- Tradebook history / audit trail
- Automatic tradebook detection from email
- Integration with broker data reconciliation
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-03 (extended) | User can import stock holdings and transactions — via tradebook file in addition to Zerodha API | File parsing library (SheetJS), column mapping logic, new DB columns, new API route, preview UI component, Tradebook tab in import page |
</phase_requirements>

---

## Summary

Phase 6 adds a third import path for stocks: manually-downloaded tradebook CSV/XLSX files. The work builds directly on Phase 5's `stock_holdings` table and the existing `/families/[familyId]/import` page tab pattern. The dominant technical challenges are: (1) selecting and correctly installing the file parsing library, (2) normalising column names across real-world tradebook variations (Zerodha, Groww, Angel One all use slightly different headers), and (3) extending the `stock_holdings` schema to support tradebook-specific metadata without breaking existing Zerodha upsert semantics.

The codebase already has all structural patterns in place: tab routing via `?tab=`, a client-side upload form (`CASImportForm`), server-side API route with Zod validation, and Supabase upsert. Tradebook import follows the same architecture with the additions of a two-step preview workflow (parse in-browser first, then POST validated rows to the API route) and a DB migration to add `source`, `imported_at`, `batch_id`, `import_filename`, and a `stock_transactions` table for individual buy/sell events.

**Primary recommendation:** Use SheetJS (installed from the official CDN tarball, not npm registry) for both CSV and XLSX parsing in the browser before the preview step; send the normalised JSON payload to a new `/api/holdings/import-tradebook` POST route.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| xlsx (SheetJS) | 0.20.3+ from CDN | Parse CSV and XLSX on client or server | Single library handles both formats; same `XLSX.read()` API for both |
| zod | ^3.25 (already installed) | Validate each row schema | Already in project; row-level validation aligns with existing patterns |
| @supabase/supabase-js | ^2.50 (already installed) | DB upsert for validated rows | Already used for stock_holdings in Phase 5 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto.randomUUID() | Node.js built-in | Generate batch_id UUIDs | Available in Next.js API routes; no extra package |
| date-fns | ^4.1.0 (already installed) | Parse/validate trade dates | Already installed; use `parseISO`, `isValid` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SheetJS client-side parse | Server-side parse | Client parse means preview without round-trip; server parse is simpler but requires uploading entire file before showing errors |
| SheetJS for CSV | PapaParse | PapaParse is lighter and well-maintained for CSV-only; but SheetJS handles both CSV and XLSX with identical API — fewer moving parts |
| client-side parse + JSON POST | FormData multipart POST | JSON POST requires client-side SheetJS; FormData POST requires server-side SheetJS — JSON POST gives instant preview feedback |

**Installation (from official CDN, NOT npm registry — npm version has unpatched CVEs):**
```bash
npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

Add to `package.json` scripts or install directly. Verify the latest version at https://cdn.sheetjs.com/ before running.

---

## Architecture Patterns

### Recommended Project Structure

```
app/
└── (dashboard)/families/[familyId]/import/
    ├── page.tsx                    # (existing) add Tradebook tab here
    └── TradebookImportForm.tsx     # NEW — client component

app/api/holdings/
└── import-tradebook/route.ts       # NEW — POST: validate + upsert rows

lib/
├── tradebook/
│   ├── tradebook-parser.ts         # parse XLSX/CSV buffer → raw rows
│   ├── tradebook-column-mapper.ts  # normalise column name variations
│   ├── tradebook-validator.ts      # Zod schema + per-row validation
│   └── tradebook-mapper.ts         # map validated row → DB insert shape

supabase/migrations/
└── 20260329000001_tradebook_import.sql  # schema migration
```

### Pattern 1: Client-Side Parse + Preview + Server Confirm

This is the approved workflow from CONTEXT.md.

**What:** User selects file → client-side SheetJS parses it in the browser → component shows preview table with highlighted invalid rows → user clicks "Import" → single POST of validated JSON rows to API route → API route validates, deduplicates against DB, upserts, returns summary.

**When to use:** All tradebook imports. Two-step design keeps invalid-row preview instant (no upload round-trip) and keeps the API route payload predictable (JSON array, not multipart).

**Example client parse:**
```typescript
// Source: https://docs.sheetjs.com/docs/api/parse-options/
import * as XLSX from 'xlsx'

async function parseFile(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  // header: 1 gives array-of-arrays; default gives objects keyed by first row
  return XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' })
}
```

**Example API route pattern (mirrors existing routes):**
```typescript
// Source: mirrors /app/api/broker/zerodha/refresh/route.ts pattern
export async function POST(request: Request) {
  const supabase = await createClient()
  const result = await supabase.auth.getClaims()
  const claims = result.data?.claims ?? null
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  // Zod validation of { holderId, rows[], filename, batchId }
  // For each row: check trade_id dedup, then upsert into stock_holdings
}
```

### Pattern 2: Column Name Normalisation

**What:** The tradebook column names vary across sources. A normalisation function maps raw column names (case-insensitive, trimmed) to canonical keys.

**Known real-world column names (HIGH confidence from cross-verified search):**

| Canonical Key | Zerodha CSV header | CDSL / generic variation |
|---------------|-------------------|--------------------------|
| `symbol` | `symbol` | `Symbol`, `SYMBOL`, `Scrip Name` |
| `isin` | `isin` | `ISIN`, `ISIN Code`, `Isin` |
| `trade_date` | `trade_date` | `Trade Date`, `TradeDate`, `Date` |
| `exchange` | `exchange` | `Exchange`, `EXCHANGE` |
| `trade_type` | `trade_type` | `Trade Type`, `Buy/Sell`, `buy_sell`, `B/S` |
| `quantity` | `quantity` | `Quantity`, `Qty`, `QTY` |
| `price` | `price` | `Price`, `PRICE`, `Trade Price`, `Rate` |
| `trade_id` | `trade_id` | `Trade ID`, `TradeId`, `Ref No`, `Order ID` |

```typescript
// lib/tradebook/tradebook-column-mapper.ts
const COLUMN_ALIASES: Record<string, string> = {
  'symbol': 'symbol', 'scrip name': 'symbol',
  'isin': 'isin', 'isin code': 'isin',
  'trade_date': 'trade_date', 'trade date': 'trade_date', 'date': 'trade_date',
  'exchange': 'exchange',
  'trade_type': 'trade_type', 'trade type': 'trade_type',
  'buy/sell': 'trade_type', 'buy_sell': 'trade_type', 'b/s': 'trade_type',
  'quantity': 'quantity', 'qty': 'quantity',
  'price': 'price', 'trade price': 'price', 'rate': 'price',
  'trade_id': 'trade_id', 'trade id': 'trade_id',
  'order_id': 'trade_id', 'order id': 'trade_id', 'ref no': 'trade_id',
}

export function normaliseHeaders(rawRow: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(rawRow)) {
    const canonical = COLUMN_ALIASES[key.toLowerCase().trim()]
    if (canonical) out[canonical] = val
    else out[key.toLowerCase().trim()] = val  // preserve unmapped columns
  }
  return out
}
```

### Pattern 3: DB Schema Extension

**Recommendation:** Extend `stock_holdings` with new metadata columns + add a separate `stock_transactions` table for individual trade events (buy/sell rows).

**Why two tables:** The existing `stock_holdings` table stores the current aggregated position (quantity, average_price) per `(holder_id, tradingsymbol, exchange)`. Tradebook imports bring transaction-level history (each buy or sell event). These are structurally different concerns. Mixing them would corrupt the Zerodha upsert semantics.

**Migration plan:**
```sql
-- Extend stock_holdings with source metadata
ALTER TABLE stock_holdings
  ADD COLUMN source TEXT NOT NULL DEFAULT 'zerodha'
    CHECK (source IN ('zerodha', 'manual', 'tradebook')),
  ADD COLUMN imported_at TIMESTAMPTZ,
  ADD COLUMN batch_id UUID,
  ADD COLUMN import_filename TEXT;

-- Drop old CHECK on broker_source and replace with source column
-- (broker_source kept for backward compatibility; source is the new canonical column)

-- New table for tradebook transaction rows (individual trade events)
CREATE TABLE stock_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id       UUID NOT NULL REFERENCES holders(id) ON DELETE CASCADE,
  tradingsymbol   TEXT NOT NULL,
  exchange        TEXT NOT NULL CHECK (exchange IN ('NSE', 'BSE')),
  isin            TEXT NOT NULL,
  trade_date      DATE NOT NULL,
  trade_type      TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  quantity        NUMERIC(16, 4) NOT NULL,
  price           NUMERIC(16, 4) NOT NULL,
  trade_id        TEXT,
  batch_id        UUID NOT NULL,
  import_filename TEXT,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (holder_id, trade_id)  -- deduplication key
);

ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
-- RLS mirrors stock_holdings (holder_id -> holders -> families -> user_id)
```

**Note on `broker_source` column:** The existing column has `CHECK (broker_source IN ('zerodha', 'manual'))`. The new `source` column replaces this conceptually. A migration must handle backward compat — either add a new column or ALTER the CHECK constraint.

### Pattern 4: Holder Selector in Form

The Broker tab uses the default (first alphabetically) holder. Tradebook requires an explicit holder selector per CONTEXT.md. Pattern from CASImportForm applies (client component with props), but extended with a holder dropdown.

```typescript
// TradebookImportForm receives holders prop from Server Component parent
interface TradebookImportFormProps {
  familyId: string
  holders: Array<{ id: string; name: string }>
}
```

The parent `page.tsx` already fetches `holders` for the Broker tab — reuse the same data.

### Anti-Patterns to Avoid

- **Parsing file on the server via multipart FormData:** Adds complexity, loses instant preview feedback. Parse on client, POST JSON.
- **Merging tradebook transactions into `stock_holdings` by averaging:** This would corrupt the average_price for existing Zerodha holdings. Store trade events in `stock_transactions` separately.
- **Using `UNIQUE (holder_id, tradingsymbol, exchange)` on stock_transactions:** Tradebook can have multiple buys of the same stock. Use `UNIQUE (holder_id, trade_id)` for dedup.
- **Installing xlsx from npm registry:** The public npm version (0.18.5) has high-severity CVEs. Always install from `cdn.sheetjs.com` tarball.
- **Validating ISIN format strictly:** ISIN is 12 chars (2 letter country code + 9 alphanum + check digit), but user's tradebook may have formatting issues. Accept any non-empty string, warn but don't reject if format looks wrong.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XLSX binary parsing | Custom binary parser | SheetJS `XLSX.read()` | XLSX format is a ZIP of XML; SheetJS handles compound binary, date serials, formula cells, shared strings |
| CSV dialect detection | Custom delimiter sniffer | SheetJS auto-detects CSV via heuristics; fallback PapaParse | Both handle RFC 4180 edge cases (quoted fields with commas, embedded newlines) |
| UUID generation | Sequential IDs for batch_id | `crypto.randomUUID()` (Node.js built-in) | Collision-safe, no dependency, available in Next.js API routes |
| Date parsing from spreadsheet | strptime clone | SheetJS `cellDates: true` + `date-fns` `isValid` | Spreadsheet dates can be Excel serial numbers; SheetJS converts, date-fns validates |

**Key insight:** Tradebook files are deceptively complex — date serial numbers in Excel, mixed text/number cells, locale-specific number formats. SheetJS handles all of this; any custom parser will break on real-world files.

---

## Common Pitfalls

### Pitfall 1: xlsx npm Package Has Unpatched CVEs
**What goes wrong:** `npm install xlsx` installs version 0.18.5 (frozen since 2021) with CVE-2023-30533 (Prototype Pollution) and CVE-2024-22363 (ReDoS).
**Why it happens:** SheetJS stopped publishing to npm after v0.18.5; all updates go to their own CDN.
**How to avoid:** Install from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`; add to package.json `dependencies` with the tarball URL.
**Warning signs:** `npm audit` reports high severity on xlsx.

### Pitfall 2: Excel Date Serial Numbers
**What goes wrong:** Dates in `.xlsx` files are stored as numbers (e.g., `45678`). Without `cellDates: true`, `sheet_to_json` returns numbers instead of Date strings, and date validation fails for all rows.
**Why it happens:** Excel's native date format is a floating-point serial since 1900.
**How to avoid:** Always pass `{ cellDates: true, raw: false }` to `XLSX.read()`.
**Warning signs:** `trade_date` values are numbers like `45123` instead of date strings.

### Pitfall 3: broker_source CHECK Constraint Conflict
**What goes wrong:** The existing `stock_holdings.broker_source` column has `CHECK (broker_source IN ('zerodha', 'manual'))`. Attempting to insert a `stock_holdings` row with `broker_source = 'tradebook'` will fail.
**Why it happens:** Phase 5 migration defined the enum without anticipating Phase 6.
**How to avoid:** The migration must ALTER the CHECK constraint to include `'tradebook'`, OR add a new `source` column (recommended — backward compat).
**Warning signs:** DB upsert for tradebook holdings returns constraint violation error.

### Pitfall 4: stock_holdings UNIQUE Constraint on (holder_id, tradingsymbol, exchange)
**What goes wrong:** A user who already has INFY imported via Zerodha tries to import INFY via tradebook. The upsert would silently overwrite `average_price` and `last_price` with tradebook values, corrupting the Zerodha position data.
**Why it happens:** The existing UNIQUE constraint is designed for Zerodha's snapshot model (one row per holding). Tradebook imports add transactions, not positions.
**How to avoid:** Store tradebook imports in the new `stock_transactions` table, not as position rows in `stock_holdings`. If a consolidated position view is needed, derive it from transactions.
**Warning signs:** Zerodha-imported average_price changes after a tradebook import of the same stock.

### Pitfall 5: Trade Type Normalisation
**What goes wrong:** Zerodha exports `trade_type` as `"buy"` / `"sell"`. CDSL/other brokers may use `"B"`, `"S"`, `"BUY"`, `"SELL"`, `"Purchase"`. Strict equality check rejects valid rows.
**Why it happens:** No standard column format across Indian broker tradebooks.
**How to avoid:** Normalise to lowercase, then map: `{ b: 'buy', buy: 'buy', purchase: 'buy', s: 'sell', sell: 'sell' }`.
**Warning signs:** "Invalid trade type" errors on valid Groww or CDSL files.

### Pitfall 6: SheetJS Bundle Size in Client Components
**What goes wrong:** SheetJS adds ~700KB to the client bundle, noticeably slowing initial page load.
**Why it happens:** SheetJS ships a comprehensive parser for many formats.
**How to avoid:** Use `next/dynamic` with `{ ssr: false }` to lazy-load `TradebookImportForm` — the file parsing only happens when the user is on the Import page, not on every page load.
**Warning signs:** Lighthouse shows large JS bundle, or the import page is slow to initially render.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### SheetJS: Parse File to Row Objects
```typescript
// Source: https://docs.sheetjs.com/docs/api/parse-options/
// Used in TradebookImportForm.tsx (client component)
import * as XLSX from 'xlsx'

export async function parseSpreadsheet(
  file: File
): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, {
    cellDates: true,   // convert Excel date serials to JS Date objects
    raw: false,        // format all values as strings (consistent types)
  })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: '',        // empty cells → '' instead of undefined
    raw: false,
  })
}
```

### Zod Row Validation Schema
```typescript
// lib/tradebook/tradebook-validator.ts
import { z } from 'zod'

export const TradebookRowSchema = z.object({
  symbol:     z.string().min(1, 'Symbol required'),
  isin:       z.string().min(1, 'ISIN required'),
  trade_date: z.string().min(1, 'Trade date required'),
  exchange:   z.enum(['NSE', 'BSE']).or(z.string().transform(v =>
    v.toUpperCase() === 'NSE' ? 'NSE' : v.toUpperCase() === 'BSE' ? 'BSE' : v
  )),
  trade_type: z.string().transform(v => {
    const lc = v.toLowerCase().trim()
    if (['b','buy','purchase'].includes(lc)) return 'buy' as const
    if (['s','sell'].includes(lc)) return 'sell' as const
    return null
  }).refine(v => v !== null, { message: 'trade_type must be buy or sell' }),
  quantity:   z.coerce.number().positive(),
  price:      z.coerce.number().positive(),
  trade_id:   z.string().optional(),
})

export type ValidatedRow = z.infer<typeof TradebookRowSchema>
```

### Supabase Upsert with Dedup (stock_transactions)
```typescript
// Source: mirrors /app/api/broker/zerodha/refresh/route.ts upsert pattern
// app/api/holdings/import-tradebook/route.ts

const { error: upsertError } = await (supabase as any)
  .from('stock_transactions')
  .upsert(rows, {
    onConflict: 'holder_id,trade_id',  // dedup by Trade ID per holder
    ignoreDuplicates: true,            // skip silently if already exists
  })
```

### Lazy Loading TradebookImportForm
```typescript
// app/(dashboard)/families/[familyId]/import/page.tsx
import dynamic from 'next/dynamic'

const TradebookImportForm = dynamic(
  () => import('./TradebookImportForm'),
  { ssr: false }
)
// Only loaded when tab=tradebook — avoids SheetJS in initial bundle
```

### Adding Tradebook Tab to Import Page
```tsx
// Follows exact same pattern as existing CAS and Broker tabs
<Link
  href={`/families/${familyId}/import?tab=tradebook`}
  className={`px-5 py-2.5 rounded-t-xl text-sm font-semibold transition-colors ${
    tab === 'tradebook'
      ? 'bg-white border border-b-white'
      : 'hover:bg-[#e6f6ff]'
  }`}
  style={{
    color: tab === 'tradebook' ? '#001736' : '#43474f',
    borderColor: tab === 'tradebook' ? '#c9e7f7' : 'transparent',
  }}
>
  <span className="flex items-center gap-2">
    <span className="material-symbols-outlined text-base">upload_file</span>
    Tradebook
  </span>
</Link>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Install xlsx from npm registry | Install from cdn.sheetjs.com tarball | 2022 (SheetJS stopped npm updates) | npm version has CVEs; CDN version is patched and current |
| Server-side CSV parsing in route | Client-side parse → JSON POST | N/A (design choice) | Instant preview without server round-trip |
| Single `stock_holdings` table for all stock data | Separate `stock_transactions` table for trade events | Phase 6 (new) | Preserves Zerodha position data integrity |

**Deprecated/outdated:**
- `broker_source` column CHECK constraint: Only covers `'zerodha'` and `'manual'`. Migration needed to add `'tradebook'` or introduce a separate `source` column.

---

## Open Questions

1. **`broker_source` vs `source` column strategy**
   - What we know: `stock_holdings.broker_source` has a CHECK constraint for `zerodha` and `manual` only
   - What's unclear: Whether to ALTER the existing column's CHECK constraint or add a new `source` column
   - Recommendation: Add new `source` column (keeps backward compat with any queries referencing `broker_source`); mark `broker_source` as deprecated in code comment

2. **Aggregated position in `stock_holdings` for tradebook imports**
   - What we know: `stock_holdings` stores one row per `(holder_id, tradingsymbol, exchange)` with `quantity` and `average_price`
   - What's unclear: Should tradebook imports also create/update `stock_holdings` position rows so they appear in the holdings view?
   - Recommendation: Yes — after inserting all `stock_transactions` rows, compute net quantity and weighted average price and upsert into `stock_holdings` with `source='tradebook'`. This makes them visible in the unified holdings view (DATA-05 requirement).

3. **SheetJS CDN tarball in production**
   - What we know: SheetJS no longer publishes to npm; CDN installs work in local dev
   - What's unclear: Whether Vercel/CI build environments can resolve tarball URLs in `package.json`
   - Recommendation: Test `npm install` on the CI environment; tarball URLs in `package.json dependencies` are a standard npm feature and should work — but verify.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run tests/tradebook-parser.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-03 (tradebook) | Parse XLSX file → array of raw rows | unit | `npx vitest run tests/tradebook-parser.test.ts` | ❌ Wave 0 |
| DATA-03 (tradebook) | Normalise column header variations → canonical keys | unit | `npx vitest run tests/tradebook-column-mapper.test.ts` | ❌ Wave 0 |
| DATA-03 (tradebook) | Validate row with missing ISIN → invalid | unit | `npx vitest run tests/tradebook-validator.test.ts` | ❌ Wave 0 |
| DATA-03 (tradebook) | Validate row with invalid trade_type → invalid | unit | `npx vitest run tests/tradebook-validator.test.ts` | ❌ Wave 0 |
| DATA-03 (tradebook) | trade_type normalisation: 'B' → 'buy', 'SELL' → 'sell' | unit | `npx vitest run tests/tradebook-validator.test.ts` | ❌ Wave 0 |
| DATA-03 (tradebook) | Duplicate trade_id row skipped on re-import | unit | `npx vitest run tests/tradebook-dedup.test.ts` | ❌ Wave 0 |
| DATA-03 (tradebook) | Valid rows produce correct stock_transactions insert shape | unit | `npx vitest run tests/tradebook-mapper.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/tradebook-*.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/tradebook-parser.test.ts` — covers XLSX and CSV file parsing
- [ ] `tests/tradebook-column-mapper.test.ts` — covers header normalisation
- [ ] `tests/tradebook-validator.test.ts` — covers Zod schema row validation
- [ ] `tests/tradebook-mapper.test.ts` — covers row → DB insert shape
- [ ] `tests/tradebook-dedup.test.ts` — covers trade_id deduplication logic
- [ ] `tests/fixtures/sample-tradebook.csv` — sample CSV fixture (Zerodha format)
- [ ] `tests/fixtures/sample-tradebook.xlsx` — sample XLSX fixture
- [ ] SheetJS install: `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`

---

## Sources

### Primary (HIGH confidence)
- [SheetJS official docs — parse-options](https://docs.sheetjs.com/docs/api/parse-options/) — `XLSX.read()` API, `cellDates` option, Buffer input
- [SheetJS official docs — sheet_to_json](https://docs.sheetjs.com/docs/api/utilities/array/) — `sheet_to_json` signature, header detection, `defval`, `raw` options
- Existing codebase: `supabase/migrations/20260325000003_stock_holdings.sql` — `stock_holdings` schema, UNIQUE constraint, RLS policies
- Existing codebase: `lib/broker/kite-holdings-mapper.ts` — `StockHoldingInsert` type, upsert pattern
- Existing codebase: `app/api/broker/zerodha/refresh/route.ts` — upsert with `onConflict`, redirect-based success/error pattern
- Existing codebase: `app/(dashboard)/families/[familyId]/import/page.tsx` — tab routing pattern, holders fetch, error/success banner

### Secondary (MEDIUM confidence)
- [beancount-importers-india README](https://github.com/prabusw/beancount-importers-india) — cross-confirmed Zerodha tradebook CSV column names: `trade_date, tradingsymbol, exchange, segment, trade_type, quantity, price, order_id, trade_id, order_execution_time`
- [SheetJS CDN vulnerability advisory](https://git.sheetjs.com/sheetjs/sheetjs/issues/3048) — confirmed npm registry is frozen at 0.18.5 with CVEs; CDN is the correct install source
- Web search cross-reference — Zerodha tradebook columns confirmed: `symbol, isin, trade_date, exchange, segment, series, trade_type, quantity, price, trade_id, order_id, order_execution_time`

### Tertiary (LOW confidence)
- CDSL-specific column name variations — Based on general knowledge and community posts; actual CDSL tradebook format not verified from official CDSL documentation. The column mapper's synonym list covers common variations but may need expansion for specific CDSL DP portal exports.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — SheetJS is the dominant library for this use case; existing project patterns confirmed from codebase
- Architecture: HIGH — Two-table design, client-parse + JSON POST pattern, and tab extension all grounded in existing code
- Pitfalls: HIGH for CVE/constraint/date-serial issues (multiple sources); MEDIUM for CDSL column variations (limited official documentation)
- Column name mappings: MEDIUM-HIGH — Zerodha format confirmed from multiple sources; CDSL/other broker variations are best-effort

**Research date:** 2026-03-29
**Valid until:** 2026-04-29 (SheetJS CDN URL and version should be reverified before install)

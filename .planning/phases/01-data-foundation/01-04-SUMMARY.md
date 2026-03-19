---
phase: 01-data-foundation
plan: "04"
subsystem: api
tags: [fastapi, python, casparser, zod, next.js, supabase, typescript, pdf-import, mutual-funds]

# Dependency graph
requires:
  - phase: 01-data-foundation/01-02
    provides: Database schema (holders, folios, transactions, funds tables) + TypeScript types
  - phase: 01-data-foundation/01-03
    provides: createClient() server factory, getClaims() auth pattern, protected route structure
provides:
  - Python FastAPI endpoint POST /api/cas/parse — accepts PDF + password, returns casparser JSON
  - Zod schema (CASOutputSchema) validating casparser output before any DB write
  - Next.js route handler POST /api/cas/import — validates + upserts to Supabase
  - CASUploadForm React component — PDF upload with password + import status feedback
affects:
  - 01-05-PLAN (holdings page — imports CASUploadForm component at holder route)
  - 01-06-PLAN (family/holder management — sees pan_unmatched holders created by import)
  - Phase 3 (tax engine — reads from transactions imported via this pipeline)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - casparser auto-detects CAMS vs KFintech — no separate code paths needed
    - supabase.from() write operations cast via (supabase.from('table') as any) — workaround for postgrest-js v2.99.2 type inference limitation with custom Database generics
    - getClaims() result pattern: result.data?.claims ?? null (not destructured — matches Plan 03 fix)
    - TDD for Python: test file written in api/cas/test_parse.py (requires full pip install to run)
    - Typed insert objects (HolderInsert, FolioInsert, etc.) before any cast — type safety preserved at data definition level

key-files:
  created:
    - api/cas/parse.py
    - api/cas/test_parse.py
    - lib/validators/cas-schema.ts
    - app/api/cas/import/route.ts
    - components/upload/cas-upload-form.tsx
  modified:
    - tests/cas-import.test.ts (replaced todo stubs with 13 real tests)

key-decisions:
  - "supabase.from() write ops use (as any) cast — postgrest-js v2.99.2 infers Row/Insert as never for custom Database generics; typed insert objects declared first to preserve correctness"
  - "casparser model_dump() preferred over dict() — pydantic v2 compat (dict() deprecated); falls back to __dict__ recursion for older versions"
  - "One bad folio logs error and continues — partial import is better than total failure; errors returned in response"
  - "pan_unmatched=true holder created for unknown PANs — user can rename after import rather than blocking the import"
  - "Python tests written as pytest file (TDD RED) but not runnable without pip install — verified via AST syntax check as specified in plan"

patterns-established:
  - "Write route handlers: declare typed insert objects, then cast supabase.from() as any for upsert/insert"
  - "CAS import response format: { success, imported, needs_review, errors[] } — consistent across future import types"
  - "Failed rows get import_status='needs_review' not silent drop — data integrity guaranteed"

requirements-completed: [DATA-01, DATA-02]

# Metrics
duration: 8min
completed: 2026-03-19
---

# Phase 1 Plan 04: CAS PDF Import Pipeline Summary

**Python FastAPI casparser endpoint + Zod-validated Next.js import route + CASUploadForm component — CAMS and KFintech PDFs imported to Supabase with PAN-matched holders and dedup-safe transaction upserts**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-19T05:02:56Z
- **Completed:** 2026-03-19T05:11:15Z
- **Tasks:** 3
- **Files created:** 5
- **Files modified:** 1

## Accomplishments

- Python FastAPI endpoint at `/api/cas/parse` — receives PDF + password, writes to temp file, calls `casparser.read_cas_pdf()` (auto-detects CAMS vs KFintech), serializes via `model_dump()` (pydantic v2), cleans up temp file in `finally`, returns `{status, data}` — password never logged
- Zod `CASOutputSchema` validates full casparser output structure before any DB write — rejects malformed data with 422 and issue details
- Next.js route handler at `/api/cas/import` — authenticates with `getClaims()`, resolves PAN → holder (creates `pan_unmatched=true` holder for unknown PANs), upserts funds master, upserts folios, upserts transactions with `ON CONFLICT DO NOTHING` deduplication
- Unknown transaction types set `import_status='needs_review'` — no silent data loss
- CASUploadForm React component with Dialog, file input (PDF only), password input, loading state, success/error feedback, `onImportComplete` callback
- 13 Vitest tests passing, 0 TypeScript errors, `npm run build` clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Python FastAPI CAS parse endpoint** - `6b218bf` (feat)
2. **Task 2: CAS Zod schema and Next.js import route handler** - `38c9059` (feat)
3. **Task 3: CAS upload UI component** - `a94b716` (feat)

## Files Created/Modified

- `api/cas/parse.py` — FastAPI app with POST /api/cas/parse and GET /health
- `api/cas/test_parse.py` — pytest tests for parse endpoint (TDD RED; requires pip install to run)
- `lib/validators/cas-schema.ts` — Zod schemas: CASTransactionSchema, CASFolioSchema, CASOutputSchema + TRANSACTION_TYPE_MAP
- `app/api/cas/import/route.ts` — Next.js POST route handler with auth, Python proxy, Zod validation, DB upserts
- `components/upload/cas-upload-form.tsx` — 'use client' Dialog component for PDF upload + status display
- `tests/cas-import.test.ts` — Replaced 6 todo stubs with 13 real Vitest tests for schema validation and type mapping

## Decisions Made

- **`supabase.from()` write ops cast via `as any`**: postgrest-js v2.99.2 infers the `Row` and `Insert` types as `never` for `.from('holders').insert(...)` style operations when using a custom `Database` generic (GenericSchema constraint mismatch). The fix is `(supabase.from('holders') as any).insert(typedInsertObj)` — typed insert objects are declared first to preserve data correctness; the cast is at the method call level only.
- **`model_dump()` over `dict()` for casparser output**: pydantic v2 deprecates `.dict()` in favor of `.model_dump()`. Falls back to `__dict__` recursion for non-pydantic objects (dicts, lists, dates).
- **Partial import for bad folios**: One folio with a missing AMFI code or holder creation failure logs to `results.errors` and continues processing remaining folios. The import response includes all errors so users can identify and fix them.
- **`pan_unmatched=true` holder creation**: When a CAS PDF contains a PAN not yet in the family's holders, a placeholder holder is created automatically. The user can rename it after import. This avoids blocking the import on the common case of importing a shared account or spouse's account.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] getClaims() destructuring pattern from plan doesn't match actual return type**
- **Found during:** Task 2 (writing route handler)
- **Issue:** Plan shows `const { data: { claims } } = await supabase.auth.getClaims()` but actual return type is `{ data: { claims, header, signature } | null, error: ... }`. Direct destructuring fails when data is null. This was the same bug fixed in Plan 03.
- **Fix:** Used `const claimsResult = await supabase.auth.getClaims(); const claims = claimsResult.data?.claims ?? null` pattern (established in Plan 03)
- **Files modified:** `app/api/cas/import/route.ts`
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 38c9059 (Task 2 commit)

**2. [Rule 1 - Bug] supabase.from() write operations infer Insert type as never**
- **Found during:** Task 2 (TypeScript compile check via `npx tsc --noEmit`)
- **Issue:** `supabase.from('holders').insert(...)` produces TypeScript errors: "Argument of type '{ family_id: string; ... }' is not assignable to parameter of type 'never'". Same for upsert on funds, folios, transactions. The `PostgrestFilterBuilder` shows `Row: never, Insert: never` — the supabase-js client with custom `Database` generic doesn't satisfy postgrest-js `GenericSchema` constraint for write operations (select works differently via explicit casts in Plan 03).
- **Fix:** Declared typed insert objects (`HolderInsert`, `FolioInsert`, etc.) first, then cast `supabase.from('table') as any` before calling `.insert()` or `.upsert()`. Type safety is maintained at the data object level.
- **Files modified:** `app/api/cas/import/route.ts`
- **Verification:** `npx tsc --noEmit` produces 0 errors
- **Committed in:** 38c9059 (Task 2 commit)

**3. [Rule 1 - Bug] FundInsert missing required scheme_type field**
- **Found during:** Task 2 (TypeScript compile check — second pass after cast fix)
- **Issue:** `Fund` interface has `scheme_type: string` but `FundInsert = Omit<Fund, 'created_at' | 'updated_at'>` includes it as required. Plan's fund upsert object only had `{scheme_code, scheme_name, fund_house, category}` — missing `scheme_type`.
- **Fix:** Added `scheme_type: ''` to the fund upsert object (empty string — populated by NAV sync in future plan)
- **Files modified:** `app/api/cas/import/route.ts`
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 38c9059 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 bugs)
**Impact on plan:** All fixes necessary for correct TypeScript compilation and runtime correctness. No scope creep. The `getClaims()` fix follows the established Plan 03 pattern; the supabase type cast is a known limitation of the current postgrest-js version with custom Database generics.

## Issues Encountered

- postgrest-js v2.99.2 write operation type inference is broken for custom `Database` generics — `insert()` and `upsert()` produce `never` types. This is a library limitation (not a project bug). Workaround: cast `supabase.from()` as `any` for writes while preserving type safety at the insert object declaration level. This same issue will affect Plans 05 and 06.

## User Setup Required

To complete the CAS import pipeline:

1. Set `PYTHON_API_URL` in `.env.local`:
   ```
   PYTHON_API_URL=http://localhost:8000
   ```

2. Start the Python CAS parser service:
   ```bash
   cd api && pip install -r requirements.txt
   uvicorn cas.parse:app --reload --port 8000
   ```

3. Verify service is running:
   ```bash
   curl http://localhost:8000/health
   # → {"status":"ok","service":"cas-parser"}
   ```

4. The CASUploadForm component is ready but not yet wired into the holder page — Plan 05 will import and mount it at `/families/[familyId]/holders/[holderId]`.

## Next Phase Readiness

- Plan 05 (holdings page): `CASUploadForm` component is at `components/upload/cas-upload-form.tsx`, ready to import. Import pipeline writes to `transactions` table with correct schema.
- Plan 06 (manual entry): `transactions` table is populated by CAS import; manual entry adds `source: 'manual'` rows to same table
- Phase 3 (tax engine): `import_status: 'needs_review'` rows visible in holdings for user correction before tax calculation

---
*Phase: 01-data-foundation*
*Completed: 2026-03-19*

# Phase 1: Data Foundation - Research

**Researched:** 2026-03-19
**Domain:** Next.js 15 / Supabase / Python PDF parsing / Indian MF data APIs
**Confidence:** HIGH (core stack verified against official docs and Context7)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Framework:** Next.js (full-stack — API routes collocated with frontend)
- **Database + Auth:** Supabase (Postgres + Supabase Auth; row-level security for financial data isolation)
- **Styling:** Tailwind CSS + shadcn/ui
- **Deployment:** Supabase for DB; Next.js on Vercel or equivalent
- **CAS Parser Strategy:** Hybrid — `pdfplumber` extracts raw text deterministically → Claude parses text-to-structured JSON with a strict output schema → programmatic validation layer checks every number before writing to DB
- **CAS Location:** Server-side Next.js API route (never client-side)
- **Password-protected PDFs:** Ask user at upload time; decrypt server-side; password never stored
- **Parse failure handling:** Flag for manual review — import what can be parsed cleanly, surface unclear rows to user; never silently drop data; never fail entire import because of one bad row
- **Data Model:** `Family → Holders → Folios` — user creates one Family, adds Holders (family members with PAN), each Holder has Folios (fund accounts); CAS import auto-matches folios to holders by PAN
- **Transaction history:** Full ledger — every buy, SIP installment, redemption, switch with date, units, NAV, amount
- **Phase 1 asset scope:** Mutual funds only; schema designed to accommodate stocks cleanly in Phase 5
- **Fund identity:** AMFI scheme code as canonical key — `funds` master table keyed by AMFI scheme code
- **NAV Source:** mfapi.in (free JSON API for Indian MF NAV)
- **Sync trigger:** User-triggered via "Sync NAV" button — no automated cron for v1
- **NAV sync failure handling:** Retry 3 times; show "NAV as of [last successful date]"; never show stale data silently
- **Jan 31, 2018 NAV seed:** One-time migration script at Phase 1 DB setup into `grandfathering_nav` table

### Claude's Discretion
- Exact Supabase RLS policy structure
- pdfplumber configuration details and text extraction approach
- Claude prompt template structure for CAS parsing (within the hybrid approach)
- Specific schema column names and indexes beyond what's decided above
- mfapi.in retry implementation details
- UI layout for holdings list and family dashboard (Phase 2 handles analytics — Phase 1 just needs the list functional)

### Deferred Ideas (OUT OF SCOPE)
- Automated cron for NAV sync — deferred to v2 or a later phase
- AMFI flat-file fallback for NAV (if mfapi.in reliability becomes a problem) — note in blockers, implement if issues arise
- MFCentral API integration for automated MF import — v2 (REQUIREMENTS.md ANLYV2-02)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FAM-01 | User can create a family and add multiple holders (family members) with names and PAN | Supabase `families` + `holders` tables with RLS policies; Next.js Server Actions for CRUD |
| FAM-02 | User can view a consolidated family dashboard showing total AUM, asset allocation, and XIRR across all holders | Phase 1 scope: AUM only (no XIRR until Phase 2); query all holders' current_value from nav_prices join |
| FAM-03 | User can drill down from family view to individual holder's portfolio | Next.js dynamic routes `/families/[id]/holders/[holderId]`; holdings query filtered by holder_id |
| DATA-01 | User can import mutual fund holdings by uploading a CAMS CAS PDF | casparser Python library (MIT) handles CAMS PDFs natively; Python FastAPI microservice on Vercel |
| DATA-02 | User can import mutual fund holdings by uploading a KFintech CAS PDF | casparser handles KFintech PDFs natively alongside CAMS with auto-detection |
| DATA-04 | User can manually add a holding (fund name, units, purchase date, cost price) | Server Action POST to `transactions` table; fund lookup by scheme code via mfapi.in search |
| DATA-05 | User can view all holdings for a holder in a single unified list (mutual funds) | Aggregated query on `transactions` grouped by scheme code + holder_id, joined with latest NAV |
| DATA-06 | System syncs end-of-day NAV from AMFI daily (no user action) | User-triggered in v1: button calls Next.js route → mfapi.in `/mf/{code}/latest` per held scheme |
</phase_requirements>

---

## Summary

Phase 1 builds the complete data foundation for FolioAI: Supabase Postgres schema with a `Family → Holders → Folios → Transactions` hierarchy, a CAS PDF import pipeline, manual entry, NAV sync, and the holdings list UI. The tech stack (Next.js 15, Supabase, Tailwind, shadcn/ui) is well-documented and the integration patterns are stable.

**Critical finding on CAS parsing:** The user decided on a pdfplumber+Claude hybrid approach. Research uncovered that `casparser` (MIT license, v0.8.1, actively maintained) is a purpose-built Python library that already handles CAMS and KFintech CAS PDFs with auto-detection, password support, and structured JSON output including full transaction history and AMFI scheme codes. It outputs the exact data model this phase needs. The planner should evaluate using casparser as the pdfplumber extraction layer (it already does the extraction + structure) with Claude only for ambiguous/flagged rows — this is strictly within the spirit of the locked decision while avoiding unnecessary hand-rolling.

**Vercel deployment concern:** Python PDF libraries (pdfplumber, casparser, pikepdf) have large dependencies. Vercel Python function bundle limit is 500 MB uncompressed. The Python microservice must be carefully managed to stay under this limit by excluding test files and unnecessary assets in `vercel.json`. The recommended architecture is a FastAPI app in `/api/` alongside Next.js.

**Primary recommendation:** Use casparser for CAS text extraction → Claude structured outputs API (`client.messages.parse()` with Pydantic schema) for any rows casparser marks as ambiguous → programmatic validation before DB write. NAV sync via mfapi.in with AMFI flat file as documented fallback.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | Full-stack React framework | App Router, Server Actions, API routes; official Supabase integration |
| @supabase/supabase-js | latest | Supabase JS client | Official SDK for all DB + Auth operations |
| @supabase/ssr | latest | Server-side auth helpers | Required for App Router middleware + cookie-based sessions |
| Tailwind CSS | v4 | Utility CSS | Locked decision; v4 removes config file requirement |
| shadcn/ui | latest | Component library | Locked decision; copies source into project, no external dependency |
| casparser | 0.8.1 | CAS PDF parsing (Python) | MIT license; purpose-built for CAMS/KFintech; auto-detects format; handles passwords |
| pikepdf | 9.x | PDF password decryption fallback | MIT license; used to decrypt before passing to casparser if needed |
| anthropic | latest | Claude API client (Python) | For structured parsing of ambiguous CAS rows via `messages.parse()` |
| FastAPI | 0.117+ | Python microservice framework | Async, type-safe; Vercel-native via ASGI; works with `app.py` entrypoint |
| pydantic | v2 | Schema validation (Python) | Required for Claude structured outputs; casparser uses it internally |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| supabase-cli | latest | Local dev + migrations | Always — `supabase db reset`, type generation, local Postgres |
| Vitest | latest | Unit testing | Component and utility testing; faster than Jest for Next.js 15 |
| @testing-library/react | latest | React component tests | Testing holdings list, family dashboard UI components |
| next-test-api-route-handler | latest | Route handler testing | Testing Next.js App Router route handlers without a running server |
| zod | 3.x | TypeScript schema validation | Validating API inputs, form data on the Next.js side |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| casparser | pdfplumber + custom regex | casparser is purpose-built for CAS; pdfplumber requires custom layout parsing for CAMS/KFintech format variations |
| FastAPI (Python microservice) | Subprocess call from Node.js | FastAPI is cleaner, scales as a Vercel function; subprocess requires temp files and process management |
| Vitest | Jest | Vitest is faster and natively supports ES modules; Jest requires more transform config for Next.js 15 |
| mfapi.in | AMFI flat file direct | mfapi.in provides JSON with scheme codes; flat file requires custom parsing (deferred fallback only) |

**Installation:**
```bash
# Node.js dependencies
npm install @supabase/supabase-js @supabase/ssr zod
npx shadcn@latest init
npm install -D vitest @vitejs/plugin-react @testing-library/react next-test-api-route-handler

# Python microservice (api/requirements.txt)
# casparser==0.8.1
# pikepdf
# fastapi>=0.117.1
# anthropic
# pydantic>=2.0
# python-multipart  # for FastAPI file uploads
```

---

## Architecture Patterns

### Recommended Project Structure
```
/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, signup)
│   ├── (dashboard)/              # Protected pages
│   │   ├── families/
│   │   │   └── [familyId]/
│   │   │       ├── page.tsx      # Family dashboard (total AUM)
│   │   │       └── holders/
│   │   │           └── [holderId]/
│   │   │               └── page.tsx  # Holder holdings list
│   │   └── layout.tsx            # Auth guard wrapper
│   └── api/                      # Next.js route handlers
│       └── nav/
│           └── sync/route.ts     # POST: trigger NAV sync
├── api/                          # Python FastAPI microservice (Vercel)
│   └── cas/
│       └── parse.py              # POST: upload + parse CAS PDF
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server component client
│   │   └── middleware.ts         # Middleware client
│   └── validators/
│       └── cas-schema.ts         # Zod schema for parsed CAS JSON
├── components/
│   ├── holdings/
│   │   ├── holdings-table.tsx    # Holdings list per holder
│   │   └── nav-badge.tsx         # "NAV as of [date]" indicator
│   └── upload/
│       └── cas-upload-form.tsx   # PDF upload + password input
├── supabase/
│   ├── migrations/               # SQL migration files (supabase CLI)
│   ├── schemas/                  # Declarative schema files
│   └── seed.sql                  # Test data + Jan 31 2018 NAV seed
├── middleware.ts                 # Supabase auth token refresh
├── next.config.ts
├── pyproject.toml                # Python version spec (3.12)
└── vercel.json                   # Python function excludeFiles config
```

### Pattern 1: Supabase SSR Auth with Middleware
**What:** Next.js middleware refreshes Supabase auth tokens on every request using `@supabase/ssr`. Server Components use `supabase.auth.getClaims()` (not `getSession()`) to validate users.
**When to use:** Every server-side data fetch that requires the authenticated user's identity for RLS.

```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: Use getClaims(), not getSession(), for server-side auth validation
  const { data: { claims } } = await supabase.auth.getClaims()

  if (!claims && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}
```

### Pattern 2: RLS Policy Structure for Family Data
**What:** Every table in the hierarchy (families, holders, folios, transactions, nav_prices) has RLS enabled. The `families` table has a `user_id` column linking to `auth.users`. All child tables are accessed through JOINs that Postgres evaluates within RLS context.
**When to use:** All data tables — RLS is the security boundary, not application code.

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
-- Performance-optimized: use (select auth.uid()) to cache per statement, not per row

-- families table
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own family"
  ON families FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- holders table (child of families)
ALTER TABLE holders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access holders in their family"
  ON holders FOR ALL
  TO authenticated
  USING (
    family_id IN (
      SELECT id FROM families WHERE user_id = (select auth.uid())
    )
  );

-- Apply same pattern to folios, transactions, nav_prices
-- INDEX CRITICAL: CREATE INDEX ON holders(family_id); CREATE INDEX ON families(user_id);
```

### Pattern 3: CAS Import Pipeline
**What:** Client uploads PDF + password → Next.js API route forwards multipart to Python FastAPI endpoint → casparser extracts structured JSON → Next.js validates with Zod → batch upsert into Supabase. Ambiguous rows flagged with `import_status = 'needs_review'`.
**When to use:** DATA-01 and DATA-02 implementation.

```python
# Source: https://github.com/codereverser/casparser (MIT, v0.8.1)
# api/cas/parse.py
import casparser
from fastapi import FastAPI, UploadFile, Form
import tempfile, os

app = FastAPI()

@app.post("/api/cas/parse")
async def parse_cas(file: UploadFile, password: str = Form("")):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        data = casparser.read_cas_pdf(tmp_path, password or "")
        return {"status": "ok", "data": data}
    except casparser.exceptions.CASParseError as e:
        return {"status": "error", "message": str(e), "partial": None}
    finally:
        os.unlink(tmp_path)
```

```typescript
// Next.js route handler: validates and upserts casparser output
// app/api/cas/import/route.ts
import { createServerClient } from '@supabase/ssr'
import { CASOutputSchema } from '@/lib/validators/cas-schema'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const password = formData.get('password') as string

  // Forward to Python service
  const pyResponse = await fetch(`${process.env.PYTHON_API_URL}/api/cas/parse`, {
    method: 'POST',
    body: formData,
  })
  const parsed = await pyResponse.json()

  // Validate with Zod before touching DB
  const validated = CASOutputSchema.parse(parsed.data)

  // Upsert: folios matched by PAN, transactions upserted by (folio_id, date, description, units)
  // ... batch upsert logic
}
```

### Pattern 4: NAV Sync (User-Triggered)
**What:** Button in UI calls POST `/api/nav/sync`. Route fetches all distinct scheme codes held by any holder in the family → calls `GET https://api.mfapi.in/mf/{schemeCode}/latest` for each → upserts into `nav_prices` table with retry-3 logic. Shows "NAV as of [date]" from the `nav_prices.nav_date` column.
**When to use:** DATA-06 implementation.

```typescript
// mfapi.in endpoint for latest NAV
// GET https://api.mfapi.in/mf/{schemeCode}/latest
// Response: { meta: { scheme_name, scheme_code, ... }, data: [{ date, nav }] }

async function fetchNavWithRetry(schemeCode: string, attempt = 1): Promise<NavData> {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}/latest`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    if (attempt >= 3) throw err
    await new Promise(r => setTimeout(r, 1000 * attempt))
    return fetchNavWithRetry(schemeCode, attempt + 1)
  }
}
```

### Pattern 5: Jan 31, 2018 Grandfathering NAV Seed
**What:** One-time migration script (run as part of Phase 1 DB setup) fetches all scheme codes from AMFI, then calls `GET https://api.mfapi.in/mf/{schemeCode}?startDate=2018-01-31&endDate=2018-02-01` for each active scheme, inserts into `grandfathering_nav(scheme_code, nav, nav_date)`. This is a one-time script, not ongoing sync.
**When to use:** Phase 1 DB setup only. Cannot be deferred — Phase 3 tax engine depends on this table.

### Anti-Patterns to Avoid
- **Using `getSession()` server-side:** Returns unvalidated JWT data. Always use `getClaims()` or `getUser()` on the server.
- **RLS policies without indexes:** Policies on `user_id` or `family_id` without B-tree indexes cause sequential scans on every query. Always index policy columns.
- **Calling `auth.uid()` per row:** Wrap in `(select auth.uid())` so Postgres evaluates once per statement. 94-99% performance difference on large tables.
- **Storing PDF passwords:** Never persist the password. Decrypt in-memory during the request and discard.
- **Silently dropping failed CAS rows:** Set `import_status = 'needs_review'` on every ambiguous row. Surface to user.
- **Python subprocess from Node.js for PDF:** Brittle on Vercel. Use FastAPI microservice with proper `/api/` directory structure.
- **Importing all NAVs from mfapi.in on every sync:** Only sync NAVs for scheme codes currently held by the family. Bulk-fetch all schemes only for the grandfathering seed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CAS PDF parsing | Custom regex/pdfplumber layout parser | `casparser` 0.8.1 (MIT) | Handles CAMS + KFintech format variations, password decryption, AMFI code lookup; 5 years of community testing |
| Claude structured JSON output | JSON prompt + `json.loads()` with retries | `client.messages.parse()` with Pydantic schema | Guarantees schema compliance at token generation level; no parsing errors |
| Auth token management | Custom JWT refresh logic | `@supabase/ssr` + middleware pattern | Handles cookie rotation, token expiry, server/client boundary correctly |
| PDF password decryption | Custom AES decryption | `pikepdf.Pdf.open(password=)` | Handles all PDF encryption standards; MIT license |
| Component library | Custom shadcn-like components | `shadcn/ui` (source-in-project) | Copies Radix UI primitives into project; fully customizable; no runtime dependency |
| DB schema migrations | Manual ALTER TABLE scripts | `supabase db diff` + declarative schemas | Generates migration files from schema diffs; consistent across environments |

**Key insight:** The Indian MF data ecosystem has well-maintained open-source tooling (casparser, mftool, mfapi.in) built specifically for this problem. Do not reinvent CAS parsing — the format is complex enough that casparser has had 29 releases fixing edge cases.

---

## Common Pitfalls

### Pitfall 1: Vercel Python Bundle Size Exceeding 500 MB
**What goes wrong:** casparser + pdfplumber + anthropic + numpy (transitive) pushes the Python function bundle over Vercel's 500 MB uncompressed limit, causing deployment failures.
**Why it happens:** Python has no tree-shaking. All installed packages are bundled. NumPy is often pulled in transitively by scientific Python packages.
**How to avoid:** Use `casparser` without the `[fast]` extra (avoids PyMuPDF/GPL). Explicitly exclude test files and sample data in `vercel.json`. Pin dependencies tightly. Test bundle size locally with `vercel build` before deploying.
**Warning signs:** Deployment error "Serverless Function has exceeded the unzipped maximum size"

```json
// vercel.json — exclude test/static files from Python functions
{
  "functions": {
    "api/**/*.py": {
      "excludeFiles": "{tests/**,**/*.test.py,**/test_*.py,fixtures/**,sample-data/**}"
    }
  }
}
```

### Pitfall 2: RLS Blocking Legitimate Access
**What goes wrong:** Developer enables RLS, writes SELECT policies for `families`, but forgets INSERT/UPDATE/DELETE policies. App silently gets empty results or 403 errors on writes.
**Why it happens:** RLS in Supabase defaults to DENY ALL. Each operation (SELECT, INSERT, UPDATE, DELETE) requires its own policy.
**How to avoid:** Write four policies per table (or use `FOR ALL`). Test every CRUD operation in Supabase dashboard with an authenticated user context. Never test with the Supabase service key (bypasses RLS).
**Warning signs:** Empty arrays returned when data exists; writes appearing to succeed but data not appearing on read.

### Pitfall 3: CAS Import Matching Folios to Wrong Holder
**What goes wrong:** A CAMS CAS PDF covering multiple PANs (family statement) inserts all folios under a single holder or creates duplicate holders.
**Why it happens:** casparser returns `PAN` per folio. If the import code doesn't match PAN → holder_id before inserting, all folios land under the uploading user's default holder.
**How to avoid:** Before upsert, query `holders` table for all PANs in the family. Match each folio's PAN to the correct holder_id. If PAN not found, create a new holder record flagged as `pan_unmatched = true` for user review.
**Warning signs:** Holders showing holdings that belong to a different family member.

### Pitfall 4: Jan 31, 2018 NAV Seed Not Completed
**What goes wrong:** Phase 3 (Tax Engine) queries `grandfathering_nav` table and finds it empty or incomplete, causing incorrect LTCG calculations for pre-2018 holdings.
**Why it happens:** mfapi.in's historical data availability is not guaranteed indefinitely. If deferred, the data may no longer be fetchable.
**How to avoid:** Run the seed script as part of Phase 1 DB setup (not Phase 3). Include in the initial migration or a separate one-time seed step. Add a completeness check: count rows in `grandfathering_nav` and alert if below expected threshold (~8,000 active schemes).
**Warning signs:** Phase 3 LTCG calculations returning 0 grandfathering benefit for pre-2018 holdings.

### Pitfall 5: mfapi.in Rate Sensitivity During Bulk NAV Sync
**What goes wrong:** Syncing NAV for 100+ schemes simultaneously triggers mfapi.in rate limits or temporary blocks.
**Why it happens:** mfapi.in advises caching responses. Concurrent fetch loops without throttling can look like abuse.
**How to avoid:** Process scheme codes in batches of 10 with a 100ms delay between batches. Cache the `scheme_code → latest NAV` mapping in Supabase `nav_prices` — only re-fetch if `nav_date < today`.
**Warning signs:** `429 Too Many Requests` or intermittent empty responses from mfapi.in.

### Pitfall 6: Transaction Deduplication on Re-Import
**What goes wrong:** User uploads the same CAS PDF twice (or an updated CAS covering overlapping periods). Duplicate transactions inflate units and cost basis.
**Why it happens:** Simple INSERT without deduplication key.
**How to avoid:** Use `ON CONFLICT DO NOTHING` with a unique constraint on `(folio_id, transaction_date, transaction_type, units, amount)`. This is a natural business key for MF transactions.
**Warning signs:** Units reported are double the actual holding; cost basis is inflated.

---

## Code Examples

### Supabase Client Setup (Next.js App Router)
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
// lib/supabase/server.ts — for Server Components and Route Handlers
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

### Claude Structured Output for Ambiguous CAS Rows
```python
# Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
# Requires: pip install anthropic pydantic
from anthropic import Anthropic
from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal

class Transaction(BaseModel):
    transaction_date: date
    transaction_type: str  # "purchase" | "redemption" | "switch_in" | "switch_out" | "sip"
    units: Decimal
    nav: Decimal
    amount: Decimal
    folio_number: str
    scheme_name: str
    amfi_code: Optional[str] = None

class CASParseOutput(BaseModel):
    investor_pan: str
    transactions: list[Transaction]
    ambiguous_rows: list[str]  # raw text of rows that couldn't be parsed

client = Anthropic()

def parse_ambiguous_rows_with_claude(raw_text: str) -> CASParseOutput:
    response = client.messages.parse(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": f"""Parse this CAS statement text into structured transaction data.
Extract all mutual fund transactions. For rows you cannot parse with certainty,
include the raw text in ambiguous_rows rather than guessing.

CAS Text:
{raw_text}"""
        }],
        output_format=CASParseOutput,
    )
    return response.parsed_output
```

### mfapi.in Schema Code Lookup
```typescript
// Search for a fund by name to get its AMFI scheme code
// GET https://api.mfapi.in/mf/search?q=HDFC+Top+100
const searchFund = async (query: string) => {
  const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`)
  const schemes = await res.json()
  // Returns: [{ schemeCode: 100013, schemeName: "HDFC Top 100 Fund..." }, ...]
  return schemes
}

// Get latest NAV for a scheme
// GET https://api.mfapi.in/mf/100013/latest
const getLatestNav = async (schemeCode: number) => {
  const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}/latest`)
  const data = await res.json()
  // Returns: { meta: { scheme_name, ... }, data: [{ date: "19-03-2026", nav: "123.45" }] }
  return { date: data.data[0].date, nav: parseFloat(data.data[0].nav) }
}
```

### AMFI Direct NAV Flat File (Fallback Reference)
```typescript
// AMFI publishes NAVAll.txt at: https://www.amfiindia.com/spages/NAVAll.TXT
// Format per line: SchemeCode;ISINGrowth;ISINDivReinvest;SchemeName;NAV;Date
// Use this as fallback if mfapi.in is unavailable (per user deferred decision — document the URL)
const AMFI_NAV_URL = 'https://www.amfiindia.com/spages/NAVAll.TXT'
```

### shadcn/ui Component Addition Pattern
```bash
# Source: https://ui.shadcn.com/docs/installation/next
npx shadcn@latest init          # one-time setup
npx shadcn@latest add table     # holdings list
npx shadcn@latest add card      # family dashboard cards
npx shadcn@latest add button    # NAV sync button
npx shadcn@latest add dialog    # CAS upload modal
npx shadcn@latest add form      # manual holding entry
npx shadcn@latest add badge     # NAV freshness indicator
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023 | Old package deprecated; `@supabase/ssr` required for App Router |
| `getSession()` server-side | `getClaims()` / `getUser()` | 2024 | Security fix — `getSession()` doesn't revalidate JWT on server |
| Tailwind config file (`tailwind.config.ts`) | Inline theme in CSS with Tailwind v4 | 2025 | No config file required; CSS-first configuration |
| Beta header for Claude structured outputs | Generally available | Nov 2025 | No beta header needed; works with `claude-sonnet-4-6` |
| `casparser` with MuPDF dependency | `casparser` base (MIT, PDFMiner backend) | Ongoing | `[fast]` extra uses GPL-licensed MuPDF; base install is MIT-clean |
| Next.js Pages Router API routes | App Router route handlers (`route.ts`) | Next.js 13+ | App Router is default; Pages Router still works but not for new projects |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. Do not use.
- `casparser[fast]` in production: Brings in PyMuPDF with GPL/AGPL license — use base `casparser` unless licensing reviewed.
- `supabase.auth.getSession()` in server code: Security vulnerability — always use `getClaims()` or `getUser()`.

---

## Open Questions

1. **casparser vs pdfplumber+Claude for primary extraction**
   - What we know: casparser already extracts structured data including AMFI codes, transaction types, and folio-PAN mapping from both CAMS and KFintech PDFs (MIT license, v0.8.1, actively maintained)
   - What's unclear: Whether the user's locked decision on pdfplumber+Claude means casparser should not be used at all, or whether casparser is acceptable as the extraction layer (since it's built on pdfminer under the hood)
   - Recommendation: Planner should note this for user confirmation. casparser is strictly better as the extraction layer; Claude structured outputs remain valuable for ambiguous/flagged rows.

2. **mfapi.in historical data depth for grandfathering seed**
   - What we know: mfapi.in provides "5+ years" of NAV history and refreshes 6x daily. Jan 31, 2018 is ~8 years ago.
   - What's unclear: Whether mfapi.in has consistent NAV data for Jan 31, 2018 for all active schemes (some schemes launched after 2018 won't have this date — expected).
   - Recommendation: Run a test fetch for 10 schemes with pre-2018 inception dates before committing to the seed strategy. Document expected coverage (should be ~8,000+ schemes).

3. **Vercel Python function timeout for CAS parsing**
   - What we know: Vercel serverless functions have a default timeout (10s on Hobby, 60s on Pro). casparser + Claude API call on a large CAS PDF could approach these limits.
   - What's unclear: Exact processing time for a 150-page family CAS PDF with 10+ years of transactions.
   - Recommendation: Test casparser on a real large CAS PDF. If > 30s, consider streaming the response or using Vercel's Fluid compute (longer timeout).

---

## Validation Architecture

> nyquist_validation is enabled in .planning/config.json.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (latest) + React Testing Library |
| Config file | `vitest.config.mts` — see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FAM-01 | Family creation and holder addition CRUD | unit | `npx vitest run tests/family.test.ts -t "create family"` | ❌ Wave 0 |
| FAM-02 | Family dashboard shows correct total AUM | unit | `npx vitest run tests/dashboard.test.ts -t "total AUM"` | ❌ Wave 0 |
| FAM-03 | Drill-down route renders holder holdings | unit | `npx vitest run tests/holder.test.ts -t "holder holdings"` | ❌ Wave 0 |
| DATA-01 | CAMS PDF parse returns correct transactions | unit | `npx vitest run tests/cas-import.test.ts -t "CAMS"` | ❌ Wave 0 |
| DATA-02 | KFintech PDF parse returns correct transactions | unit | `npx vitest run tests/cas-import.test.ts -t "KFintech"` | ❌ Wave 0 |
| DATA-04 | Manual holding addition writes to DB | unit | `npx vitest run tests/manual-entry.test.ts` | ❌ Wave 0 |
| DATA-05 | Holdings list aggregates correctly per holder | unit | `npx vitest run tests/holdings.test.ts` | ❌ Wave 0 |
| DATA-06 | NAV sync calls mfapi.in and upserts nav_prices | unit | `npx vitest run tests/nav-sync.test.ts` | ❌ Wave 0 |
| (RLS) | RLS policies block cross-user data access | integration | `npx vitest run tests/rls.test.ts` | ❌ Wave 0 |
| (dedup) | Re-importing CAS doesn't create duplicate transactions | unit | `npx vitest run tests/dedup.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose` (relevant test file only)
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
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

## Sources

### Primary (HIGH confidence)
- [Supabase SSR docs](https://supabase.com/docs/guides/auth/server-side/nextjs) — getClaims(), middleware pattern, cookie management
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — Policy SQL patterns, performance optimization with `(select auth.uid())`
- [Claude structured outputs docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — `messages.parse()`, Pydantic models, GA status
- [mfapi.in API docs](https://www.mfapi.in/docs/) — All endpoints, no-auth, 6x daily refresh, JSON format
- [casparser GitHub](https://github.com/codereverser/casparser) — v0.8.1, MIT license, password support, JSON output schema
- [Vercel Python runtime docs](https://vercel.com/docs/functions/runtimes/python) — 500 MB bundle limit, FastAPI support, Python 3.12 default, excludeFiles config
- [shadcn/ui Next.js installation](https://ui.shadcn.com/docs/installation/next) — CLI commands, React 19 / Next.js 15 support
- [Next.js Vitest guide](https://nextjs.org/docs/app/guides/testing/vitest) — Official Vitest setup for App Router

### Secondary (MEDIUM confidence)
- [AMFI NAV flat file URL](https://www.amfiindia.com/spages/NAVAll.TXT) — Direct URL verified; format documented in multiple community projects
- [pikepdf docs](https://pikepdf.readthedocs.io/en/latest/tutorial.html) — Password decryption API verified; MIT license confirmed on PyPI
- [Vercel Python + Next.js guide](https://vercel.com/kb/guide/how-to-use-python-and-javascript-in-the-same-application) — FastAPI coexistence pattern with Next.js

### Tertiary (LOW confidence)
- Community reports of Vercel 500 MB limit being hit by pdfplumber + dependencies — not officially benchmarked for this exact stack; needs validation during Phase 1
- mfapi.in reliability for Jan 31, 2018 historical data — stated "5+ years" history but not explicitly confirmed to 2018; needs validation before committing to seed approach

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified against official docs and PyPI
- Architecture: HIGH — patterns derived from official Supabase + Next.js docs
- CAS parsing: HIGH — casparser verified on GitHub with schema output confirmed
- mfapi.in API: HIGH — endpoints verified against live API docs
- Pitfalls: MEDIUM — RLS and dedup pitfalls from official docs; Vercel bundle size is community-verified
- Jan 2018 NAV seed: MEDIUM — mfapi.in has historical data but depth to 2018 needs validation

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable APIs; mfapi.in availability should be re-checked if > 30 days)

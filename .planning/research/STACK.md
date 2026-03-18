# Stack Research: FolioAI

**Domain:** AI-powered personal portfolio management (India)
**Confidence:** HIGH for framework choices; MEDIUM for Indian API specifics

---

## Recommended Stack

### Framework & Runtime
| Layer | Choice | Version | Rationale |
|-------|--------|---------|-----------|
| Framework | Next.js | 15.x | App Router, server components, API routes in one project; proven in ALIP codebase |
| Language | TypeScript | 5.x | Financial calculations require type safety; catches unit/decimal errors at compile time |
| Runtime | Node.js | 20 LTS | Stable, wide library support for PDF parsing and financial math |

### Database & Backend
| Layer | Choice | Version | Rationale |
|-------|--------|---------|-----------|
| Database | Supabase (PostgreSQL) | Latest | Row-level security, real-time, auth, storage — proven in ALIP codebase |
| ORM | Direct SQL via Supabase client | — | Prisma adds abstraction cost without benefit for financial queries; raw SQL gives control for complex XIRR/tax queries |
| Background Jobs | Inngest | Latest | Async job queue for AI quarterly reports and NAV sync; avoids Vercel 60s function timeout |
| File Storage | Supabase Storage | — | CAS PDF storage before parsing |

### Financial Calculation
| Library | Purpose | Notes |
|---------|---------|-------|
| `decimal.js` | All money arithmetic | CRITICAL — never use JS `number` for currency; floating point errors cause wrong tax calculations |
| `date-fns` v3 | Holding period calculations | LTCG/STCG require exact day counts; date-fns handles IST, leap years, FY boundaries |
| Custom XIRR | Newton-Raphson XIRR | No reliable npm package; implement directly (50 lines); test against AMFI/Excel |

### Data Ingestion
| Source | Library / Method | Confidence |
|--------|-----------------|------------|
| CAMS/KFintech CAS (PDF) | `casparser` (PyPI, Python) or `pdf-parse` + regex (Node) | MEDIUM — casparser is Python; recommend Node.js pdf-parse + regex rules for CAS format |
| AMFI NAV (daily) | Direct HTTP fetch from amfiindia.com NAV file | HIGH — free, authoritative, no auth |
| mfapi.in (historical NAV) | REST API, no auth | HIGH — unofficial but widely used; good for historical NAV lookup |
| Zerodha Kite Connect v3 | REST API + WebSocket | HIGH — documented, ₹2000/month; use for stock holdings and transactions |
| MFCentral API | OAuth (partner registration required) | LOW — verify access; may need to start with PDF-only for MFs |
| Manual entry | Custom forms | HIGH — always works, fallback for all instruments |

### AI / LLM
| Component | Choice | Notes |
|-----------|--------|-------|
| LLM provider | Anthropic Claude (claude-sonnet-4-6) | Fund research, portfolio chat, quarterly review generation |
| AI SDK | Vercel AI SDK 4.x | Streaming, tool use, structured output; works with Claude |
| Async AI jobs | Inngest | Quarterly review generation can take 30-60s; needs async job queue |
| Context strategy | Summarized portfolio snapshot | Never send raw transactions to LLM; build structured context object |

### Frontend
| Component | Choice | Notes |
|-----------|--------|-------|
| UI components | shadcn/ui | Radix primitives + Tailwind; good for dashboard-heavy apps |
| Charts | Recharts | Portfolio performance charts, allocation pie, goal progress bars |
| CSS | Tailwind CSS v3 | Consistent with shadcn/ui |
| State management | React Server Components + minimal client state | Most portfolio data is server-rendered; only interactive widgets need client state |
| Date picker | react-day-picker | Works well with date-fns |

### Auth & Security
| Component | Choice | Notes |
|-----------|--------|-------|
| Auth | Supabase Auth | Email/password, magic link; RLS protects portfolio data per user |
| Multi-holder access | Supabase RLS policies | Each family member's data scoped by user_id; "manager" user can access all |
| PDF upload security | Supabase Storage + server-side parsing | Never expose CAS PDF to client after upload; parse server-side only |

### Deployment
| Component | Choice | Notes |
|-----------|--------|-------|
| Hosting | Vercel | Next.js native; edge functions for fast API routes |
| Cron jobs | Vercel Cron or Inngest scheduled | Daily NAV sync at 11:30 PM IST |
| Environment | `.env.local` → Vercel env vars | SUPABASE_SERVICE_KEY server-only; never expose to client |

---

## What NOT to Use

| Avoid | Use Instead | Reason |
|-------|-------------|--------|
| JS `number` for money | `decimal.js` | Float precision errors compound in portfolio calculations |
| LLM for tax calculations | Rule-based TypeScript engine | LLMs hallucinate numbers; tax errors have real financial consequences |
| Prisma ORM | Direct Supabase client / raw SQL | XIRR and tax queries are too complex for ORM abstraction |
| Real-time WebSocket stock prices | EOD price sync | Long-term investors don't need tick data; massive infra cost for no user value |
| MongoDB | PostgreSQL (Supabase) | Financial data is highly relational; transactions reference funds reference NAVs |
| `moment.js` | `date-fns` v3 | moment is deprecated; date-fns is tree-shakeable and immutable |
| Client-side XIRR | Server-side calculation | XIRR requires full transaction history; don't ship sensitive data to browser |

---

## Key Third-Party APIs

### AMFI (Association of Mutual Funds in India)
- **NAV file:** `https://www.amfiindia.com/spages/NAVAll.txt` — daily, free, no auth
- **Fund list:** Same file contains ISIN, scheme code, fund house, category
- **Historical NAV:** Not directly from AMFI; use mfapi.in for historical lookups
- **Update time:** Published by 11 PM IST on trading days

### mfapi.in
- **URL:** `https://api.mfapi.in/mf/{scheme_code}`
- **Returns:** Full NAV history for a scheme
- **Auth:** None (free, unofficial)
- **Risk:** Single-person maintained project; have fallback to AMFI file scraping

### Zerodha Kite Connect v3
- **Auth:** OAuth flow, access token valid 1 day
- **Holdings endpoint:** `GET /portfolio/holdings`
- **Trades endpoint:** `GET /orders/trades` (current day only)
- **Historical data:** Not available via standard Kite Connect — use contract notes / ledger
- **Cost:** ₹2000/month per app (not per user)
- **Limitation:** Historical transaction data requires Kite Connect Historical Data subscription (additional cost)

### MFCentral
- **Status:** Partner registration required; third-party access may be restricted
- **Recommendation:** Plan for CAMS/KFintech PDF as v1; MFCentral API as v2 enhancement

---

## CAS Parsing Notes

CAMS and KFintech PDFs have structured but different formats:

**CAMS format:**
- Header: investor name, PAN, email
- Each folio: fund name, folio number, ISIN
- Each transaction: date, description, amount, units, unit price, balance units

**KFintech format:**
- Similar structure but different field ordering and date formats
- Some fields use different terminology (e.g., "Gross Amount" vs "Amount")

**Recommended approach:**
1. Use `pdf-parse` to extract raw text from PDF
2. Two separate regex parsers: one for CAMS, one for KFintech
3. Detect which format based on header text
4. CDSL CAS (for stocks) is a third separate format

**casparser (Python library):** Excellent but Python-only. For a Node.js stack, implement CAS parsing in TypeScript using `pdf-parse` + documented regex patterns. This is 2-3 days of work but keeps the stack uniform.

---

## Confidence Levels

| Area | Confidence | Verify Before Building |
|------|-----------|------------------------|
| Next.js + Supabase + TypeScript | HIGH | No verification needed |
| decimal.js for money math | HIGH | Industry standard |
| AMFI NAV file format | HIGH | Check current URL still valid |
| Zerodha Kite Connect | HIGH | Verify pricing and historical data availability |
| mfapi.in reliability | MEDIUM | Test with real scheme codes before depending on it |
| MFCentral API access | LOW | Contact MFCentral before committing to API import |
| CAS parsing accuracy | MEDIUM | Test parser with real CAMS + KFintech PDFs early |
| Vercel AI SDK + Claude integration | HIGH | Well-documented, active development |

---
*Research compiled: 2026-03-18*

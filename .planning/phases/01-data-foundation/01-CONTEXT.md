# Phase 1: Data Foundation - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the schema, multi-holder family structure, CAS import pipeline, manual entry, and daily NAV sync so that users can import their complete portfolio history and the system maintains an accurate, up-to-date transaction ledger across all family members. UI for this phase is the holdings list per holder and the consolidated family dashboard.

Creating analytics, tax calculations, and AI features are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Tech Stack
- Framework: Next.js (full-stack — API routes collocated with frontend)
- Database + Auth: Supabase (Postgres + Supabase Auth; row-level security for financial data isolation)
- Styling: Tailwind CSS + shadcn/ui
- Deployment target: Supabase for DB; Next.js on Vercel or equivalent

### CAS Parser Strategy
- Approach: `casparser` as primary extraction layer (purpose-built for CAMS/KFintech PDFs, MIT license, handles both formats natively) → Claude structured outputs for ambiguous rows that casparser flags → programmatic validation layer checks every number before writing to DB
- Rationale: casparser is strictly better than pdfplumber for CAS PDFs — native format understanding, 29 releases of edge case fixes, returns AMFI scheme codes directly. Approved as casparser substitution during plan-phase (2026-03-19).
- Location: Server-side Python FastAPI endpoint (called from Next.js API route; never client-side)
- Password-protected PDFs (CAMS/KFintech use PAN+DOB as password): ask user to enter password at upload time; decrypt server-side; password never stored
- On parse failure or ambiguous rows: flag for manual review — import what can be parsed cleanly, surface unclear rows to user for correction; never silently drop data; never fail the entire import because of one bad row

### Data Model
- Structure: `Family → Holders → Folios` — user creates one Family, adds Holders (family members with PAN), each Holder has Folios (fund accounts); CAS import auto-matches folios to holders by PAN
- Transaction history: Full transaction ledger — every buy, SIP installment, redemption, and switch stored with date, units, NAV, and amount; required for Phase 2 XIRR and Phase 3 TaxLot FIFO
- Phase 1 asset scope: Mutual funds only; schema designed to accommodate stocks cleanly in Phase 5 (no premature implementation)
- Fund identity: AMFI scheme code as canonical key — `funds` master table keyed by AMFI scheme code (unique, stable); fund name, category, and AMC stored alongside; NAV table also keyed by scheme code; CAS import resolves fund name → scheme code on ingestion

### NAV Data Source
- Primary source: mfapi.in (free JSON API for Indian MF NAV)
- Sync trigger: User-triggered via a "Sync NAV" button in the UI — no automated cron for v1; portfolio values update on demand
- Failure handling: On sync failure, retry 3 times before surfacing an error; show "NAV as of [last successful date]" in UI so user always knows the data freshness; never show stale data silently
- Jan 31, 2018 NAV seed: Load historical NAVs for all active AMFI schemes into a dedicated `grandfathering_nav` table as a one-time migration script at Phase 1 DB setup; required for correct Phase 3 tax grandfathering for any user with pre-2018 holdings; cannot be recovered if deferred and mfapi.in drops historical data

### Claude's Discretion
- Exact Supabase RLS policy structure
- casparser configuration details and error handling approach
- Claude prompt template structure for ambiguous row parsing
- Specific schema column names and indexes beyond what's decided above
- mfapi.in retry implementation details
- UI layout for holdings list and family dashboard (Phase 2 handles analytics — Phase 1 just needs the list functional)

</decisions>

<specifics>
## Specific Ideas

- CAS PDFs are text-based (not scanned images) — casparser handles both CAMS and KFintech formats natively without separate code paths
- casparser outputs AMFI scheme codes directly per folio, eliminating the need for a separate fund resolution step
- Claude structured outputs handle ambiguous rows that casparser flags (the hybrid spirit: deterministic extraction + LLM for edge cases)
- Grandfathering NAV seed: "Seed at Phase 1 setup — one-time script, load Jan 31 2018 NAVs for all active schemes"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — this phase establishes the patterns

### Integration Points
- Phase 2 (Portfolio Analytics) reads from the transaction ledger and funds master built here
- Phase 3 (Tax Engine) reads from transactions + the `grandfathering_nav` table seeded here
- Phase 5 (Zerodha) adds stock holdings to the same Holder/Folio structure established here

</code_context>

<deferred>
## Deferred Ideas

- Automated cron for NAV sync — deferred to v2 or a later phase; user-triggered is sufficient for v1
- AMFI flat-file fallback for NAV (if mfapi.in reliability becomes a problem) — note in blockers, implement if issues arise
- MFCentral API integration for automated MF import — v2 (REQUIREMENTS.md ANLYV2-02)

</deferred>

---

*Phase: 01-data-foundation*
*Context gathered: 2026-03-19*

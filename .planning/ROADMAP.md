# Roadmap: FolioAI

## Overview

FolioAI is built in a strict dependency order: clean transaction data must exist before analytics can be computed, analytics must be correct before the tax engine can trust holdings, the tax engine must be accurate before AI can reference tax exposure, and goals/alerts/broker integration complete the engagement loop. Five phases, no shortcuts. Every phase delivers a coherent, verifiable capability that the user can see and use.

**UI Design System (ALL phases):** Every phase that ships UI must follow the design system in `.planning/frontend.html` — MD3 color tokens, Manrope/Work Sans typography, Material Symbols Outlined icons, and the established page layout pattern (hero → bento cards → 2/3 content + 1/3 sidebar). The full spec is in `.planning/phases/02-portfolio-analytics/02-CONTEXT.md` `<design_reference>`.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Foundation** - Schema, multi-holder family structure, CAS import, manual entry, and daily NAV sync (completed 2026-03-19)
- [ ] **Phase 2: Portfolio Analytics** - Holdings dashboard, XIRR, benchmark comparison, SIP tracking, and asset allocation view
- [ ] **Phase 3: Tax Engine** - LTCG/STCG with grandfathering, TaxLot FIFO, harvesting suggestions, and ITR capital gains export
- [ ] **Phase 4: AI Intelligence** - Fund scoring, replacement recommendations, portfolio chat, and quarterly review report
- [ ] **Phase 5: Goals, Alerts and Broker Integration** - Goal tracking, allocation drift alerts, underperformance alerts, and Zerodha stock import

## Phase Details

### Phase 1: Data Foundation
**Goal**: Users can import their complete portfolio history and the system maintains an accurate, up-to-date transaction ledger across all family members
**Depends on**: Nothing (first phase)
**Requirements**: FAM-01, FAM-02, FAM-03, DATA-01, DATA-02, DATA-04, DATA-05, DATA-06
**Success Criteria** (what must be TRUE):
  1. User can create a family, add multiple holders with names and PAN, and see a consolidated family dashboard
  2. User can upload a CAMS or KFintech CAS PDF and see all mutual fund holdings populated under the correct holder
  3. User can manually add a holding (fund name, units, purchase date, cost) and have it appear in the unified holdings list
  4. User can view all holdings (mutual funds) for any holder in a single list with current value updated from EOD NAV
  5. System automatically syncs NAV data from AMFI daily with no user action required
**Plans**: 6 plans

Plans:
- [ ] 01-01-PLAN.md — Project scaffold: Next.js 15, shadcn/ui, Vitest test infra, Python microservice manifest
- [ ] 01-02-PLAN.md — Database schema, RLS policies, Supabase client utilities, grandfathering NAV seed script
- [ ] 01-03-PLAN.md — Supabase auth (login/signup), Next.js middleware, protected route structure
- [ ] 01-04-PLAN.md — CAS PDF import pipeline: casparser FastAPI endpoint, Zod validation, DB upsert, upload UI
- [ ] 01-05-PLAN.md — Manual holding entry, holdings aggregation query, family/holder CRUD, holdings list UI
- [ ] 01-06-PLAN.md — NAV sync (mfapi.in, retry, batching), family dashboard with total AUM, human verify checkpoint

### Phase 2: Portfolio Analytics
**Goal**: Users can see exactly how their portfolio is performing — overall and per holding — with XIRR, absolute returns, benchmark comparison, SIP tracking, and asset allocation view
**Depends on**: Phase 1
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, PERF-06, SIP-01, SIP-02, ALLOC-01, ALLOC-02
**Success Criteria** (what must be TRUE):
  1. User can see total portfolio AUM, total invested, and absolute gain/loss (₹ and %) for each holder and family total
  2. User can see XIRR calculated from the full cashflow transaction series — per holding, per holder, and family total
  3. User can compare portfolio returns against Nifty 50 and fund category average, and switch between XIRR, absolute, and benchmark views
  4. User can view all active SIPs with next debit date and see SIP XIRR separately from lumpsum holdings
  5. User can define a target asset allocation and see current allocation vs target deviation, segmented by Indian financial year
**Plans**: TBD

### Phase 3: Tax Engine
**UI:** Follow `.planning/frontend.html` design system — MD3 tokens, Manrope headings, Material Symbols icons, bento card pattern for tax summary metrics.
**Goal**: Users can see exactly what their tax liability is on every holding — calculated correctly per Indian rules — and receive actionable LTCG harvesting suggestions before March 31
**Depends on**: Phase 2
**Requirements**: TAX-01, TAX-02, TAX-03, TAX-04, TAX-05
**Success Criteria** (what must be TRUE):
  1. User can see LTCG and STCG breakdown per holding, calculated correctly using TaxLot FIFO — equity 1-year rule, debt slab rate post-April 2023
  2. User can see grandfathering applied correctly for equity holdings purchased before February 1, 2018, using the correct MAX/MIN formula
  3. User can see "if I sell X units today, my tax is ₹Y" estimation in real time without LLM involvement
  4. User receives LTCG harvesting suggestions showing exactly how many units to sell per fund to consume the remaining ₹1.25L annual exemption
  5. User can generate and download an ITR-ready capital gains statement in Schedule CG format for the financial year
**Plans**: TBD

### Phase 4: AI Intelligence
**UI:** Follow `.planning/frontend.html` design system. The "AI Portfolio Health" dark card (`bg-primary text-on-primary`, circular score, fund bars) shown in the right sidebar of frontend.html is the reference for Phase 4 AI components.
**Goal**: Users can ask natural language questions about their portfolio and receive AI-generated fund scores, replacement recommendations, and quarterly review reports — all grounded in their actual holdings data, never hallucinated
**Depends on**: Phase 3
**Requirements**: AI-01, AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. Every fund in the user's portfolio shows an AI-generated scorecard covering expense ratio vs category, alpha, AUM trend, and manager track record
  2. AI identifies underperforming funds and recommends specific alternative funds with written reasoning, using SEBI-compliant advisory language
  3. User can ask natural language questions ("What's my XIRR since January 2022?", "How exposed am I to IT sector?") and receive accurate answers grounded in their actual transaction data
  4. AI generates a quarterly portfolio review narrative — what's performing well, what to review for exit, overall health assessment — available on demand
**Plans**: TBD

### Phase 5: Goals, Alerts and Broker Integration
**UI:** Follow `.planning/frontend.html` design system. Goals and alerts UI uses the same bento card pattern and MD3 tokens.
**Goal**: Users receive proactive alerts when their portfolio needs attention and can import stock holdings from Zerodha — completing the engagement loop so the app surfaces actionable next steps without the user having to seek them out
**Depends on**: Phase 2
**Requirements**: GOAL-01, GOAL-02, GOAL-03, ALLOC-03, ALRT-01, ALRT-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. User can create a financial goal, link specific holdings to it, and see projected corpus vs target with on-track / off-track status
  2. User receives an email alert when any held fund underperforms its benchmark category average for 6 or more consecutive months
  3. User receives an email alert when any asset class drifts beyond their defined threshold, and a tax harvesting window alert in February before March 31 deadline
  4. User can connect a Zerodha account via Kite Connect to import stock holdings and transactions, which then appear in the unified holdings view
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5
(Note: Phase 5 depends on Phase 2, not Phase 4 — can start Phase 5 in parallel with Phase 4 if needed)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 6/6 | Complete   | 2026-03-19 |
| 2. Portfolio Analytics | 3/6 | In Progress|  |
| 3. Tax Engine | 0/TBD | Not started | - |
| 4. AI Intelligence | 0/TBD | Not started | - |
| 5. Goals, Alerts and Broker Integration | 0/TBD | Not started | - |

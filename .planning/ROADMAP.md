# Roadmap: FolioAI

## Overview

FolioAI is built in a strict dependency order: clean transaction data must exist before analytics can be computed, analytics must be correct before the tax engine can trust holdings, the tax engine must be accurate before AI can reference tax exposure, and goals/alerts/broker integration complete the engagement loop. Five phases, no shortcuts. Every phase delivers a coherent, verifiable capability that the user can see and use.

**UI Design System (ALL phases):** Every phase that ships UI must follow the design files in `.planning/UI-design/` — MD3 color tokens, Manrope/Work Sans typography, Material Symbols Outlined icons. See REQUIREMENTS.md `UI Design System` section for the full token spec and page-to-design-file mapping.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Foundation** - Schema, multi-holder family structure, CAS import, manual entry, and daily NAV sync (completed 2026-03-19)
- [x] **Phase 2: Portfolio Analytics** - Holdings dashboard, XIRR, benchmark comparison, SIP tracking, and asset allocation view (completed 2026-03-20)
- [x] **Phase 3: Tax Engine** - LTCG/STCG with grandfathering, TaxLot FIFO, harvesting suggestions, and ITR capital gains export
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
**Plans**: 14 plans (6 feature + 3 UAT gap closure + 5 analytical gap closure)

Plans:
- [ ] 02-01-PLAN.md — Analytics lib: XIRR cashflow engine, SIP detection, benchmark comparison modules
- [ ] 02-02-PLAN.md — Holder analytics page: period selector, summary bento cards, holdings table with XIRR
- [ ] 02-03-PLAN.md — SIP section: active SIP cards with fund name, amount, detection from transactions
- [ ] 02-04-PLAN.md — Asset allocation section: bars, target deviation markers, Set Target modal
- [ ] 02-05-PLAN.md — Nifty 50 benchmark sync, benchmark comparison view on holder page
- [ ] 02-06-PLAN.md — Holder page assembly: wire all components, breadcrumb nav, family dashboard total row
- [ ] 02-07-PLAN.md — Gap closure: fix MD3 design system (globals.css shadcn alias overwrite, layout sidebar, component tokens)
- [ ] 02-08-PLAN.md — Gap closure: fix CAS import route to read flat casparser folio.transactions structure
- [ ] 02-09-PLAN.md — Gap closure: fix Set Target button (uncontrolled Dialog, DialogClose pattern)
- [ ] 02-10-PLAN.md — Gap closure: per-holding XIRR — compute xirr per folio_id in holder page (PERF-02)
- [ ] 02-11-PLAN.md — Gap closure: Nifty 50 benchmark XIRR — query nifty50_daily, build synthetic cashflows (PERF-03)
- [ ] 02-12-PLAN.md — Gap closure: view-mode toggle — XIRR/Absolute/Benchmark tabs in PeriodSelector (PERF-04)
- [ ] 02-13-PLAN.md — Gap closure: FY period — add 'FY' to PeriodSelector, wire getCurrentFY in getPeriodBounds (PERF-06)
- [ ] 02-14-PLAN.md — Gap closure: SIP XIRR — computeXIRR on sip_cashflows + terminal value in SipSection (SIP-02)

### Phase 3: Tax Engine
**UI:** Follow `.planning/UI-design/tax_and_ai.html` — Capital gains FY summary card (8/12 cols) + Compliance Vault (4/12 cols) at top; full-width dark harvesting hero section (`bg-primary`); Strategic Portfolio Narrative below; floating AI chat widget (fixed bottom-right, 450px wide). MD3 tokens, Manrope headings, Material Symbols icons throughout.
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
**UI:** Follow `.planning/UI-design/tax_and_ai.html` and `.planning/UI-design/Individual_holder_view.html`. Key components: "AI Portfolio Health" dark card in holder right sidebar (`bg-primary text-on-primary`, circular SVG quality score, per-fund alpha bars); "Strategic Portfolio Narrative" full-width card with `psychology` icon; floating chat widget (fixed bottom-right, `bg-primary` header, message bubbles). MD3 tokens, Manrope headings, Material Symbols icons.
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
**UI:** Follow `.planning/UI-design/goals_and_allocation.html`. Key layout: "Current vs Target" allocation bars with drift badges (`+10% Drift` in `error-container`, `On Track` in `secondary-container`); 3-col goals grid with progress bars and on-track/off-track status badges; Fund-Goal Visual Linkage connector row; AI Rebalance Strategy glassmorphism sidebar with tax impact callout. Separate "Asset Allocation" and "Goals" nav destinations. MD3 tokens, Manrope headings, Material Symbols icons.
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
| 2. Portfolio Analytics | 14/14 | Complete   | 2026-03-20 |
| 3. Tax Engine | 4/4 | Complete   | 2026-03-21 |
| 4. AI Intelligence | 0/TBD | Not started | - |
| 5. Goals, Alerts and Broker Integration | 0/TBD | Not started | - |

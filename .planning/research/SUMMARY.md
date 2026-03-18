# Project Research Summary

**Project:** FolioAI
**Domain:** AI-powered personal portfolio management for Indian long-term investors
**Researched:** 2026-03-18
**Confidence:** MEDIUM-HIGH — stack and architecture are HIGH; India-specific API access (MFCentral, CDSL) is LOW

## Executive Summary

FolioAI is a fintech product that sits in a well-understood category — Indian portfolio tracker — but with a clearly differentiated position: first-class family consolidation, AI-driven fund intelligence, and a tax engine that handles the full complexity of Indian tax law including grandfathering and lot-level debt fund rules. The recommended approach is to build a 5-layer system: data ingestion (CAS parsing + broker APIs) feeding an immutable transaction ledger, which drives a calculation engine (XIRR, tax), which feeds an AI layer (fund scoring, chat, quarterly review), which surfaces through a goal and alert dashboard. The entire architecture flows in one direction — raw transactions in, insights out — and this order is non-negotiable because every downstream layer depends on the prior one.

The single most important technical decision is to treat financial calculations as a two-class system: deterministic rule-based code for anything that produces a number (XIRR, tax, LTCG), and Claude for anything that produces a narrative (fund analysis, portfolio chat, quarterly review). LLMs must never produce tax numbers. India's tax law changes every Union Budget, so tax rules must be stored in a database with effective dates rather than hardcoded in application logic. The AI layer should always be injected with structured fund data from the database — RAG pattern is required, not optional — to prevent hallucinated fund facts from reaching the user.

The dominant risks are concentrated in Phase 1: getting the schema wrong (flat user model instead of user → family → holders, incorrect transaction types, missing corporate actions) requires a full migration to fix. CAS PDF parsing is inherently brittle and requires a post-parse validation step that compares parsed unit counts against the CAS closing balance. Data privacy (DPDP Act 2023) and SEBI RIA compliance (advisory language only, never imperative "you should buy") must be designed in from day one, not added as a compliance pass later.

## Key Findings

### Recommended Stack

The stack is Next.js 15 + TypeScript 5 + Supabase (PostgreSQL) — the same combination proven in the existing ALIP codebase. This is the right choice: App Router server components handle data-heavy portfolio pages without client-side fetching; Supabase RLS enforces per-user data isolation critical for financial data; PostgreSQL's numeric type handles decimal money math that JavaScript floats cannot. The single non-negotiable addition is `decimal.js` for all currency arithmetic — floating-point errors in compound portfolio calculations are silent and cumulative.

Background job infrastructure is required from the start: daily NAV sync at 11:30 PM IST and AI quarterly review generation both exceed Vercel's 60s function timeout. Inngest is the recommended solution. CAS parsing requires `pdf-parse` + two separate regex parsers (CAMS format and KFintech format are distinct) — the Python `casparser` library is better but incompatible with a Node.js stack. Historical NAV data comes from AMFI (free, authoritative) plus mfapi.in for history lookups; mfapi.in is unofficial and needs a fallback plan.

**Core technologies:**
- Next.js 15 (App Router): Full-stack framework with server components for data-heavy portfolio views
- TypeScript 5: Type safety prevents decimal/unit errors in financial calculations
- Supabase PostgreSQL: RLS for per-user data isolation; native decimal types for money
- `decimal.js`: All currency arithmetic — never use JS `number` for money
- `date-fns` v3: LTCG/STCG holding periods require exact day counts across IST, leap years, FY boundaries
- Custom XIRR (Newton-Raphson, ~50 lines): No reliable npm package; must implement and test against AMFI/Excel
- Inngest: Background jobs for NAV sync and AI quarterly report generation (exceeds Vercel 60s limit)
- Anthropic Claude (claude-sonnet-4-6) + Vercel AI SDK 4.x: Fund research, portfolio chat, quarterly review narratives
- shadcn/ui + Recharts + Tailwind: Dashboard-heavy UI with portfolio charts and goal progress

### Expected Features

The complete feature breakdown is in `.planning/research/FEATURES.md`. Key summary below.

**Must have (table stakes — launch without these = product feels broken):**
- CAS import (CAMS + KFintech PDF) — primary data entry path; PDF is non-negotiable
- Manual holdings entry — fallback for all users
- Portfolio AUM + per-holding breakdown (units, current value, invested, gain/loss)
- XIRR per holding and overall — absolute return alone is misleading for SIP investors
- LTCG/STCG calculation with grandfathering — tax accuracy is a trust issue, not just a feature
- ITR capital gains export (Schedule CG format) — primary tax-season retention driver
- Tax loss harvesting suggestions (pre-March 31) — highest perceived value tax feature
- Family consolidated view + per-member drill-down — core FolioAI differentiator
- Benchmark comparison (Nifty 50 + category average)
- Asset allocation view with target vs current deviation
- SIP tracking (active SIPs, next debit date)
- AI fund scoring (expense ratio, alpha, category rank, manager track record)
- AI fund replacement recommendations
- Portfolio chat (natural language queries over own portfolio data)
- AI quarterly review report
- Goal creation + projection with underfunding alerts
- Underperformance alert (6+ months below benchmark)

**Should have (post-launch, v1.x):**
- MFCentral API import (cleaner than PDF; add once API access confirmed)
- Broker API import for stocks (Zerodha, Groww)
- ELSS lock-in tracker (per-installment 3-year lock-in dates)
- Rebalancing alerts with specific rupee action
- NPS tracking
- LTCG tax liability estimator ("if I sell today, my tax bill is X")
- AI annual review report

**Defer (v2+):**
- Mobile app (iOS/Android) — web-first for v1
- Fund overlap analysis — requires monthly AMC portfolio disclosure pipeline
- EPF balance tracking — EPFO API is unreliable
- US stocks — different data sources, FEMA considerations, out of India scope for v1
- Dividend/IDCW slab-rate tax tracking

**Anti-features (do not build):**
- Real-time stock price ticks (wrong user; high infra cost; anxiety-inducing)
- Trade execution (requires SEBI RIA license; out of scope by design)
- AI-generated tax numbers (LLMs hallucinate; tax errors have legal consequences)
- Social comparison features (privacy nightmare with financial data)

### Architecture Approach

The architecture is a strict 5-layer pipeline: ingestion layer (CAS parser, broker API, manual entry) feeds an immutable transaction ledger (append-only, never mutated), which is the source of truth for a calculation engine (holdings aggregator, XIRR, tax engine with FIFO TaxLots), which feeds the AI intelligence layer (fund scorer, recommendation engine, portfolio chat, quarterly review), which surfaces through a presentation layer (dashboard, goal tracker, tax reports, alert center). Holdings and tax positions are always derived/cached, never stored as primary data. The multi-holder schema must be designed as `users → families → holders → folios → transactions` from day one — retrofitting the family layer later requires a full migration.

**Major components:**
1. Ingestion Service — CAS PDF parsing (CAMS + KFintech + CDSL as separate parsers), broker API sync, manual entry forms; outputs immutable Transaction rows
2. NAV Sync Cron — daily Inngest job fetching AMFI NAV file at 11:30 PM IST; always use `<= date ORDER BY nav_date DESC LIMIT 1` pattern (never exact date match, NAV is null on holidays)
3. Calculation Engine — Holdings aggregator (rebuilt from transaction replay), XIRR (full cashflow series, not snapshot), Tax Engine (TaxLot FIFO, lot-level rules, DB-driven tax rates with effective dates)
4. AI Service — RAG layer: fetch fund facts from DB, sanitize PII, inject as structured context to Claude; never send raw transactions to LLM
5. Alert Service — daily evaluation after NAV sync: underperformance, allocation drift, pre-March 31 tax harvesting window

### Critical Pitfalls

The full pitfall list (12 items) is in `.planning/research/PITFALLS.md`. Top 5 most impactful:

1. **Wrong multi-holder schema** — Build `users → families → holders → folios → transactions` from day one. A flat `user → portfolios` model requires a full schema migration to add family consolidation; this is the core FolioAI differentiator.

2. **XIRR from holdings snapshot, not transaction log** — XIRR must use the full cashflow series `[{date, cashflow}, ...]` with buys as negative and current value as the final positive. Snapshot-based XIRR is silently wrong by 3–8% for SIP portfolios. Fix this retroactively = full schema migration.

3. **Tax rules hardcoded in application code** — Store all tax rules in a `tax_rules` DB table with `effective_from` date. Budget 2024 alone changed LTCG rate, exemption limit, and debt indexation treatment. Hardcoded rules break every Union Budget (Feb 1).

4. **CAS parser without post-parse validation** — CAS PDF templates change without notice. Always validate: parsed unit count must match the "closing balance" in the CAS statement. Silent parse failures corrupt all downstream tax and performance data.

5. **AI giving investment advice (SEBI RIA violation)** — Prompt guardrails must prevent imperative language ("you should buy/sell"). Output filter must scan for "should/must/buy/sell" before rendering. Legal disclaimer on all AI outputs is mandatory.

Additional high-severity pitfalls: grandfathering formula must use `MAX(actual_cost, MIN(jan31_nav, sale_price))` not just `MAX(actual_cost, jan31_nav)`; debt fund 2023 rule applies at lot level not fund level; PAN must be hashed at storage (DPDP Act 2023 compliance); NAV lookups must use `<= date` not exact date match.

## Implications for Roadmap

Based on the dependency chain identified in architecture research and the phase-mapping in pitfalls research, the build order is strict: each phase depends on the prior. There is no parallelization opportunity between Phase 1, 2, and 3.

### Phase 1: Data Foundation
**Rationale:** Every feature in the product depends on clean, complete transaction data. This phase cannot be shortened or parallelized. The schema decisions made here (family hierarchy, transaction types, immutable ledger) are the hardest to change later.
**Delivers:** Working data entry (CAS import + manual entry), complete transaction ledger, daily NAV sync, multi-holder family structure, authenticated user model with per-user data isolation
**Addresses:** CAS import, manual entry, family member management, SIP tracking (from FEATURES.md)
**Avoids:** Pitfalls 1 (wrong XIRR), 2 (hardcoded tax rules), 4 (brittle CAS parser), 7 (missing corporate actions), 9 (flat multi-holder schema), 10 (exact NAV date lookup), 11 (PII in plaintext)
**Research flag:** Needs phase research — CAS PDF format quirks require test corpus; MFCentral API access status needs verification before committing to API import in v1

### Phase 2: Portfolio Analytics
**Rationale:** Once transactions and NAV history exist, holdings computation, XIRR, and benchmark comparison are straightforward derivations. These are the foundational "what do I own and how is it doing?" views that make the app feel complete to the first user.
**Delivers:** Holdings dashboard (AUM, per-holding breakdown), XIRR (full cashflow series), asset allocation view, benchmark comparison (Nifty 50 + category average), SIP analytics, family consolidated view + per-member drill-down
**Uses:** `decimal.js` for all calculations, `date-fns` for holding periods, custom XIRR implementation
**Implements:** Holdings aggregator, XIRR calculator, multi-holder family dashboard
**Avoids:** Pitfall 1 (XIRR from snapshot — must use transaction log)
**Research flag:** Standard patterns — well-documented XIRR algorithm; no deep research needed

### Phase 3: Tax Engine
**Rationale:** Tax is the top-3 use case for Indian investors and the primary source of trust or distrust. It must be built as a separate, unit-tested, DB-rule-driven engine before any AI features depend on it. Getting tax wrong after AI features launch is a trust crisis.
**Delivers:** TaxLot FIFO computation, LTCG/STCG classification (equity + debt, grandfathering, lot-level debt 2023 rule, Budget 2024 indexation options), capital gains report (Schedule CG), tax loss harvesting suggestions, ELSS lock-in tracking
**Uses:** DB-driven `tax_rules` table with effective dates; `date-fns` for holding period day counting; `decimal.js` for all gain calculations
**Implements:** Tax Engine (deterministic, never LLM), TaxLot store
**Avoids:** Pitfalls 2 (hardcoded tax rules), 3 (wrong grandfathering formula), 8 (debt rule at fund level), 12 (Budget 2024 indexation misapplied)
**Research flag:** Needs phase research — India tax rule complexity; recommend verifying grandfathering formula against CBDT examples and current LTCG exemption limits before implementation

### Phase 4: AI Intelligence Layer
**Rationale:** AI features are the core FolioAI differentiator but require the full data foundation (Phase 1), accurate performance data (Phase 2), and correct tax data (Phase 3) to be meaningful. Building AI on incomplete data destroys trust faster than having no AI. This phase also requires legal review of prompts before launch.
**Delivers:** Fund scoring (expense ratio, alpha, category rank, manager track record), AI fund replacement recommendations, portfolio chat (RAG over structured holdings data), AI quarterly review report generation (async via Inngest)
**Uses:** Claude claude-sonnet-4-6 + Vercel AI SDK; Inngest for async report generation (60s+ job); RAG pattern — always inject fund facts from DB, never from LLM training knowledge
**Implements:** AI Service (context builder, PII sanitizer, Claude integration), Fund Metadata store (AMFI categorization), quarterly review Inngest job
**Avoids:** Pitfalls 5 (AI giving advice — SEBI violation), 6 (AI hallucinating fund facts)
**Research flag:** Needs phase research — RAG context design for portfolio chat; prompt engineering for SEBI-compliant output; Inngest job architecture for report generation

### Phase 5: Goals, Alerts and Broker Integration
**Rationale:** Goal tracking and alerts complete the engagement loop (users return because the app tells them when something needs attention). Broker API integration adds stock tracking for users with Zerodha/Groww accounts. Both can be built in parallel since they depend on Phase 1–2 but not on Phase 3–4.
**Delivers:** Goal creation + projection + underfunding alerts, allocation drift alerts, underperformance alerts (6+ months below benchmark), rebalancing suggestions, Zerodha Kite Connect integration for stock holdings, email alert delivery
**Uses:** Inngest scheduled jobs for daily alert evaluation after NAV sync
**Implements:** Alert Service, Goal Tracker, Broker Integration Service
**Avoids:** Anti-features: real-time price ticks (not needed), WhatsApp/Telegram (out of scope), trade execution (SEBI violation)
**Research flag:** Needs phase research — Zerodha Kite Connect historical data availability and pricing for stocks

### Phase Ordering Rationale

- **Phase 1 before everything:** Transaction ledger and schema decisions (family hierarchy, corporate action types, XIRR cashflow model) are foundational. Wrong decisions here require full migrations. No shortcuts.
- **Phase 2 before Phase 3:** Holdings aggregation must be working before TaxLot FIFO can reference it. XIRR calculation validates that the transaction model is correct before tax engine trusts it.
- **Phase 3 before Phase 4:** AI fund analysis and portfolio chat become more valuable when they can reference the user's actual tax exposure ("this fund has ₹30K LTCG if sold today"). Tax engine accuracy also prevents AI from producing context that contradicts what the rule-based engine calculated.
- **Phase 5 is parallel-capable:** Goals and broker integration have no dependency on Phase 4. They can be developed in parallel with Phase 4 by a second developer or started immediately after Phase 2.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:
- **Phase 1:** CAS parsing — need real PDF samples from CAMS and KFintech to design regex parsers; MFCentral API access status needs verification; CDSL CAS format documentation
- **Phase 3:** India tax rule implementation — grandfathering formula verification against CBDT; debt fund lot-level rules; Budget 2024 indexation two-option calculation; recommend external CA review of tax engine before launch
- **Phase 4:** RAG architecture for portfolio chat — token budget design, context sanitization strategy, SEBI prompt compliance; Inngest job design for async report generation
- **Phase 5:** Zerodha Kite Connect pricing and historical transaction data availability (historical data requires additional subscription)

Phases with standard patterns (skip research-phase):
- **Phase 2:** XIRR algorithm is well-documented (Newton-Raphson with cashflow series); holdings aggregation is standard fintech; no India-specific complexity
- **Phase 5 (goals/alerts):** Goal projection math and alert evaluation are standard patterns; no deep research needed

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js + Supabase + TypeScript is proven; decimal.js and date-fns are industry standard; Inngest well-documented |
| Features | MEDIUM | Competitor analysis based on training knowledge through August 2025; AI feature landscape evolves rapidly; recommend manual verification of INDMoney and Kuvera current state before roadmap finalization |
| Architecture | HIGH | Core data models (immutable transaction ledger, TaxLot FIFO, computed holdings) are standard fintech patterns; India-specific complexity well-researched |
| Pitfalls | HIGH | India-specific and actionable; mapped to phases; tax rules verified against Budget 2024; grandfathering formula from CBDT source |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **MFCentral API access:** Partner registration required; third-party access restricted as of 2024. Treat as v1.x feature, not v1 launch. Plan v1 as PDF-only for MF import.
- **CDSL CAS format for stocks:** Partnership required for API access. Start with PDF-only for stock import; treat broker API (Zerodha) as the primary stock import path.
- **mfapi.in reliability:** Unofficial, single-person maintained. Build fallback to direct AMFI file scraping before launch. Verify with real scheme codes in early Phase 1.
- **CAS parser accuracy:** Must be validated with real CAMS and KFintech PDFs (10+ samples from different AMCs, different date ranges) before Phase 1 is considered complete. Parser accuracy gates all downstream calculations.
- **Jan 31, 2018 NAV seed data:** Must be seeded permanently in the database at launch. Cannot be re-fetched from AMFI later. Failure to seed this data at Phase 1 = grandfathering unavailable for HNI users in Phase 3.
- **SEBI RIA compliance review:** Legal review of AI prompt templates and output filter rules before Phase 4 launch. The line between "analysis" and "advice" requires legal opinion for the Indian market.
- **Budget updates:** LTCG exemption and rates may change again in Union Budget 2026 (Feb 1, 2026 — 6 weeks before this research was compiled). Verify current exemption limit (₹1.25L or updated) before Tax Engine implementation.

## Sources

### Primary (HIGH confidence)
- India income tax rules: LTCG/STCG equity (1-year rule, 12.5% above ₹1.25L post-Budget 2024), STCG 15%, debt fund rule change April 2023, grandfathering Jan 31 2018 — CBDT and Budget 2024 Finance Act
- AMFI public NAV file format: `https://www.amfiindia.com/spages/NAVAll.txt` — authoritative, free, daily
- Zerodha Kite Connect v3 API documentation — REST endpoints, OAuth, pricing
- SEBI RIA regulations — advisory-only constraint for investment platforms
- CAMS / KFintech CAS format — industry standard, documented by RTAs

### Secondary (MEDIUM confidence)
- Competitor feature analysis: Kuvera, INDMoney, Groww, Zerodha Coin, Scripbox, Fisdom, mProfit, StockEdge, Value Research Online — training knowledge through August 2025; platforms are well-established but features evolve
- mfapi.in REST API — functional as of training cutoff; reliability and maintenance status should be verified
- Inngest background job architecture — documentation reviewed; no India-specific issues identified

### Tertiary (LOW confidence)
- MFCentral API access — partner registration required; third-party access reported as restricted; verify before committing to API import
- CDSL easiest API — partnership required; treat as v2; PDF upload is the v1 path for stock CAS

---
*Research completed: 2026-03-18*
*Ready for roadmap: yes*

---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 05-05-PLAN.md
last_updated: "2026-03-25T10:26:54.267Z"
last_activity: 2026-03-21 — Completed Phase 3 Tax Engine
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 37
  completed_plans: 32
  percent: 84
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Give a long-term Indian investor complete clarity over their family's wealth: what they own, how it's performing vs benchmarks, whether they're on track for goals, and exactly what to do next — powered by AI.
**Current focus:** Phase 4 — AI Intelligence

## Current Position

Phase: 3 of 5 (Tax Engine)
Plan: 4 of 4 in current phase
Status: Complete
Last activity: 2026-03-21 — Completed Phase 3 Tax Engine

Progress: [████████░░] 84%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-data-foundation P01 | 10 | 3 tasks | 30 files |
| Phase 01-data-foundation P02 | 7 | 3 tasks | 10 files |
| Phase 01-data-foundation P03 | 7 | 3 tasks | 11 files |
| Phase 01-data-foundation P04 | 8 | 3 tasks | 6 files |
| Phase 01-data-foundation P05 | 9 | 2 tasks | 15 files |
| Phase 01-data-foundation P06 | 4min | 2 tasks | 7 files |
| Phase 02-portfolio-analytics P01 | 2min | 2 tasks | 4 files |
| Phase 02-portfolio-analytics P03 | 3min | 2 tasks | 5 files |
| Phase 02-portfolio-analytics P02 | 5min | 2 tasks | 8 files |
| Phase 02-portfolio-analytics P05 | 4min | 2 tasks | 5 files |
| Phase 02-portfolio-analytics P04 | 6min | 2 tasks | 7 files |
| Phase 02-portfolio-analytics P06 | 3 | 2 tasks | 2 files |
| Phase 02-portfolio-analytics P09 | 2min | 1 tasks | 1 files |
| Phase 02-portfolio-analytics P08 | 2min | 2 tasks | 2 files |
| Phase 02-portfolio-analytics P07 | 3min | 3 tasks | 3 files |
| Phase 02-portfolio-analytics P10 | 3min | 1 tasks | 1 files |
| Phase 02-portfolio-analytics P14 | 2min | 1 tasks | 1 files |
| Phase 02-portfolio-analytics P11 | 3min | 1 tasks | 1 files |
| Phase 02-portfolio-analytics P12 | 2min | 1 tasks | 3 files |
| Phase 02-portfolio-analytics P13 | 3min | 1 tasks | 2 files |
| Phase 02-portfolio-analytics P15 | 3min | 2 tasks | 1 files |
| Phase 04-ai-intelligence P01 | 5min | 2 tasks | 9 files |
| Phase 04-ai-intelligence P02 | 5min | 3 tasks | 4 files |
| Phase 04-ai-intelligence P03 | 15min | 2 tasks | 6 files |
| Phase 04-ai-intelligence P04 | 12min | 2 tasks | 4 files |
| Phase 04-ai-intelligence P05 | 4min | 2 tasks | 7 files |
| Phase 05-goals-alerts-and-broker-integration P01 | 5min | 2 tasks | 8 files |
| Phase 05-goals-alerts-and-broker-integration P02 | 63s | 2 tasks | 2 files |
| Phase 05-goals-alerts-and-broker-integration P03 | 15min | 2 tasks | 5 files |
| Phase 05-goals-alerts-and-broker-integration P04 | 15min | 2 tasks | 7 files |
| Phase 05-goals-alerts-and-broker-integration P05 | 3min | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-Phase 1]: Rule-based tax engine (not LLM) — tax errors have real financial consequences
- [Pre-Phase 1]: EOD prices, not real-time — long-term investing; reduces infra cost
- [Pre-Phase 1]: Advisory only, no trade execution — SEBI RIA compliance
- [Pre-Phase 1]: All 4 AI features in v1 — core differentiator
- [Pre-Phase 1]: CAMS + broker API + manual entry — all 3 import paths needed for adoption
- [Phase 01-data-foundation]: Next.js 15.5.13 security backport used (not 15.3.1) — CVE-2025-66478 patched
- [Phase 01-data-foundation]: casparser base package (not [fast]) — avoids PyMuPDF GPL/AGPL licensing
- [Phase 01-data-foundation]: it.todo() stubs for all test cases — downstream plans implement without creating new files
- [Phase 01-data-foundation]: CookieMethodsServer explicit type annotation used in server.ts — strict TypeScript required explicit types for cookie setAll callback
- [Phase 01-data-foundation]: Hierarchical RLS via subquery chains: transactions check folio → holder → family → user_id (no denormalized user_id on child tables)
- [Phase 01-data-foundation]: Grandfathering seed as external TypeScript script (not SQL INSERT) — NAV data requires live mfapi.in API fetch
- [Phase 01-data-foundation]: getClaims() used everywhere for server-side auth (not getSession() — doesn't revalidate JWT)
- [Phase 01-data-foundation]: Route group (dashboard)/dashboard/ subfolder required — route groups don't add URL path segments in Next.js
- [Phase 01-data-foundation]: Database GenericSchema requires Relationships/Views/Functions fields — added to types.ts for postgrest-js compatibility
- [Phase 01-data-foundation]: supabase.from() write ops use (as any) cast — postgrest-js v2.99.2 infers Insert as never for custom Database generics; typed insert objects declared first for type safety
- [Phase 01-data-foundation]: pan_unmatched=true holder created for unknown PANs during CAS import — placeholder created, user can rename after import
- [Phase 01-data-foundation]: HoldingRow interface moved before Database in types.ts — TypeScript forward reference requires declaration order before use in Functions type
- [Phase 01-data-foundation]: Test constants use valid UUID format — Zod z.string().uuid() rejects non-UUID strings; test-holder-id fails validation causing false 400s
- [Phase 01-data-foundation]: get_holder_holdings uses SECURITY DEFINER + HAVING net_units > 0 — runs with schema owner permissions, filters redeemed funds at DB level
- [Phase 01-data-foundation]: supabase.from() as any cast in nav sync — same postgrest-js v2.99.2 limitation; typed results via inline type assertion
- [Phase 01-data-foundation]: FamilyDashboard as Server Component with per-holder RPC calls — N+1 acceptable for Phase 1 (2-5 holders); optimize in Phase 2 if needed
- [Phase 01-data-foundation]: already_current field in NAV sync response — prevents misleading 0 synced when all schemes were already up to date today
- [Phase 02-portfolio-analytics]: Comment-only imports in test scaffolds — avoids module resolution failure before implementation files exist
- [Phase 02-portfolio-analytics]: it.todo() with no callback for Wave 0 stubs — Vitest skips without executing, zero test failures before modules implemented
- [Phase 02-portfolio-analytics]: XIRR computed in TypeScript after RPC call, never in SQL — iterative math unsuitable for SQL
- [Phase 02-portfolio-analytics]: nifty50_daily has no user-write RLS policy — only service role writes, prevents benchmark manipulation
- [Phase 02-portfolio-analytics]: holder_allocation_targets uses DB-level CHECK (equity + debt + gold + international <= 100) as backup to Zod
- [Phase 02-portfolio-analytics]: TDD RED→GREEN for analytics modules — tests with real imports written before implementation files, import failure confirms RED phase
- [Phase 02-portfolio-analytics]: findSIPRun() iterates from each candidate start for longest qualifying run (25-35d gaps, ±5% amount) per folio — not greedy single-pass
- [Phase 02-portfolio-analytics]: AllocationSection uses direct Supabase query for targets, not GET /api/allocation — avoids HTTP overhead in Server Component
- [Phase 02-portfolio-analytics]: fundCategories prop passed from parent page to AllocationSection — parent fetches funds table scheme_code→category map, avoids N+1
- [Phase 02-portfolio-analytics]: Tailwind v4 uses @theme inline CSS variables instead of tailwind.config.ts — MD3 tokens added as --color-* variables in globals.css
- [Phase 02-portfolio-analytics]: HoldingsTable uses HoldingRowWithAnalytics instead of HoldingRow — holder page maps null for analytics fields until XIRR computation is wired
- [Phase 02-portfolio-analytics]: Auth check delegated to dashboard layout — holder page does not repeat getClaims()
- [Phase 02-portfolio-analytics]: Holder page as pure assembly: business logic in analytics lib modules; page only fetches data and composes components
- [Phase 02-portfolio-analytics]: SetTargetModal uses uncontrolled Dialog (no open/onOpenChange) — eliminates hydration failure surface where controlled open=false interferes with Radix internal state machine
- [Phase 02-portfolio-analytics]: CASFolioSchema accepts both flat folio and nested schemes formats via optional fields with defaults — avoids breaking nested-format callers while supporting real-world CAMS output
- [Phase 02-portfolio-analytics]: Import route normalises folio input into NormalisedScheme schemeList before loop — handles both casparser output shapes without duplicating inner loop body
- [Phase 02-portfolio-analytics]: Shadcn var() aliases removed from @theme inline — Tailwind v4 reads --color-* as hex directly; :root retains shadcn vars for shadcn components
- [Phase 02-portfolio-analytics]: Dashboard layout uses fixed w-64 sidebar + ml-64 main (no top navbar) — matches frontend.html design
- [Phase 02-portfolio-analytics]: Per-holding XIRR uses single folio's current_value as terminal cashflow, not buildPortfolioCashflows which sums all holdings
- [Phase 02-portfolio-analytics]: estimateFolioCurrentValue uses net units x most recent transaction NAV as proxy for SIP terminal value — avoids adding holdings prop to SipSection; acceptable approximation for Phase 2
- [Phase 02-portfolio-analytics]: Nifty 50 benchmark XIRR uses synthetic cashflows (same amounts, index units) — forward-5-day search handles holidays without crashing
- [Phase 02-portfolio-analytics]: Clicking active view tab deselects it (clears 'view' param) — returns to all-cards-equal mode without adding a separate 'All' button
- [Phase 02-portfolio-analytics]: Benchmark mode highlights XIRR and AUM cards (XIRR shows vs Nifty 50 line; AUM is portfolio total being compared)
- [Phase 02-portfolio-analytics]: FY case added to getPeriodBounds before msMap fallthrough — getCurrentFY() now user-visible via 'This FY' button in PeriodSelector
- [Phase 02-portfolio-analytics]: Family dashboard: div-based table with role=table/row/cell used instead of tr/td to allow Link wrapping of rows in Server Component
- [Phase 02-portfolio-analytics]: Family XIRR aggregates all holder transactions into one cashflow series with totalAUM as terminal value
- [Phase 02-portfolio-analytics]: Top Performing Funds uses absolute return as proxy for 1Y return — 1Y NAV history not available in Phase 2
- [Phase 04-ai-intelligence]: AI SDK packages installed in Wave 0 so Plans 02-04 can import without install step
- [Phase 04-ai-intelligence]: Stub functions throw Not implemented — Phase 4 Plan 02 for clear error before implementation
- [Phase 04-ai-intelligence]: fund_ai_scores UNIQUE(holder_id, scheme_code) — upsert semantics; portfolio_narratives UNIQUE(holder_id) — one active narrative per holder
- [Phase 04-ai-intelligence]: computeAlpha uses 90-day span check — more precise than counting transactions for insufficient data detection
- [Phase 04-ai-intelligence]: sync-ter.ts uses individual UPDATE per scheme_code — only updates funds that already exist in DB, no phantom rows
- [Phase 04-ai-intelligence]: buildNavHistoryFromTransactions uses purchase transaction navs as proxy for AUM trend — avoids nav_prices per-fund query
- [Phase 04-ai-intelligence]: RefreshScoresButton is separate 'use client' component to keep AIPortfolioHealth as pure Server Component
- [Phase 04-ai-intelligence]: Holder page merges scheme_name from rawHoldings into aiScores by scheme_code — join avoids extending FundScore DB type
- [Phase 04-ai-intelligence]: AI SDK v6 TextStreamChatTransport used for chat (not DefaultChatTransport) — matches toTextStreamResponse() on route side
- [Phase 04-ai-intelligence]: SDK v6 prepareSendMessagesRequest bridges UIMessage.parts format to route Zod schema expecting {role, content} string
- [Phase 04-ai-intelligence]: holderId not passed from dashboard layout — chat defaults to generic prompt in v1; holderId enhancement deferred to future phase
- [Phase 04-ai-intelligence]: Tax page fetches narrative for first holder only in v1 — per-holder selection deferred to Phase 5
- [Phase 04-ai-intelligence]: ai/page.tsx simplified to pure redirect to Tax page — eliminates stale placeholder per locked AI Insights nav decision
- [Phase 05-goals-alerts-and-broker-integration]: goals and goal_holdings use three-hop RLS (goal_holdings -> goals -> holders -> families) — consistent with Phase 1 subquery chain pattern
- [Phase 05-goals-alerts-and-broker-integration]: stock_holdings is separate table from folios — stocks have no folio numbers, different data model from MF holdings
- [Phase 05-goals-alerts-and-broker-integration]: kiteconnect@5.1.0 installed in Wave 0 so Plans 02-04 can import without install step
- [Phase 05-goals-alerts-and-broker-integration]: differenceInCalendarDays/365 used for fractional years — sub-year goals need accurate projections, not integer truncation
- [Phase 05-goals-alerts-and-broker-integration]: computeGoalProjection returns baseValue as currentLinkedValue — callers see effective value used for projection when fallback fires
- [Phase 05-goals-alerts-and-broker-integration]: Family allocation target = weighted average of holder targets by AUM — no separate family_allocation_targets table needed
- [Phase 05-goals-alerts-and-broker-integration]: Drift badge threshold strictly greater-than 5% per CONTEXT.md spec — Math.abs(drift) > 5 not >= 5
- [Phase 05-goals-alerts-and-broker-integration]: Import page converted to Server Component — OAuth link/status are static renders; CAS file upload form extracted to CASImportForm client component
- [Phase 05-goals-alerts-and-broker-integration]: Default holder (first alphabetically) used for Broker tab V1 connection context — per-holder selector deferred; acceptable for families with 1-3 holders
- [Phase 05-goals-alerts-and-broker-integration]: supabase .select() read results cast as typed arrays — same postgrest-js v2.99.2 never inference limitation as write ops; consistent with Phase 1 pattern
- [Phase 05-goals-alerts-and-broker-integration]: CreateGoalModal uses uncontrolled Dialog (no open/onOpenChange) — consistent with SetTargetModal Phase 2 decision to prevent hydration issues
- [Phase 05-goals-alerts-and-broker-integration]: Goals page uses primary holder (first alphabetically) for modal in V1 — per-holder selector deferred; acceptable for families with 1-3 holders

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: CAS parser needs validation with real CAMS + KFintech PDFs (10+ samples) before phase complete
- [Phase 1]: Jan 31, 2018 NAV seed data must be loaded into DB at Phase 1 — cannot be re-fetched later; required by Phase 3 grandfathering
- [Phase 1]: mfapi.in reliability unknown — build fallback to direct AMFI file scraping early
- [Phase 3]: Tax rule changes in Union Budget 2026 (Feb 1, 2026) may affect LTCG rates — verify current exemption limit before implementation
- [Phase 4]: SEBI RIA compliance review of AI prompt templates required before Phase 4 launch
- [Phase 5]: Zerodha Kite Connect historical data availability requires verification — may need additional subscription

## Session Continuity

Last session: 2026-03-25T10:26:54.263Z
Stopped at: Completed 05-05-PLAN.md
Resume file: None

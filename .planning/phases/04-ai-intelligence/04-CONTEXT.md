# Phase 4: AI Intelligence - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Fund scorecards with quality scores (AI-01), underperforming fund identification and replacement recommendations (AI-02), natural language portfolio chat (AI-03), and on-demand quarterly review narrative (AI-04). All grounded in the user's actual holdings data — no hallucinated numbers.

UI components live on: the holder analytics page (AI Portfolio Health card in right sidebar), the Tax & AI page (Strategic Portfolio Narrative card + floating chat widget), and as a global floating chat widget on all dashboard pages.

</domain>

<decisions>
## Implementation Decisions

### Fund Scorecard Data Sources (AI-01)
- **Alpha**: computed rule-based from our existing Nifty 50 benchmark data and transaction history — same data used in Phase 2 benchmark comparison
- **Expense ratio**: scraped from AMFI's public daily NAV/TER file (already used for NAV sync; TER is included in the same data source)
- **AUM trend**: derived from NAV × units pattern in our transaction DB
- **Manager track record**: Claude infers from fund name and category via its training knowledge (no external manager data API)
- All computed signals fed to Claude as structured input; Claude writes the scorecard **narrative prose** — numbers stay deterministic, only text is AI-generated
- Quality score (0–100): rule-based computation from weighted signals (alpha weight, expense ratio rank vs category, AUM stability); Claude does NOT output the number
- **All held funds scored** — not just top N; typical user has 5–15 funds, scoring all ensures no unknown risks
- Scores **cached in DB** (e.g., `fund_ai_scores` table per holder); refreshed when new NAV data arrives (daily) or user manually triggers refresh — no AI call on every page load

### Chat Widget (AI-03)
- **Available on all pages** — floating bottom-right widget across the entire dashboard (Family Dashboard, Holder page, Tax page, Allocation page)
- **Collapsed by default** — shows as a compact "Ask AI" pill/FAB in the bottom-right; clicking expands to the 450px chat panel from the design
- Session state persists during navigation: if user opens chat on holder page and navigates to Tax page, chat stays open
- **Fresh each session** — chat history is NOT persisted to DB; each new login/tab starts with the greeting message; no history storage required
- **Full portfolio context injected into system prompt** on first open: structured summary (holdings, XIRR, allocation, recent transactions) fetched once and sent as context; Claude answers with real numbers from the user's data
- Portfolio fits in a single context window for typical users (5–15 funds) — no RAG, no vector store needed in v1
- Chat context scoped to the **current family** (whichever the user is viewing) — no cross-family data in context

### Quarterly Review Narrative (AI-04)
- **On-demand only** — user clicks "Generate Review" button; no scheduled background jobs or cron workers
- **Lives on the Tax & AI page** as the "Strategic Portfolio Narrative" full-width card — no separate route; the "AI Insights" nav item navigates to the Tax & AI page
- **Per-holder** — the "Generate Review" button appears on each holder's analytics page (right sidebar, below AI Portfolio Health card); review covers that specific holder's portfolio only; no family-level combined review in v1
- **Cached once generated** — stored in DB per holder; page shows "Generated X days ago" badge matching the design; user can regenerate at any time via "Regenerate" button; no auto-expiry
- The quarterly narrative includes: what's performing well, what to review for exit, sector concentration warnings, overall health assessment, and replacement recommendations for underperforming funds

### Replacement Recommendations (AI-02)
- **Surface inside the quarterly narrative only** — recommendations appear as inline text within the Strategic Portfolio Narrative card (e.g., "XYZ Small Cap has underperformed its benchmark by 4% for 9 months. You may wish to consider Nippon India Small Cap or Quant Small Cap as alternatives.")
- No separate "Recommendations" panel or per-fund action button — advisory framing is clearer as a narrative
- **AI names specific alternative funds** by name — Claude picks alternatives based on same category, lower expense ratio, and AUM signals; actionable for the user to research further
- **Tone: soft advisory with explicit disclaimer** — language like "you may wish to consider..." / "based on our analysis..." with a footer disclaimer on the narrative card: "FolioAI provides educational analysis. This is not SEBI-registered investment advice. Please consult a qualified financial advisor before making investment decisions."
- **AI Portfolio Health card flags underperforming funds visually** — underperforming fund rows in the scorecard use amber/error color for their alpha bar (instead of `secondary-fixed` green); the overall quality score drops; card does not show the recommendation text itself — that lives in the narrative

### Claude's Discretion
- Claude API model version and exact prompt templates for scorecard narrative and quarterly review
- Exact weighting formula for quality score computation (alpha vs expense ratio vs AUM stability)
- How to handle a fund with insufficient data (< 3 months of NAV history) — skip scoring or show "Insufficient data"
- Loading/streaming state for the "Generate Review" button (skeleton vs streaming text vs spinner)
- Exact collapsed state design for the chat FAB (icon, label, size)
- How to handle multiple holders in the same chat session context (user asks about "my portfolio" while on the family dashboard — which holder?)

</decisions>

<specifics>
## Specific Ideas

- The chat greeting message in the design: "Hello! I can help with tax queries, sector exposure, or sell-impact analysis." — this specific framing positions the chat as connected to the tax engine (Phase 3) as well as portfolio analytics; keep this multi-domain framing in the initial prompt
- The design's chat example: "Show me my exposure to the Energy sector" → "Your direct and indirect energy exposure is 8.4%..." — this implies the system prompt must include fund-level sector allocation data, not just fund names; sector classification data must be sourced (SEBI category or AMFI sector tagging)
- "FolioAI Intelligence Hub" as the chat widget header — matches the design exactly
- SEBI disclaimer must be in every AI-generated section: scorecard card, narrative card, and chat responses

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/dialog.tsx` — Dialog component; use for any modal that might appear from AI interactions
- `components/analytics/summary-cards.tsx` — Bento card pattern; AI Portfolio Health card follows the same dark `bg-primary` variant already shown in Phase 2 (XIRR card pattern)
- `lib/analytics/xirr.ts` — XIRR computation; alpha calculation extends this (portfolio XIRR vs Nifty 50 XIRR per fund)
- `lib/analytics/period-utils.ts` — FY and period boundary utilities; quarterly review period computation reuses this
- `components/family/family-dashboard.tsx` — `formatINR` utility; reuse for any numbers in AI output
- Phase 2's benchmark data infrastructure (`nifty50_daily` table) — directly feeds alpha computation for scorecard

### Established Patterns
- Server Components for data fetching — AI score fetch and quarterly narrative fetch are Server Components; only the chat widget and "Generate Review" button are `'use client'` (interactivity)
- Cached computation pattern (XIRR, SIP detection) — fund scores follow same: compute, store, serve from cache
- RLS via subquery chains — `fund_ai_scores` table must scope to holder → family → user_id
- `it.todo()` stubs for test files — Phase 3 pattern; AI module tests scaffold first

### Integration Points
- Extends `Individual_holder_view.html` page — AI Portfolio Health card placed in the right sidebar (already has SIP section placeholder from Phase 2); quarterly review button appears below it
- Reads `transactions` table + `holdings` view + `nifty50_daily` for alpha computation
- New `fund_ai_scores` table (per holder, per fund, with score + narrative + generated_at)
- New `portfolio_narratives` table (per holder, quarterly review text + generated_at)
- Claude Anthropic API call via Anthropic SDK — never on render path for cached content; only triggered explicitly by user action or daily NAV sync
- Chat widget is a new global component added to the dashboard layout (wraps all dashboard pages)

</code_context>

<deferred>
## Deferred Ideas

- **AI annual review** (ANLYV2-03 in REQUIREMENTS.md) — year-end full analysis; v2
- **RAG over full transaction history** — for users with 10+ years of data; v2 if context window becomes a bottleneck
- **Chat history persistence** — storing and replaying prior conversations; v2 (privacy/storage considerations)
- **Family-level quarterly review** — combined narrative across all holders; v2
- **Multi-holder chat context switching** — when the user is on the family dashboard and asks "my portfolio", the system needs to decide which holder to scope to; v2 disambiguation flow

</deferred>

---

*Phase: 04-ai-intelligence*
*Context gathered: 2026-03-24*

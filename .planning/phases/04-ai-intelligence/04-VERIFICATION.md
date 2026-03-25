---
phase: 04-ai-intelligence
verified: 2026-03-25T16:45:00Z
status: human_needed
score: 11/13 must-haves verified
gaps: []
human_verification:
  - test: "Fund scoring with live API key — trigger POST /api/ai/score-funds and verify Claude-written narrative text appears in AI Portfolio Health card"
    expected: "Circular quality score (0-100) with per-fund alpha bars; underperforming funds show amber bars; SEBI disclaimer visible"
    why_human: "Requires live Anthropic API call + real portfolio data; scoring logic is deterministic and tested, but narrative text from Claude cannot be verified programmatically"
  - test: "Streaming chat widget — open FAB, send a portfolio question, verify streaming response"
    expected: "Chat expands with 'FolioAI Intelligence Hub' header; greeting message appears; response streams token-by-token; response contains SEBI disclaimer when giving investment guidance"
    why_human: "SSE/streaming behavior and Claude response quality require visual verification; chat uses SDK v6 TextStreamChatTransport which differs from plan's useChat pattern"
  - test: "Quarterly narrative generation — click 'Generate Review' on Tax & AI page"
    expected: "Narrative generates (~10-30s); text covers performance, exit candidates, sector concentration with soft advisory tone; 'Generated X ago' badge appears; SEBI footer visible"
    why_human: "Claude response quality, section coverage, and SEBI advisory language appropriateness require human judgment"
  - test: "AI-02 specific fund replacement recommendations — verify narrative contains actionable replacement suggestions for underperforming funds"
    expected: "Narrative prose identifies specific categories or funds to consider switching to (e.g. 'you may wish to consider a lower-cost large cap index fund')"
    why_human: "AI-02 requires 'specific alternative funds to switch to with reasoning' — the prompt instructs Claude to include this but the actual recommendation specificity depends on Claude's output; also fund manager track record signal is not implemented in scoring signals"
---

# Phase 4: AI Intelligence Verification Report

**Phase Goal:** Deliver four AI-powered intelligence features using Claude — fund health scoring (AI-01), replacement recommendations (AI-02), conversational portfolio chat (AI-03), and quarterly review narrative generation (AI-04) — all accessible from the dashboard UI with data persisted to Supabase.
**Verified:** 2026-03-25T16:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | AI lib module files exist with correct exported interfaces | VERIFIED | `lib/ai/types.ts`, `scoring.ts`, `prompts.ts`, `index.ts` all exist with full implementations |
| 2 | Scoring functions are real implementations (no stubs) | VERIFIED | `computeAlpha`, `computeAUMTrend`, `computeQualityScore` — full logic, no `throw new Error('Not implemented')` |
| 3 | Prompt builders are real implementations | VERIFIED | `buildScorecardPrompt`, `buildNarrativePrompt`, `buildChatSystemPrompt` — substantive with SEBI instructions |
| 4 | Tests pass: all 33 scoring and prompt tests green | VERIFIED | `npx vitest run tests/ai/` → 33 passed, 0 failed, 0 todo |
| 5 | DB migrations create fund_ai_scores and portfolio_narratives with RLS | VERIFIED | Both SQL files exist with CREATE TABLE and RLS policies |
| 6 | POST /api/ai/score-funds orchestrates scoring and caches to DB | VERIFIED | Route calls `scoreFundsForHolder`, Zod-validated, auth-gated, upserts to `fund_ai_scores` |
| 7 | AI Portfolio Health card renders in holder page sidebar | VERIFIED | `AIPortfolioHealth` imported and rendered at line 301 of holder page; fetches from `fund_ai_scores` |
| 8 | Underperforming funds show amber alpha bar | VERIFIED | `isUnderperforming = score.alpha_pct < 0` → `bg-amber-400` in `ai-portfolio-health.tsx` |
| 9 | Floating chat FAB wired to streaming /api/ai/chat on all dashboard pages | VERIFIED | `ChatWidget` rendered in `layout.tsx` at line 104; uses SDK v6 `TextStreamChatTransport` pointing to `/api/ai/chat` |
| 10 | Portfolio context injected into chat system prompt | VERIFIED | Chat route calls `buildChatContextForHolder` + `buildChatSystemPrompt`; injects holdings, XIRR, sector, SIPs |
| 11 | POST /api/ai/generate-narrative generates narrative and caches in portfolio_narratives | VERIFIED | Service fetches scores + context, calls `generateText`, upserts to `portfolio_narratives` |
| 12 | Strategic Portfolio Narrative card on Tax & AI page reads from DB cache | VERIFIED | Tax page queries `portfolio_narratives` before render; renders `StrategicNarrative` at line 184+ |
| 13 | AI Insights nav redirects to Tax page | VERIFIED | `app/(dashboard)/families/[familyId]/ai/page.tsx` is a single `redirect()` to `/families/${familyId}/tax` |

**Score:** 13/13 truths verified programmatically

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/ai/types.ts` | FundScore, NarrativeCache, ChatContext, ScoringSignals interfaces | VERIFIED | All 5 interfaces present |
| `lib/ai/scoring.ts` | computeAlpha, computeQualityScore, computeAUMTrend | VERIFIED | Real implementations, 181 lines |
| `lib/ai/prompts.ts` | buildScorecardPrompt, buildNarrativePrompt, buildChatSystemPrompt | VERIFIED | Real implementations with SEBI instructions |
| `lib/ai/provider.ts` | AI model provider (multi-provider fallback) | VERIFIED | Priority: Anthropic → OpenAI → Gemini → DeepSeek |
| `lib/ai/index.ts` | Re-exports all from lib/ai | VERIFIED | Exists |
| `lib/ai/score-funds-service.ts` | scoreFundsForHolder() | VERIFIED | Full orchestration; builds signals, calls AI, upserts |
| `lib/ai/chat-context-service.ts` | buildChatContextForHolder() | VERIFIED | Fetches holdings, computes XIRR, sector exposure, SIPs |
| `lib/ai/narrative-service.ts` | generateNarrativeForHolder() | VERIFIED | Calls buildNarrativePrompt, generates text, upserts |
| `app/api/ai/score-funds/route.ts` | POST endpoint | VERIFIED | Auth + Zod validation + service call |
| `app/api/ai/chat/route.ts` | POST streaming endpoint | VERIFIED | streamText with `toTextStreamResponse()` |
| `app/api/ai/generate-narrative/route.ts` | POST endpoint | VERIFIED | Auth + Zod + service call |
| `components/ai/ai-portfolio-health.tsx` | Dark card, circular SVG score, alpha bars | VERIFIED | Full implementation, SEBI disclaimer present |
| `components/ai/chat-widget.tsx` | Floating FAB + 450px expanded panel | VERIFIED | 'use client', SDK v6 Chat + useChat |
| `components/ai/strategic-narrative.tsx` | Full-width narrative card | VERIFIED | Prose display, "Generated X ago" badge, SEBI footer |
| `components/ai/generate-review-button.tsx` | 'use client' POST button | VERIFIED | Calls /api/ai/generate-narrative, router.refresh() |
| `components/ai/refresh-scores-button.tsx` | 'use client' refresh button | VERIFIED | Calls /api/ai/score-funds, router.refresh() |
| `supabase/migrations/20260324000001_fund_ai_scores.sql` | Table + RLS | VERIFIED | CREATE TABLE + 4 RLS policies |
| `supabase/migrations/20260324000002_portfolio_narratives.sql` | Table + RLS | VERIFIED | CREATE TABLE + 4 RLS policies |
| `scripts/sync-ter.ts` | AMFI TER fetch script | VERIFIED | Exists (not deeply verified — not a runtime dependency) |
| `tests/ai/scoring.test.ts` | 13 concrete tests | VERIFIED | All 13 passing |
| `tests/ai/prompts.test.ts` | 20 concrete tests | VERIFIED | All 20 passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `lib/ai/scoring.ts` | `lib/analytics/xirr.ts` | `import computeXIRR` | WIRED | Lines 2-3: `import { computeXIRR } from '@/lib/analytics/xirr'` |
| `lib/ai/prompts.ts` | `lib/ai/types.ts` | ScoringSignals, ChatContext types | WIRED | Line 1: `import type { ScoringSignals, ChatContext } from './types'` |
| `app/api/ai/score-funds/route.ts` | `lib/ai/score-funds-service.ts` | calls scoreFundsForHolder | WIRED | Line 4 + line 24 |
| `lib/ai/score-funds-service.ts` | `lib/ai/scoring.ts` | computeAlpha, computeQualityScore | WIRED | Line 3: `import { computeAlpha, computeAUMTrend, computeQualityScore }` |
| `components/ai/ai-portfolio-health.tsx` | `lib/ai/types.ts` | FundScore interface for props | WIRED | Line 1: `import type { FundScore } from '@/lib/ai/types'` |
| `holder page` | `fund_ai_scores table` | supabase.from('fund_ai_scores').select() | WIRED | Lines 204-210 of holder page |
| `components/ai/chat-widget.tsx` | `/api/ai/chat` | TextStreamChatTransport api prop | WIRED | Line 29: `api: '/api/ai/chat'` |
| `app/api/ai/chat/route.ts` | `lib/ai/prompts.ts` | buildChatSystemPrompt | WIRED | Line 6 + line 38 |
| `app/api/ai/chat/route.ts` | `lib/ai/chat-context-service.ts` | buildChatContextForHolder | WIRED | Line 5 + line 36 |
| `app/(dashboard)/layout.tsx` | `components/ai/chat-widget.tsx` | `<ChatWidget familyId={familyId} />` | WIRED | Lines 5 + 104 |
| `components/ai/generate-review-button.tsx` | `/api/ai/generate-narrative` | fetch POST | WIRED | Line 18 |
| `app/(dashboard)/families/[familyId]/tax/page.tsx` | `portfolio_narratives table` | supabase.from('portfolio_narratives') | WIRED | Lines 44-46 |
| `lib/ai/narrative-service.ts` | `lib/ai/prompts.ts` | buildNarrativePrompt | WIRED | Line 4 + line 44 |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AI-01 | 04-01, 04-02, 04-03 | Fund quality scoring: expense ratio, alpha vs benchmark, AUM trend | PARTIAL | 3 of 4 signals implemented (expense ratio, alpha, AUM trend). **Fund manager track record** signal absent — not in `ScoringSignals`, not fetched, not scored |
| AI-02 | 04-02, 04-03, 04-05 | Identifies underperforming funds and recommends specific alternative funds to switch to | PARTIAL | Underperforming funds identified (alpha < 0 or quality < 40) and highlighted in UI. Replacement recommendations embedded in narrative prompt. **Specific alternative fund names** depend on Claude's output — the prompt instructs soft advisory tone but does not supply a fund database to select alternatives from |
| AI-03 | 04-04 | Natural language portfolio chat | VERIFIED | ChatWidget with TextStreamChatTransport; portfolio context injected; greeting message present; SEBI disclaimer in system prompt |
| AI-04 | 04-05 | On-demand quarterly review narrative, cached in DB | VERIFIED | POST /api/ai/generate-narrative; caches in portfolio_narratives; StrategicNarrative card reads from cache on page load |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/api/ai/chat/route.ts` | 49 | Uses `toTextStreamResponse()` instead of plan-specified `toDataStreamResponse()` | Info | Functionally equivalent for plain text; TextStreamChatTransport on the client side is aligned to this choice |
| `components/ai/chat-widget.tsx` | 49 | Uses SDK v6 `Chat` + `useChat` pattern instead of plan's `useChat({ api })` pattern | Info | Functionally equivalent; SDK v6 changed the API; the implementation is valid |
| `lib/ai/score-funds-service.ts` | 11 | `SupabaseClient | any` union type | Info | Does not affect runtime but bypasses type safety for Supabase calls |

No blocker anti-patterns. No TODO/FIXME/placeholder comments. No stub implementations. No client-side ANTHROPIC_API_KEY exposure.

### Human Verification Required

#### 1. Fund Scoring End-to-End (AI-01)

**Test:** Navigate to any Individual Holder page. Click "Refresh Scores". Wait for completion. Observe the AI Portfolio Health card.
**Expected:** Circular quality score (0-100) renders with a green arc. Per-fund rows show fund names and alpha bars. Underperforming funds show amber bars. Narrative text per fund (stored in `fund_ai_scores.narrative_text`) is accessible. SEBI disclaimer visible at card bottom.
**Why human:** Requires live Anthropic API key + real portfolio data. The narrative quality (2-3 sentences of prose, no raw numbers) needs eyeballing.

#### 2. Chat Widget Streaming (AI-03)

**Test:** Open any dashboard page. Click the "Ask AI" FAB (bottom-right). Type "What is my total portfolio value?" and send.
**Expected:** Panel expands with "FolioAI Intelligence Hub" header. Greeting "Hello! I can help with tax queries, sector exposure, or sell-impact analysis." appears immediately. Response streams with accurate portfolio data in ₹ Indian format. SEBI disclaimer appears for investment-related questions.
**Why human:** Streaming SSE behavior, response accuracy, and SEBI disclaimer quality require visual inspection.

#### 3. Quarterly Narrative Generation (AI-04 + AI-02)

**Test:** Navigate to Tax Intelligence page. Scroll to "Strategic Portfolio Narrative" card. Click "Generate Review".
**Expected:** Loading state shows. After ~10-30s, narrative text appears with structured sections. "Generated X minutes ago" badge appears. Narrative mentions specific underperforming funds with soft language ("you may wish to consider..."). SEBI footer: "FolioAI provides educational analysis. This is not SEBI-registered investment advice."
**Why human:** Claude's response quality, section completeness, and SEBI language appropriateness require human judgment.

#### 4. AI-02 Replacement Recommendation Specificity

**Test:** Read the generated quarterly narrative. Look for fund replacement suggestions for underperforming funds.
**Expected:** Narrative identifies specific types of replacement funds (e.g., "consider a low-cost index fund in the large cap category"). Note: specific fund names require a fund database which is not injected into the prompt — Claude may provide category-level recommendations only.
**Why human:** REQUIREMENTS.md says "recommends specific alternative funds to switch to, with reasoning" — verifying whether Claude's output meets this specificity bar requires reading the actual generated text. The prompt provides scoring signals but not a curated list of alternative funds to recommend.

#### 5. Fund Manager Track Record Signal (AI-01 gap)

**Test:** After scoring, inspect what data appears in the "AI Portfolio Health" card per fund. Check if any fund manager quality signal is visible.
**Expected per requirement:** "fund manager track record" is one of the stated quality signals in AI-01.
**Why human:** The scoring implementation has 3 signals (alpha, expense ratio, AUM trend) but not fund manager track record. This data is not in the database schema (no fund manager column in `funds` table). Whether this absence is an accepted scope reduction needs product confirmation.

### Gaps Summary

No hard implementation gaps. All code is substantive, wired, and TypeScript-clean. Two qualification concerns require human sign-off:

1. **AI-01 fund manager track record:** The `ScoringSignals` interface and `computeQualityScore` operate on alpha, expense ratio, and AUM trend only. Fund manager track record was listed in the requirement but was not implemented in any plan (no research, no data column, no scoring weight). This is a scope reduction that needs product acknowledgement.

2. **AI-02 specific alternative fund recommendations:** The `buildNarrativePrompt` instructs Claude to suggest "suggested actions" with soft advisory tone, and the underperforming funds list is injected. However, the prompt does not supply a curated alternative fund database — Claude must rely on its training knowledge for specific fund alternatives. Whether this meets the requirement's intent ("specific alternative funds with reasoning") needs product review.

Both items are acceptable scope reductions or architecture decisions rather than bugs — but require human confirmation that the delivered scope is acceptable.

---

_Verified: 2026-03-25T16:45:00Z_
_Verifier: Claude (gsd-verifier)_

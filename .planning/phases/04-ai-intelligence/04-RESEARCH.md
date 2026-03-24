# Phase 4: AI Intelligence - Research

**Researched:** 2026-03-24
**Domain:** Anthropic Claude API, LLM-grounded portfolio analysis, streaming chat UI, DB caching
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Fund Scorecard Data Sources (AI-01)**
- Alpha: computed rule-based from existing Nifty 50 benchmark data and transaction history (same as Phase 2 benchmark comparison)
- Expense ratio: scraped from AMFI's public daily NAV/TER file (already used for NAV sync; TER included in same data source)
- AUM trend: derived from NAV x units pattern in transaction DB
- Manager track record: Claude infers from fund name and category via its training knowledge (no external manager data API)
- All computed signals fed to Claude as structured input; Claude writes the scorecard narrative prose — numbers stay deterministic, only text is AI-generated
- Quality score (0–100): rule-based computation from weighted signals (alpha weight, expense ratio rank vs category, AUM stability); Claude does NOT output the number
- All held funds scored (not just top N); typical user has 5–15 funds
- Scores cached in DB (`fund_ai_scores` table per holder); refreshed when new NAV data arrives (daily) or user manually triggers refresh — no AI call on every page load

**Chat Widget (AI-03)**
- Available on all pages — floating bottom-right widget across entire dashboard
- Collapsed by default — compact "Ask AI" pill/FAB in the bottom-right; clicking expands to 450px chat panel
- Session state persists during navigation
- Fresh each session — chat history NOT persisted to DB; each new login/tab starts with greeting
- Full portfolio context injected into system prompt on first open: structured summary fetched once and sent as context
- No RAG, no vector store needed in v1 (5–15 funds fits in context window)
- Chat context scoped to current family; no cross-family data in context

**Quarterly Review Narrative (AI-04)**
- On-demand only — user clicks "Generate Review"; no scheduled background jobs
- Lives on the Tax & AI page as the "Strategic Portfolio Narrative" full-width card
- Per-holder — the "Generate Review" button appears on each holder's analytics page (right sidebar)
- Cached once generated — stored in DB per holder; shows "Generated X days ago" badge; user can regenerate
- Quarterly narrative covers: what's performing well, what to review for exit, sector concentration warnings, overall health assessment, and replacement recommendations

**Replacement Recommendations (AI-02)**
- Surfaced inside the quarterly narrative only — inline text within Strategic Portfolio Narrative card
- AI names specific alternative funds by name
- Tone: soft advisory with explicit disclaimer
- AI Portfolio Health card flags underperforming funds visually (amber/error color for alpha bar); no recommendation text in that card

### Claude's Discretion
- Claude API model version and exact prompt templates
- Exact weighting formula for quality score (alpha vs expense ratio vs AUM stability)
- How to handle fund with insufficient data (< 3 months NAV history) — skip scoring or "Insufficient data"
- Loading/streaming state for "Generate Review" button (skeleton vs streaming text vs spinner)
- Exact collapsed state design for chat FAB (icon, label, size)
- How to handle multiple holders in same chat session context (family dashboard — which holder?)

### Deferred Ideas (OUT OF SCOPE)
- AI annual review (ANLYV2-03) — v2
- RAG over full transaction history — v2 if context window bottleneck
- Chat history persistence — v2
- Family-level quarterly review — v2
- Multi-holder chat context switching — v2 disambiguation flow
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | AI scores each fund on quality signals: expense ratio vs category, alpha vs benchmark, AUM trend, manager track record — displayed as structured scorecard | Scoring computation in `lib/ai/scoring.ts` using `nifty50_daily` + transactions; AMFI TER from existing NAV sync pipeline; DB cache in `fund_ai_scores`; Claude writes narrative prose |
| AI-02 | AI identifies underperforming funds and recommends specific alternative funds with reasoning | Embedded inside quarterly narrative (AI-04); Claude picks alternatives by category/expense ratio; SEBI advisory disclaimer required |
| AI-03 | User can chat with portfolio using natural language — questions answered accurately from actual transaction data | `/api/ai/chat` route with streaming; full portfolio context in system prompt; Vercel AI SDK `useChat` on client; floating global widget in dashboard layout |
| AI-04 | AI generates quarterly portfolio review narrative — health assessment, what to review for exit, suggested additions | On-demand POST to `/api/ai/generate-narrative`; cached in `portfolio_narratives` table; "Generate Review" button triggers call; narrative rendered on Tax & AI page |
</phase_requirements>

---

## Summary

Phase 4 introduces Claude-powered intelligence on top of the deterministic analytics foundation built in Phases 1–3. The architecture is carefully split: all numbers (quality scores, XIRR, expense ratios, alpha percentages) remain deterministic TypeScript computations; Claude writes only narrative prose given structured data. This eliminates hallucination risk on financial figures while delivering human-quality analysis text.

The technical core is the Anthropic SDK (`@anthropic-ai/sdk` v0.80.0) used server-side only — in Next.js Route Handlers for streaming chat and in Server Actions / Route Handlers for on-demand narrative generation. The Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) provides the `useChat` React hook for the floating chat widget, handling SSE parsing and state management on the client side.

The recommended model is `claude-sonnet-4-6` — best speed/intelligence ratio at $3/$15 per MTok input/output, 1M token context window (more than sufficient for 5–15 fund portfolios), and Jan 2026 training cutoff giving it strong knowledge of Indian mutual fund houses and SEBI categories.

New DB tables needed: `fund_ai_scores` (per-holder, per-fund scorecard cache) and `portfolio_narratives` (per-holder quarterly review cache), both with RLS chained through holder → family → user_id following established Phase 1 pattern.

**Primary recommendation:** Use `@anthropic-ai/sdk` directly for non-streaming calls (score narrative generation) and Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) for the streaming chat widget. Keep AI calls off the render path — always serve from DB cache, only call Claude on explicit user action or NAV sync trigger.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.80.0 | Direct Anthropic API calls (non-streaming narrative, scorecard prose) | Official SDK; type-safe; handles retries; server-only |
| `ai` (Vercel AI SDK) | 6.x | `useChat` hook for streaming chat widget | Framework-agnostic; handles SSE parsing, message state, error; eliminates boilerplate |
| `@ai-sdk/anthropic` | latest | Anthropic provider for Vercel AI SDK | Unified provider interface; same model IDs as direct SDK |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | 4.x (already installed) | Format "Generated X days ago" badge | Already in project |
| `zod` | 3.x (already installed) | Validate AI API request bodies and structured responses | Already used at all API boundaries |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel AI SDK `useChat` | Custom fetch + ReadableStream | `useChat` saves ~200 lines of stream parsing code; no reason to hand-roll |
| `@anthropic-ai/sdk` direct | Vercel AI SDK for all calls | Direct SDK gives cleaner non-streaming calls for narrative generation |
| `claude-sonnet-4-6` | `claude-haiku-4-5` | Haiku is faster/cheaper but noticeably weaker at Indian fund analysis prose; Sonnet is correct balance |

### Installation

```bash
npm install @anthropic-ai/sdk ai @ai-sdk/anthropic
```

Set in `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Architecture Patterns

### Recommended Project Structure

```
lib/ai/
├── scoring.ts        # computeQualityScore(), computeAlpha(), computeAUMTrend()
├── prompts.ts        # buildScorecardPrompt(), buildNarrativePrompt(), buildChatSystemPrompt()
├── types.ts          # FundScore, NarrativeCache, ChatContext interfaces
└── index.ts          # re-exports

app/api/ai/
├── chat/route.ts           # POST — streaming chat via Vercel AI SDK streamText
├── score-funds/route.ts    # POST — trigger AI scoring for a holder
└── generate-narrative/route.ts  # POST — generate + cache quarterly review

components/ai/
├── ai-portfolio-health.tsx    # Right sidebar card on holder page (dark bg-primary)
├── strategic-narrative.tsx    # Full-width card on Tax & AI page
├── chat-widget.tsx            # Floating FAB + expanded chat panel (global, 'use client')
└── generate-review-button.tsx # Trigger button with loading state ('use client')

supabase/migrations/
├── ...NNNN_fund_ai_scores.sql
└── ...NNNN_portfolio_narratives.sql

tests/ai/
├── scoring.test.ts    # Quality score computation
└── prompts.test.ts    # Prompt builder unit tests (no API calls)
```

---

### Pattern 1: Deterministic Score + AI Narrative

**What:** Compute numeric signals in TypeScript; pass as structured JSON to Claude; Claude returns only prose text. Never ask Claude for a number.

**When to use:** AI-01 fund scorecard, AI-02 replacement reasoning, AI-04 quarterly narrative

**Example:**
```typescript
// Source: lib/ai/scoring.ts (project pattern)
// 1. Compute signals deterministically
const signals = {
  alpha_pct: computeAlpha(transactions, nifty50Daily),        // TypeScript
  expense_ratio: fund.ter,                                     // from AMFI
  aum_trend: computeAUMTrend(navHistory, units),               // TypeScript
  category: fund.category,
  fund_name: fund.scheme_name,
}

// 2. Quality score: rule-based weighted sum (Claude NEVER produces this)
const qualityScore = computeQualityScore(signals)  // returns 0-100

// 3. Claude writes narrative prose ONLY
const prompt = buildScorecardPrompt(signals, qualityScore)
const msg = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 400,
  messages: [{ role: 'user', content: prompt }],
})
const narrativeText = msg.content[0].type === 'text' ? msg.content[0].text : ''

// 4. Cache in DB
await supabase.from('fund_ai_scores').upsert({ ... })
```

---

### Pattern 2: Streaming Chat with Vercel AI SDK

**What:** `useChat` hook on client sends messages to `/api/ai/chat`; route handler streams response back via SSE; portfolio context injected once into system prompt.

**When to use:** AI-03 floating chat widget

**Example — Route Handler:**
```typescript
// Source: @ai-sdk/anthropic docs
// app/api/ai/chat/route.ts
import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'

export async function POST(req: Request) {
  const { messages, holderId } = await req.json()

  // Fetch + cache portfolio context (first message only pattern via DB)
  const context = await buildChatContext(holderId)  // Server-side DB call

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: buildChatSystemPrompt(context),  // structured portfolio data
    messages,
    maxTokens: 1000,
  })

  return result.toDataStreamResponse()
}
```

**Example — Client Component:**
```typescript
// components/ai/chat-widget.tsx ('use client')
import { useChat } from 'ai/react'

export function ChatWidget({ familyId }: { familyId: string }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/ai/chat',
    body: { familyId },
    initialMessages: [{
      id: 'greeting',
      role: 'assistant',
      content: 'Hello! I can help with tax queries, sector exposure, or sell-impact analysis.',
    }],
  })
  // ... render
}
```

---

### Pattern 3: DB-Cached Generation with Regeneration

**What:** On-demand generation stores output in DB; page always reads from DB; "Regenerate" button sends fresh POST request; "generated_at" shown as badge.

**When to use:** AI-04 quarterly narrative, AI-01 fund scorecard refresh

**Schema for `portfolio_narratives`:**
```sql
CREATE TABLE portfolio_narratives (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id    UUID NOT NULL REFERENCES holders(id) ON DELETE CASCADE,
  narrative    TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: SELECT/INSERT where holder_id IN (
--   SELECT id FROM holders WHERE family_id IN (
--     SELECT id FROM families WHERE user_id = auth.uid()
--   )
-- )
```

**Schema for `fund_ai_scores`:**
```sql
CREATE TABLE fund_ai_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id        UUID NOT NULL REFERENCES holders(id) ON DELETE CASCADE,
  scheme_code      INTEGER NOT NULL REFERENCES funds(scheme_code),
  quality_score    INTEGER NOT NULL CHECK (quality_score BETWEEN 0 AND 100),
  alpha_pct        NUMERIC(6,2),
  expense_ratio    NUMERIC(5,2),
  aum_trend        TEXT CHECK (aum_trend IN ('growing', 'stable', 'declining', 'insufficient_data')),
  narrative_text   TEXT NOT NULL,
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (holder_id, scheme_code)
);
-- Same RLS chain as portfolio_narratives
```

---

### Pattern 4: Chat System Prompt with Portfolio Context

**What:** On first chat open, server fetches holder's full holdings + XIRR + recent transactions; formats as structured text injected into Claude's system prompt.

**When to use:** AI-03 chat — "What's my XIRR?", "How exposed am I to IT?"

**Context structure:**
```typescript
// lib/ai/prompts.ts
export function buildChatSystemPrompt(ctx: ChatContext): string {
  return `
You are FolioAI, a portfolio analysis assistant for Indian mutual fund investors.
You have access to the user's actual portfolio data below. Answer questions accurately
using ONLY the data provided. Never fabricate numbers.

IMPORTANT: Always add this disclaimer when giving financial guidance:
"This is educational analysis, not SEBI-registered investment advice."

## Portfolio Summary (Family: ${ctx.familyName})
Total AUM: ₹${formatINR(ctx.totalAUM)}
XIRR (all-time): ${ctx.xirr ? (ctx.xirr * 100).toFixed(2) + '%' : 'Insufficient data'}

## Holdings (${ctx.holdings.length} funds)
${ctx.holdings.map(h => `
- ${h.scheme_name} (${h.category})
  Units: ${h.units} | Current Value: ₹${formatINR(h.current_value ?? 0)}
  XIRR: ${h.xirr ? (h.xirr * 100).toFixed(2) + '%' : 'N/A'}
  Expense Ratio: ${h.ter ? h.ter + '%' : 'Unknown'}
`).join('')}

## Sector Exposure (from fund category classification)
${ctx.sectorExposure.map(s => `- ${s.sector}: ${s.pct.toFixed(1)}%`).join('\n')}

## Active SIPs
${ctx.sips.map(s => `- ${s.fundName}: ₹${formatINR(s.amount)}/month`).join('\n')}

## Recent Capital Events (FY25)
LTCG Realized: ₹${formatINR(ctx.ltcg)}
LTCG Exemption Used: ₹${formatINR(ctx.ltcgExemptionUsed)} of ₹1,25,000
`
}
```

---

### Pattern 5: AMFI TER Data Fetching

**What:** AMFI publishes TER for all schemes at `https://www.amfiindia.com/spages/NAVAll.txt` — the same URL used in Phase 1 NAV sync. TER is a separate endpoint.

**TER source URL:**
```
https://www.amfiindia.com/spages/NAVAll.txt
```

**Key insight:** mfapi.in (`GET https://api.mfapi.in/mf/{scheme_code}`) returns `scheme_category` and `fund_house` but NOT expense ratio or AUM. TER must come from AMFI directly or be stored when funds table is populated. The `funds` table has a `category` field but no `ter` field — Phase 4 must either add a `ter` column to `funds` and populate it via a AMFI TER scraper, OR compute a category-average TER from public data and store it.

**Recommended approach:** Add `ter NUMERIC(5,2)` to `funds` table; populate via a new `scripts/sync-ter.ts` that hits `https://www.amfiindia.com/spages/NAVAll.txt` (same HTTP fetch as nav sync) — TER is included in that file as column 4 in the pipe-delimited format.

---

### Pattern 6: Alpha Computation

**What:** Fund alpha = fund XIRR over period minus Nifty 50 XIRR over same period. Uses existing `computeXIRR` and `nifty50_daily` infrastructure from Phase 2.

```typescript
// lib/ai/scoring.ts
export function computeAlpha(
  fundTransactions: AnalyticsTransaction[],
  fundCurrentValue: number,
  nifty50Daily: Array<{ date: string; close: number }>
): number | null {
  // Fund XIRR — reuse existing buildPortfolioCashflows + computeXIRR from lib/analytics/xirr.ts
  const fundCashflows = buildPortfolioCashflowsForFund(fundTransactions, fundCurrentValue)
  const fundXirr = computeXIRR(fundCashflows)

  // Nifty 50 XIRR — same synthetic cashflow method as Phase 2 benchmark XIRR
  const niftyXirr = computeNiftyXIRR(fundTransactions, nifty50Daily)

  if (fundXirr === null || niftyXirr === null) return null
  return fundXirr - niftyXirr  // e.g. 0.042 = +4.2% alpha
}
```

---

### Pattern 7: Chat Widget as Global Component

**What:** Chat widget lives in dashboard layout (`app/(dashboard)/layout.tsx`) so it persists across navigation. It is a `'use client'` component; the layout itself remains a Server Component. Widget reads `familyId` from URL or from the family loaded in layout.

**Implementation:**
```tsx
// app/(dashboard)/layout.tsx — add at end of <main>
<ChatWidget familyId={familyId} />   // 'use client' child in Server Component — fine
```

The `familyId` is already available in the layout (it fetches the user's first family for nav links).

---

### Anti-Patterns to Avoid

- **Calling Claude on render path:** Never invoke Anthropic SDK in a Server Component that runs on every page load. Always serve from DB cache; call AI only on explicit user trigger or daily cron.
- **Asking Claude to output numbers:** Expense ratio, XIRR, alpha, quality score — all must be computed in TypeScript. Claude only outputs text descriptions.
- **Storing ANTHROPIC_API_KEY in client code:** Must be server-only. Vercel AI SDK chat route must run server-side only. Never pass the API key to the browser.
- **Unscoped DB queries for AI tables:** `fund_ai_scores` and `portfolio_narratives` must use the same hierarchical RLS chain: `holder_id IN (SELECT id FROM holders WHERE family_id IN (SELECT id FROM families WHERE user_id = auth.uid()))`.
- **Session-persisting chat context:** Portfolio context is fetched fresh on each session open — do not read stale data from localStorage or client state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chat streaming state | Custom useState + fetch + SSE parsing | `useChat` from Vercel AI SDK | Handles partial message state, error, loading, message history, abort |
| Streaming response format | Custom ReadableStream + encoder | `streamText(...).toDataStreamResponse()` | AI SDK format is compatible with `useChat` out of the box |
| Anthropic API retries | Custom exponential backoff | `@anthropic-ai/sdk` built-in retry | SDK retries on 429/500 with jitter automatically |
| Message role typing | Custom ChatMessage interface | AI SDK `Message` type from `ai` | Avoids type mismatch between `useChat` messages and route handler |

**Key insight:** The chat widget is the only interactive AI component. Everything else (scorecards, narrative) is generated once and served as static cached text — no streaming needed for those.

---

## Common Pitfalls

### Pitfall 1: AI API Call Timeout on Large Portfolios

**What goes wrong:** `anthropic.messages.create()` for a narrative on a holder with many transactions can take 5–15 seconds. Next.js Route Handlers have a default 10-second function timeout on Vercel.

**Why it happens:** Narrative generation with full context can be slow. Default serverless timeout is too short.

**How to avoid:** Set `export const maxDuration = 60` at the top of narrative generation route handler. For Vercel Hobby plan, max is 60s; Pro plan allows 300s.

**Warning signs:** 504 Gateway Timeout errors in production for the "Generate Review" button.

---

### Pitfall 2: Quality Score Formula Inconsistency

**What goes wrong:** Rule-based quality score uses different normalization than the alpha bars displayed in the UI, causing "88 score" but only 1 green bar.

**Why it happens:** Forgetting that alpha bar width (%) and quality score (0–100) are different derived values from the same underlying alpha signal.

**How to avoid:** Define `computeQualityScore(signals)` once in `lib/ai/scoring.ts`; both the score display and the bar width use the SAME function output. Document the weighting formula clearly in code comments.

---

### Pitfall 3: Stale Portfolio Context in Chat

**What goes wrong:** User makes a redemption (import), then opens chat — chat still reflects pre-redemption data because context was fetched from the DB before import.

**Why it happens:** Chat context fetched once per session open; DB reflects new state but client-side context is stale.

**How to avoid:** Fetch portfolio context server-side in the Route Handler on EVERY chat request (not just the first message). Since the context is a structured text injection, include it in the system prompt on every API call — this is safe because the context is small (well under 10k tokens for 5–15 funds).

**Alternative:** Include a `contextVersion` field in the chat body; invalidate client session context when the user navigates away and back.

---

### Pitfall 4: Missing SEBI Disclaimer

**What goes wrong:** Claude occasionally omits the disclaimer from scorecard or narrative text when not explicitly required in every prompt.

**Why it happens:** The disclaimer is context-dependent and Claude may optimize it out for brevity.

**How to avoid:** Include disclaimer requirement in EVERY prompt template as a hard instruction, not just a soft suggestion. Also render the disclaimer as a hardcoded UI element below each AI card — separate from Claude's output — so it always appears regardless of model response.

---

### Pitfall 5: Chat Widget z-index Conflict

**What goes wrong:** The floating chat widget (z-50) is obscured by the sticky TopAppBar (z-30) on smaller viewport heights, or conflicts with shadcn Dialog overlays (z-50).

**Why it happens:** Dashboard layout uses fixed sidebar (z-40) + sticky header (z-30); chat widget at z-50 can conflict with modal dialogs.

**How to avoid:** Use `z-[60]` for the chat widget FAB. Keep the expanded chat panel at `z-[55]` so it appears above the sidebar and header but below native browser dialogs.

---

### Pitfall 6: AMFI TER File Parsing

**What goes wrong:** AMFI NAVAll.txt uses pipe `|` delimited format with scheme code in column 1 and TER in column 4. Format has changed historically.

**Why it happens:** AMFI file format has minor inconsistencies (empty lines, header rows, different fund types in separate sections).

**How to avoid:** Reuse the existing NAV sync parser in `api/nav/route.ts` which already handles the AMFI file format. Add TER extraction as a new field parse alongside NAV. Validate parsed TER values are in range 0–3.0% (SEBI TER limits).

---

### Pitfall 7: RLS on New AI Tables Missing

**What goes wrong:** `fund_ai_scores` or `portfolio_narratives` return data from other users because RLS was not enabled or policy is too permissive.

**Why it happens:** New tables default to RLS disabled in Supabase if not explicitly enabled.

**How to avoid:** Every migration for new tables must include:
```sql
ALTER TABLE fund_ai_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_scoped_ai_scores" ON fund_ai_scores
  FOR ALL USING (
    holder_id IN (
      SELECT h.id FROM holders h
      JOIN families f ON h.family_id = f.id
      WHERE f.user_id = auth.uid()
    )
  );
```
Follow exact same pattern as `holder_allocation_targets` migration in Phase 2.

---

## Code Examples

Verified patterns from official sources:

### Non-Streaming Anthropic SDK Call (Scorecard Narrative)

```typescript
// Source: Official Anthropic SDK docs (platform.claude.com)
// lib/ai/scoring.ts — server-only
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,  // never in client bundle
})

export async function generateScorecardNarrative(signals: FundSignals): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: buildScorecardPrompt(signals),
    }],
  })
  const block = msg.content[0]
  return block.type === 'text' ? block.text : ''
}
```

### Streaming Chat Route Handler (Vercel AI SDK)

```typescript
// Source: @ai-sdk/anthropic docs (ai-sdk.dev)
// app/api/ai/chat/route.ts
import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60  // seconds — prevent Vercel timeout

export async function POST(req: Request) {
  const { messages, familyId } = await req.json()
  const supabase = await createClient()

  // RLS-scoped portfolio context fetch on every call
  const context = await buildChatContext(supabase, familyId)

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: buildChatSystemPrompt(context),
    messages,
    maxTokens: 1000,
  })

  return result.toDataStreamResponse()
}
```

### Chat Widget Client Component

```tsx
// Source: Vercel AI SDK useChat docs (ai-sdk.dev)
// components/ai/chat-widget.tsx
'use client'
import { useChat } from 'ai/react'
import { useState } from 'react'

export function ChatWidget({ familyId }: { familyId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/ai/chat',
    body: { familyId },
    initialMessages: [{
      id: 'greeting',
      role: 'assistant',
      content: 'Hello! I can help with tax queries, sector exposure, or sell-impact analysis.',
    }],
  })

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-[60] py-3 px-5 bg-primary text-on-primary rounded-xl font-bold flex items-center gap-2 shadow-xl"
      >
        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        Ask AI
      </button>
    )
  }

  return (
    <div className="fixed bottom-8 right-8 z-[55] w-[450px] rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/20">
      {/* header bg-primary */}
      {/* message list */}
      {/* input form */}
    </div>
  )
}
```

### SVG Quality Score Ring (from design)

```tsx
// Source: Individual_holder_view.html design reference
// Score ring: circumference = 2 * π * r = 2 * 3.14159 * 34 ≈ 213.6
// stroke-dashoffset = circumference * (1 - score/100)
const circumference = 213.6
const offset = circumference * (1 - qualityScore / 100)

<svg className="w-full h-full -rotate-90">
  <circle cx="40" cy="40" r="34" fill="transparent" stroke="currentColor"
    className="text-surface-variant/20" strokeWidth="6" />
  <circle cx="40" cy="40" r="34" fill="transparent" stroke="currentColor"
    className="text-secondary-fixed"
    strokeDasharray={circumference}
    strokeDashoffset={offset}
    strokeWidth="6" />
</svg>
<span className="absolute text-xl font-bold">{qualityScore}</span>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `claude-3-5-sonnet-20241022` | `claude-sonnet-4-6` | Feb 2026 | ~30% faster, better Indian financial knowledge |
| `claude-3-haiku-20240307` | `claude-haiku-4-5-20251001` | Oct 2025 | Note: Haiku 3 deprecated Apr 19, 2026 |
| Custom SSE parsing in client | Vercel AI SDK `useChat` | 2024–2025 | Eliminates ~200 lines of boilerplate |
| Vercel AI SDK v3 `useChat` API routes | v6 Server Actions or API routes both work | 2025 | v6 still supports API route pattern (not forced to Server Actions) |
| `StreamingTextResponse` from `ai` | `result.toDataStreamResponse()` | AI SDK v4+ | `StreamingTextResponse` is deprecated |

**Deprecated/outdated:**
- `StreamingTextResponse`: Replaced by `result.toDataStreamResponse()` in AI SDK v4+
- `claude-3-haiku-20240307`: Retiring April 19, 2026 — do not use
- `claude-3-5-sonnet-20241022`: Still works but superseded by claude-sonnet-4.x family

---

## Open Questions

1. **Sector exposure data source for chat**
   - What we know: The design shows "Your direct and indirect energy exposure is 8.4%" — this requires fund-level sector classification, not just AMFI category
   - What's unclear: mfapi.in does not return sector allocation per fund. AMFI's portfolio disclosure is monthly and in PDF/Excel. No free real-time sector breakdown API confirmed.
   - Recommendation: For v1 chat, use AMFI fund category (e.g., "Large Cap", "Flexi Cap", "IT Sector Fund") as a proxy for sector tagging. Build a `CATEGORY_TO_SECTOR` map in code for approximate sector exposure. Full stock-level sector data is v2 (ANLYV2-01 portfolio overlap). Document the approximation in the system prompt.

2. **TER column in AMFI NAVAll.txt**
   - What we know: AMFI NAVAll.txt is a pipe-delimited file. The nav sync in Phase 1 already parses it.
   - What's unclear: Whether TER is included in NAVAll.txt or requires a separate AMFI endpoint (`/ter-of-mf-schemes`).
   - Recommendation: Inspect the actual NAVAll.txt file during Wave 0 setup. If TER is not present, use a fallback: hardcode category-average TER ranges (SEBI sets 0.8–1.05% for large cap, etc.) and note it as approximate. The `funds.category` field already available allows category-average TER as fallback.

3. **On-demand narrative generation UX — loading state**
   - What we know: Left to Claude's discretion per CONTEXT.md
   - What's unclear: Streaming text vs spinner vs skeleton
   - Recommendation: Use streaming text (pipe `.on('text')` events from `@anthropic-ai/sdk` stream or use Vercel AI SDK `streamText`). Streaming shows progress and feels faster than a spinner. Show a "Generating..." skeleton card header while first tokens arrive.

4. **Anthropic API key on Vercel**
   - What we know: Must be a server-side env var
   - What's unclear: Whether the project has existing Vercel env var setup or uses `.env.local` only
   - Recommendation: Add `ANTHROPIC_API_KEY` to both `.env.local` (development) and Vercel project settings (production). Document in project README.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.mts` (project root) |
| Quick run command | `npx vitest run tests/ai/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | `computeQualityScore()` returns 0–100 for valid signals | unit | `npx vitest run tests/ai/scoring.test.ts` | ❌ Wave 0 |
| AI-01 | `computeAlpha()` returns correct delta XIRR vs Nifty 50 | unit | `npx vitest run tests/ai/scoring.test.ts` | ❌ Wave 0 |
| AI-01 | Fund with < 3 months NAV returns `null` alpha (insufficient data guard) | unit | `npx vitest run tests/ai/scoring.test.ts` | ❌ Wave 0 |
| AI-02 | Quarterly narrative prompt includes underperforming fund names | unit | `npx vitest run tests/ai/prompts.test.ts` | ❌ Wave 0 |
| AI-03 | Chat system prompt includes all holdings with correct field labels | unit | `npx vitest run tests/ai/prompts.test.ts` | ❌ Wave 0 |
| AI-03 | Chat system prompt includes SEBI disclaimer instruction | unit | `npx vitest run tests/ai/prompts.test.ts` | ❌ Wave 0 |
| AI-04 | Narrative prompt includes sector concentration and exit review sections | unit | `npx vitest run tests/ai/prompts.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/ai/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/ai/scoring.test.ts` — covers AI-01 (quality score + alpha computation)
- [ ] `tests/ai/prompts.test.ts` — covers AI-02, AI-03, AI-04 (prompt builder unit tests, no API calls)
- [ ] `lib/ai/scoring.ts` — computation module
- [ ] `lib/ai/prompts.ts` — prompt builder module
- [ ] `lib/ai/types.ts` — shared interfaces
- [ ] `supabase/migrations/NNNN_fund_ai_scores.sql` — schema + RLS
- [ ] `supabase/migrations/NNNN_portfolio_narratives.sql` — schema + RLS
- [ ] Framework install: `npm install @anthropic-ai/sdk ai @ai-sdk/anthropic` — these packages not yet in `package.json`

---

## Sources

### Primary (HIGH confidence)

- `platform.claude.com/docs/en/about-claude/models/overview` — Current Claude model names, API IDs, pricing, context windows (verified 2026-03-24)
- `platform.claude.com/docs/en/api/messages-streaming` — Anthropic SDK streaming API, TypeScript `.stream()` pattern
- `ai-sdk.dev/providers/ai-sdk-providers/anthropic` — Vercel AI SDK Anthropic provider, `streamText`, supported models
- `@anthropic-ai/sdk` npm version 0.80.0 — verified as latest via `npm show @anthropic-ai/sdk version`
- Project codebase — `lib/analytics/xirr.ts`, `lib/supabase/types.ts`, `app/(dashboard)/layout.tsx`, migration files (all patterns verified by reading source)

### Secondary (MEDIUM confidence)

- `www.mfapi.in/docs/` — mfapi.in API endpoints and response fields (confirmed: returns category/fund_house but NOT TER or AUM)
- WebSearch: AMFI TER of MF Schemes (`www.amfiindia.com/ter-of-mf-schemes`) — TER data exists at AMFI; file format requires verification against actual NAVAll.txt
- WebSearch: Vercel AI SDK v6 release notes — confirms `toDataStreamResponse()` replaces `StreamingTextResponse`

### Tertiary (LOW confidence)

- WebSearch: AMFI NAVAll.txt includes TER column — needs verification by reading actual file during implementation
- WebSearch: Sector exposure from AMFI category — approximate mapping only; stock-level sector data not available free in v1

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — SDK versions verified via npm and official model docs
- Architecture: HIGH — based on existing project patterns (Phases 1–3) + official SDK documentation
- Pitfalls: HIGH for RLS/timeout patterns (verified against project); MEDIUM for AMFI TER file format (needs runtime verification)
- Test map: HIGH — mirrors established project pattern (`it.todo()` stubs, Vitest config)

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable Anthropic SDK; model names could change but aliases are stable)

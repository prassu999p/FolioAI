---
phase: 04-ai-intelligence
plan: 04
subsystem: ui
tags: [ai-sdk, anthropic, streaming, chat, react, next.js, supabase]

# Dependency graph
requires:
  - phase: 04-ai-intelligence
    provides: "lib/ai/types.ts ChatContext, lib/ai/prompts.ts buildChatSystemPrompt, @ai-sdk packages installed (Wave 0)"
  - phase: 04-ai-intelligence
    provides: "Fund scoring infrastructure and XIRR analytics from plans 01-03"
provides:
  - "Floating chat FAB rendered globally on all dashboard pages (fixed bottom-right)"
  - "ChatWidget component: 450px expanded panel with streaming responses"
  - "POST /api/ai/chat: streaming route with portfolio context injection"
  - "buildChatContextForHolder: fetches holder/holdings/transactions, computes XIRR and sector exposure"
affects: [05-goals-ui, future-chat-enhancements]

# Tech tracking
tech-stack:
  added: ["@ai-sdk/react (useChat hook, Chat class for SDK v6)", "TextStreamChatTransport (plain text streaming transport)"]
  patterns: ["AI SDK v6 Chat class + transport pattern", "prepareSendMessagesRequest for request format bridging", "UIMessage parts-based message rendering"]

key-files:
  created:
    - "lib/ai/chat-context-service.ts"
    - "app/api/ai/chat/route.ts"
    - "components/ai/chat-widget.tsx"
  modified:
    - "app/(dashboard)/layout.tsx"

key-decisions:
  - "AI SDK v6 TextStreamChatTransport used (not DefaultChatTransport) — matches toTextStreamResponse() on route side; simpler text protocol"
  - "prepareSendMessagesRequest bridges SDK v6 UIMessage format to route's {role, content} Zod schema"
  - "Manual input state management in ChatWidget — SDK v6 useChat no longer provides input/handleInputChange/handleSubmit"
  - "Chat history clears on new session (Chat instance recreated per component mount) — no DB persistence"
  - "holderId not passed from layout — layout only has familyId; chat defaults to generic prompt for v1; future enhancement to pass holderId from page context"
  - "buildChatContextForHolder uses AnySupabaseClient (any type alias) to avoid postgrest-js generic type mismatch"
  - "Cashflows built manually in chat-context-service (not via buildPortfolioCashflows) — that function requires HoldingRow[] but RPC returns different shape"

patterns-established:
  - "AI SDK v6 route pattern: streamText + toTextStreamResponse() + runtime = nodejs"
  - "Client chat pattern: Chat class + TextStreamChatTransport + useChat({ chat }) + manual input"
  - "Message rendering: msg.parts.filter(p => p.type === 'text').map(p => p.text)"

requirements-completed: [AI-03]

# Metrics
duration: 12min
completed: 2026-03-25
---

# Phase 4 Plan 04: AI Chat Widget Summary

**Global floating chat FAB with streaming Claude responses backed by portfolio context injection via /api/ai/chat using AI SDK v6 TextStreamChatTransport**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-25T03:16:10Z
- **Completed:** 2026-03-25T03:28:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Built `buildChatContextForHolder()` that fetches holder, holdings, transactions from Supabase and computes XIRR + sector exposure for the chat system prompt
- Created POST `/api/ai/chat` streaming route using Vercel AI SDK `streamText` + `@ai-sdk/anthropic` with Zod validation and auth guard; ANTHROPIC_API_KEY stays server-side only
- Built `ChatWidget` client component: collapsed FAB bottom-right, expands to 450px panel with "FolioAI Intelligence Hub" header, greeting message, streaming message display, and form input
- Wired ChatWidget into dashboard layout so it appears on all dashboard pages when familyId is non-null

## Task Commits

Each task was committed atomically:

1. **Task 1: Build chat context service and streaming route** - `6a1d8e8` (feat)
2. **Task 2: Build ChatWidget and wire into dashboard layout** - `e117e71` (feat)

**Plan metadata:** (docs commit — see final_commit step)

## Files Created/Modified
- `lib/ai/chat-context-service.ts` - Fetches portfolio data, computes XIRR/sector exposure, returns ChatContext
- `app/api/ai/chat/route.ts` - Streaming POST endpoint with auth, Zod validation, context injection
- `components/ai/chat-widget.tsx` - Floating FAB + expanded chat panel, 'use client', SDK v6 compatible
- `app/(dashboard)/layout.tsx` - Added ChatWidget import and render before closing main

## Decisions Made
- **AI SDK v6 vs older API:** The plan's code examples used AI SDK v4/v5 API (`ai/react` import, `handleInputChange`, `toDataStreamResponse`, `maxTokens`). The installed SDK is v6.0.137 which has breaking changes. Fixed to use `@ai-sdk/react`, `TextStreamChatTransport`, `toTextStreamResponse()`, `maxOutputTokens`, and manual input state.
- **TextStreamChatTransport chosen over DefaultChatTransport:** The route uses `toTextStreamResponse()` (plain text stream), which pairs with `TextStreamChatTransport`. `DefaultChatTransport` expects the AI SDK data stream protocol format.
- **prepareSendMessagesRequest:** Bridges SDK v6's UIMessage format (with `parts`) to the route's Zod schema expecting `{role, content}` string format.
- **holderId not passed from layout:** Layout only fetches familyId. For v1, the chat route falls back to a generic system prompt without portfolio context. A future enhancement can extract holderId from page params and pass it down.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed AI SDK v6 breaking API changes**
- **Found during:** Task 1 (Building streaming route)
- **Issue:** Plan code examples used SDK v4/v5 API: `maxTokens` (now `maxOutputTokens`), `toDataStreamResponse()` (now `toTextStreamResponse()`), `SupabaseClient` type mismatch
- **Fix:** Updated route.ts to use `maxOutputTokens`, `toTextStreamResponse()`, and `AnySupabaseClient` type alias
- **Files modified:** `app/api/ai/chat/route.ts`, `lib/ai/chat-context-service.ts`
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** 6a1d8e8 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed buildPortfolioCashflows signature mismatch**
- **Found during:** Task 1 (chat-context-service.ts)
- **Issue:** Plan called `buildPortfolioCashflows(transactions, totalAUM)` but actual function signature is `(transactions: Transaction[], holdings: HoldingRow[], today: Date)`
- **Fix:** Built cashflows manually in the context service (map transactions + terminal value)
- **Files modified:** `lib/ai/chat-context-service.ts`
- **Verification:** TypeScript compiles without errors
- **Committed in:** 6a1d8e8 (Task 1 commit)

**3. [Rule 3 - Blocking] Installed missing @ai-sdk/react package**
- **Found during:** Task 2 (ChatWidget component)
- **Issue:** `ai/react` import not available in SDK v6; `useChat` moved to separate `@ai-sdk/react` package
- **Fix:** `npm install @ai-sdk/react`
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** TypeScript compiles; `useChat` and `Chat` import successfully
- **Committed in:** e117e71 (Task 2 commit)

**4. [Rule 1 - Bug] Updated ChatWidget to SDK v6 useChat API**
- **Found during:** Task 2 (ChatWidget component)
- **Issue:** SDK v6 `useChat` returns `{messages, sendMessage, status}` (not `{handleInputChange, handleSubmit, isLoading}`); messages use UIMessage.parts not content string
- **Fix:** Managed input state manually with `useState`; used `sendMessage({ text })` to submit; rendered via `msg.parts.filter(text)`
- **Files modified:** `components/ai/chat-widget.tsx`
- **Verification:** TypeScript compiles cleanly; SEBI disclaimer in system prompt
- **Committed in:** e117e71 (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 API bugs, 1 signature mismatch, 1 missing package)
**Impact on plan:** All fixes necessary for SDK v6 compatibility. No scope creep. Core functionality matches plan spec exactly.

## Issues Encountered
- AI SDK v6 (installed version 6.0.137) has significant breaking changes from the v3/v4 patterns used in the plan's code examples. The `ai/react` subpath export was removed; `useChat` now lives in `@ai-sdk/react`. The message model changed from `{role, content}` to `UIMessage` with `parts` array. All API boundaries adapted.

## User Setup Required

**External service requires configuration before chat works:**

Add to `.env.local`:
```
ANTHROPIC_API_KEY=your_key_here
```

Get the key from: Anthropic Console (console.anthropic.com) → API Keys

**Verification:** Open any dashboard page and click the "Ask AI" FAB. Type a message and verify a streaming response appears. Without the key, the route will return an error from the Anthropic SDK.

## Next Phase Readiness
- Chat widget is live on all dashboard pages; requires ANTHROPIC_API_KEY to be set
- Phase 4 complete (all 4 plans done): AI scores, narrative generation, AI Insights page, and chat widget
- Phase 5 can proceed: Goals + Advanced Analytics
- Future enhancement: pass holderId from page context to ChatWidget for holder-specific portfolio context in chat

---
*Phase: 04-ai-intelligence*
*Completed: 2026-03-25*

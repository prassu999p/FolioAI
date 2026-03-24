---
phase: 4
slug: ai-intelligence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.mts` (project root) |
| **Quick run command** | `npx vitest run tests/ai/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/ai/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-W0-scoring | W0 | 0 | AI-01 | unit | `npx vitest run tests/ai/scoring.test.ts` | ❌ W0 | ⬜ pending |
| 4-W0-prompts | W0 | 0 | AI-02, AI-03, AI-04 | unit | `npx vitest run tests/ai/prompts.test.ts` | ❌ W0 | ⬜ pending |
| 4-scoring-01 | scoring | 1 | AI-01 | unit | `npx vitest run tests/ai/scoring.test.ts` | ❌ W0 | ⬜ pending |
| 4-scoring-02 | scoring | 1 | AI-01 | unit | `npx vitest run tests/ai/scoring.test.ts` | ❌ W0 | ⬜ pending |
| 4-scoring-03 | scoring | 1 | AI-01 | unit | `npx vitest run tests/ai/scoring.test.ts` | ❌ W0 | ⬜ pending |
| 4-narrative-01 | narrative | 2 | AI-02, AI-04 | unit | `npx vitest run tests/ai/prompts.test.ts` | ❌ W0 | ⬜ pending |
| 4-chat-01 | chat | 2 | AI-03 | unit | `npx vitest run tests/ai/prompts.test.ts` | ❌ W0 | ⬜ pending |
| 4-chat-02 | chat | 2 | AI-03 | unit | `npx vitest run tests/ai/prompts.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/ai/scoring.test.ts` — stubs for AI-01 (quality score + alpha computation)
- [ ] `tests/ai/prompts.test.ts` — stubs for AI-02, AI-03, AI-04 (prompt builder unit tests, no API calls)
- [ ] `lib/ai/scoring.ts` — computation module stub
- [ ] `lib/ai/prompts.ts` — prompt builder module stub
- [ ] `lib/ai/types.ts` — shared interfaces
- [ ] `supabase/migrations/NNNN_fund_ai_scores.sql` — schema + RLS migration
- [ ] `supabase/migrations/NNNN_portfolio_narratives.sql` — schema + RLS migration
- [ ] `npm install @anthropic-ai/sdk ai @ai-sdk/anthropic` — packages not yet in package.json

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chat widget streams responses from Claude API | AI-03 | Requires live Claude API key + SSE streaming | Open chat widget, type "What is my XIRR?", verify streamed response appears with correct data |
| Fund scorecard renders in AI Portfolio Health card | AI-01 | Requires live holder data + UI render | Navigate to Individual Holder page, verify circular quality score and per-fund alpha bars render |
| Narrative generates quarterly review text | AI-04 | Requires live Claude API call + holder data | Click "Generate Review" on Strategic Portfolio Narrative card, verify narrative text appears |
| SEBI-compliant advisory language in recommendations | AI-02 | Language quality review — not automatable | Read generated recommendations, verify SEBI disclaimer and non-directive language |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---
created: 2026-03-25T08:03:38.731Z
title: Add ANTHROPIC_API_KEY to env.local for AI features
area: api
files:
  - .env.local
---

## Problem

Phase 4 AI Intelligence features (fund scoring, chat widget, narrative generation) all require a live Anthropic API key server-side. The key must be present in `.env.local` as `ANTHROPIC_API_KEY=sk-ant-...` before the human verification checkpoint (plan 04-06) can be completed.

The four features that depend on this:
- `/api/ai/score-funds` — calls Claude to generate fund narrative per holding
- `/api/ai/chat` — streaming chat with portfolio context injection
- `/api/ai/generate-narrative` — quarterly review narrative generation
- All three use `claude-sonnet-4-6` via `@ai-sdk/anthropic`

## Solution

1. Get API key from https://console.anthropic.com/settings/keys
2. Add to `.env.local`: `ANTHROPIC_API_KEY=sk-ant-api03-...`
3. Restart dev server (`npm run dev`)
4. Test all four AI features and type "approved" to complete the 04-06 checkpoint

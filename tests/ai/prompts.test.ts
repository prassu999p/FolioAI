import { describe, it } from 'vitest'
// import { buildScorecardPrompt, buildNarrativePrompt, buildChatSystemPrompt } from '@/lib/ai/prompts'

describe('buildScorecardPrompt', () => {
  it.todo('returns non-empty string for valid signals')
  it.todo('includes fund name in prompt output')
  it.todo('includes quality score in prompt output')
  it.todo('instructs Claude not to output numbers — text only')
  it.todo('includes SEBI disclaimer instruction')
})

describe('buildNarrativePrompt', () => {
  it.todo('returns non-empty string for valid context and scores')
  it.todo('includes underperforming funds in prompt when alpha < 0')
  it.todo('includes SEBI advisory disclaimer instruction in prompt')
  it.todo('specifies soft advisory tone (may wish to consider...)')
})

describe('buildChatSystemPrompt', () => {
  it.todo('returns non-empty string for valid ChatContext')
  it.todo('includes total AUM formatted in ₹')
  it.todo('includes XIRR when available')
  it.todo('includes holding names and categories')
  it.todo('includes SEBI disclaimer instruction')
  it.todo('includes greeting context for FolioAI Intelligence Hub framing')
})

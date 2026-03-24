import type { ScoringSignals, ChatContext } from './types'

/**
 * Build the prompt for Claude to write fund scorecard narrative prose.
 * Claude receives the computed signals and writes 2-3 sentences only.
 */
export function buildScorecardPrompt(_signals: ScoringSignals, _qualityScore: number): string {
  throw new Error('Not implemented — Phase 4 Plan 02')
}

/**
 * Build the prompt for Claude to generate a quarterly portfolio review narrative.
 * Covers: performing well, review for exit, sector concentration, health assessment, replacements.
 */
export function buildNarrativePrompt(_context: ChatContext, _scores: Array<{ scheme_name: string; quality_score: number; alpha_pct: number | null; narrative_text: string }>): string {
  throw new Error('Not implemented — Phase 4 Plan 02')
}

/**
 * Build the system prompt for the chat widget.
 * Injects full portfolio context so Claude can answer questions accurately.
 * Never fabricate numbers — only use provided data.
 */
export function buildChatSystemPrompt(_ctx: ChatContext): string {
  throw new Error('Not implemented — Phase 4 Plan 02')
}

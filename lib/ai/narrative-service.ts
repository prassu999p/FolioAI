import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildChatContextForHolder } from './chat-context-service'
import { buildNarrativePrompt } from './prompts'

export async function generateNarrativeForHolder(
  holderId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any
): Promise<{ narrative: string }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // 1. Build portfolio context (holdings, XIRR, sector, SIPs)
  const ctx = await buildChatContextForHolder(holderId, supabase)
  if (!ctx) throw new Error(`Holder ${holderId} not found or no access`)

  // 2. Fetch cached fund scores for this holder
  const { data: scoresData } = await (supabase as any)
    .from('fund_ai_scores')
    .select('scheme_code, quality_score, alpha_pct, narrative_text')
    .eq('holder_id', holderId)

  // 3. Re-query holdings with scheme_code for the join
  const { data: holdingsWithCode } = await (supabase as any)
    .rpc('get_holder_holdings', { p_holder_id: holderId })

  const scores = ((scoresData ?? []) as Array<{
    scheme_code: number
    quality_score: number
    alpha_pct: number | null
    narrative_text: string
  }>).map(s => {
    const holding = ((holdingsWithCode ?? []) as Array<{ scheme_code: number; scheme_name: string }>)
      .find(h => h.scheme_code === s.scheme_code)
    return {
      scheme_name: holding?.scheme_name ?? `Fund ${s.scheme_code}`,
      quality_score: s.quality_score,
      alpha_pct: s.alpha_pct,
      narrative_text: s.narrative_text,
    }
  })

  // 4. Build prompt and call Claude
  const prompt = buildNarrativePrompt(ctx, scores)
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })
  const narrative =
    msg.content[0].type === 'text' ? msg.content[0].text : 'Unable to generate narrative.'

  // 5. Upsert into portfolio_narratives (UNIQUE on holder_id — replaces on conflict)
  await (supabase as any).from('portfolio_narratives').upsert(
    {
      holder_id: holderId,
      narrative,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'holder_id' }
  )

  return { narrative }
}
